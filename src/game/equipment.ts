import { COLLABORATOR_MASTERY_XP } from "../content/mastery";
import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import { addCollaboratorMasteryExperience } from "./stateUpdates";
import type { GameState } from "./types";

type EquipmentState = GameState["equipment"];
export type EquipmentAutomaticRepairTarget = "wear" | "sword";
const WORK_EPSILON = 1e-9;

function clampCount(value: number, maximum: number) {
  return Math.min(maximum, Math.max(0, Math.floor(value)));
}

export function getEffectiveDamagedSwords(equipment: EquipmentState): number {
  return clampCount(equipment.damagedSwords ?? 0, equipment.totalSwords);
}

export function getReservedSwords(equipment: EquipmentState): number {
  return Math.max(
    0,
    equipment.totalSwords - getEffectiveDamagedSwords(equipment) - equipment.availableSwords,
  );
}

export function getAvailableSwords(equipment: EquipmentState): number {
  return Math.max(
    0,
    Math.min(
      equipment.availableSwords,
      equipment.totalSwords - getEffectiveDamagedSwords(equipment),
    ),
  );
}

export function getEquipmentMaintenanceCost(equipment: EquipmentState): number {
  return getEffectiveDamagedSwords(equipment) * GAME_CONFIG.equipmentDamagedSwordRepairCost +
    Math.ceil(Math.max(0, equipment.wear)) * GAME_CONFIG.equipmentMaintenanceCostPerLoad;
}

export function getEquipmentMinimumMaintenanceCost(equipment: EquipmentState): number {
  if (getEffectiveDamagedSwords(equipment) > 0) {
    return GAME_CONFIG.equipmentDamagedSwordRepairCost;
  }
  return equipment.wear > 0 && getAvailableSwords(equipment) > 0
    ? GAME_CONFIG.equipmentMaintenanceCostPerLoad
    : 0;
}

export function synchronizeEquipmentAvailability(equipment: EquipmentState): EquipmentState {
  const totalSwords = Math.max(0, Math.floor(equipment.totalSwords));
  const damagedSwords = clampCount(equipment.damagedSwords ?? 0, totalSwords);
  return {
    ...equipment,
    totalSwords,
    damagedSwords,
    wear: Math.max(0, Number.isFinite(equipment.wear) ? equipment.wear : 0),
    availableSwords: clampCount(
      equipment.availableSwords,
      totalSwords - damagedSwords,
    ),
  };
}

export function reserveSwords(
  equipment: EquipmentState,
  requiredSwords: number,
): EquipmentState | undefined {
  const required = Math.max(0, Math.floor(requiredSwords));
  const available = getAvailableSwords(equipment);
  if (available < required) return undefined;
  return synchronizeEquipmentAvailability({
    ...equipment,
    availableSwords: available - required,
  });
}

export function releaseSwords(
  equipment: EquipmentState,
  releasedSwords: number,
): EquipmentState {
  return synchronizeEquipmentAvailability({
    ...equipment,
    availableSwords: equipment.availableSwords + Math.max(0, Math.floor(releasedSwords)),
  });
}

export function applyEquipmentWear(
  equipment: EquipmentState,
  wearDelta: number,
  maximumNewlyDamagedSwords = Number.POSITIVE_INFINITY,
): EquipmentState {
  const synchronized = synchronizeEquipmentAvailability(equipment);
  const totalLoad = Math.max(0, synchronized.wear + wearDelta);
  if (wearDelta <= 0) return { ...synchronized, wear: totalLoad };

  const healthySwords = synchronized.totalSwords - synchronized.damagedSwords;
  const newlyDamagedSwords = Math.min(
    healthySwords,
    Math.max(0, Math.floor(maximumNewlyDamagedSwords)),
    Math.floor(totalLoad / GAME_CONFIG.equipmentBreakLoad),
  );
  return synchronizeEquipmentAvailability({
    ...synchronized,
    wear: totalLoad - newlyDamagedSwords * GAME_CONFIG.equipmentBreakLoad,
    damagedSwords: synchronized.damagedSwords + newlyDamagedSwords,
    availableSwords: synchronized.availableSwords - newlyDamagedSwords,
  });
}

export function completeEquipmentUse(
  equipment: EquipmentState,
  usedSwords: number,
  addedLoad: number,
): EquipmentState {
  const released = releaseSwords(equipment, usedSwords);
  return applyEquipmentWear(released, addedLoad, usedSwords);
}

export function applySwordDamage(
  equipment: EquipmentState,
  damagedSwordsDelta: number,
): EquipmentState {
  const synchronized = synchronizeEquipmentAvailability(equipment);
  const newlyDamagedSwords = Math.min(
    synchronized.totalSwords - synchronized.damagedSwords,
    Math.max(0, Math.floor(damagedSwordsDelta)),
  );
  return synchronizeEquipmentAvailability({
    ...synchronized,
    damagedSwords: synchronized.damagedSwords + newlyDamagedSwords,
    availableSwords: synchronized.availableSwords - newlyDamagedSwords,
  });
}

export function repairDamagedSwords(
  equipment: EquipmentState,
  repairedSwords: number,
): EquipmentState {
  const synchronized = synchronizeEquipmentAvailability(equipment);
  const repaired = Math.min(
    synchronized.damagedSwords,
    Math.max(0, Math.floor(repairedSwords)),
  );
  return synchronizeEquipmentAvailability({
    ...synchronized,
    damagedSwords: synchronized.damagedSwords - repaired,
    availableSwords: synchronized.availableSwords + repaired,
  });
}

export function getEquipmentAutomaticRepairTarget(
  equipment: EquipmentState,
): EquipmentAutomaticRepairTarget | undefined {
  if (equipment.wear > 0 && getAvailableSwords(equipment) > 0) return "wear";
  if (getEffectiveDamagedSwords(equipment) > 0) return "sword";
  return undefined;
}

export function getEquipmentAutomaticRepairUnitCost(
  target: EquipmentAutomaticRepairTarget,
): number {
  const manualCost = target === "wear"
    ? GAME_CONFIG.equipmentMaintenanceCostPerLoad
    : GAME_CONFIG.equipmentDamagedSwordRepairCost;
  return roundCurrency(manualCost * GAME_CONFIG.equipmentAutomaticCostFactor);
}

export function repairEquipment(
  equipment: EquipmentState,
  repairWork: number,
  availableEuros = Number.POSITIVE_INFINITY,
): {
  equipment: EquipmentState;
  repairedWear: number;
  repairedSwords: number;
  restoredCondition: number;
  eurosSpent: number;
  remainingWork: number;
} {
  let nextEquipment = synchronizeEquipmentAvailability(equipment);
  let remainingWork = Math.max(0, repairWork);
  let remainingEuros = Math.max(0, availableEuros);
  let eurosSpent = 0;
  let repairedSwords = 0;
  let repairedWear = 0;
  const swordCost = getEquipmentAutomaticRepairUnitCost("sword");
  const wearCost = getEquipmentAutomaticRepairUnitCost("wear");

  while (true) {
    const target = getEquipmentAutomaticRepairTarget(nextEquipment);
    if (!target) break;

    const workPerRepair = target === "wear"
      ? 1
      : GAME_CONFIG.equipmentSwordRepairWork;
    const unitCost = target === "wear" ? wearCost : swordCost;
    const maximumRepairs = target === "wear"
      ? Math.ceil(nextEquipment.wear)
      : nextEquipment.wear > 0
        ? 1
        : nextEquipment.damagedSwords;
    const repairCount = Math.min(
      maximumRepairs,
      Math.floor((remainingWork + WORK_EPSILON) / workPerRepair),
      Math.floor((remainingEuros + WORK_EPSILON) / unitCost),
    );
    if (repairCount <= 0) break;

    remainingWork = Math.max(0, remainingWork - repairCount * workPerRepair);
    const spent = roundCurrency(repairCount * unitCost);
    remainingEuros = roundCurrency(remainingEuros - spent);
    eurosSpent = roundCurrency(eurosSpent + spent);

    if (target === "wear") {
      repairedWear += repairCount;
      nextEquipment = applyEquipmentWear(nextEquipment, -repairCount);
    } else {
      repairedSwords += repairCount;
      nextEquipment = repairDamagedSwords(nextEquipment, repairCount);
    }
  }

  const remainingTarget = getEquipmentAutomaticRepairTarget(nextEquipment);
  const hasRemainingRepairs = nextEquipment.wear > 0 || nextEquipment.damagedSwords > 0;
  if (!hasRemainingRepairs || (
    remainingTarget !== undefined &&
    remainingEuros + WORK_EPSILON < getEquipmentAutomaticRepairUnitCost(remainingTarget)
  )) {
    remainingWork = 0;
  }
  return {
    equipment: nextEquipment,
    repairedWear,
    repairedSwords,
    restoredCondition:
      repairedWear + repairedSwords * GAME_CONFIG.equipmentBreakLoad,
    eurosSpent,
    remainingWork,
  };
}

export function maintainEquipment(state: GameState, now: number): GameState {
  if (state.equipment.wear <= 0 && state.equipment.damagedSwords <= 0) return state;

  let remainingEuros = Math.max(0, state.school.euros);
  const repairedSwords = Math.min(
    state.equipment.damagedSwords,
    Math.floor(remainingEuros / GAME_CONFIG.equipmentDamagedSwordRepairCost),
  );
  remainingEuros -= repairedSwords * GAME_CONFIG.equipmentDamagedSwordRepairCost;
  let equipment = repairDamagedSwords(state.equipment, repairedSwords);
  const repairedWear = equipment.damagedSwords > 0 || getAvailableSwords(equipment) <= 0
    ? 0
    : Math.min(
        Math.ceil(equipment.wear),
        Math.floor(remainingEuros / GAME_CONFIG.equipmentMaintenanceCostPerLoad),
      );
  remainingEuros -= repairedWear * GAME_CONFIG.equipmentMaintenanceCostPerLoad;
  equipment = applyEquipmentWear(equipment, -repairedWear);
  const restoredCondition =
    repairedWear + repairedSwords * GAME_CONFIG.equipmentBreakLoad;
  if (restoredCondition <= 0) return state;

  const maintained: GameState = {
    ...state,
    school: { ...state.school, euros: roundCurrency(remainingEuros) },
    equipment,
    statistics: {
      ...state.statistics,
      maintenanceCompleted: state.statistics.maintenanceCompleted + 1,
    },
  };
  return addCollaboratorMasteryExperience(
    maintained,
    "equipment",
    restoredCondition * COLLABORATOR_MASTERY_XP.equipmentRepairPoint,
    now,
  );
}

export function buyOfficialSword(state: GameState): GameState {
  if (state.school.euros < GAME_CONFIG.officialSwordCost) return state;
  return {
    ...state,
    school: {
      ...state.school,
      euros: state.school.euros - GAME_CONFIG.officialSwordCost,
    },
    equipment: synchronizeEquipmentAvailability({
      ...state.equipment,
      totalSwords: state.equipment.totalSwords + 1,
      availableSwords: state.equipment.availableSwords + 1,
    }),
  };
}
