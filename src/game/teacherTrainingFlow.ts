import { getReptileOrdinaryShare } from "./reptileSectors";
import { getSpendableEuros } from "./debt";
import {
  FORM_DEFINITIONS,
  getFormDefinition,
  getCollaboratorProductivity,
  getInstructorQualificationDuration,
  getInternalInstructorQualificationCost,
  needsCourseXRecovery,
  getTechnicianCourseCost,
  getTechnicianCourseDuration,
  isAgonistCourse,
} from "../content/forms";
import {
  applyQualifyingCourseDiscount,
  areAllFormBranchesUnlocked,
  getInstructorStudentBranchCapacity,
  getPagoSportAllCourseSpeedBonus,
  getPagoSportTechnicianSpeedBonus,
  getSISTechnicianCourseSpeedBonus,
  getNetworkCourseSpeedBonus,
  isSISTechnicianCourseUnlocked,
  isCourseXUnlocked,
} from "../content/upgrades";
import { isSummerBreak } from "./calendar";
import { hasBothCourseXTitles } from "./courseXTitles";
import { getInstructorPendingReleaseIds } from "./collaboratorManagement";
import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import {
  getAutomaticFormCandidates,
  getFormProgressionRank,
} from "./formProgression";
import { getPeopleInTraining } from "./runtimeIndexes";
import { getTrainingRate } from "./trainingShares";
import { mapPersonTrainings } from "./trainingSlots";
import type {
  Collaborator,
  Contact,
  FormId,
  FormTraining,
  FormTrainingPhase,
  FormTrainingTrack,
  GameState,
} from "./types";
import { getReputationMultiplier } from "./reputation";

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

export function getTrainingDurationMultiplier(
  state: GameState,
  personId: string,
  training: FormTraining,
): number {
  const track = getTrainingTrack(training);
  let speed = 1 + getPagoSportAllCourseSpeedBonus(state.upgrades) +
    getNetworkCourseSpeedBonus(state.upgrades);
  // Reputation (Formazione) speeds up every course: athletes, agonists, Instructors, Technicians.
  speed *= getReputationMultiplier(state, "training");
  if (
    isSummerBreak(state.school.currentMonth) &&
    (track === "combined-instructor" || track === "instructor" || track === "technician")
  ) {
    speed += 1;
  }
  if (track === "technician") {
    speed += getPagoSportTechnicianSpeedBonus(state.upgrades) +
      getSISTechnicianCourseSpeedBonus(state.upgrades);
  }

  // Corsi in parallelo (13/10/2026): the share of capacity left for this course.
  return 1 / (Math.max(1, speed) * getTrainingRate(state, personId, training));
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
  };
}

function refreshCourse(
  state: GameState,
  personId: string,
  training: FormTraining,
  now: number,
): FormTraining {
  if (training.status === "waitingForEquipment" || training.completesAt <= now) return training;
  const previousMultiplier = training.trainingDurationMultiplier ??
    training.instructorTrainingDurationMultiplier ??
    1;
  const nextMultiplier = getTrainingDurationMultiplier(state, personId, training);
  if (
    Math.abs(previousMultiplier - nextMultiplier) < 0.000_001 &&
    training.instructorTrainingDurationMultiplier === undefined
  ) return training;

  const remaining = Math.max(0, training.completesAt - now);
  const completesAt = now + Math.round(remaining / Math.max(0.000_001, previousMultiplier) * nextMultiplier);
  // The bar keeps its place and only changes pace.
  const elapsed = Math.max(0, now - training.startedAt);
  const startedAt = remaining > 0 && elapsed > 0
    ? now - Math.round(elapsed * (completesAt - now) / remaining)
    : training.startedAt;
  const refreshed: FormTraining = {
    ...training,
    startedAt,
    completesAt,
    trainingDurationMultiplier: nextMultiplier,
  };
  delete refreshed.instructorTrainingDurationMultiplier;
  return refreshed;
}

function refreshPersonTraining<Person extends Contact | Collaborator>(
  state: GameState,
  person: Person,
  now: number,
): Person {
  const originalTraining = person.training;
  // Old saves: an Istruttore's plain course is the combined «Impara e abilita».
  const withTrack = originalTraining &&
    !originalTraining.trainingTrack &&
    "assignment" in person &&
    person.assignment === "instructor" &&
    !isAgonistCourse(originalTraining.formId)
    ? {
        ...person,
        training: {
          ...originalTraining,
          trainingTrack: "combined-instructor" as const,
          trainingPhase: "athlete" as const,
        },
      }
    : person;
  return mapPersonTrainings(withTrack, (training) =>
    refreshCourse(state, person.id, training, now)
  );
}

export function refreshTrainingDurations(state: GameState, now: number): GameState {
  const contactsInTraining = getPeopleInTraining(state.contacts);
  const collaboratorsInTraining = getPeopleInTraining(state.collaborators);
  if (contactsInTraining.length === 0 && collaboratorsInTraining.length === 0) return state;

  const contactUpdates = new Map<string, GameState["contacts"][number]>();
  const collaboratorUpdates = new Map<string, GameState["collaborators"][number]>();
  for (const contact of contactsInTraining) {
    const refreshed = refreshPersonTraining(state, contact, now);
    if (refreshed !== contact) contactUpdates.set(contact.id, refreshed);
  }
  for (const collaborator of collaboratorsInTraining) {
    const refreshed = refreshPersonTraining(state, collaborator, now);
    if (refreshed !== collaborator) collaboratorUpdates.set(collaborator.id, refreshed);
  }
  if (contactUpdates.size === 0 && collaboratorUpdates.size === 0) return state;
  return {
    ...state,
    contacts: contactUpdates.size === 0
      ? state.contacts
      : state.contacts.map((contact) => contactUpdates.get(contact.id) ?? contact),
    collaborators: collaboratorUpdates.size === 0
      ? state.collaborators
      : state.collaborators.map(
          (collaborator) => collaboratorUpdates.get(collaborator.id) ?? collaborator,
        ),
  };
}

export function bookTechnicianCourse(
  state: GameState,
  collaboratorId: string,
  formId: FormId,
  now: number,
): GameState {
  const collaborator = state.collaborators.find((candidate) => candidate.id === collaboratorId);
  const definition = getFormDefinition(formId);
  const cost = definition
    ? applyQualifyingCourseDiscount(
        state.upgrades,
        getTechnicianCourseCost(definition.cost),
      )
    : Infinity;
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const pendingReleaseIds = getInstructorPendingReleaseIds(state);
  if (
    !collaborator ||
    !definition ||
    formId === "course-x" || // Tecnico di Corso X = Tecnico di Forma 1 e 2 (courseXTitles.ts)
    (courseXUnlocked && needsCourseXRecovery(collaborator?.forms ?? [])) ||
    !isSISTechnicianCourseUnlocked(state.upgrades) ||
    collaborator.assignment !== "instructor" ||
    pendingReleaseIds.has(collaborator.id) ||
    !collaborator.forms.includes(formId) ||
    !collaborator.instructorForms.includes(formId) ||
    (collaborator.technicianForms ?? []).includes(formId) ||
    collaborator.technicianCourseReservation ||
    collaborator.technicianCourse ||
    getSpendableEuros(state) < cost
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
  if (!state.automation.autoTeachingEnabled) return state;
  if (!state.collaborators.some((collaborator) => collaborator.technicianCourseReservation)) {
    return state;
  }
  let nextState = state;
  const pendingReleaseIds = getInstructorPendingReleaseIds(state);
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
      (!isCourseXUnlocked(nextState.upgrades) && reservation.formId === "course-x") ||
      (isCourseXUnlocked(nextState.upgrades) && needsCourseXRecovery(collaborator.forms)) ||
      collaborator.technicianCourse ||
      collaborator.assignment !== "instructor" ||
      pendingReleaseIds.has(collaborator.id) ||
      !isSISTechnicianCourseUnlocked(nextState.upgrades) ||
      nextState.school.currentMonth < reservation.eligibleMonth
    ) continue;
    const definition = getFormDefinition(reservation.formId);
    if (!definition) continue;

    const training = scheduleTraining(
      nextState,
      collaborator.id,
      now,
      getTechnicianCourseDuration(definition.durationMs) /
        (getCollaboratorProductivity(collaborator, "instructor") *
          getReptileOrdinaryShare(nextState, "instructor")),
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
        const updated = { ...candidate, technicianCourse: training };
        delete updated.technicianCourseReservation;
        return updated;
      }),
    };
  }
  return nextState;
}

function getInstructorCourseDemandByForm(
  state: GameState,
  courseXUnlocked: boolean,
): ReadonlyMap<FormId, number> {
  const unrestrictedFormBranches = areAllFormBranchesUnlocked(state.upgrades);
  const collaboratorContactIds = new Set(
    state.collaborators.map((collaborator) => collaborator.contactId),
  );
  const demandByForm = new Map<FormId, number>();
  const registerPersonDemand = (
    person: GameState["contacts"][number] | GameState["collaborators"][number],
  ) => {
    if (person.training) return;
    // Una persona conta una sola volta per Forma anche se un vecchio salvataggio
    // contiene preferenze di ramo duplicate.
    const requestedForms = new Set(
      getAutomaticFormCandidates(
        person,
        courseXUnlocked,
        unrestrictedFormBranches,
        getInstructorStudentBranchCapacity(state.upgrades),
      ),
    );
    for (const formId of requestedForms) {
      demandByForm.set(formId, (demandByForm.get(formId) ?? 0) + 1);
    }
  };

  for (const contact of state.contacts) {
    if (
      contact.status === "enrolled" &&
      !collaboratorContactIds.has(contact.id)
    ) registerPersonDemand(contact);
  }
  for (const collaborator of state.collaborators) {
    registerPersonDemand(collaborator);
  }
  for (const group of state.memberGroups ?? []) {
    for (const formId of new Set(
      getAutomaticFormCandidates(group, courseXUnlocked, unrestrictedFormBranches),
    )) {
      demandByForm.set(formId, (demandByForm.get(formId) ?? 0) + group.count);
    }
  }
  return demandByForm;
}

function processInstructorQualifications(
  state: GameState,
  now: number,
): GameState {
  if (!state.automation.autoTeachingEnabled) return state;
  let nextState = state;
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const pendingReleaseIds = getInstructorPendingReleaseIds(state);
  // A Tecnico teaches one Corso Istruttori at a time; he may follow courses meanwhile.
  const activeTechnicianIds = new Set(
    state.collaborators.flatMap((collaborator) =>
      collaborator.instructorCourse?.technicianId
        ? [collaborator.instructorCourse.technicianId]
        : []
    ),
  );
  const formOrder = new Map(
    FORM_DEFINITIONS.map((definition, index) => [definition.id, index]),
  );
  const availableTechnicianForms = new Set<FormId>();
  for (const collaborator of state.collaborators) {
    if (
      collaborator.assignment !== "instructor" ||
      pendingReleaseIds.has(collaborator.id) ||
      activeTechnicianIds.has(collaborator.id)
    ) continue;
    for (const formId of collaborator.technicianForms ?? []) {
      availableTechnicianForms.add(formId);
    }
  }
  if (availableTechnicianForms.size === 0) return state;
  // Può aspirare alla qualifica soltanto un collaboratore già assegnato
  // al ruolo Istruttore; gli altri incarichi non entrano nella graduatoria.
  const qualificationCandidates = state.collaborators.flatMap((collaborator) => {
    if (
      collaborator.assignment !== "instructor" ||
      pendingReleaseIds.has(collaborator.id) ||
      collaborator.instructorCourse
    ) return [];
    const eLearningForms = collaborator.eLearningInstructorForms ?? [];
    return collaborator.forms.flatMap((formId) => {
      // An e-Learning Istruttore gets the Corso di aggiornamento, after everyone
      // who does not teach the Form yet.
      // Corso X: the Tecnico teaches Forma 1 and Forma 2 together, to whoever
      // knows both and still misses one of the two titles.
      const courseX = formId === "course-x";
      const refresher = !courseX && eLearningForms.includes(formId);
      const qualified = courseX
        ? !collaborator.forms.includes("form-2") || hasBothCourseXTitles(collaborator.instructorForms)
        : collaborator.instructorForms.includes(formId);
      return (!courseXUnlocked && courseX) ||
        (courseXUnlocked && needsCourseXRecovery(collaborator.forms)) ||
        (qualified && !refresher) ||
        !availableTechnicianForms.has(formId)
        ? []
        : [{
            collaboratorId: collaborator.id,
            formId,
            refresher,
            rank: getFormProgressionRank(formId),
            joinedAt: collaborator.joinedAt,
          }];
    });
  });
  if (qualificationCandidates.length === 0) return state;
  const demandByForm = getInstructorCourseDemandByForm(
    state,
    courseXUnlocked,
  );
  const candidates = qualificationCandidates.map((candidate) => ({
    ...candidate,
    demand: demandByForm.get(candidate.formId) ?? 0,
  })).sort((left, right) =>
    Number(left.refresher) - Number(right.refresher) ||
    // Two titles in one course beat Forma 1 or Forma 2 alone.
    Number(right.formId === "course-x") - Number(left.formId === "course-x") ||
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
    if (!definition || !trainee || trainee.instructorCourse) continue;
    const technician = nextState.collaborators
      .filter((collaborator) =>
        collaborator.id !== candidate.collaboratorId &&
        collaborator.assignment === "instructor" &&
        !pendingReleaseIds.has(collaborator.id) &&
        !usedTechnicianIds.has(collaborator.id) &&
        (collaborator.technicianForms ?? []).includes(candidate.formId)
      )
      .sort((left, right) => left.joinedAt - right.joinedAt || left.id.localeCompare(right.id))[0];
    if (!technician) continue;
    const cost = applyQualifyingCourseDiscount(
      nextState.upgrades,
      getInternalInstructorQualificationCost(definition.cost) *
        (candidate.refresher ? GAME_CONFIG.refresherCourseCostShare : 1),
    );
    if (getSpendableEuros(nextState) < cost) break;

    const training = scheduleTraining(
      nextState,
      candidate.collaboratorId,
      now,
      getInstructorQualificationDuration(definition.durationMs) *
        (candidate.refresher ? GAME_CONFIG.refresherCourseDurationShare : 1) /
        (getCollaboratorProductivity(trainee, "instructor") *
          getReptileOrdinaryShare(nextState, "instructor")),
      {
        formId: candidate.formId,
        status: "running",
        equipmentUsed: 0,
        wearPerSword: 0,
        technicianId: technician.id,
        includesInstructorCertification: true,
        trainingTrack: "instructor",
        trainingPhase: "instructor",
        ...(candidate.refresher ? { refresher: true } : {}),
      },
    );
    nextState = {
      ...nextState,
      school: { ...nextState.school, euros: roundCurrency(nextState.school.euros - cost) },
      collaborators: nextState.collaborators.map((collaborator) =>
        collaborator.id === candidate.collaboratorId
          ? { ...collaborator, instructorCourse: training }
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
