import { describe, expect, it } from "vitest";
import { createInitialState } from "./initialState";
import { processAutomaticEvents } from "./eventAutomationFlow";
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
      historicMembers: 400,
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
  it("starts one best feasible event per collaborator without duplicate definitions", () => {
    const automated = processAutomaticEvents(fundedEventState(), 2_000);
    const running = automated.acquisitionEvents.filter((event) => event.status === "running");

    expect(running).toHaveLength(2);
    expect(new Set(running.map((event) => event.collaboratorId)).size).toBe(2);
    expect(new Set(running.map((event) => event.definitionId)).size).toBe(2);
    expect(running[0].definitionId).toBe("milan-games-week");
  });

  it("cancels an event on reassignment and refunds euros and swords", () => {
    const initial = fundedEventState();
    const oneCollaborator = { ...initial, collaborators: [initial.collaborators[0]] };
    const automated = processAutomaticEvents(oneCollaborator, 2_000);
    const event = automated.acquisitionEvents[0];
    const reassigned = assignCollaborator(automated, "events-1", "writing", 2_500);

    expect(reassigned.acquisitionEvents).toHaveLength(0);
    expect(reassigned.school.euros).toBe(automated.school.euros + event.cost);
    expect(reassigned.equipment.availableSwords).toBe(
      automated.equipment.availableSwords + event.equipmentUsed,
    );
  });
});
