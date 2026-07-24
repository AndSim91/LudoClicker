import { FORM_DEFINITIONS, getTrainingCourseTitle } from "../../content/forms";
import type { Collaborator, FormId, FormTraining, GameState } from "../../game/types";

export interface InstructorTeachingEntry {
  id: string;
  displayName: string;
  training: FormTraining;
  instructorId: string;
}

function getRequestedInstructorId(training: FormTraining): string | undefined {
  return training.instructorId ?? training.requestedInstructorId;
}

export function getInstructorTeachingEntries(
  state: Pick<GameState, "contacts" | "collaborators">,
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
  ];
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
): FormId[] {
  const certified = new Set<FormId>(
    instructors.flatMap((instructor) => instructor.instructorForms),
  );
  return FORM_DEFINITIONS.flatMap((definition) =>
    certified.has(definition.id) ? [definition.id] : [],
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

