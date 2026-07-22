import { describe, expect, it } from "vitest";
import { FORM_DEFINITIONS } from "../content/forms";
import { GAME_CONFIG } from "./config";
import { createInitialState, gameReducer } from "./engine";
import { getEquipmentMaintenanceCost } from "./equipment";
import { getMemberAnnualDepartureChance } from "./formulas";
import { nextRandom } from "./random";
import { selectActiveEmail } from "./selectors";
import type { FormId, GameState } from "./types";

const INPUTS_PER_SECOND = 6;
const MAX_EARLY_GAME_MS = 45 * 60_000;
const BALANCE_RUNS = 120;

interface EarlyGameMilestones {
  firstMemberMs?: number;
  firstUpgradeMs?: number;
  firstCollaboratorMs?: number;
}

function percentile(values: number[], quantile: number): number {
  const ordered = values.slice().sort((left, right) => left - right);
  const index = Math.ceil(ordered.length * quantile) - 1;
  return ordered[Math.max(0, Math.min(ordered.length - 1, index))];
}

function nextScheduledTime(state: GameState, now: number): number | undefined {
  const scheduledTimes = [
    ...state.pendingEmailOutcomes.map((outcome) => outcome.resolvesAt),
    ...state.scheduledTrials
      .filter((trial) => trial.status === "scheduled")
      .map((trial) => trial.resolvesAt),
    ...state.acquisitionEvents
      .filter((event) => event.status === "running")
      .map((event) => event.resolvesAt),
    state.school.nextFeeAt,
    state.narrative.nextEventAt,
    state.activities.nextSparringAt,
  ].filter((time) => time > now);

  return scheduledTimes.length > 0 ? Math.min(...scheduledTimes) : undefined;
}

function recordMilestones(
  state: GameState,
  elapsedMs: number,
  milestones: EarlyGameMilestones,
): void {
  if (milestones.firstMemberMs === undefined && state.school.historicMembers > 0) {
    milestones.firstMemberMs = elapsedMs;
  }
  if (
    milestones.firstUpgradeMs === undefined &&
    state.upgrades["prepared-presentation"] > 0
  ) {
    milestones.firstUpgradeMs = elapsedMs;
  }
  if (milestones.firstCollaboratorMs === undefined && state.collaborators.length > 0) {
    milestones.firstCollaboratorMs = elapsedMs;
  }
}

function simulateEarlyGame(seed: number): EarlyGameMilestones {
  const startedAt = 10_000 + seed * 10_000;
  let now = startedAt;
  let state = createInitialState(startedAt, "Tester bilanciamento");
  const milestones: EarlyGameMilestones = {};

  for (let iteration = 0; iteration < 1_000 && now - startedAt <= MAX_EARLY_GAME_MS; iteration += 1) {
    recordMilestones(state, now - startedAt, milestones);
    if (milestones.firstCollaboratorMs !== undefined && milestones.firstUpgradeMs !== undefined) {
      break;
    }

    if (
      state.unlocks.upgrades &&
      state.upgrades["prepared-presentation"] === 0 &&
      state.school.euros >= 50
    ) {
      state = gameReducer(state, {
        type: "BUY_UPGRADE",
        upgradeId: "prepared-presentation",
        now,
      });
      recordMilestones(state, now - startedAt, milestones);
    }

    const sparringRunning = state.acquisitionEvents.some(
      (event) => event.definitionId === "park-sparring" && event.status === "running",
    );
    if (!sparringRunning && now >= state.activities.nextSparringAt) {
      state = gameReducer(state, {
        type: "START_ACQUISITION_EVENT",
        definitionId: "park-sparring",
        now,
      });
    }

    const maintenanceCost = getEquipmentMaintenanceCost(state.equipment);
    if (
      state.equipment.wear > 0 &&
      state.school.euros >= maintenanceCost &&
      !state.acquisitionEvents.some((event) => event.status === "running")
    ) {
      state = gameReducer(state, { type: "MAINTAIN_EQUIPMENT", now });
    }

    const activeEmail = selectActiveEmail(state);
    if (activeEmail?.status === "writing") {
      const remainingCharacters = activeEmail.body.length - activeEmail.revealedCharacters;
      const writingMs = Math.ceil(
        remainingCharacters / (state.player.writingPower * INPUTS_PER_SECOND) * 1_000,
      );
      now += writingMs;
      state = {
        ...state,
        emails: state.emails.map((email) =>
          email.id === activeEmail.id
            ? { ...email, revealedCharacters: email.body.length - 1 }
            : email,
        ),
      };
      state = gameReducer(state, { type: "WRITE", now });
      state = gameReducer(state, { type: "SEND_EMAIL", now });
      now += GAME_CONFIG.sendDelayMs;
      state = gameReducer(state, { type: "TICK", now });
      continue;
    }

    const nextTime = nextScheduledTime(state, now);
    if (nextTime === undefined) break;
    now = nextTime;
    state = gameReducer(state, { type: "TICK", now });
  }

  recordMilestones(state, now - startedAt, milestones);
  return milestones;
}

describe("automated balance guardrails", () => {
  it("keeps the P90 early-game milestones inside their target windows", () => {
    const runs = Array.from({ length: BALANCE_RUNS }, (_, seed) => simulateEarlyGame(seed + 1));
    const firstMembers = runs.flatMap((run) => run.firstMemberMs ?? []);
    const firstUpgrades = runs.flatMap((run) => run.firstUpgradeMs ?? []);
    const firstCollaborators = runs.flatMap((run) => run.firstCollaboratorMs ?? []);

    expect(firstMembers).toHaveLength(BALANCE_RUNS);
    expect(firstUpgrades).toHaveLength(BALANCE_RUNS);
    expect(firstCollaborators.length).toBeGreaterThan(0);
    expect(percentile(firstMembers, 0.9)).toBeLessThanOrEqual(8 * 60_000);
    expect(percentile(firstUpgrades, 0.9)).toBeLessThanOrEqual(10 * 60_000);
    expect(Math.max(...firstCollaborators)).toBeLessThanOrEqual(MAX_EARLY_GAME_MS);
  });

  it("keeps observed annual departures close to the configured form curve", () => {
    const paths: FormId[][] = [
      [],
      ["form-1"],
      ["form-1", "course-x", "form-2"],
      ["form-1", "course-x", "form-2", "course-y", "form-3-long", "form-4-long", "form-5-long", "form-6", "form-7"],
    ];
    let seed = 1;
    const observed = paths.map((forms) => {
      let departures = 0;
      for (let run = 0; run < 10_000; run += 1) {
        const [roll, nextSeed] = nextRandom(seed);
        seed = nextSeed;
        if (roll < getMemberAnnualDepartureChance(forms)) departures += 1;
      }
      return departures / 10_000;
    });

    paths.forEach((forms, index) => {
      expect(observed[index]).toBeCloseTo(getMemberAnnualDepartureChance(forms), 1);
    });
    expect(observed[0]).toBeGreaterThan(observed[1]);
    expect(observed[1]).toBeGreaterThan(observed[2]);
    expect(observed[2]).toBeGreaterThan(observed[3]);
  });

  it("keeps a complete Form 7 training path below four hours", () => {
    const path: FormId[] = [
      "form-1",
      "course-x",
      "form-2",
      "course-y",
      "form-3-long",
      "form-4-long",
      "form-5-long",
      "form-6",
      "form-7",
    ];
    const schoolYearStartMonths = path.map((_, index) => index === 0 ? 1 : 9 + (index - 1) * 12);
    const finalTraining = FORM_DEFINITIONS.find(
      (definition) => definition.id === path.at(-1),
    )!;
    const completionMs =
      (schoolYearStartMonths.at(-1)! - 1) * GAME_CONFIG.gameMonthMs +
      finalTraining.durationMs;

    expect(completionMs).toBeLessThan(4 * 60 * 60_000);
  });
});
