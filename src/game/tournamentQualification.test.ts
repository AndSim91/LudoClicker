import { describe, expect, it } from "vitest";
import { getQualificationSlotCount } from "./tournamentQualification";

describe("tournament qualification slots", () => {
  it.each([
    ["academy", 99, 6],
    ["academy", 100, 12],
    ["national", 299, 6],
    ["national", 300, 12],
    ["champions", 500, 6],
    ["champions", 501, 12],
  ] as const)("assigns slots to %s with %i active members", (level, members, slots) => {
    expect(getQualificationSlotCount(level, members)).toBe(slots);
  });
});
