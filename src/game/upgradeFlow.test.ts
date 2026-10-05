import { describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import type { Collaborator } from "./types";
import { buyUpgrade, discoverSecretUpgrade } from "./upgradeFlow";

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
      school: { ...initial.school, euros: 200_000 },
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
    const thirtySeven = { ...initial, school: { ...initial.school, euros: 200_000 }, upgrades: levels };
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
      school: { ...initial.school, euros: 200_000, fame: 15 },
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
