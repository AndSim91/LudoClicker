import { recruitCollaborator } from "./collaboratorFlow";
import { GAME_CONFIG } from "./config";
import { scaleCurrencyGain } from "./economy";
import { completeEquipmentUse } from "./equipment";
import { getEnrollmentChance } from "./formulas";
import { updateLegendaryPityAfterTrial } from "./legendaryPity";
import { nextRandom } from "./random";
import { getCompletedTrialsByMostRecent, getContactsById } from "./runtimeIndexes";
import { addMessage } from "./stateUpdates";
import {
  getLegendaryEnrollmentChance,
  isTrialEnrollmentGuaranteed,
} from "./trialEnrollment";
import type { Contact, GameState, ScheduledTrial } from "./types";
import { hasSocialMemberRequirement, unlockSocialIfEligible } from "./unlocks";

function compareCompletedTrials(
  left: ScheduledTrial,
  right: ScheduledTrial,
  trialPositions: ReadonlyMap<string, number>,
): number {
  const timeDifference = right.resolvesAt - left.resolvesAt;
  if (timeDifference !== 0) return timeDifference;
  return (trialPositions.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
    (trialPositions.get(right.id) ?? Number.MAX_SAFE_INTEGER);
}

function insertCompletedTrial(
  recentTrials: ScheduledTrial[],
  completedTrial: ScheduledTrial,
  trialPositions: ReadonlyMap<string, number>,
): void {
  let start = 0;
  let end = recentTrials.length;
  while (start < end) {
    const middle = Math.floor((start + end) / 2);
    if (compareCompletedTrials(completedTrial, recentTrials[middle], trialPositions) < 0) {
      end = middle;
    } else {
      start = middle + 1;
    }
  }
  recentTrials.splice(start, 0, completedTrial);
}

/**
 * Risolve le prove gia avviate in sequenza, ma materializza le due collezioni
 * principali una sola volta. L'ordine delle decisioni resta quello ricevuto.
 */
export function resolveStartedTrialBatch(
  state: GameState,
  requestedTrials: readonly ScheduledTrial[],
  now: number,
  gainMultiplier: number,
): GameState {
  if (requestedTrials.length === 0) return state;

  const trialsById = new Map(state.scheduledTrials.map((trial) => [trial.id, trial]));
  const contactsById = new Map(getContactsById(state.contacts));
  const recentTrials = [...getCompletedTrialsByMostRecent(state.scheduledTrials)];
  const trialPositions = new Map(
    state.scheduledTrials.map((trial, index) => [trial.id, index]),
  );
  const trialUpdates = new Map<string, ScheduledTrial>();
  const contactUpdates = new Map<string, Contact>();
  const enrollmentBonus = scaleCurrencyGain(GAME_CONFIG.enrollmentBonus, gainMultiplier);
  let nextState = state;
  let resolvedCount = 0;

  for (const requestedTrial of requestedTrials) {
    if (requestedTrial.status !== "scheduled") continue;
    const trial = trialsById.get(requestedTrial.id);
    if (!trial || trial.status !== "scheduled" || trial.equipmentUsed === undefined) continue;

    const stateBeforeTrial = nextState;
    const [enrollmentRoll] = nextRandom(trial.resultSeed);
    const trialContact = contactsById.get(trial.contactId);
    const specialProfileId = trialContact?.specialProfileId;
    const alreadyEnrolledLegendary = specialProfileId
      ? stateBeforeTrial.legendaryCollaborators.enrolledProfileIds.includes(specialProfileId)
      : false;
    const guaranteedEnrollment = trial.equipmentUsed === 0 ||
      isTrialEnrollmentGuaranteed(stateBeforeTrial, trial, {
        contactsById,
        recentTrials,
        legendaryPity: stateBeforeTrial.legendaryPity,
      });
    const enrolled = specialProfileId
      ? !alreadyEnrolledLegendary &&
        (guaranteedEnrollment ||
          enrollmentRoll < getLegendaryEnrollmentChance(stateBeforeTrial, specialProfileId))
      : guaranteedEnrollment ||
        enrollmentRoll < getEnrollmentChance(
          stateBeforeTrial,
          trialContact?.rarity ?? "common",
        );
    const legendaryCollaborators = specialProfileId
      ? {
          ...stateBeforeTrial.legendaryCollaborators,
          enrollmentAttempts: {
            ...stateBeforeTrial.legendaryCollaborators.enrollmentAttempts,
            [specialProfileId]:
              (stateBeforeTrial.legendaryCollaborators.enrollmentAttempts[specialProfileId] ?? 0) +
              1,
          },
          enrolledProfileIds: enrolled
            ? [...new Set([
                ...stateBeforeTrial.legendaryCollaborators.enrolledProfileIds,
                specialProfileId,
              ])]
            : stateBeforeTrial.legendaryCollaborators.enrolledProfileIds,
        }
      : stateBeforeTrial.legendaryCollaborators;
    const completedTrial: ScheduledTrial = { ...trial, status: "completed" };
    const resolvedContact: Contact | undefined = trialContact
      ? {
          ...trialContact,
          status: enrolled ? "enrolled" : "lost",
          enrolledMonth: enrolled ? stateBeforeTrial.school.currentMonth : undefined,
        }
      : undefined;

    trialsById.set(trial.id, completedTrial);
    trialUpdates.set(trial.id, completedTrial);
    insertCompletedTrial(recentTrials, completedTrial, trialPositions);
    if (resolvedContact) {
      contactsById.set(resolvedContact.id, resolvedContact);
      contactUpdates.set(resolvedContact.id, resolvedContact);
    }

    nextState = {
      ...stateBeforeTrial,
      equipment: completeEquipmentUse(
        stateBeforeTrial.equipment,
        trial.equipmentUsed,
        trial.equipmentUsed === 0
          ? 0
          : trial.secretLegendaryId
            ? GAME_CONFIG.equipmentLoadPerSecretLegendaryTrial
            : GAME_CONFIG.equipmentLoadPerTrial,
      ),
      legendaryCollaborators,
      statistics: {
        ...stateBeforeTrial.statistics,
        trialsCompleted: stateBeforeTrial.statistics.trialsCompleted + 1,
        contactsLost: stateBeforeTrial.statistics.contactsLost + (enrolled ? 0 : 1),
        membersEnrolled: stateBeforeTrial.statistics.membersEnrolled + (enrolled ? 1 : 0),
        eurosEarned:
          stateBeforeTrial.statistics.eurosEarned + (enrolled ? enrollmentBonus : 0),
      },
      legendaryPity: updateLegendaryPityAfterTrial(
        stateBeforeTrial.legendaryPity,
        enrolled,
        Boolean(specialProfileId),
      ),
    };

    if (trial.secretLegendaryId) {
      const progress = stateBeforeTrial.network.secretLegendaries[trial.secretLegendaryId];
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

    if (enrolled) {
      const firstEnrollment = stateBeforeTrial.school.fame === 0;
      const nextActiveMembers = nextState.school.activeMembers + 1;
      const socialUnlockedNow = !stateBeforeTrial.unlocks.social &&
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
          fame: nextState.school.fame + 1,
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
      if (resolvedContact?.rarity === "legendary") {
        nextState = recruitCollaborator(nextState, resolvedContact, now);
      }
    }

    resolvedCount += 1;
  }

  if (resolvedCount === 0) return state;
  return {
    ...nextState,
    scheduledTrials: state.scheduledTrials.map((trial) => trialUpdates.get(trial.id) ?? trial),
    contacts: state.contacts.map((contact) => contactUpdates.get(contact.id) ?? contact),
  };
}
