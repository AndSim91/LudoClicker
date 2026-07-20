import { describe, expect, it } from "vitest";
import { getOfficialStatPresentation } from "./officialStatColor";

function expectStop(
  value: number,
  from: number,
  to: number,
  fromWeight: string,
  toWeight: string,
  outlined = false,
) {
  const presentation = getOfficialStatPresentation(value);
  expect(presentation).toEqual({
    style: {
      "--official-stat-from": `var(--official-stat-${from})`,
      "--official-stat-to": `var(--official-stat-${to})`,
      "--official-stat-from-weight": fromWeight,
      "--official-stat-to-weight": toWeight,
    },
    outlined,
  });
}

describe("getOfficialStatPresentation", () => {
  it("uses each centralized color stop across the Arena and Style scale", () => {
    expectStop(0, 0, 50, "100%", "0%");
    expectStop(25, 0, 50, "50%", "50%");
    expectStop(50, 50, 100, "100%", "0%");
    expectStop(75, 50, 100, "50%", "50%");
    expectStop(100, 100, 150, "100%", "0%");
    expectStop(125, 100, 150, "50%", "50%");
    expectStop(150, 150, 200, "100%", "0%");
    expectStop(175, 150, 200, "50%", "50%");
    expectStop(200, 200, 250, "100%", "0%");
    expectStop(249, 200, 250, "100%", "0%");
  });

  it("adds the outline while moving to cyan from 250 onward", () => {
    expectStop(250, 250, 300, "100%", "0%", true);
    expectStop(275, 250, 300, "50%", "50%", true);
    expectStop(300, 300, 300, "100%", "0%", true);
    expectStop(400, 300, 300, "100%", "0%", true);
  });

  it("clamps invalid and negative values to zero", () => {
    expect(getOfficialStatPresentation(-10)).toEqual(getOfficialStatPresentation(0));
    expect(getOfficialStatPresentation(Number.NaN)).toEqual(getOfficialStatPresentation(0));
  });
});
