import { describe, expect, it } from "vitest";
import { getAutomaticFormCandidates } from "./formProgression";
import type { FormId } from "./types";

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
