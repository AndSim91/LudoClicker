import { describe, expect, it } from "vitest";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";
import type { GameState, ShortGoalProgress } from "../types";
import { migrateShortGoalAvailabilityState } from "./shortGoalAvailability";
import type { MigratableState } from "./types";

function version75Save(
  euros: number,
  emailsSent: number,
  baseline = 0,
): MigratableState {
  const current = createInitialState(1_000);
  const legacyShortGoal: Partial<ShortGoalProgress> = {
    ...current.shortGoal,
    baseline,
  };
  delete legacyShortGoal.isActive;
  delete legacyShortGoal.reactivationStartedAt;
  return {
    ...current,
    version: 75,
    school: { ...current.school, euros },
    statistics: { ...current.statistics, emailsSent },
    shortGoal: legacyShortGoal as ShortGoalProgress,
  };
}

describe("short-goal availability save migration", () => {
  it.each([
    [4_999, 0, true],
    [5_000, 0, false],
    [5_000, 1, true],
  ])(
    "migrates a balance of %i euros and %i progress points to active=%s",
    (euros, emailsSent, expectedActive) => {
      const migrated = migrate(version75Save(euros, emailsSent)) as GameState;

      expect(migrated.version).toBe(76);
      expect(migrated.shortGoal.isActive).toBe(expectedActive);
      expect(migrated.shortGoal.reactivationStartedAt).toBeUndefined();
      expect(isValidGameState(migrated)).toBe(true);
    },
  );

  it("is idempotent once the save has reached version 76", () => {
    const current = createInitialState(1_000);

    expect(migrateShortGoalAvailabilityState(current)).toBe(current);
  });
});
