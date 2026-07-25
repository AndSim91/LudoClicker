import {
  FORM_DEFINITIONS,
  getMissingInstructorForms,
  getTrainingCourseTitle,
} from "../../content/forms";
import type { Collaborator, FormId, FormTraining, GameState } from "../../game/types";

export interface InstructorTeachingEntry {
  id: string;
  displayName: string;
  training: FormTraining;
  instructorId: string;
}

export interface AvailableInstructorCourse {
  instructor: Collaborator;
  formId: FormId;
}

export interface InternalInstructorCourseEntry {
  trainee: Collaborator;
  technician: Collaborator;
  formId: FormId;
  training: FormTraining;
}

function getRequestedInstructorId(training: FormTraining): string | undefined {
  return training.instructorId ?? training.requestedInstructorId;
}

export function getInstructorTeachingEntries(
  state: Pick<GameState, "contacts" | "collaborators">,
  courseXUnlocked = true,
): InstructorTeachingEntry[] {
  return [
    ...state.contacts.flatMap((contact) => {
      if (!contact.training) return [];
      const instructorId = getRequestedInstructorId(contact.training);
      return instructorId
        ? [{
            id: contact.id,
            displayName: `${contact.firstName} ${contact.lastName}`,
            training: contact.training,
            instructorId,
          }]
        : [];
    }),
    ...state.collaborators.flatMap((collaborator) => {
      if (!collaborator.training) return [];
      const instructorId = getRequestedInstructorId(collaborator.training);
      return instructorId
        ? [{
            id: collaborator.id,
            displayName: collaborator.displayName,
            training: collaborator.training,
            instructorId,
          }]
        : [];
    }),
  ].filter((entry) => courseXUnlocked || entry.training.formId !== "course-x");
}

export function getInstructorTrainingProgress(training: FormTraining, now: number): number {
  if (training.status === "waitingForEquipment") return 0;
  const duration = training.completesAt - training.startedAt;
  return duration <= 0
    ? 100
    : Math.min(100, Math.max(0, ((now - training.startedAt) / duration) * 100));
}

export function getAggregateInstructorProgress(
  entries: readonly InstructorTeachingEntry[],
  now: number,
): number | undefined {
  if (entries.length === 0) return undefined;
  return entries.reduce(
    (total, entry) => total + getInstructorTrainingProgress(entry.training, now),
    0,
  ) / entries.length;
}

export function getInstructorCoverageForms(
  instructors: readonly Collaborator[],
  courseXUnlocked = true,
): FormId[] {
  const certified = new Set<FormId>(
    instructors.flatMap((instructor) => instructor.instructorForms),
  );
  return FORM_DEFINITIONS.flatMap((definition) =>
    (courseXUnlocked || definition.id !== "course-x") && certified.has(definition.id)
      ? [definition.id]
      : [],
  );
}

export function getTechnicianCoverageForms(
  instructors: readonly Collaborator[],
  courseXUnlocked = true,
): FormId[] {
  const qualified = new Set<FormId>(
    instructors.flatMap((instructor) => instructor.technicianForms ?? []),
  );
  return FORM_DEFINITIONS.flatMap((definition) =>
    (courseXUnlocked || definition.id !== "course-x") && qualified.has(definition.id)
      ? [definition.id]
      : [],
  );
}

export function getInternalInstructorCourseEntries(
  collaborators: readonly Collaborator[],
  courseXUnlocked = true,
): InternalInstructorCourseEntry[] {
  const collaboratorsById = new Map(
    collaborators.map((collaborator) => [collaborator.id, collaborator]),
  );
  return collaborators.flatMap((trainee) => {
    const training = trainee.training;
    const technician = training?.technicianId
      ? collaboratorsById.get(training.technicianId)
      : undefined;
    return training &&
      technician &&
      training.trainingPhase === "instructor" &&
      training.formId !== "agonist-course" &&
      (courseXUnlocked || training.formId !== "course-x")
      ? [{ trainee, technician, formId: training.formId, training }]
      : [];
  });
}

export function getAvailableInstructorCourseCount(
  instructors: readonly Collaborator[],
  courseXUnlocked = true,
): number {
  return getAvailableInstructorCourses(instructors, courseXUnlocked).length;
}

export function getAvailableInstructorCourses(
  instructors: readonly Collaborator[],
  courseXUnlocked = true,
): AvailableInstructorCourse[] {
  return instructors.flatMap((instructor) =>
    getMissingInstructorForms(instructor)
      .filter((formId) => courseXUnlocked || formId !== "course-x")
      .map((formId) => ({ instructor, formId })),
  );
}

export function getInstructorTeachingTitle(
  entry: InstructorTeachingEntry,
  technicalArenaLevel: number,
): string {
  return getTrainingCourseTitle(
    entry.training.formId,
    technicalArenaLevel,
    entry.training.agonistCourseGrantsStats,
  );
}
