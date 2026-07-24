import {
  FORM_DEFINITIONS,
  canTrainForm,
  getInstructorAthleticPreparationProductivity,
  getCollaboratorProductivity,
  getFormDefinition,
  getFormTrainingCount,
  getStudentFormCost,
  isInstructorForm,
} from "../content/forms";
import {
  getAnnualFormTrainingLimit,
  getUpgradeEffectTotal,
} from "../content/upgrades";
import { getFormTrainingYear, isSummerBreak } from "./calendar";
import {
  improveRandomAthletes,
  resolveSocialContentCycles,
} from "./collaboratorAutomationOutcomes";
import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import {
  getEquipmentAutomaticRepairTarget,
  getEquipmentAutomaticRepairUnitCost,
  repairEquipment,
} from "./equipment";
import { getAthleteImmunityStatus, isAthleteImmuneFromDeparture } from "./athleteImmunity";
import { getMemberAnnualDepartureChance } from "./formulas";
import {
  compareInstructorTeachingPriority,
  selectActiveEmail,
  selectInstructorCapacity,
} from "./selectors";
import { getSocialContentCharacters } from "./social";
import { getInstructorTeachingCounts } from "./runtimeIndexes";
import { getAutomaticFormCandidates } from "./formProgression";
import type {
  FormId,
  GameState,
  InboxMessage,
} from "./types";

export interface AutomationFlowDependencies {
  addMessage: (
    state: GameState,
    now: number,
    subject: string,
    preview: string,
    tone?: InboxMessage["tone"],
    category?: NonNullable<InboxMessage["category"]>,
    threadKey?: InboxMessage["threadKey"],
  ) => GameState;
  writeCharacters: (
    state: GameState,
    amount: number,
    now: number,
    source: "manual" | "automation",
  ) => GameState;
  startNextCampaign: (state: GameState, now: number) => GameState;
  startFormTraining: (state: GameState, personId: string, formId: FormId, now: number) => GameState;
  startAgonistCourse: (
    state: GameState,
    personId: string,
    instructorId: string,
    now: number,
  ) => GameState;
}

interface AutomaticTeachingNoOp {
  currentMonth: number;
  euros: number;
  upgrades: GameState["upgrades"];
  formsUnlocked: boolean;
  tournamentQualification: GameState["tournaments"]["qualification"];
}

const automaticTeachingNoOpCache = new WeakMap<
  GameState["contacts"],
  WeakMap<GameState["collaborators"], AutomaticTeachingNoOp>
>();

function wasAutomaticTeachingNoOp(state: GameState): boolean {
  const cached = automaticTeachingNoOpCache
    .get(state.contacts)
    ?.get(state.collaborators);
  return Boolean(
    cached &&
    cached.currentMonth === state.school.currentMonth &&
    cached.euros === state.school.euros &&
    cached.upgrades === state.upgrades &&
    cached.formsUnlocked === state.unlocks.forms &&
    cached.tournamentQualification === state.tournaments.qualification
  );
}

function rememberAutomaticTeachingNoOp(state: GameState): void {
  let byCollaborators = automaticTeachingNoOpCache.get(state.contacts);
  if (!byCollaborators) {
    byCollaborators = new WeakMap();
    automaticTeachingNoOpCache.set(state.contacts, byCollaborators);
  }
  byCollaborators.set(state.collaborators, {
    currentMonth: state.school.currentMonth,
    euros: state.school.euros,
    upgrades: state.upgrades,
    formsUnlocked: state.unlocks.forms,
    tournamentQualification: state.tournaments.qualification,
  });
}

export function processAutomation(
  state: GameState,
  now: number,
  _gainMultiplier: number,
  dependencies: AutomationFlowDependencies,
): GameState {
  const elapsedMs = Math.min(1_000, Math.max(0, now - state.automation.lastProcessedAt));
  if (elapsedMs <= 0) return state;

  let writingProductivity = 0;
  let equipmentProductivity = 0;
  for (const collaborator of state.collaborators) {
    if (collaborator.assignment === "writing") {
      writingProductivity += getCollaboratorProductivity(collaborator);
    } else if (collaborator.assignment === "equipment") {
      equipmentProductivity += getCollaboratorProductivity(collaborator);
    }
  }
  const activeEmail = selectActiveEmail(state);
  const wasWriting = activeEmail?.status === "writing";
  const producingSocialContent = !activeEmail && state.unlocks.social;
  const hasEditorialWork = wasWriting || producingSocialContent;
  const automationMultiplier =
    1 + getUpgradeEffectTotal(state.upgrades, "automationMultiplier");

  const generatedWriting = hasEditorialWork
    ? (elapsedMs / 1_000) *
      writingProductivity *
      GAME_CONFIG.collaboratorWritingPerSecond *
      state.player.writingPower *
      automationMultiplier
    : 0;
  const writingTotal = state.automation.writingBuffer + generatedWriting;
  const automatedCharacters = hasEditorialWork ? Math.floor(writingTotal) : 0;
  const socialContentCharacters = getSocialContentCharacters(state.upgrades);
  const socialContentTotal = state.automation.socialContentBuffer +
    (producingSocialContent ? automatedCharacters : 0);
  const socialCycles = producingSocialContent
    ? Math.floor(socialContentTotal / socialContentCharacters)
    : 0;
  const equipmentRepairTarget = getEquipmentAutomaticRepairTarget(state.equipment);
  const canRepairEquipment = equipmentRepairTarget !== undefined &&
    state.school.euros >= getEquipmentAutomaticRepairUnitCost(equipmentRepairTarget);
  const equipmentTotal = canRepairEquipment
    ? state.automation.equipmentBuffer +
      (elapsedMs / GAME_CONFIG.equipmentRepairIntervalMs) *
        equipmentProductivity *
        automationMultiplier
    : state.automation.equipmentBuffer;
  const equipmentRepair = repairEquipment(
    state.equipment,
    equipmentTotal,
    state.school.euros,
  );

  let nextState: GameState = {
    ...state,
    automation: {
      ...state.automation,
      lastProcessedAt: now,
      writingBuffer: hasEditorialWork
        ? writingTotal - automatedCharacters
        : state.automation.writingBuffer,
      lessonBuffer: state.automation.lessonBuffer,
      socialContentBuffer: producingSocialContent
        ? socialContentTotal - socialCycles * socialContentCharacters
        : state.automation.socialContentBuffer,
      equipmentBuffer: equipmentRepair.remainingWork,
    },
    equipment: equipmentRepair.equipment,
    school: equipmentRepair.eurosSpent > 0
      ? {
          ...state.school,
          euros: roundCurrency(state.school.euros - equipmentRepair.eurosSpent),
        }
      : state.school,
  };

  if (automatedCharacters > 0) {
    nextState = wasWriting
      ? dependencies.writeCharacters(nextState, automatedCharacters, now, "automation")
      : {
          ...nextState,
          statistics: {
            ...nextState.statistics,
            automatedCharacters:
              nextState.statistics.automatedCharacters + automatedCharacters,
          },
        };
  }

  if (socialCycles > 0) {
    const outcome = resolveSocialContentCycles(nextState, socialCycles, now);
    nextState = outcome.state;
    nextState = dependencies.addMessage(
      nextState,
      now,
      "Contenuti Social pubblicati",
      [
        `${outcome.cycles === 1 ? "Un contenuto pubblicato" : `${outcome.cycles} contenuti pubblicati`}.`,
        outcome.followersGained > 0
          ? `${outcome.followersGained} ${outcome.followersGained === 1 ? "nuovo follower" : "nuovi follower"}.`
          : "Nessun nuovo follower in questo ciclo.",
        outcome.contactsAcquired > 0
          ? `${outcome.contactsAcquired} ${outcome.contactsAcquired === 1 ? "nuovo contatto" : "nuovi contatti"}.`
          : "Nessun nuovo contatto in questo ciclo.",
      ].join(" "),
      "positive",
      "other",
      "contacts",
    );
    if (outcome.contactsAcquired > 0) {
      nextState = dependencies.startNextCampaign(nextState, now);
    }
  }

  return nextState;
}

/**
 * Ultima priorità degli Istruttori. Viene eseguita dopo l'assegnazione
 * automatica di Forme e Corso Agonisti, così un collaboratore contribuisce
 * soltanto se non sta insegnando e non è in formazione personale.
 */
export function processInstructorAthleticPreparation(
  state: GameState,
  elapsedMs: number,
): GameState {
  const safeElapsedMs = Math.min(1_000, Math.max(0, elapsedMs));
  const hasEligibleAthletes = state.contacts.some(
    (contact) => contact.status === "enrolled",
  );
  if (!hasEligibleAthletes) {
    return state.automation.lessonBuffer === 0
      ? state
      : {
          ...state,
          automation: { ...state.automation, lessonBuffer: 0 },
        };
  }
  if (
    safeElapsedMs <= 0 ||
    isSummerBreak(state.school.currentMonth) ||
    (state.upgrades["athletic-preparation"] ?? 0) <= 0
  ) return state;

  const teachingCounts = getInstructorTeachingCounts(
    state.contacts,
    state.collaborators,
  );
  const availableInstructors = state.collaborators.filter(
    (collaborator) =>
      collaborator.assignment === "instructor" &&
      !collaborator.training &&
      (teachingCounts.get(collaborator.id) ?? 0) === 0,
  );
  if (availableInstructors.length === 0) return state;

  const productivity = availableInstructors.reduce(
    (total, collaborator) =>
      total + getInstructorAthleticPreparationProductivity(collaborator),
    0,
  );
  const automationMultiplier =
    1 + getUpgradeEffectTotal(state.upgrades, "automationMultiplier");
  const preparationMultiplier =
    1 + getUpgradeEffectTotal(state.upgrades, "athleticPreparationPower");
  const total = state.automation.lessonBuffer +
    (safeElapsedMs / GAME_CONFIG.lessonImprovementIntervalMs) *
      productivity *
      automationMultiplier *
      preparationMultiplier;
  const requestedImprovements = Math.floor(total);
  if (requestedImprovements <= 0) {
    return {
      ...state,
      automation: {
        ...state.automation,
        lessonBuffer: total,
      },
    };
  }

  const improved = improveRandomAthletes(state, requestedImprovements);
  return {
    ...improved.state,
    automation: {
      ...improved.state.automation,
      lessonBuffer: total - improved.improvements,
    },
  };
}

export function processAutomaticTeaching(
  state: GameState,
  now: number,
  startFormTraining: AutomationFlowDependencies["startFormTraining"],
  startAgonistCourse: AutomationFlowDependencies["startAgonistCourse"] = (currentState) =>
    currentState,
): GameState {
  if (!state.unlocks.forms || isSummerBreak(state.school.currentMonth)) return state;
  if (wasAutomaticTeachingNoOp(state)) return state;
  const hasAutomaticInstructor = state.collaborators.some((collaborator) =>
    collaborator.assignment === "instructor"
  );
  if (!hasAutomaticInstructor) return state;
  const trainingYear = getFormTrainingYear(state.school.currentMonth);
  const annualTrainingLimit = getAnnualFormTrainingLimit(state.upgrades);
  let nextState = state;

  const collaboratorContactIds = new Set(
    state.collaborators.map((collaborator) => collaborator.contactId),
  );
  const students = [
    ...state.contacts.filter((contact) =>
      contact.status === "enrolled" &&
      !collaboratorContactIds.has(contact.id) &&
      !contact.training &&
      getFormTrainingCount(contact, trainingYear) < annualTrainingLimit
    ),
    ...state.collaborators.filter((collaborator) =>
      !collaborator.training &&
      getFormTrainingCount(collaborator, trainingYear) < annualTrainingLimit
    ),
  ];
  const favoriteContactIds = new Set(
    state.contacts.flatMap((contact) => contact.favorite ? [contact.id] : []),
  );
  const contactsById = new Map(state.contacts.map((contact) => [contact.id, contact]));
  const capacity = selectInstructorCapacity(state);
  const instructorLoads = new Map(
    getInstructorTeachingCounts(state.contacts, state.collaborators),
  );
  const instructorsByForm = new Map<FormId, GameState["collaborators"]>();
  for (const instructor of state.collaborators) {
    if (
      instructor.assignment !== "instructor"
    ) continue;
    for (const formId of instructor.forms) {
      if (isInstructorForm(formId) && !instructor.instructorForms.includes(formId)) continue;
      const instructors = instructorsByForm.get(formId);
      if (instructors) instructors.push(instructor);
      else instructorsByForm.set(formId, [instructor]);
    }
  }
  const qualifiedFormCandidates = new Map(students.map((student) => [
    student.id,
    getAutomaticFormCandidates(student).filter((formId) => {
      const definition = getFormDefinition(formId);
      return Boolean(
        definition &&
        canTrainForm(
          student,
          definition,
          trainingYear,
          undefined,
          undefined,
          annualTrainingLimit,
        ) &&
        instructorsByForm.get(formId)?.some((instructor) => instructor.id !== student.id)
      );
    }),
  ]));
  const instructorsWithAvailablePersonalForms = new Set(
    state.collaborators.filter((collaborator) => {
      if (collaborator.assignment !== "instructor") return false;
      const branchCapacity = Math.min(
        3,
        1 + (state.upgrades["instructor-versatility"] ?? 0),
      );
      return FORM_DEFINITIONS.some((definition) => canTrainForm(
        collaborator,
        definition,
        trainingYear,
        branchCapacity,
        false,
        annualTrainingLimit,
      ));
    }).map((collaborator) => collaborator.id),
  );
  const automaticFormOrder: FormId[] = [
    "form-1",
    "course-x",
    "form-2",
    "course-y",
    "form-3-long",
    "form-3-staff",
    "form-3-double",
    "form-4-long",
    "form-4-staff",
    "form-4-double",
    "form-5-long",
    "form-5-staff",
    "form-5-double",
    "form-6",
    "form-7",
  ];
  const automaticFormPriority = new Map(
    automaticFormOrder.map((formId, index) => [formId, index]),
  );
  const originalOrder = new Map(students.map((student, index) => [student.id, index]));
  const studentPriorities = new Map(students.map((student) => {
    const contact = "acquiredAt" in student
      ? student
      : contactsById.get(student.contactId);
    const immunity = contact
      ? getAthleteImmunityStatus(
        {
          currentMonth: state.school.currentMonth,
          tournamentQualification: state.tournaments.qualification,
        },
        contact,
        student,
        !("acquiredAt" in student),
      )
      : undefined;
    const departureRisk = contact &&
      !isAthleteImmuneFromDeparture(immunity!, "annual-rollout")
      ? getMemberAnnualDepartureChance(
        student.forms,
        contact.rarity,
        state.network.schools.length,
      )
      : 0;
    const candidate = qualifiedFormCandidates.get(student.id)?.[0];
    return [student.id, {
      departureRisk,
      isFavorite: "acquiredAt" in student
        ? student.favorite === true
        : favoriteContactIds.has(student.contactId),
      isCollaborator: !("acquiredAt" in student),
      formPriority: candidate
        ? automaticFormPriority.get(candidate) ?? Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER,
      acquiredAt: contact?.acquiredAt ?? 0,
    }];
  }));
  students.sort((left, right) => {
    const leftPriority = studentPriorities.get(left.id)!;
    const rightPriority = studentPriorities.get(right.id)!;
    return rightPriority.departureRisk - leftPriority.departureRisk ||
      Number(rightPriority.isFavorite) - Number(leftPriority.isFavorite) ||
      Number(rightPriority.isCollaborator) - Number(leftPriority.isCollaborator) ||
      leftPriority.formPriority - rightPriority.formPriority ||
      rightPriority.acquiredAt - leftPriority.acquiredAt ||
      originalOrder.get(left.id)! - originalOrder.get(right.id)!;
  });
  for (const student of students) {
    const qualifiedCandidates = qualifiedFormCandidates.get(student.id) ?? [];
    const instructorStudent = !("acquiredAt" in student) &&
      student.assignment === "instructor";
    const candidate = qualifiedCandidates.find((formId) => {
      const definition = getFormDefinition(formId);
      const instructor = instructorsByForm.get(formId)?.find(
        (available) =>
          available.id !== student.id &&
          (instructorLoads.get(available.id) ?? 0) < capacity,
      );
      return Boolean(
        definition &&
        instructor &&
        (
          nextState.school.euros >= getStudentFormCost(definition.cost)
        )
      );
    });
    if (candidate && !instructorStudent) {
      const startedState = startFormTraining(nextState, student.id, candidate, now);
      nextState = startedState;
      const startedStudent = "acquiredAt" in student
        ? nextState.contacts.find((contact) => contact.id === student.id)
        : nextState.collaborators.find((collaborator) => collaborator.id === student.id);
      if (!startedStudent?.training) continue;
      const instructorId = startedStudent.training.instructorId ??
        startedStudent.training.requestedInstructorId;
      if (instructorId) {
        instructorLoads.set(instructorId, (instructorLoads.get(instructorId) ?? 0) + 1);
      }
      continue;
    }

    if (
      qualifiedCandidates.length > 0 ||
      instructorsWithAvailablePersonalForms.has(student.id) ||
      (nextState.upgrades["technical-arena"] ?? 0) < 1
    ) continue;
    const instructor = nextState.collaborators
      .filter((candidate) =>
        candidate.assignment === "instructor" &&
        (instructorLoads.get(candidate.id) ?? 0) < capacity
      )
      .sort((left, right) =>
        compareInstructorTeachingPriority(left, right, instructorLoads)
      )[0];
    if (!instructor) continue;
    const startedState = startAgonistCourse(
      nextState,
      student.id,
      instructor.id,
      now,
    );
    const startedStudent = "acquiredAt" in student
      ? startedState.contacts.find((contact) => contact.id === student.id)
      : startedState.collaborators.find((collaborator) => collaborator.id === student.id);
    if (!startedStudent?.training) continue;
    nextState = startedState;
    instructorLoads.set(instructor.id, (instructorLoads.get(instructor.id) ?? 0) + 1);
  }

  if (nextState === state) rememberAutomaticTeachingNoOp(state);
  return nextState;
}
