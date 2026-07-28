import { describe, expect, it } from "vitest";
import {
  MAX_CATCH_UP_STEPS_PER_TICK,
  createInitialState,
  gameReducer,
} from "./engine";
import {
  AUTOMATION_HEARTBEAT_MS,
  getNextGameDeadline,
  getNextGameTickAt,
  getNextGameTickDelay,
  needsAutomationHeartbeat,
} from "./gameScheduler";
import type { AcquisitionEvent, Collaborator, GameState } from "./types";

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
      equipment: 0,
      instructor: 0,
      gadget: 0,
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

function runningEvent(
  id: string,
  definitionId: AcquisitionEvent["definitionId"],
  resolvesAt: number,
): AcquisitionEvent {
  return {
    id,
    definitionId,
    title: "Evento " + id,
    location: "Luogo test",
    startedAt: NOW,
    resolvesAt,
    cost: 0,
    peopleMet: 0,
    demonstrationsGiven: 0,
    contactReward: 0,
    membersUsed: 0,
    equipmentUsed: 0,
    wearAdded: 0,
    status: "running",
  };
}

describe("game scheduler", () => {
  it("sleeps until the nearest state-changing deadline while idle", () => {
    const state = stateAtNow();

    expect(needsAutomationHeartbeat(state)).toBe(false);
    expect(getNextGameDeadline(state)).toBe(NOW + 60_000);
    expect(getNextGameTickDelay(state, NOW)).toBe(60_000);
    expect(getNextGameTickDelay(state, NOW, 100)).toBe(600);
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
      contacts: state.contacts.map((contact, index) =>
        index === 0 ? { ...contact, status: "enrolled" as const } : contact
      ),
      collaborators: [collaborator("instructor")],
      upgrades: { ...state.upgrades, "athletic-preparation": 1 },
    };

    expect(needsAutomationHeartbeat(automated)).toBe(true);
    expect(getNextGameTickDelay(automated, NOW)).toBe(AUTOMATION_HEARTBEAT_MS);
    expect(getNextGameTickDelay(automated, NOW + 400)).toBe(
      AUTOMATION_HEARTBEAT_MS - 400,
    );
  });

  it("keeps the heartbeat active while Gadget work or sales can advance", () => {
    const state = stateAtNow();
    const working: GameState = {
      ...state,
      unlocks: { ...state.unlocks, gadget: true },
      collaborators: [collaborator("gadget")],
      gadgets: {
        ...state.gadgets,
        activeWork: {
          productId: "wristband",
          kind: "development",
          completedWorkMs: 0,
        },
        products: {
          ...state.gadgets.products,
          wristband: {
            ...state.gadgets.products.wristband,
            unlocked: true,
            projectPurchased: true,
          },
        },
      },
    };

    expect(needsAutomationHeartbeat(working)).toBe(true);
    expect(getNextGameTickDelay(working, NOW)).toBe(AUTOMATION_HEARTBEAT_MS);

    const idle = { ...working, gadgets: { ...working.gadgets, activeWork: undefined } };
    expect(needsAutomationHeartbeat(idle)).toBe(false);
  });

  it("wakes an event automator when the sparring cooldown expires", () => {
    const state = stateAtNow();
    const automated: GameState = {
      ...state,
      collaborators: [collaborator("events")],
      activities: {
        eventCooldowns: {
          "park-sparring": {
            kind: "realtime",
            startedAt: NOW,
            availableAt: NOW + 400,
          },
        },
      },
    };

    expect(getNextGameTickAt(automated, NOW)).toBe(NOW + 400);
    expect(getNextGameTickDelay(automated, NOW)).toBe(400);
  });

  it("does not poll event automation while no event is feasible", () => {
    const state = stateAtNow();
    const blocked: GameState = {
      ...state,
      school: { ...state.school, euros: 0 },
      collaborators: [collaborator("events")],
      equipment: { ...state.equipment, availableSwords: 0 },
      activities: {
        eventCooldowns: {
          "park-sparring": {
            kind: "realtime",
            startedAt: NOW,
            availableAt: NOW + 30_000,
          },
        },
      },
    };

    expect(needsAutomationHeartbeat(blocked)).toBe(false);
    expect(getNextGameTickDelay(blocked, NOW)).toBe(30_000);
  });

  it("stops polling an instructor after the discrete teaching pass is known idle", () => {
    const state = stateAtNow();
    const unchecked: GameState = {
      ...state,
      collaborators: [collaborator("instructor")],
      unlocks: { ...state.unlocks, forms: true },
    };

    expect(getNextGameTickDelay(unchecked, NOW)).toBe(0);
    const checked = gameReducer(unchecked, { type: "TICK", now: NOW });
    expect(needsAutomationHeartbeat(checked)).toBe(false);
    expect(getNextGameTickDelay(checked, NOW)).toBe(60_000);
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

  it("recovers multiple missed heartbeats without losing automation progress", () => {
    const state = stateAtNow();
    const automated: GameState = {
      ...state,
      collaborators: [collaborator("writing")],
      unlocks: { ...state.unlocks, social: true },
    };
    let sequential = automated;
    for (let second = 1; second <= 5; second += 1) {
      sequential = gameReducer(sequential, {
        type: "TICK",
        now: NOW + second * AUTOMATION_HEARTBEAT_MS,
      });
    }

    const delayed = gameReducer(automated, {
      type: "TICK",
      now: NOW + 5 * AUTOMATION_HEARTBEAT_MS,
    });

    expect(delayed).toEqual(sequential);
  });

  it("carries sub-heartbeat timer lateness into the next runtime tick", () => {
    const state = stateAtNow();
    const automated: GameState = {
      ...state,
      collaborators: [collaborator("writing")],
      unlocks: { ...state.unlocks, social: true },
    };
    const firstHeartbeat = gameReducer(automated, {
      type: "TICK",
      now: NOW + AUTOMATION_HEARTBEAT_MS,
    });

    const lateRuntimeTick = gameReducer(automated, {
      type: "TICK",
      now: NOW + AUTOMATION_HEARTBEAT_MS + 100,
      stepBudget: MAX_CATCH_UP_STEPS_PER_TICK,
    });

    expect(lateRuntimeTick).toEqual(firstHeartbeat);
    expect(
      getNextGameTickDelay(
        lateRuntimeTick,
        NOW + AUTOMATION_HEARTBEAT_MS + 100,
      ),
    ).toBe(900);

    const nextRuntimeTick = gameReducer(lateRuntimeTick, {
      type: "TICK",
      now: NOW + 2 * AUTOMATION_HEARTBEAT_MS,
      stepBudget: MAX_CATCH_UP_STEPS_PER_TICK,
    });
    const sequential = gameReducer(firstHeartbeat, {
      type: "TICK",
      now: NOW + 2 * AUTOMATION_HEARTBEAT_MS,
    });

    expect(nextRuntimeTick).toEqual(sequential);
  });

  it("resolves intermediate deadlines at their chronological timestamps", () => {
    const state: GameState = {
      ...stateAtNow(),
      acquisitionEvents: [
        runningEvent("first", "park-sparring", NOW + 1_000),
        runningEvent("second", "public-demo", NOW + 2_500),
      ],
    };
    let sequential = state;
    for (const now of [NOW + 1_000, NOW + 2_500, NOW + 5_000]) {
      sequential = gameReducer(sequential, { type: "TICK", now });
    }

    const delayed = gameReducer(state, { type: "TICK", now: NOW + 5_000 });

    expect(delayed).toEqual(sequential);
    expect(delayed.activities.eventCooldowns["park-sparring"]).toMatchObject({
      startedAt: NOW + 1_000,
    });
    expect(delayed.activities.eventCooldowns["public-demo"]).toMatchObject({
      startedAt: NOW + 2_500,
    });
  });

  it("yields catch-up beyond the runtime budget without dropping queued time", () => {
    const state = stateAtNow();
    const automated: GameState = {
      ...state,
      school: { ...state.school, activeMembers: 1 },
      contacts: state.contacts.map((contact, index) =>
        index === 0 ? { ...contact, status: "enrolled" as const } : contact
      ),
      collaborators: [collaborator("instructor")],
      upgrades: { ...state.upgrades, "athletic-preparation": 1 },
    };
    const targetNow = NOW +
      (MAX_CATCH_UP_STEPS_PER_TICK + 1) * AUTOMATION_HEARTBEAT_MS;

    const partial = gameReducer(automated, {
      type: "TICK",
      now: targetNow,
      stepBudget: MAX_CATCH_UP_STEPS_PER_TICK,
    });

    expect(partial.automation.lastProcessedAt).toBe(
      NOW + MAX_CATCH_UP_STEPS_PER_TICK * AUTOMATION_HEARTBEAT_MS,
    );
    expect(getNextGameTickDelay(partial, targetNow)).toBe(0);

    const completed = gameReducer(partial, {
      type: "TICK",
      now: targetNow,
      stepBudget: MAX_CATCH_UP_STEPS_PER_TICK,
    });
    let sequential = automated;
    for (let step = 1; step <= MAX_CATCH_UP_STEPS_PER_TICK + 1; step += 1) {
      sequential = gameReducer(sequential, {
        type: "TICK",
        now: NOW + step * AUTOMATION_HEARTBEAT_MS,
      });
    }

    expect(completed).toEqual(sequential);
    expect(completed.automation.lastProcessedAt).toBe(targetNow);
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
