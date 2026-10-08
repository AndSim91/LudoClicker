import { expect, it } from "vitest";
import { addAdminMembers } from "../../game/adminFlow";
import { createInitialState } from "../../game/engine";
import { FORMS_TEACHING_TUTORIAL_SCENE_ID } from "../../game/tutorialScholarship";
import type { GameState, TournamentResult } from "../../game/types";
import { getSchoolTournamentGoalText, selectSchoolTournamentGoal } from "./schoolTournamentGoal";

function school(withFormOne: number): GameState {
  const state = addAdminMembers(createInitialState(1_000, "Test"), 10);
  let trained = 0;
  return {
    ...state,
    contacts: state.contacts.map((contact) =>
      contact.status === "enrolled" && trained++ < withFormOne ? { ...contact, forms: ["form-1"] } : contact),
    tutorial: { ...state.tutorial, completedSceneIds: [FORMS_TEACHING_TUTORIAL_SCENE_ID] },
  };
}

it("counts the athletes with Forma 1 from the Forme tutorial to the first Torneo Scolastico", () => {
  expect(selectSchoolTournamentGoal(school(3))).toEqual({ athletes: 3, target: 8 });
  expect(getSchoolTournamentGoalText({ athletes: 3, target: 8 })).toBe("8 atleti con almeno la Forma 1 entro dicembre. Ne abbiamo 3.");
  expect(selectSchoolTournamentGoal(school(9))).toEqual({ athletes: 8, target: 8 });

  const beforeTutorial = school(3);
  expect(selectSchoolTournamentGoal({ ...beforeTutorial, tutorial: { ...beforeTutorial.tutorial, completedSceneIds: [] } })).toBeNull();

  const played = school(8);
  expect(selectSchoolTournamentGoal({
    ...played,
    tournaments: { ...played.tournaments, results: [{ level: "school" } as TournamentResult] },
  })).toBeNull();
});
