import { getNewAchievements } from "../content/achievements";
import {
  SHORT_GOALS,
  createNextShortGoal,
  getShortGoalProgress,
  getShortGoalReward,
} from "../content/shortGoals";
import { formatCurrency } from "../shared/formatters";
import { refreshWritingCampaignCopies } from "./campaignContent";
import { GAME_CONFIG } from "./config";
import { scaleCurrencyGain } from "./economy";
import { getWritingPower } from "./formulas";
import { makeGameId } from "./ids";
import { createInitialState } from "./initialState";
import { canFoundSchool } from "./progression";
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
      formBranchPreferences: [
        ...(collaborator?.formBranchPreferences ?? contact.formBranchPreferences ?? []),
      ],
      joinedAt: collaborator?.joinedAt ?? contact.acquiredAt,
      lastFormTrainingYear:
        collaborator?.lastFormTrainingYear ?? contact.lastFormTrainingYear,
    };
  }
  return {
    ...state.legendaryCollaborators,
    enrolledProfileIds: [],
    retainedProgress,
  };
}

export function foundSchool(
  state: GameState,
  details: SchoolFoundationDetails,
  now: number,
): GameState {
  if (!canFoundSchool(state) || !details.name.trim() || !details.city.trim()) return state;
  const legendaryProgress = prepareLegendaryProgressForNewSchool(state);
  const fresh = createInitialState(now, state.profile.displayName, false, legendaryProgress);
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
      historicMembers: state.school.historicMembers,
    },
    network: {
      reputation: state.network.reputation + 1,
      schools: [...state.network.schools, archivedSchool],
      prestigeOfferSent: false,
    },
    achievements: state.achievements,
    legendaryCollaborators: fresh.legendaryCollaborators,
    statistics: state.statistics,
    messages: state.messages,
    shortGoal: state.shortGoal,
  };
  const announced = addMessage(
    refreshWritingCampaignCopies(nextState),
    now,
    `Nuova scuola fondata: ${details.name.trim()}`,
    `La sede di ${details.city.trim()} è operativa. Bonus permanente di rete: +${Math.round((state.network.schools.length + 1) * GAME_CONFIG.prestigeBonusPerSchool * 100)}%.`,
    "system",
  );
  return {
    ...announced,
    player: { writingPower: getWritingPower(announced) },
  };
}

export function grantAchievements(
  state: GameState,
  now: number,
  gainMultiplier: number,
): GameState {
  const earned = getNewAchievements(state);
  if (earned.length === 0) return state;
  const reward = scaleCurrencyGain(
    earned.reduce((total, definition) => total + definition.euroReward, 0),
    gainMultiplier,
  );
  let nextState: GameState = {
    ...state,
    achievements: [...state.achievements, ...earned.map((definition) => definition.id)],
    school: { ...state.school, euros: state.school.euros + reward },
    statistics: { ...state.statistics, eurosEarned: state.statistics.eurosEarned + reward },
  };
  for (const definition of earned) {
    const achievementReward = scaleCurrencyGain(definition.euroReward, gainMultiplier);
    nextState = addMessage(
      nextState,
      now,
      `Traguardo: ${definition.title}`,
      `${definition.description} Premio amministrativo: ${formatCurrency(achievementReward)}.`,
      "system",
      "other",
      "progress",
    );
  }
  return nextState;
}

export function completeShortGoal(
  state: GameState,
  now: number,
  gainMultiplier: number,
): GameState {
  if (getShortGoalProgress(state) < state.shortGoal.target) return state;

  const definition = SHORT_GOALS[state.shortGoal.definitionId];
  const reward = scaleCurrencyGain(getShortGoalReward(state.shortGoal), gainMultiplier);
  const completedCount = state.shortGoal.completedCount + 1;
  const rewarded: GameState = {
    ...state,
    school: { ...state.school, euros: state.school.euros + reward },
    statistics: {
      ...state.statistics,
      eurosEarned: state.statistics.eurosEarned + reward,
    },
  };
  const nextGoal = createNextShortGoal(rewarded, completedCount, now);
  const nextDefinition = SHORT_GOALS[nextGoal.definitionId];
  return addMessage(
    { ...rewarded, shortGoal: nextGoal },
    now,
    `Obiettivo completato: ${definition.title}`,
    `${definition.completionNarrative} Premio operativo: ${formatCurrency(reward)}. Prossima priorità: ${nextDefinition.title}.`,
    "positive",
    "other",
    "progress",
  );
}
