import {
  FORM_DEFINITIONS,
  canTrainForm,
  getInstructorAthleticPreparationProductivity,
  getCollaboratorProductivity,
  getFormDefinition,
  getFormTrainingCount,
  getStudentFormCost,
  isInstructorForm,
  needsCourseXRecovery,
} from "../content/forms";
import {
  areAllFormBranchesUnlocked,
  getAnnualFormTrainingLimit,
  getEquipmentPreparedWorkMaximum,
  getEquipmentSwordRepairWork,
  getInstructorBranchCapacityBonus,
  getUpgradeEffectTotal,
  isAthleticPreparationUnlocked,
  isCourseXUnlocked,
} from "../content/upgrades";
import { getFormTrainingYear, isSummerBreak } from "./calendar";
import { getCollaboratorFallbackProductivity } from "./collaboratorFallback";
import { getInstructorPendingReleaseIds } from "./collaboratorManagement";
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
import {
  compareAutomaticTeachingStudentPriority,
  getAutomaticTeachingRarityPriority,
} from "./automaticTeachingPriority";
import { getMemberAnnualDepartureChance } from "./formulas";
import { getPriorityInstructorQualificationTechnicianIds } from "./instructorPriority";
import {
  compareInstructorTeachingPriority,
  selectActiveEmail,
  selectAthleticPreparationInstructorIds,
  selectInstructorCapacity,
} from "./selectors";
import { getSocialContentCharacters } from "./social";
import { getInstructorTeachingCounts } from "./runtimeIndexes";
import { getAutomaticFormCandidates } from "./formProgression";
import { getAgonistCourseCost } from "./trainingFlow";
import type {
  TrainingStartPlan,
  TrainingStartPlanFactory,
} from "./trainingStartPlan";
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
  instructorTarget: number;
  equipment: GameState["equipment"];
  upgrades: GameState["upgrades"];
  formsUnlocked: boolean;
  tournamentQualification: GameState["tournaments"]["qualification"];
  contacts: Array<{
    id: string;
    status: GameState["contacts"][number]["status"];
    forms: GameState["contacts"][number]["forms"];
    formBranchPreferences: GameState["contacts"][number]["formBranchPreferences"];
    trainingInstructorId?: string;
    trainingTechnicianId?: string;
    trainingFormId?: string;
    lastFormTrainingYear: GameState["contacts"][number]["lastFormTrainingYear"];
    formTrainingYearCount: GameState["contacts"][number]["formTrainingYearCount"];
    lastAgonistCourseYear: GameState["contacts"][number]["lastAgonistCourseYear"];
    favorite: GameState["contacts"][number]["favorite"];
    rarity: GameState["contacts"][number]["rarity"];
    acquiredAt: number;
  }>;
  collaborators: Array<{
    id: string;
    contactId: string;
    assignment: GameState["collaborators"][number]["assignment"];
    forms: GameState["collaborators"][number]["forms"];
    instructorForms: GameState["collaborators"][number]["instructorForms"];
    technicianForms: GameState["collaborators"][number]["technicianForms"];
    formBranchPreferences: GameState["collaborators"][number]["formBranchPreferences"];
    trainingInstructorId?: string;
    trainingTechnicianId?: string;
    trainingFormId?: string;
    lastFormTrainingYear: GameState["collaborators"][number]["lastFormTrainingYear"];
    formTrainingYearCount: GameState["collaborators"][number]["formTrainingYearCount"];
    lastAgonistCourseYear: GameState["collaborators"][number]["lastAgonistCourseYear"];
    rarity: GameState["collaborators"][number]["rarity"];
    specialProfileId: GameState["collaborators"][number]["specialProfileId"];
  }>;
}

const automaticTeachingNoOpCache = new WeakMap<
  GameState["historyArchive"],
  AutomaticTeachingNoOp
>();

function getAutomaticTeachingTrainingSnapshot(
  training: GameState["contacts"][number]["training"],
) {
  return {
    trainingInstructorId: training?.instructorId ?? training?.requestedInstructorId,
    trainingTechnicianId: training?.technicianId,
    trainingFormId: training?.formId,
  };
}

function hasSameAutomaticTeachingContacts(
  cached: AutomaticTeachingNoOp["contacts"],
  current: GameState["contacts"],
): boolean {
  return cached.length === current.length && cached.every((previous, index) => {
    const contact = current[index];
    const training = getAutomaticTeachingTrainingSnapshot(contact.training);
    return previous.id === contact.id &&
      previous.status === contact.status &&
      previous.forms === contact.forms &&
      previous.formBranchPreferences === contact.formBranchPreferences &&
      previous.trainingInstructorId === training.trainingInstructorId &&
      previous.trainingTechnicianId === training.trainingTechnicianId &&
      previous.trainingFormId === training.trainingFormId &&
      previous.lastFormTrainingYear === contact.lastFormTrainingYear &&
      previous.formTrainingYearCount === contact.formTrainingYearCount &&
      previous.lastAgonistCourseYear === contact.lastAgonistCourseYear &&
      previous.favorite === contact.favorite &&
      previous.rarity === contact.rarity &&
      previous.acquiredAt === contact.acquiredAt;
  });
}

function hasSameAutomaticTeachingCollaborators(
  cached: AutomaticTeachingNoOp["collaborators"],
  current: GameState["collaborators"],
): boolean {
  return cached.length === current.length && cached.every((previous, index) => {
    const collaborator = current[index];
    const training = getAutomaticTeachingTrainingSnapshot(collaborator.training);
    return previous.id === collaborator.id &&
      previous.contactId === collaborator.contactId &&
      previous.assignment === collaborator.assignment &&
      previous.forms === collaborator.forms &&
      previous.instructorForms === collaborator.instructorForms &&
      previous.technicianForms === collaborator.technicianForms &&
      previous.formBranchPreferences === collaborator.formBranchPreferences &&
      previous.trainingInstructorId === training.trainingInstructorId &&
      previous.trainingTechnicianId === training.trainingTechnicianId &&
      previous.trainingFormId === training.trainingFormId &&
      previous.lastFormTrainingYear === collaborator.lastFormTrainingYear &&
      previous.formTrainingYearCount === collaborator.formTrainingYearCount &&
      previous.lastAgonistCourseYear === collaborator.lastAgonistCourseYear &&
      previous.rarity === collaborator.rarity &&
      previous.specialProfileId === collaborator.specialProfileId;
  });
}

export function isAutomaticTeachingKnownIdle(state: GameState): boolean {
  const cached = automaticTeachingNoOpCache.get(state.historyArchive);
  return Boolean(
    cached &&
    cached.currentMonth === state.school.currentMonth &&
    cached.euros === state.school.euros &&
    cached.instructorTarget === state.collaboratorManagement.targets.instructor &&
    cached.equipment === state.equipment &&
    cached.upgrades === state.upgrades &&
    cached.formsUnlocked === state.unlocks.forms &&
    cached.tournamentQualification === state.tournaments.qualification &&
    hasSameAutomaticTeachingContacts(cached.contacts, state.contacts) &&
    hasSameAutomaticTeachingCollaborators(cached.collaborators, state.collaborators)
  );
}

function rememberAutomaticTeachingNoOp(state: GameState): void {
  automaticTeachingNoOpCache.set(state.historyArchive, {
    currentMonth: state.school.currentMonth,
    euros: state.school.euros,
    instructorTarget: state.collaboratorManagement.targets.instructor,
    equipment: state.equipment,
    upgrades: state.upgrades,
    formsUnlocked: state.unlocks.forms,
    tournamentQualification: state.tournaments.qualification,
    contacts: state.contacts.map((contact) => ({
      id: contact.id,
      status: contact.status,
      forms: contact.forms,
      formBranchPreferences: contact.formBranchPreferences,
      ...getAutomaticTeachingTrainingSnapshot(contact.training),
      lastFormTrainingYear: contact.lastFormTrainingYear,
      formTrainingYearCount: contact.formTrainingYearCount,
      lastAgonistCourseYear: contact.lastAgonistCourseYear,
      favorite: contact.favorite,
      rarity: contact.rarity,
      acquiredAt: contact.acquiredAt,
    })),
    collaborators: state.collaborators.map((collaborator) => ({
      id: collaborator.id,
      contactId: collaborator.contactId,
      assignment: collaborator.assignment,
      forms: collaborator.forms,
      instructorForms: collaborator.instructorForms,
      technicianForms: collaborator.technicianForms,
      formBranchPreferences: collaborator.formBranchPreferences,
      ...getAutomaticTeachingTrainingSnapshot(collaborator.training),
      lastFormTrainingYear: collaborator.lastFormTrainingYear,
      formTrainingYearCount: collaborator.formTrainingYearCount,
      lastAgonistCourseYear: collaborator.lastAgonistCourseYear,
      rarity: collaborator.rarity,
      specialProfileId: collaborator.specialProfileId,
    })),
  });
}

function createSequentialTrainingStartPlan(
  state: GameState,
  now: number,
  startFormTraining: AutomationFlowDependencies["startFormTraining"],
  startAgonistCourse: AutomationFlowDependencies["startAgonistCourse"],
): TrainingStartPlan {
  let nextState = state;
  const getStartedTraining = (personId: string) =>
    nextState.collaborators.find((collaborator) => collaborator.id === personId)?.training ??
    nextState.contacts.find((contact) => contact.id === personId)?.training;
  return {
    get availableEuros() {
      return nextState.school.euros;
    },
    startFormTraining(personId, formId) {
      nextState = startFormTraining(nextState, personId, formId, now);
      const training = getStartedTraining(personId);
      return training ? { training } : undefined;
    },
    startAgonistCourse(personId, instructorId) {
      nextState = startAgonistCourse(nextState, personId, instructorId, now);
      const training = getStartedTraining(personId);
      return training ? { training } : undefined;
    },
    restartWaitingTraining() {
      return undefined;
    },
    commit() {
      return nextState;
    },
  };
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
  writingProductivity += getCollaboratorFallbackProductivity(state, "writing");
  equipmentProductivity += getCollaboratorFallbackProductivity(state, "equipment");
  const activeEmail = selectActiveEmail(state);
  const wasWriting = activeEmail?.status === "writing";
  const producingSocialContent = state.unlocks.social;
  const hasEditorialWork = wasWriting || producingSocialContent;
  const genericAutomationBonus = getUpgradeEffectTotal(
    state.upgrades,
    "automationMultiplier",
  );
  const editorialAutomationMultiplier = 1 + genericAutomationBonus +
    getUpgradeEffectTotal(state.upgrades, "editorialAutomationMultiplier");

  const generatedWriting = hasEditorialWork
    ? (elapsedMs / 1_000) *
      writingProductivity *
      GAME_CONFIG.collaboratorWritingPerSecond *
      state.player.writingPower *
      editorialAutomationMultiplier
    : 0;
  const emailWorkShare = wasWriting && producingSocialContent
    ? GAME_CONFIG.socialEmailWritingShare
    : wasWriting
      ? 1
      : 0;
  const socialWorkShare = producingSocialContent
    ? wasWriting
      ? GAME_CONFIG.socialContentShareWhileWriting +
        GAME_CONFIG.socialEmailWritingShare *
          getUpgradeEffectTotal(state.upgrades, "socialCopyShare")
      : 1
    : 0;
  const writingTotal = state.automation.writingBuffer + generatedWriting * emailWorkShare;
  const automatedEmailCharacters = wasWriting ? Math.floor(writingTotal) : 0;
  const socialContentCharacters = getSocialContentCharacters(state.upgrades);
  const socialContentTotal = state.automation.socialContentBuffer +
    generatedWriting * socialWorkShare;
  const automatedSocialCharacters = producingSocialContent
    ? Math.max(
        0,
        Math.floor(socialContentTotal) - Math.floor(state.automation.socialContentBuffer),
      )
    : 0;
  const socialCycles = producingSocialContent
    ? Math.floor(socialContentTotal / socialContentCharacters)
    : 0;
  const equipmentRepairTarget = getEquipmentAutomaticRepairTarget(state.equipment);
  const canGenerateEquipmentWork = equipmentRepairTarget === undefined ||
    state.school.euros >= getEquipmentAutomaticRepairUnitCost(equipmentRepairTarget);
  const equipmentAutomationMultiplier = 1 + genericAutomationBonus +
    getUpgradeEffectTotal(state.upgrades, "equipmentAutomationMultiplier");
  const generatedEquipmentWork =
    (elapsedMs / GAME_CONFIG.equipmentRepairIntervalMs) *
    equipmentProductivity *
    equipmentAutomationMultiplier;
  const preparedWorkMaximum = getEquipmentPreparedWorkMaximum(state);
  const currentPreparedWork = Math.min(
    preparedWorkMaximum,
    Math.max(0, state.automation.equipmentPreparedWork ?? 0),
  );
  const equipmentPreparedWork = equipmentRepairTarget === undefined
    ? Math.min(
        preparedWorkMaximum,
        currentPreparedWork + state.automation.equipmentBuffer + generatedEquipmentWork,
      )
    : currentPreparedWork;
  const equipmentBuffer = equipmentRepairTarget === undefined
    ? 0
    : Math.max(0, state.automation.equipmentBuffer) +
      (canGenerateEquipmentWork ? generatedEquipmentWork : 0);

  let nextState: GameState = {
    ...state,
    automation: {
      ...state.automation,
      lastProcessedAt: now,
      writingBuffer: wasWriting
        ? writingTotal - automatedEmailCharacters
        : state.automation.writingBuffer,
      lessonBuffer: state.automation.lessonBuffer,
      socialContentBuffer: producingSocialContent
        ? socialContentTotal - socialCycles * socialContentCharacters
        : state.automation.socialContentBuffer,
      equipmentBuffer,
      equipmentPreparedWork,
    },
    equipment: state.equipment,
    school: state.school,
  };

  if (automatedEmailCharacters > 0) {
    nextState = dependencies.writeCharacters(
      nextState,
      automatedEmailCharacters,
      now,
      "automation",
    );
  }

  if (automatedSocialCharacters > 0) {
    nextState = {
      ...nextState,
      statistics: {
        ...nextState.statistics,
        automatedCharacters:
          nextState.statistics.automatedCharacters + automatedSocialCharacters,
      },
    };
  }

  if (socialCycles > 0) {
    const outcome = resolveSocialContentCycles(nextState, socialCycles);
    nextState = outcome.state;
  }

  return nextState;
}

export function processAutomaticEquipmentRepair(state: GameState): GameState {
  const preparedWorkMaximum = getEquipmentPreparedWorkMaximum(state);
  const preparedWork = Math.min(
    preparedWorkMaximum,
    Math.max(0, state.automation.equipmentPreparedWork ?? 0),
  );
  const bufferedWork = Math.max(0, state.automation.equipmentBuffer);
  const target = getEquipmentAutomaticRepairTarget(state.equipment);

  if (!target) {
    const nextPreparedWork = Math.min(
      preparedWorkMaximum,
      preparedWork + bufferedWork,
    );
    if (
      nextPreparedWork === state.automation.equipmentPreparedWork &&
      bufferedWork === 0
    ) return state;
    return {
      ...state,
      automation: {
        ...state.automation,
        equipmentPreparedWork: nextPreparedWork,
        equipmentBuffer: 0,
      },
    };
  }

  if (
    preparedWork + bufferedWork <= 0 ||
    state.school.euros < getEquipmentAutomaticRepairUnitCost(target)
  ) {
    return preparedWork === state.automation.equipmentPreparedWork
      ? state
      : {
          ...state,
          automation: {
            ...state.automation,
            equipmentPreparedWork: preparedWork,
          },
        };
  }

  const availableWork = preparedWork + bufferedWork;
  const repaired = repairEquipment(
    state.equipment,
    availableWork,
    state.school.euros,
    getEquipmentSwordRepairWork(state.upgrades),
    true,
  );
  const consumedWork = Math.max(0, availableWork - repaired.remainingWork);
  const remainingPreparedWork = Math.max(0, preparedWork - consumedWork);
  const remainingBufferedWork = Math.max(
    0,
    repaired.remainingWork - remainingPreparedWork,
  );
  const stillDamaged = getEquipmentAutomaticRepairTarget(repaired.equipment) !== undefined;
  const nextPreparedWork = stillDamaged
    ? remainingPreparedWork
    : Math.min(preparedWorkMaximum, repaired.remainingWork);
  const nextBufferedWork = stillDamaged ? remainingBufferedWork : 0;

  return {
    ...state,
    automation: {
      ...state.automation,
      equipmentPreparedWork: nextPreparedWork,
      equipmentBuffer: nextBufferedWork,
    },
    equipment: repaired.equipment,
    school: repaired.eurosSpent > 0
      ? {
          ...state.school,
          euros: roundCurrency(state.school.euros - repaired.eurosSpent),
        }
      : state.school,
  };
}

/**
 * Ultima priorità degli Istruttori. Viene eseguita dopo l'assegnazione
 * automatica di Forme e Corso Agonisti, così un collaboratore contribuisce
 * soltanto se non sta insegnando e non è in formazione personale.
 */
function getAvailableAthleticPreparationInstructors(state: GameState) {
  const activeInstructorIds = selectAthleticPreparationInstructorIds(state);
  return state.collaborators.filter(
    (collaborator) => activeInstructorIds.has(collaborator.id),
  );
}

export function hasActiveInstructorAthleticPreparation(state: GameState): boolean {
  return selectAthleticPreparationInstructorIds(state).size > 0;
}

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
    !isAthleticPreparationUnlocked(state.upgrades)
  ) return state;

  const availableInstructors = getAvailableAthleticPreparationInstructors(state);
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
  createTrainingPlan?: TrainingStartPlanFactory,
): GameState {
  if (!state.automation.autoTeachingEnabled) return state;
  if (!state.unlocks.forms || isSummerBreak(state.school.currentMonth)) return state;
  if (isAutomaticTeachingKnownIdle(state)) return state;
  const pendingReleaseIds = getInstructorPendingReleaseIds(state);
  const priorityQualificationTechnicianIds =
    getPriorityInstructorQualificationTechnicianIds(state);
  const hasAutomaticInstructor = state.collaborators.some((collaborator) =>
    collaborator.assignment === "instructor" &&
    !pendingReleaseIds.has(collaborator.id) &&
    !priorityQualificationTechnicianIds.has(collaborator.id)
  );
  if (!hasAutomaticInstructor) {
    rememberAutomaticTeachingNoOp(state);
    return state;
  }
  const trainingYear = getFormTrainingYear(state.school.currentMonth);
  const annualTrainingLimit = getAnnualFormTrainingLimit(state.upgrades);
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const unrestrictedFormBranches = areAllFormBranchesUnlocked(state.upgrades);
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
      !pendingReleaseIds.has(collaborator.id) &&
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
  const trainingPlan = createTrainingPlan
    ? createTrainingPlan(state, now, instructorLoads)
    : createSequentialTrainingStartPlan(
        state,
        now,
        startFormTraining,
        startAgonistCourse,
      );
  const instructorsByForm = new Map<FormId, GameState["collaborators"]>();
  for (const instructor of state.collaborators) {
    if (
      instructor.assignment !== "instructor" ||
      pendingReleaseIds.has(instructor.id) ||
      priorityQualificationTechnicianIds.has(instructor.id)
    ) continue;
    for (const formId of instructor.forms) {
      if (isInstructorForm(formId) && !instructor.instructorForms.includes(formId)) continue;
      const instructors = instructorsByForm.get(formId);
      if (instructors) instructors.push(instructor);
      else instructorsByForm.set(formId, [instructor]);
    }
  }
  const automaticFormCandidates = new Map(students.map((student) => [
    student.id,
    getAutomaticFormCandidates(student, courseXUnlocked, unrestrictedFormBranches),
  ]));
  const qualifiedFormCandidates = new Map(students.map((student) => [
    student.id,
    (automaticFormCandidates.get(student.id) ?? []).filter((formId) => {
      const definition = getFormDefinition(formId);
      return Boolean(
        definition &&
        canTrainForm(
          student,
          definition,
          trainingYear,
          unrestrictedFormBranches ? 3 : undefined,
          !unrestrictedFormBranches,
          annualTrainingLimit,
          courseXUnlocked,
        ) &&
        instructorsByForm.get(formId)?.some((instructor) => instructor.id !== student.id)
      );
    }),
  ]));
  const instructorsWithAvailablePersonalForms = new Set(
    state.collaborators.filter((collaborator) => {
      if (
        collaborator.assignment !== "instructor" ||
        pendingReleaseIds.has(collaborator.id)
      ) return false;
      const branchCapacity = unrestrictedFormBranches
        ? 3
        : Math.min(3, 1 + getInstructorBranchCapacityBonus(state.upgrades));
      return FORM_DEFINITIONS.some((definition) => canTrainForm(
        collaborator,
        definition,
        trainingYear,
        branchCapacity,
        false,
        annualTrainingLimit,
        courseXUnlocked,
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
    const candidate = automaticFormCandidates.get(student.id)?.[0];
    return [student.id, {
      departureRisk,
      isFavorite: "acquiredAt" in student
        ? student.favorite === true
        : favoriteContactIds.has(student.contactId),
      rarityPriority: getAutomaticTeachingRarityPriority(student),
      isCollaborator: !("acquiredAt" in student),
      formPriority: candidate
        ? automaticFormPriority.get(candidate) ?? Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER,
      acquiredAt: contact?.acquiredAt ?? 0,
      originalOrder: originalOrder.get(student.id)!,
    }];
  }));
  students.sort((left, right) => {
    const leftPriority = studentPriorities.get(left.id)!;
    const rightPriority = studentPriorities.get(right.id)!;
    return compareAutomaticTeachingStudentPriority(leftPriority, rightPriority);
  });

  const startedStudentIds = new Set<string>();
  const rememberStartedTraining = (
    studentId: string,
    started: ReturnType<TrainingStartPlan["startFormTraining"]>,
  ): boolean => {
    if (!started) return false;
    startedStudentIds.add(studentId);
    const instructorId = started.training.instructorId ??
      started.training.requestedInstructorId;
    if (instructorId) {
      instructorLoads.set(instructorId, (instructorLoads.get(instructorId) ?? 0) + 1);
    }
    return true;
  };

  // Prima vengono tentate tutte le Forme, nell'ordine degli allievi.
  // Arena Tecnica e Corso Agonisti usano soltanto la capienza rimasta.
  const agonistCourseCost = getAgonistCourseCost(state);
  for (const student of students) {
    const qualifiedCandidates = qualifiedFormCandidates.get(student.id) ?? [];
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
          trainingPlan.availableEuros >= getStudentFormCost(definition.cost)
        )
      );
    });
    if (candidate) {
      const started = trainingPlan.startFormTraining(student.id, candidate);
      if (!started) continue;
      rememberStartedTraining(student.id, started);
      continue;
    }

    if (
      courseXUnlocked &&
      needsCourseXRecovery(student.forms) &&
      !("acquiredAt" in student) &&
      student.assignment === "instructor"
    ) {
      const started = trainingPlan.startFormTraining(student.id, "course-x");
      rememberStartedTraining(student.id, started);
    }
  }
  for (const student of students) {
    if (startedStudentIds.has(student.id)) continue;
    const qualifiedCandidates = qualifiedFormCandidates.get(student.id) ?? [];
    if (
      (courseXUnlocked && needsCourseXRecovery(student.forms)) ||
      qualifiedCandidates.length > 0 ||
      instructorsWithAvailablePersonalForms.has(student.id) ||
      (state.upgrades["technical-arena"] ?? 0) < 1
    ) continue;
    if (trainingPlan.availableEuros < agonistCourseCost) break;
    let instructor: GameState["collaborators"][number] | undefined;
    let hasAvailableInstructor = false;
    for (const candidate of state.collaborators) {
      if (
        candidate.assignment !== "instructor" ||
        pendingReleaseIds.has(candidate.id) ||
        priorityQualificationTechnicianIds.has(candidate.id) ||
        (instructorLoads.get(candidate.id) ?? 0) >= capacity
      ) continue;
      hasAvailableInstructor = true;
      if (candidate.id === student.id) continue;
      if (
        !instructor ||
        compareInstructorTeachingPriority(
          candidate,
          instructor,
          instructorLoads,
          courseXUnlocked,
        ) < 0
      ) instructor = candidate;
    }
    if (!instructor) {
      if (!hasAvailableInstructor) break;
      continue;
    }
    const started = trainingPlan.startAgonistCourse(student.id, instructor.id);
    if (!started) continue;
    startedStudentIds.add(student.id);
    instructorLoads.set(instructor.id, (instructorLoads.get(instructor.id) ?? 0) + 1);
  }

  const nextState = trainingPlan.commit();
  if (nextState === state) rememberAutomaticTeachingNoOp(state);
  return nextState;
}
