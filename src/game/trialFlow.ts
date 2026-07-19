import { COLLABORATOR_MASTERY_XP } from "../content/mastery";
import { ANDREA_SIMONAZZI_ID } from "./contacts";
import { GAME_CONFIG } from "./config";
import { recruitCollaborator } from "./collaboratorFlow";
import { scaleCurrencyGain } from "./economy";
import { getEnrollmentChance } from "./formulas";
import { nextRandom } from "./random";
import {
  addCollaboratorMasteryExperience,
  addMessage,
} from "./stateUpdates";
import type { GameState, ScheduledTrial, SpecialCollaboratorId } from "./types";
import { hasSocialMemberRequirement } from "./unlocks";
import { getCompletedTrialsByMostRecent, getContactsById } from "./runtimeIndexes";

export function getLegendaryEnrollmentChance(
  state: GameState,
  profileId: SpecialCollaboratorId,
): number {
  const previousAttempts = state.legendaryCollaborators.enrollmentAttempts[profileId] ?? 0;
  return getEnrollmentChance(state, "legendary", previousAttempts);
}

export function resolveTrial(
  state: GameState,
  trial: ScheduledTrial,
  now: number,
  gainMultiplier: number,
): GameState {
  if (trial.status !== "scheduled") return state;
  const [enrollmentRoll] = nextRandom(trial.resultSeed);
  const tutorialGuarantee = state.school.historicMembers === 0;
  const contactsById = getContactsById(state.contacts);
  const trialContact = contactsById.get(trial.contactId);
  const specialProfileId = trialContact?.specialProfileId;
  const alreadyEnrolledLegendary = specialProfileId
    ? state.legendaryCollaborators.enrolledProfileIds.includes(specialProfileId)
    : false;
  const guaranteedInitialSchoolAndrea =
    specialProfileId === ANDREA_SIMONAZZI_ID && state.network.schools.length === 0;
  const recentTrials = getCompletedTrialsByMostRecent(state.scheduledTrials);
  const trialLossStreak = recentTrials.findIndex((candidate) =>
    contactsById.get(candidate.contactId)?.status === "enrolled",
  );
  const protectedEnrollment =
    (trialLossStreak === -1 ? recentTrials.length : trialLossStreak) >=
      GAME_CONFIG.conversionGuaranteeFailures;
  const enrolled = specialProfileId
    ? !alreadyEnrolledLegendary &&
      (guaranteedInitialSchoolAndrea ||
        enrollmentRoll < getLegendaryEnrollmentChance(state, specialProfileId))
    : tutorialGuarantee || protectedEnrollment ||
      enrollmentRoll < getEnrollmentChance(state, trialContact?.rarity ?? "common");
  const enrollmentBonus = scaleCurrencyGain(GAME_CONFIG.enrollmentBonus, gainMultiplier);
  const legendaryCollaborators = specialProfileId
    ? {
        ...state.legendaryCollaborators,
        enrollmentAttempts: {
          ...state.legendaryCollaborators.enrollmentAttempts,
          [specialProfileId]:
            (state.legendaryCollaborators.enrollmentAttempts[specialProfileId] ?? 0) + 1,
        },
        enrolledProfileIds: enrolled
          ? [...new Set([...state.legendaryCollaborators.enrolledProfileIds, specialProfileId])]
          : state.legendaryCollaborators.enrolledProfileIds,
      }
    : state.legendaryCollaborators;
  let nextState: GameState = {
    ...state,
    legendaryCollaborators,
    scheduledTrials: state.scheduledTrials.map((candidate) =>
      candidate.id === trial.id ? { ...candidate, status: "completed" } : candidate,
    ),
    contacts: state.contacts.map((contact) =>
      contact.id === trial.contactId
        ? {
            ...contact,
            status: enrolled ? "enrolled" : "lost",
            enrolledMonth: enrolled ? state.school.currentMonth : undefined,
          }
        : contact,
    ),
    statistics: {
      ...state.statistics,
      trialsCompleted: state.statistics.trialsCompleted + 1,
      contactsLost: state.statistics.contactsLost + (enrolled ? 0 : 1),
      membersEnrolled: state.statistics.membersEnrolled + (enrolled ? 1 : 0),
      eurosEarned: state.statistics.eurosEarned + (enrolled ? enrollmentBonus : 0),
    },
  };

  nextState = addCollaboratorMasteryExperience(
    nextState,
    "lessons",
    COLLABORATOR_MASTERY_XP.lessonCompleted,
    now,
  );

  if (!enrolled) return nextState;

  const firstEnrollment = state.school.historicMembers === 0;
  const nextActiveMembers = nextState.school.activeMembers + 1;
  const socialUnlockedNow = !state.unlocks.social &&
    hasSocialMemberRequirement(nextActiveMembers);
  nextState = {
    ...nextState,
    school: {
      ...nextState.school,
      activeMembers: nextState.school.activeMembers + 1,
      peakActiveMembers: Math.max(
        nextState.school.peakActiveMembers,
        nextState.school.activeMembers + 1,
      ),
      historicMembers: nextState.school.historicMembers + 1,
      euros: nextState.school.euros + enrollmentBonus,
    },
    unlocks: {
      ...nextState.unlocks,
      upgrades: true,
      social: hasSocialMemberRequirement(nextActiveMembers),
      forms: true,
    },
  };
  nextState = addMessage(
    nextState,
    now,
    firstEnrollment ? "Primo iscritto registrato" : "Nuovo iscritto registrato",
    firstEnrollment
      ? `Bonus di iscrizione di € ${enrollmentBonus.toFixed(2).replace(".", ",")} accreditato. I registri Iscritti e Upgrade sono ora disponibili nella barra laterale.`
      : `Bonus di iscrizione di € ${enrollmentBonus.toFixed(2).replace(".", ",")} accreditato. La quota mensile di € ${GAME_CONFIG.monthlyMemberFee.toFixed(2).replace(".", ",")} arriverà al prossimo cambio mese.`,
    "positive",
    firstEnrollment ? "focused" : "other",
    firstEnrollment ? undefined : "members",
  );
  if (socialUnlockedNow) {
    nextState = addMessage(
      nextState,
      now + 1,
      "Canale Social disponibile",
      "La scuola ha dimensioni sufficienti per sostenere campagne e raccolta passiva di contatti. Il nuovo pannello è disponibile in Attività.",
      "system",
    );
  }
  const enrolledContact = getContactsById(nextState.contacts).get(trial.contactId);
  return enrolledContact?.rarity === "legendary"
    ? recruitCollaborator(nextState, enrolledContact, now)
    : nextState;
}
