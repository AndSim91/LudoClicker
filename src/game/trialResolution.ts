import { formatCurrency } from "../shared/formatters";
import {
  addLegendaryEncounters,
  addLegendaryEnrollment,
  createAcquiredContacts,
  mergeAcquiredContacts,
} from "./contacts";
import { recruitCollaborator } from "./collaboratorFlow";
import { getUpgradeEffectTotal } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import { scaleCurrencyGain } from "./economy";
import { completeEquipmentUse, getPlannedEquipmentWear } from "./equipment";
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
  // Porta un amico: new members who bring a contact, added once after the batch.
  const referralChance = getUpgradeEffectTotal(state.upgrades, "referralChance");
  let referrals = 0;
  // Albo dei Maestri: some new members arrive with Forma 1 already done.
  const formOneChance = getUpgradeEffectTotal(state.upgrades, "enrollmentFormOneChance");

  for (const requestedTrial of requestedTrials) {
    if (requestedTrial.status !== "scheduled") continue;
    const trial = trialsById.get(requestedTrial.id);
    if (!trial || trial.status !== "scheduled" || trial.equipmentUsed === undefined) continue;

    const stateBeforeTrial = nextState;
    const [enrollmentRoll, retrySeed] = nextRandom(trial.resultSeed);
    const [retryRoll, referralSeed] = nextRandom(retrySeed);
    const [referralRoll, formOneSeed] = nextRandom(referralSeed);
    const [formOneRoll] = nextRandom(formOneSeed);
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
    const recoveredForSecondAttempt = Boolean(
      !enrolled &&
      !alreadyEnrolledLegendary &&
      trialContact &&
      !trialContact.secretLegendaryId &&
      !trial.secretLegendaryId &&
      !trialContact.trialRetryUsed &&
      retryRoll < getUpgradeEffectTotal(
        stateBeforeTrial.upgrades,
        "failedTrialRetryChance",
      ),
    );
    const attempted = specialProfileId
      ? {
          ...stateBeforeTrial.legendaryCollaborators,
          enrollmentAttempts: {
            ...stateBeforeTrial.legendaryCollaborators.enrollmentAttempts,
            [specialProfileId]:
              (stateBeforeTrial.legendaryCollaborators.enrollmentAttempts[specialProfileId] ?? 0) +
              1,
          },
        }
      : stateBeforeTrial.legendaryCollaborators;
    const legendaryCollaborators = specialProfileId && enrolled
      ? addLegendaryEnrollment(attempted, specialProfileId)
      : attempted;
    const completedTrial: ScheduledTrial = { ...trial, status: "completed" };
    const resolvedContact: Contact | undefined = trialContact
      ? {
          ...trialContact,
          status: enrolled
            ? "enrolled"
            : recoveredForSecondAttempt
              ? "available"
              : "lost",
          enrolledMonth: enrolled ? stateBeforeTrial.school.currentMonth : undefined,
          ...(enrolled && trialContact.forms.length === 0 && formOneRoll < formOneChance
            ? { forms: ["form-1" as const] }
            : {}),
          trialRetryUsed: recoveredForSecondAttempt || trialContact.trialRetryUsed,
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
        getPlannedEquipmentWear(stateBeforeTrial.upgrades, trial.equipmentUsed === 0
          ? 0
          : trial.secretLegendaryId
            ? GAME_CONFIG.equipmentLoadPerSecretLegendaryTrial
            : GAME_CONFIG.equipmentLoadPerTrial),
      ),
      legendaryCollaborators,
      statistics: {
        ...stateBeforeTrial.statistics,
        trialsCompleted: stateBeforeTrial.statistics.trialsCompleted + 1,
        contactsLost: stateBeforeTrial.statistics.contactsLost +
          (enrolled || recoveredForSecondAttempt ? 0 : 1),
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
      if (referralRoll < referralChance) referrals += 1;
      const firstEnrollment = stateBeforeTrial.school.fame === 0;
      nextState = {
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
      };
      // 4.1: after the first one, new members are counted in the yearly digest.
      if (firstEnrollment) nextState = addMessage(
        nextState,
        now,
        "Habemus inscriptum!",
        `Il primo iscritto ha pagato: +${formatCurrency(enrollmentBonus)}. Nella barra a sinistra si sono accese Scuola e Upgrade.`,
        "positive",
        "focused",
      );
      if (resolvedContact?.rarity === "legendary") {
        nextState = recruitCollaborator(nextState, resolvedContact, now);
      }
    } else if (recoveredForSecondAttempt && resolvedContact) {
      nextState = addMessage(
        nextState,
        now,
        `${resolvedContact.firstName} ${resolvedContact.lastName} ci deve pensare`,
        "Niente iscrizione, per ora. Ha accettato un ultimo invito.",
        "neutral",
        "other",
        "contacts",
      );
    }

    resolvedCount += 1;
  }

  if (resolvedCount === 0) return state;
  const resolved: GameState = {
    ...nextState,
    scheduledTrials: state.scheduledTrials.map((trial) => trialUpdates.get(trial.id) ?? trial),
    contacts: state.contacts.map((contact) => contactUpdates.get(contact.id) ?? contact),
  };
  return referrals > 0 ? addReferralContacts(resolved, referrals, now) : resolved;
}

function addReferralContacts(state: GameState, count: number, now: number): GameState {
  const acquired = createAcquiredContacts(state, count, "collaborator", now);
  return {
    ...state,
    randomSeed: acquired.nextSeed,
    contacts: mergeAcquiredContacts(state.contacts, acquired.contacts),
    legendaryCollaborators: addLegendaryEncounters(
      state.legendaryCollaborators,
      acquired.contacts,
    ),
    statistics: {
      ...state.statistics,
      contactsAcquired: state.statistics.contactsAcquired + acquired.contacts.length,
    },
  };
}
