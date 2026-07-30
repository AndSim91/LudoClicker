import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { isValidGameState } from "../saveValidation";
import type { GameState } from "../types";
import { migrateUpgradeRevampState } from "./upgradeRevamp";
import { migrateReptileState } from "./reptile";
import { migrateFirstCollaboratorTutorialState } from "./firstCollaboratorTutorial";
import { migrateAthleticPreparationMergeState } from "./athleticPreparationMerge";
import { migrateAgonistCourseProgressionState } from "./agonistCourseProgression";
import { migrateShortGoalAvailabilityState } from "./shortGoalAvailability";
import { migrateLegendaryEmailState } from "./legendaryEmails";
import type { MigratableState } from "./types";

describe("upgrade revamp save migration", () => {
  it("moves legacy Social and Teaching investments without revealing unowned secrets", () => {
    const initial = createInitialState(1_000, "", false);
    const legacy = {
      ...initial,
      version: 70,
      secretUpgradeDiscoveries: undefined,
      upgrades: {
        ...initial.upgrades,
        "comfortable-keyboard": 2,
        "winning-advertising": 1,
        "social-editorial-plan": 3,
        "marketing-course": 2,
        "social-sponsorships": 4,
        "promiscuous-instructor": 1,
        "tiamat-instructor": 4,
        "extra-form": 1,
        "project-x": 1,
        "divine-touch": 0,
      },
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        operationalPriorities: ["events", "instructor"] as GameState["collaboratorManagement"]["operationalPriorities"],
        fallbackAssignments: undefined,
      },
      automation: {
        ...initial.automation,
        equipmentPreparedWork: undefined,
      },
    } as unknown as MigratableState;

    const migrated = migrateLegendaryEmailState(
      migrateShortGoalAvailabilityState(
        migrateAgonistCourseProgressionState(
          migrateAthleticPreparationMergeState(
            migrateFirstCollaboratorTutorialState(
              migrateReptileState(migrateUpgradeRevampState(legacy)),
            ),
          ),
        ),
      ),
    ) as GameState;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.upgrades).toMatchObject({
      "social-editorial-plan": 0,
      "winning-advertising": 3,
      "social-sponsorships": 0,
      "marketing-course": 4,
      "promiscuous-instructor": 6,
      "tiamat-instructor": 0,
      "extra-form": 0,
    });
    expect(migrated.secretUpgradeDiscoveries).toEqual(["project-x"]);
    expect(migrated.collaboratorManagement.operationalPriorities).toEqual([
      "events",
      "instructor",
      "writing",
      "equipment",
      "gadget",
    ]);
    expect(migrated.collaboratorManagement.fallbackAssignments).toEqual({});
    expect(migrated.automation.equipmentPreparedWork).toBe(0);
    expect(migrated.player.writingPower).toBeCloseTo(1.4);
    expect(isValidGameState(migrated)).toBe(true);
  });

  it("is idempotent once the save has reached version 71", () => {
    const current = createInitialState(1_000, "", false);
    expect(migrateUpgradeRevampState(current)).toBe(current);
  });
});
