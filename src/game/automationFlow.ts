import {
  FORM_DEFINITIONS,
  canTrainForm,
  getCollaboratorProductivity,
  getFormDefinition,
  getFormTrainingCount,
  getStudentFormCost,
  isInstructorForm,
} from "../content/forms";
import { COLLABORATOR_MASTERY_XP } from "../content/mastery";
import {
  getAnnualFormTrainingLimit,
  getUpgradeEffectTotal,
  hasFreeFormTraining,
} from "../content/upgrades";
import { getFormTrainingYear, isSummerBreak } from "./calendar";
import {
  improveRandomAthletes,
  resolveSocialAutomationCycles,
} from "./collaboratorAutomationOutcomes";
import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import {
  addLegendaryEncounters,
  createAcquiredContacts,
  mergeAcquiredContacts,
} from "./contacts";
import {
  getAvailableSwords,
  getEffectiveDamagedSwords,
  repairEquipment,
} from "./equipment";
import { getAthleteImmunityStatus, isAthleteImmuneFromDeparture } from "./athleteImmunity";
import { getMemberAnnualDepartureChance } from "./formulas";
import { nextRandom } from "./random";
import { selectActiveEmail, selectInstructorCapacity } from "./selectors";
import { getInstructorTeachingCounts } from "./runtimeIndexes";
import { getAutomaticFormCandidates } from "./trainingFlow";
import type {
  CollaboratorAssignment,
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
  addCollaboratorMasteryExperience: (
    state: GameState,
    role: CollaboratorAssignment,
    amount: number,
    now: number,
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
  gainMultiplier: number,
  dependencies: AutomationFlowDependencies,
): GameState {
  const elapsedMs = Math.min(1_000, Math.max(0, now - state.automation.lastProcessedAt));
  if (elapsedMs <= 0) return state;

  let writingProductivity = 0;
  let lessonProductivity = 0;
  let socialProductivity = 0;
  let equipmentProductivity = 0;
  for (const collaborator of state.collaborators) {
    if (collaborator.assignment === "writing") {
      writingProductivity += getCollaboratorProductivity(collaborator);
    } else if (collaborator.assignment === "lessons") {
      lessonProductivity += getCollaboratorProductivity(collaborator);
    } else if (collaborator.assignment === "social" && state.unlocks.social) {
      socialProductivity += getCollaboratorProductivity(collaborator);
    } else if (collaborator.assignment === "equipment") {
      equipmentProductivity += getCollaboratorProductivity(collaborator);
    }
  }
  const wasWriting = selectActiveEmail(state)?.status === "writing";
  const automationMultiplier =
    1 + getUpgradeEffectTotal(state.upgrades, "automationMultiplier");
  const socialMultiplier = 1 + getUpgradeEffectTotal(state.upgrades, "socialMultiplier");

  const writingTotal =
    state.automation.writingBuffer +
    (elapsedMs / 1_000) *
      writingProductivity *
      GAME_CONFIG.collaboratorWritingPerSecond *
      state.player.writingPower *
      automationMultiplier;
  const automatedCharacters = Math.floor(writingTotal);
  const hasEligibleAthletes = state.contacts.some((contact) => contact.status === "enrolled");
  const lessonTotal = hasEligibleAthletes
    ? state.automation.lessonBuffer +
      (elapsedMs / GAME_CONFIG.lessonImprovementIntervalMs) *
        lessonProductivity * automationMultiplier
    : 0;
  const lessonImprovements = Math.floor(lessonTotal);
  const socialTotal =
    state.automation.socialBuffer +
    (elapsedMs / GAME_CONFIG.socialAutomationIntervalMs) *
      socialProductivity *
      socialMultiplier *
      automationMultiplier *
      Math.max(0, gainMultiplier);
  const socialCycles = Math.floor(socialTotal);
  const damagedSwords = getEffectiveDamagedSwords(state.equipment);
  const automaticSwordCost = Math.round(
    GAME_CONFIG.equipmentDamagedSwordRepairCost * GAME_CONFIG.equipmentAutomaticCostFactor,
  );
  const automaticLoadCost =
    GAME_CONFIG.equipmentMaintenanceCostPerLoad * GAME_CONFIG.equipmentAutomaticCostFactor;
  const canRepairEquipment = damagedSwords > 0
    ? state.school.euros >= automaticSwordCost
    : state.equipment.wear > 0 &&
      getAvailableSwords(state.equipment) > 0 &&
      state.school.euros >= automaticLoadCost;
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
      writingBuffer: writingTotal - automatedCharacters,
      lessonBuffer: hasEligibleAthletes ? lessonTotal - lessonImprovements : 0,
      socialBuffer: socialTotal - socialCycles,
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

  if (equipmentRepair.restoredCondition > 0) {
    nextState = dependencies.addCollaboratorMasteryExperience(
      nextState,
      "equipment",
      equipmentRepair.restoredCondition *
        COLLABORATOR_MASTERY_XP.equipmentRepairPoint,
      now,
    );
  }

  if (automatedCharacters > 0) {
    nextState = dependencies.writeCharacters(nextState, automatedCharacters, now, "automation");
    if (wasWriting) {
      nextState = dependencies.addCollaboratorMasteryExperience(
        nextState,
        "writing",
        (elapsedMs / 1_000) * COLLABORATOR_MASTERY_XP.writingPerSecond,
        now,
      );
    }
  }

  if (lessonImprovements > 0) {
    const improved = improveRandomAthletes(nextState, lessonImprovements);
    nextState = improved.state;
    nextState = {
      ...nextState,
      automation: {
        ...nextState.automation,
        lessonBuffer: hasEligibleAthletes
          ? lessonTotal - improved.improvements
          : 0,
      },
    };
    if (improved.improvements > 0) {
      nextState = dependencies.addCollaboratorMasteryExperience(
        nextState,
        "lessons",
        improved.improvements * COLLABORATOR_MASTERY_XP.lessonCompleted,
        now,
      );
    }
  }

  if (socialCycles > 0) {
    const outcome = resolveSocialAutomationCycles(nextState, socialCycles, now);
    nextState = outcome.state;
    nextState = dependencies.addMessage(
      nextState,
      now,
      "Rendimento pubblicitario Social",
      [
        `${outcome.cycles === 1 ? "Un ciclo" : `${outcome.cycles} cicli`} di promozione ha generato €${outcome.eurosEarned} grazie a ${state.school.activeMembers} iscritti attivi.`,
        outcome.followersGained > 0
          ? `${outcome.followersGained} ${outcome.followersGained === 1 ? "nuovo follower" : "nuovi follower"}.`
          : "Nessun nuovo follower in questo ciclo.",
        outcome.trialsBooked > 0
          ? `${outcome.trialsBooked} ${outcome.trialsBooked === 1 ? "nuova prova" : "nuove prove"} in palestra.`
          : "Nessuna nuova prova in questo ciclo.",
        outcome.contactsAcquired > 0
          ? `${outcome.contactsAcquired} ${outcome.contactsAcquired === 1 ? "nuovo contatto" : "nuovi contatti"}.`
          : "Nessun nuovo contatto in questo ciclo.",
      ].join(" "),
      "positive",
      "other",
      "contacts",
    );
    nextState = dependencies.addCollaboratorMasteryExperience(
      nextState,
      "social",
      socialCycles * COLLABORATOR_MASTERY_XP.socialCycle,
      now,
    );
    if (outcome.contactsAcquired > 0) {
      nextState = dependencies.startNextCampaign(nextState, now);
    }
  }

  return nextState;
}

export function runSocialCampaign(
  state: GameState,
  now: number,
  dependencies: AutomationFlowDependencies,
): GameState {
  if (!state.unlocks.social || state.school.euros < GAME_CONFIG.socialCampaignCost) {
    return state;
  }
  const [viralRoll, nextSeed] = nextRandom(state.randomSeed);
  const viral = viralRoll < GAME_CONFIG.socialViralChance;
  const contactCount = Math.max(
    1,
    Math.round(
      GAME_CONFIG.socialCampaignContacts *
        (viral ? 3 : 1) *
        (1 + getUpgradeEffectTotal(state.upgrades, "socialMultiplier")),
    ),
  );
  const acquired = createAcquiredContacts(
    { ...state, randomSeed: nextSeed },
    contactCount,
    "social",
    now,
  );
  const contacts = acquired.contacts;
  let nextState: GameState = {
    ...state,
    randomSeed: acquired.nextSeed,
    legendaryCollaborators: addLegendaryEncounters(state.legendaryCollaborators, contacts),
    school: {
      ...state.school,
      euros: state.school.euros - GAME_CONFIG.socialCampaignCost,
    },
    contacts: mergeAcquiredContacts(state.contacts, contacts),
    statistics: {
      ...state.statistics,
      contactsAcquired: state.statistics.contactsAcquired + contacts.length,
      socialContacts: state.statistics.socialContacts + contacts.length,
      socialCampaigns: state.statistics.socialCampaigns + 1,
    },
  };
  nextState = dependencies.addCollaboratorMasteryExperience(
    nextState,
    "social",
    contacts.length * COLLABORATOR_MASTERY_XP.socialCampaignContact,
    now,
  );
  nextState = dependencies.addMessage(
    nextState,
    now,
    viral ? "Post inspiegabilmente virale" : "Campagna Social completata",
    `${contacts.length} nuovi indirizzi sono disponibili per la campagna email.`,
    "positive",
    "other",
    "contacts",
  );
  return dependencies.startNextCampaign(nextState, now);
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
    collaborator.assignment === "instructor" &&
    collaborator.autoTeachingEnabled !== false
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
      instructor.assignment !== "instructor" ||
      instructor.autoTeachingEnabled === false
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
          hasFreeFormTraining(nextState.upgrades) ||
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
      const instructorId = startedStudent.training.instructorId;
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
    const instructor = nextState.collaborators.find((candidate) =>
      candidate.assignment === "instructor" &&
      candidate.autoTeachingEnabled !== false &&
      (instructorLoads.get(candidate.id) ?? 0) < capacity
    );
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
