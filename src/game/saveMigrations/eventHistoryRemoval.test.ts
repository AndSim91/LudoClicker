import { describe, expect, it } from "vitest";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import type { AcquisitionEvent, GameState } from "../types";

function event(id: string, status: AcquisitionEvent["status"]): AcquisitionEvent {
  return {
    id,
    definitionId: "themed-event",
    title: "Evento a tema",
    location: "Genova",
    startedAt: 1_000,
    resolvesAt: 2_000,
    cost: 0,
    peopleMet: 10,
    demonstrationsGiven: 5,
    contactReward: 2,
    membersUsed: 1,
    equipmentUsed: 1,
    wearAdded: 1,
    status,
  };
}

describe("completed event history removal migration", () => {
  it("keeps running events and moves completed ones into aggregate counters", () => {
    const initial = createInitialState(1_000, "Manager", false);
    const completed = event("completed-event", "completed");
    const running = event("running-event", "running");
    const legacy = {
      ...initial,
      version: 81,
      acquisitionEvents: [completed, running],
      historyArchive: {
        ...initial.historyArchive,
        completedEventsByDefinition: { "themed-event": 2 },
      },
    };

    const migrated = migrate(legacy) as GameState;

    expect(migrated.version).toBe(82);
    expect(migrated.acquisitionEvents).toEqual([running]);
    expect(migrated.historyArchive.completedEventsByDefinition["themed-event"]).toBe(3);
    expect(legacy.acquisitionEvents).toEqual([completed, running]);
    expect(legacy.historyArchive.completedEventsByDefinition["themed-event"]).toBe(2);
  });
});
