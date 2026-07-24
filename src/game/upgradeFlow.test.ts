import { describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import type { Collaborator } from "./types";
import { buyUpgrade } from "./upgradeFlow";

describe("buyUpgrade prerequisites", () => {
  it("blocks a later branch upgrade until every previous upgrade is complete", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, euros: 10_000, historicMembers: 100 },
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

  it("opens Polivalenza didattica after Arena Tecnica level one", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 20_000, historicMembers: 15 },
    };

    const arena = buyUpgrade(funded, "technical-arena");
    expect(arena.upgrades["technical-arena"]).toBe(1);
    const versatility = buyUpgrade(arena, "instructor-versatility");
    expect(versatility.upgrades["instructor-versatility"]).toBe(1);
    expect(versatility.upgrades["technical-arena"]).toBe(1);
  });

  it("opens Intensità agonistica only after unlocking Corso Agonisti", () => {
    const initial = createInitialState(1_000);
    const levelTwo = {
      ...initial,
      school: { ...initial.school, euros: 20_000 },
      upgrades: { ...initial.upgrades, "technical-arena": 2 },
    };

    expect(buyUpgrade(levelTwo, "agonist-course-intensity")).toBe(levelTwo);

    const levelThree = {
      ...levelTwo,
      upgrades: { ...levelTwo.upgrades, "technical-arena": 3 },
    };
    expect(buyUpgrade(levelThree, "agonist-course-intensity").upgrades["agonist-course-intensity"])
      .toBe(1);
  });

  it("grants every existing collaborator certificate at PagoSport level two", () => {
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
      school: { ...initial.school, euros: 200_000, historicMembers: 15 },
      collaborators: [collaborator],
      upgrades: {
        ...initial.upgrades,
        "tiamat-instructor": 4,
        pagosport: 1,
      },
    };

    const upgraded = buyUpgrade(state, "pagosport");
    expect(upgraded.upgrades.pagosport).toBe(2);
    expect(upgraded.collaborators[0].instructorForms).toEqual(["form-1", "course-x"]);
  });
});
