import { ANDREA_SIMONAZZI_ID } from "./contacts";
import { GAME_CONFIG } from "./config";
import { getEnrollmentChance } from "./formulas";
import { applyLegendaryPityBonus } from "./legendaryPity";
import { getCompletedTrialsByMostRecent, getContactsById } from "./runtimeIndexes";
import type { Contact, GameState, ScheduledTrial, SpecialCollaboratorId } from "./types";

export interface TrialEnrollmentGuaranteeContext {
  contactsById: ReadonlyMap<string, Contact>;
  recentTrials: readonly ScheduledTrial[];
  legendaryPity: number;
}

function getLegendaryEnrollmentChanceAtPity(
  state: GameState,
  profileId: SpecialCollaboratorId,
  legendaryPity: number,
): number {
  const previousAttempts = state.legendaryCollaborators.enrollmentAttempts[profileId] ?? 0;
  return applyLegendaryPityBonus(
    getEnrollmentChance(state, "legendary", previousAttempts),
    legendaryPity,
  );
}

export function getLegendaryEnrollmentChance(
  state: GameState,
  profileId: SpecialCollaboratorId,
): number {
  return getLegendaryEnrollmentChanceAtPity(state, profileId, state.legendaryPity);
}

export function isTrialEnrollmentGuaranteed(
  state: GameState,
  trial: ScheduledTrial,
  context: TrialEnrollmentGuaranteeContext = {
    contactsById: getContactsById(state.contacts),
    recentTrials: getCompletedTrialsByMostRecent(state.scheduledTrials),
    legendaryPity: state.legendaryPity,
  },
): boolean {
  const trialContact = context.contactsById.get(trial.contactId);
  const specialProfileId = trialContact?.specialProfileId;
  if (specialProfileId) {
    if (state.legendaryCollaborators.enrolledProfileIds.includes(specialProfileId)) {
      return false;
    }
    return (
      (specialProfileId === ANDREA_SIMONAZZI_ID && state.network.schools.length === 0) ||
      getLegendaryEnrollmentChanceAtPity(state, specialProfileId, context.legendaryPity) >= 1
    );
  }

  const trialLossStreak = context.recentTrials.findIndex(
    (candidate) => context.contactsById.get(candidate.contactId)?.status === "enrolled",
  );
  const protectedEnrollment =
    (trialLossStreak === -1 ? context.recentTrials.length : trialLossStreak) >=
    GAME_CONFIG.conversionGuaranteeFailures;
  return (
    state.school.fame === 0 ||
    protectedEnrollment ||
    getEnrollmentChance(state, trialContact?.rarity ?? "common") >= 1
  );
}
