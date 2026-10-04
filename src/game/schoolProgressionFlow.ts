import { addCareer, getSchoolGadgetsSold, recordCareer } from "./career";
import { getSchoolYear } from "./calendar";
import { describeAchievementKey, getNewAchievementKeys } from "../content/achievements";
import {
  SHORT_GOALS,
  createNextShortGoal,
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
import { makeGameId } from "./ids";
import { createInitialState } from "./initialState";
import { canFoundSchool } from "./progression";
import { nextRandom } from "./random";
import {
  NO_REPUTATION_SPENDING,
  REPUTATION_UPGRADE_IDS,
  getPrestigeReputationPreview,
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
  SchoolFoundationDetails,
} from "./types";

function prepareLegendaryProgressForNewSchool(
  state: GameState,
): LegendaryCollaboratorProgress {
  const retainedProgress = { ...state.legendaryCollaborators.retainedProgress };
  const collaboratorsByContactId = new Map(
    state.collaborators.map((collaborator) => [collaborator.contactId, collaborator]),
  );
  for (const contact of state.contacts) {
    if (contact.status !== "enrolled" || !contact.specialProfileId) continue;
    const collaborator = collaboratorsByContactId.get(contact.id);
    retainedProgress[contact.specialProfileId] = {
      forms: [...(collaborator?.forms ?? contact.forms)],
      instructorForms: [...(collaborator?.instructorForms ?? [])],
      technicianForms: [...(collaborator?.technicianForms ?? [])],
      formBranchPreferences: [
        ...(collaborator?.formBranchPreferences ?? contact.formBranchPreferences ?? []),
      ],
      joinedAt: collaborator?.joinedAt ?? contact.acquiredAt,
      arenaBase: contact.arenaBase,
      styleBase: contact.styleBase,
      agonistCourseCompletions: contact.agonistCourseCompletions,
      agonistCourseArenaBonus: contact.agonistCourseArenaBonus,
      agonistCourseStyleBonus: contact.agonistCourseStyleBonus,
      lastAgonistCourseYear:
        collaborator?.lastAgonistCourseYear ?? contact.lastAgonistCourseYear,
      lastFormTrainingYear:
        collaborator?.lastFormTrainingYear ?? contact.lastFormTrainingYear,
      formTrainingYearCount:
        collaborator?.formTrainingYearCount ?? contact.formTrainingYearCount,
    };
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
  const fresh = createInitialState(now, state.profile.displayName, false, followerId
    ? { ...legendaryProgress, enrolledProfileIds: [followerId] }
    : legendaryProgress);
  const followerProgress = followerId ? legendaryProgress.retainedProgress[followerId] : undefined;
  const carriedMembers: Contact[] = [];
  if (follower) {
    const carried: Contact = {
      ...follower,
      acquiredAt: now,
      enrolledMonth: fresh.school.currentMonth,
      forms: [...(followerProgress?.forms ?? follower.forms)],
      formBranchPreferences: [
        ...(followerProgress?.formBranchPreferences ?? follower.formBranchPreferences ?? []),
      ],
    };
    delete carried.training;
    carriedMembers.push(carried);
  }
  // Points in the rent are consumed: they lock a fixed rent from this school only.
  const monthlyRent = Math.round(rent.rentPerPoint * spending.rent);
  const archivedSchool = {
    id: makeGameId("school", now, state.network.schools.length),
    name: state.school.name,
    city: state.school.city,
    motto: state.school.motto,
    specialization: state.school.specialization,
    membersAtTransfer: state.school.activeMembers,
    emailsSent: state.statistics.emailsSent,
    eventsCompleted: state.statistics.eventsCompleted,
    transferredAt: now,
    monthlyRent,
    championsWin: rent.championsWin,
    ...(rent.reptileWin ? { reptileWin: rent.reptileWin } : {}),
    ...(rent.chroniclesWin ? { chroniclesWin: true } : {}),
  };
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
      accentColor: details.accentColor,
      motto: details.motto.trim(),
      specialization: details.specialization,
    },
    network: {
      reputation: availableReputation - getSpentReputation(spending),
      reputationUpgrades: Object.fromEntries(REPUTATION_UPGRADE_IDS.map((id) => [
        id,
        getReputationLevel(state, id) + (spending.upgrades[id] ?? 0),
      ])),
      schools: [...state.network.schools, archivedSchool],
      prestigeOfferSent: false,
      secretLegendaries: state.network.secretLegendaries,
      ...(state.network.superbaTournament ? { superbaTournament: true } : {}),
    },
    tournaments: {
      ...fresh.tournaments,
      ordinaryVictoryAchieved: state.tournaments.ordinaryVictoryAchieved,
    },
    achievements: state.achievements,
    moments: state.moments,
    // Scenes already seen (or skipped) in an earlier school never come back.
    tutorial: {
      ...fresh.tutorial,
      completedSceneIds: state.tutorial.completedSceneIds,
      skippedSceneIds: state.tutorial.skippedSceneIds,
    },
    // A discovered secret path stays known in every later school; only its level resets.
    secretUpgradeDiscoveries: state.secretUpgradeDiscoveries,
    legendaryCollaborators: fresh.legendaryCollaborators,
    statistics: recordCareer(addCareer(state, {
      reputationEarned: rent.points,
      perfectPhrases: state.player.perfectPhrases ?? 0,
      gadgetsSold: getSchoolGadgetsSold(state),
    }), {
      maxRentPoints: spending.rent,
      earliestFoundationYear: getSchoolYear(state.school.currentMonth),
    }).statistics,
    messages: state.messages,
    shortGoal: state.shortGoal,
  };
  const announced = addMessage(
    refreshWritingCampaignCopies(nextState),
    now,
    `${details.city.trim()} ha una scuola`,
    `${state.school.name} entra nella Rete` +
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
  const progressed = definition.id === "send-emails" && available.shortGoal.completedCount === 0
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
