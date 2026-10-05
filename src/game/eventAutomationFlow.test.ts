import { describe, expect, it } from "vitest";
import { createInitialState } from "./initialState";
import { processAutomaticEvents } from "./eventAutomationFlow";
import { getEventCopyCost, resolveAcquisitionEvent, startAcquisitionEvent } from "./eventFlow";
import { assignCollaborator } from "./trainingFlow";
import type { Collaborator, GameState } from "./types";

function eventCollaborator(id: string): Collaborator {
  return {
    id,
    contactId: `contact-${id}`,
    displayName: id,
    joinedAt: 1_000,
    forms: [],
    instructorForms: [],
    assignment: "events",
    rarity: "ultra-rare",
  };
}

function fundedEventState(): GameState {
  const initial = createInitialState(1_000);
  return {
    ...initial,
    school: {
      ...initial.school,
      activeMembers: 400,
      peakActiveMembers: 400,
      fame: 400,
      euros: 100_000,
    },
    equipment: {
      ...initial.equipment,
      totalSwords: 100,
      availableSwords: 100,
    },
    collaborators: [eventCollaborator("events-1"), eventCollaborator("events-2")],
  };
}

describe("automatic collaborator events", () => {
  it("starts the cheapest feasible events and uses expected contacts as the tie-breaker", () => {
    const automated = processAutomaticEvents(fundedEventState(), 2_000);
    const running = automated.acquisitionEvents.filter((event) => event.status === "running");

    expect(running).toHaveLength(2);
    expect(new Set(running.map((event) => event.collaboratorId)).size).toBe(2);
    expect(new Set(running.map((event) => event.definitionId)).size).toBe(2);
    expect(running.map((event) => event.definitionId)).toEqual([
      "park-sparring",
      "kata-sea-waves",
    ]);
  });

  it("cancels an event on reassignment, refunds its cost, and applies quarter wear", () => {
    const initial = fundedEventState();
    const oneCollaborator = { ...initial, collaborators: [initial.collaborators[0]] };
    const automated = processAutomaticEvents(oneCollaborator, 2_000);
    const event = automated.acquisitionEvents[0];
    const reassigned = assignCollaborator(automated, "events-1", "writing", 2_500);

    expect(reassigned.acquisitionEvents).toHaveLength(0);
    expect(reassigned.school.euros).toBe(automated.school.euros + event.cost);
    expect(reassigned.equipment).toMatchObject({
      availableSwords: 100,
      damagedSwords: 0,
      wear: 0,
    });
  });

  describe("Eventi nel Multiverso", () => {
    function multiverse(level: number): GameState {
      const state = fundedEventState();
      return { ...state, upgrades: { ...state.upgrades, "event-multiverse": level } };
    }

    it("doubles the cost of every copy and stops at the level cap", () => {
      expect([0, 1, 2].map((copies) => getEventCopyCost(50, copies))).toEqual([50, 100, 200]);
      const once = startAcquisitionEvent(multiverse(0), "park-sparring", 2_000);
      expect(startAcquisitionEvent(once, "park-sparring", 2_000)).toBe(once);

      let state = multiverse(2);
      for (let copy = 0; copy < 4; copy += 1) {
        state = startAcquisitionEvent(state, "park-sparring", 2_000);
      }
      const copies = state.acquisitionEvents.filter((event) => event.definitionId === "park-sparring");
      const base = copies[0].cost;
      expect(copies.map((event) => event.cost)).toEqual([base, base * 2, base * 4]);
    });

    it("starts the cooldown only when the last copy ends", () => {
      let state = multiverse(1);
      state = startAcquisitionEvent(state, "park-sparring", 2_000);
      state = startAcquisitionEvent(state, "park-sparring", 2_000);
      const [first, second] = state.acquisitionEvents;
      const afterFirst = resolveAcquisitionEvent(state, first, 3_000, 1);
      expect(afterFirst.activities.eventCooldowns["park-sparring"]).toBeUndefined();
      const afterSecond = resolveAcquisitionEvent(afterFirst, second, 4_000, 1);
      expect(afterSecond.activities.eventCooldowns["park-sparring"]).toBeDefined();
    });

    it("prefers events not running yet, then the cheapest copy", () => {
      const state = multiverse(1);
      const collaborators = Array.from({ length: 30 }, (_, index) => eventCollaborator(`events-${index}`));
      const automated = processAutomaticEvents({ ...state, collaborators }, 2_000);
      const running = automated.acquisitionEvents.filter((event) => event.status === "running");
      const firstCopy = running.findIndex((event, index) =>
        running.slice(0, index).some((earlier) => earlier.definitionId === event.definitionId)
      );
      expect(firstCopy).toBeGreaterThan(0);
      const freshIds = running.slice(0, firstCopy).map((event) => event.definitionId);
      expect(new Set(freshIds).size).toBe(freshIds.length);
      const counts = new Map<string, number>();
      running.forEach((event) => counts.set(event.definitionId, (counts.get(event.definitionId) ?? 0) + 1));
      expect(Math.max(...counts.values())).toBe(2);
    });
  });
});
