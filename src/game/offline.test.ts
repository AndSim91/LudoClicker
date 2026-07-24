import { describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import { freezeGameState, simulateOfflineProgress } from "./offline";

describe("offline progress disabled", () => {
  it("freezes fees and shifts every active deadline", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, activeMembers: 2, nextFeeAt: 61_000 },
    };
    const result = simulateOfflineProgress(state, 121_000);

    expect(result.summary).toBeNull();
    expect(result.state.school.euros).toBe(0);
    expect(result.state.school.currentMonth).toBe(9);
    expect(result.state.school.nextFeeAt).toBe(181_000);
    expect(result.state.messages[0].subject).not.toBe("Riepilogo attività offline");
    expect(result.state.lastSavedAt).toBe(121_000);
  });

  it("does not cap or process long closures", () => {
    const initial = createInitialState(1_000);
    const result = simulateOfflineProgress(initial, 90_001_000);

    expect(result.summary).toBeNull();
    expect(result.state.school.currentMonth).toBe(9);
    expect(result.state.school.nextFeeAt).toBe(initial.school.nextFeeAt + 90_000_000);
  });

  it("preserves the remaining duration of training", () => {
    const initial = createInitialState(1_000);
    const training = {
      ...initial,
      contacts: initial.contacts.map((contact, index) => index === 0
        ? {
            ...contact,
            training: {
              formId: "form-1" as const,
              startedAt: 2_000,
              completesAt: 12_000,
            },
          }
        : contact),
    };
    const result = simulateOfflineProgress(training, 101_000);
    expect(result.state.contacts[0].training?.completesAt).toBe(112_000);
  });

  it("does not run athletic preparation during an offline interval", () => {
    const initial = createInitialState(1_000);
    const athlete = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      arenaBase: 50,
      styleBase: 50,
    };
    const state = {
      ...initial,
      contacts: [athlete],
      collaborators: [{
        id: "offline-instructor",
        contactId: initial.contacts[1].id,
        displayName: "Istruttore",
        joinedAt: 1_000,
        forms: [],
        instructorForms: [],
        assignment: "instructor" as const,
        rarity: "legendary" as const,
      }],
      upgrades: { ...initial.upgrades, "athletic-preparation": 1 },
    };
    const result = simulateOfflineProgress(state, 121_000);

    expect(result.state.contacts[0].arenaBase).toBe(50);
    expect(result.state.contacts[0].styleBase).toBe(50);
    expect(result.state.automation.lastImprovedAthleteId).toBeUndefined();
  });

  it("does not produce Social content or sponsorship income while closed", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, followers: 1_000 },
      unlocks: { ...initial.unlocks, social: true },
      automation: { ...initial.automation, socialContentBuffer: 250 },
      collaborators: [{
        id: "offline-social",
        contactId: initial.contacts[0].id,
        displayName: "Collaboratore Social",
        joinedAt: 1_000,
        forms: [],
        instructorForms: [],
        assignment: "writing" as const,
        rarity: "ultra-rare" as const,
      }],
    };

    const result = simulateOfflineProgress(state, 121_000);

    expect(result.state.automation.socialContentBuffer).toBe(250);
    expect(result.state.statistics.socialContentCycles).toBe(0);
    expect(result.state.school.euros).toBe(0);
  });

  it("freezes an explicit pause interval independently from the last save", () => {
    const initial = createInitialState(1_000);
    const withCooldowns = {
      ...initial,
      activities: {
        eventCooldowns: {
          "park-sparring": {
            kind: "realtime" as const,
            startedAt: 2_000,
            availableAt: 7_000,
          },
          "local-event": {
            kind: "calendar" as const,
            startedMonthPosition: 9.5,
            availableAtMonth: 10,
          },
        },
      },
    };
    const paused = freezeGameState(withCooldowns, 51_000, 10_000);

    expect(paused.lastSavedAt).toBe(51_000);
    expect(paused.automation.lastProcessedAt).toBe(51_000);
    expect(paused.school.nextFeeAt).toBe(initial.school.nextFeeAt + 10_000);
    expect(paused.activities.eventCooldowns["park-sparring"]).toEqual({
      kind: "realtime",
      startedAt: 12_000,
      availableAt: 17_000,
    });
    expect(paused.activities.eventCooldowns["local-event"]).toEqual(
      withCooldowns.activities.eventCooldowns["local-event"],
    );
  });
});
