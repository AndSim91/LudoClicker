import { describe, expect, it } from "vitest";
import { UPGRADE_DEFINITIONS } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import {
  applyEquipmentWear,
  completeEquipmentUse,
  repairEquipment,
} from "./equipment";
import { createInitialState, gameReducer } from "./engine";
import { getEnrollmentChance } from "./formulas";
import type { GameState, ScheduledTrial } from "./types";

function enrolledState(now = 1_000): GameState {
  const initial = createInitialState(now);
  return {
    ...initial,
    school: {
      ...initial.school,
      activeMembers: 1,
      peakActiveMembers: 1,
      historicMembers: 1,
      euros: 1_000,
    },
    unlocks: { ...initial.unlocks, forms: true },
    contacts: initial.contacts.map((contact, index) =>
      index === 0 ? { ...contact, status: "enrolled" as const } : contact
    ),
  };
}

describe("carico aggregato delle spade", () => {
  it("rompe una spada ogni 100 punti e conserva tutto il carico eccedente", () => {
    const equipment = {
      totalSwords: 6,
      availableSwords: 6,
      damagedSwords: 0,
      wear: 94,
    };

    const result = applyEquipmentWear(equipment, 216);

    expect(result).toEqual({
      totalSwords: 6,
      availableSwords: 3,
      damagedSwords: 3,
      wear: 10,
    });
  });

  it("limita le rotture alle spade impiegate nell'attività", () => {
    const reserved = {
      totalSwords: 6,
      availableSwords: 4,
      damagedSwords: 0,
      wear: 90,
    };

    const result = completeEquipmentUse(reserved, 2, 250);

    expect(result.damagedSwords).toBe(2);
    expect(result.wear).toBe(140);
    expect(result.availableSwords).toBe(4);
  });

  it("richiede 150 punti-lavoro e il 75% del costo manuale per una spada", () => {
    const broken = {
      totalSwords: 6,
      availableSwords: 5,
      damagedSwords: 1,
      wear: 0,
    };

    expect(repairEquipment(broken, 149, 1_000).repairedSwords).toBe(0);
    const repaired = repairEquipment(broken, 150, 1_000);

    expect(GAME_CONFIG.equipmentRepairIntervalMs).toBe(1_500);
    expect(repaired.repairedSwords).toBe(1);
    expect(repaired.restoredCondition).toBe(100);
    expect(repaired.eurosSpent).toBe(187.5);
    expect(repaired.equipment.availableSwords).toBe(6);
  });

  it("ripara l'usura delle spade sane prima di iniziare una spada rotta", () => {
    const mixedCondition = {
      totalSwords: 6,
      availableSwords: 5,
      damagedSwords: 1,
      wear: 1,
    };

    const prioritized = repairEquipment(mixedCondition, 150, 1_000);

    expect(prioritized).toMatchObject({
      repairedWear: 1,
      repairedSwords: 0,
      eurosSpent: 1.5,
      remainingWork: 149,
      equipment: { wear: 0, damagedSwords: 1, availableSwords: 5 },
    });

    const completed = repairEquipment(mixedCondition, 151, 1_000);
    expect(completed).toMatchObject({
      repairedWear: 1,
      repairedSwords: 1,
      eurosSpent: 189,
      remainingWork: 0,
      equipment: { wear: 0, damagedSwords: 0, availableSwords: 6 },
    });
  });

  it("sblocca una spada se tutte le sane sono in uso, poi torna all'usura", () => {
    const blockedWear = {
      totalSwords: 6,
      availableSwords: 0,
      damagedSwords: 1,
      wear: 1,
    };

    const repaired = repairEquipment(blockedWear, 151, 1_000);

    expect(repaired).toMatchObject({
      repairedWear: 1,
      repairedSwords: 1,
      eurosSpent: 189,
      remainingWork: 0,
      equipment: { wear: 0, damagedSwords: 0, availableSwords: 1 },
    });
  });

  it("ripara il carico sulle spade libere senza restituire quelle riservate", () => {
    const initial = createInitialState(1_000);
    const partiallyBusy = {
      ...initial,
      school: { ...initial.school, euros: 20 },
      equipment: {
        ...initial.equipment,
        availableSwords: 5,
        wear: 10,
      },
    };

    const maintained = gameReducer(partiallyBusy, {
      type: "MAINTAIN_EQUIPMENT",
      now: 2_000,
    });

    expect(maintained.equipment).toMatchObject({
      availableSwords: 5,
      damagedSwords: 0,
      wear: 0,
    });
    expect(maintained.school.euros).toBe(5);
  });

  it("conserva il lavoro automatico se tutte le spade sane sono in uso", () => {
    const allReserved = {
      totalSwords: 6,
      availableSwords: 0,
      damagedSwords: 0,
      wear: 10,
    };

    const blocked = repairEquipment(allReserved, 1, 1);

    expect(blocked.repairedWear).toBe(0);
    expect(blocked.remainingWork).toBe(1);
    expect(blocked.equipment.wear).toBe(10);
  });
});

describe("prenotazione delle spade", () => {
  it("mantiene un corso in attesa senza addebiti e lo avvia appena torna una spada", () => {
    const ready = enrolledState();
    const studentId = ready.contacts[0].id;
    const unavailable = {
      ...ready,
      equipment: { ...ready.equipment, availableSwords: 0, damagedSwords: 6 },
    };

    const waiting = gameReducer(unavailable, {
      type: "START_FORM_TRAINING",
      personId: studentId,
      formId: "form-1",
      now: 2_000,
    });

    expect(waiting.contacts[0].training?.status).toBe("waitingForEquipment");
    expect(waiting.school.euros).toBe(1_000);

    const swordReturned = {
      ...waiting,
      equipment: { ...waiting.equipment, availableSwords: 1, damagedSwords: 5 },
    };
    const started = gameReducer(swordReturned, { type: "TICK", now: 3_000 });

    expect(started.contacts[0].training?.status).toBe("running");
    expect(started.school.euros).toBe(950);
    expect(started.equipment.availableSwords).toBe(0);

    const completed = gameReducer(started, {
      type: "TICK",
      now: started.contacts[0].training!.completesAt,
    });
    expect(completed.contacts[0].training).toBeUndefined();
    expect(completed.equipment.availableSwords).toBe(1);
    expect(completed.equipment.wear).toBe(10);
  });

  it("annulla una prova senza spada al termine dell'attesa", () => {
    const initial = createInitialState(1_000);
    const trial: ScheduledTrial = {
      id: "trial-no-sword",
      contactId: initial.contacts[0].id,
      startsAt: 2_000,
      resolvesAt: 17_000,
      resultSeed: 1,
      status: "scheduled",
    };
    const scheduled = {
      ...initial,
      school: {
        ...initial.school,
        activeMembers: 1,
        peakActiveMembers: 1,
        historicMembers: 1,
      },
      contacts: initial.contacts.map((contact, index) =>
        index === 0 ? { ...contact, status: "trialScheduled" as const } : contact
      ),
      scheduledTrials: [trial],
      equipment: { ...initial.equipment, availableSwords: 0, damagedSwords: 6 },
    };

    const cancelled = gameReducer(scheduled, { type: "TICK", now: 2_000 });

    expect(cancelled.scheduledTrials[0]).toMatchObject({
      status: "cancelled",
      cancellationReason: "equipment",
    });
    expect(cancelled.contacts[0].status).toBe("lost");
    expect(cancelled.legendaryPity).toBe(1);
  });

  it("svolge senza spada una prova con iscrizione effettiva al 100%", () => {
    const initial = createInitialState(1_000, "", false);
    const contact = initial.contacts[0];
    const trial: ScheduledTrial = {
      id: "trial-guaranteed-no-sword",
      contactId: contact.id,
      startsAt: 2_000,
      resolvesAt: 17_000,
      resultSeed: 1,
      status: "scheduled",
    };
    const guaranteed: GameState = {
      ...initial,
      school: {
        ...initial.school,
        activeMembers: 1,
        peakActiveMembers: 1,
        historicMembers: 1,
      },
      upgrades: Object.fromEntries(UPGRADE_DEFINITIONS.map((definition) => [
        definition.id,
        definition.maxLevel,
      ])) as GameState["upgrades"],
      contacts: initial.contacts.map((candidate) =>
        candidate.id === contact.id
          ? { ...candidate, status: "trialScheduled" as const }
          : candidate
      ),
      scheduledTrials: [trial],
      equipment: { ...initial.equipment, availableSwords: 0, damagedSwords: 6 },
    };

    expect(getEnrollmentChance(guaranteed, contact.rarity)).toBe(1);

    const started = gameReducer(guaranteed, { type: "TICK", now: trial.startsAt });

    expect(started.scheduledTrials[0]).toMatchObject({
      status: "scheduled",
      equipmentUsed: 0,
    });
    expect(started.contacts[0].status).toBe("trialScheduled");
    expect(started.equipment).toEqual(guaranteed.equipment);

    const completed = gameReducer(started, { type: "TICK", now: trial.resolvesAt });

    expect(completed.scheduledTrials[0].status).toBe("completed");
    expect(completed.contacts[0].status).toBe("enrolled");
    expect(completed.equipment).toEqual(guaranteed.equipment);
  });
});
