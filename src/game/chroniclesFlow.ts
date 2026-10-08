import { addLegendaryEncounter, addLegendaryEnrollment } from "./contacts";
import {
  SECRET_LEGENDARIES,
  getChroniclesLegendaryIds,
} from "../content/secretLegendaries";
import { recruitCollaborator } from "./collaboratorFlow";
import { GAME_CONFIG } from "./config";
import { nextRandom } from "./random";
import { createSecretLegendaryContact } from "./secretLegendaryRoster";
import { addMessage } from "./stateUpdates";
import type {
  ChroniclesChallenge,
  GameState,
  RockPaperScissorsChoice,
  SecretLegendaryId,
  TournamentDiscipline,
  TournamentResult,
} from "./types";

const CHOICES: readonly RockPaperScissorsChoice[] = ["rock", "paper", "scissors"];

function schoolWon(
  result: TournamentResult,
  discipline: TournamentDiscipline,
): boolean {
  const ranking = discipline === "arena" ? result.arenaRanking : result.styleRanking;
  const winner = result.participants.find((participant) => participant.id === ranking[0]);
  return Boolean(winner?.ownedContactId);
}

function selectNextLegendary(
  state: GameState,
): { id?: SecretLegendaryId; randomSeed: number } {
  const available = getChroniclesLegendaryIds()
    .filter((id) => state.network.secretLegendaries[id]?.status === "external")
    .map((id) => ({
      id,
      strength: (SECRET_LEGENDARIES[id].tournament[0] + SECRET_LEGENDARIES[id].tournament[1]) / 2,
    }))
    .sort((left, right) => left.strength - right.strength);
  if (available.length === 0) return { randomSeed: state.randomSeed };
  const weakestBand = available.filter(
    (candidate) => candidate.strength <= available[0].strength + 1,
  );
  const [roll, randomSeed] = nextRandom(state.randomSeed);
  return {
    id: weakestBand[Math.floor(roll * weakestBand.length)].id,
    randomSeed,
  };
}

function createChallenge(
  state: GameState,
  tournamentResultId: string,
  disciplines: readonly TournamentDiscipline[],
  legendaryId?: SecretLegendaryId,
): GameState {
  if (disciplines.length === 0) {
    return {
      ...state,
      tournaments: {
        ...state.tournaments,
        chronicles: { ...state.tournaments.chronicles, activeChallenge: undefined },
      },
    };
  }
  const selected = legendaryId
    ? { id: legendaryId, randomSeed: state.randomSeed }
    : selectNextLegendary(state);
  if (!selected.id) {
    return {
      ...state,
      randomSeed: selected.randomSeed,
      tournaments: {
        ...state.tournaments,
        chronicles: { ...state.tournaments.chronicles, activeChallenge: undefined },
      },
    };
  }
  const activeChallenge: ChroniclesChallenge = {
    legendaryId: selected.id,
    tournamentResultId,
    discipline: disciplines[0],
    queuedDisciplines: [...disciplines.slice(1)],
    playerWins: 0,
    legendaryWins: 0,
    hands: [],
  };
  return {
    ...state,
    randomSeed: selected.randomSeed,
    legendaryCollaborators: {
      ...state.legendaryCollaborators,
      encounteredProfileIds: [...new Set([
        ...state.legendaryCollaborators.encounteredProfileIds,
        selected.id,
      ])],
    },
    tournaments: {
      ...state.tournaments,
      chronicles: { ...state.tournaments.chronicles, activeChallenge },
    },
  };
}

export function createChroniclesVictoryChallenge(
  state: GameState,
  result: TournamentResult,
  now: number,
): GameState {
  if (result.level !== "chronicles") return state;
  const disciplines = (["arena", "style"] as const).filter((discipline) =>
    schoolWon(result, discipline)
  );
  if (disciplines.length === 0) return state;
  const challenged = createChallenge(state, result.id, disciplines);
  const active = challenged.tournaments.chronicles.activeChallenge;
  if (!active) return challenged;
  const profile = SECRET_LEGENDARIES[active.legendaryId];
  return addMessage(
    challenged,
    now,
    `Sfida a ${profile.firstName} ${profile.lastName}`,
    `${disciplines.length === 2 ? "Arena e Stile vinte" : disciplines[0] === "arena" ? "Arena vinta" : "Stile vinto"} nelle Chronicles: ${disciplines.length === 1 ? "un tentativo" : "due tentativi"}, al meglio delle tre, per convincerlo a venire a scuola.`,
    "positive",
    "focused",
    "tournaments",
  );
}

function handOutcome(
  player: RockPaperScissorsChoice,
  legendary: RockPaperScissorsChoice,
): "player" | "legendary" | "draw" {
  if (player === legendary) return "draw";
  if (
    (player === "rock" && legendary === "scissors") ||
    (player === "paper" && legendary === "rock") ||
    (player === "scissors" && legendary === "paper")
  ) return "player";
  return "legendary";
}

function enrollLegendary(
  state: GameState,
  id: SecretLegendaryId,
  now: number,
): GameState {
  const existing = state.contacts.find((contact) => contact.secretLegendaryId === id);
  if (existing?.status === "enrolled") return state;
  const contact = {
    ...createSecretLegendaryContact(state, id, now, "enrolled"),
    enrolledMonth: state.school.currentMonth,
  };
  const activeMembers = state.school.activeMembers + 1;
  const progress = state.network.secretLegendaries[id] ?? {
    status: "external" as const,
    defeats: 0,
    failedTrials: 0,
  };
  const enrolled: GameState = {
    ...state,
    contacts: existing
      ? state.contacts.map((candidate) => candidate.id === existing.id ? contact : candidate)
      : [...state.contacts, contact],
    school: {
      ...state.school,
      activeMembers,
      peakActiveMembers: Math.max(state.school.peakActiveMembers, activeMembers),
      fame:
        state.school.fame + 1 + GAME_CONFIG.chroniclesLegendaryFameReward,
    },
    unlocks: {
      ...state.unlocks,
      upgrades: true,
      collaborators: true,
    },
    statistics: {
      ...state.statistics,
      contactsAcquired: state.statistics.contactsAcquired + (existing ? 0 : 1),
      membersEnrolled: state.statistics.membersEnrolled + 1,
    },
    legendaryCollaborators: addLegendaryEnrollment(
      addLegendaryEncounter(state.legendaryCollaborators, id),
      id,
    ),
    network: {
      ...state.network,
      secretLegendaries: {
        ...state.network.secretLegendaries,
        [id]: { ...progress, status: "enrolled", enrolledContactId: contact.id },
      },
    },
  };
  return recruitCollaborator(enrolled, contact, now);
}

export function playChroniclesHand(
  state: GameState,
  choice: RockPaperScissorsChoice,
  now: number,
): GameState {
  const challenge = state.tournaments.chronicles.activeChallenge;
  if (!challenge || !CHOICES.includes(choice)) return state;
  const [roll, randomSeed] = nextRandom(state.randomSeed);
  const legendaryChoice = CHOICES[Math.floor(roll * CHOICES.length)];
  const outcome = handOutcome(choice, legendaryChoice);
  const playerWins = challenge.playerWins + (outcome === "player" ? 1 : 0);
  const legendaryWins = challenge.legendaryWins + (outcome === "legendary" ? 1 : 0);
  const updatedChallenge: ChroniclesChallenge = {
    ...challenge,
    playerWins,
    legendaryWins,
    hands: [...challenge.hands, { playerChoice: choice, legendaryChoice, outcome }],
  };
  let nextState: GameState = {
    ...state,
    randomSeed,
    tournaments: {
      ...state.tournaments,
      chronicles: { ...state.tournaments.chronicles, activeChallenge: updatedChallenge },
    },
  };
  if (playerWins < 2 && legendaryWins < 2) return nextState;

  const queued = challenge.queuedDisciplines;
  const profile = SECRET_LEGENDARIES[challenge.legendaryId];
  if (playerWins >= 2) {
    nextState = enrollLegendary(nextState, challenge.legendaryId, now);
    nextState = createChallenge(nextState, challenge.tournamentResultId, queued);
    return addMessage(
      nextState,
      now,
      `${profile.firstName} ${profile.lastName} entra nella scuola`,
      `Sfida vinta, +${GAME_CONFIG.chroniclesLegendaryFameReward} Fama. Da oggi è atleta e collaboratore, per sempre.`,
      "positive",
      "focused",
      "tournaments",
    );
  }

  nextState = createChallenge(
    nextState,
    challenge.tournamentResultId,
    queued,
    queued.length > 0 ? challenge.legendaryId : undefined,
  );
  return addMessage(
    nextState,
    now,
    queued.length > 0
      ? `${profile.firstName} ${profile.lastName}: secondo tentativo`
      : `${profile.firstName} ${profile.lastName} resta indipendente`,
    queued.length > 0
      ? "Persa la prima. La seconda vittoria nelle Chronicles vale un'altra mano, subito."
      : "Tentativi finiti. Ci si rivede alle prossime Chronicles.",
    queued.length > 0 ? "positive" : "neutral",
    "focused",
    "tournaments",
  );
}
