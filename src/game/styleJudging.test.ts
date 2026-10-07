import { expect, it } from "vitest";
import {
  getComplexTechniqueForms,
  getExpressionSpace,
  getStyleJudgeCount,
  getStyleQuality,
  judgeStyle,
  MAX_STYLE_SANCTIONS,
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

function seededRoll(start: number) {
  let seed = start;
  return () => {
    const [value, next] = nextRandom(seed);
    seed = next;
    return value;
  };
}

function averageVote(style: number, roll: () => number, runs = 2_000) {
  let total = 0;
  let sanctions = 0;
  for (let index = 0; index < runs; index += 1) {
    const judgement = judgeStyle({
      style,
      opponentStyle: style,
      space: 1,
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
      expect(sheet[8]).toBe(judgement.penalties);
    }
    expect(Boolean(judgement.penalty)).toBe(judgement.penalties > 0);
    total += judgement.vote;
    sanctions += judgement.penalties;
  }
  return { vote: total / runs, sanctions: sanctions / runs };
}

it("judges the absolute Stile (model C): ~5,5 with little Stile, ~8 for the legends", () => {
  const roll = seededRoll(42);
  expect(getStyleQuality(0)).toBe(0);
  expect(getStyleQuality(250)).toBeCloseTo(1.5);
  const weak = averageVote(20, roll);
  const academy = averageVote(100, roll);
  const national = averageVote(200, roll);
  const legend = averageVote(1_000, roll);
  expect(weak.vote).toBeLessThan(5.6);
  expect(weak.sanctions).toBeGreaterThan(0.3);
  expect(academy.vote).toBeGreaterThan(5.8);
  expect(academy.vote).toBeLessThan(6.2);
  expect(national.vote).toBeGreaterThan(6.3);
  expect(national.vote).toBeLessThan(6.8);
  expect(national.sanctions).toBeLessThan(0.02);
  expect(legend.vote).toBeGreaterThan(7.6);
  expect(legend.sanctions).toBe(0);
});

it("writes every sanction on one card, 11 at most (vote 0)", () => {
  const judgement = judgeStyle({
    style: 0,
    opponentStyle: 1_000,
    space: 0,
    actions: { com: 0, sapd: 0 },
    experience: 0,
    condition: 0.7,
    assaultChance: 0.001,
    scored: 0,
    conceded: 5,
    judges: 1,
    roll: () => 0,
  });
  expect(judgement.penalties).toBe(MAX_STYLE_SANCTIONS);
  expect(judgement.penalty).toBe("declaration");
  expect(judgement.vote).toBe(0);
});

it("leaves room to express oneself only against a fair opponent", () => {
  expect(getExpressionSpace(100, 100, 3, 3)).toBe(1);
  expect(getExpressionSpace(100, 250, 3, 3)).toBeGreaterThan(0.3);
  expect(getExpressionSpace(100, 400, 1, 6)).toBeLessThan(0.05);
  expect(getExpressionSpace(1_000, 100, 7, 1)).toBeLessThan(0.1);
});

it("uses only the COM of the weapon in hand; F1 and F2 belong to the Spada Lunga", () => {
  const forms = ["form-1", "form-2", "form-3-long", "form-3-staff", "form-4-staff"] as const;
  expect(getComplexTechniqueForms([...forms], "Staffa")).toEqual(["form-3-staff", "form-4-staff"]);
  expect(getComplexTechniqueForms([...forms], "Spada Lunga")).toEqual(["form-1", "form-2", "form-3-long"]);
});

it("rolls COM and SAPD in each assault won, 3 points at most", () => {
  const always = () => 0;
  const base = { weapon: "Spada Lunga" as const, style: 500, opponentStyle: 100, space: 1, scored: 1 };
  const sync = rollStyleActions({ ...base, forms: ["form-3-long"], roll: always });
  // First COM of F3 Lunga is «Cruna dell'Ago»; first SAPD is «Disarmo».
  expect(sync).toMatchObject({ technique: "Cruna dell'Ago", highlight: "Disarmo", com: 1.5, sapd: 1 });
  expect(rollStyleActions({ ...base, scored: 3, forms: ["form-3-long"], roll: always }))
    .toMatchObject({ com: 3, sapd: 3 });
  expect(rollStyleActions({ ...base, scored: 0, forms: ["form-3-long"], roll: always }))
    .toEqual({ com: 0, sapd: 0 });

  const armonica = rollDisarmedArmonica({ com: 0, sapd: 0 }, { ...base, forms: ["form-1"], roll: always });
  expect(armonica).toEqual({ com: 1, sapd: 1, technique: "Prima Armonica", highlight: "Prima Armonica" });
  expect(rollDisarmedArmonica({ com: 0, sapd: 0 }, { ...base, forms: ["form-2"], roll: always }))
    .toEqual({ com: 0, sapd: 0 });
});
