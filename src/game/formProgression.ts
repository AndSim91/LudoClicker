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

  const completedFormFive = ([
    "form-5-long",
    "form-5-staff",
    "form-5-double",
  ] as FormId[]).some((formId) => student.forms.includes(formId));
  if (completedFormFive && !student.forms.includes("form-6")) return ["form-6"];
  if (completedFormFive && !student.forms.includes("form-7")) return ["form-7"];

  const eligibleBranches = unrestrictedFormBranches
    ? FORM_BRANCHES
    : student.formBranchPreferences ?? [];
  const orderedBranches = eligibleBranches.slice().sort((left, right) => {
    const startedLeft = BRANCH_FORM_IDS[left].some((formId) => student.forms.includes(formId));
    const startedRight = BRANCH_FORM_IDS[right].some((formId) => student.forms.includes(formId));
    return Number(startedRight) - Number(startedLeft);
  });
  return orderedBranches.flatMap((branch) => {
    const nextForm = BRANCH_FORM_IDS[branch].find((formId) => !student.forms.includes(formId));
    return nextForm ? [nextForm] : [];
  });
}
