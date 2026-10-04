import { addCareer } from "./career";
import { getContactBaseStats } from "./athleteStats";
import { getCalendarMonth } from "./calendar";
import { applyEquipmentWear } from "./equipment";
import {
  getReptileFameLevel,
  isJuly,
  isReptilePreparationComplete,
  processReptilePreparation,
} from "./reptilePreparation";
import { simulateReptileTournament } from "./reptileSimulation";
import { discoverCourseXFromSuperbaVictory, getReptileTournamentName, SUPERBA_COPY } from "./reptileUnlock";
import { GAME_CONFIG } from "./config";
import { resolveSecretLegendaryDefeat } from "./tournamentFlow";
import { addMessage } from "./stateUpdates";
import type {
  GameState,
  ReptileTeam,
  ReptileTournamentResult,
} from "./types";

/** All bars full, it is July and no Reptile was held this July: the tournament runs. */
export function holdReptileTournamentIfDue(state: GameState, now: number): GameState {
  const reptile = state.tournaments.reptile;
  const edition = reptile.activeEdition;
  if (
    !edition ||
    !isReptilePreparationComplete(edition) ||
    !isJuly(state.school.currentMonth) ||
    reptile.lastTournamentMonth === state.school.currentMonth
  ) return state;
  const simulation = simulateReptileTournament(state, now);
  if (!simulation) return state;
  return applyReptileResult({ ...state, randomSeed: simulation.nextSeed }, simulation.result, now);
}

/** One tick of Reptile: bars fill, then the tournament if it is due. */
export function processReptile(state: GameState, now: number): GameState {
  return holdReptileTournamentIfDue(processReptilePreparation(state, now), now);
}

export function processReptileCalendarTransition(state: GameState, now: number): GameState {
  const edition = state.tournaments.reptile.activeEdition;
  let nextState = state;
  if (
    edition &&
    edition.minigame.status === "ready" &&
    !edition.juneReminderSent &&
    getCalendarMonth(state.school.currentMonth) === 6
  ) {
    nextState = addMessage({
      ...state,
      tournaments: {
        ...state.tournaments,
        reptile: {
          ...state.tournaments.reptile,
          activeEdition: { ...edition, juneReminderSent: true },
        },
      },
    }, now, "La giornata degli imprevisti aspetta", `A luglio c'è il ${getReptileTournamentName(state)} e il palazzetto non si gestisce da solo: hai ancora un tentativo per alzare la resa.`, "neutral", "focused", "tournaments");
  }
  return holdReptileTournamentIfDue(nextState, now);
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

export function applyReptileResult(
  state: GameState,
  result: ReptileTournamentResult,
  now: number,
): GameState {
  const bonuses = getHomeAthleteBonusByContactId(result);
  const participatingHomeIds = new Set(
    result.teams.filter((team) => team.home).flatMap((team) =>
      team.athletes.flatMap((athlete) => athlete.ownedContactId ? [athlete.ownedContactId] : []),
    ),
  );
  const winner = result.teams.find((team) => team.id === result.podiumTeamIds[0])!;
  const schoolWon = winner.home;
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
      euros: state.school.euros + result.economy.gadgetGross,
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
        lastTournamentMonth: state.school.currentMonth,
        activeEdition: undefined,
        latestRecap: result,
        unseenRecap: true,
        hall: [...state.tournaments.reptile.hall, {
          schoolYear: result.schoolYear,
          teamId: winner.id,
          schoolName: winner.schoolName,
          athleteNames: winner.athletes.map(
            (athlete) => `${athlete.firstName} ${athlete.lastName}`,
          ) as [string, string],
          ...(result.superba ? { superba: true } : {}),
        }],
      },
    },
  };
  nextState = addCareer(nextState, { reptileWins: schoolWon ? 1 : 0 });
  for (const id of getDefeatedSecretLegendaryIds(result)) {
    nextState = resolveSecretLegendaryDefeat(nextState, id as Parameters<typeof resolveSecretLegendaryDefeat>[1], now);
  }
  const tournamentName = result.superba ? "Torneo della Superba" : "Torneo Reptile";
  nextState = addMessage(
    nextState,
    now,
    `${tournamentName} completato`,
    `${result.teamCount} squadre si sono sfidate nelle nostre arene. Resa ${result.resa}, +${result.economy.followersGained} follower, Fama ${result.economy.fameDelta >= 0 ? "+" : ""}${result.economy.fameDelta}.${result.economy.missingSwords > 0 ? ` Mancavano ${result.economy.missingSwords} spade: si è visto.` : ""}`,
    schoolWon ? "positive" : "neutral",
    "focused",
    "tournaments",
  );
  if (result.superba && schoolWon) nextState = discoverCourseXFromSuperbaVictory(nextState, now);
  // Enough Reptile fame turns the Open, for good, into the Torneo della Superba.
  if (
    !nextState.network.superbaTournament &&
    getReptileFameLevel(result.economy.fameAfter) >= GAME_CONFIG.superbaReptileFameLevel
  ) {
    nextState = addMessage(
      { ...nextState, network: { ...nextState.network, superbaTournament: true } },
      now,
      SUPERBA_COPY.title,
      SUPERBA_COPY.body,
      "positive",
      "focused",
      "tournaments",
    );
  }
  return nextState;
}

export function dismissReptileRecap(state: GameState): GameState {
  if (!state.tournaments.reptile.unseenRecap) return state;
  return {
    ...state,
    tournaments: {
      ...state.tournaments,
      reptile: { ...state.tournaments.reptile, unseenRecap: false },
    },
  };
}

export function getReptileWinner(result: ReptileTournamentResult): ReptileTeam {
  return result.teams.find((team) => team.id === result.podiumTeamIds[0])!;
}
