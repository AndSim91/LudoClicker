import { BRANCH_FORM_IDS, FORM_BRANCHES } from "../content/forms";
import type { FormBranch, FormId } from "./types";

export function getFormProgressionRank(formId: FormId): number {
  if (formId === "form-1") return 0;
  if (formId === "course-x") return 1;
  if (formId === "form-2") return 2;
  if (formId === "course-y") return 3;
  if (formId.startsWith("form-3-")) return 4;
  if (formId.startsWith("form-4-")) return 5;
  if (formId.startsWith("form-5-")) return 6;
  if (formId === "form-6") return 7;
  return 8;
}

// Forms and preferences arrays are shared by every copy of a person, so the
// answer is kept per forms array: the teaching passes ask it for thousands of
// members at every step. Callers only read the result.
const candidatesCache = new WeakMap<readonly FormId[], {
  preferences: readonly FormBranch[] | undefined;
  flags: number;
  candidates: FormId[];
}>();

export function getAutomaticFormCandidates(student: {
  forms: FormId[];
  formBranchPreferences?: FormBranch[];
}, courseXUnlocked = true, unrestrictedFormBranches = false): FormId[] {
  const flags = (courseXUnlocked ? 1 : 0) + (unrestrictedFormBranches ? 2 : 0);
  const cached = candidatesCache.get(student.forms);
  if (cached?.flags === flags && cached.preferences === student.formBranchPreferences) {
    return cached.candidates;
  }
  const candidates = computeAutomaticFormCandidates(student, courseXUnlocked, unrestrictedFormBranches);
  candidatesCache.set(student.forms, {
    preferences: student.formBranchPreferences,
    flags,
    candidates,
  });
  return candidates;
}

function computeAutomaticFormCandidates(student: {
  forms: FormId[];
  formBranchPreferences?: FormBranch[];
}, courseXUnlocked: boolean, unrestrictedFormBranches: boolean): FormId[] {
  const core: FormId[] = courseXUnlocked
    ? ["form-1", "course-x", "form-2", "course-y"]
    : ["form-1", "form-2", "course-y"];
  const nextCore = core.find((formId) => !student.forms.includes(formId));
  if (nextCore) return [nextCore];

  // 13/10/2026: Forma 3 in every available branch, then Forma 4, then Forma 5;
  // Forma 6 and 7 only after the branches (first in the list = tried first).
  const eligibleBranches = unrestrictedFormBranches
    ? FORM_BRANCHES
    : student.formBranchPreferences ?? [];
  const branchForms = eligibleBranches
    .flatMap((branch) => {
      const nextForm = BRANCH_FORM_IDS[branch].find((formId) => !student.forms.includes(formId));
      return nextForm ? [nextForm] : [];
    })
    .sort((left, right) => getFormProgressionRank(left) - getFormProgressionRank(right));
  const completedFormFive = ([
    "form-5-long",
    "form-5-staff",
    "form-5-double",
  ] as FormId[]).some((formId) => student.forms.includes(formId));
  const lateForm = completedFormFive
    ? (["form-6", "form-7"] as FormId[]).find((formId) => !student.forms.includes(formId))
    : undefined;
  return lateForm ? [...branchForms, lateForm] : branchForms;
}
