import { expect, it } from "vitest";
import { getStyleJudgeCount, judgeStyle, scoreStyleSheet } from "./styleJudging";
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
      forms: ["form-1", "form-2"],
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
