import {
  AGONIST_COURSE_ID,
  BRANCH_FORM_IDS,
  FORM_BRANCHES,
  canTrainForm,
  getCollaboratorProductivity,
  getFormDefinition,
  getFormTrainingCount,
  getAgonistCourseRequiredSwords,
  getInstructorConversionCost,
  getInstructorFormCost,
  getInstructorQualificationCost,
  getMissingInstructorForms,
  getStudentFormCost,
  isInstructorForm,
  isAgonistCourse,
} from "../content/forms";
import { COLLABORATOR_MASTERY_XP } from "../content/mastery";
import {
  getAgonistCourseMaximumStatGain,
  getAnnualFormTrainingLimit,
  getUpgradeEffectTotal,
  hasAutomaticInstructorCertificates,
  hasFreeFormTraining,
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
import { getPeopleInTraining } from "./runtimeIndexes";
import {
  selectAvailableInstructor,
  selectInstructorCapacity,
  selectInstructorTeachingCount,
} from "./selectors";
import type {
  CollaboratorAssignment,
  Contact,
  FormBranch,
  FormId,
  GameState,
  InboxMessage,
} from "./types";

const euroFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

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
  addCollaboratorMasteryExperience: (
    state: GameState,
    role: CollaboratorAssignment,
    amount: number,
    now: number,
  ) => GameState;
  addCollaboratorMasteryExperienceForCollaborator: (
    state: GameState,
    collaboratorId: string,
    role: Exclude<CollaboratorAssignment, null>,
    amount: number,
    now: number,
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
  if (collaborator.assignment === "events" && assignment !== "events") {
    return cancelAutomatedEventForCollaborator(reassignedState, collaboratorId, now);
  }
  return assignment === "events"
    ? processAutomaticEvents(reassignedState, now)
    : reassignedState;
}

export function toggleInstructorAutomation(
  state: GameState,
  collaboratorId: string,
  enabled: boolean,
  now: number,
): GameState {
  const nextState = {
    ...state,
    collaborators: state.collaborators.map((candidate) =>
      candidate.id === collaboratorId
        ? { ...candidate, autoTeachingEnabled: enabled }
        : candidate,
    ),
  };
  return refreshInstructorTrainingDurations(nextState, now);
}

export function getAgonistCourseCost(state: GameState): number {
  if (hasFreeFormTraining(state.upgrades)) return 0;
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
    collaborator.assignment === "instructor" &&
    collaborator.autoTeachingEnabled !== false
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
  const training = {
    formId: AGONIST_COURSE_ID,
    startedAt: now,
    completesAt: now + Math.max(
      GAME_CONFIG.minimumTrainingDurationMs,
      Math.round(baseDuration / trainingSpeed),
    ),
    instructorId: instructor.id,
    status: "running" as const,
    equipmentUsed: requiredSwords,
    wearPerSword: GAME_CONFIG.equipmentLoadPerAgonistCourse,
    agonistCourseSlotsConsumed: remainingAnnualSlots,
    agonistCourseGrantsStats,
  };
  return refreshInstructorTrainingDurations({
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
  }, now);
}

export function payInstructorCertificates(
  state: GameState,
  collaboratorId: string,
): GameState {
  const collaborator = state.collaborators.find((candidate) => candidate.id === collaboratorId);
  if (!collaborator || collaborator.assignment !== "instructor") return state;

  const missingForms = getMissingInstructorForms(collaborator);
  const cost = hasFreeFormTraining(state.upgrades)
    ? 0
    : getInstructorConversionCost(collaborator);
  if (missingForms.length === 0 || state.school.euros < cost) return state;

  const missingCompletedForms = missingForms.filter((formId) => collaborator.forms.includes(formId));
  const hasPendingTrainingCertification = Boolean(
    collaborator.training &&
    isInstructorForm(collaborator.training.formId) &&
    !collaborator.training.includesInstructorCertification &&
    !collaborator.forms.includes(collaborator.training.formId),
  );
  return {
    ...state,
    school: {
      ...state.school,
      euros: roundCurrency(state.school.euros - cost),
    },
    collaborators: state.collaborators.map((candidate) => {
      if (candidate.id !== collaboratorId) return candidate;
      return {
        ...candidate,
        instructorForms: [...candidate.instructorForms, ...missingCompletedForms],
        training: hasPendingTrainingCertification && candidate.training
          ? { ...candidate.training, includesInstructorCertification: true }
          : candidate.training,
      };
    }),
  };
}

function getInstructorTrainingDurationMultiplier(
  state: GameState,
  collaborator: GameState["collaborators"][number],
): number {
  return collaborator.autoTeachingEnabled !== false &&
      selectInstructorTeachingCount(state, collaborator.id) > 0
    ? GAME_CONFIG.instructorTrainingWhileTeachingDurationMultiplier
    : 1;
}

export function refreshInstructorTrainingDurations(
  state: GameState,
  now: number,
): GameState {
  const hasInstructorQualificationInProgress = getPeopleInTraining(
    state.collaborators,
  ).some((collaborator) =>
    collaborator.assignment === "instructor" &&
    collaborator.training!.status !== "waitingForEquipment" &&
    isInstructorForm(collaborator.training!.formId)
  );
  if (!hasInstructorQualificationInProgress) return state;

  let changed = false;
  const collaborators = state.collaborators.map((collaborator) => {
    const training = collaborator.training;
    if (
      collaborator.assignment !== "instructor" ||
      !training ||
      training.status === "waitingForEquipment" ||
      !isInstructorForm(training.formId)
    ) return collaborator;

    const previousMultiplier = training.instructorTrainingDurationMultiplier ?? 1;
    const nextMultiplier = getInstructorTrainingDurationMultiplier(state, collaborator);
    if (previousMultiplier === nextMultiplier) return collaborator;

    const previousDuration = Math.max(0, training.completesAt - training.startedAt);
    const elapsed = Math.min(
      previousDuration,
      Math.max(0, now - training.startedAt),
    );
    const remainingWork = previousMultiplier > 0
      ? Math.max(0, previousDuration - elapsed) / previousMultiplier
      : 0;
    changed = true;
    return {
      ...collaborator,
      training: {
        ...training,
        completesAt: now + Math.round(remainingWork * nextMultiplier),
        instructorTrainingDurationMultiplier: nextMultiplier,
      },
    };
  });

  return changed ? { ...state, collaborators } : state;
}

export function startFormTraining(
  state: GameState,
  personId: string,
  formId: FormId,
  now: number,
  dependencies: TrainingFlowDependencies,
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
    const qualificationCost = hasFreeFormTraining(state.upgrades)
      ? 0
      : getInstructorQualificationCost(definition.cost);
    if (collaborator.training || state.school.euros < qualificationCost) return state;
    return dependencies.addMessage(
      {
        ...state,
        school: {
          ...state.school,
          euros: roundCurrency(state.school.euros - qualificationCost),
        },
        collaborators: state.collaborators.map((candidate) =>
          candidate.id === collaborator.id
            ? { ...candidate, instructorForms: [...candidate.instructorForms, formId] }
            : candidate,
        ),
      },
      now,
      "Qualifica da Istruttore ottenuta",
      `${collaborator.displayName} ora può insegnare ${definition.longName}. Costo: ${euroFormatter.format(qualificationCost)}.`,
      "positive",
      "other",
      "training",
    );
  }
  const instructorSelf = collaborator?.assignment === "instructor";
  const instructorTrack = Boolean(instructorSelf && isInstructorForm(formId));
  const instructor = !instructorSelf
    ? selectAvailableInstructor(state, formId, personId)
    : undefined;
  const trainingInstructor = instructor ?? (instructorSelf ? collaborator : undefined);
  const trainingCost = hasFreeFormTraining(state.upgrades)
    ? 0
    : instructorTrack
      ? hasAutomaticInstructorCertificates(state.upgrades)
        ? definition?.cost ?? 0
        : getInstructorFormCost(definition?.cost ?? 0)
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
  const instructorTeachingSpeed = instructor
    ? 1 + getUpgradeEffectTotal(state.upgrades, "instructorTeachingSpeed")
    : 1;
  const trainingSpeed = trainingInstructor
    ? getCollaboratorProductivity(trainingInstructor, "instructor") * instructorTeachingSpeed
    : 1;
  const instructorTrainingDurationMultiplier = instructorTrack && collaborator
    ? getInstructorTrainingDurationMultiplier(state, collaborator)
    : 1;
  const training = {
    formId,
    startedAt: now,
    completesAt: now + Math.max(
      GAME_CONFIG.minimumTrainingDurationMs,
      Math.round(
        (definition.durationMs / trainingSpeed) * instructorTrainingDurationMultiplier,
      ),
    ),
    instructorId: instructor?.id,
    status: "running" as const,
    equipmentUsed: definition.requiredSwords,
    wearPerSword: definition.loadPerSword,
    includesInstructorCertification: instructorTrack || undefined,
    instructorTrainingDurationMultiplier: instructorTrack
      ? instructorTrainingDurationMultiplier
      : undefined,
  };
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
  return refreshInstructorTrainingDurations(nextState, now);
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
  const completedEquipment = completeEquipmentUse(
    state.equipment,
    student.training.equipmentUsed ?? 0,
    (student.training.equipmentUsed ?? 0) * (student.training.wearPerSword ?? 0),
  );
  const completedFormId = student.training.formId;
  if (isAgonistCourse(completedFormId)) {
    const athleteContact = collaborator
      ? state.contacts.find((contact) => contact.id === collaborator.contactId)
      : member;
    if (!athleteContact) return state;
    const grantsStats = student.training.agonistCourseGrantsStats ?? true;
    if (!grantsStats) {
      let nextState: GameState = {
        ...state,
        equipment: completedEquipment,
        contacts: state.contacts.map((contact) => contact.id === athleteContact.id
          ? { ...contact, training: collaborator ? contact.training : undefined }
          : contact),
        collaborators: collaborator
          ? state.collaborators.map((candidate) => candidate.id === collaborator.id
            ? { ...candidate, training: undefined }
            : candidate)
          : state.collaborators,
      };
      const instructorId = student.training.instructorId;
      if (instructorId) {
        nextState = dependencies.addCollaboratorMasteryExperienceForCollaborator(
          nextState,
          instructorId,
          "instructor",
          COLLABORATOR_MASTERY_XP.instructorTraining,
          now,
        );
      }
      return nextState;
    }
    const baseStats = getContactBaseStats(athleteContact);
    const maximumGain = getAgonistCourseMaximumStatGain(state.upgrades);
    const [arenaRoll, afterArena] = nextRandom(state.randomSeed);
    const [styleRoll, nextSeed] = nextRandom(afterArena);
    const slotsConsumed = Math.max(1, student.training.agonistCourseSlotsConsumed ?? 1);
    const arenaGain = (1 + Math.floor(arenaRoll * maximumGain)) * slotsConsumed;
    const styleGain = (1 + Math.floor(styleRoll * maximumGain)) * slotsConsumed;
    const totalCompletions = (athleteContact.agonistCourseCompletions ?? 0) + 1;
    let nextState: GameState = {
      ...state,
      equipment: completedEquipment,
      randomSeed: nextSeed,
      contacts: state.contacts.map((contact) => contact.id === athleteContact.id
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
        ? state.collaborators.map((candidate) => candidate.id === collaborator.id
          ? { ...candidate, training: undefined }
          : candidate)
        : state.collaborators,
    };
    const instructorId = student.training.instructorId ??
      (collaborator && student.training.includesInstructorCertification
        ? collaborator.id
        : undefined);
    if (instructorId) {
      nextState = dependencies.addCollaboratorMasteryExperienceForCollaborator(
        nextState,
        instructorId,
        "instructor",
        COLLABORATOR_MASTERY_XP.instructorTraining,
        now,
      );
    }
    return nextState;
  }
  const definition = getFormDefinition(completedFormId);
  if (!definition || student.forms.includes(completedFormId)) return state;
  const completedForms = [...student.forms, completedFormId];
  const preferenceResult = completedFormId === "course-y" &&
      (student.formBranchPreferences?.length ?? 0) === 0
    ? chooseFormBranchPreferences(state.randomSeed)
    : {
        preferences: [...(student.formBranchPreferences ?? [])],
        nextSeed: state.randomSeed,
      };
  let nextState: GameState = {
    ...state,
    equipment: completedEquipment,
    randomSeed: preferenceResult.nextSeed,
    contacts: member && !collaborator
      ? state.contacts.map((candidate) => candidate.id === member.id
        ? {
            ...candidate,
            forms: completedForms,
            formBranchPreferences: preferenceResult.preferences,
            training: undefined,
          }
        : candidate)
      : state.contacts,
    collaborators: collaborator
      ? state.collaborators.map((candidate) => candidate.id === collaborator.id
        ? {
            ...candidate,
            forms: completedForms,
            formBranchPreferences: preferenceResult.preferences,
            instructorForms: student.training?.includesInstructorCertification ||
                hasAutomaticInstructorCertificates(state.upgrades)
              ? [...candidate.instructorForms, completedFormId]
              : candidate.instructorForms,
            training: undefined,
          }
        : candidate)
      : state.collaborators,
    statistics: {
      ...state.statistics,
      formsCompleted: state.statistics.formsCompleted + 1,
    },
  };
  const instructorId = student.training.instructorId ??
    (collaborator && student.training.includesInstructorCertification
      ? collaborator.id
      : undefined);
  if (instructorId) {
    nextState = dependencies.addCollaboratorMasteryExperienceForCollaborator(
      nextState,
      instructorId,
      "instructor",
      COLLABORATOR_MASTERY_XP.instructorTraining,
      now,
    );
  }
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

export function getAutomaticFormCandidates(student: {
  forms: FormId[];
  formBranchPreferences?: FormBranch[];
}): FormId[] {
  const core: FormId[] = ["form-1", "course-x", "form-2", "course-y"];
  const nextCore = core.find((formId) => !student.forms.includes(formId));
  if (nextCore) return [nextCore];

  const completedFormFive = (["form-5-long", "form-5-staff", "form-5-double"] as FormId[])
    .some((formId) => student.forms.includes(formId));
  if (completedFormFive && !student.forms.includes("form-6")) return ["form-6"];
  if (completedFormFive && !student.forms.includes("form-7")) return ["form-7"];

  const preferredBranches = student.formBranchPreferences ?? [];
  const orderedBranches = preferredBranches.slice().sort((left, right) => {
    const startedLeft = BRANCH_FORM_IDS[left].some((formId) => student.forms.includes(formId));
    const startedRight = BRANCH_FORM_IDS[right].some((formId) => student.forms.includes(formId));
    return Number(startedRight) - Number(startedLeft);
  });
  return orderedBranches.flatMap((branch) => {
    const nextForm = BRANCH_FORM_IDS[branch].find((formId) => !student.forms.includes(formId));
    return nextForm ? [nextForm] : [];
  });
}
