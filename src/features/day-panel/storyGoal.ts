import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import { getCalendarMonth } from "../../game/calendar";
import { GAME_CONFIG } from "../../game/config";
import { hasPrestigeTitle } from "../../game/progression";
import { getTournamentSeason } from "../../game/tournamentFlow";
import { getEligibleSchoolContactsFromRoster } from "../../game/tournamentSimulation";
import { FORMS_TEACHING_TUTORIAL_SCENE_ID } from "../../game/tutorialScholarship";
import { ACADEMY_GOAL_TUTORIAL_SCENE_ID } from "../../content/tutorialScenes";
import type { GameState } from "../../game/types";
import { findUpcomingTournamentFromSchedule } from "../tournaments/tournamentPresentation";

/**
 * The goal of the current tappa in «La mia giornata» (08/10/2026), in every school:
 * from the first member, 10 members (Forme open; 09/10/2026), then
 * 8 athletes with Forma 1 (Tornei opens), then the countdown to the Torneo
 * Scolastico, then 8 Collaboratori delle Onde (the Consiglio, never named here),
 * then a title at the Torneo Accademico, Arena or Stile (09/10/2026), once
 * M.A.K.I. has announced it (10/10/2026; schools founded later skip the scene).
 */
export type StoryGoal =
  | { kind: "members"; value: number; target: number }
  | { kind: "athletes"; value: number; target: number }
  | { kind: "tournament"; secondsLeft: number }
  | { kind: "collaborators"; value: number; target: number }
  | { kind: "academy"; secondsLeft: number };

export type StoryGoalState = Pick<
  GameState,
  "contacts" | "collaborators" | "collaboratorManagement" | "network" | "school" | "tournaments" | "unlocks" | "tutorial"
>;

export function selectStoryGoal(state: StoryGoalState, now: number): StoryGoal | null {
  const { completedSceneIds, skippedSceneIds } = state.tutorial;
  if (!state.unlocks.forms) {
    // Nobody can leave below 10 members, so the count only goes up.
    const target = GAME_CONFIG.formsUnlockMembers;
    const members = state.school.activeMembers;
    return members > 0 ? { kind: "members", value: Math.min(members, target), target } : null;
  }
  if (
    !(completedSceneIds.includes(FORMS_TEACHING_TUTORIAL_SCENE_ID) ||
      skippedSceneIds.includes(FORMS_TEACHING_TUTORIAL_SCENE_ID))
  ) return null;
  if (!state.unlocks.tournaments) {
    const target = GAME_CONFIG.tournamentMinimumMembers;
    const athletes = getEligibleSchoolContactsFromRoster(state.contacts, state.collaborators).length;
    return { kind: "athletes", value: Math.min(athletes, target), target };
  }
  if (!state.tournaments.results.some((result) => result.level === "school")) {
    const upcoming = findUpcomingTournamentFromSchedule(state.school, state.tournaments);
    if (upcoming?.level !== "school") return null;
    return { kind: "tournament", secondsLeft: Math.max(0, Math.ceil((upcoming.occursAt - now) / 1_000)) };
  }
  if (state.collaboratorManagement.aggregateViewUnlocked) {
    const announced = state.network.schoolCount > 0 ||
      completedSceneIds.includes(ACADEMY_GOAL_TUTORIAL_SCENE_ID) ||
      skippedSceneIds.includes(ACADEMY_GOAL_TUTORIAL_SCENE_ID);
    return hasPrestigeTitle(state) || !announced
      ? null
      : { kind: "academy", secondsLeft: getSecondsToNextAcademy(state, now) };
  }
  const target = GAME_CONFIG.collaboratorAggregateUnlockCount;
  return { kind: "collaborators", value: Math.min(state.collaborators.length, target), target };
}

/** The Accademico of this calendar year if not yet played, otherwise next year's. */
function getSecondsToNextAcademy(state: StoryGoalState, now: number): number {
  const { currentMonth, nextFeeAt } = state.school;
  const april = TOURNAMENT_DEFINITIONS.academy.calendarMonth;
  let offset = (april - getCalendarMonth(currentMonth) + 12) % 12;
  // The tournament runs at the end of its month: in April, skip it if already played (or missed).
  const season = getTournamentSeason("academy", currentMonth);
  if (offset === 0 && [...state.tournaments.results, ...state.tournaments.missedTournaments]
    .some((entry) => entry.level === "academy" && entry.season === season)) offset = 12;
  return Math.max(0, Math.ceil((nextFeeAt + offset * GAME_CONFIG.gameMonthMs - now) / 1_000));
}

/** «42 s» under a minute, then «9:42». */
export function formatCountdown(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function getStoryGoalLabel(goal: StoryGoal): string {
  return goal.kind === "tournament" || goal.kind === "academy" ? formatCountdown(goal.secondsLeft) : `${goal.value}/${goal.target}`;
}

export function isStoryGoalReady(goal: StoryGoal): boolean {
  return goal.kind !== "tournament" && goal.kind !== "academy" && goal.value >= goal.target;
}

export function getStoryGoalTip(goal: StoryGoal): { title: string; text: string } {
  if (goal.kind === "members") {
    return { title: "Dieci iscritti", text: `Servono ${goal.target} iscritti. Ne abbiamo ${goal.value}.` };
  }
  if (goal.kind === "athletes") {
    return {
      title: "Ander Games",
      text: goal.value >= goal.target
        ? `Abbiamo ${goal.target} atleti con almeno la Forma 1: ci vediamo a dicembre!`
        : `${goal.target} atleti con almeno la Forma 1 entro dicembre. Ne abbiamo ${goal.value}.`,
    };
  }
  if (goal.kind === "tournament") {
    return { title: "Ander Games", text: `Il Torneo Scolastico inizia tra ${formatCountdown(goal.secondsLeft)}.` };
  }
  if (goal.kind === "academy") {
    return {
      title: "Torneo Accademico",
      text: `Vinci un titolo all'Accademico, in Arena o in Stile. Il prossimo inizia tra ${formatCountdown(goal.secondsLeft)}.`,
    };
  }
  return {
    title: "Collaboratori delle Onde",
    text: `Servono ${goal.target} Collaboratori delle Onde. Ne abbiamo ${goal.value}.`,
  };
}
