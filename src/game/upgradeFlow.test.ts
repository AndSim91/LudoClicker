import { describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import type { Collaborator, GameState } from "./types";
import {
  buyAllAffordableUpgrades,
  buyUpgrade,
  discoverSecretUpgrade,
  getBuyAllPreview,
  getPlayerGameSpeed,
  planBuyAllUpgrades,
  setGameSpeed,
} from "./upgradeFlow";
import { UPGRADE_DEFINITIONS, getUpgradeCost } from "../content/upgrades";

describe("buyUpgrade prerequisites", () => {
  it("buys Corso X for one euro only after its independent discovery", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 10 },
    };

    expect(buyUpgrade(funded, "project-x")).toBe(funded);

    const eligible = discoverSecretUpgrade(funded, "project-x");
    const upgraded = buyUpgrade(eligible, "project-x");

    expect(upgraded.upgrades["project-x"]).toBe(1);
    expect(upgraded.school.euros).toBe(9);
  });

  it("blocks a node until its branch has enough points", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, euros: 10_000, fame: 100 },
    };

    expect(buyUpgrade(state, "quick-phrases")).toBe(state);

    const eligibleState = {
      ...state,
      upgrades: { ...state.upgrades, "comfortable-keyboard": 5 },
    };
    const upgradedState = buyUpgrade(eligibleState, "quick-phrases");

    expect(upgradedState.upgrades["quick-phrases"]).toBe(1);
    expect(upgradedState.school.euros).toBeLessThan(eligibleState.school.euros);
  });

  it("opens Master of none after Percorso Tecnico level one", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 20_000, fame: 15 },
    };

    const arena = buyUpgrade(funded, "technical-arena");
    expect(arena.upgrades["technical-arena"]).toBe(1);
    const versatility = buyUpgrade(arena, "instructor-versatility");
    expect(versatility.upgrades["instructor-versatility"]).toBe(1);
    expect(versatility.upgrades["technical-arena"]).toBe(1);
  });

  it("opens Tu conosci la SIS? at 9 points of Insegnamento, spent in any node", () => {
    const initial = createInitialState(1_000);
    const eightPoints = {
      ...initial,
      school: { ...initial.school, euros: 50_000 },
      upgrades: { ...initial.upgrades, "technical-arena": 4, "instructor-versatility": 4 },
    };

    expect(buyUpgrade(eightPoints, "sis-accreditation")).toBe(eightPoints);

    const ninePoints = buyUpgrade(eightPoints, "talent-eye");
    expect(ninePoints.upgrades["talent-eye"]).toBe(1);
    expect(buyUpgrade(ninePoints, "sis-accreditation").upgrades["sis-accreditation"]).toBe(1);
  });

  it("opens Nessun Rancore at 28 points with Percorso Tecnico at level 3", () => {
    const initial = createInitialState(1_000);
    const points = {
      ...initial,
      school: { ...initial.school, euros: 1_000_000_000 },
      upgrades: {
        ...initial.upgrades,
        "talent-eye": 2,
        "technical-arena": 2,
        "instructor-versatility": 5,
        "e-learning": 3,
        "sis-accreditation": 4,
        "cost-of-service": 5,
        "promiscuous-instructor": 6,
      },
    };

    // 27 points and Percorso Tecnico 2: still locked.
    expect(buyUpgrade(points, "agonist-course-intensity")).toBe(points);
    const ready = { ...points, upgrades: { ...points.upgrades, "technical-arena": 3 } };
    expect(buyUpgrade(ready, "agonist-course-intensity").upgrades["agonist-course-intensity"]).toBe(1);
  });

  it("opens PagoSport at 38 points of Insegnamento", () => {
    const initial = createInitialState(1_000);
    const levels = {
      ...initial.upgrades,
      "talent-eye": 2,
      "technical-arena": 5,
      "instructor-versatility": 5,
      "e-learning": 3,
      "sis-accreditation": 4,
      "cost-of-service": 5,
      "promiscuous-instructor": 6,
      "agonist-course-intensity": 7,
    };
    const thirtySeven = { ...initial, school: { ...initial.school, euros: 1_000_000_000 }, upgrades: levels };
    expect(buyUpgrade(thirtySeven, "pagosport")).toBe(thirtySeven);
    const thirtyEight = { ...thirtySeven, upgrades: { ...levels, "agonist-course-intensity": 8 } };
    expect(buyUpgrade(thirtyEight, "pagosport").upgrades.pagosport).toBe(1);
  });

  it("does not grant Instructor certificates when PagoSport reaches level two", () => {
    const initial = createInitialState(1_000);
    const collaborator: Collaborator = {
      id: "collaborator-pagosport",
      contactId: initial.contacts[0].id,
      displayName: "Collaboratore PagoSport",
      joinedAt: 1_000,
      forms: ["form-1", "course-x"],
      instructorForms: [],
      formBranchPreferences: [],
      assignment: null,
      mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
      rarity: "ultra-rare" as const,
    };
    const state = {
      ...initial,
      school: { ...initial.school, euros: 1_000_000_000, fame: 15 },
      collaborators: [collaborator],
      upgrades: {
        ...initial.upgrades,
        "talent-eye": 2,
        "technical-arena": 5,
        "instructor-versatility": 5,
        "e-learning": 3,
        "sis-accreditation": 4,
        "cost-of-service": 5,
        "promiscuous-instructor": 6,
        "agonist-course-intensity": 10,
        pagosport: 1,
      },
    };

    const upgraded = buyUpgrade(state, "pagosport");
    expect(upgraded.upgrades.pagosport).toBe(2);
    expect(upgraded.collaborators[0].instructorForms).toEqual([]);
  });

  it("does not allow direct purchases of retired hidden nodes", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 1_000 },
    };

    expect(buyUpgrade(funded, "social-editorial-plan")).toBe(funded);
  });

  it("enforces the Gadget sector, Social and catalog prerequisites", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 2_000_000 },
    };

    expect(buyUpgrade(funded, "gadget-showcase")).toBe(funded);

    const gadgetUnlocked = {
      ...funded,
      unlocks: { ...funded.unlocks, gadget: true },
    };
    expect(buyUpgrade(gadgetUnlocked, "gadget-showcase").upgrades["gadget-showcase"])
      .toBe(1);
    expect(buyUpgrade(gadgetUnlocked, "gadget-online-store")).toBe(gadgetUnlocked);

    const publicBranchReady = {
      ...gadgetUnlocked,
      unlocks: { ...gadgetUnlocked.unlocks, social: true },
      upgrades: { ...gadgetUnlocked.upgrades, "gadget-showcase": 3 },
    };
    expect(buyUpgrade(publicBranchReady, "gadget-online-store").upgrades["gadget-online-store"])
      .toBe(1);

    const commercialBranchReady = {
      ...gadgetUnlocked,
      upgrades: { ...gadgetUnlocked.upgrades, "gadget-showcase": 5, "gadget-design-tools": 4, "gadget-sales-training": 3 },
    };
    expect(buyUpgrade(commercialBranchReady, "gadget-cross-selling"))
      .toBe(commercialBranchReady);

    const mugUnlocked = {
      ...commercialBranchReady,
      gadgets: {
        ...commercialBranchReady.gadgets,
        products: {
          ...commercialBranchReady.gadgets.products,
          mug: { ...commercialBranchReady.gadgets.products.mug, unlocked: true },
        },
      },
    };
    expect(buyUpgrade(mugUnlocked, "gadget-cross-selling").upgrades["gadget-cross-selling"])
      .toBe(1);
  });
});

describe("Compra tutto", () => {
  // The rule before the plan existed: every affordable node by price, first purchasable wins.
  function legacyBuyAll(state: GameState): GameState {
    let current = state;
    for (;;) {
      const next = UPGRADE_DEFINITIONS
        .filter((definition) => definition.category !== "secrets")
        .map((definition) => ({
          id: definition.id,
          cost: getUpgradeCost(definition, current.upgrades[definition.id], current.upgrades),
        }))
        .filter(({ cost }) => cost <= current.school.euros)
        .sort((a, b) => a.cost - b.cost)
        .map(({ id }) => buyUpgrade(current, id))
        .find((candidate) => candidate !== current);
      if (!next) return current;
      current = next;
    }
  }

  function funded(euros: number): GameState {
    const initial = createInitialState(1_000);
    return {
      ...initial,
      school: { ...initial.school, euros, fame: 5_000 },
      unlocks: { ...initial.unlocks, social: true, gadget: true, forms: true, collaborators: true },
    };
  }

  it.each([0, 50, 2_000, 75_000, 3_000_000, 1e9])("buys exactly what the old rule bought with %d €", (euros) => {
    const state = funded(euros);
    const expected = legacyBuyAll(state);
    const actual = buyAllAffordableUpgrades(state);
    expect(actual.upgrades).toEqual(expected.upgrades);
    expect(actual.school.euros).toBe(expected.school.euros);
    expect(actual.player.writingPower).toBe(expected.player.writingPower);
  });

  it("keeps the preview right while the funds move inside and outside its range", () => {
    let state = funded(75_000);
    const plan = planBuyAllUpgrades(state);
    expect(plan.purchases.length).toBeGreaterThan(0);
    for (const euros of [plan.minEuros, 75_000, plan.maxEuros - 1, plan.maxEuros, plan.minEuros - 1, 1e7]) {
      state = { ...state, school: { ...state.school, euros } };
      const fresh = planBuyAllUpgrades(state);
      expect(getBuyAllPreview(state)).toEqual({ count: fresh.purchases.length, total: fresh.total });
    }
  });
});

describe("Il tempo è denaro", () => {
  it("opens level 2 only with five schools and keeps the chosen speed within the level", () => {
    const initial = createInitialState(1_000);
    const oneSchool = {
      ...initial,
      school: { ...initial.school, euros: 1_000_000 },
      network: { ...initial.network, schoolCount: 1 },
    };
    expect(setGameSpeed(oneSchool, 3)).toBe(oneSchool);

    const levelOne = buyUpgrade(oneSchool, "time-is-money");
    expect(levelOne.upgrades["time-is-money"]).toBe(1);
    expect(levelOne.school.euros).toBe(975_000);
    expect(buyUpgrade(levelOne, "time-is-money")).toBe(levelOne);
    expect(getPlayerGameSpeed(setGameSpeed(levelOne, 3))).toBe(2);

    const threeSchools = { ...levelOne, network: { ...levelOne.network, schoolCount: 3 } };
    const levelTwo = setGameSpeed(buyUpgrade(threeSchools, "time-is-money"), 3);
    expect(levelTwo.upgrades["time-is-money"]).toBe(2);
    expect(getPlayerGameSpeed(levelTwo)).toBe(3);
    // 4× waits for the fifth school founded.
    expect(buyUpgrade(levelTwo, "time-is-money")).toBe(levelTwo);
    // A new school starts with no levels: the saved 3× counts as 1× until the node is bought again.
    expect(getPlayerGameSpeed({ ...levelTwo, upgrades: initial.upgrades })).toBe(1);
  });
});
