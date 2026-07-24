import {
  FORM_DEFINITIONS,
  getFormDefinition,
  getCollaboratorProductivity,
  getInstructorQualificationDuration,
  getInternalInstructorQualificationCost,
  getTechnicianCourseCost,
  getTechnicianCourseDuration,
  isAgonistCourse,
} from "../content/forms";
import {
  getPagoSportAllCourseSpeedBonus,
  getPagoSportTechnicianSpeedBonus,
} from "../content/upgrades";
import { isSummerBreak } from "./calendar";
import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import {
  getAutomaticFormCandidates,
  getFormProgressionRank,
} from "./formProgression";
import { getPriorityInstructorQualificationTechnicianIds } from "./instructorPriority";
import { selectInstructorTeachingCount } from "./selectors";
import type {
  FormId,
  FormTraining,
  FormTrainingPhase,
  FormTrainingTrack,
  GameState,
} from "./types";

function getMonthOfYear(currentMonth: number): number {
  return ((Math.max(1, Math.floor(currentMonth)) - 1) % 12) + 1;
}

export function getNextSISStartMonth(currentMonth: number): number {
  const normalizedMonth = Math.max(1, Math.floor(currentMonth));
  const monthOfYear = getMonthOfYear(normalizedMonth);
  if (monthOfYear === 7 || monthOfYear === 8) return normalizedMonth;
  const yearStart = normalizedMonth - monthOfYear + 1;
  return monthOfYear < 7 ? yearStart + 6 : yearStart + 18;
}

export function getTrainingTrack(training: FormTraining): FormTrainingTrack {
  if (training.trainingTrack) return training.trainingTrack;
  if (isAgonistCourse(training.formId)) return "agonist";
  return training.includesInstructorCertification ? "combined-instructor" : "athlete";
}

export function getTrainingPhase(training: FormTraining): FormTrainingPhase {
  if (training.trainingPhase) return training.trainingPhase;
  const track = getTrainingTrack(training);
  if (track === "instructor") return "instructor";
  if (track === "technician") return "technician";
  if (track === "agonist") return "agonist";
  return "athlete";
}

function hasActiveStudentLesson(state: GameState, collaboratorId: string): boolean {
  return selectInstructorTeachingCount(state, collaboratorId) > 0;
}

export function getInstructorTrainingWorkloadMultiplier(
  state: GameState,
  personId: string,
  training: FormTraining,
): number | undefined {
  const track = getTrainingTrack(training);
  const phase = getTrainingPhase(training);
  const teacherTraining = phase === "instructor" ||
    phase === "technician" ||
    track === "combined-instructor";
  if (!teacherTraining) return undefined;
  return hasActiveStudentLesson(state, personId) ||
    Boolean(
      training.technicianId &&
      hasActiveStudentLesson(state, training.technicianId),
    )
    ? GAME_CONFIG.instructorTrainingWhileTeachingDurationMultiplier
    : 1;
}

export function getTrainingDurationMultiplier(
  state: GameState,
  personId: string,
  training: FormTraining,
): number {
  const track = getTrainingTrack(training);
  let speed = 1 + getPagoSportAllCourseSpeedBonus(state.upgrades);
  if (
    isSummerBreak(state.school.currentMonth) &&
    (track === "combined-instructor" || track === "instructor" || track === "technician")
  ) {
    speed += 1;
  }
  if (track === "technician") {
    speed += getPagoSportTechnicianSpeedBonus(state.upgrades);
  }

  const workloadMultiplier = getInstructorTrainingWorkloadMultiplier(
    state,
    personId,
    training,
  ) ?? 1;
  return workloadMultiplier / Math.max(1, speed);
}

export function scheduleTraining(
  state: GameState,
  personId: string,
  now: number,
  baseDurationMs: number,
  training: Omit<FormTraining, "startedAt" | "completesAt">,
): FormTraining {
  const timingDraft: FormTraining = {
    ...training,
    startedAt: now,
    completesAt: now,
    trainingBaseDurationMs: baseDurationMs,
    trainingDurationMultiplier: 1,
  };
  const trainingDurationMultiplier = getTrainingDurationMultiplier(
    state,
    personId,
    timingDraft,
  );
  return {
    ...timingDraft,
    completesAt: now + Math.max(
      GAME_CONFIG.minimumTrainingDurationMs,
      Math.round(baseDurationMs * trainingDurationMultiplier),
    ),
    trainingDurationMultiplier,
    instructorTrainingDurationMultiplier: getInstructorTrainingWorkloadMultiplier(
      state,
      personId,
      timingDraft,
    ),
  };
}

function refreshPersonTraining<
  Person extends { id: string; training?: FormTraining },
>(state: GameState, person: Person, now: number): Person {
  const originalTraining = person.training;
  const training = originalTraining &&
    !originalTraining.trainingTrack &&
    "assignment" in person &&
    person.assignment === "instructor" &&
    !isAgonistCourse(originalTraining.formId)
    ? {
        ...originalTraining,
        trainingTrack: "combined-instructor" as const,
        trainingPhase: "athlete" as const,
      }
    : originalTraining;
  if (
    !training ||
    training.status === "waitingForEquipment" ||
    training.completesAt <= now
  ) return person;

  const previousMultiplier = training.trainingDurationMultiplier ??
    training.instructorTrainingDurationMultiplier ??
    1;
  const nextMultiplier = getTrainingDurationMultiplier(state, person.id, training);
  const nextWorkloadMultiplier = getInstructorTrainingWorkloadMultiplier(
    state,
    person.id,
    training,
  );
  if (
    training === originalTraining &&
    Math.abs(previousMultiplier - nextMultiplier) < 0.000_001 &&
    training.instructorTrainingDurationMultiplier === nextWorkloadMultiplier
  ) return person;

  const remainingWork = Math.max(0, training.completesAt - now) /
    Math.max(0.000_001, previousMultiplier);
  return {
    ...person,
    training: {
      ...training,
      completesAt: now + Math.round(remainingWork * nextMultiplier),
      trainingDurationMultiplier: nextMultiplier,
      instructorTrainingDurationMultiplier: nextWorkloadMultiplier,
    },
  };
}

export function refreshTrainingDurations(state: GameState, now: number): GameState {
  const contacts = state.contacts.map((contact) => refreshPersonTraining(state, contact, now));
  const collaborators = state.collaborators.map((collaborator) =>
    refreshPersonTraining(state, collaborator, now)
  );
  const changed = contacts.some((contact, index) => contact !== state.contacts[index]) ||
    collaborators.some((collaborator, index) => collaborator !== state.collaborators[index]);
  return changed ? { ...state, contacts, collaborators } : state;
}

export function bookTechnicianCourse(
  state: GameState,
  collaboratorId: string,
  formId: FormId,
  now: number,
): GameState {
  const collaborator = state.collaborators.find((candidate) => candidate.id === collaboratorId);
  const definition = getFormDefinition(formId);
  const cost = definition ? getTechnicianCourseCost(definition.cost) : Infinity;
  if (
    !collaborator ||
    !definition ||
    collaborator.assignment !== "instructor" ||
    !collaborator.forms.includes(formId) ||
    !collaborator.instructorForms.includes(formId) ||
    (collaborator.technicianForms ?? []).includes(formId) ||
    collaborator.technicianCourseReservation ||
    getTrainingTrack(collaborator.training ?? {
      formId,
      startedAt: 0,
      completesAt: 0,
    }) === "technician" ||
    state.school.euros < cost
  ) return state;

  const booked: GameState = {
    ...state,
    school: { ...state.school, euros: roundCurrency(state.school.euros - cost) },
    collaborators: state.collaborators.map((candidate) =>
      candidate.id === collaboratorId
        ? {
            ...candidate,
            technicianCourseReservation: {
              formId,
              bookedAt: now,
              eligibleMonth: getNextSISStartMonth(state.school.currentMonth),
            },
          }
        : candidate
    ),
  };
  return processTechnicianCourseReservations(booked, now);
}

export function processTechnicianCourseReservations(
  state: GameState,
  now: number,
): GameState {
  let nextState = state;
  const priorityQualificationTechnicianIds =
    getPriorityInstructorQualificationTechnicianIds(state);
  const reservations = state.collaborators
    .filter((collaborator) => collaborator.technicianCourseReservation)
    .sort((left, right) =>
      (left.technicianCourseReservation?.bookedAt ?? 0) -
        (right.technicianCourseReservation?.bookedAt ?? 0) ||
      left.joinedAt - right.joinedAt ||
      left.id.localeCompare(right.id)
    );

  for (const reservedCollaborator of reservations) {
    const collaborator = nextState.collaborators.find(
      (candidate) => candidate.id === reservedCollaborator.id,
    );
    const reservation = collaborator?.technicianCourseReservation;
    if (
      !collaborator ||
      !reservation ||
      collaborator.training ||
      priorityQualificationTechnicianIds.has(collaborator.id) ||
      collaborator.assignment !== "instructor" ||
      nextState.school.currentMonth < reservation.eligibleMonth
    ) continue;
    const definition = getFormDefinition(reservation.formId);
    if (!definition) continue;

    const training = scheduleTraining(
      nextState,
      collaborator.id,
      now,
      getTechnicianCourseDuration(definition.durationMs) /
        getCollaboratorProductivity(collaborator, "instructor"),
      {
        formId: reservation.formId,
        status: "running",
        equipmentUsed: 0,
        wearPerSword: 0,
        trainingTrack: "technician",
        trainingPhase: "technician",
      },
    );
    nextState = {
      ...nextState,
      collaborators: nextState.collaborators.map((candidate) => {
        if (candidate.id !== collaborator.id) return candidate;
        const updated = { ...candidate, training };
        delete updated.technicianCourseReservation;
        return updated;
      }),
    };
  }
  return nextState;
}

function getInstructorCourseDemand(state: GameState, formId: FormId): number {
  const collaboratorContactIds = new Set(
    state.collaborators.map((collaborator) => collaborator.contactId),
  );
  return [
    ...state.contacts.filter((contact) =>
      contact.status === "enrolled" && !collaboratorContactIds.has(contact.id)
    ),
    ...state.collaborators,
  ].filter((person) =>
    !person.training && getAutomaticFormCandidates(person).includes(formId)
  ).length;
}

function processInstructorQualifications(
  state: GameState,
  now: number,
): GameState {
  let nextState = state;
  const activeTechnicianIds = new Set(
    state.collaborators.flatMap((collaborator) =>
      collaborator.training?.technicianId
        ? [collaborator.training.technicianId]
        : []
    ),
  );
  const formOrder = new Map(
    FORM_DEFINITIONS.map((definition, index) => [definition.id, index]),
  );
  // Può aspirare alla qualifica soltanto un collaboratore già assegnato
  // al ruolo Istruttore; gli altri incarichi non entrano nella graduatoria.
  const candidates = state.collaborators.flatMap((collaborator) => {
    if (
      collaborator.assignment !== "instructor" ||
      collaborator.training ||
      activeTechnicianIds.has(collaborator.id)
    ) return [];
    return collaborator.forms.flatMap((formId) =>
      collaborator.instructorForms.includes(formId)
        ? []
        : [{
            collaboratorId: collaborator.id,
            formId,
            rank: getFormProgressionRank(formId),
            demand: getInstructorCourseDemand(state, formId),
            joinedAt: collaborator.joinedAt,
          }]
    );
  }).sort((left, right) =>
    left.rank - right.rank ||
    right.demand - left.demand ||
    left.joinedAt - right.joinedAt ||
    (formOrder.get(left.formId) ?? Infinity) - (formOrder.get(right.formId) ?? Infinity) ||
    left.collaboratorId.localeCompare(right.collaboratorId)
  );

  const usedTechnicianIds = new Set(activeTechnicianIds);
  const startedCollaboratorIds = new Set<string>();
  for (const candidate of candidates) {
    if (startedCollaboratorIds.has(candidate.collaboratorId)) continue;
    const definition = getFormDefinition(candidate.formId);
    const trainee = nextState.collaborators.find(
      (collaborator) => collaborator.id === candidate.collaboratorId,
    );
    if (!definition || !trainee || trainee.training) continue;
    const technician = nextState.collaborators
      .filter((collaborator) =>
        collaborator.id !== candidate.collaboratorId &&
        collaborator.assignment === "instructor" &&
        !usedTechnicianIds.has(collaborator.id) &&
        (collaborator.technicianForms ?? []).includes(candidate.formId)
      )
      .sort((left, right) => left.joinedAt - right.joinedAt || left.id.localeCompare(right.id))[0];
    if (!technician) continue;
    const cost = getInternalInstructorQualificationCost(definition.cost);
    if (nextState.school.euros < cost) break;

    const training = scheduleTraining(
      nextState,
      candidate.collaboratorId,
      now,
      getInstructorQualificationDuration(definition.durationMs) /
        getCollaboratorProductivity(trainee, "instructor"),
      {
        formId: candidate.formId,
        status: "running",
        equipmentUsed: 0,
        wearPerSword: 0,
        technicianId: technician.id,
        includesInstructorCertification: true,
        trainingTrack: "instructor",
        trainingPhase: "instructor",
      },
    );
    nextState = {
      ...nextState,
      school: { ...nextState.school, euros: roundCurrency(nextState.school.euros - cost) },
      collaborators: nextState.collaborators.map((collaborator) =>
        collaborator.id === candidate.collaboratorId
          ? { ...collaborator, training }
          : collaborator
      ),
    };
    usedTechnicianIds.add(technician.id);
    startedCollaboratorIds.add(candidate.collaboratorId);
  }
  return nextState;
}

export function processPriorityInstructorQualifications(
  state: GameState,
  now: number,
): GameState {
  // Il motore esegue questo passaggio prima delle altre automazioni didattiche.
  return processInstructorQualifications(state, now);
}

export function processAutomaticInstructorQualifications(
  state: GameState,
  now: number,
): GameState {
  return processInstructorQualifications(state, now);
}

export function processTeacherTraining(state: GameState, now: number): GameState {
  return processAutomaticInstructorQualifications(
    processTechnicianCourseReservations(state, now),
    now,
  );
}
