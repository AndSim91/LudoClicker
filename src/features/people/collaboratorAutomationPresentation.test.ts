import { describe, expect, it } from "vitest";
import { createInitialState } from "../../game/engine";
import type { Collaborator } from "../../game/types";
import { getCollaboratorAutomationPresentation } from "./collaboratorAutomationPresentation";

describe("getCollaboratorAutomationPresentation", () => {
  it("shows Social income per second using the effective cycle with every speed bonus", () => {
    const initial = createInitialState(1_000);
    const socialCollaborator: Collaborator = {
      id: "social-collaborator",
      contactId: initial.contacts[0].id,
      displayName: "Collaboratore Social",
      joinedAt: 1_000,
      forms: [
        "form-1",
        "course-x",
        "form-2",
        "course-y",
        "form-3-double",
        "form-4-double",
        "form-5-double",
        "form-6",
        "form-7",
      ],
      instructorForms: [],
      assignment: "social" as const,
      mastery: {
        writing: 0,
        events: 0,
        lessons: 0,
        social: 1_500,
        equipment: 0,
        instructor: 0,
      },
      rarity: "ultra-rare" as const,
    };
    const state = {
      ...initial,
      school: { ...initial.school, activeMembers: 16 },
      collaborators: [socialCollaborator],
      upgrades: {
        ...initial.upgrades,
        "automatic-signature": 1,
        "updated-page": 1,
      },
    };

    const presentation = getCollaboratorAutomationPresentation({
      state,
      collaboratorId: socialCollaborator.id,
      assignment: "social",
      now: 1_000,
      activeEmail: undefined,
    });

    expect(presentation.title).toBe(
      "Rendimento: 1,78\u00a0€/s | <0,01/s Lezioni di prova | <0,01/s Nuovi contatti",
    );
    expect(presentation.detail).toBeUndefined();
    expect(presentation.title).not.toMatch(/Prossimo rendimento|Ciclo base/);
    expect(presentation.durationMs).toBeCloseTo(
      120_000 / (1.55 * 1.25 * 1.2 * 1.15),
      6,
    );
  });
});
