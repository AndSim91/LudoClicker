import { afterEach, describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import { buyOfficialSword } from "./equipment";
import { createInitialState, gameReducer } from "./engine";
import { rebaseGameTimeline } from "./gameTimeline";
import {
  LIGHT_INFLATION_CAUSES,
  LIGHT_INFLATION_EVENT_VISIBILITY_MS,
  LIGHT_INFLATION_MOMENT,
  getLightInflationIncrease,
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

  it("conta le spade comprate e quante ce n'erano prima del primo acquisto", () => {
    const initial = createInitialState(1_000);
    const funded = { ...initial, school: { ...initial.school, euros: 100_000 } };

    const single = buyOfficialSword(funded, 1);
    const multiple = buyOfficialSword(single, 10);

    expect(multiple.lightInflation).toMatchObject({
      purchasedSwords: 11,
      swordsBeforePurchases: GAME_CONFIG.initialSwords,
    });
  });

  it("calcola l'aumento: 10% + ricchezza (0,5% delle entrate) + domanda (30% delle spade in più), max 100%", () => {
    // Nessuna ricchezza (riferimento 100 € < 330 €), 2 spade su 10: +10% + 6%.
    expect(getLightInflationIncrease(330, 20_000, 2, 10)).toBe(0.16);
    // Riferimento 600 € per una spada da 400: +50% di ricchezza; 5 su 10: +15%.
    expect(getLightInflationIncrease(400, 120_000, 5, 10)).toBe(0.75);
    expect(getLightInflationIncrease(330, 10_000_000, 100, 10)).toBe(1);
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

  it("in gennaio senza spade comprate non rincara, ma riparte l'anno delle entrate", () => {
    const initial = createInitialState(1_000);
    const january = {
      ...initial,
      randomSeed: 123,
      school: { ...initial.school, currentMonth: 13 },
      statistics: { ...initial.statistics, eurosEarned: 5_000 },
    };

    const checked = processJanuaryLightInflation(january, 5_000);

    expect(checked.randomSeed).toBe(123);
    expect(checked.lightInflation).toMatchObject({
      lastCheckedJanuaryMonth: 13,
      priceMultiplier: 1,
      eurosEarnedAtCheck: 5_000,
    });
    expect(checked.lightInflation.event).toBeUndefined();
  });

  it("con almeno una spada comprata rincara sempre, in modo composto, e conserva l'aumento nell'evento", () => {
    const initial = createInitialState(1_000);
    const january = {
      ...initial,
      randomSeed: 0,
      school: { ...initial.school, currentMonth: 25 },
      statistics: { ...initial.statistics, eurosEarned: 130_000 },
      lightInflation: {
        ...initial.lightInflation,
        priceMultiplier: 1.1,
        increases: 1,
        purchasedSwords: 5,
        swordsBeforePurchases: 10,
        eurosEarnedAtCheck: 10_000,
      },
    };

    const succeeded = processJanuaryLightInflation(january, 5_000);

    // Prezzo 363 €, entrate dell'anno 120.000 € → riferimento 600 €: +65%; domanda +15%.
    expect(succeeded.lightInflation.event?.increase).toBe(0.9);
    expect(succeeded.lightInflation.priceMultiplier).toBeCloseTo(1.1 * 1.9);
    expect(succeeded.lightInflation).toMatchObject({
      increases: 2,
      purchasedSwords: 0,
      eurosEarnedAtCheck: 130_000,
    });
    expect(succeeded.lightInflation.event).toMatchObject({
      occurredAt: 5_000,
      visibleUntil: 5_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
    });
    expect(LIGHT_INFLATION_CAUSES).toContain(succeeded.lightInflation.event?.cause);
    expect(succeeded.moments.queue).toEqual([LIGHT_INFLATION_MOMENT]);
    expect(succeeded.moments.seen).not.toContain(LIGHT_INFLATION_MOMENT);
  });

  it("non effettua un doppio tiro nello stesso gennaio", () => {
    const initial = createInitialState(1_000);
    const january = {
      ...initial,
      randomSeed: 0,
      school: { ...initial.school, currentMonth: 13 },
      lightInflation: { ...initial.lightInflation, purchasedSwords: 1, swordsBeforePurchases: 6 },
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
      lightInflation: { ...initial.lightInflation, purchasedSwords: 1, swordsBeforePurchases: 6 },
    };

    const caughtUp = gameReducer(december, {
      type: "TICK",
      now: 122_000,
      wallNow: 5_000,
      gainMultiplier: 100,
    });

    expect(caughtUp.lightInflation.lastCheckedJanuaryMonth).toBe(13);
    expect(caughtUp.lightInflation.priceMultiplier).toBeGreaterThan(1.1 - 1e-9);
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
      lightInflation: { ...initial.lightInflation, purchasedSwords: 1, swordsBeforePurchases: 6 },
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
      lightInflation: { priceMultiplier: 1, increases: 0, purchasedSwords: 0 },
    });
    expect(isValidGameState(migrated)).toBe(true);
  });

  it("migra un salvataggio v89: la chance diventa spade comprate, l'evento +10%", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 89;
    legacy.statistics.eurosEarned = 4_000;
    legacy.equipment.totalSwords = 10;
    legacy.lightInflation = {
      chancePercent: 30,
      priceMultiplier: 1.1 * 1.1,
      event: { cause: LIGHT_INFLATION_CAUSES[0], occurredAt: 0, visibleUntil: LIGHT_INFLATION_EVENT_VISIBILITY_MS },
    };

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.lightInflation).toMatchObject({
      increases: 2,
      purchasedSwords: 3,
      swordsBeforePurchases: 7,
      eurosEarnedAtCheck: 4_000,
      event: { increase: 0.1 },
    });
    expect(migrated.lightInflation).not.toHaveProperty("chancePercent");
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
          increase: 0.1,
          occurredAt: 2_000,
          visibleUntil: 2_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
        },
      },
    };

    const paused = freezeGameState(withEvent, 6_000, 4_000);
    const rebased = rebaseGameTimeline(paused, 6_000, 10_000);

    expect(rebased.lightInflation.event).toEqual({
      cause: LIGHT_INFLATION_CAUSES[0],
      increase: 0.1,
      occurredAt: 2_000,
      visibleUntil: 2_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
    });
    expect(isValidGameState(rebased)).toBe(true);
  });

  it("persists and reloads the event", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      lightInflation: {
        ...initial.lightInflation,
        event: {
          cause: LIGHT_INFLATION_CAUSES[0],
          increase: 0.1,
          occurredAt: 2_000,
          visibleUntil: 2_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
        },
      },
    };
    expect(saveGame(state, 6_000)).toBe(true);

    const beforeDeadline = loadGame(10_000);
    expect(beforeDeadline.lightInflation.event).toEqual(state.lightInflation.event);

    const afterDeadline = loadGame(2_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS + 3_000);
    expect(afterDeadline.lightInflation.event).toEqual(state.lightInflation.event);
  });
});
