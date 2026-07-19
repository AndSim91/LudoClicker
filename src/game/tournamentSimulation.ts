import { PROSPECT_FIRST_NAMES, PROSPECT_LAST_NAMES } from "../content/prospectDirectory";
import {
  SECRET_LEGENDARIES,
  SECRET_LEGENDARY_APPEARANCE_CHANCE,
  TOURNAMENT_DEFINITIONS,
  getNextTournamentLevel,
  getNpcSchoolPool,
  getTournamentReward,
  type TournamentNpcProfile,
  type TournamentTier,
} from "../content/tournaments";
import {
  getContactBaseStats,
  getContactTournamentExperience,
  getNumericFormCount,
  getPreparation,
  getStyleVote,
  hasCompletedFormOne,
} from "./athleteStats";
import { nextRandom } from "./random";
import type {
  Contact,
  GameState,
  PersonRarity,
  SecretLegendaryId,
  TournamentDiscipline,
  TournamentGroupStanding,
  TournamentLevel,
  TournamentMatch,
  TournamentParticipant,
  TournamentQualifier,
  TournamentResult,
} from "./types";

export const ARENA_DECISIVENESS = 18;
const MINIMUM_ASSAULT_CHANCE = 0.001;
const MAXIMUM_ASSAULT_CHANCE = 0.999;

interface RandomCursor {
  seed: number;
}

interface MutableStanding {
  participantId: string;
  groupIndex: number;
  wins: number;
  assaultPoints: number;
  styleTotal: number;
  styleCount: number;
  draw: number;
}

interface SimulatedTournament {
  result: TournamentResult;
  nextSeed: number;
}

function roll(cursor: RandomCursor): number {
  const [value, nextSeed] = nextRandom(cursor.seed);
  cursor.seed = nextSeed;
  return value;
}

function integer(cursor: RandomCursor, minimum: number, maximum: number): number {
  return minimum + Math.floor(roll(cursor) * (maximum - minimum + 1));
}

function weighted<T>(cursor: RandomCursor, entries: readonly (readonly [T, number])[]): T {
  let value = roll(cursor);
  for (const [entry, weight] of entries) {
    value -= weight;
    if (value <= 0) return entry;
  }
  return entries[entries.length - 1][0];
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
  return ((0.7 + roll(cursor) * 0.6) + (0.7 + roll(cursor) * 0.6)) / 2;
}

function conditionMultiplier(condition: number): number {
  return 0.7 + 0.3 * condition;
}

function encounterMultiplier(cursor: RandomCursor): number {
  return 0.7 + 0.3 * (0.95 + roll(cursor) * 0.1);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function participantName(participant: TournamentParticipant): string {
  return `${participant.firstName} ${participant.lastName}`;
}

function createOwnedParticipants(
  state: GameState,
  contacts: readonly Contact[],
  cursor: RandomCursor,
): TournamentParticipant[] {
  const collaboratorsByContactId = new Map(
    state.collaborators.map((collaborator) => [collaborator.contactId, collaborator]),
  );
  return contacts.map((contact) => {
    const collaborator = collaboratorsByContactId.get(contact.id);
    const forms = collaborator?.forms ?? contact.forms;
    const stats = getContactBaseStats(contact);
    const numericForms = getNumericFormCount(forms);
    const experience = getContactTournamentExperience(contact);
    return {
      id: `owned-${contact.id}`,
      ownedContactId: contact.id,
      secretLegendaryId: contact.secretLegendaryId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      schoolName: state.school.name,
      city: state.school.city,
      rarity: contact.secretLegendaryId ? "secret-legendary" : contact.rarity,
      numericForms,
      experience,
      arenaBase: stats.arena,
      styleBase: stats.style,
      arenaPreparation: getPreparation(stats.arena, numericForms, experience),
      stylePreparation: getPreparation(stats.style, numericForms, experience),
      condition: triangularCondition(cursor),
    };
  });
}

function getRarityMinimum(rarity: Exclude<PersonRarity, "legendary">): number {
  if (rarity === "ultra-rare") return 50;
  if (rarity === "rare") return 25;
  return 1;
}

function createNpcCandidate(
  level: Exclude<TournamentLevel, "school">,
  profile: TournamentNpcProfile,
  discipline: TournamentDiscipline,
  cursor: RandomCursor,
  sequence: number,
): TournamentParticipant {
  const rarity = weighted(cursor, profile.rarityWeights);
  const numericForms = weighted(cursor, profile.formWeights);
  const experience = integer(cursor, profile.experienceRange[0], profile.experienceRange[1]);
  const minimum = getRarityMinimum(rarity);
  const arenaBase = integer(cursor, minimum, 100);
  const styleBase = integer(cursor, minimum, 100);
  const firstName = PROSPECT_FIRST_NAMES[integer(cursor, 0, PROSPECT_FIRST_NAMES.length - 1)];
  const lastName = PROSPECT_LAST_NAMES[integer(cursor, 0, PROSPECT_LAST_NAMES.length - 1)];
  const schools = getNpcSchoolPool(level);
  const school = schools[integer(cursor, 0, schools.length - 1)];
  return {
    id: `npc-${level}-${sequence}-${cursor.seed >>> 0}`,
    firstName,
    lastName,
    schoolName: school.name,
    city: school.city,
    rarity,
    numericForms,
    experience,
    arenaBase,
    styleBase,
    arenaPreparation: getPreparation(arenaBase, numericForms, experience),
    stylePreparation: getPreparation(styleBase, numericForms, experience),
    condition: triangularCondition(cursor),
    qualificationDiscipline: discipline,
  };
}

function createNpcInTier(
  level: Exclude<TournamentLevel, "school">,
  profile: TournamentNpcProfile,
  tier: TournamentTier,
  discipline: TournamentDiscipline,
  cursor: RandomCursor,
  sequence: number,
): TournamentParticipant {
  let closest: TournamentParticipant | undefined;
  let closestDistance = Infinity;
  const midpoint = (tier.minimum + tier.maximum) / 2;
  for (let attempt = 0; attempt < 2_000; attempt += 1) {
    const candidate = createNpcCandidate(level, profile, discipline, cursor, sequence + attempt);
    const preparation = discipline === "arena"
      ? candidate.arenaPreparation
      : candidate.stylePreparation;
    if (preparation >= tier.minimum && preparation <= tier.maximum) return candidate;
    const distance = Math.abs(preparation - midpoint);
    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }
  return closest!;
}

function allocateTierSlots(npcCount: number, tiers: readonly TournamentTier[]): number[] {
  if (npcCount <= 0) return tiers.map(() => 0);
  const baseTotal = tiers.reduce((total, tier) => total + tier.baseSlots, 0);
  const exact = tiers.map((tier) => npcCount * tier.baseSlots / baseTotal);
  const slots = exact.map(Math.floor);
  const remaining = npcCount - slots.reduce((total, value) => total + value, 0);
  const priorities = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);
  for (let index = 0; index < remaining; index += 1) slots[priorities[index].index] += 1;
  if (npcCount >= 2 && slots[slots.length - 1] < 2) {
    const needed = 2 - slots[slots.length - 1];
    slots[slots.length - 1] += needed;
    for (let index = 0; index < needed; index += 1) {
      const donor = slots.findIndex((value, tierIndex) => tierIndex < slots.length - 1 && value > 1);
      if (donor >= 0) slots[donor] -= 1;
    }
  }
  return slots;
}

function createSecretParticipant(
  id: SecretLegendaryId,
  cursor: RandomCursor,
): TournamentParticipant {
  const profile = SECRET_LEGENDARIES[id];
  return {
    id: `secret-${id}`,
    secretLegendaryId: id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    schoolName: profile.schoolName,
    city: profile.city,
    rarity: "secret-legendary",
    numericForms: profile.numericForms,
    experience: profile.externalExperience,
    arenaBase: profile.arenaBase,
    styleBase: profile.styleBase,
    arenaPreparation: getPreparation(
      profile.arenaBase,
      profile.numericForms,
      profile.externalExperience,
    ),
    stylePreparation: getPreparation(
      profile.styleBase,
      profile.numericForms,
      profile.externalExperience,
    ),
    condition: triangularCondition(cursor),
    qualificationDiscipline: profile.specialty === "style" ? "style" : "arena",
  };
}

function maybeInsertSecretLegendary(
  state: GameState,
  participants: TournamentParticipant[],
  cursor: RandomCursor,
): TournamentParticipant[] {
  if (roll(cursor) >= SECRET_LEGENDARY_APPEARANCE_CHANCE) return participants;
  const candidates = (Object.keys(SECRET_LEGENDARIES) as SecretLegendaryId[]).filter(
    (id) => state.network.secretLegendaries[id].status === "external",
  );
  if (candidates.length === 0 || participants.length === 0) return participants;
  const id = candidates[integer(cursor, 0, candidates.length - 1)];
  const secret = createSecretParticipant(id, cursor);
  const relevant = secret.qualificationDiscipline === "style"
    ? secret.stylePreparation
    : secret.arenaPreparation;
  let replacementIndex = 0;
  let distance = Infinity;
  participants.forEach((participant, index) => {
    const value = participant.qualificationDiscipline === "style"
      ? participant.stylePreparation
      : participant.arenaPreparation;
    const candidateDistance = Math.abs(value - relevant);
    if (candidateDistance < distance) {
      replacementIndex = index;
      distance = candidateDistance;
    }
  });
  const result = [...participants];
  result[replacementIndex] = secret;
  return result;
}

function createNpcParticipants(
  state: GameState,
  level: Exclude<TournamentLevel, "school">,
  count: number,
  cursor: RandomCursor,
): TournamentParticipant[] {
  const profile = TOURNAMENT_DEFINITIONS[level].npc!;
  const slots = allocateTierSlots(count, profile.tiers);
  const participants: TournamentParticipant[] = [];
  let sequence = 0;
  profile.tiers.forEach((tier, tierIndex) => {
    for (let index = 0; index < slots[tierIndex]; index += 1) {
      const discipline: TournamentDiscipline = index % 2 === tierIndex % 2 ? "arena" : "style";
      participants.push(createNpcInTier(level, profile, tier, discipline, cursor, sequence));
      sequence += 1;
    }
  });
  return maybeInsertSecretLegendary(state, participants, cursor).map((participant) => {
    if (
      participant.secretLegendaryId ||
      participant.schoolName !== state.school.name ||
      participant.city !== state.school.city
    ) return participant;
    const replacement = getNpcSchoolPool(level).find((school) =>
      school.name !== state.school.name || school.city !== state.school.city
    );
    return replacement
      ? { ...participant, schoolName: replacement.name, city: replacement.city }
      : participant;
  });
}

function ensureUniqueParticipantNames(
  participants: TournamentParticipant[],
  cursor: RandomCursor,
): TournamentParticipant[] {
  const used = new Set<string>();
  return participants.map((participant) => {
    let candidate = participant;
    let key = participantName(candidate).toLocaleLowerCase("it-IT");
    if (!used.has(key)) {
      used.add(key);
      return candidate;
    }
    if (participant.ownedContactId || participant.secretLegendaryId) return participant;
    for (let attempt = 0; attempt < PROSPECT_LAST_NAMES.length; attempt += 1) {
      const lastName = PROSPECT_LAST_NAMES[integer(cursor, 0, PROSPECT_LAST_NAMES.length - 1)];
      key = `${participant.firstName} ${lastName}`.toLocaleLowerCase("it-IT");
      if (used.has(key)) continue;
      candidate = { ...participant, lastName };
      used.add(key);
      return candidate;
    }
    return candidate;
  });
}

function simulateMatch(
  participantA: TournamentParticipant,
  participantB: TournamentParticipant,
  stage: TournamentMatch["stage"],
  cursor: RandomCursor,
  matchIndex: number,
  groupIndex?: number,
): TournamentMatch {
  const poweredA = participantA.arenaPreparation ** ARENA_DECISIVENESS *
    conditionMultiplier(participantA.condition) * encounterMultiplier(cursor);
  const poweredB = participantB.arenaPreparation ** ARENA_DECISIVENESS *
    conditionMultiplier(participantB.condition) * encounterMultiplier(cursor);
  const assaultChanceA = clamp(
    poweredA / (poweredA + poweredB),
    MINIMUM_ASSAULT_CHANCE,
    MAXIMUM_ASSAULT_CHANCE,
  );
  let arenaScoreA = 0;
  let arenaScoreB = 0;
  while (arenaScoreA < 2 && arenaScoreB < 2) {
    if (roll(cursor) < assaultChanceA) arenaScoreA += 1;
    else arenaScoreB += 1;
  }
  const stylePerformanceA = participantA.stylePreparation *
    conditionMultiplier(participantA.condition) * encounterMultiplier(cursor);
  const stylePerformanceB = participantB.stylePreparation *
    conditionMultiplier(participantB.condition) * encounterMultiplier(cursor);
  return {
    id: `match-${stage}-${matchIndex}-${cursor.seed >>> 0}`,
    stage,
    groupIndex,
    participantAId: participantA.id,
    participantBId: participantB.id,
    arenaScoreA,
    arenaScoreB,
    styleScoreA: getStyleVote(stylePerformanceA),
    styleScoreB: getStyleVote(stylePerformanceB),
    winnerId: arenaScoreA === 2 ? participantA.id : participantB.id,
  };
}

function getGroupSizes(participantCount: number): number[] {
  const groupCount = Math.max(1, Math.ceil(participantCount / 8));
  const minimumSize = Math.floor(participantCount / groupCount);
  const largerGroups = participantCount % groupCount;
  return Array.from(
    { length: groupCount },
    (_, index) => minimumSize + (index < largerGroups ? 1 : 0),
  );
}

function standingAverage(standing: MutableStanding): number {
  return standing.styleCount > 0 ? standing.styleTotal / standing.styleCount : 0;
}

function compareStandings(a: MutableStanding, b: MutableStanding): number {
  return b.wins - a.wins ||
    b.assaultPoints - a.assaultPoints ||
    standingAverage(b) - standingAverage(a) ||
    b.draw - a.draw;
}

function knockoutStage(roundSize: number): TournamentMatch["stage"] {
  if (roundSize >= 64) return "round64";
  if (roundSize >= 32) return "round32";
  if (roundSize >= 16) return "round16";
  if (roundSize >= 8) return "quarterfinal";
  if (roundSize >= 4) return "semifinal";
  return "final";
}

function nextPowerOfTwo(value: number): number {
  let result = 1;
  while (result < value) result *= 2;
  return result;
}

function buildArenaKnockout(
  qualifiers: TournamentParticipant[],
  participantMap: Map<string, TournamentParticipant>,
  cursor: RandomCursor,
  matches: TournamentMatch[],
  styleTotals: Map<string, { total: number; count: number }>,
): { ranking: string[]; semifinalLosers: TournamentParticipant[] } {
  const eliminatedByRound: string[][] = [];
  const bracketSize = nextPowerOfTwo(qualifiers.length);
  const byeCount = bracketSize - qualifiers.length;
  let roundParticipants: TournamentParticipant[];

  const recordStyle = (match: TournamentMatch) => {
    const a = styleTotals.get(match.participantAId)!;
    const b = styleTotals.get(match.participantBId)!;
    a.total += match.styleScoreA; a.count += 1;
    b.total += match.styleScoreB; b.count += 1;
  };

  if (byeCount > 0) {
    const byeParticipants = qualifiers.slice(0, byeCount);
    const firstRound = shuffle(cursor, qualifiers.slice(byeCount));
    const winners = [...byeParticipants];
    const eliminated: string[] = [];
    for (let index = 0; index < firstRound.length; index += 2) {
      const match = simulateMatch(
        firstRound[index], firstRound[index + 1], knockoutStage(bracketSize),
        cursor, matches.length,
      );
      matches.push(match); recordStyle(match);
      winners.push(participantMap.get(match.winnerId)!);
      eliminated.push(match.winnerId === firstRound[index].id
        ? firstRound[index + 1].id
        : firstRound[index].id);
    }
    eliminatedByRound.push(eliminated);
    roundParticipants = shuffle(cursor, winners);
  } else {
    roundParticipants = shuffle(cursor, qualifiers);
  }

  const semifinalLosers: TournamentParticipant[] = [];
  while (roundParticipants.length > 2) {
    const roundSize = roundParticipants.length;
    const winners: TournamentParticipant[] = [];
    const eliminated: string[] = [];
    for (let index = 0; index < roundParticipants.length; index += 2) {
      const a = roundParticipants[index];
      const b = roundParticipants[index + 1];
      const match = simulateMatch(a, b, knockoutStage(roundSize), cursor, matches.length);
      matches.push(match); recordStyle(match);
      const winner = participantMap.get(match.winnerId)!;
      const loser = match.winnerId === a.id ? b : a;
      winners.push(winner); eliminated.push(loser.id);
      if (roundSize === 4) semifinalLosers.push(loser);
    }
    eliminatedByRound.push(eliminated);
    roundParticipants = shuffle(cursor, winners);
  }

  const final = simulateMatch(
    roundParticipants[0], roundParticipants[1], "final", cursor, matches.length,
  );
  matches.push(final); recordStyle(final);
  const champion = participantMap.get(final.winnerId)!;
  const runnerUp = final.winnerId === roundParticipants[0].id
    ? roundParticipants[1]
    : roundParticipants[0];
  let bronze: TournamentParticipant | undefined;
  let fourth: TournamentParticipant | undefined;
  if (semifinalLosers.length === 2) {
    const bronzeMatch = simulateMatch(
      semifinalLosers[0], semifinalLosers[1], "bronze", cursor, matches.length,
    );
    matches.push(bronzeMatch); recordStyle(bronzeMatch);
    bronze = participantMap.get(bronzeMatch.winnerId)!;
    fourth = bronzeMatch.winnerId === semifinalLosers[0].id
      ? semifinalLosers[1]
      : semifinalLosers[0];
  }
  const excluded = new Set([champion.id, runnerUp.id, bronze?.id, fourth?.id]);
  const remaining = eliminatedByRound
    .reverse()
    .flat()
    .filter((id) => !excluded.has(id));
  return {
    ranking: [champion.id, runnerUp.id, ...(bronze ? [bronze.id] : []),
      ...(fourth ? [fourth.id] : []), ...remaining],
    semifinalLosers,
  };
}

function buildQualifiers(
  arenaRanking: readonly string[],
  styleRanking: readonly string[],
  participantMap: Map<string, TournamentParticipant>,
): TournamentQualifier[] {
  const qualifiers: TournamentQualifier[] = [];
  const selected = new Set<string>();
  arenaRanking.slice(0, 3).forEach((participantId, index) => {
    const participant = participantMap.get(participantId)!;
    selected.add(participantId);
    qualifiers.push({
      participantId,
      ownedContactId: participant.ownedContactId,
      source: "arena",
      rankingPosition: index + 1,
      repechage: false,
    });
  });
  for (let index = 0; index < styleRanking.length && qualifiers.length < 6; index += 1) {
    const participantId = styleRanking[index];
    if (selected.has(participantId)) continue;
    const participant = participantMap.get(participantId)!;
    selected.add(participantId);
    qualifiers.push({
      participantId,
      ownedContactId: participant.ownedContactId,
      source: "style",
      rankingPosition: index + 1,
      repechage: index >= 3,
    });
  }
  return qualifiers;
}

function findDefeatedSecretLegendaries(
  participants: readonly TournamentParticipant[],
  matches: readonly TournamentMatch[],
  styleRanking: readonly string[],
): SecretLegendaryId[] {
  const defeated = new Set<SecretLegendaryId>();
  const ownedIds = new Set(participants.filter((entry) => entry.ownedContactId).map((entry) => entry.id));
  for (const participant of participants) {
    if (!participant.secretLegendaryId || participant.ownedContactId) continue;
    const lostToOwnedInArena = matches.some((match) =>
      (match.participantAId === participant.id || match.participantBId === participant.id) &&
      match.winnerId !== participant.id && ownedIds.has(match.winnerId)
    );
    const secretStyleIndex = styleRanking.indexOf(participant.id);
    const beatenInStyle = styleRanking.slice(0, secretStyleIndex).some((id) => ownedIds.has(id));
    if (lostToOwnedInArena || beatenInStyle) defeated.add(participant.secretLegendaryId);
  }
  return [...defeated];
}

export function getEligibleSchoolContacts(state: GameState): Contact[] {
  return state.contacts.filter((contact) =>
    contact.status === "enrolled" && hasCompletedFormOne(
      state.collaborators.find((collaborator) => collaborator.contactId === contact.id)?.forms ??
        contact.forms,
    )
  );
}

export function simulateTournament(
  state: GameState,
  level: TournamentLevel,
  season: number,
  completedAt: number,
  ownedContacts: readonly Contact[],
): SimulatedTournament {
  const cursor: RandomCursor = { seed: state.randomSeed };
  const owned = createOwnedParticipants(state, ownedContacts, cursor);
  const definition = TOURNAMENT_DEFINITIONS[level];
  const npcCount = level === "school" ? 0 : Math.max(0, definition.fieldSize! - owned.length);
  const npcs = level === "school"
    ? []
    : createNpcParticipants(state, level, npcCount, cursor);
  const participants = ensureUniqueParticipantNames(
    shuffle(cursor, [...owned, ...npcs]),
    cursor,
  );
  const participantMap = new Map(participants.map((participant) => [participant.id, participant]));
  const matches: TournamentMatch[] = [];
  const mutableStandings: MutableStanding[] = [];
  const styleTotals = new Map(
    participants.map((participant) => [participant.id, { total: 0, count: 0 }]),
  );
  const groupSizes = getGroupSizes(participants.length);
  let offset = 0;
  const advancing: { participant: TournamentParticipant; standing: MutableStanding }[] = [];
  groupSizes.forEach((size, groupIndex) => {
    const group = participants.slice(offset, offset + size);
    offset += size;
    const standings = group.map((participant) => ({
      participantId: participant.id,
      groupIndex,
      wins: 0,
      assaultPoints: 0,
      styleTotal: 0,
      styleCount: 0,
      draw: roll(cursor),
    }));
    const standingsById = new Map(standings.map((standing) => [standing.participantId, standing]));
    for (let first = 0; first < group.length; first += 1) {
      for (let second = first + 1; second < group.length; second += 1) {
        const match = simulateMatch(
          group[first], group[second], "group", cursor, matches.length, groupIndex,
        );
        matches.push(match);
        const standingA = standingsById.get(group[first].id)!;
        const standingB = standingsById.get(group[second].id)!;
        standingsById.get(match.winnerId)!.wins += 1;
        standingA.assaultPoints += match.arenaScoreA;
        standingB.assaultPoints += match.arenaScoreB;
        standingA.styleTotal += match.styleScoreA; standingA.styleCount += 1;
        standingB.styleTotal += match.styleScoreB; standingB.styleCount += 1;
        const totalA = styleTotals.get(group[first].id)!;
        const totalB = styleTotals.get(group[second].id)!;
        totalA.total += match.styleScoreA; totalA.count += 1;
        totalB.total += match.styleScoreB; totalB.count += 1;
      }
    }
    standings.sort(compareStandings);
    mutableStandings.push(...standings);
    advancing.push(...standings.slice(0, Math.min(4, standings.length)).map((standing) => ({
      participant: participantMap.get(standing.participantId)!, standing,
    })));
  });

  advancing.sort((a, b) => compareStandings(a.standing, b.standing));
  const advancingIds = new Set(advancing.map((entry) => entry.participant.id));
  const knockout = buildArenaKnockout(
    advancing.map((entry) => entry.participant), participantMap, cursor, matches, styleTotals,
  );
  const groupEliminated = mutableStandings
    .filter((standing) => !advancingIds.has(standing.participantId))
    .sort(compareStandings)
    .map((standing) => standing.participantId);
  const arenaRanking = [...knockout.ranking, ...groupEliminated];
  const styleDraws = new Map(participants.map((participant) => [participant.id, roll(cursor)]));
  const styleRanking = participants
    .map((participant) => participant.id)
    .sort((a, b) => {
      const scoreA = styleTotals.get(a)!;
      const scoreB = styleTotals.get(b)!;
      const averageA = scoreA.count > 0 ? scoreA.total / scoreA.count : 0;
      const averageB = scoreB.count > 0 ? scoreB.total / scoreB.count : 0;
      return averageB - averageA || styleDraws.get(b)! - styleDraws.get(a)!;
    });
  const qualifiers = getNextTournamentLevel(level)
    ? buildQualifiers(arenaRanking, styleRanking, participantMap)
    : [];
  const podiumFor = (discipline: TournamentDiscipline, ranking: readonly string[]) =>
    ranking.slice(0, 3).map((participantId, index) => {
      const style = styleTotals.get(participantId)!;
      return {
        participantId,
        position: (index + 1) as 1 | 2 | 3,
        discipline,
        score: discipline === "style"
          ? style.total / Math.max(1, style.count)
          : index + 1,
      };
    });
  const arenaPodium = podiumFor("arena", arenaRanking);
  const stylePodium = podiumFor("style", styleRanking);
  const rewards = [...arenaPodium, ...stylePodium]
    .filter((entry) => participantMap.get(entry.participantId)?.ownedContactId)
    .map((entry) => getTournamentReward(level, entry.discipline, entry.position));
  const groupStandings: TournamentGroupStanding[] = mutableStandings.map((standing) => ({
    participantId: standing.participantId,
    groupIndex: standing.groupIndex,
    wins: standing.wins,
    assaultPoints: standing.assaultPoints,
    styleAverage: standingAverage(standing),
    qualified: advancingIds.has(standing.participantId),
  }));
  const secretLegendaryDefeatedIds = findDefeatedSecretLegendaries(
    participants, matches, styleRanking,
  );
  return {
    nextSeed: cursor.seed,
    result: {
      id: `tournament-${level}-${season}-${completedAt}`,
      level,
      season,
      completedAt,
      participants,
      matches,
      groupStandings,
      arenaRanking,
      styleRanking,
      arenaPodium,
      stylePodium,
      qualifiers,
      rewards,
      secretLegendaryDefeatedIds,
    },
  };
}

export function describeTournamentParticipant(participant: TournamentParticipant): string {
  return `${participantName(participant)} · ${participant.schoolName}`;
}
