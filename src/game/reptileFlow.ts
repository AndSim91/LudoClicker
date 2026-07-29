import { getContactBaseStats } from "./athleteStats";
import { getSchoolYear } from "./calendar";
import { applyEquipmentWear } from "./equipment";
import { simulateReptileTournament } from "./reptileSimulation";
import { resolveSecretLegendaryDefeat } from "./tournamentFlow";
import { addMessage } from "./stateUpdates";
import type {
  GameState,
  ReptileTeam,
  ReptileTournamentResult,
} from "./types";

export function getReptilePresentationStepCount(result: ReptileTournamentResult): number {
  // Quattro intermezzi, turni svizzeri, classifica, quattro schermate KO e recap.
  return 4 + result.swissRounds + 1 + 4 + 1;
}

export function startReptileTournamentIfDue(state: GameState, now: number): GameState {
  const edition = state.tournaments.reptile.activeEdition;
  if (
    !edition ||
    edition.status !== "booked" ||
    edition.scheduledMonth !== state.school.currentMonth
  ) return state;
  const simulation = simulateReptileTournament(state, now);
  if (!simulation) return state;
  return {
    ...state,
    randomSeed: simulation.nextSeed,
    tournaments: {
      ...state.tournaments,
      reptile: {
        ...state.tournaments.reptile,
        activeEdition: {
          ...edition,
          status: "presenting",
          result: simulation.result,
          presentationStep: 0,
        },
      },
    },
  };
}

export function processReptileCalendarTransition(state: GameState, now: number): GameState {
  return startReptileTournamentIfDue(state, now);
}

function getHomeAthleteBonusByContactId(
  result: ReptileTournamentResult,
): Map<string, number> {
  const bonuses = new Map<string, number>();
  const teamsById = new Map(result.teams.map((team) => [team.id, team]));
  const award = (teamId: string, bonus: number) => {
    const team = teamsById.get(teamId);
    if (!team?.home) return;
    for (const athlete of team.athletes) {
      if (!athlete.ownedContactId) continue;
      bonuses.set(athlete.ownedContactId, Math.max(bonuses.get(athlete.ownedContactId) ?? 0, bonus));
    }
  };
  result.top16TeamIds.forEach((teamId) => award(teamId, 1));
  award(result.podiumTeamIds[3], 2);
  award(result.podiumTeamIds[2], 3);
  award(result.podiumTeamIds[1], 4);
  award(result.podiumTeamIds[0], 5);
  return bonuses;
}

function getDefeatedSecretLegendaryIds(result: ReptileTournamentResult): string[] {
  const teamsById = new Map(result.teams.map((team) => [team.id, team]));
  const defeated = new Set<string>();
  for (const match of result.matches) {
    const winner = teamsById.get(match.winnerId);
    if (!winner?.home) continue;
    const loserId = match.winnerId === match.teamAId ? match.teamBId : match.teamAId;
    for (const athlete of teamsById.get(loserId)?.athletes ?? []) {
      if (athlete.secretLegendaryId) defeated.add(athlete.secretLegendaryId);
    }
  }
  return [...defeated];
}

function applyReptileResult(
  state: GameState,
  result: ReptileTournamentResult,
  now: number,
): GameState {
  if (result.rewardsApplied) return state;
  const bonuses = getHomeAthleteBonusByContactId(result);
  const participatingHomeIds = new Set(
    result.teams.filter((team) => team.home).flatMap((team) =>
      team.athletes.flatMap((athlete) => athlete.ownedContactId ? [athlete.ownedContactId] : []),
    ),
  );
  const winner = result.teams.find((team) => team.id === result.podiumTeamIds[0])!;
  const schoolWon = winner.home;
  const appliedResult: ReptileTournamentResult = {
    ...result,
    rewardsApplied: true,
  };
  let nextState: GameState = {
    ...state,
    contacts: state.contacts.map((contact) => {
      const bonus = bonuses.get(contact.id) ?? 0;
      if (!participatingHomeIds.has(contact.id) && bonus <= 0) return contact;
      const base = getContactBaseStats(contact);
      return {
        ...contact,
        arenaBase: base.arena + bonus,
        styleBase: base.style + bonus,
        tournamentExperience: (contact.tournamentExperience ?? 0) +
          (participatingHomeIds.has(contact.id) ? 1 : 0),
      };
    }),
    school: {
      ...state.school,
      euros: state.school.euros + result.economy.gadgetGross - result.economy.rentalCost,
      followers: state.school.followers + result.economy.followersGained,
    },
    equipment: applyEquipmentWear(
      state.equipment,
      result.economy.swordWear,
      result.economy.usedSchoolSwords,
    ),
    statistics: {
      ...state.statistics,
      eurosEarned: state.statistics.eurosEarned + result.economy.gadgetGross,
      socialFollowersGained:
        state.statistics.socialFollowersGained + result.economy.followersGained,
      eventsCompleted: state.statistics.eventsCompleted + 1,
    },
    tournaments: {
      ...state.tournaments,
      reptile: {
        ...state.tournaments.reptile,
        fameXp: result.economy.fameAfter,
        victories: state.tournaments.reptile.victories + (schoolWon ? 1 : 0),
        nextPreparationSchoolYear: getSchoolYear(state.school.currentMonth) + 1,
        activeEdition: undefined,
        latestRecap: appliedResult,
        hall: [...state.tournaments.reptile.hall, {
          schoolYear: result.schoolYear,
          teamId: winner.id,
          schoolName: winner.schoolName,
          athleteNames: winner.athletes.map(
            (athlete) => `${athlete.firstName} ${athlete.lastName}`,
          ) as [string, string],
        }],
      },
    },
  };
  for (const id of getDefeatedSecretLegendaryIds(result)) {
    nextState = resolveSecretLegendaryDefeat(nextState, id as Parameters<typeof resolveSecretLegendaryDefeat>[1], now);
  }
  return addMessage(
    nextState,
    now,
    "Torneo Reptile completato",
    `${result.teamCount} team partecipanti · ${result.economy.followersGained} nuovi follower · variazione fama ${result.economy.fameDelta >= 0 ? "+" : ""}${result.economy.fameDelta}.`,
    schoolWon ? "positive" : "neutral",
    "focused",
    "tournaments",
  );
}

export function advanceReptilePresentation(state: GameState, now: number): GameState {
  const edition = state.tournaments.reptile.activeEdition;
  const result = edition?.result;
  if (!edition || edition.status !== "presenting" || !result) return state;
  if (edition.presentationStep + 1 < getReptilePresentationStepCount(result)) {
    return {
      ...state,
      tournaments: {
        ...state.tournaments,
        reptile: {
          ...state.tournaments.reptile,
          activeEdition: { ...edition, presentationStep: edition.presentationStep + 1 },
        },
      },
    };
  }
  return applyReptileResult(state, result, now);
}

export function skipReptilePresentation(state: GameState, now: number): GameState {
  const edition = state.tournaments.reptile.activeEdition;
  if (!edition || edition.status !== "presenting" || !edition.result) return state;
  return applyReptileResult(state, edition.result, now);
}

export function getReptileWinner(result: ReptileTournamentResult): ReptileTeam {
  return result.teams.find((team) => team.id === result.podiumTeamIds[0])!;
}
