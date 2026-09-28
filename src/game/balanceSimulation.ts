import { getAvailableForms, getInstructorFormCost } from "../content/forms";
import {
  getAnnualFormTrainingLimit,
  getUpgradeCost,
  getUpgradeDefinition,
  hasCompletedUpgradePrerequisites,
  isCourseXUnlocked,
} from "../content/upgrades";
import { getAthleteTournamentStats } from "./athleteStats";
import { getFormTrainingYear, isSummerBreak } from "./calendar";
import { canFoundSchool, createInitialState, gameReducer } from "./engine";
import { getEquipmentMinimumMaintenanceCost } from "./equipment";
import { isEventCooldownActive } from "./eventCooldowns";
import { isOfficialSwordSupplierVisible } from "./unlocks";
import { GAME_CONFIG } from "./config";
import { selectActiveEmail } from "./selectors";
import type {
  CollaboratorAssignment,
  GameState,
  GameAction,
  UpgradeId,
} from "./types";

export type BalancePace = "intense" | "relaxed";
/**
 * "basic" only writes, runs events and buys funnel upgrades: it never trains
 * Forms, so it never reaches a tournament. "competitive" (the default) also
 * plays the Insegnamento loop, so the first prestige can actually be measured.
 */
export type BalanceStrategy = "basic" | "competitive";

export interface BalanceSimulationOptions {
  seed: number;
  pace: BalancePace;
  horizonMs: number;
  tickMs?: number;
  strategy?: BalanceStrategy;
  onTick?: (state: GameState, elapsedMs: number) => void;
}

export interface BalanceSimulationResult {
  seed: number;
  pace: BalancePace;
  elapsedMs: number;
  reachedPrestige: boolean;
  prestigeReadyAtMs?: number;
  state: GameState;
}

const SIMULATION_START_MS = 1_700_000_000_000;
const SIMULATION_TICK_MS = 1_000;
const INTENSE_INPUTS_PER_TICK = 6;
const RELAXED_INPUTS_PER_TICK = 1;

// The list intentionally favors upgrades that improve the funnel or let the
// simulator keep writing while decisions are being made. It is a compact,
// repeatable approximation of a player who spends surplus cash rather than a
// second, hidden balance model.
const UPGRADE_PRIORITY: UpgradeId[] = [
  "comfortable-keyboard",
  "prepared-presentation",
  "spell-check",
  "welcome-procedure",
  "professional-email",
  "quick-phrases",
  "writing-rhythm",
  "automatic-signature",
  "qr-cards",
  "tested-intro",
  "coordinated-demo",
  "personalized-invite",
  "stock-phrases",
  "shared-calendar",
  "pre-event-check",
  "maintenance-kit",
  "social-content-synthesis",
];

// A competitive player invests in Insegnamento as soon as the funnel basics
// are in place. The chain technical-arena → instructor-versatility →
// sis-accreditation → cost-of-service → promiscuous-instructor →
// agonist-course-intensity → pagosport follows the in-game prerequisites.
const COMPETITIVE_UPGRADE_PRIORITY: UpgradeId[] = [
  ...UPGRADE_PRIORITY.slice(0, 8),
  "technical-arena",
  "instructor-versatility",
  "sis-accreditation",
  "cost-of-service",
  "promiscuous-instructor",
  "agonist-course-intensity",
  "pagosport",
  ...UPGRADE_PRIORITY.slice(8),
];
// The first four collaborators keep the funnel roles; from the fifth on, every
// fourth one becomes an Istruttore. Until then Forms are booked by hand.
const INSTRUCTOR_EVERY = 4;
const MAX_OFFICIAL_SWORDS = 40;
// Beyond Forma 1 (tournament eligibility) the player pushes its best athletes.
const FOCUSED_ATHLETES = 12;

function dispatch(state: GameState, action: GameAction): GameState {
  return gameReducer(state, action);
}

function runningEvents(state: GameState) {
  return state.acquisitionEvents.filter((event) => event.status === "running");
}

function assignCollaborators(
  state: GameState,
  now: number,
  strategy: BalanceStrategy,
): GameState {
  let nextState = state;
  for (const [index, collaborator] of state.collaborators.entries()) {
    const assignment: CollaboratorAssignment = strategy === "competitive" &&
        index >= INSTRUCTOR_EVERY && index % INSTRUCTOR_EVERY === 0
      ? "instructor"
      : index === 0
      ? "writing"
      : index === 1 || index === 2
        ? "events"
        : index === 3
          ? "equipment"
          : "writing";
    if (collaborator.assignment === assignment) continue;
    nextState = dispatch(nextState, {
      type: "ASSIGN_COLLABORATOR",
      collaboratorId: collaborator.id,
      assignment,
      now,
    });
  }
  return nextState;
}

function buyOneAffordableUpgrade(
  state: GameState,
  now: number,
  strategy: BalanceStrategy,
): GameState {
  const priority = strategy === "competitive" ? COMPETITIVE_UPGRADE_PRIORITY : UPGRADE_PRIORITY;
  for (const upgradeId of priority) {
    const definition = getUpgradeDefinition(upgradeId);
    if (!definition) continue;
    const level = state.upgrades[upgradeId];
    const cost = getUpgradeCost(definition, level, state.network.schools.length);
    if (
      level < definition.maxLevel &&
      state.school.fame >= definition.requiredFame &&
      state.school.euros >= cost &&
      // The basic list keeps its historical behaviour (it stops at the first
      // affordable entry); the competitive one skips locked entries.
      (strategy === "basic" || hasCompletedUpgradePrerequisites(state.upgrades, definition))
    ) {
      const nextState = dispatch(state, { type: "BUY_UPGRADE", upgradeId, now });
      if (strategy === "basic" || nextState !== state) return nextState;
    }
  }
  return state;
}

function tryFormTraining(
  state: GameState,
  student: Parameters<typeof getAvailableForms>[0] & { id: string },
  now: number,
  isInstructor: boolean,
): GameState {
  const trainingYear = getFormTrainingYear(state.school.currentMonth);
  const forms = getAvailableForms(
    student,
    trainingYear,
    isInstructor ? 3 : undefined,
    !isInstructor,
    getAnnualFormTrainingLimit(state.upgrades),
    isCourseXUnlocked(state.upgrades),
  );
  for (const form of forms) {
    const cost = isInstructor ? getInstructorFormCost(form.cost) : form.cost;
    if (state.school.euros < cost) return state;
    const nextState = dispatch(state, {
      type: "START_FORM_TRAINING",
      personId: student.id,
      formId: form.id,
      now,
    });
    if (nextState !== state) return nextState;
  }
  return state;
}

// Istruttori first certify what they already know, then learn their next Form
// (the combined path also grants the attestation). Summer is the natural window.
function trainInstructors(state: GameState, now: number): GameState {
  let nextState = state;
  for (const instructor of state.collaborators) {
    if (instructor.assignment !== "instructor" || instructor.training) continue;
    const uncertified = instructor.forms.find(
      (formId) => !instructor.instructorForms.includes(formId),
    );
    if (uncertified) {
      nextState = dispatch(nextState, {
        type: "START_FORM_TRAINING",
        personId: instructor.id,
        formId: uncertified,
        now,
      });
      continue;
    }
    nextState = tryFormTraining(nextState, instructor, now, true);
  }
  return nextState;
}

// Automatic teaching covers whatever the Istruttori can teach. The player
// books the rest by hand: Forma 1 for everybody (tournament eligibility) and
// further Forms for the athletes with the best Arena/Style.
function trainMembers(state: GameState, now: number): GameState {
  if (!state.unlocks.forms || isSummerBreak(state.school.currentMonth)) return state;
  const collaboratorContactIds = new Set(
    state.collaborators.map((collaborator) => collaborator.contactId),
  );
  const members = state.contacts
    .filter((contact) =>
      contact.status === "enrolled" &&
      !contact.training &&
      !collaboratorContactIds.has(contact.id)
    )
    .map((contact) => {
      const stats = getAthleteTournamentStats(contact);
      return { contact, strength: Math.max(stats.arena, stats.style) };
    })
    .sort((left, right) => right.strength - left.strength);
  let nextState = state;
  for (const [rank, { contact }] of members.entries()) {
    if (contact.forms.includes("form-1") && rank >= FOCUSED_ATHLETES) continue;
    nextState = tryFormTraining(nextState, contact, now, false);
  }
  return nextState;
}

function buySwordsForWaitingTrainings(state: GameState, now: number): GameState {
  const waiting = [...state.contacts, ...state.collaborators].some(
    (person) => person.training?.status === "waitingForEquipment",
  );
  if (
    !waiting ||
    !isOfficialSwordSupplierVisible(state) ||
    state.equipment.totalSwords >= MAX_OFFICIAL_SWORDS ||
    state.school.euros < GAME_CONFIG.officialSwordCost
  ) return state;
  return dispatch(state, { type: "BUY_OFFICIAL_SWORD", now });
}

function startBestAvailableActivity(state: GameState, now: number): GameState {
  const hasRunningParkSparring = state.acquisitionEvents.some(
    (event) => event.definitionId === "park-sparring" && event.status === "running",
  );
  let nextState = state;
  if (
    !hasRunningParkSparring &&
    !isEventCooldownActive(state.activities.eventCooldowns["park-sparring"], state, now)
  ) {
    nextState = dispatch(nextState, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "park-sparring",
      now,
    });
  }
  return nextState;
}

function maintainEquipmentWhenSafe(state: GameState, now: number): GameState {
  const minimumMaintenanceCost = getEquipmentMinimumMaintenanceCost(state.equipment);
  if (
    (state.equipment.wear <= 0 && state.equipment.damagedSwords <= 0) ||
    state.school.euros < minimumMaintenanceCost ||
    runningEvents(state).length > 0
  ) return state;
  return dispatch(state, { type: "MAINTAIN_EQUIPMENT", now });
}

function takeStrategicActions(
  state: GameState,
  now: number,
  strategy: BalanceStrategy,
): GameState {
  let nextState = assignCollaborators(state, now, strategy);
  nextState = buyOneAffordableUpgrade(nextState, now, strategy);
  if (strategy === "competitive") {
    nextState = trainInstructors(nextState, now);
    nextState = trainMembers(nextState, now);
    nextState = buySwordsForWaitingTrainings(nextState, now);
  }
  nextState = startBestAvailableActivity(nextState, now);
  return maintainEquipmentWhenSafe(nextState, now);
}

export function simulateBalanceGame({
  seed,
  pace,
  horizonMs,
  tickMs = SIMULATION_TICK_MS,
  strategy = "competitive",
  onTick,
}: BalanceSimulationOptions): BalanceSimulationResult {
  const startedAt = SIMULATION_START_MS + seed * 100_000;
  let state = createInitialState(startedAt, `Simulazione ${seed}`);
  const inputsPerSecond = pace === "intense"
    ? INTENSE_INPUTS_PER_TICK
    : RELAXED_INPUTS_PER_TICK;
  const inputsPerTick = Math.max(
    1,
    Math.round(inputsPerSecond * tickMs / SIMULATION_TICK_MS),
  );
  let prestigeReadyAtMs: number | undefined;
  for (let elapsedMs = 0; elapsedMs <= horizonMs; elapsedMs += tickMs) {
    const now = startedAt + elapsedMs;
    state = dispatch(state, { type: "TICK", now });
    state = takeStrategicActions(state, now, strategy);

    const activeEmail = selectActiveEmail(state);
    if (activeEmail?.status === "writing") {
      for (let input = 0; input < inputsPerTick; input += 1) {
        state = dispatch(state, { type: "WRITE", now });
        if (selectActiveEmail(state)?.status !== "writing") break;
      }
    }
    if (selectActiveEmail(state)?.status === "readyToSend") {
      state = dispatch(state, { type: "SEND_EMAIL", now });
    }
    onTick?.(state, elapsedMs);
    if (prestigeReadyAtMs === undefined && canFoundSchool(state)) {
      prestigeReadyAtMs = elapsedMs;
      break;
    }
  }

  return {
    seed,
    pace,
    elapsedMs: prestigeReadyAtMs ?? horizonMs,
    reachedPrestige: prestigeReadyAtMs !== undefined,
    prestigeReadyAtMs,
    state,
  };
}

export async function simulateBalanceBatch(
  seeds: number[],
  pace: BalancePace,
  horizonMs: number,
  tickMs = SIMULATION_TICK_MS,
  strategy: BalanceStrategy = "competitive",
): Promise<BalanceSimulationResult[]> {
  return Promise.all(
    seeds.map((seed) =>
      Promise.resolve().then(() =>
        simulateBalanceGame({ seed, pace, horizonMs, tickMs, strategy })
      ),
    ),
  );
}

export function percentile(values: number[], quantile: number): number {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  const ordered = values.slice().sort((left, right) => left - right);
  const index = Math.ceil(ordered.length * quantile) - 1;
  return ordered[Math.max(0, Math.min(ordered.length - 1, index))];
}
