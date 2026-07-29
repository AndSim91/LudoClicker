import { getAthleteTournamentStats, hasCompletedFormOne } from "./athleteStats";
import { ARENA_DECISIVENESS, createChampionsOpenAthletePairs } from "./tournamentSimulation";
import { getAvailableSwords } from "./equipment";
import { GAME_CONFIG } from "./config";
import { nextRandom } from "./random";
import type {
  Contact,
  GameState,
  ReptileAthlete,
  ReptileKnockoutStage,
  ReptileMatch,
  ReptileSector,
  ReptileStanding,
  ReptileTeam,
  ReptileTournamentResult,
  TournamentParticipant,
} from "./types";

interface RandomCursor {
  seed: number;
}

interface MutableStanding {
  teamId: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  opponents: string[];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function roll(cursor: RandomCursor): number {
  const [value, nextSeed] = nextRandom(cursor.seed);
  cursor.seed = nextSeed;
  return value;
}

function shuffle<T>(cursor: RandomCursor, values: readonly T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(roll(cursor) * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function triangularCondition(cursor: RandomCursor): number {
  return (0.7 + roll(cursor) * 0.6 + (0.7 + roll(cursor) * 0.6)) / 2;
}

function conditionMultiplier(condition: number): number {
  return 0.7 + 0.3 * condition;
}

function toHomeAthlete(contact: Contact): ReptileAthlete {
  const stats = getAthleteTournamentStats(contact);
  return {
    id: `reptile-athlete-${contact.id}`,
    ownedContactId: contact.id,
    secretLegendaryId: contact.secretLegendaryId,
    firstName: contact.firstName,
    lastName: contact.lastName,
    rarity: contact.rarity,
    arena: stats.arena,
    style: stats.style,
  };
}

function toExternalAthlete(
  participant: TournamentParticipant,
  difficultyMultiplier: number,
): ReptileAthlete {
  return {
    id: `reptile-${participant.id}`,
    secretLegendaryId: participant.secretLegendaryId,
    firstName: participant.firstName,
    lastName: participant.lastName,
    rarity: participant.rarity,
    arena: participant.arenaPreparation * difficultyMultiplier,
    style: participant.stylePreparation * difficultyMultiplier,
  };
}

function createTeam(
  id: string,
  schoolName: string,
  city: string,
  home: boolean,
  athletes: [ReptileAthlete, ReptileAthlete],
  cursor: RandomCursor,
  schoolId?: ReptileTeam["schoolId"],
  specialized = false,
): ReptileTeam {
  let arena = (athletes[0].arena + athletes[1].arena) / 2;
  let style = (athletes[0].style + athletes[1].style) / 2;
  if (specialized) {
    if (roll(cursor) < 0.5) {
      arena *= 1.15;
      style *= 0.85;
    } else {
      arena *= 0.85;
      style *= 1.15;
    }
  }
  return {
    id,
    schoolId,
    schoolName,
    city,
    home,
    athletes,
    arena,
    style,
    condition: triangularCondition(cursor),
    tieBreaker: roll(cursor),
  };
}

function selectHomeContacts(
  eligible: readonly Contact[],
  count: number,
  eventsQuality: number,
  cursor: RandomCursor,
): Contact[] {
  const ranked = [...eligible].sort((a, b) => {
    const statsA = getAthleteTournamentStats(a);
    const statsB = getAthleteTournamentStats(b);
    return (statsB.arena + statsB.style) - (statsA.arena + statsA.style);
  });
  if (eventsQuality >= 100) return ranked.slice(0, count);
  const remaining = [...ranked];
  const selected: Contact[] = [];
  while (selected.length < count && remaining.length > 0) {
    const quality = clamp(eventsQuality, 0, 100) / 100;
    const weights = remaining.map((contact) => {
      const rank = ranked.indexOf(contact);
      const strength = ranked.length <= 1 ? 1 : 1 - rank / (ranked.length - 1);
      return 1 + quality * strength * 9;
    });
    const totalWeight = weights.reduce((total, weight) => total + weight, 0);
    let target = roll(cursor) * totalWeight;
    let selectedIndex = 0;
    for (let index = 0; index < weights.length; index += 1) {
      target -= weights[index];
      if (target <= 0) {
        selectedIndex = index;
        break;
      }
    }
    selected.push(remaining.splice(selectedIndex, 1)[0]);
  }
  return selected;
}

function perturbCloseRanks(values: Contact[], cursor: RandomCursor): Contact[] {
  const result = [...values];
  for (let index = 0; index + 1 < result.length; index += 2) {
    if (roll(cursor) < 0.5) [result[index], result[index + 1]] = [result[index + 1], result[index]];
  }
  return result;
}

function createHomeTeams(
  state: GameState,
  homeTeamCount: number,
  eventsQuality: number,
  cursor: RandomCursor,
): ReptileTeam[] {
  const eligible = state.contacts.filter(
    (contact) => contact.status === "enrolled" && hasCompletedFormOne(contact.forms),
  );
  const selected = selectHomeContacts(eligible, homeTeamCount * 2, eventsQuality, cursor)
    .sort((a, b) => {
      const statsA = getAthleteTournamentStats(a);
      const statsB = getAthleteTournamentStats(b);
      return (statsB.arena + statsB.style) - (statsA.arena + statsA.style);
    });
  const half = Math.floor(selected.length / 2);
  const strongest = perturbCloseRanks(selected.slice(0, half), cursor);
  const weakest = perturbCloseRanks(selected.slice(half).reverse(), cursor);
  return strongest.map((contact, index) => createTeam(
    `reptile-home-${index}-${cursor.seed >>> 0}`,
    state.school.name,
    state.school.city,
    true,
    [toHomeAthlete(contact), toHomeAthlete(weakest[index])],
    cursor,
  ));
}

function createExternalTeams(
  state: GameState,
  count: number,
  cursor: RandomCursor,
): ReptileTeam[] {
  if (count <= 0) return [];
  const generated = createChampionsOpenAthletePairs(state, count, cursor.seed);
  cursor.seed = generated.nextSeed;
  const difficultyMultiplier = 1.1 ** state.tournaments.reptile.victories;
  const teams: ReptileTeam[] = [];
  for (let index = 0; index < count; index += 1) {
    const [first, second] = generated.pairs[index];
    teams.push(createTeam(
      `reptile-external-${index}-${cursor.seed >>> 0}`,
      first.schoolName,
      first.city,
      false,
      [
        toExternalAthlete(first, difficultyMultiplier),
        toExternalAthlete(second, difficultyMultiplier),
      ],
      cursor,
      first.schoolId,
      true,
    ));
  }
  return teams;
}

function simulateMatch(
  teamA: ReptileTeam,
  teamB: ReptileTeam,
  phase: ReptileMatch["phase"],
  round: number,
  cursor: RandomCursor,
  index: number,
): ReptileMatch {
  const combinedA = (teamA.arena + teamA.style) / 2;
  const combinedB = (teamB.arena + teamB.style) / 2;
  let scoreA = 0;
  let scoreB = 0;
  while (scoreA < 3 && scoreB < 3) {
    const poweredA = (combinedA * (0.95 + roll(cursor) * 0.1)) ** ARENA_DECISIVENESS *
      conditionMultiplier(teamA.condition);
    const poweredB = (combinedB * (0.95 + roll(cursor) * 0.1)) ** ARENA_DECISIVENESS *
      conditionMultiplier(teamB.condition);
    const chanceA = clamp(poweredA / (poweredA + poweredB), 0.05, 0.95);
    if (roll(cursor) < chanceA) scoreA += 1;
    else scoreB += 1;
  }
  return {
    id: `reptile-match-${phase}-${round}-${index}-${cursor.seed >>> 0}`,
    phase,
    round,
    teamAId: teamA.id,
    teamBId: teamB.id,
    scoreA,
    scoreB,
    winnerId: scoreA === 3 ? teamA.id : teamB.id,
  };
}

function pairSwissRound(
  teams: readonly ReptileTeam[],
  standings: Map<string, MutableStanding>,
  played: ReadonlySet<string>,
  cursor: RandomCursor,
  firstRound: boolean,
): [ReptileTeam, ReptileTeam][] {
  const ordered = firstRound
    ? shuffle(cursor, teams)
    : [...teams].sort((a, b) => {
        const standingA = standings.get(a.id)!;
        const standingB = standings.get(b.id)!;
        return standingB.wins - standingA.wins ||
          (standingB.pointsFor - standingB.pointsAgainst) -
            (standingA.pointsFor - standingA.pointsAgainst) ||
          b.tieBreaker - a.tieBreaker;
      });
  const candidatePenalty = (first: ReptileTeam, candidate: ReptileTeam) => {
      const sameSchool = first.schoolName === candidate.schoolName && first.city === candidate.city;
      const recordDifference = Math.abs(
        standings.get(first.id)!.wins - standings.get(candidate.id)!.wins,
      );
      const pointDifference = Math.abs(
        (standings.get(first.id)!.pointsFor - standings.get(first.id)!.pointsAgainst) -
          (standings.get(candidate.id)!.pointsFor - standings.get(candidate.id)!.pointsAgainst),
      );
      return (firstRound ? (sameSchool ? 100_000 : 0) : recordDifference * 100_000) +
        (!firstRound && sameSchool ? 10_000 : 0) + pointDifference;
  };

  const pairWithoutRematches = (
    remaining: readonly ReptileTeam[],
  ): [ReptileTeam, ReptileTeam][] | undefined => {
    if (remaining.length === 0) return [];
    const first = remaining[0];
    const candidates = remaining.slice(1)
      .filter((candidate) => !played.has([first.id, candidate.id].sort().join("|")))
      .sort((a, b) => candidatePenalty(first, a) - candidatePenalty(first, b));
    for (const candidate of candidates) {
      const tail = remaining.filter((team) => team !== first && team !== candidate);
      const pairedTail = pairWithoutRematches(tail);
      if (pairedTail) return [[first, candidate], ...pairedTail];
    }
    return undefined;
  };

  const rematchFree = pairWithoutRematches(ordered);
  if (rematchFree) return rematchFree;

  const remaining = [...ordered];
  const fallbackPairs: [ReptileTeam, ReptileTeam][] = [];
  while (remaining.length >= 2) {
    const first = remaining.shift()!;
    let bestIndex = 0;
    let bestPenalty = Infinity;
    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const rematchPenalty = played.has([first.id, candidate.id].sort().join("|"))
        ? 1_000_000
        : 0;
      const penalty = rematchPenalty + candidatePenalty(first, candidate);
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        bestIndex = index;
      }
    }
    fallbackPairs.push([first, remaining.splice(bestIndex, 1)[0]]);
  }
  return fallbackPairs;
}

function compareFinalStandings(
  a: MutableStanding,
  b: MutableStanding,
  standings: ReadonlyMap<string, MutableStanding>,
  directWinner: ReadonlyMap<string, string>,
  teamsById: ReadonlyMap<string, ReptileTeam>,
): number {
  const buchholzA = a.opponents.reduce((total, id) => total + standings.get(id)!.wins, 0);
  const buchholzB = b.opponents.reduce((total, id) => total + standings.get(id)!.wins, 0);
  const direct = directWinner.get([a.teamId, b.teamId].sort().join("|"));
  return b.wins - a.wins ||
    buchholzB - buchholzA ||
    (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst) ||
    (direct === a.teamId ? -1 : direct === b.teamId ? 1 : 0) ||
    teamsById.get(b.teamId)!.tieBreaker - teamsById.get(a.teamId)!.tieBreaker;
}

function buildStandings(
  mutable: ReadonlyMap<string, MutableStanding>,
  directWinner: ReadonlyMap<string, string>,
  teamsById: ReadonlyMap<string, ReptileTeam>,
): ReptileStanding[] {
  return [...mutable.values()]
    .sort((a, b) => compareFinalStandings(a, b, mutable, directWinner, teamsById))
    .map((entry, index) => ({
      rank: index + 1,
      teamId: entry.teamId,
      wins: entry.wins,
      losses: entry.losses,
      pointsFor: entry.pointsFor,
      pointsAgainst: entry.pointsAgainst,
      opponentsWins: entry.opponents.reduce((total, id) => total + mutable.get(id)!.wins, 0),
      qualified: index < 16,
    }));
}

const BRACKET_SEED_ORDER = [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11];

function playKnockoutRound(
  ids: readonly string[],
  stage: ReptileKnockoutStage,
  round: number,
  teamsById: ReadonlyMap<string, ReptileTeam>,
  cursor: RandomCursor,
  matches: ReptileMatch[],
): { winners: string[]; losers: string[] } {
  const winners: string[] = [];
  const losers: string[] = [];
  for (let index = 0; index < ids.length; index += 2) {
    const teamA = teamsById.get(ids[index])!;
    const teamB = teamsById.get(ids[index + 1])!;
    const match = simulateMatch(teamA, teamB, stage, round, cursor, matches.length);
    matches.push(match);
    winners.push(match.winnerId);
    losers.push(match.winnerId === teamA.id ? teamB.id : teamA.id);
  }
  return { winners, losers };
}

export function simulateReptileTournament(
  state: GameState,
  now: number,
): { result: ReptileTournamentResult; nextSeed: number } | undefined {
  const edition = state.tournaments.reptile.activeEdition;
  if (!edition || edition.status !== "booked" || !edition.sectors) return undefined;
  const cursor: RandomCursor = { seed: state.randomSeed };
  const qualities = Object.fromEntries(
    (["social", "equipment", "gadget", "events"] as const)
      .map((sector) => [sector, edition.sectors![sector].quality]),
  ) as Record<ReptileSector, number>;
  const eligibleCount = state.contacts.filter(
    (contact) => contact.status === "enrolled" && hasCompletedFormOne(contact.forms),
  ).length;
  const maximumHomeTeams = Math.min(Math.floor(eligibleCount / 2), edition.teamCount / 2);
  const requestedHomeTeams = Math.floor(
    2 + (edition.teamCount / 2 - 2) * qualities.social / 100,
  );
  const homeTeamCount = Math.max(0, Math.min(maximumHomeTeams, requestedHomeTeams));
  const homeTeams = createHomeTeams(state, homeTeamCount, qualities.events, cursor);
  const externalTeams = createExternalTeams(state, edition.teamCount - homeTeams.length, cursor);
  const teams = shuffle(cursor, [...homeTeams, ...externalTeams]);
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const standings = new Map<string, MutableStanding>(teams.map((team) => [team.id, {
    teamId: team.id,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    opponents: [],
  }] as [string, MutableStanding]));
  const played = new Set<string>();
  const directWinner = new Map<string, string>();
  const matches: ReptileMatch[] = [];
  const swissRounds = Math.max(5, Math.log2(edition.teamCount));
  for (let round = 1; round <= swissRounds; round += 1) {
    const pairs = pairSwissRound(teams, standings, played, cursor, round === 1);
    for (const [teamA, teamB] of pairs) {
      const match = simulateMatch(teamA, teamB, "swiss", round, cursor, matches.length);
      matches.push(match);
      const standingA = standings.get(teamA.id)!;
      const standingB = standings.get(teamB.id)!;
      standingA.pointsFor += match.scoreA;
      standingA.pointsAgainst += match.scoreB;
      standingB.pointsFor += match.scoreB;
      standingB.pointsAgainst += match.scoreA;
      standingA.opponents.push(teamB.id);
      standingB.opponents.push(teamA.id);
      standings.get(match.winnerId)!.wins += 1;
      standings.get(match.winnerId === teamA.id ? teamB.id : teamA.id)!.losses += 1;
      const pairingKey = [teamA.id, teamB.id].sort().join("|");
      played.add(pairingKey);
      directWinner.set(pairingKey, match.winnerId);
    }
  }
  const finalStandings = buildStandings(standings, directWinner, teamsById);
  const top16TeamIds = finalStandings.slice(0, 16).map((entry) => entry.teamId);
  const bracket = BRACKET_SEED_ORDER.map((seed) => top16TeamIds[seed - 1]);
  const round16 = playKnockoutRound(bracket, "round16", swissRounds + 1, teamsById, cursor, matches);
  const quarters = playKnockoutRound(round16.winners, "quarterfinal", swissRounds + 2, teamsById, cursor, matches);
  const semifinals = playKnockoutRound(quarters.winners, "semifinal", swissRounds + 3, teamsById, cursor, matches);
  const final = playKnockoutRound(semifinals.winners, "final", swissRounds + 4, teamsById, cursor, matches);
  const bronze = playKnockoutRound(semifinals.losers, "bronze", swissRounds + 4, teamsById, cursor, matches);
  const winnerId = final.winners[0];
  const runnerUpId = final.losers[0];
  const thirdId = bronze.winners[0];
  const fourthId = bronze.losers[0];

  const requiredSwords = edition.teamCount * 2;
  const usedSchoolSwords = Math.min(requiredSwords, getAvailableSwords(state.equipment));
  const rentedSwords = requiredSwords - usedSchoolSwords;
  qualities.equipment = clamp(
    qualities.equipment * Math.min(1, usedSchoolSwords / requiredSwords),
    0,
    100,
  );
  const weightedQuality = (
    qualities.social + qualities.gadget + qualities.events + qualities.equipment * 2
  ) / 5;
  const fameBefore = state.tournaments.reptile.fameXp;
  const fameDelta = Math.round(weightedQuality * 10 - 500);
  const fameAfter = clamp(fameBefore + fameDelta, 0, 3_000);
  const gadgetGross = Math.round(
    edition.teamCount * GAME_CONFIG.reptileMaximumGadgetGrossPerTeam * qualities.gadget / 100,
  );
  const rentalCost = rentedSwords * GAME_CONFIG.reptileSwordRentalCost;
  const followersGained = Math.floor(edition.teamCount * qualities.social / 100);
  const result: ReptileTournamentResult = {
    id: edition.id,
    schoolYear: edition.schoolYear,
    completedAt: now,
    teamCount: edition.teamCount,
    swissRounds,
    teams,
    matches,
    standings: finalStandings,
    top16TeamIds,
    podiumTeamIds: [winnerId, runnerUpId, thirdId, fourthId],
    sectorQualities: qualities,
    minigameModifierPercent: edition.minigame.modifierPercent,
    economy: {
      venueCost: GAME_CONFIG.reptileVenueCost,
      gadgetGross,
      rentedSwords,
      rentalCost,
      usedSchoolSwords,
      swordWear: usedSchoolSwords * GAME_CONFIG.reptileSwordWear,
      netResult: gadgetGross - GAME_CONFIG.reptileVenueCost - rentalCost,
      followersGained,
      fameDelta,
      fameBefore,
      fameAfter,
    },
    difficultyMultiplier: 1.1 ** state.tournaments.reptile.victories,
    rewardsApplied: false,
  };
  return { result, nextSeed: cursor.seed };
}
