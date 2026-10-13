import type { FormId } from "./types";

/**
 * Corso X titles are never earned with their own course (decision of 13/10):
 * Istruttore of Corso X = Istruttore of both Forma 1 and Forma 2, Tecnico of
 * Corso X = Tecnico of both. A Tecnico of Corso X teaches Forma 1 and Forma 2
 * together (see `processInstructorQualifications`), which brings the Corso X
 * title with them. e-Learning if either Forma 1 or Forma 2 is.
 */
interface TitleHolder {
  instructorForms: FormId[];
  technicianForms?: FormId[];
  eLearningInstructorForms?: FormId[];
}

const BOTH: readonly FormId[] = ["form-1", "form-2"];

function setCourseX(forms: FormId[] | undefined, present: boolean): FormId[] | undefined {
  const has = forms?.includes("course-x") ?? false;
  if (has === present) return forms;
  return present ? [...(forms ?? []), "course-x"] : forms!.filter((formId) => formId !== "course-x");
}

export function hasBothCourseXTitles(forms: readonly FormId[] | undefined): boolean {
  return BOTH.every((formId) => forms?.includes(formId));
}

/** Returns the same object when nothing changes, so callers can keep identity checks. */
export function syncCourseXTitles<T extends TitleHolder>(holder: T): T {
  const instructor = hasBothCourseXTitles(holder.instructorForms);
  const instructorForms = setCourseX(holder.instructorForms, instructor)!;
  const technicianForms = setCourseX(holder.technicianForms, hasBothCourseXTitles(holder.technicianForms));
  const eLearningInstructorForms = setCourseX(
    holder.eLearningInstructorForms,
    instructor && BOTH.some((formId) => holder.eLearningInstructorForms?.includes(formId)),
  );
  if (
    instructorForms === holder.instructorForms &&
    technicianForms === holder.technicianForms &&
    eLearningInstructorForms === holder.eLearningInstructorForms
  ) return holder;
  return { ...holder, instructorForms, technicianForms, eLearningInstructorForms };
}
