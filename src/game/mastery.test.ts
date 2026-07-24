import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../content/mastery";
import { startAcquisitionEvent } from "./eventFlow";
import { createInitialState, gameReducer } from "./engine";

describe("collaborator mastery integration", () => {
  it("grants one XP per assigned second and announces a new grade", () => {
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
        writing: 59,
        events: 0,
        equipment: 0,
        instructor: 0,
      },
      rarity: "rare" as const,
    };
    const next = gameReducer(
      { ...initial, collaborators: [collaborator], unlocks: { ...initial.unlocks, collaborators: true } },
      { type: "TICK", now: 2_000 },
    );

    expect(next.collaborators[0].mastery?.writing).toBe(60);
    expect(next.messages.some((message) =>
      message.subject === "Maestria raggiunta: Giulia Ferrando" &&
      message.preview.includes("Iniziato in Scrittura")
    )).toBe(true);
  });

  it("advances only the currently assigned mastery for every collaborator", () => {
    const initial = createInitialState(1_000);
    const assignments = ["writing", "events", "equipment", "instructor", null] as const;
    const collaborators = assignments.map((assignment, index) => ({
      id: `mastery-role-${index}`,
      contactId: initial.contacts[index].id,
      displayName: `Collaboratore ${index}`,
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment,
      mastery: createInitialCollaboratorMastery(),
      rarity: "rare" as const,
    }));

    const next = gameReducer(
      { ...initial, collaborators },
      { type: "TICK", now: 2_500 },
    );

    expect(next.collaborators.map((collaborator) => collaborator.mastery)).toEqual([
      { writing: 1.5, events: 0, equipment: 0, instructor: 0 },
      { writing: 0, events: 1.5, equipment: 0, instructor: 0 },
      { writing: 0, events: 0, equipment: 1.5, instructor: 0 },
      { writing: 0, events: 0, equipment: 0, instructor: 1.5 },
      createInitialCollaboratorMastery(),
    ]);
  });

  it("applies Event mastery but grants XP only for elapsed assignment time", () => {
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
        events: 5_760,
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
      automation: { ...initial.automation, lastProcessedAt: 2_000 },
    };

    const started = startAcquisitionEvent(
      ready,
      "organized-flyering",
      2_000,
      organizer.id,
    );
    const event = started.acquisitionEvents[0];

    expect(event.resolvesAt - event.startedAt).toBe(5_000);
    expect(event.cost).toBe(0);
    expect(event.wearAdded).toBe(0);
    expect(started.school.euros).toBe(100);

    const completed = gameReducer(started, { type: "TICK", now: event.resolvesAt });
    expect(completed.collaborators[0].mastery?.events).toBe(5_765);
  });

  it("does not grant experience for equipment maintenance", () => {
    const initial = createInitialState(1_000);
    const equipmentCollaborators = ["Ada", "Bruno"].map((displayName, index) => ({
      id: `mastery-equipment-${index}`,
      contactId: initial.contacts[index].id,
      displayName,
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "equipment" as const,
      mastery: createInitialCollaboratorMastery(),
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
      .toEqual([0, 0]);
  });

  it("grants Instructor experience for training time, without a completion reward", () => {
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
      school: { ...initial.school, euros: 200 },
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
      automation: { ...initial.automation, lastProcessedAt: 2_000 },
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

    const elapsedSeconds = (
      training.collaborators[0].training!.completesAt - 2_000
    ) / 1_000;
    expect(completed.collaborators[0].mastery?.instructor).toBe(elapsedSeconds);
  });
});
