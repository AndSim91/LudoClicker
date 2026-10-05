import {
  UPGRADE_DEFINITIONS,
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
    definition.hidden ||
    currentLevel >= definition.maxLevel ||
    definition.requiredUnlocks?.some((unlock) => !state.unlocks[unlock]) ||
    (definition.requiredNetworkSchools !== undefined &&
      state.network.schoolCount < definition.requiredNetworkSchools) ||
    (definition.secretHint !== undefined &&
      !state.secretUpgradeDiscoveries.includes(upgradeId as SecretUpgradeId)) ||
    (definition.requiredGadgetProduct !== undefined &&
      !state.gadgets.products[definition.requiredGadgetProduct].unlocked) ||
    state.school.fame < definition.requiredFame ||
    !hasCompletedUpgradePrerequisites(state.upgrades, definition)
  ) {
    return state;
  }
  const cost = getUpgradeCost(definition, currentLevel, state.upgrades);
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

/**
 * "Compra tutto": buys the cheapest purchasable upgrade again and again until the
 * funds run out, so the funds go to as many levels as possible. A bought level can
 * open the next node, which then joins the race. Secret paths stay a deliberate choice.
 */
export function buyAllAffordableUpgrades(state: GameState): GameState {
  let current = state;
  for (;;) {
    // ponytail: re-sorts ~60 nodes per purchase; fine at a few hundred levels.
    const next = UPGRADE_DEFINITIONS
      .filter((definition) => definition.category !== "secrets")
      .map((definition) => ({
        id: definition.id,
        cost: getUpgradeCost(definition, current.upgrades[definition.id], current.upgrades),
      }))
      .filter(({ cost }) => cost <= current.school.euros)
      .sort((a, b) => a.cost - b.cost)
      .map(({ id }) => buyUpgrade(current, id))
      .find((candidate) => candidate !== current);
    if (!next) return current;
    current = next;
  }
}
