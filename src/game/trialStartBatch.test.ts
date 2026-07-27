import { describe, expect, it } from "vitest";

import { createInitialState } from "./engine";
import { getLegendaryEnrollmentChance, processScheduledTrialStarts } from "./trialFlow";
import type { Contact, GameState, ScheduledTrial } from "./types";

const NOW = 100_000;

function createTrialStartState(trialCount: number, availableSwords: number): GameState {
  const initial = createInitialState(NOW, "Test", false);
  const contacts: Contact[] = Array.from({ length: trialCount }, (_, index) => ({
    ...initial.contacts[0],
    id: `trial-start-contact-${index}`,
    firstName: "Atleta",
    lastName: String(index + 1),
    email: `trial-start-${index}@example.invalid`,
    status: "trialScheduled",
  }));
  const scheduledTrials: ScheduledTrial[] = contacts.map((contact, index) => ({
    id: `trial-start-${index}`,
    contactId: contact.id,
    startsAt: NOW - trialCount + index,
    resolvesAt: NOW + 10_000 + index,
    resultSeed: index + 1,
    status: "scheduled",
  }));

  return {
    ...initial,
    school: {
      ...initial.school,
      activeMembers: 1,
      peakActiveMembers: 1,
      fame: 1,
    },
    contacts,
    scheduledTrials,
    equipment: {
      totalSwords: availableSwords,
      availableSwords,
      damagedSwords: 0,
      wear: 0,
    },
  };
}

describe("processScheduledTrialStarts", () => {
  it("reserves swords by start time and keeps source order for equal times", () => {
    const state = createTrialStartState(4, 2);
    state.scheduledTrials = [
      { ...state.scheduledTrials[0], startsAt: NOW - 10 },
      { ...state.scheduledTrials[1], startsAt: NOW - 20 },
      { ...state.scheduledTrials[2], startsAt: NOW - 20 },
      { ...state.scheduledTrials[3], startsAt: NOW - 30 },
    ];

    const started = processScheduledTrialStarts(state, NOW);
    const trialsById = new Map(started.scheduledTrials.map((trial) => [trial.id, trial]));

    expect(trialsById.get("trial-start-3")).toMatchObject({ equipmentUsed: 1 });
    expect(trialsById.get("trial-start-1")).toMatchObject({ equipmentUsed: 1 });
    expect(trialsById.get("trial-start-2")).toMatchObject({
      status: "cancelled",
      cancellationReason: "equipment",
    });
    expect(trialsById.get("trial-start-0")).toMatchObject({
      status: "cancelled",
      cancellationReason: "equipment",
    });
    expect(started.equipment.availableSwords).toBe(0);
    expect(started.statistics.contactsLost).toBe(state.statistics.contactsLost + 2);
    expect(started.legendaryPity).toBe(state.legendaryPity + 2);
  });

  it("applies cancellation pity before deciding the next legendary trial", () => {
    const state = createTrialStartState(2, 0);
    state.legendaryPity = 84;
    state.contacts = state.contacts.map((contact) => ({
      ...contact,
      rarity: "legendary",
      specialProfileId: "eva-parodi",
    }));

    expect(getLegendaryEnrollmentChance(state, "eva-parodi")).toBeCloseTo(0.99);

    const started = processScheduledTrialStarts(state, NOW);

    expect(started.scheduledTrials[0]).toMatchObject({
      status: "cancelled",
      cancellationReason: "equipment",
    });
    expect(started.scheduledTrials[1]).toMatchObject({
      status: "scheduled",
      equipmentUsed: 0,
    });
    expect(started.contacts[0].status).toBe("lost");
    expect(started.contacts[1].status).toBe("trialScheduled");
    expect(started.legendaryPity).toBe(85);
    expect(started.statistics.contactsLost).toBe(state.statistics.contactsLost + 1);
  });

  it("returns a cancelled secret legendary to the external roster", () => {
    const state = createTrialStartState(1, 0);
    state.scheduledTrials = [
      {
        ...state.scheduledTrials[0],
        secretLegendaryId: "lorenzo-todaro",
      },
    ];
    const progressBefore = state.network.secretLegendaries["lorenzo-todaro"];

    const started = processScheduledTrialStarts(state, NOW);

    expect(started.network.secretLegendaries["lorenzo-todaro"]).toEqual({
      ...progressBefore,
      status: "external",
    });
  });

  it.each([
    { trialCount: 10, availableSwords: 1 },
    { trialCount: 100, availableSwords: 10 },
    { trialCount: 1_000, availableSwords: 100 },
  ])(
    "processes $trialCount simultaneous starts without changing their cardinality",
    ({ trialCount, availableSwords }) => {
      const state = createTrialStartState(trialCount, availableSwords);

      const started = processScheduledTrialStarts(state, NOW);
      const cancelledCount = trialCount - availableSwords;

      expect(started.scheduledTrials).toHaveLength(trialCount);
      expect(started.contacts).toHaveLength(trialCount);
      expect(started.scheduledTrials.filter((trial) => trial.equipmentUsed === 1)).toHaveLength(
        availableSwords,
      );
      expect(started.scheduledTrials.filter((trial) => trial.status === "cancelled")).toHaveLength(
        cancelledCount,
      );
      expect(started.contacts.filter((contact) => contact.status === "lost")).toHaveLength(
        cancelledCount,
      );
      expect(started.statistics.contactsLost).toBe(state.statistics.contactsLost + cancelledCount);
      expect(started.legendaryPity).toBe(state.legendaryPity + cancelledCount);
      expect(started.equipment.availableSwords).toBe(0);
    },
  );

  it("keeps the same decisions when a large start queue is split into slices", () => {
    const state = createTrialStartState(250, 125);
    const allAtOnce = processScheduledTrialStarts(state, NOW);
    let sliced = state;

    for (let slice = 0; slice < 3; slice += 1) {
      sliced = processScheduledTrialStarts(sliced, NOW, 100);
    }

    expect(sliced).toEqual(allAtOnce);
  });
});
