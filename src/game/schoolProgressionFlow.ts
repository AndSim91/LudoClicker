import { addCareer, getSchoolGadgetsSold, recordCareer } from "./career";
import { getSchoolYear } from "./calendar";
import { describeAchievementKey, getNewAchievementKeys } from "../content/achievements";
import {
  SHORT_GOALS,
  createNextShortGoal,
  createShortGoalFromStatistics,
  getShortGoalProgress,
  getShortGoalReward,
  getShortGoalValue,
  isShortGoalActive,
} from "../content/shortGoals";
import { formatCurrency, formatList } from "../shared/formatters";
import { refreshWritingCampaignCopies } from "./campaignContent";
import { GAME_CONFIG } from "./config";
import { scaleCurrencyGain } from "./economy";
import { getWritingPower } from "./formulas";
import { createInitialState } from "./initialState";
import { FOUNDATION_MOMENT } from "./moments";
import { canFoundSchool } from "./progression";
import { nextRandom } from "./random";
import {
  NO_REPUTATION_SPENDING,
  REPUTATION_UPGRADE_IDS,
  getPrestigeReputationPreview,
  addSchoolToMap,
  getReputationLevel,
  getSpentReputation,
  isValidReputationSpending,
  type ReputationSpending,
} from "./reputation";
import { addMessage } from "./stateUpdates";
import type {
  Contact,
  GameState,
  LegendaryCollaboratorProgress,
  RetainedLegendaryProgress,
  SchoolFoundationDetails,
} from "./types";

/**
 * A new school starts every Leggendario from zero: met again, they bring only
 * who they are (natural Arena/Stile). The key stays so Ludodex, traguardi and
 * unlocked Leggendari Segreti do not change.
 */
export function forgetLegendaryProgress(
  retained: Pick<RetainedLegendaryProgress, "joinedAt" | "arenaBase" | "styleBase">,
): RetainedLegendaryProgress {
  return {
    forms: [],
    instructorForms: [],
    technicianForms: [],
    formBranchPreferences: [],
    joinedAt: retained.joinedAt,
    arenaBase: retained.arenaBase,
    styleBase: retained.styleBase,
  };
}

function prepareLegendaryProgressForNewSchool(
  state: GameState,
): LegendaryCollaboratorProgress {
  const retainedProgress = Object.fromEntries(
    Object.entries(state.legendaryCollaborators.retainedProgress).map(([id, retained]) =>
      [id, retained && forgetLegendaryProgress(retained)]),
  ) as LegendaryCollaboratorProgress["retainedProgress"];
  for (const contact of state.contacts) {
    if (contact.status !== "enrolled" || !contact.specialProfileId) continue;
    retainedProgress[contact.specialProfileId] = forgetLegendaryProgress({
      joinedAt: contact.acquiredAt,
      arenaBase: contact.arenaBase,
      styleBase: contact.styleBase,
    });
  }
  return {
    ...state.legendaryCollaborators,
    enrolledProfileIds: [],
    retainedProgress,
  };
}

function formatRent(value: number): string {
  return `${new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(value)} €`;
}

export function foundSchool(
  state: GameState,
  details: SchoolFoundationDetails,
  now: number,
  spending: ReputationSpending = NO_REPUTATION_SPENDING,
): GameState {
  if (!canFoundSchool(state) || !details.name.trim() || !details.city.trim()) return state;
  const rent = getPrestigeReputationPreview(state);
  const availableReputation = state.network.reputation + rent.points;
  if (!isValidReputationSpending(state, spending, availableReputation)) return state;
  const legendaryProgress = prepareLegendaryProgressForNewSchool(state);
  // A random Leggendario of the school (secret ones too) follows the player.
  const legendaryMembers = state.contacts.filter((contact) =>
    contact.status === "enrolled" && contact.specialProfileId,
  );
  const [legendaryRoll, seedAfterLegendary] = nextRandom(state.randomSeed);
  const follower = legendaryMembers[Math.floor(legendaryRoll * legendaryMembers.length)];
  const followerId = follower?.specialProfileId;
  // The follower keeps nothing it earned: no Forms, attestati, courses or experience.
  // Only who they are (name, rarity, natural Arena/Stile) comes along.
  const carried: Contact | undefined = follower && {
    id: follower.id,
    firstName: follower.firstName,
    lastName: follower.lastName,
    email: follower.email,
    source: follower.source,
    acquiredAt: now,
    status: "enrolled",
    rarity: follower.rarity,
    specialProfileId: follower.specialProfileId,
    ...(follower.secretLegendaryId ? { secretLegendaryId: follower.secretLegendaryId } : {}),
    forms: [],
    arenaBase: follower.arenaBase,
    styleBase: follower.styleBase,
    tournamentExperience: 0,
    formBranchPreferences: [],
    agonistCourseCompletions: 0,
    agonistCourseArenaBonus: 0,
    agonistCourseStyleBonus: 0,
  };
  const fresh = createInitialState(now, state.profile.displayName, false, carried && followerId
    ? {
        ...legendaryProgress,
        enrolledProfileIds: [followerId],
        retainedProgress: {
          ...legendaryProgress.retainedProgress,
          [followerId]: forgetLegendaryProgress({
            joinedAt: now,
            arenaBase: carried.arenaBase,
            styleBase: carried.styleBase,
          }),
        },
      }
    : legendaryProgress);
  const carriedMembers: Contact[] = carried
    ? [{ ...carried, enrolledMonth: fresh.school.currentMonth }]
    : [];
  // Points in the rent are consumed: they lock a fixed rent from this school only.
  const monthlyRent = Math.round(rent.rentPerPoint * spending.rent);
  const archivedSchool = {
    name: state.school.name,
    city: state.school.city,
    fame: state.school.fame,
  };
  const careerStatistics = recordCareer(addCareer(state, {
    reputationEarned: rent.points,
    perfectPhrases: state.player.perfectPhrases ?? 0,
    gadgetsSold: getSchoolGadgetsSold(state),
  }), {
    maxRentPoints: spending.rent,
    earliestFoundationYear: getSchoolYear(state.school.currentMonth),
  }).statistics;
  const nextState: GameState = {
    ...fresh,
    createdAt: state.createdAt,
    randomSeed: followerId ? seedAfterLegendary : state.randomSeed,
    contacts: [...carriedMembers, ...fresh.contacts],
    school: {
      ...fresh.school,
      activeMembers: carriedMembers.length,
      peakActiveMembers: carriedMembers.length,
      name: details.name.trim(),
      city: details.city.trim(),
    },
    network: {
      reputation: availableReputation - getSpentReputation(spending),
      reputationUpgrades: Object.fromEntries(REPUTATION_UPGRADE_IDS.map((id) => [
        id,
        getReputationLevel(state, id) + (spending.upgrades[id] ?? 0),
      ])),
      schools: addSchoolToMap(state.network.schools, archivedSchool),
      schoolCount: state.network.schoolCount + 1,
      monthlyRent: state.network.monthlyRent + monthlyRent,
      prestigeOfferSent: false,
      secretLegendaries: state.network.secretLegendaries,
      ...(state.network.superbaTournament ? { superbaTournament: true } : {}),
      ...(state.network.gadgetMastery ? { gadgetMastery: state.network.gadgetMastery } : {}),
    },
    tournaments: {
      ...fresh.tournaments,
      ordinaryVictoryAchieved: state.tournaments.ordinaryVictoryAchieved,
    },
    achievements: state.achievements,
    // The constellation of the Network plays at every new school.
    moments: { ...state.moments, queue: [...state.moments.queue, FOUNDATION_MOMENT] },
    // Scenes already seen (or skipped) in an earlier school never come back.
    tutorial: {
      ...fresh.tutorial,
      completedSceneIds: state.tutorial.completedSceneIds,
      skippedSceneIds: state.tutorial.skippedSceneIds,
    },
    // A discovered secret path stays known in every later school; only its level resets.
    secretUpgradeDiscoveries: state.secretUpgradeDiscoveries,
    legendaryCollaborators: fresh.legendaryCollaborators,
    statistics: careerStatistics,
    messages: state.messages,
    // Missions start again from series 1; the baseline is the career statistics carried over.
    shortGoal: createShortGoalFromStatistics(careerStatistics, 0, now),
  };
  const announced = addMessage(
    refreshWritingCampaignCopies(nextState),
    now,
    `${details.city.trim()} ha una scuola`,
    `${state.school.name} entra nel Network` +
      (monthlyRent > 0 ? ` e ti versa ${formatRent(monthlyRent)} al mese, puntuale come una quota.` : ".") +
      ` Reputazione +${rent.points}, ${availableReputation - getSpentReputation(spending)} punti ancora da spendere.` +
      (follower ? ` ${follower.firstName} ${follower.lastName} ha già la borsa pronta: è il primo iscritto della nuova scuola.` : ""),
    "system",
  );
  return {
    ...announced,
    player: { writingPower: getWritingPower(announced) },
  };
}

/** Unlocks the achievements reached (4.4): no reward, one Posta message per batch. */
export function grantAchievements(state: GameState, now: number): GameState {
  const earned = getNewAchievementKeys(state);
  if (earned.length === 0) return state;
  const unlocked: GameState = { ...state, achievements: [...state.achievements, ...earned] };
  const names = earned.map(describeAchievementKey);
  return addMessage(
    unlocked,
    now,
    earned.length === 1 ? `Nuovo traguardo: ${names[0]}` : `${earned.length} traguardi in un colpo`,
    earned.length === 1
      ? "Già appeso in bacheca, nella LudoWiki."
      : `${formatList(earned.length > 3 ? [...names.slice(0, 3), `altri ${earned.length - 3}`] : names)}. La bacheca della LudoWiki comincia a riempirsi.`,
    "system",
    "other",
    "progress",
  );
}

export function synchronizeInactiveShortGoal(
  state: GameState,
  now: number,
): GameState {
  if (isShortGoalActive(state)) return state;
  const baseline = getShortGoalValue(state, state.shortGoal.definitionId);
  const reactivationStartedAt = state.school.euros < GAME_CONFIG.shortGoalActivationBalance
    ? state.shortGoal.reactivationStartedAt ?? now
    : undefined;
  return baseline === state.shortGoal.baseline &&
      reactivationStartedAt === state.shortGoal.reactivationStartedAt
    ? state
    : {
        ...state,
        shortGoal: {
          ...state.shortGoal,
          baseline,
          reactivationStartedAt,
        },
      };
}

export function refreshShortGoalAvailability(
  state: GameState,
  now: number,
): GameState {
  if (isShortGoalActive(state)) {
    const hasProgress = getShortGoalProgress(state) >= 1;
    if (state.school.euros < GAME_CONFIG.shortGoalActivationBalance || hasProgress) {
      return state;
    }
    return {
      ...state,
      shortGoal: {
        ...state.shortGoal,
        baseline: getShortGoalValue(state, state.shortGoal.definitionId),
        startedAt: now,
        isActive: false,
        reactivationStartedAt: undefined,
      },
    };
  }

  const synchronized = synchronizeInactiveShortGoal(state, now);
  const reactivationStartedAt = synchronized.shortGoal.reactivationStartedAt;
  if (
    synchronized.school.euros >= GAME_CONFIG.shortGoalActivationBalance ||
    reactivationStartedAt === undefined ||
    now - reactivationStartedAt < GAME_CONFIG.shortGoalReactivationDelayMs
  ) {
    return synchronized;
  }
  return {
    ...synchronized,
    shortGoal: {
      ...synchronized.shortGoal,
      startedAt: now,
      isActive: true,
      reactivationStartedAt: undefined,
    },
  };
}

export function completeShortGoal(
  state: GameState,
  now: number,
  gainMultiplier: number,
): GameState {
  const available = refreshShortGoalAvailability(state, now);
  if (!isShortGoalActive(available)) return available;
  if (getShortGoalProgress(available) < available.shortGoal.target) return available;

  const definition = SHORT_GOALS[available.shortGoal.definitionId];
  const reward = scaleCurrencyGain(getShortGoalReward(available.shortGoal), gainMultiplier);
  const completedCount = available.shortGoal.completedCount + 1;
  const rewarded: GameState = {
    ...available,
    school: { ...available.school, euros: available.school.euros + reward },
    statistics: {
      ...available.statistics,
      eurosEarned: available.statistics.eurosEarned + reward,
    },
  };
  const nextGoal = createNextShortGoal(rewarded, completedCount, now);
  const progressed = definition.id === "send-emails" && available.shortGoal.completedCount === 0 &&
      available.network.schoolCount === 0
    ? addMessage(
        { ...rewarded, shortGoal: nextGoal },
        now,
        "Si esce dalla palestra",
        "Tre inviti, missione compiuta. Ora la scuola può farsi vedere in giro: Eventi è nella barra a sinistra.",
        "system",
      )
    : { ...rewarded, shortGoal: nextGoal };
  return addMessage(
    progressed,
    now,
    `Missione compiuta: ${definition.title}`,
    `${definition.completionNarrative} +${formatCurrency(reward)}.`,
    "positive",
    "other",
    "progress",
  );
}
