import { TOURNAMENT_DEFINITIONS, TOURNAMENT_LEVEL_ORDER } from "../../content/tournaments";
import { GAME_CONFIG } from "../../game/config";
import { getTournamentSeason } from "../../game/tournamentFlow";
import {
  getEligibleSchoolContactsFromRoster,
} from "../../game/tournamentSimulation";
import type {
  GameState,
  TournamentLevel,
  TournamentMatch,
  TournamentParticipant,
  TournamentResult,
} from "../../game/types";

export type TournamentTab = "overview" | "results" | "hall" | "chronicles";

export const levelShortLabel: Record<TournamentLevel, string> = {
  school: "Scolastico",
  academy: "Accademico",
  national: "Nazionale",
  champions: "Champion's",
  chronicles: "Chronicles",
};

export const monthShortLabel: Record<number, string> = {
  4: "APR",
  6: "GIU",
  11: "NOV",
  12: "DIC",
};

export const knockoutStageLabel: Partial<Record<TournamentMatch["stage"], string>> = {
  round64: "Trentaduesimi",
  round32: "Sedicesimi",
  round16: "Ottavi",
  quarterfinal: "Quarti",
  semifinal: "Semifinali",
  bronze: "Finale 3° posto",
  final: "Finale",
};

export function participantName(participant: TournamentParticipant | undefined): string {
  return participant ? `${participant.firstName} ${participant.lastName}` : "—";
}

export function getCalendarMonth(absoluteMonth: number): number {
  return ((Math.max(1, absoluteMonth) - 1) % 12) + 1;
}

export interface UpcomingTournament {
  level: TournamentLevel;
  season: number;
  absoluteMonth: number;
  occursAt: number;
}

export function findUpcomingTournament(state: GameState): UpcomingTournament | undefined {
  return findUpcomingTournamentFromSchedule(state.school, state.tournaments);
}

export function findUpcomingTournamentFromSchedule(
  school: Pick<GameState["school"], "currentMonth" | "nextFeeAt">,
  tournaments: Pick<
    GameState["tournaments"],
    "qualification" | "results" | "missedTournaments"
  >,
): UpcomingTournament | undefined {
  for (let offset = 0; offset < 24; offset += 1) {
    const absoluteMonth = school.currentMonth + offset;
    const calendarMonth = getCalendarMonth(absoluteMonth);
    const level = TOURNAMENT_LEVEL_ORDER.find(
      (candidate) => TOURNAMENT_DEFINITIONS[candidate].calendarMonth === calendarMonth,
    );
    if (!level) continue;
    const season = getTournamentSeason(level, absoluteMonth);
    const qualification = tournaments.qualification;
    const canEnter = level === "school" || (
      qualification?.level === level && qualification.season === season
    );
    if (!canEnter) continue;
    const alreadyProcessed = tournaments.results.some(
      (result) => result.level === level && result.season === season,
    ) || tournaments.missedTournaments.some(
      (entry) => entry.level === level && entry.season === season,
    );
    if (alreadyProcessed) continue;
    return {
      level,
      season,
      absoluteMonth,
      occursAt: school.nextFeeAt + offset * GAME_CONFIG.gameMonthMs,
    };
  }
  return undefined;
}

export function getUpcomingDelegationContactIds(
  state: GameState,
  upcoming = findUpcomingTournament(state),
): string[] {
  return getUpcomingDelegationContactIdsFromRoster(
    state.contacts,
    state.collaborators,
    state.tournaments.qualification,
    upcoming,
  );
}

export function getUpcomingDelegationContactIdsFromRoster(
  contacts: GameState["contacts"],
  collaborators: GameState["collaborators"],
  qualification: GameState["tournaments"]["qualification"],
  upcoming: UpcomingTournament | undefined,
): string[] {
  if (!upcoming) return [];
  if (upcoming.level === "school") {
    return getEligibleSchoolContactsFromRoster(contacts, collaborators)
      .slice(0, GAME_CONFIG.tournamentMinimumMembers)
      .map((contact) => contact.id);
  }
  if (qualification?.level !== upcoming.level || qualification.season !== upcoming.season) return [];
  return qualification.contactIds;
}

export function formatTournamentCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}g ${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m`;
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  return `${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
}

export function getResultForLevelAndSeason(
  results: readonly TournamentResult[],
  level: TournamentLevel,
  season: number,
): TournamentResult | undefined {
  for (let index = results.length - 1; index >= 0; index -= 1) {
    if (results[index].level === level && results[index].season === season) return results[index];
  }
  return undefined;
}
