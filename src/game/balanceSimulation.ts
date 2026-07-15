import {
  getUpgradeCost,
  getUpgradeDefinition,
} from "../content/upgrades";
import { canFoundSchool, createInitialState, gameReducer } from "./engine";
import { selectActiveEmail } from "./selectors";
import type {
  CollaboratorAssignment,
  GameState,
  GameAction,
  UpgradeId,
} from "./types";

export type BalancePace = "intense" | "relaxed";

export interface BalanceSimulationOptions {
  seed: number;
  pace: BalancePace;
  horizonMs: number;
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
  "clear-subject",
  "welcome-procedure",
  "outlook-templates",
  "quick-phrases",
  "automatic-signature",
  "qr-cards",
  "tested-intro",
  "coordinated-demo",
  "personalized-invite",
  "shared-calendar",
  "pre-event-check",
  "maintenance-kit",
  "editorial-calendar",
];

function dispatch(state: GameState, action: GameAction): GameState {
  return gameReducer(state, action);
}

function runningEvents(state: GameState) {
  return state.acquisitionEvents.filter((event) => event.status === "running");
}

function assignCollaborators(state: GameState, now: number): GameState {
  let nextState = state;
  for (const [index, collaborator] of state.collaborators.entries()) {
    const assignment: CollaboratorAssignment = index === 0
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

function buyOneAffordableUpgrade(state: GameState, now: number): GameState {
  for (const upgradeId of UPGRADE_PRIORITY) {
    const definition = getUpgradeDefinition(upgradeId);
    if (!definition) continue;
    const level = state.upgrades[upgradeId];
    const cost = getUpgradeCost(definition, level, state.network.schools.length);
    if (
      level < definition.maxLevel &&
      state.school.historicMembers >= definition.requiredHistoricMembers &&
      state.school.euros >= cost
    ) {
      return dispatch(state, { type: "BUY_UPGRADE", upgradeId, now });
    }
  }
  return state;
}

function startBestAvailableActivity(state: GameState, now: number): GameState {
  const hasRunningParkSparring = state.acquisitionEvents.some(
    (event) => event.definitionId === "park-sparring" && event.status === "running",
  );
  let nextState = state;
  if (!hasRunningParkSparring && now >= state.activities.nextSparringAt) {
    nextState = dispatch(nextState, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "park-sparring",
      now,
    });
  }
  return nextState;
}

function maintainEquipmentWhenSafe(state: GameState, now: number): GameState {
  if (
    state.equipment.wear <= 0 ||
    state.school.euros < 10 ||
    runningEvents(state).length > 0
  ) return state;
  return dispatch(state, { type: "MAINTAIN_EQUIPMENT", now });
}

function takeStrategicActions(
  state: GameState,
  now: number,
): GameState {
  let nextState = assignCollaborators(state, now);
  nextState = buyOneAffordableUpgrade(nextState, now);
  nextState = startBestAvailableActivity(nextState, now);
  return maintainEquipmentWhenSafe(nextState, now);
}

export function simulateBalanceGame({
  seed,
  pace,
  horizonMs,
}: BalanceSimulationOptions): BalanceSimulationResult {
  const startedAt = SIMULATION_START_MS + seed * 100_000;
  let state = createInitialState(startedAt, `Simulazione ${seed}`);
  const inputsPerTick = pace === "intense"
    ? INTENSE_INPUTS_PER_TICK
    : RELAXED_INPUTS_PER_TICK;
  let prestigeReadyAtMs: number | undefined;
  for (let elapsedMs = 0; elapsedMs <= horizonMs; elapsedMs += SIMULATION_TICK_MS) {
    const now = startedAt + elapsedMs;
    state = dispatch(state, { type: "TICK", now });
    state = takeStrategicActions(state, now);

    const activeEmail = selectActiveEmail(state);
    if (activeEmail?.status === "writing") {
      for (let input = 0; input < inputsPerTick; input += 1) {
        state = dispatch(state, { type: "WRITE", now });
        if (selectActiveEmail(state)?.status !== "writing") break;
      }
    }
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
): Promise<BalanceSimulationResult[]> {
  return Promise.all(
    seeds.map((seed) =>
      Promise.resolve().then(() => simulateBalanceGame({ seed, pace, horizonMs })),
    ),
  );
}

export function percentile(values: number[], quantile: number): number {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  const ordered = values.slice().sort((left, right) => left - right);
  const index = Math.ceil(ordered.length * quantile) - 1;
  return ordered[Math.max(0, Math.min(ordered.length - 1, index))];
}
