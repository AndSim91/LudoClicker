import {
  getUpgradeCost,
  getUpgradeDefinition,
  getUpgradeEffectTotal,
  hasAutomaticInstructorCertificates,
  hasCompletedUpgradePrerequisites,
} from "../content/upgrades";
import { synchronizeEquipmentAvailability } from "./equipment";
import { getWritingPower } from "./formulas";
import type { GameState, UpgradeId } from "./types";

export function buyUpgrade(state: GameState, upgradeId: UpgradeId): GameState {
  const definition = getUpgradeDefinition(upgradeId);
  if (!definition) return state;
  const currentLevel = state.upgrades[upgradeId];
  if (
    currentLevel >= definition.maxLevel ||
    (definition.requiredUnlock !== undefined &&
      !state.unlocks[definition.requiredUnlock]) ||
    state.school.historicMembers < definition.requiredHistoricMembers ||
    !hasCompletedUpgradePrerequisites(state.upgrades, definition)
  ) {
    return state;
  }
  const cost = getUpgradeCost(definition, currentLevel, state.network.schools.length);
  if (state.school.euros < cost) return state;

  const upgrades = { ...state.upgrades, [upgradeId]: currentLevel + 1 };
  const previousUpgradeSwords = Math.floor(getUpgradeEffectTotal(
    state.upgrades,
    "totalSwords",
  ));
  const upgradedSwords = Math.floor(getUpgradeEffectTotal(upgrades, "totalSwords"));
  const addedSwords = Math.max(0, upgradedSwords - previousUpgradeSwords);
  const nextState: GameState = {
    ...state,
    school: { ...state.school, euros: state.school.euros - cost },
    upgrades,
    collaborators: hasAutomaticInstructorCertificates(upgrades)
      ? state.collaborators.map((collaborator) => ({
          ...collaborator,
          instructorForms: [...collaborator.forms],
        }))
      : state.collaborators,
    equipment: synchronizeEquipmentAvailability({
      ...state.equipment,
      totalSwords: state.equipment.totalSwords + addedSwords,
      availableSwords: state.equipment.availableSwords + addedSwords,
    }),
  };
  return {
    ...nextState,
    player: { ...nextState.player, writingPower: getWritingPower(nextState) },
  };
}
