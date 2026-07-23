import { describe, expect, it } from "vitest";
import { createInitialState, gameReducer } from "./engine";
import {
  AUTOMATION_HEARTBEAT_MS,
  getNextGameDeadline,
  getNextGameTickDelay,
  needsAutomationHeartbeat,
} from "./gameScheduler";
import type { Collaborator, GameState } from "./types";

const NOW = 10_000;

function collaborator(assignment: Collaborator["assignment"]): Collaborator {
  return {
    id: `collaborator-${assignment ?? "idle"}`,
    contactId: "contact-1",
    displayName: "Collaboratore Test",
    rarity: "rare",
    joinedAt: NOW,
    forms: [],
    instructorForms: [],
    assignment,
    mastery: {
      writing: 0,
      events: 0,
      lessons: 0,
      equipment: 0,
      instructor: 0,
    },
  };
}

function stateAtNow(): GameState {
  const state = createInitialState(NOW, "Scheduler test", false);
  return {
    ...state,
    school: { ...state.school, nextFeeAt: NOW + 60_000 },
    narrative: { ...state.narrative, nextEventAt: NOW + 120_000 },
  };
}

describe("game scheduler", () => {
  it("sleeps until the nearest state-changing deadline while idle", () => {
    const state = stateAtNow();

    expect(needsAutomationHeartbeat(state)).toBe(false);
    expect(getNextGameDeadline(state)).toBe(NOW + 60_000);
    expect(getNextGameTickDelay(state, NOW)).toBe(60_000);
  });

  it("prioritizes active runtime deadlines over the monthly boundary", () => {
    const state = stateAtNow();
    const withEvent: GameState = {
      ...state,
      acquisitionEvents: [{
        id: "event-1",
        definitionId: "park-sparring",
        title: "Sparring",
        location: "Parco",
        startedAt: NOW,
        resolvesAt: NOW + 2_500,
        cost: 0,
        peopleMet: 0,
        demonstrationsGiven: 0,
        contactReward: 0,
        membersUsed: 0,
        equipmentUsed: 0,
        wearAdded: 0,
        status: "running",
      }],
    };

    expect(getNextGameDeadline(withEvent)).toBe(NOW + 2_500);
    expect(getNextGameTickDelay(withEvent, NOW)).toBe(2_500);
  });

  it("waits for resolution after a guaranteed trial starts without equipment", () => {
    const state = stateAtNow();
    const withTrial: GameState = {
      ...state,
      scheduledTrials: [{
        id: "trial-without-equipment",
        contactId: state.contacts[0].id,
        startsAt: NOW - 1_000,
        resolvesAt: NOW + 2_500,
        resultSeed: 1,
        status: "scheduled",
        equipmentUsed: 0,
      }],
    };

    expect(getNextGameDeadline(withTrial)).toBe(NOW + 2_500);
    expect(getNextGameTickDelay(withTrial, NOW)).toBe(2_500);
  });

  it("ignores email outcomes held by the Events tutorial", () => {
    const state = stateAtNow();
    const withHeldOutcome: GameState = {
      ...state,
      pendingEmailOutcomes: [{
        id: "held-outcome",
        emailId: "email-1",
        contactId: state.contacts[0].id,
        resolvesAt: NOW - 1,
        result: "trialBooked",
        waitForTutorialEvent: true,
      }],
    };

    expect(getNextGameDeadline(withHeldOutcome)).toBe(NOW + 60_000);
    expect(getNextGameTickDelay(withHeldOutcome, NOW)).toBe(60_000);
  });

  it("keeps the one-second heartbeat required by continuous automation", () => {
    const state = stateAtNow();
    const automated: GameState = {
      ...state,
      school: { ...state.school, activeMembers: 1 },
      collaborators: [collaborator("lessons")],
    };

    expect(needsAutomationHeartbeat(automated)).toBe(true);
    expect(getNextGameTickDelay(automated, NOW)).toBe(AUTOMATION_HEARTBEAT_MS);
    expect(getNextGameTickDelay(automated, NOW + 400)).toBe(
      AUTOMATION_HEARTBEAT_MS - 400,
    );
  });

  it("wakes an event automator when the sparring cooldown expires", () => {
    const state = stateAtNow();
    const automated: GameState = {
      ...state,
      collaborators: [collaborator("events")],
      activities: { nextSparringAt: NOW + 400 },
    };

    expect(getNextGameTickDelay(automated, NOW)).toBe(400);
  });

  it("preserves automation progress when four ticks become one heartbeat", () => {
    const state = stateAtNow();
    const automated: GameState = {
      ...state,
      collaborators: [collaborator("writing")],
      unlocks: { ...state.unlocks, social: true },
    };
    let quarterTicks = automated;
    for (const now of [NOW + 250, NOW + 500, NOW + 750, NOW + 1_000]) {
      quarterTicks = gameReducer(quarterTicks, { type: "TICK", now });
    }
    const oneHeartbeat = gameReducer(automated, {
      type: "TICK",
      now: NOW + 1_000,
    });

    expect(quarterTicks.automation.socialContentBuffer).toBeCloseTo(
      oneHeartbeat.automation.socialContentBuffer,
      10,
    );
    expect(quarterTicks.automation.lastProcessedAt).toBe(
      oneHeartbeat.automation.lastProcessedAt,
    );
    expect(quarterTicks.statistics).toEqual(oneHeartbeat.statistics);
  });

  it("wakes immediately for an overdue deadline", () => {
    const state = stateAtNow();
    const overdue = {
      ...state,
      school: { ...state.school, nextFeeAt: NOW - 1 },
    };

    expect(getNextGameTickDelay(overdue, NOW)).toBe(0);
  });
});
