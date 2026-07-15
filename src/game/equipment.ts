import { GAME_CONFIG } from "./config";
import type { GameState } from "./types";

type EquipmentState = GameState["equipment"];

function clampWear(wear: number) {
  return Math.min(100, Math.max(0, wear));
}

export function getWearBrokenSwords(equipment: EquipmentState): number {
  return Math.min(
    equipment.totalSwords,
    Math.floor((equipment.totalSwords * clampWear(equipment.wear)) / 100),
  );
}

export function getEffectiveDamagedSwords(equipment: EquipmentState): number {
  return Math.min(
    equipment.totalSwords,
    Math.max(equipment.damagedSwords ?? 0, getWearBrokenSwords(equipment)),
  );
}

export function getAvailableSwords(equipment: EquipmentState): number {
  const damagedSwords = getEffectiveDamagedSwords(equipment);
  return Math.max(
    0,
    Math.min(equipment.availableSwords, equipment.totalSwords - damagedSwords),
  );
}

export function getEquipmentMaintenanceCost(equipment: EquipmentState): number {
  const damagedSwords = getEffectiveDamagedSwords(equipment);
  return damagedSwords > 0
    ? damagedSwords * GAME_CONFIG.equipmentMaintenanceCostPerSword
    : GAME_CONFIG.equipmentMaintenanceCost;
}

export function synchronizeEquipmentAvailability(equipment: EquipmentState): EquipmentState {
  const currentDamagedSwords = equipment.damagedSwords ?? 0;
  const damagedSwords = getEffectiveDamagedSwords(equipment);
  const newlyDamagedSwords = damagedSwords - currentDamagedSwords;
  return {
    ...equipment,
    damagedSwords,
    availableSwords: Math.max(
      0,
      Math.min(
        equipment.totalSwords - damagedSwords,
        equipment.availableSwords - newlyDamagedSwords,
      ),
    ),
  };
}

export function applyEquipmentWear(
  equipment: EquipmentState,
  wearDelta: number,
): EquipmentState {
  return synchronizeEquipmentAvailability({
    ...equipment,
    wear: clampWear(equipment.wear + wearDelta),
  });
}

export function applySwordDamage(
  equipment: EquipmentState,
  damagedSwordsDelta: number,
): EquipmentState {
  return synchronizeEquipmentAvailability({
    ...equipment,
    damagedSwords: Math.min(
      equipment.totalSwords,
      (equipment.damagedSwords ?? 0) + Math.max(0, Math.floor(damagedSwordsDelta)),
    ),
  });
}
