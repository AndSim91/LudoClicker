import { describe, expect, it } from "vitest";
import { getAutomaticFormCandidates } from "./formProgression";
import type { FormBranch, FormId } from "./types";

const CORE: FormId[] = ["form-1", "course-x", "form-2", "course-y"];

describe("automatic Form order", () => {
  it("does Forma 3 in every branch before Forma 4, and Forma 6 after the branches", () => {
    expect(getAutomaticFormCandidates({ forms: [...CORE, "form-3-long"] }, true, true))
      .toEqual(["form-3-staff", "form-3-double", "form-4-long"]);
    expect(getAutomaticFormCandidates({
      forms: [...CORE, "form-3-long", "form-4-long", "form-5-long", "form-3-staff"],
    }, true, true)).toEqual(["form-3-double", "form-4-staff", "form-6"]);
  });
});

describe("Master of none: rami voluti da un Istruttore", () => {
  const forms = [
    "form-1", "form-2", "course-y",
    "form-3-long", "form-4-long", "form-5-long",
    "form-3-staff", "form-4-staff", "form-5-staff",
    "form-6", "form-7",
  ] as FormId[];
  const preferences = ["Spada Lunga", "Staffa"] as FormBranch[];

  it("un Istruttore con rami liberi vuole anche il ramo non preferito", () => {
    expect(getAutomaticFormCandidates({ forms: [...forms], formBranchPreferences: preferences, assignment: "instructor" }, false, false, 3))
      .toEqual(["form-3-double"]);
  });

  it("senza posto per un nuovo ramo, o se non è Istruttore, restano le preferenze", () => {
    expect(getAutomaticFormCandidates({ forms: [...forms], formBranchPreferences: preferences, assignment: "instructor" }, false, false, 2))
      .toEqual([]);
    expect(getAutomaticFormCandidates({ forms: [...forms], formBranchPreferences: preferences, assignment: "writing" }, false, false, 3))
      .toEqual([]);
  });
});
