import {
  AGONIST_COURSE_ID,
  canTrainForm,
  getCollaboratorProductivity,
  getFormDefinition,
  getFormTrainingCount,
  getAgonistCourseRequiredSwords,
  getInstructorFormCost,
  getInstructorQualificationCost,
  getInstructorQualificationDuration,
  needsCourseXRecovery,
  getStudentFormCost,
  isInstructorForm,
} from "../content/forms";
import {
  getAnnualFormTrainingLimit,
  getUpgradeEffectTotal,
  isCourseXUnlocked,
} from "../content/upgrades";
import { getFormTrainingYear, isSummerBreak } from "./calendar";
import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import { reserveSwords } from "./equipment";
import { cancelAutomatedEventForCollaborator } from "./eventFlow";
import { processAutomaticEvents } from "./eventAutomationFlow";
import { getCollaboratorAssignmentCounts } from "./collaboratorManagement";
import {
  selectAvailableInstructor,
  selectInstructorCapacity,
  selectInstructorTeachingCount,
} from "./selectors";
import {
  refreshTrainingDurations,
  scheduleTraining,
} from "./teacherTrainingFlow";
import { createTrainingStartPlan } from "./trainingStartPlan";
import type {
  CollaboratorAssignment,
  FormId,
  GameState,
} from "./types";
import {
  chooseFormBranchPreferences,
  resolveFormTraining,
  resolveFormTrainingBatch,
  type TrainingFlowDependencies,
} from "./trainingResolution";
import { getWaitingTrainingsByPriority } from "./runtimeIndexes";

export {
  chooseFormBranchPreferences,
  resolveFormTraining,
  resolveFormTrainingBatch,
};
export type { TrainingFlowDependencies };

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
  return GAME_CONFIG.agonistCourseBaseCost;
}

export function startAgonistCourse(
  state: GameState,
  personId: string,
  instructorId: string,
  now: number,
): GameState {
  const arenaLevel = state.upgrades["technical-arena"] ?? 0;
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
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
    (courseXUnlocked && needsCourseXRecovery(student.forms)) ||
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

  const baseDuration = arenaLevel >= 4
    ? GAME_CONFIG.agonistCourseImprovedDurationMs
    : arenaLevel >= 3
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
  return refreshTrainingDurations({
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

export function startFormTraining(
  state: GameState,
  personId: string,
  formId: FormId,
  now: number,
): GameState {
  if (!state.unlocks.forms) return state;
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const collaborator = state.collaborators.find((candidate) => candidate.id === personId);
  const candidateForms = collaborator?.forms ?? state.contacts.find(
    (candidate) => candidate.id === personId,
  )?.forms ?? [];
  if (
    (!courseXUnlocked && formId === "course-x") ||
    (courseXUnlocked && needsCourseXRecovery(candidateForms) && formId !== "course-x")
  ) return state;
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
  // Durante l'anno didattico anche un Istruttore resta un possibile allievo:
  // un collega qualificato gli insegna prima la Forma come atleta. In estate
  // rimane invece disponibile il percorso combinato personale gia previsto.
  const instructor = !instructorSelf || !isSummerBreak(state.school.currentMonth)
    ? selectAvailableInstructor(state, formId, personId)
    : undefined;
  const instructorTrack = Boolean(
    instructorSelf && !instructor && isInstructorForm(formId),
  );
  const trainingCost = instructorTrack
    ? getInstructorFormCost(definition?.cost ?? 0)
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
      courseXUnlocked,
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
  return refreshTrainingDurations(nextState, now);
}

export function processWaitingTrainings(
  state: GameState,
  now: number,
): GameState {
  const waitingPeople = getWaitingTrainingsByPriority(
    state.contacts,
    state.collaborators,
  );
  if (waitingPeople.length === 0) return state;

  const plan = createTrainingStartPlan(state, now);
  for (const person of waitingPeople) plan.restartWaitingTraining(person.id);
  return plan.commit();
}

