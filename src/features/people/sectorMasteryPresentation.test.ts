import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../../content/mastery";
import type { Collaborator } from "../../game/types";
import { getAverageSectorMastery } from "./sectorMasteryPresentation";

function collaborator(id: string, eventsXp: number): Collaborator {
  return {
    id,
    contactId: `contact-${id}`,
    displayName: id,
    joinedAt: 1_000,
    forms: [],
    instructorForms: [],
    assignment: "events",
    mastery: { ...createInitialCollaboratorMastery(), events: eventsXp },
    rarity: "ultra-rare",
  };
}

describe("sector mastery presentation", () => {
  it("derives the displayed level from the average role experience", () => {
    const average = getAverageSectorMastery([
      collaborator("uno", 300),
      collaborator("due", 900),
    ], "events");

    expect(average.averageXp).toBe(600);
    expect(average.progress.definition.name).toBe("Accademico");
    expect(average.progress.progress).toBe(0);
  });
});
