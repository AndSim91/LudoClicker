import { expect, it } from "vitest";
import { addAdminMembers } from "../../game/adminFlow";
import { createInitialState } from "../../game/engine";
import { GAME_CONFIG } from "../../game/config";
import { FORMS_TEACHING_TUTORIAL_SCENE_ID } from "../../game/tutorialScholarship";
import type { GameState, TournamentResult } from "../../game/types";
import { formatCountdown, getStoryGoalTip, selectStoryGoal } from "./storyGoal";

function school(withFormOne: number): GameState {
  const state = addAdminMembers(createInitialState(1_000, "Test"), 10);
  let trained = 0;
  return {
    ...state,
    unlocks: { ...state.unlocks, forms: true },
    contacts: state.contacts.map((contact) =>
      contact.status === "enrolled" && !contact.specialProfileId && trained++ < withFormOne
        ? { ...contact, forms: ["form-1"] }
        : contact),
    tutorial: { ...state.tutorial, completedSceneIds: [FORMS_TEACHING_TUTORIAL_SCENE_ID] },
  };
}

it("follows the tappe: athletes with Forma 1, the countdown to the Scolastico, then 8 collaborators", () => {
  const athletes = school(3);
  expect(selectStoryGoal(athletes, 0)).toEqual({ kind: "athletes", value: 3, target: 8 });
  expect(getStoryGoalTip({ kind: "athletes", value: 3, target: 8 }).text)
    .toBe("8 atleti con almeno la Forma 1 entro dicembre. Ne abbiamo 3.");
  expect(selectStoryGoal({ ...athletes, tutorial: { ...athletes.tutorial, completedSceneIds: [] } }, 0)).toBeNull();

  // January (month 1): the Scolastico closes December, 11 months and a fraction from now.
  const open = { ...school(8), unlocks: { ...school(8).unlocks, tournaments: true } };
  const countdown = selectStoryGoal(open, open.school.nextFeeAt - 30_000);
  expect(countdown).toEqual({ kind: "tournament", secondsLeft: 11 * GAME_CONFIG.gameMonthMs / 1_000 + 30 });

  const played = { ...open, tournaments: { ...open.tournaments, results: [{ level: "school" } as TournamentResult] } };
  expect(selectStoryGoal(played, 0)).toEqual({ kind: "collaborators", value: played.collaborators.length, target: 8 });
  expect(getStoryGoalTip({ kind: "collaborators", value: 3, target: 8 }).text)
    .toBe("Servono 8 Collaboratori delle Onde. Ne abbiamo 3.");
  expect(selectStoryGoal({
    ...played,
    collaboratorManagement: { ...played.collaboratorManagement, aggregateViewUnlocked: true },
  }, 0)).toBeNull();
});

it("starts with 10 members, from the first one, until the Forme open", () => {
  const initial = createInitialState(1_000, "Test");
  expect(selectStoryGoal(initial, 0)).toBeNull();
  const three = addAdminMembers(initial, 3);
  expect(selectStoryGoal(three, 0)).toEqual({ kind: "members", value: 3, target: 10 });
  expect(getStoryGoalTip({ kind: "members", value: 3, target: 10 }).text).toBe("Servono 10 iscritti. Ne abbiamo 3.");
});

it("counts down in seconds, then minutes and seconds", () => {
  expect(formatCountdown(42)).toBe("42 s");
  expect(formatCountdown(582)).toBe("9:42");
});
