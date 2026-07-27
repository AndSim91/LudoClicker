import type { AcquisitionEventDefinition } from "../content/events";
import { getCollaboratorBaseProductivity } from "../content/forms";
import { getUpgradeEffectTotal } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import { nextRandom } from "./random";
import { getSocialEventPromotionBonus } from "./social";
import type { GameState } from "./types";

export const EVENT_CONTACT_BASE_SCALE = 25 / 27;
export const EVENT_COLLABORATOR_EXPONENT = Math.log10(2);

export function getEventAttendanceBonus(state: GameState): number {
  return Math.max(
    0,
    getUpgradeEffectTotal(state.upgrades, "eventAttendanceMultiplier") +
      (state.school.specialization === "eventi" ? 0.1 : 0) +
      state.network.schools.length * GAME_CONFIG.prestigeBonusPerSchool +
      (state.unlocks.social
        ? getSocialEventPromotionBonus(state.school.followers)
        : 0),
  );
}

export function getEventCharismaBonus(state: GameState): number {
  return Math.max(0, getUpgradeEffectTotal(state.upgrades, "eventContactsMultiplier"));
}

export function getEventCollaboratorMultiplier(state: GameState): number {
  const effectiveCollaborators = state.collaborators
    .filter((collaborator) => collaborator.assignment === "events")
    .reduce(
      (total, collaborator) => total + getCollaboratorBaseProductivity(collaborator),
      0,
    );
  return Math.max(1, effectiveCollaborators) ** EVENT_COLLABORATOR_EXPONENT;
}

export function getEventCollaboratorBonus(state: GameState): number {
  return getEventCollaboratorMultiplier(state) - 1;
}

export function getEventMarketAvailability(state: GameState): number {
  const depletedMembers = Math.max(
    0,
    state.school.activeMembers - GAME_CONFIG.eventContactProtectedActiveMembers,
  );
  const easyMarketMembers = Math.max(1, GAME_CONFIG.eventContactEasyMarketMembers);
  return easyMarketMembers / (easyMarketMembers + depletedMembers);
}

export function getEventContactBonus(state: GameState): number {
  const progressionMultiplier = 1 +
    getEventAttendanceBonus(state) +
    getEventCharismaBonus(state);
  return getEventCollaboratorMultiplier(state) * progressionMultiplier - 1;
}

export function getEventContactMultiplier(state: GameState): number {
  return EVENT_CONTACT_BASE_SCALE *
    getEventMarketAvailability(state) *
    (1 + getEventContactBonus(state));
}

export function getBaseExpectedEventContacts(
  definition: AcquisitionEventDefinition,
): number {
  const totalWeight = definition.contactOutcomes.reduce(
    (total, outcome) => total + outcome.weight,
    0,
  );
  if (totalWeight <= 0) return 0;
  return definition.contactOutcomes.reduce(
    (total, outcome) => total + outcome.weight * ((outcome.min + outcome.max) / 2),
    0,
  ) / totalWeight;
}

export function getExpectedEventContacts(
  state: GameState,
  definition: AcquisitionEventDefinition,
): number {
  return getBaseExpectedEventContacts(definition) * getEventContactMultiplier(state);
}

function rollIntegerInclusive(seed: number, minimum: number, maximum: number) {
  if (maximum <= minimum) return { amount: minimum, nextSeed: seed };
  const [roll, nextSeed] = nextRandom(seed);
  return {
    amount: minimum + Math.floor(roll * (maximum - minimum + 1)),
    nextSeed,
  };
}

function rollBaseReward(seed: number, definition: AcquisitionEventDefinition) {
  const totalWeight = definition.contactOutcomes.reduce(
    (total, outcome) => total + outcome.weight,
    0,
  );
  const [roll, seedAfterBand] = nextRandom(seed);
  let threshold = roll * totalWeight;
  const selected = definition.contactOutcomes.find((outcome) => {
    threshold -= outcome.weight;
    return threshold < 0;
  }) ?? definition.contactOutcomes.at(-1);
  if (!selected) return { amount: 0, nextSeed: seedAfterBand };
  return rollIntegerInclusive(seedAfterBand, selected.min, selected.max);
}

function rollExpectedAmount(seed: number, expectedAmount: number) {
  const safeExpected = Math.max(0, expectedAmount);
  const whole = Math.floor(safeExpected);
  const fraction = safeExpected - whole;
  if (fraction <= 0) return { amount: whole, nextSeed: seed };
  const [roll, nextSeed] = nextRandom(seed);
  return { amount: whole + (roll < fraction ? 1 : 0), nextSeed };
}

export function rollEventContactReward(
  state: GameState,
  definition: AcquisitionEventDefinition,
) {
  const base = rollBaseReward(state.randomSeed, definition);
  const marketAdjustedBaseScale = EVENT_CONTACT_BASE_SCALE *
    getEventMarketAvailability(state);
  const normalizedBase = rollExpectedAmount(
    base.nextSeed,
    base.amount * marketAdjustedBaseScale,
  );
  const baseExpected = getBaseExpectedEventContacts(definition);
  const additionalMultiplier = Math.max(
    0,
    getEventContactMultiplier(state) - marketAdjustedBaseScale,
  );
  const bonus = rollExpectedAmount(
    normalizedBase.nextSeed,
    baseExpected * additionalMultiplier,
  );
  const rolledAmount = normalizedBase.amount + bonus.amount;
  const minimumAmount = state.collaborators.length <
      GAME_CONFIG.eventZeroContactProtectionCollaboratorThreshold
    ? 1
    : 0;
  return {
    amount: Math.max(minimumAmount, rolledAmount),
    baseAmount: normalizedBase.amount,
    bonusAmount: bonus.amount,
    nextSeed: bonus.nextSeed,
  };
}
