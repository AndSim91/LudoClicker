import { expect, it } from "vitest";
import { SECRET_LEGENDARY_IDS } from "../content/secretLegendaries";
import { getRetainedLegendaryProgress } from "./contacts";
import { createInitialState } from "./engine";
import { createSecretLegendaryContact } from "./secretLegendaryRoster";
import type { GameState, SpecialCollaboratorId } from "./types";

const secretId = SECRET_LEGENDARY_IDS[0];
const earned = {
  forms: ["form-1" as const, "form-2" as const],
  instructorForms: ["form-1" as const],
  joinedAt: 10,
  arenaBase: 80,
  styleBase: 70,
  tournamentExperience: 9,
  agonistCourseCompletions: 2,
};

function withRetained(id: SpecialCollaboratorId): GameState {
  const state = createInitialState(1_000, "Tester");
  return {
    ...state,
    legendaryCollaborators: {
      ...state.legendaryCollaborators,
      retainedProgress: { ...state.legendaryCollaborators.retainedProgress, [id]: earned },
    },
  };
}

it("a Leggendario Segreto met again in the queue starts from zero, natural stats aside", () => {
  expect(getRetainedLegendaryProgress(withRetained(secretId).legendaryCollaborators, secretId))
    .toEqual({ arenaBase: 80, styleBase: 70 });
});

it("an ordinary Leggendario keeps what it earned", () => {
  expect(getRetainedLegendaryProgress(withRetained("eva-parodi").legendaryCollaborators, "eva-parodi"))
    .toEqual(earned);
});

it("a Leggendario Segreto won in a tournament always has its full profile", () => {
  const contact = createSecretLegendaryContact(withRetained(secretId), secretId, 2_000, "enrolled");
  expect(contact.forms.length).toBeGreaterThan(0);
  expect(contact.forms).not.toEqual(earned.forms);
  expect(contact.agonistCourseCompletions).toBe(0);
});
