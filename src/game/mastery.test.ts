import { describe, expect, it } from "vitest";
import { startAcquisitionEvent } from "./eventFlow";
import { createInitialState, gameReducer } from "./engine";

describe("collaborator mastery integration", () => {
  it("grants writing experience and announces a new grade", () => {
    const initial = createInitialState(1_000);
    const collaborator = {
      id: "mastery-writing",
      contactId: initial.contacts[0].id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "writing" as const,
      mastery: {
        writing: 98.5,
        events: 0,
        lessons: 0,
        social: 0,
        equipment: 0,
        instructor: 0,
      },
      rarity: "rare" as const,
    };
    const next = gameReducer(
      { ...initial, collaborators: [collaborator], unlocks: { ...initial.unlocks, collaborators: true } },
      { type: "TICK", now: 2_000 },
    );

    expect(next.collaborators[0].mastery?.writing).toBe(100);
    expect(next.messages.some((message) =>
      message.subject === "Maestria raggiunta: Giulia Ferrando" &&
      message.preview.includes("Iniziato in Scrittura")
    )).toBe(true);
  });

  it("applies Event mastery to its organizer's duration, cost, wear, and experience", () => {
    const initial = createInitialState(1_000);
    const organizer = {
      id: "mastery-events",
      contactId: initial.contacts[0].id,
      displayName: "Luca Organizzato",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "events" as const,
      mastery: {
        writing: 0,
        events: 1_500,
        lessons: 0,
        social: 0,
        equipment: 0,
        instructor: 0,
      },
      rarity: "rare" as const,
    };
    const ready = {
      ...initial,
      school: {
        ...initial.school,
        activeMembers: 1,
        peakActiveMembers: 1,
        euros: 100,
      },
      collaborators: [organizer],
    };

    const started = startAcquisitionEvent(
      ready,
      "organized-flyering",
      2_000,
      organizer.id,
    );
    const event = started.acquisitionEvents[0];

    expect(event.resolvesAt - event.startedAt).toBe(16_000);
    expect(event.cost).toBe(30);
    expect(event.wearAdded).toBe(0);
    expect(started.school.euros).toBe(70);

    const completed = gameReducer(started, { type: "TICK", now: event.resolvesAt });
    expect(completed.collaborators[0].mastery?.events).toBe(1_510);
  });

  it("grants maintenance experience for every point of wear removed to every assignee", () => {
    const initial = createInitialState(1_000);
    const equipmentCollaborators = ["Ada", "Bruno"].map((displayName, index) => ({
      id: `mastery-equipment-${index}`,
      contactId: initial.contacts[index].id,
      displayName,
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "equipment" as const,
      rarity: "rare" as const,
    }));
    const maintained = gameReducer(
      {
        ...initial,
        school: { ...initial.school, euros: 1_000 },
        equipment: { ...initial.equipment, wear: 37 },
        collaborators: equipmentCollaborators,
      },
      { type: "MAINTAIN_EQUIPMENT", now: 2_000 },
    );

    expect(maintained.collaborators.map((collaborator) => collaborator.mastery?.equipment))
      .toEqual([185, 185]);
  });

  it("grants Instructor experience for self-training", () => {
    const initial = createInitialState(1_000);
    const instructor = {
      id: "mastery-self-instructor",
      contactId: initial.contacts[0].id,
      displayName: "Marta Kata",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "instructor" as const,
      rarity: "rare" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, euros: 100 },
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };
    const training = gameReducer(ready, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "form-1",
      now: 2_000,
    });
    const completed = gameReducer(training, {
      type: "TICK",
      now: training.collaborators[0].training!.completesAt,
    });

    expect(completed.collaborators[0].mastery?.instructor).toBe(10);
  });
});
