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
import { formatCurrency } from "../shared/formatters";
import { refreshWritingCampaignCopies } from "./campaignContent";
import { GAME_CONFIG } from "./config";
import { scaleCurrencyGain } from "./economy";
import { getWritingPower } from "./formulas";
import { makeGameId } from "./ids";
import { createInitialState } from "./initialState";
import { canFoundSchool } from "./progression";
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
  const fresh = createInitialState(now, state.profile.displayName, false, legendaryProgress);
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
    randomSeed: state.randomSeed,
    school: {
      ...fresh.school,
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
    `Nuova scuola fondata: ${details.name.trim()}`,
    `La sede di ${details.city.trim()} è operativa. ${state.school.name} entra nella Rete dell'Ordine` +
      (monthlyRent > 0 ? ` e ti verserà ${formatRent(monthlyRent)} al mese.` : ".") +
      ` Reputazione guadagnata: ${rent.points} punti, ${availableReputation - getSpentReputation(spending)} ancora da spendere.`,
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
    earned.length === 1 ? `Traguardo sbloccato: ${names[0]}` : `${earned.length} traguardi sbloccati`,
    earned.length === 1
      ? "Lo trovi nella bacheca dei Traguardi della LudoWiki."
      : `${names.slice(0, 3).join(", ")}${earned.length > 3 ? ` e altri ${earned.length - 3}` : ""}. Li trovi nella bacheca dei Traguardi della LudoWiki.`,
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
  const nextDefinition = SHORT_GOALS[nextGoal.definitionId];
  const progressed = definition.id === "send-emails" && available.shortGoal.completedCount === 0
    ? addMessage(
        { ...rewarded, shortGoal: nextGoal },
        now,
        "Ufficio Eventi disponibile",
        "Hai completato la missione dei tre inviti. L'area Eventi è ora disponibile nella barra a sinistra.",
        "system",
      )
    : { ...rewarded, shortGoal: nextGoal };
  return addMessage(
    progressed,
    now,
    `Obiettivo completato: ${definition.title}`,
    `${definition.completionNarrative} Premio operativo: ${formatCurrency(reward)}. Prossima priorità: ${nextDefinition.title}.`,
    "positive",
    "other",
    "progress",
  );
}
