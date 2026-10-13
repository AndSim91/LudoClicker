import { describe, expect, it } from "vitest";
import { getTeachingPriorityDepartureChance } from "./formulas";
import type { FormId } from "./types";

describe("teaching priority departure chance", () => {
  it("counts rarity as Forms missing", () => {
    const formSix: FormId[] = ["form-1", "form-2", "course-y", "form-3-long", "form-4-long", "form-5-long", "form-6"];
    expect(getTeachingPriorityDepartureChance(formSix, 0)).toBe(0.1);
    expect(getTeachingPriorityDepartureChance(formSix, 1)).toBe(0.15);
    expect(getTeachingPriorityDepartureChance(formSix, 2)).toBe(0.25);
    expect(getTeachingPriorityDepartureChance(["form-1"], 3)).toBe(0.8);
  });
});
