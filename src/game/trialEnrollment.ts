import { getSchoolYear } from "./calendar";
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

/**
 * Rete di sicurezza (20/10/2026): from the second school, a school that reaches its
 * second school year with fewer than 3 collaborators enrolls the next Leggendari for
 * sure. Without it a run of failed trials left a school with its one collaborator for
 * years (motore of 19/10: 2 games in 24, 12 schools in 264 at the end of year 2).
 */
export function isCollaboratorSafetyNetActive(state: GameState): boolean {
  return state.network.schoolCount > 0 &&
    getSchoolYear(state.school.currentMonth) >= GAME_CONFIG.collaboratorSafetyNetSchoolYear &&
    state.collaborators.length < GAME_CONFIG.collaboratorSafetyNetCollaborators;
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
      // Andrea Simonazzi always enrolls, in every school.
      specialProfileId === ANDREA_SIMONAZZI_ID ||
      isCollaboratorSafetyNetActive(state) ||
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
