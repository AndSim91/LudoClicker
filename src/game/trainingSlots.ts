import type { FormTraining } from "./types";

/**
 * Corsi in parallelo (Andrea, 13/10/2026): a person follows up to three courses at
 * once, one per slot. `training` is the course as allievo (Forma, Corso Agonisti or
 * the combined «Impara e abilita»); the other two exist only for collaborators.
 */
export type TrainingSlot = "training" | "instructorCourse" | "technicianCourse";

export const TRAINING_SLOTS: readonly TrainingSlot[] = [
  "training",
  "instructorCourse",
  "technicianCourse",
];

export type SlottedPerson = Partial<Record<TrainingSlot, FormTraining>>;

export function getTrainingSlot(training: Pick<FormTraining, "trainingTrack">): TrainingSlot {
  if (training.trainingTrack === "instructor") return "instructorCourse";
  if (training.trainingTrack === "technician") return "technicianCourse";
  return "training";
}

export function hasAnyTraining(person: SlottedPerson): boolean {
  return Boolean(person.training || person.instructorCourse || person.technicianCourse);
}

/** The courses a person is following, with their slot. */
export function getPersonTrainings(
  person: SlottedPerson,
): Array<[TrainingSlot, FormTraining]> {
  const trainings: Array<[TrainingSlot, FormTraining]> = [];
  for (const slot of TRAINING_SLOTS) {
    const training = person[slot];
    if (training) trainings.push([slot, training]);
  }
  return trainings;
}

/** Applies `update` to every course; returns the same person when nothing changed. */
export function mapPersonTrainings<T extends SlottedPerson>(
  person: T,
  update: (training: FormTraining, slot: TrainingSlot) => FormTraining | undefined,
): T {
  let next = person;
  for (const slot of TRAINING_SLOTS) {
    const training = person[slot];
    if (!training) continue;
    const updated = update(training, slot);
    if (updated === training) continue;
    if (next === person) next = { ...person };
    if (updated) next[slot] = updated as T[TrainingSlot];
    else delete next[slot];
  }
  return next;
}

/** Same person with `training` placed in its own slot (or the slot emptied). */
export function setPersonTraining<T extends SlottedPerson>(
  person: T,
  slot: TrainingSlot,
  training: FormTraining | undefined,
): T {
  const next = { ...person };
  if (training) next[slot] = training as T[TrainingSlot];
  else delete next[slot];
  return next;
}
