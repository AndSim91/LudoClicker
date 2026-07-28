import { createInitialUpgradeLevels } from "../../content/upgrades";
import { getWritingPower } from "../formulas";
import type { CollaboratorMasteryRole, GameState, SecretUpgradeId } from "../types";
import type { MigratableState } from "./types";

const DEFAULT_PRIORITIES: CollaboratorMasteryRole[] = [
  "writing",
  "events",
  "equipment",
  "instructor",
  "gadget",
];

function clampLevel(value: number | undefined, maximum: number): number {
  return Math.min(maximum, Math.max(0, Math.floor(value ?? 0)));
}

function sanitizePriorities(
  priorities: readonly CollaboratorMasteryRole[] | undefined,
): CollaboratorMasteryRole[] {
  const available = new Set(DEFAULT_PRIORITIES);
  const result: CollaboratorMasteryRole[] = [];
  for (const role of priorities ?? []) {
    if (!available.delete(role)) continue;
    result.push(role);
  }
  return [...result, ...DEFAULT_PRIORITIES.filter((role) => available.has(role))];
}

export function migrateUpgradeRevampState(state: MigratableState): MigratableState {
  if (state.version !== 70) return state;

  const upgrades = {
    ...createInitialUpgradeLevels(),
    ...(state.upgrades ?? {}),
  };

  upgrades["winning-advertising"] = Math.max(
    clampLevel(upgrades["winning-advertising"], 5),
    clampLevel(upgrades["social-editorial-plan"], 5),
  );
  upgrades["marketing-course"] = Math.max(
    clampLevel(upgrades["marketing-course"], 5),
    clampLevel(upgrades["social-sponsorships"], 5),
  );
  upgrades["social-editorial-plan"] = 0;
  upgrades["social-sponsorships"] = 0;

  const oldTeachingCapacity = clampLevel(
    (upgrades["promiscuous-instructor"] ?? 0) +
      (upgrades["tiamat-instructor"] ?? 0),
    5,
  );
  upgrades["promiscuous-instructor"] = upgrades["extra-form"] > 0
    ? 6
    : oldTeachingCapacity;
  upgrades["extra-form"] = 0;
  upgrades["tiamat-instructor"] = 0;

  const discoveries = new Set<SecretUpgradeId>(state.secretUpgradeDiscoveries ?? []);
  if ((upgrades["project-x"] ?? 0) > 0) discoveries.add("project-x");
  if ((upgrades["divine-touch"] ?? 0) > 0) discoveries.add("divine-touch");

  const migrated: MigratableState = {
    ...state,
    version: 71,
    upgrades,
    secretUpgradeDiscoveries: [...discoveries],
    contacts: state.contacts?.map((contact) => ({ ...contact })),
    collaboratorManagement: state.collaboratorManagement
      ? {
          ...state.collaboratorManagement,
          operationalPriorities: sanitizePriorities(
            state.collaboratorManagement.operationalPriorities,
          ),
          fallbackAssignments: state.collaboratorManagement.fallbackAssignments ?? {},
        }
      : state.collaboratorManagement,
    automation: {
      ...state.automation,
      equipmentPreparedWork: Math.max(
        0,
        state.automation?.equipmentPreparedWork ?? 0,
      ),
    },
  };

  if (migrated.player && migrated.network && migrated.school) {
    migrated.player = {
      ...migrated.player,
      writingPower: getWritingPower(migrated as GameState),
    };
  }
  return migrated;
}
