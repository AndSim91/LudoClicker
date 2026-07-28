import {
  getUpgradeCost,
  getUpgradeDefinition,
  hasCompletedUpgradePrerequisites,
} from "../content/upgrades";
import { getWritingPower } from "./formulas";
import type { GameState, SecretUpgradeId, UpgradeId } from "./types";

export function discoverSecretUpgrade(
  state: GameState,
  upgradeId: SecretUpgradeId,
): GameState {
  if (state.secretUpgradeDiscoveries.includes(upgradeId)) return state;
  return {
    ...state,
    secretUpgradeDiscoveries: [...state.secretUpgradeDiscoveries, upgradeId],
  };
}

export function buyUpgrade(state: GameState, upgradeId: UpgradeId): GameState {
  const definition = getUpgradeDefinition(upgradeId);
  if (!definition) return state;
  const currentLevel = state.upgrades[upgradeId];
  if (
    currentLevel >= definition.maxLevel ||
    definition.requiredUnlocks?.some((unlock) => !state.unlocks[unlock]) ||
    (definition.requiredNetworkSchools !== undefined &&
      state.network.schools.length < definition.requiredNetworkSchools) ||
    (definition.secretHint !== undefined &&
      !state.secretUpgradeDiscoveries.includes(upgradeId as SecretUpgradeId)) ||
    (definition.requiredGadgetProduct !== undefined &&
      !state.gadgets.products[definition.requiredGadgetProduct].unlocked) ||
    state.school.fame < definition.requiredFame ||
    !hasCompletedUpgradePrerequisites(state.upgrades, definition)
  ) {
    return state;
  }
  const cost = getUpgradeCost(definition, currentLevel, state.network.schools.length);
  if (state.school.euros < cost) return state;

  const upgrades = { ...state.upgrades, [upgradeId]: currentLevel + 1 };
  const nextState: GameState = {
    ...state,
    school: { ...state.school, euros: state.school.euros - cost },
    upgrades,
  };
  return {
    ...nextState,
    player: { ...nextState.player, writingPower: getWritingPower(nextState) },
  };
}
