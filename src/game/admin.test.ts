import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import { createInitialState, gameReducer } from "./engine";
import { nextRandom } from "./random";
import { selectAvailableContacts } from "./selectors";
import { getLegendaryEnrollmentChance } from "./trialFlow";

function findSeed(predicate: (roll: number) => boolean): number {
  for (let seed = 0; seed < 100_000; seed += 1) {
    if (predicate(nextRandom(seed)[0])) return seed;
  }
  throw new Error("No deterministic seed found");
}

describe("admin resource actions", () => {
  it("adds members and updates member-based progression", () => {
    const initial = createInitialState(1_000);
    const state = gameReducer(initial, {
      type: "ADMIN_ADD_MEMBERS",
      amount: GAME_CONFIG.socialUnlockMembers,
    });

    expect(state.school).toMatchObject({
      activeMembers: GAME_CONFIG.socialUnlockMembers,
      peakActiveMembers: GAME_CONFIG.socialUnlockMembers,
      historicMembers: GAME_CONFIG.socialUnlockMembers,
      euros: 10,
      followers: GAME_CONFIG.socialUnlockMembers,
    });
    expect(state.unlocks).toMatchObject({ upgrades: true, social: true, forms: true });
    expect(state.statistics.membersEnrolled).toBe(0);
    expect(state.contacts.filter((contact) => contact.status === "enrolled"))
      .toHaveLength(GAME_CONFIG.socialUnlockMembers);
    expect(new Set(state.contacts.map((contact) => contact.id)).size).toBe(state.contacts.length);
    expect(state.collaborators).toHaveLength(1);
    expect(state.collaborators[0].specialProfileId).toBe("andrea-simonazzi");
  });

  it("adds euros without counting them as earned income", () => {
    const initial = createInitialState(1_000);
    const state = gameReducer(initial, { type: "ADMIN_ADD_EUROS", amount: 1_000.55 });

    expect(state.school.euros).toBe(1_000.55);
    expect(state.statistics.eurosEarned).toBe(0);
  });

  it("advances one month through the same pipeline as a natural monthly deadline", () => {
    const initial = gameReducer(createInitialState(1_000), {
      type: "ADMIN_ADD_MEMBERS",
      amount: 2,
    });
    const now = 2_000;
    const naturalBoundaryState = {
      ...initial,
      school: { ...initial.school, nextFeeAt: now },
    };

    const advanced = gameReducer(initial, { type: "ADMIN_ADVANCE_MONTH", now });
    const naturallyAdvanced = gameReducer(naturalBoundaryState, { type: "TICK", now });

    expect(advanced).toEqual(naturallyAdvanced);
    expect(advanced.school.currentMonth).toBe(initial.school.currentMonth + 1);
    expect(advanced.school.nextFeeAt).toBe(now + GAME_CONFIG.gameMonthMs);
    expect(advanced.statistics.eurosEarned).toBeGreaterThan(initial.statistics.eurosEarned);
  });

  it("adds or removes available email contacts", () => {
    const initial = createInitialState(1_000);
    const added = gameReducer(initial, { type: "ADMIN_ADD_CONTACTS", amount: 2 });
    const removed = gameReducer(added, { type: "ADMIN_ADD_CONTACTS", amount: -3 });

    expect(selectAvailableContacts(initial)).toBe(4);
    expect(selectAvailableContacts(added)).toBe(6);
    expect(selectAvailableContacts(removed)).toBe(3);
    expect(removed.statistics.contactsAcquired).toBe(0);
  });

  it("keeps contact ids unique across repeated admin additions", () => {
    const initial = createInitialState(1_000);
    const first = gameReducer(initial, { type: "ADMIN_ADD_CONTACTS", amount: 1 });
    const second = gameReducer(first, { type: "ADMIN_ADD_CONTACTS", amount: 1 });

    expect(second.contacts).toHaveLength(initial.contacts.length + 2);
    expect(new Set(second.contacts.map((contact) => contact.id)).size).toBe(second.contacts.length);
  });

  it("keeps the active member counter aligned when members are removed", () => {
    const initial = createInitialState(1_000);
    const added = gameReducer(initial, { type: "ADMIN_ADD_MEMBERS", amount: 3 });
    const removed = gameReducer(added, { type: "ADMIN_ADD_MEMBERS", amount: -2 });

    expect(removed.school.activeMembers).toBe(1);
    expect(removed.contacts.filter((contact) => contact.status === "enrolled")).toHaveLength(1);
    expect(removed.statistics.membersDeparted).toBe(0);
  });

  it("repairs old admin saves that have counters without member records", () => {
    const initial = createInitialState(1_000);
    const legacyState = {
      ...initial,
      school: { ...initial.school, activeMembers: 4, historicMembers: 4 },
    };
    const repaired = gameReducer(legacyState, { type: "ADMIN_ADD_MEMBERS", amount: 1 });

    expect(repaired.school.activeMembers).toBe(5);
    expect(repaired.contacts.filter((contact) => contact.status === "enrolled")).toHaveLength(5);
  });

  it("does not let negative resources go below zero", () => {
    const initial = createInitialState(1_000);
    const state = gameReducer(
      gameReducer(initial, { type: "ADMIN_ADD_MEMBERS", amount: -10 }),
      { type: "ADMIN_ADD_EUROS", amount: -10 },
    );

    expect(state.school.activeMembers).toBe(0);
    expect(state.school.euros).toBe(0);
  });

  it("schedules a real Legendary trial and enrolls only when the trial resolves", () => {
    const initial = createInitialState(1_000);
    const scheduled = gameReducer(initial, {
      type: "ADMIN_SCHEDULE_LEGENDARY_TRIAL",
      now: 2_000,
    });
    const trial = scheduled.scheduledTrials.at(-1)!;
    const contact = scheduled.contacts.find((candidate) => candidate.id === trial.contactId)!;

    expect(contact).toMatchObject({
      rarity: "legendary",
      status: "trialScheduled",
    });
    expect(contact.specialProfileId).toBeDefined();
    expect(trial.startsAt).toBe(2_000);
    expect(trial.resolvesAt - trial.startsAt).toBe(GAME_CONFIG.trialDurationMs);
    expect(scheduled.school.activeMembers).toBe(initial.school.activeMembers);
    expect(scheduled.statistics.trialsBooked).toBe(initial.statistics.trialsBooked + 1);

    const chance = getLegendaryEnrollmentChance(scheduled, contact.specialProfileId!);
    const successSeed = findSeed((roll) => roll < chance);
    const ready = {
      ...scheduled,
      scheduledTrials: scheduled.scheduledTrials.map((candidate) =>
        candidate.id === trial.id ? { ...candidate, resultSeed: successSeed } : candidate,
      ),
    };
    const resolved = gameReducer(ready, { type: "TICK", now: trial.resolvesAt });

    expect(resolved.contacts.find((candidate) => candidate.id === contact.id)?.status)
      .toBe("enrolled");
    expect(resolved.school.activeMembers).toBe(initial.school.activeMembers + 1);
    expect(resolved.collaborators.some(
      (collaborator) => collaborator.specialProfileId === contact.specialProfileId,
    )).toBe(true);
  });

  it("never schedules the same Legendary profile twice", () => {
    const initial = createInitialState(1_000);
    const first = gameReducer(initial, {
      type: "ADMIN_SCHEDULE_LEGENDARY_TRIAL",
      now: 2_000,
    });
    const second = gameReducer(first, {
      type: "ADMIN_SCHEDULE_LEGENDARY_TRIAL",
      now: 2_001,
    });
    const scheduledProfileIds = second.scheduledTrials.map((trial) =>
      second.contacts.find((contact) => contact.id === trial.contactId)?.specialProfileId,
    );

    expect(scheduledProfileIds).toHaveLength(2);
    expect(new Set(scheduledProfileIds).size).toBe(2);
  });
});
