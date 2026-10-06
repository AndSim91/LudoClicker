import { expect, it } from "vitest";
import {
  getComplexTechniqueForms,
  getStyleActionChance,
  getStyleJudgeCount,
  judgeStyle,
  rollDisarmedArmonica,
  rollStyleActions,
  scoreStyleSheet,
} from "./styleJudging";
import { nextRandom } from "./random";

it("scores a sheet with the Servizio formula", () => {
  expect(scoreStyleSheet([1, 1, 0, 0, 0, 1, 0, 0, 0])).toBe(6.1);
  expect(scoreStyleSheet([2, 1.5, 1.5, 1, 0, 2, 0, 1, 0])).toBe(7.2);
  expect(scoreStyleSheet([1.5, 1, 1, 0, 0, 1, 0, 0, 1])).toBe(5.9);
  expect(scoreStyleSheet([3, 3, 3, 3, 3, 3, 3, 3, 0])).toBe(10);
});

it("uses more judges only in the final phases", () => {
  expect(getStyleJudgeCount("national", "group")).toBe(1);
  expect(getStyleJudgeCount("school", "semifinal")).toBe(2);
  expect(getStyleJudgeCount("champions", "final")).toBe(4);
});

it("keeps every sheet on the Servizio grid and an average athlete near 6,6", () => {
  let seed = 42;
  const roll = () => {
    const [value, next] = nextRandom(seed);
    seed = next;
    return value;
  };
  let total = 0;
  for (let index = 0; index < 2_000; index += 1) {
    const judgement = judgeStyle({
      relativeStyle: 1,
      actions: { com: 0, sapd: 0 },
      experience: 5,
      condition: 1,
      assaultChance: 0.5,
      scored: 2,
      conceded: 1,
      judges: 2,
      roll,
    });
    for (const sheet of judgement.detail.sheets) {
      sheet.slice(0, 7).forEach((points) => {
        expect(points * 2).toBe(Math.round(points * 2));
        expect(points).toBeGreaterThanOrEqual(0);
        expect(points).toBeLessThanOrEqual(3);
      });
    }
    total += judgement.vote;
  }
  expect(total / 2_000).toBeGreaterThan(6.3);
  expect(total / 2_000).toBeLessThan(7);
});

it("gives COM and SAPD up to 15% from Stile, +20% from the advantage, 35% at most", () => {
  expect(getStyleActionChance(100, 150)).toBeCloseTo(0.03);
  expect(getStyleActionChance(150, 100)).toBeCloseTo(0.245);
  expect(getStyleActionChance(500, 325)).toBeCloseTo(0.35);
  expect(getStyleActionChance(2_000, 100)).toBeCloseTo(0.35);
});

it("uses only the COM of the weapon in hand; F1 and F2 belong to the Spada Lunga", () => {
  const forms = ["form-1", "form-2", "form-3-long", "form-3-staff", "form-4-staff"] as const;
  expect(getComplexTechniqueForms([...forms], "Staffa")).toEqual(["form-3-staff", "form-4-staff"]);
  expect(getComplexTechniqueForms([...forms], "Spada Lunga")).toEqual(["form-1", "form-2", "form-3-long"]);
});

it("counts Sync and Armoniche as COM and SAPD, and Disarmo as 1", () => {
  const always = () => 0;
  const base = { weapon: "Spada Lunga" as const, style: 500, opponentStyle: 100, assaultChance: 0.5, scored: 2 };
  const sync = rollStyleActions({ ...base, forms: ["form-3-long"], roll: always });
  // First COM of F3 Lunga is «Cruna dell'Ago»; first SAPD is «Disarmo».
  expect(sync).toMatchObject({ technique: "Cruna dell'Ago", highlight: "Disarmo", com: 1.5, sapd: 1 });

  const armonica = rollDisarmedArmonica({ com: 0, sapd: 0 }, { ...base, forms: ["form-1"], roll: always });
  expect(armonica).toEqual({ com: 1, sapd: 1, technique: "Prima Armonica", highlight: "Prima Armonica" });
  expect(rollDisarmedArmonica({ com: 0, sapd: 0 }, { ...base, forms: ["form-2"], roll: always }))
    .toEqual({ com: 0, sapd: 0 });
});
