import type { FormTraining, GameState } from "../types";
import type { MigratableState } from "./types";

function migrateRunningTraining(training: FormTraining | undefined): FormTraining | undefined {
  if (!training) return undefined;
  return {
    ...training,
    status: "running",
    // I corsi già avviati non avevano prenotato spade nel vecchio modello.
    equipmentUsed: 0,
    wearPerSword: 0,
  };
}

export function migrateEquipmentLoadState(state: MigratableState): MigratableState {
  if (state.version !== 49) return state;

  const previous = state.equipment;
  const totalSwords = Math.max(0, Math.floor(previous?.totalSwords ?? 0));
  const previousWear = Math.max(0, previous?.wear ?? 0);
  const impliedDamagedSwords = Math.min(
    totalSwords,
    Math.max(
      Math.floor(previous?.damagedSwords ?? 0),
      Math.floor(totalSwords * Math.min(100, previousWear) / 100),
    ),
  );
  const availableSwords = Math.max(
    0,
    Math.min(
      Math.floor(previous?.availableSwords ?? 0),
      totalSwords - impliedDamagedSwords,
    ),
  );

  return {
    ...state,
    version: 50,
    equipment: {
      totalSwords,
      availableSwords,
      damagedSwords: impliedDamagedSwords,
      wear: previousWear >= 100 ? previousWear % 100 : previousWear,
    },
    contacts: (state.contacts ?? []).map((contact) => ({
      ...contact,
      training: migrateRunningTraining(contact.training),
    })),
    collaborators: (state.collaborators ?? []).map((collaborator) => ({
      ...collaborator,
      training: migrateRunningTraining(collaborator.training),
    })),
    scheduledTrials: (state.scheduledTrials ?? []).map((trial) => ({
      ...trial,
      equipmentUsed: undefined,
      cancellationReason: undefined,
    })) as GameState["scheduledTrials"],
  };
}
