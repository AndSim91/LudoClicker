import { describe, expect, it } from "vitest";
import { UPGRADE_DEFINITIONS, getEventExtraCopies } from "../content/upgrades";
import { hasUnlockedOfficialStats } from "./athleteStats";
import { simulateBalanceGame } from "./balanceSimulation";
import { GAME_CONFIG } from "./config";
import { gameReducer } from "./engine";
import type { GameState, UpgradeLevels } from "./types";

/*
 * Every upgrade at its last level, on a real mid-game school: two game years
 * must run without NaN, stalls or rule breaks. The point-unlock nodes
 * (Occhio del Maestro, e-Learning, Multiverso, Fornitore ufficiale) are the
 * ones most likely to break the game, so their effects are checked by name.
 */

function findNonFinite(value: unknown, path = "state", seen = new Set<object>()): string | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? undefined : path;
  if (!value || typeof value !== "object" || seen.has(value)) return undefined;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    const found = findNonFinite(child, `${path}.${key}`, seen);
    if (found) return found;
  }
  return undefined;
}

function maxAll(state: GameState): GameState {
  const upgrades = { ...state.upgrades } as UpgradeLevels;
  for (const definition of UPGRADE_DEFINITIONS) {
    if (!definition.hidden) upgrades[definition.id] = definition.maxLevel;
  }
  return {
    ...state,
    upgrades,
    unlocks: { ...state.unlocks, social: true, gadget: true, forms: true },
    school: { ...state.school, euros: 50_000_000 },
  };
}

describe("tutti i potenziamenti al massimo", () => {
  it("regge due anni di gioco senza numeri rotti né regole violate", () => {
    // ~50 game months of a competitive player: collaborators, an Istruttore, Forms, events.
    const horizonMs = 50 * 60_000;
    const { state: midGame } = simulateBalanceGame({ seed: 7, pace: "intense", horizonMs });
    expect(midGame.collaborators.length).toBeGreaterThan(4);

    let state = maxAll(midGame);
    const extraCopies = getEventExtraCopies(state.upgrades);
    expect(extraCopies).toBe(2);
    const startedAt = midGame.createdAt + horizonMs;
    const months = 24;
    let maxCopies = 0;
    let previousMonth = state.school.currentMonth;
    let monthsPassed = 0;
    for (let elapsed = 1_000; elapsed <= months * GAME_CONFIG.gameMonthMs; elapsed += 1_000) {
      const now = startedAt + elapsed;
      state = gameReducer(state, { type: "TICK", now });
      // The player keeps the park sparring and all its copies going.
      for (let copy = 0; copy <= extraCopies; copy += 1) {
        const next = gameReducer(state, { type: "START_ACQUISITION_EVENT", definitionId: "park-sparring", now });
        if (next === state) break;
        state = next;
      }
      const running = new Map<string, number>();
      for (const event of state.acquisitionEvents) {
        if (event.status === "running") running.set(event.definitionId, (running.get(event.definitionId) ?? 0) + 1);
      }
      maxCopies = Math.max(maxCopies, ...running.values(), 0);
      expect(Math.max(0, ...running.values())).toBeLessThanOrEqual(1 + extraCopies);
      if (state.school.currentMonth !== previousMonth) {
        monthsPassed += 1;
        previousMonth = state.school.currentMonth;
      }
    }

    expect(findNonFinite(state)).toBeUndefined();
    // Time never stalls (6.29/6.30) and the money does not vanish into NaN.
    expect(monthsPassed).toBeGreaterThanOrEqual(months - 1);
    expect(state.school.euros).toBeGreaterThan(0);
    expect(state.equipment.totalSwords).toBeGreaterThanOrEqual(0);
    // Multiverso: the copies really run side by side.
    expect(maxCopies).toBe(1 + extraCopies);
    // e-Learning level 3: every Istruttore reaches Corso Y on their own.
    const instructors = state.collaborators.filter((collaborator) => collaborator.assignment === "instructor");
    expect(instructors.length).toBeGreaterThan(0);
    expect(instructors.every((instructor) =>
      instructor.instructorForms.includes("form-1") || instructor.training !== undefined
    )).toBe(true);
    // Occhio del Maestro level 2: Arena and Style visible from enrolment.
    expect(hasUnlockedOfficialStats([], state.upgrades["talent-eye"])).toBe(true);
    expect(hasUnlockedOfficialStats(["course-y"], 1)).toBe(true);
    expect(hasUnlockedOfficialStats(["form-1"], 1)).toBe(false);
    expect(hasUnlockedOfficialStats(["course-y"], 0)).toBe(false);
  }, 120_000);
});
