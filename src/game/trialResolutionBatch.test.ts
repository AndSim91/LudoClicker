import { describe, expect, it } from "vitest";

import { createInitialState } from "./engine";
import { getEnrollmentChance } from "./formulas";
import { nextRandom } from "./random";
import { resolveTrial, resolveTrialBatch } from "./trialFlow";
import type { Contact, GameState, ScheduledTrial } from "./types";

const NOW = 200_000;

function findSeed(predicate: (roll: number) => boolean): number {
  for (let seed = 0; seed < 100_000; seed += 1) {
    if (predicate(nextRandom(seed)[0])) return seed;
  }
  throw new Error("No deterministic seed found");
}

function createTrialResolutionState(trialCount: number): GameState {
  const initial = createInitialState(NOW, "Test", false);
  const contacts: Contact[] = Array.from({ length: trialCount }, (_, index) => ({
    ...initial.contacts[0],
    id: `trial-resolution-contact-${index}`,
    firstName: "Atleta",
    lastName: String(index + 1),
    email: `trial-resolution-${index}@example.invalid`,
    status: "trialScheduled",
  }));
  const scheduledTrials: ScheduledTrial[] = contacts.map((contact, index) => ({
    id: `trial-resolution-${index}`,
    contactId: contact.id,
    startsAt: NOW - 20_000 - index,
    resolvesAt: NOW - trialCount + index,
    resultSeed: index + 1,
    status: "scheduled",
    equipmentUsed: 1,
  }));

  return {
    ...initial,
    school: {
      ...initial.school,
      activeMembers: 1,
      peakActiveMembers: 1,
      historicMembers: 1,
    },
    contacts,
    scheduledTrials,
    equipment: {
      totalSwords: trialCount,
      availableSwords: 0,
      damagedSwords: 0,
      wear: 0,
    },
  };
}

function resolveSequentially(state: GameState): GameState {
  let nextState = state;
  for (const trial of state.scheduledTrials) {
    nextState = resolveTrial(nextState, trial, NOW, 1);
  }
  return nextState;
}

function resolveInBatch(state: GameState): GameState {
  return resolveTrialBatch(state, state.scheduledTrials, NOW, 1);
}

describe("trial resolution batching", () => {
  it("uses four consecutive losses to guarantee the next enrollment", () => {
    const state = createTrialResolutionState(5);
    const failureSeed = findSeed(
      (roll) => roll >= getEnrollmentChance(state, "common"),
    );
    state.scheduledTrials = state.scheduledTrials.map((trial) => ({
      ...trial,
      resultSeed: failureSeed,
    }));

    const sequential = resolveSequentially(state);
    const resolved = resolveInBatch(state);

    expect(resolved).toEqual(sequential);
    expect(resolved.contacts.map((contact) => contact.status)).toEqual([
      "lost",
      "lost",
      "lost",
      "lost",
      "enrolled",
    ]);
    expect(resolved.legendaryPity).toBe(4);
  });

  it("applies a legendary Pity increase before resolving the next trial", () => {
    const state = createTrialResolutionState(2);
    const sharedSeed = findSeed((roll) => roll >= 0.15 && roll < 0.16);
    state.contacts = state.contacts.map((contact) => ({
      ...contact,
      rarity: "legendary",
      specialProfileId: "eva-parodi",
    }));
    state.scheduledTrials = state.scheduledTrials.map((trial) => ({
      ...trial,
      resultSeed: sharedSeed,
    }));

    const sequential = resolveSequentially(state);
    const resolved = resolveInBatch(state);

    expect(resolved).toEqual(sequential);
    expect(resolved.contacts[0].status).toBe("lost");
    expect(resolved.contacts[1].status).toBe("enrolled");
    expect(resolved.legendaryPity).toBe(0);
    expect(resolved.legendaryCollaborators.enrollmentAttempts["eva-parodi"]).toBe(2);
    expect(resolved.legendaryCollaborators.enrolledProfileIds).toContain("eva-parodi");
  });

  it("unlocks Social only once while resolving multiple guaranteed enrollments", () => {
    const state = createTrialResolutionState(2);
    state.school = {
      ...state.school,
      activeMembers: 34,
      peakActiveMembers: 34,
      historicMembers: 34,
    };
    state.scheduledTrials = state.scheduledTrials.map((trial) => ({
      ...trial,
      equipmentUsed: 0,
    }));
    state.equipment = {
      ...state.equipment,
      availableSwords: state.equipment.totalSwords,
    };

    const sequential = resolveSequentially(state);
    const resolved = resolveInBatch(state);

    expect(resolved).toEqual(sequential);
    expect(resolved.school).toMatchObject({
      activeMembers: 36,
      historicMembers: 36,
      followers: 35,
    });
    expect(resolved.unlocks.social).toBe(true);
    expect(
      resolved.messages.filter((message) =>
        message.subject === "La Redazione si è evoluta in Social"
      ),
    ).toHaveLength(1);
  });

  it.each([10, 100, 1_000, 2_000])(
    "resolves %i simultaneous trials without losing records",
    (trialCount) => {
      const state = createTrialResolutionState(trialCount);

      const resolved = resolveInBatch(state);
      const enrolledCount = resolved.contacts.filter(
        (contact) => contact.status === "enrolled",
      ).length;
      const lostCount = resolved.contacts.filter(
        (contact) => contact.status === "lost",
      ).length;

      expect(resolved.scheduledTrials).toHaveLength(trialCount);
      expect(resolved.contacts).toHaveLength(trialCount);
      expect(resolved.scheduledTrials.every((trial) => trial.status === "completed"))
        .toBe(true);
      expect(enrolledCount + lostCount).toBe(trialCount);
      expect(resolved.statistics.trialsCompleted)
        .toBe(state.statistics.trialsCompleted + trialCount);
      expect(resolved.statistics.membersEnrolled)
        .toBe(state.statistics.membersEnrolled + enrolledCount);
      expect(resolved.statistics.contactsLost)
        .toBe(state.statistics.contactsLost + lostCount);
      expect(resolved.school.activeMembers).toBe(state.school.activeMembers + enrolledCount);
      expect(resolved.equipment.availableSwords + resolved.equipment.damagedSwords)
        .toBe(resolved.equipment.totalSwords);
    },
  );

  it("keeps enrollment, pity and message order across cooperative slices", () => {
    const state = createTrialResolutionState(250);
    const allAtOnce = resolveInBatch(state);
    let sliced = state;

    for (let offset = 0; offset < state.scheduledTrials.length; offset += 100) {
      sliced = resolveTrialBatch(
        sliced,
        state.scheduledTrials.slice(offset, offset + 100),
        NOW,
        1,
      );
    }

    expect(sliced).toEqual(allAtOnce);
  });
});
