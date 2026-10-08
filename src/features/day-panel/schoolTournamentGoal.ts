import { GAME_CONFIG } from "../../game/config";
import { getEligibleSchoolContactsFromRoster } from "../../game/tournamentSimulation";
import { FORMS_TEACHING_TUTORIAL_SCENE_ID } from "../../game/tutorialScholarship";
import type { GameState } from "../../game/types";

export interface SchoolTournamentGoal {
  athletes: number;
  target: number;
}

/**
 * «Ander Games» goal (08/10/2026): from the Forme tutorial until the school plays
 * its first Torneo Scolastico, the athletes with at least Forma 1 out of the 8 needed.
 */
export function selectSchoolTournamentGoal(
  state: Pick<GameState, "contacts" | "collaborators" | "tournaments" | "unlocks" | "tutorial">,
): SchoolTournamentGoal | null {
  const { completedSceneIds, skippedSceneIds } = state.tutorial;
  if (
    !state.unlocks.forms ||
    !(completedSceneIds.includes(FORMS_TEACHING_TUTORIAL_SCENE_ID) ||
      skippedSceneIds.includes(FORMS_TEACHING_TUTORIAL_SCENE_ID)) ||
    state.tournaments.results.some((result) => result.level === "school")
  ) return null;
  const target = GAME_CONFIG.tournamentMinimumMembers;
  const athletes = getEligibleSchoolContactsFromRoster(state.contacts, state.collaborators).length;
  return { athletes: Math.min(athletes, target), target };
}

export function getSchoolTournamentGoalText({ athletes, target }: SchoolTournamentGoal): string {
  return athletes >= target
    ? `Abbiamo ${target} atleti con almeno la Forma 1: ci vediamo a dicembre!`
    : `${target} atleti con almeno la Forma 1 entro dicembre. Ne abbiamo ${athletes}.`;
}
