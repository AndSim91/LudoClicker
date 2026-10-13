import { getCollaboratorsById, getPeopleInTraining } from "./runtimeIndexes";
import { selectAthleticPreparationInstructorIds } from "./selectors";
import { getTrainingSlot, type TrainingSlot } from "./trainingSlots";
import type { FormTraining, GameState } from "./types";

/**
 * Capacità della persona (Andrea, 13/10/2026). A collaborator has one capacity,
 * split among the activities that are running, by weight: each one gets
 * weight / sum of the active weights (alone it is always 100%).
 */
export const ACTIVITY_WEIGHTS = {
  /** Any course followed: as allievo, Corso Istruttori, Corso Tecnici, Corso Agonisti. */
  followedCourse: 1,
  /** The allievi taught as Istruttore: one activity however many they are. */
  studentClass: 2,
  /** Preparazione atletica, the fallback of an Istruttore without allievi. */
  athleticPreparation: 2,
  /** The Corso Istruttori taught as Tecnico. */
  instructorCourseTaught: 3,
} as const;

interface CapacityIndex {
  totalWeights: ReadonlyMap<string, number>;
  preparationIds: ReadonlySet<string>;
}

const capacityCache = new WeakMap<object, WeakMap<object, WeakMap<object, CapacityIndex>>>();

function isRunning(training: FormTraining | undefined): training is FormTraining {
  return Boolean(training && training.status !== "waitingForEquipment");
}

function buildCapacityIndex(state: GameState): CapacityIndex {
  const totalWeights = new Map<string, number>();
  const add = (id: string, weight: number) =>
    totalWeights.set(id, (totalWeights.get(id) ?? 0) + weight);
  const classTeacherIds = new Set<string>();
  const courseTeacherIds = new Set<string>();
  for (const person of getPeopleInTraining(state.contacts)) {
    if (isRunning(person.training) && person.training.instructorId) {
      classTeacherIds.add(person.training.instructorId);
    }
  }
  for (const collaborator of getPeopleInTraining(state.collaborators)) {
    const { training, instructorCourse, technicianCourse } = collaborator;
    if (isRunning(training)) {
      add(collaborator.id, ACTIVITY_WEIGHTS.followedCourse);
      if (training.instructorId) classTeacherIds.add(training.instructorId);
    }
    if (isRunning(instructorCourse)) {
      add(collaborator.id, ACTIVITY_WEIGHTS.followedCourse);
      if (instructorCourse.technicianId) courseTeacherIds.add(instructorCourse.technicianId);
    }
    if (isRunning(technicianCourse)) add(collaborator.id, ACTIVITY_WEIGHTS.followedCourse);
  }
  for (const id of classTeacherIds) add(id, ACTIVITY_WEIGHTS.studentClass);
  for (const id of courseTeacherIds) add(id, ACTIVITY_WEIGHTS.instructorCourseTaught);
  const preparationIds = selectAthleticPreparationInstructorIds(state);
  for (const id of preparationIds) {
    if (!classTeacherIds.has(id)) add(id, ACTIVITY_WEIGHTS.athleticPreparation);
  }
  return { totalWeights, preparationIds };
}

/** Kept per contacts × collaborators × upgrades: every course start asks for it. */
function getCapacityIndex(state: GameState): CapacityIndex {
  let byCollaborators = capacityCache.get(state.contacts);
  if (!byCollaborators) {
    byCollaborators = new WeakMap();
    capacityCache.set(state.contacts, byCollaborators);
  }
  let byUpgrades = byCollaborators.get(state.collaborators);
  if (!byUpgrades) {
    byUpgrades = new WeakMap();
    byCollaborators.set(state.collaborators, byUpgrades);
  }
  let index = byUpgrades.get(state.upgrades);
  if (!index) {
    index = buildCapacityIndex(state);
    byUpgrades.set(state.upgrades, index);
  }
  return index;
}

/** Share of the capacity of `personId` that goes to an activity of `weight`. */
export function getActivityShare(state: GameState, personId: string, weight: number): number {
  const total = getCapacityIndex(state).totalWeights.get(personId) ?? 0;
  return total <= weight ? 1 : weight / total;
}

/** Share of an Istruttore's capacity that goes to Preparazione atletica (0 if not doing it). */
export function getAthleticPreparationShare(state: GameState, collaboratorId: string): number {
  return getCapacityIndex(state).preparationIds.has(collaboratorId)
    ? getActivityShare(state, collaboratorId, ACTIVITY_WEIGHTS.athleticPreparation)
    : 0;
}

/**
 * Speed of a course (1 = full): the lower of the student's share and the share
 * the teacher gives to it, so a teacher who slows down slows his allievi too.
 */
export function getTrainingRate(
  state: GameState,
  personId: string,
  training: FormTraining,
  slot: TrainingSlot = getTrainingSlot(training),
): number {
  const isCollaborator = getCollaboratorsById(state.collaborators).has(personId);
  let rate = isCollaborator
    ? getActivityShare(state, personId, ACTIVITY_WEIGHTS.followedCourse)
    : 1;
  if (slot === "training" && training.instructorId) {
    rate = Math.min(
      rate,
      getActivityShare(state, training.instructorId, ACTIVITY_WEIGHTS.studentClass),
    );
  }
  if (slot === "instructorCourse" && training.technicianId) {
    rate = Math.min(
      rate,
      getActivityShare(state, training.technicianId, ACTIVITY_WEIGHTS.instructorCourseTaught),
    );
  }
  return rate;
}
