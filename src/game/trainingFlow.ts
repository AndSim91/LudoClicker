import {
  AGONIST_COURSE_ID,
  FORM_BRANCHES,
  canTrainForm,
  getCollaboratorProductivity,
  getFormDefinition,
  getFormTrainingCount,
  getAgonistCourseRequiredSwords,
  getInstructorFormCost,
  getInstructorQualificationCost,
  getInstructorQualificationDuration,
  getTechnicianCourseDuration,
  getStudentFormCost,
  isInstructorForm,
  isAgonistCourse,
} from "../content/forms";
import {
  getAgonistCourseMaximumStatGain,
  getAnnualFormTrainingLimit,
  getUpgradeEffectTotal,
} from "../content/upgrades";
import { getFormTrainingYear, isSummerBreak } from "./calendar";
import { getContactBaseStats } from "./athleteStats";
import { nextRandom } from "./random";
import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import {
  completeEquipmentUse,
  getAvailableSwords,
  reserveSwords,
} from "./equipment";
import { cancelAutomatedEventForCollaborator } from "./eventFlow";
import { processAutomaticEvents } from "./eventAutomationFlow";
import { getCollaboratorAssignmentCounts } from "./collaboratorManagement";
import {
  selectAvailableInstructor,
  selectInstructorCapacity,
  selectInstructorTeachingCount,
} from "./selectors";
import {
  getTrainingDurationMultiplier,
  getTrainingPhase,
  getTrainingTrack,
  scheduleTraining,
} from "./teacherTrainingFlow";
import type {
  CollaboratorAssignment,
  Contact,
  FormBranch,
  FormId,
  FormTraining,
  GameState,
  InboxMessage,
} from "./types";

export interface TrainingFlowDependencies {
  addMessage: (
    state: GameState,
    now: number,
    subject: string,
    preview: string,
    tone?: InboxMessage["tone"],
    category?: NonNullable<InboxMessage["category"]>,
    threadKey?: InboxMessage["threadKey"],
  ) => GameState;
  recruitCollaborator: (state: GameState, contact: Contact, now: number) => GameState;
}

export function assignCollaborator(
  state: GameState,
  collaboratorId: string,
  assignment: CollaboratorAssignment,
  now = state.lastSavedAt,
): GameState {
  const collaborator = state.collaborators.find((candidate) => candidate.id === collaboratorId);
  if (!collaborator) return state;
  const reassignedState = {
    ...state,
    collaborators: state.collaborators.map((candidate) =>
      candidate.id === collaboratorId ? { ...candidate, assignment } : candidate,
    ),
  };
  const managedState = state.collaboratorManagement.aggregateViewUnlocked
    ? {
        ...reassignedState,
        collaboratorManagement: {
          ...reassignedState.collaboratorManagement,
          targets: getCollaboratorAssignmentCounts(reassignedState),
        },
      }
    : reassignedState;
  if (collaborator.assignment === "events" && assignment !== "events") {
    return cancelAutomatedEventForCollaborator(managedState, collaboratorId);
  }
  return assignment === "events"
    ? processAutomaticEvents(managedState, now)
    : managedState;
}

export function getAgonistCourseCost(state: GameState): number {
  const arenaLevel = state.upgrades["technical-arena"] ?? 0;
  if (arenaLevel < 3) return GAME_CONFIG.technicalArenaBaseCost;
  return arenaLevel >= 4
    ? GAME_CONFIG.agonistCourseDiscountedBaseCost
    : GAME_CONFIG.agonistCourseBaseCost;
}

export function startAgonistCourse(
  state: GameState,
  personId: string,
  instructorId: string,
  now: number,
): GameState {
  const arenaLevel = state.upgrades["technical-arena"] ?? 0;
  if (
    arenaLevel < 1 ||
    !state.unlocks.forms ||
    isSummerBreak(state.school.currentMonth)
  ) return state;

  const collaborator = state.collaborators.find((candidate) => candidate.id === personId);
  const member = state.contacts.find((contact) =>
    contact.id === personId &&
    contact.status === "enrolled" &&
    !state.collaborators.some((existing) => existing.contactId === contact.id)
  );
  const student = collaborator ?? member;
  const athleteContact = collaborator
    ? state.contacts.find((contact) =>
        contact.id === collaborator.contactId && contact.status === "enrolled"
      )
    : member;
  const instructor = state.collaborators.find((collaborator) =>
    collaborator.id === instructorId &&
    collaborator.assignment === "instructor"
  );
  const trainingYear = getFormTrainingYear(state.school.currentMonth);
  const annualTrainingLimit = getAnnualFormTrainingLimit(state.upgrades);
  const usedAnnualSlots = student ? getFormTrainingCount(student, trainingYear) : 0;
  const remainingAnnualSlots = annualTrainingLimit - usedAnnualSlots;
  const capacity = selectInstructorCapacity(state);
  const cost = getAgonistCourseCost(state);
  const agonistCourseGrantsStats = arenaLevel >= 3;
  if (
    !student ||
    !athleteContact ||
    !instructor ||
    student.training ||
    remainingAnnualSlots <= 0 ||
    student.lastAgonistCourseYear === trainingYear ||
    selectInstructorTeachingCount(state, instructor.id) >= capacity ||
    state.school.euros < cost
  ) return state;

  const requiredSwords = getAgonistCourseRequiredSwords(student.forms);
  const reservedEquipment = reserveSwords(state.equipment, requiredSwords);
  if (!reservedEquipment) {
    const waitingTraining = {
      formId: AGONIST_COURSE_ID,
      startedAt: now,
      completesAt: now,
      status: "waitingForEquipment" as const,
      requestedInstructorId: instructor.id,
      equipmentUsed: requiredSwords,
      wearPerSword: GAME_CONFIG.equipmentLoadPerAgonistCourse,
      agonistCourseGrantsStats,
    };
    return {
      ...state,
      contacts: member
        ? state.contacts.map((contact) => contact.id === member.id
          ? { ...contact, training: waitingTraining }
          : contact)
        : state.contacts,
      collaborators: collaborator
        ? state.collaborators.map((candidate) => candidate.id === collaborator.id
          ? { ...candidate, training: waitingTraining }
          : candidate)
        : state.collaborators,
    };
  }

  const baseDuration = arenaLevel >= 3
    ? GAME_CONFIG.agonistCourseDurationMs
    : arenaLevel >= 2
      ? GAME_CONFIG.technicalArenaImprovedDurationMs
      : GAME_CONFIG.technicalArenaDurationMs;
  const trainingSpeed = getCollaboratorProductivity(instructor, "instructor");
  const training = scheduleTraining(
    state,
    personId,
    now,
    baseDuration / trainingSpeed,
    {
      formId: AGONIST_COURSE_ID,
      instructorId: instructor.id,
      status: "running" as const,
      equipmentUsed: requiredSwords,
      wearPerSword: GAME_CONFIG.equipmentLoadPerAgonistCourse,
      agonistCourseSlotsConsumed: remainingAnnualSlots,
      agonistCourseGrantsStats,
      trainingTrack: "agonist",
      trainingPhase: "agonist",
    },
  );
  return {
    ...state,
    equipment: reservedEquipment,
    school: { ...state.school, euros: roundCurrency(state.school.euros - cost) },
    contacts: state.contacts.map((contact) => contact.id === athleteContact.id
      ? {
          ...contact,
          training: collaborator ? contact.training : training,
          lastFormTrainingYear: collaborator ? contact.lastFormTrainingYear : trainingYear,
          formTrainingYearCount: collaborator
            ? contact.formTrainingYearCount
            : annualTrainingLimit,
          lastAgonistCourseYear: trainingYear,
        }
      : contact),
    collaborators: collaborator
      ? state.collaborators.map((candidate) => candidate.id === collaborator.id
        ? {
            ...candidate,
            training,
            lastFormTrainingYear: trainingYear,
            formTrainingYearCount: annualTrainingLimit,
            lastAgonistCourseYear: trainingYear,
          }
        : candidate)
      : state.collaborators,
  };
}

export function startFormTraining(
  state: GameState,
  personId: string,
  formId: FormId,
  now: number,
  _dependencies: TrainingFlowDependencies,
): GameState {
  if (!state.unlocks.forms) return state;
  const collaborator = state.collaborators.find((candidate) => candidate.id === personId);
  const qualificationOnly = Boolean(
    collaborator?.assignment === "instructor" &&
    collaborator.forms.includes(formId) &&
    isInstructorForm(formId) &&
    !collaborator.instructorForms.includes(formId),
  );
  const canTrainAsInstructorInSummer = Boolean(
    collaborator?.assignment === "instructor" && isInstructorForm(formId),
  );
  if (isSummerBreak(state.school.currentMonth) && !canTrainAsInstructorInSummer) return state;
  const member = state.contacts.find((candidate) =>
    candidate.id === personId &&
    candidate.status === "enrolled" &&
    !state.collaborators.some((existing) => existing.contactId === candidate.id),
  );
  const student = collaborator ?? member;
  const definition = getFormDefinition(formId);
  const trainingYear = getFormTrainingYear(state.school.currentMonth);
  const annualTrainingLimit = getAnnualFormTrainingLimit(state.upgrades);
  if (qualificationOnly && collaborator && definition) {
    const qualificationCost = getInstructorQualificationCost(definition.cost);
    if (collaborator.training || state.school.euros < qualificationCost) return state;
    const training = scheduleTraining(
      state,
      collaborator.id,
      now,
      getInstructorQualificationDuration(definition.durationMs) /
        getCollaboratorProductivity(collaborator, "instructor"),
      {
        formId,
        status: "running",
        equipmentUsed: 0,
        wearPerSword: 0,
        includesInstructorCertification: true,
        trainingTrack: "instructor",
        trainingPhase: "instructor",
      },
    );
    return {
      ...state,
      school: {
        ...state.school,
        euros: roundCurrency(state.school.euros - qualificationCost),
      },
      collaborators: state.collaborators.map((candidate) =>
        candidate.id === collaborator.id
          ? { ...candidate, training }
          : candidate
      ),
    };
  }
  const instructorSelf = collaborator?.assignment === "instructor";
  const instructorTrack = Boolean(instructorSelf && isInstructorForm(formId));
  const instructor = !instructorSelf
    ? selectAvailableInstructor(state, formId, personId)
    : undefined;
  const trainingCost = instructorTrack
    ? getInstructorFormCost(definition?.cost ?? 0)
    : collaborator?.assignment === "instructor"
      ? definition?.cost ?? 0
      : instructor
        ? getStudentFormCost(definition?.cost ?? 0)
        : definition?.cost ?? 0;
  const branchCapacity = collaborator?.assignment === "instructor"
    ? Math.min(3, 1 + (state.upgrades["instructor-versatility"] ?? 0))
    : undefined;
  const instructorLearnedBranches = new Set(
    collaborator?.forms.flatMap((learnedFormId) => {
      const branch = getFormDefinition(learnedFormId)?.branch;
      return branch ? [branch] : [];
    }) ?? [],
  );
  const initialBranchCompatible = !definition?.branch ||
    instructorLearnedBranches.size > 0 ||
    !collaborator?.formBranchPreferences?.length ||
    collaborator.formBranchPreferences.includes(definition.branch);
  if (
    !student ||
    !definition ||
    !canTrainForm(
      student,
      definition,
      trainingYear,
      branchCapacity,
      collaborator?.assignment !== "instructor",
      annualTrainingLimit,
    ) ||
    !initialBranchCompatible ||
    state.school.euros < trainingCost
  ) return state;
  const reservedEquipment = reserveSwords(state.equipment, definition.requiredSwords);
  if (!reservedEquipment) {
    const waitingTraining = {
      formId,
      startedAt: now,
      completesAt: now,
      status: "waitingForEquipment" as const,
      requestedInstructorId: instructor?.id,
      equipmentUsed: definition.requiredSwords,
      wearPerSword: definition.loadPerSword,
    };
    return {
      ...state,
      contacts: member
        ? state.contacts.map((candidate) => candidate.id === member.id
          ? { ...candidate, training: waitingTraining }
          : candidate)
        : state.contacts,
      collaborators: collaborator
        ? state.collaborators.map((candidate) => candidate.id === collaborator.id
          ? { ...candidate, training: waitingTraining }
          : candidate)
        : state.collaborators,
    };
  }
  const trainingInstructor = instructor ?? (instructorTrack ? collaborator : undefined);
  const instructorTeachingSpeed = instructor
    ? 1 + getUpgradeEffectTotal(state.upgrades, "instructorTeachingSpeed")
    : 1;
  const trainingSpeed = trainingInstructor
    ? getCollaboratorProductivity(trainingInstructor, "instructor") * instructorTeachingSpeed
    : 1;
  const training = scheduleTraining(
    state,
    personId,
    now,
    definition.durationMs / trainingSpeed,
    {
      formId,
      instructorId: instructor?.id,
      status: "running" as const,
      equipmentUsed: definition.requiredSwords,
      wearPerSword: definition.loadPerSword,
      includesInstructorCertification: instructorTrack || undefined,
      trainingTrack: instructorTrack ? "combined-instructor" : "athlete",
      trainingPhase: "athlete",
    },
  );
  const formTrainingYearCount = getFormTrainingCount(student, trainingYear) + 1;
  const nextState = {
    ...state,
    equipment: reservedEquipment,
    school: {
      ...state.school,
      euros: roundCurrency(state.school.euros - trainingCost),
    },
    contacts: member
      ? state.contacts.map((candidate) => candidate.id === member.id
        ? {
            ...candidate,
            training,
            lastFormTrainingYear: trainingYear,
            formTrainingYearCount,
          }
        : candidate)
      : state.contacts,
    collaborators: collaborator
      ? state.collaborators.map((candidate) => candidate.id === collaborator.id
        ? {
            ...candidate,
            training,
            lastFormTrainingYear: trainingYear,
            formTrainingYearCount,
          }
        : candidate)
      : state.collaborators,
  };
  return nextState;
}

export function chooseFormBranchPreferences(seed: number): {
  preferences: FormBranch[];
  nextSeed: number;
} {
  const [countRoll, seedAfterCount] = nextRandom(seed);
  const count = countRoll < 0.65 ? 1 : countRoll < 0.95 ? 2 : 3;
  const [startRoll, nextSeed] = nextRandom(seedAfterCount);
  const start = Math.floor(startRoll * FORM_BRANCHES.length) % FORM_BRANCHES.length;
  return {
    preferences: Array.from(
      { length: count },
      (_, index) => FORM_BRANCHES[(start + index) % FORM_BRANCHES.length],
    ),
    nextSeed,
  };
}

function getExamFailureChance(training: FormTraining): number | undefined {
  const phase = getTrainingPhase(training);
  if (phase === "athlete") return 0.5;
  if (phase === "instructor") return 0.45;
  if (phase === "technician") return 0.4;
  return undefined;
}

function getFallbackTrainingBaseDuration(training: FormTraining): number {
  const definition = isAgonistCourse(training.formId)
    ? undefined
    : getFormDefinition(training.formId);
  if (!definition) return GAME_CONFIG.minimumTrainingDurationMs;
  const phase = getTrainingPhase(training);
  if (phase === "instructor") {
    return getInstructorQualificationDuration(definition.durationMs);
  }
  if (phase === "technician") {
    return getTechnicianCourseDuration(definition.durationMs);
  }
  return definition.durationMs;
}

function replacePersonTraining(
  state: GameState,
  personId: string,
  training: FormTraining | undefined,
): GameState {
  return {
    ...state,
    contacts: state.contacts.map((contact) =>
      contact.id === personId ? { ...contact, training } : contact
    ),
    collaborators: state.collaborators.map((collaborator) =>
      collaborator.id === personId ? { ...collaborator, training } : collaborator
    ),
  };
}

function resolveHiddenExam(
  state: GameState,
  personId: string,
  training: FormTraining,
  now: number,
): { state: GameState; passed: boolean } {
  const failureChance = getExamFailureChance(training);
  if (failureChance === undefined) return { state, passed: true };
  const [roll, nextSeed] = nextRandom(state.randomSeed);
  const rolledState = { ...state, randomSeed: nextSeed };
  if (roll >= failureChance) return { state: rolledState, passed: true };

  const baseDuration = training.trainingBaseDurationMs ??
    getFallbackTrainingBaseDuration(training);
  const durationMultiplier = getTrainingDurationMultiplier(state, personId, training);
  const extensionMs = Math.max(
    GAME_CONFIG.minimumTrainingDurationMs,
    Math.round(baseDuration * 0.1 * durationMultiplier),
  );
  return {
    state: replacePersonTraining(rolledState, personId, {
      ...training,
      completesAt: now + extensionMs,
      examFailures: (training.examFailures ?? 0) + 1,
      trainingBaseDurationMs: baseDuration,
      trainingDurationMultiplier: durationMultiplier,
    }),
    passed: false,
  };
}

export function resolveFormTraining(
  state: GameState,
  personId: string,
  now: number,
  dependencies: TrainingFlowDependencies,
): GameState {
  const collaborator = state.collaborators.find((candidate) => candidate.id === personId);
  const member = state.contacts.find((candidate) => candidate.id === personId);
  const student = collaborator ?? member;
  if (
    !student?.training ||
    student.training.status === "waitingForEquipment" ||
    student.training.completesAt > now
  ) return state;
  const training = student.training;
  const completedFormId = training.formId;
  const exam = resolveHiddenExam(state, personId, training, now);
  if (!exam.passed) return exam.state;
  const examState = exam.state;

  const phase = getTrainingPhase(training);
  const definition = isAgonistCourse(completedFormId)
    ? undefined
    : getFormDefinition(completedFormId);
  if (phase === "instructor") {
    if (!collaborator || !definition || isAgonistCourse(completedFormId)) {
      return replacePersonTraining(examState, personId, undefined);
    }
    const completedInstructorFormId = completedFormId;
    const qualifiedState = {
      ...examState,
      collaborators: examState.collaborators.map((candidate) =>
        candidate.id === collaborator.id
          ? {
              ...candidate,
              instructorForms: candidate.instructorForms.includes(completedInstructorFormId)
                ? candidate.instructorForms
                : [...candidate.instructorForms, completedInstructorFormId],
              training: undefined,
            }
          : candidate
      ),
    };
    return dependencies.addMessage(
      qualifiedState,
      now,
      "Corso Istruttori completato",
      `${collaborator.displayName} ha ottenuto l'attestato per ${definition.longName}.`,
      "positive",
      "other",
      "training",
    );
  }
  if (phase === "technician") {
    if (!collaborator || !definition || isAgonistCourse(completedFormId)) {
      return replacePersonTraining(examState, personId, undefined);
    }
    const completedTechnicianFormId = completedFormId;
    const technicianState = {
      ...examState,
      collaborators: examState.collaborators.map((candidate) =>
        candidate.id === collaborator.id
          ? {
              ...candidate,
              technicianForms: (candidate.technicianForms ?? []).includes(completedTechnicianFormId)
                ? candidate.technicianForms
                : [...(candidate.technicianForms ?? []), completedTechnicianFormId],
              training: undefined,
            }
          : candidate
      ),
    };
    return dependencies.addMessage(
      technicianState,
      now,
      "Corso Tecnico completato",
      `${collaborator.displayName} è ora Tecnico di ${definition.longName}.`,
      "positive",
      "other",
      "training",
    );
  }

  const completedEquipment = completeEquipmentUse(
    examState.equipment,
    training.equipmentUsed ?? 0,
    (training.equipmentUsed ?? 0) * (training.wearPerSword ?? 0),
  );
  if (isAgonistCourse(completedFormId)) {
    const athleteContact = collaborator
      ? examState.contacts.find((contact) => contact.id === collaborator.contactId)
      : member;
    if (!athleteContact) return examState;
    const grantsStats = training.agonistCourseGrantsStats ?? true;
    if (!grantsStats) {
      return {
        ...examState,
        equipment: completedEquipment,
        contacts: examState.contacts.map((contact) => contact.id === athleteContact.id
          ? { ...contact, training: collaborator ? contact.training : undefined }
          : contact),
        collaborators: collaborator
          ? examState.collaborators.map((candidate) => candidate.id === collaborator.id
            ? { ...candidate, training: undefined }
            : candidate)
          : examState.collaborators,
      };
    }
    const baseStats = getContactBaseStats(athleteContact);
    const maximumGain = getAgonistCourseMaximumStatGain(examState.upgrades);
    const [arenaRoll, afterArena] = nextRandom(examState.randomSeed);
    const [styleRoll, nextSeed] = nextRandom(afterArena);
    const slotsConsumed = Math.max(1, training.agonistCourseSlotsConsumed ?? 1);
    const arenaGain = (1 + Math.floor(arenaRoll * maximumGain)) * slotsConsumed;
    const styleGain = (1 + Math.floor(styleRoll * maximumGain)) * slotsConsumed;
    const totalCompletions = (athleteContact.agonistCourseCompletions ?? 0) + 1;
    const nextState: GameState = {
      ...examState,
      equipment: completedEquipment,
      randomSeed: nextSeed,
      contacts: examState.contacts.map((contact) => contact.id === athleteContact.id
          ? {
              ...contact,
              training: collaborator ? contact.training : undefined,
              arenaBase: baseStats.arena + arenaGain,
              styleBase: baseStats.style + styleGain,
              agonistCourseCompletions: totalCompletions,
              agonistCourseArenaBonus:
                (contact.agonistCourseArenaBonus ?? contact.agonistCourseCompletions ?? 0) +
                arenaGain,
              agonistCourseStyleBonus:
                (contact.agonistCourseStyleBonus ?? contact.agonistCourseCompletions ?? 0) +
                styleGain,
            }
          : contact),
      collaborators: collaborator
        ? examState.collaborators.map((candidate) => candidate.id === collaborator.id
          ? { ...candidate, training: undefined }
          : candidate)
        : examState.collaborators,
    };
    return nextState;
  }
  if (!definition || student.forms.includes(completedFormId)) return examState;
  const completedForms = [...student.forms, completedFormId];
  const preferenceResult = completedFormId === "course-y" &&
      (student.formBranchPreferences?.length ?? 0) === 0
    ? chooseFormBranchPreferences(examState.randomSeed)
    : {
        preferences: [...(student.formBranchPreferences ?? [])],
        nextSeed: examState.randomSeed,
      };
  const combinedInstructorCourse = getTrainingTrack(training) === "combined-instructor";
  const instructorPhase = combinedInstructorCourse && collaborator
    ? scheduleTraining(
        examState,
        collaborator.id,
        now,
        getInstructorQualificationDuration(definition.durationMs) /
          getCollaboratorProductivity(collaborator, "instructor"),
        {
          formId: completedFormId,
          status: "running",
          equipmentUsed: 0,
          wearPerSword: 0,
          includesInstructorCertification: true,
          trainingTrack: "combined-instructor",
          trainingPhase: "instructor",
        },
      )
    : undefined;
  let nextState: GameState = {
    ...examState,
    equipment: completedEquipment,
    randomSeed: preferenceResult.nextSeed,
    contacts: member && !collaborator
      ? examState.contacts.map((candidate) => candidate.id === member.id
        ? {
            ...candidate,
            forms: completedForms,
            formBranchPreferences: preferenceResult.preferences,
            training: undefined,
          }
        : candidate)
      : examState.contacts,
    collaborators: collaborator
      ? examState.collaborators.map((candidate) => candidate.id === collaborator.id
        ? {
            ...candidate,
            forms: completedForms,
            formBranchPreferences: preferenceResult.preferences,
            training: instructorPhase,
          }
        : candidate)
      : examState.collaborators,
    statistics: {
      ...examState.statistics,
      formsCompleted: examState.statistics.formsCompleted + 1,
    },
  };
  if (instructorPhase) return nextState;
  nextState = dependencies.addMessage(
    nextState,
    now,
    student.training.instructorId
      ? "Riepilogo formazione automatica"
      : "Formazione completata",
    `${collaborator?.displayName ?? `${member?.firstName} ${member?.lastName}`} ha completato ${definition.longName}.`,
    "positive",
    "other",
    "training",
  );
  if (
    !member ||
    collaborator ||
    completedFormId !== "course-y" ||
    member.rarity !== "ultra-rare"
  ) return nextState;
  const qualifiedMember = nextState.contacts.find((contact) => contact.id === member.id);
  return qualifiedMember
    ? dependencies.recruitCollaborator(nextState, qualifiedMember, now)
    : nextState;
}

export function processWaitingTrainings(
  state: GameState,
  now: number,
  dependencies: TrainingFlowDependencies,
): GameState {
  const waitingIds = [...state.contacts, ...state.collaborators]
    .filter((person) => person.training?.status === "waitingForEquipment")
    .sort((left, right) =>
      (left.training?.startedAt ?? 0) - (right.training?.startedAt ?? 0) ||
      left.id.localeCompare(right.id)
    )
    .map((person) => person.id);

  let nextState = state;
  for (const personId of waitingIds) {
    const contact = nextState.contacts.find((candidate) => candidate.id === personId);
    const collaborator = nextState.collaborators.find((candidate) => candidate.id === personId);
    const person = collaborator ?? contact;
    const waiting = person?.training;
    if (!person || waiting?.status !== "waitingForEquipment") continue;

    const requiredSwords = waiting.equipmentUsed ?? 1;
    if (getAvailableSwords(nextState.equipment) < requiredSwords) continue;

    nextState = {
      ...nextState,
      contacts: contact
        ? nextState.contacts.map((candidate) => candidate.id === personId
          ? { ...candidate, training: undefined }
          : candidate)
        : nextState.contacts,
      collaborators: collaborator
        ? nextState.collaborators.map((candidate) => candidate.id === personId
          ? { ...candidate, training: undefined }
          : candidate)
        : nextState.collaborators,
    };

    nextState = isAgonistCourse(waiting.formId)
      ? startAgonistCourse(
          nextState,
          personId,
          waiting.requestedInstructorId ?? "",
          now,
        )
      : startFormTraining(nextState, personId, waiting.formId, now, dependencies);

    const restarted = nextState.collaborators.find((candidate) => candidate.id === personId) ??
      nextState.contacts.find((candidate) => candidate.id === personId);
    if (!restarted?.training) {
      nextState = {
        ...nextState,
        contacts: contact
          ? nextState.contacts.map((candidate) => candidate.id === personId
            ? { ...candidate, training: waiting }
            : candidate)
          : nextState.contacts,
        collaborators: collaborator
          ? nextState.collaborators.map((candidate) => candidate.id === personId
            ? { ...candidate, training: waiting }
            : candidate)
          : nextState.collaborators,
      };
    }
  }
  return nextState;
}

