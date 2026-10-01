import { createRandomProspect } from "../content/prospectDirectory";
import { getAthleteImmunityStatus, isAthleteImmuneFromDeparture } from "./athleteImmunity";
import { advanceRandomSeed, rollAthleteBaseStats } from "./athleteStats";
import { getFormTrainingYear, getSchoolYear } from "./calendar";
import { GAME_CONFIG } from "./config";
import { makeGameId } from "./ids";
import { nextRandom } from "./random";
import type { Contact, GameState, MemberGroup } from "./types";

// Fase 7.5: ordinary members beyond GAME_CONFIG.materialEnrolledMembersLimit live as
// counters. Below the limit nothing changes, so ordinary games never see a group.

export function getGroupedMemberCount(state: Pick<GameState, "memberGroups">): number {
  let count = 0;
  for (const group of state.memberGroups ?? []) count += group.count;
  return count;
}

/** The member-shaped view of a group that the rules need (no id, name or stats). */
export function getGroupMemberProfile(group: MemberGroup, currentMonth: number) {
  return {
    id: "",
    rarity: group.rarity,
    forms: group.forms,
    formBranchPreferences: [],
    enrolledMonth: group.recentEnrolledMonth ?? getOldEnrollmentMonth(currentMonth),
    lastFormTrainingYear: group.lastFormTrainingYear,
    formTrainingYearCount: group.formTrainingYearCount,
  };
}

/** A month far enough back to give no protection from the yearly departures. */
function getOldEnrollmentMonth(currentMonth: number): number {
  const month = Math.max(1, Math.floor(currentMonth));
  return Math.max(1, month - ((month - 1) % 12) - 1);
}

function isRecentEnrollment(enrolledMonth: number | undefined, currentMonth: number): boolean {
  if (enrolledMonth === undefined) return false;
  return getAthleteImmunityStatus(
    { currentMonth },
    { id: "", rarity: "common", enrolledMonth, lastFormTrainingYear: undefined },
  ).reasons.includes("recent-enrollment");
}

function toGroupFields(
  member: {
    rarity: MemberGroup["rarity"];
    source: Contact["source"];
    forms: Contact["forms"];
    enrolledMonth?: number;
    lastFormTrainingYear?: number;
    formTrainingYearCount?: number;
  },
  currentMonth: number,
): Omit<MemberGroup, "count"> {
  const trainingStillCounts = member.lastFormTrainingYear !== undefined && (
    member.lastFormTrainingYear === getSchoolYear(currentMonth) ||
    member.lastFormTrainingYear === getFormTrainingYear(currentMonth)
  );
  return {
    rarity: member.rarity,
    source: member.source,
    forms: [...member.forms],
    ...(isRecentEnrollment(member.enrolledMonth, currentMonth)
      ? { recentEnrolledMonth: member.enrolledMonth }
      : {}),
    ...(trainingStillCounts
      ? {
          lastFormTrainingYear: member.lastFormTrainingYear,
          formTrainingYearCount: member.formTrainingYearCount,
        }
      : {}),
  };
}

function groupKey(group: Omit<MemberGroup, "count">): string {
  return [
    group.rarity,
    group.source,
    group.forms.join(","),
    group.recentEnrolledMonth ?? "",
    group.lastFormTrainingYear ?? "",
    group.formTrainingYearCount ?? "",
  ].join("|");
}

function mergeGroups(groups: Iterable<MemberGroup>, currentMonth: number): MemberGroup[] {
  const merged = new Map<string, MemberGroup>();
  for (const group of groups) {
    if (group.count <= 0) continue;
    const fields = toGroupFields(
      { ...group, enrolledMonth: group.recentEnrolledMonth },
      currentMonth,
    );
    const key = groupKey(fields);
    const existing = merged.get(key);
    merged.set(key, { ...fields, count: (existing?.count ?? 0) + group.count });
  }
  return [...merged.values()];
}

function isGroupable(contact: Contact, keep: ReadonlySet<string>): contact is Contact & {
  rarity: MemberGroup["rarity"];
} {
  return contact.status === "enrolled" &&
    contact.rarity !== "legendary" &&
    !contact.specialProfileId &&
    !contact.secretLegendaryId &&
    !contact.favorite &&
    !contact.training &&
    !contact.tournamentExperience &&
    !contact.agonistCourseCompletions &&
    contact.lastAgonistCourseYear === undefined &&
    !contact.formBranchPreferences?.length &&
    !keep.has(contact.id);
}

/** Contacts that other records point to, or that hold a role, stay objects. */
function getContactsToKeep(state: GameState): Set<string> {
  const keep = new Set<string>();
  for (const email of state.emails) keep.add(email.contactId);
  for (const outcome of state.pendingEmailOutcomes) keep.add(outcome.contactId);
  for (const trial of state.scheduledTrials) keep.add(trial.contactId);
  for (const collaborator of state.collaborators) keep.add(collaborator.contactId);
  for (const id of state.tournaments.qualification?.contactIds ?? []) keep.add(id);
  for (const id of state.tournaments.immuneContactIds) keep.add(id);
  return keep;
}

const enrolledCountCache = new WeakMap<readonly Contact[], number>();

export function countEnrolledContacts(contacts: readonly Contact[]): number {
  const cached = enrolledCountCache.get(contacts);
  if (cached !== undefined) return cached;
  let count = 0;
  for (const contact of contacts) if (contact.status === "enrolled") count += 1;
  enrolledCountCache.set(contacts, count);
  return count;
}

/**
 * Groups the weakest ordinary members beyond the limit, so the strongest athletes
 * stay available as people for tournaments.
 */
export function groupExcessMembers(state: GameState): GameState {
  const excess = countEnrolledContacts(state.contacts) - GAME_CONFIG.materialEnrolledMembersLimit;
  if (excess <= 0) return state;
  const keep = getContactsToKeep(state);
  const candidates = state.contacts
    .filter((contact) => isGroupable(contact, keep))
    .sort((left, right) =>
      ((left.arenaBase ?? 0) + (left.styleBase ?? 0)) -
      ((right.arenaBase ?? 0) + (right.styleBase ?? 0)),
    )
    .slice(0, excess);
  if (candidates.length === 0) return state;

  const grouped = new Set(candidates.map((contact) => contact.id));
  const currentMonth = state.school.currentMonth;
  const added = candidates.map((contact): MemberGroup => ({
    ...toGroupFields(contact as Contact & { rarity: MemberGroup["rarity"] }, currentMonth),
    count: 1,
  }));
  return {
    ...state,
    contacts: state.contacts.filter((contact) => !grouped.has(contact.id)),
    memberGroups: mergeGroups([...(state.memberGroups ?? []), ...added], currentMonth),
  };
}

/** Turns up to `amount` members of the chosen groups back into people. */
export function materializeGroupedMembers(
  state: GameState,
  amount: number,
  now: number,
  order: (left: MemberGroup, right: MemberGroup) => number = () => 0,
  accept: (group: MemberGroup) => boolean = () => true,
): GameState {
  const groups = [...(state.memberGroups ?? [])];
  if (amount <= 0 || groups.length === 0) return state;
  const indexes = groups.map((_, index) => index)
    .filter((index) => accept(groups[index]))
    .sort((left, right) => order(groups[left], groups[right]));
  const ids = new Set(state.contacts.map((contact) => contact.id));
  const created: Contact[] = [];
  let seed = state.randomSeed;
  for (const index of indexes) {
    while (groups[index].count > 0 && created.length < amount) {
      const group = groups[index];
      const profile = getGroupMemberProfile(group, state.school.currentMonth);
      const { firstName, lastName, email } = createRandomProspect(seed);
      const stats = rollAthleteBaseStats(advanceRandomSeed(seed, 3), group.rarity);
      seed = stats.nextSeed;
      let suffix = state.contacts.length + created.length;
      while (ids.has(makeGameId("member", now, suffix))) suffix += 1;
      const id = makeGameId("member", now, suffix);
      ids.add(id);
      created.push({
        id,
        firstName,
        lastName,
        email,
        source: group.source,
        acquiredAt: now,
        status: "enrolled",
        rarity: group.rarity,
        forms: [...group.forms],
        arenaBase: stats.arena,
        styleBase: stats.style,
        tournamentExperience: 0,
        agonistCourseCompletions: 0,
        agonistCourseArenaBonus: 0,
        agonistCourseStyleBonus: 0,
        formBranchPreferences: [],
        enrolledMonth: profile.enrolledMonth,
        lastFormTrainingYear: group.lastFormTrainingYear,
        formTrainingYearCount: group.formTrainingYearCount,
      });
      groups[index] = { ...group, count: group.count - 1 };
    }
    if (created.length >= amount) break;
  }
  if (created.length === 0) return state;
  const remaining = groups.filter((group) => group.count > 0);
  return {
    ...state,
    randomSeed: seed,
    contacts: [...state.contacts, ...created],
    memberGroups: remaining.length > 0 ? remaining : undefined,
  };
}

/** Exact for small groups, normal approximation for large ones. */
export function sampleBinomial(
  trials: number,
  probability: number,
  seed: number,
): [successes: number, nextSeed: number] {
  if (trials <= 0 || probability <= 0) return [0, seed];
  if (probability >= 1) return [trials, seed];
  let next = seed;
  if (trials <= 64) {
    let successes = 0;
    for (let trial = 0; trial < trials; trial += 1) {
      const [roll, after] = nextRandom(next);
      next = after;
      if (roll < probability) successes += 1;
    }
    return [successes, next];
  }
  // ponytail: normal approximation, exact enough above 64 trials; swap for an exact
  // sampler only if a balance test ever needs the tails.
  const [first, afterFirst] = nextRandom(next);
  const [second, afterSecond] = nextRandom(afterFirst);
  const gaussian = Math.sqrt(-2 * Math.log(Math.max(first, Number.EPSILON))) *
    Math.cos(2 * Math.PI * second);
  const mean = trials * probability;
  const deviation = Math.sqrt(trials * probability * (1 - probability));
  return [Math.min(trials, Math.max(0, Math.round(mean + gaussian * deviation))), afterSecond];
}

/** Yearly departures of the grouped members; the departed leave as archived contacts. */
export function departGroupedMembers(
  state: GameState,
  getChance: (group: MemberGroup) => number,
): { state: GameState; departed: number } {
  const groups = state.memberGroups;
  if (!groups?.length) return { state, departed: 0 };
  const context = {
    currentMonth: state.school.currentMonth,
    tournamentQualification: state.tournaments.qualification,
  };
  let seed = state.randomSeed;
  let departed = 0;
  const contactsBySource = { ...state.historyArchive.contactsBySource };
  const remaining = groups.map((group) => {
    const profile = getGroupMemberProfile(group, context.currentMonth);
    if (isAthleteImmuneFromDeparture(getAthleteImmunityStatus(context, profile), "annual-rollout")) {
      return group;
    }
    const [leaving, after] = sampleBinomial(group.count, getChance(group), seed);
    seed = after;
    if (leaving === 0) return group;
    departed += leaving;
    const archived = contactsBySource[group.source];
    contactsBySource[group.source] = { ...archived, total: archived.total + leaving };
    return { ...group, count: group.count - leaving };
  });
  if (departed === 0) return { state: { ...state, randomSeed: seed }, departed };
  const kept = mergeGroups(remaining, context.currentMonth);
  return {
    departed,
    state: {
      ...state,
      randomSeed: seed,
      memberGroups: kept.length > 0 ? kept : undefined,
      historyArchive: { ...state.historyArchive, contactsBySource },
      school: {
        ...state.school,
        activeMembers: Math.max(0, state.school.activeMembers - departed),
      },
      statistics: {
        ...state.statistics,
        membersDeparted: state.statistics.membersDeparted + departed,
      },
    },
  };
}

/** Adds ordinary members straight into a group (admin tools and benchmarks). */
export function addGroupedMembers(
  state: GameState,
  member: Parameters<typeof toGroupFields>[0],
  count: number,
): GameState {
  if (count <= 0) return state;
  const currentMonth = state.school.currentMonth;
  return {
    ...state,
    memberGroups: mergeGroups(
      [...(state.memberGroups ?? []), { ...toGroupFields(member, currentMonth), count }],
      currentMonth,
    ),
  };
}

/** Removes grouped members without archiving them (admin corrections only). */
export function removeGroupedMembers(state: GameState, count: number): GameState {
  let remaining = count;
  const groups = (state.memberGroups ?? []).map((group) => {
    const removed = Math.min(remaining, group.count);
    remaining -= removed;
    return { ...group, count: group.count - removed };
  }).filter((group) => group.count > 0);
  return remaining === count
    ? state
    : { ...state, memberGroups: groups.length > 0 ? groups : undefined };
}
