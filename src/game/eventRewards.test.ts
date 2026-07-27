import { describe, expect, it } from "vitest";
import {
  ACQUISITION_EVENTS,
  getAcquisitionEventDefinition,
} from "../content/events";
import { UPGRADE_DEFINITIONS } from "../content/upgrades";
import { createInitialState } from "./engine";
import {
  EVENT_CONTACT_BASE_SCALE,
  getEventCollaboratorMultiplier,
  getEventMarketAvailability,
  getExpectedEventContacts,
  rollEventContactReward,
} from "./eventRewards";
import type { Collaborator, GameState } from "./types";

function eventCollaborator(index: number): Collaborator {
  return {
    id: `events-${index}`,
    contactId: `contact-${index}`,
    displayName: `Collaboratore ${index}`,
    joinedAt: 1_000 + index,
    forms: [],
    instructorForms: [],
    assignment: "events",
    rarity: "ultra-rare",
  };
}

function withEventCollaborators(state: GameState, count: number): GameState {
  return {
    ...state,
    collaborators: Array.from({ length: count }, (_, index) => eventCollaborator(index)),
  };
}

function maximizeEventUpgrades(state: GameState): GameState {
  return {
    ...state,
    upgrades: UPGRADE_DEFINITIONS.reduce(
      (levels, definition) =>
        definition.effect === "eventContactsMultiplier" ||
          definition.effect === "eventAttendanceMultiplier"
          ? { ...levels, [definition.id]: definition.maxLevel }
          : levels,
      state.upgrades,
    ),
  };
}

function getMasterEventContactsPerMinute(state: GameState): number {
  const masterDurationMs = 5_000;
  return ACQUISITION_EVENTS.reduce((total, definition) => {
    const completionsPerMinute = definition.cooldown.kind === "realtime"
      ? 60_000 / (masterDurationMs + definition.cooldown.durationMs)
      : 1 / definition.cooldown.months;
    return total + getExpectedEventContacts(state, definition) * completionsPerMinute;
  }, 0);
}

describe("event contact rewards", () => {
  const sparring = getAcquisitionEventDefinition("park-sparring")!;

  it("applies declared contact and attendance percentages once", () => {
    const initial = createInitialState(1_000);
    const contactsImproved = {
      ...initial,
      upgrades: { ...initial.upgrades, "prepared-presentation": 1 },
    };
    const attendanceImproved = {
      ...initial,
      upgrades: { ...initial.upgrades, "coordinated-demo": 1 },
    };

    expect(getExpectedEventContacts(initial, sparring)).toBeCloseTo(
      0.33 * EVENT_CONTACT_BASE_SCALE,
    );
    expect(getExpectedEventContacts(contactsImproved, sparring)).toBeCloseTo(
      0.33 * EVENT_CONTACT_BASE_SCALE * 1.03,
    );
    expect(getExpectedEventContacts(attendanceImproved, sparring)).toBeCloseTo(
      0.33 * EVENT_CONTACT_BASE_SCALE * 1.05,
    );
  });

  it("uses followers to promote Events without creating contacts directly", () => {
    const initial = createInitialState(1_000);
    const promoted = {
      ...initial,
      school: { ...initial.school, followers: 1_000 },
      unlocks: { ...initial.unlocks, social: true },
    };
    const expandedPromotion = {
      ...promoted,
      upgrades: { ...promoted.upgrades, "social-content-distribution": 5 },
    };
    const largeAudience = {
      ...promoted,
      school: { ...promoted.school, followers: 10_000 },
    };

    expect(getExpectedEventContacts(promoted, sparring)).toBeCloseTo(
      0.33 * EVENT_CONTACT_BASE_SCALE * 1.05,
    );
    expect(getExpectedEventContacts(expandedPromotion, sparring)).toBeCloseTo(
      0.33 * EVENT_CONTACT_BASE_SCALE * 1.05,
    );
    expect(getExpectedEventContacts(largeAudience, sparring)).toBeCloseTo(
      0.33 * EVENT_CONTACT_BASE_SCALE * 1.5,
    );
    expect(promoted.contacts).toHaveLength(initial.contacts.length);
  });

  it("gives every additional Event collaborator a smaller positive multiplier", () => {
    const initial = createInitialState(1_000);
    const multipliers = [1, 2, 3, 4, 5].map((count) =>
      getEventCollaboratorMultiplier(withEventCollaborators(initial, count))
    );
    const gains = multipliers.slice(1).map((value, index) => value - multipliers[index]);

    expect(multipliers[0]).toBe(1);
    expect(getEventCollaboratorMultiplier(withEventCollaborators(initial, 10))).toBeCloseTo(2);
    expect(getEventCollaboratorMultiplier(withEventCollaborators(initial, 100))).toBeCloseTo(4);
    expect(gains.every((gain) => gain > 0)).toBe(true);
    expect(gains.every((gain, index) => index === 0 || gain < gains[index - 1])).toBe(true);
  });

  it("balances automated Events around 3, 106 and 213 contacts per minute", () => {
    const initial = createInitialState(1_000);
    const oneCollaborator = withEventCollaborators(initial, 1);
    const kata = getAcquisitionEventDefinition("kata-sea-waves")!;
    const organizedSparring = getAcquisitionEventDefinition("organized-flyering")!;
    const noviceCycleContacts = (
      getExpectedEventContacts(oneCollaborator, sparring) * 2 +
      getExpectedEventContacts(oneCollaborator, kata) +
      getExpectedEventContacts(oneCollaborator, organizedSparring)
    ) * 1.5;
    const tenMaxed = maximizeEventUpgrades(withEventCollaborators(initial, 10));
    const hundredMaxed = maximizeEventUpgrades(withEventCollaborators(initial, 100));

    expect(noviceCycleContacts).toBeCloseTo(3);
    expect(getMasterEventContactsPerMinute(tenMaxed)).toBeCloseTo(106.46, 1);
    expect(getMasterEventContactsPerMinute(hundredMaxed)).toBeCloseTo(212.92, 1);
  });

  it("depletes the hidden contact market using active members and restores it after departures", () => {
    const initial = createInitialState(1_000);
    const withMembers = (activeMembers: number) => ({
      ...initial,
      school: {
        ...initial.school,
        activeMembers,
        peakActiveMembers: 5_000,
        fame: 5_000,
      },
    });

    expect(getEventMarketAvailability({
      ...initial,
      school: {
        ...initial.school,
        activeMembers: 10,
        peakActiveMembers: 10,
        fame: 10,
      },
    })).toBe(1);
    expect(getEventMarketAvailability(withMembers(100))).toBeCloseTo(0.9174, 4);
    expect(getEventMarketAvailability(withMembers(5_000))).toBeCloseTo(0.1669, 4);
    expect(getEventMarketAvailability(withMembers(10))).toBe(1);
  });

  it("lets Social counterbalance a depleted contact market over time", () => {
    const initial = createInitialState(1_000);
    const depleted = maximizeEventUpgrades({
      ...withEventCollaborators(initial, 10),
      school: { ...initial.school, activeMembers: 5_000 },
      unlocks: { ...initial.unlocks, social: true },
    });
    const withFollowers = (followers: number) => ({
      ...depleted,
      school: { ...depleted.school, followers },
    });

    expect(getMasterEventContactsPerMinute(withFollowers(0))).toBeCloseTo(17.77, 1);
    expect(getMasterEventContactsPerMinute(withFollowers(100_000))).toBeCloseTo(47.39, 1);
    expect(getMasterEventContactsPerMinute(withFollowers(300_000))).toBeCloseTo(106.64, 1);
  });

  it("applies market depletion to actual random rewards, not only expected values", () => {
    const initial = createInitialState(1_000);
    const depleted = {
      ...initial,
      school: { ...initial.school, activeMembers: 5_000 },
    };
    const fixedRewardDefinition = {
      ...sparring,
      contactOutcomes: [{ weight: 1, min: 100, max: 100 }],
    };
    const rewards = Array.from({ length: 2_000 }, (_, randomSeed) =>
      rollEventContactReward({ ...depleted, randomSeed }, fixedRewardDefinition).amount
    );
    const averageReward = rewards.reduce((total, amount) => total + amount, 0) /
      rewards.length;

    expect(averageReward).toBeCloseTo(
      getExpectedEventContacts(depleted, fixedRewardDefinition),
      1,
    );
  });

  it("does not penalize contact rewards for worn equipment", () => {
    const initial = createInitialState(1_000);
    const worn = { ...initial, equipment: { ...initial.equipment, wear: 99 } };

    expect(getExpectedEventContacts(worn, sparring)).toBe(
      getExpectedEventContacts(initial, sparring),
    );
  });

  it("can add an independent bonus contact to a zero base result", () => {
    const initial = createInitialState(1_000);
    const improved = {
      ...initial,
      upgrades: { ...initial.upgrades, "prepared-presentation": 5 },
    };
    const rescued = Array.from({ length: 1_000 }, (_, randomSeed) =>
      rollEventContactReward({ ...improved, randomSeed }, sparring)
    ).find((reward) => reward.baseAmount === 0 && reward.bonusAmount > 0);

    expect(rescued).toMatchObject({ baseAmount: 0, bonusAmount: 1, amount: 1 });
  });

  it("replaces zero with one while the school has fewer than four  collaborators", () => {
    const initial = createInitialState(1_000);
    const zeroRewardDefinition = {
      ...sparring,
      contactOutcomes: [{ weight: 1, min: 0, max: 0 }],
    };
    const withCollaborators = (count: number): GameState => ({
      ...initial,
      collaborators: Array.from({ length: count }, (_, index) => ({
        ...eventCollaborator(index),
        assignment: null,
      })),
    });

    expect([0, 1, 2].map((count) =>
      rollEventContactReward(withCollaborators(count), zeroRewardDefinition).amount
    )).toEqual([1, 1, 1]);
    expect(rollEventContactReward(withCollaborators(4), zeroRewardDefinition).amount).toBe(0);
  });
});
