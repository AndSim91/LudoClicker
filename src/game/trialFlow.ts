import { COLLABORATOR_MASTERY_XP } from "../content/mastery";
import { ANDREA_SIMONAZZI_ID } from "./contacts";
import { GAME_CONFIG } from "./config";
import { recruitCollaborator } from "./collaboratorFlow";
import { scaleCurrencyGain } from "./economy";
import { completeEquipmentUse, reserveSwords } from "./equipment";
import { getEnrollmentChance } from "./formulas";
import { nextRandom } from "./random";
import {
  applyLegendaryPityBonus,
  incrementLegendaryPity,
  updateLegendaryPityAfterTrial,
} from "./legendaryPity";
import {
  addCollaboratorMasteryExperience,
  addMessage,
} from "./stateUpdates";
import type { GameState, ScheduledTrial, SpecialCollaboratorId } from "./types";
import { hasSocialMemberRequirement, unlockSocialIfEligible } from "./unlocks";
import { getCompletedTrialsByMostRecent, getContactsById } from "./runtimeIndexes";

export function getLegendaryEnrollmentChance(
  state: GameState,
  profileId: SpecialCollaboratorId,
): number {
  const previousAttempts = state.legendaryCollaborators.enrollmentAttempts[profileId] ?? 0;
  return applyLegendaryPityBonus(
    getEnrollmentChance(state, "legendary", previousAttempts),
    state.legendaryPity,
  );
}

function isTrialEnrollmentGuaranteed(
  state: GameState,
  trial: ScheduledTrial,
): boolean {
  const contactsById = getContactsById(state.contacts);
  const trialContact = contactsById.get(trial.contactId);
  const specialProfileId = trialContact?.specialProfileId;
  if (specialProfileId) {
    if (state.legendaryCollaborators.enrolledProfileIds.includes(specialProfileId)) {
      return false;
    }
    return (
      (specialProfileId === ANDREA_SIMONAZZI_ID && state.network.schools.length === 0) ||
      getLegendaryEnrollmentChance(state, specialProfileId) >= 1
    );
  }

  const recentTrials = getCompletedTrialsByMostRecent(state.scheduledTrials);
  const trialLossStreak = recentTrials.findIndex((candidate) =>
    contactsById.get(candidate.contactId)?.status === "enrolled"
  );
  const protectedEnrollment =
    (trialLossStreak === -1 ? recentTrials.length : trialLossStreak) >=
      GAME_CONFIG.conversionGuaranteeFailures;
  return (
    state.school.historicMembers === 0 ||
    protectedEnrollment ||
    getEnrollmentChance(state, trialContact?.rarity ?? "common") >= 1
  );
}

export function processScheduledTrialStarts(
  state: GameState,
  now: number,
): GameState {
  const trialsToStart = state.scheduledTrials
    .filter((trial) =>
      trial.status === "scheduled" &&
      trial.equipmentUsed === undefined &&
      trial.startsAt <= now
    )
    .sort((left, right) => left.startsAt - right.startsAt);
  if (trialsToStart.length === 0) return state;

  let nextState = state;
  for (const trial of trialsToStart) {
    const reservedEquipment = reserveSwords(nextState.equipment, 1);
    if (reservedEquipment) {
      nextState = {
        ...nextState,
        equipment: reservedEquipment,
        scheduledTrials: nextState.scheduledTrials.map((candidate) =>
          candidate.id === trial.id ? { ...candidate, equipmentUsed: 1 } : candidate
        ),
      };
      continue;
    }

    if (isTrialEnrollmentGuaranteed(nextState, trial)) {
      nextState = {
        ...nextState,
        scheduledTrials: nextState.scheduledTrials.map((candidate) =>
          candidate.id === trial.id ? { ...candidate, equipmentUsed: 0 } : candidate
        ),
      };
      continue;
    }

    const secretProgress = trial.secretLegendaryId
      ? nextState.network.secretLegendaries[trial.secretLegendaryId]
      : undefined;
    nextState = {
      ...nextState,
      scheduledTrials: nextState.scheduledTrials.map((candidate) =>
        candidate.id === trial.id
          ? { ...candidate, status: "cancelled", cancellationReason: "equipment" }
          : candidate
      ),
      contacts: nextState.contacts.map((contact) =>
        contact.id === trial.contactId ? { ...contact, status: "lost" } : contact
      ),
      statistics: {
        ...nextState.statistics,
        contactsLost: nextState.statistics.contactsLost + 1,
      },
      legendaryPity: incrementLegendaryPity(nextState.legendaryPity),
      network: trial.secretLegendaryId && secretProgress
        ? {
            ...nextState.network,
            secretLegendaries: {
              ...nextState.network.secretLegendaries,
              [trial.secretLegendaryId]: { ...secretProgress, status: "external" },
            },
          }
        : nextState.network,
    };
  }
  return nextState;
}

export function resolveTrial(
  state: GameState,
  trial: ScheduledTrial,
  now: number,
  gainMultiplier: number,
): GameState {
  if (trial.status !== "scheduled") return state;
  const startedState = trial.equipmentUsed === undefined
    ? processScheduledTrialStarts(state, now)
    : state;
  const startedTrial = startedState.scheduledTrials.find((candidate) => candidate.id === trial.id);
  if (
    !startedTrial ||
    startedTrial.status !== "scheduled" ||
    startedTrial.equipmentUsed === undefined
  ) {
    return startedState;
  }
  state = startedState;
  trial = startedTrial;
  const [enrollmentRoll] = nextRandom(trial.resultSeed);
  const contactsById = getContactsById(state.contacts);
  const trialContact = contactsById.get(trial.contactId);
  const specialProfileId = trialContact?.specialProfileId;
  const alreadyEnrolledLegendary = specialProfileId
    ? state.legendaryCollaborators.enrolledProfileIds.includes(specialProfileId)
    : false;
  const guaranteedEnrollment =
    trial.equipmentUsed === 0 || isTrialEnrollmentGuaranteed(state, trial);
  const enrolled = specialProfileId
    ? !alreadyEnrolledLegendary &&
      (guaranteedEnrollment ||
        enrollmentRoll < getLegendaryEnrollmentChance(state, specialProfileId))
    : guaranteedEnrollment ||
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
    equipment: completeEquipmentUse(
      state.equipment,
      trial.equipmentUsed ?? 0,
      trial.equipmentUsed === 0
        ? 0
        : trial.secretLegendaryId
          ? GAME_CONFIG.equipmentLoadPerSecretLegendaryTrial
          : GAME_CONFIG.equipmentLoadPerTrial,
    ),
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
    legendaryPity: updateLegendaryPityAfterTrial(
      state.legendaryPity,
      enrolled,
      Boolean(specialProfileId),
    ),
  };

  if (trial.secretLegendaryId) {
    const progress = state.network.secretLegendaries[trial.secretLegendaryId];
    nextState = {
      ...nextState,
      network: {
        ...nextState.network,
        secretLegendaries: {
          ...nextState.network.secretLegendaries,
          [trial.secretLegendaryId]: enrolled
            ? { ...progress, status: "enrolled", enrolledContactId: trial.contactId }
            : {
                ...progress,
                status: "external",
                failedTrials: progress.failedTrials + 1,
                enrolledContactId: undefined,
              },
        },
      },
    };
  }

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
  nextState = unlockSocialIfEligible({
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
      forms: true,
    },
  });
  nextState = addMessage(
    nextState,
    now,
    firstEnrollment ? "Primo iscritto registrato" : "Nuovo iscritto registrato",
    firstEnrollment
      ? `Bonus di iscrizione di € ${enrollmentBonus.toFixed(2).replace(".", ",")} accreditato. I registri Iscritti e Upgrade sono ora disponibili nella barra laterale.`
      : `Bonus di iscrizione di € ${enrollmentBonus.toFixed(2).replace(".", ",")} accreditato. La quota mensile parte da € ${GAME_CONFIG.monthlyMemberFee.toFixed(2).replace(".", ",")} e aumenta di € ${GAME_CONFIG.monthlyMemberFormBonus.toFixed(2).replace(".", ",")} per ogni Forma o corso registrato.`,
    "positive",
    firstEnrollment ? "focused" : "other",
    firstEnrollment ? undefined : "members",
  );
  if (socialUnlockedNow) {
    nextState = addMessage(
      nextState,
      now + 1,
      "La Redazione si è evoluta in Social",
      "La scuola ha raggiunto 35 iscritti attivi. I collaboratori Social possono ora produrre contenuti, ottenere follower e contatti e alimentare le sponsorizzazioni mensili.",
      "system",
    );
  }
  const enrolledContact = getContactsById(nextState.contacts).get(trial.contactId);
  return enrolledContact?.rarity === "legendary"
    ? recruitCollaborator(nextState, enrolledContact, now)
    : nextState;
}
