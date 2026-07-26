import { afterEach, describe, expect, it } from "vitest";
import { selectDayNotifications } from "../features/day-panel/dayNotifications";
import { GAME_CONFIG } from "./config";
import { buyOfficialSword } from "./equipment";
import { createInitialState, gameReducer } from "./engine";
import { rebaseGameTimeline } from "./gameTimeline";
import {
  LIGHT_INFLATION_CAUSES,
  LIGHT_INFLATION_EVENT_VISIBILITY_MS,
  getOfficialSwordUnitCost,
  processJanuaryLightInflation,
} from "./lightInflation";
import { migrate } from "./saveMigrations";
import { isValidGameState } from "./saveValidation";
import { freezeGameState } from "./offline";
import { loadGame, saveGame } from "./save";

describe("Inflazione di Luce", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("accumula 10 punti per spada, anche negli acquisti multipli, e rispetta il cap", () => {
    const initial = createInitialState(1_000);
    const funded = { ...initial, school: { ...initial.school, euros: 100_000 } };

    const single = buyOfficialSword(funded, 1);
    const multiple = buyOfficialSword(single, 10);
    const capped = buyOfficialSword(multiple, 100);

    expect(single.lightInflation.chancePercent).toBe(10);
    expect(multiple.lightInflation.chancePercent).toBe(100);
    expect(capped.lightInflation.chancePercent).toBe(100);
  });

  it("usa il prezzo corrente senza arrotondamenti intermedi per affordability e quantità", () => {
    const initial = createInitialState(1_000);
    const inflated = {
      ...initial,
      lightInflation: { ...initial.lightInflation, priceMultiplier: 1.1 },
      school: { ...initial.school, euros: GAME_CONFIG.officialSwordCost * 1.1 * 10 },
    };

    expect(getOfficialSwordUnitCost(inflated)).toBeCloseTo(363);
    expect(buyOfficialSword(inflated, 10).equipment.totalSwords).toBe(
      inflated.equipment.totalSwords + 10,
    );
    const unaffordable = {
      ...inflated,
      school: { ...inflated.school, euros: inflated.school.euros - 0.01 },
    };
    expect(buyOfficialSword(unaffordable, 10)).toBe(unaffordable);
  });

  it("entra in gennaio senza consumare RNG quando la chance è zero", () => {
    const initial = createInitialState(1_000);
    const january = {
      ...initial,
      randomSeed: 123,
      school: { ...initial.school, currentMonth: 13 },
    };

    const checked = processJanuaryLightInflation(january, 5_000);

    expect(checked.randomSeed).toBe(123);
    expect(checked.lightInflation.lastCheckedJanuaryMonth).toBe(13);
  });

  it("conserva la chance dopo un fallimento", () => {
    const initial = createInitialState(1_000);
    const january = {
      ...initial,
      randomSeed: 0,
      school: { ...initial.school, currentMonth: 13 },
      lightInflation: { ...initial.lightInflation, chancePercent: 10 },
    };

    const failed = processJanuaryLightInflation(january, 5_000);

    expect(failed.lightInflation.chancePercent).toBe(10);
    expect(failed.lightInflation.event).toBeUndefined();
    expect(failed.randomSeed).not.toBe(january.randomSeed);
  });

  it("al successo azzera la chance, rincara in modo composto e conserva un evento UI", () => {
    const initial = createInitialState(1_000);
    const january = {
      ...initial,
      randomSeed: 0,
      school: { ...initial.school, currentMonth: 13 },
      lightInflation: { ...initial.lightInflation, chancePercent: 100, priceMultiplier: 1.1 },
    };

    const succeeded = processJanuaryLightInflation(january, 5_000);

    expect(succeeded.lightInflation.chancePercent).toBe(0);
    expect(succeeded.lightInflation.priceMultiplier).toBe(1.1 * 1.1);
    expect(succeeded.lightInflation.event).toMatchObject({
      occurredAt: 5_000,
      visibleUntil: 5_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
    });
    expect(LIGHT_INFLATION_CAUSES).toContain(succeeded.lightInflation.event?.cause);
  });

  it("non effettua un doppio tiro nello stesso gennaio", () => {
    const initial = createInitialState(1_000);
    const january = {
      ...initial,
      randomSeed: 0,
      school: { ...initial.school, currentMonth: 13 },
      lightInflation: { ...initial.lightInflation, chancePercent: 100 },
    };

    const first = processJanuaryLightInflation(january, 5_000);

    expect(processJanuaryLightInflation(first, 6_000)).toBe(first);
  });

  it("avvia la finestra reale del gennaio recuperato al wall clock del TICK", () => {
    const initial = createInitialState(1_000);
    const december = {
      ...initial,
      randomSeed: 0,
      school: { ...initial.school, currentMonth: 12, nextFeeAt: 2_000 },
      lightInflation: { ...initial.lightInflation, chancePercent: 100 },
    };

    const caughtUp = gameReducer(december, {
      type: "TICK",
      now: 122_000,
      wallNow: 5_000,
      gainMultiplier: 100,
    });

    expect(caughtUp.lightInflation.lastCheckedJanuaryMonth).toBe(13);
    expect(caughtUp.lightInflation.priceMultiplier).toBe(1.1);
    expect(caughtUp.lightInflation.event).toMatchObject({
      occurredAt: 5_000,
      visibleUntil: 5_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
    });
  });

  it("sceglie causa e avanzamento RNG in modo deterministico", () => {
    const initial = createInitialState(1_000);
    const january = {
      ...initial,
      randomSeed: 42,
      school: { ...initial.school, currentMonth: 13 },
      lightInflation: { ...initial.lightInflation, chancePercent: 100 },
    };

    const first = processJanuaryLightInflation(january, 5_000);
    const second = processJanuaryLightInflation(january, 5_000);

    expect(second.lightInflation.event?.cause).toBe(first.lightInflation.event?.cause);
    expect(second.randomSeed).toBe(first.randomSeed);
  });

  it("migra un salvataggio v62 mantenendolo compatibile", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 62;
    delete legacy.lightInflation;

    const migrated = migrate(legacy);

    expect(migrated).toMatchObject({
      version: GAME_CONFIG.version,
      lightInflation: { chancePercent: 0, priceMultiplier: 1 },
    });
    expect(isValidGameState(migrated)).toBe(true);
  });

  it("mantiene la deadline reale attraverso pausa e rebase", () => {
    const initial = createInitialState(1_000);
    const withEvent = {
      ...initial,
      lightInflation: {
        ...initial.lightInflation,
        event: {
          cause: LIGHT_INFLATION_CAUSES[0],
          occurredAt: 2_000,
          visibleUntil: 2_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
        },
      },
    };

    const paused = freezeGameState(withEvent, 6_000, 4_000);
    const rebased = rebaseGameTimeline(paused, 6_000, 10_000);

    expect(rebased.lightInflation.event).toEqual({
      cause: LIGHT_INFLATION_CAUSES[0],
      occurredAt: 2_000,
      visibleUntil: 2_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
    });
    expect(isValidGameState(rebased)).toBe(true);
  });

  it("persists and reloads the absolute deadline without reviving an expired event", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      lightInflation: {
        ...initial.lightInflation,
        event: {
          cause: LIGHT_INFLATION_CAUSES[0],
          occurredAt: 2_000,
          visibleUntil: 2_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
        },
      },
    };
    expect(saveGame(state, 6_000)).toBe(true);

    const beforeDeadline = loadGame(10_000);
    expect(beforeDeadline.lightInflation.event).toEqual(state.lightInflation.event);
    expect(selectDayNotifications(beforeDeadline, beforeDeadline.lastSavedAt, 10_000)).toContainEqual(
      expect.objectContaining({ id: "light-inflation" }),
    );

    const afterDeadline = loadGame(2_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS + 3_000);
    expect(afterDeadline.lightInflation.event).toEqual(state.lightInflation.event);
    expect(selectDayNotifications(
      afterDeadline,
      afterDeadline.lastSavedAt,
      2_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS + 3_000,
    )).not.toContainEqual(
      expect.objectContaining({ id: "light-inflation" }),
    );
  });
});
