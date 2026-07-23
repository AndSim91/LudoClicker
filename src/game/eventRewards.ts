import type { AcquisitionEventDefinition } from "../content/events";
import { getCollaboratorBaseProductivity } from "../content/forms";
import { getUpgradeEffectTotal } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import { nextRandom } from "./random";
import type { GameState } from "./types";

export function getEventAttendanceBonus(state: GameState): number {
  return Math.max(
    0,
    getUpgradeEffectTotal(state.upgrades, "eventAttendanceMultiplier") +
      (state.school.specialization === "eventi" ? 0.1 : 0) +
      state.network.schools.length * GAME_CONFIG.prestigeBonusPerSchool,
  );
}

export function getEventCharismaBonus(state: GameState): number {
  return Math.max(0, getUpgradeEffectTotal(state.upgrades, "eventContactsMultiplier"));
}

export function getEventCollaboratorBonus(state: GameState): number {
  return state.collaborators
    .filter((collaborator) => collaborator.assignment === "events")
    .reduce(
      (total, collaborator) => total + getCollaboratorBaseProductivity(collaborator) * 0.1,
      0,
    );
}

export function getEventContactBonus(state: GameState): number {
  return getEventAttendanceBonus(state) +
    getEventCharismaBonus(state) +
    getEventCollaboratorBonus(state);
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
  return getBaseExpectedEventContacts(definition) * (1 + getEventContactBonus(state));
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
  const bonus = rollExpectedAmount(
    base.nextSeed,
    getBaseExpectedEventContacts(definition) * getEventContactBonus(state),
  );
  return {
    amount: base.amount + bonus.amount,
    baseAmount: base.amount,
    bonusAmount: bonus.amount,
    nextSeed: bonus.nextSeed,
  };
}
