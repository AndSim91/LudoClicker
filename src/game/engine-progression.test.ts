import { describe, expect, it } from "vitest";
import { getAcquisitionEventDefinition } from "../content/events";
import {
  getAvailableForms,
  getCollaboratorProductivity,
} from "../content/forms";
import { UPGRADE_DEFINITIONS } from "../content/upgrades";
import { createInitialState, gameReducer } from "./engine";
import {
  getEmailBookingChance,
  getEnrollmentChance,
  getEventFunnelOutcome,
} from "./formulas";
import { selectActiveEmail } from "./selectors";
import { nextRandom } from "./random";
import { improveRandomAthletes } from "./collaboratorAutomationOutcomes";
import type { FormId, GameState } from "./types";

describe("game engine: progression", () => {
  it("buys data-driven upgrades with growing costs", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 200, historicMembers: 1 },
      unlocks: { ...initial.unlocks, upgrades: true },
    };
    const first = gameReducer(funded, {
      type: "BUY_UPGRADE",
      upgradeId: "prepared-presentation",
      now: 2_000,
    });
    const second = gameReducer(first, {
      type: "BUY_UPGRADE",
      upgradeId: "prepared-presentation",
      now: 3_000,
    });

    expect(first.upgrades["prepared-presentation"]).toBe(1);
    expect(first.school.euros).toBe(150);
    expect(second.upgrades["prepared-presentation"]).toBe(2);
    expect(second.school.euros).toBe(85);
  });

  it("adds purchased equipment capacity immediately", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 750, historicMembers: 20 },
      upgrades: {
        ...initial.upgrades,
        "pre-event-check": 5,
        "maintenance-kit": 5,
      },
    };

    const upgraded = gameReducer(funded, {
      type: "BUY_UPGRADE",
      upgradeId: "organized-rack",
      now: 2_000,
    });

    expect(upgraded.equipment.totalSwords).toBe(8);
    expect(upgraded.equipment.availableSwords).toBe(8);
  });

  it("allows buying an upgrade as soon as the balance covers its price", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 75 },
    };

    const purchased = gameReducer(funded, {
      type: "BUY_UPGRADE",
      upgradeId: "comfortable-keyboard",
      now: 2_000,
    });

    expect(purchased.school.euros).toBe(0);
    expect(purchased.upgrades["comfortable-keyboard"]).toBe(1);
  });

  it("applies speed and charisma upgrades to their production formulas", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 800, historicMembers: 1 },
      unlocks: { ...initial.unlocks, upgrades: true },
    };
    const faster = [2_000, 2_100, 2_200, 2_300, 2_400].reduce(
      (state, now) => gameReducer(state, {
        type: "BUY_UPGRADE",
        upgradeId: "comfortable-keyboard",
        now,
      }),
      funded,
    );
    const charismatic = gameReducer(faster, {
      type: "BUY_UPGRADE",
      upgradeId: "prepared-presentation",
      now: 3_000,
    });
    const sparring = getAcquisitionEventDefinition("park-sparring")!;

    expect(faster.player.writingPower).toBe(3);
    expect(getEventFunnelOutcome(charismatic, sparring).emailShareChance).toBeGreaterThan(
      getEventFunnelOutcome(faster, sparring).emailShareChance,
    );
  });

  it("applies writing and welcome upgrades to conversion chances", () => {
    const initial = createInitialState(1_000);
    const improved = {
      ...initial,
      upgrades: {
        ...initial.upgrades,
        "spell-check": 2,
        "welcome-procedure": 2,
      },
    };

    expect(getEmailBookingChance(improved)).toBeCloseTo(0.464);
    expect(getEnrollmentChance(improved)).toBeCloseTo(0.64);
    expect(getEnrollmentChance(improved, "legendary")).toBeCloseTo(0.158);

    const maximized = {
      ...initial,
      upgrades: Object.fromEntries(UPGRADE_DEFINITIONS.map((definition) => [
        definition.id,
        definition.maxLevel,
      ])) as typeof initial.upgrades,
    };
    expect(getEnrollmentChance(maximized, "common")).toBe(1);
    expect(getEnrollmentChance(maximized, "rare")).toBe(0.9);
    expect(getEnrollmentChance(maximized, "ultra-rare")).toBe(0.5);
    expect(getEnrollmentChance(maximized, "legendary")).toBe(0.35);
  });

  it("assigns one collaborator and writes on the active email automatically", () => {
    const initial = createInitialState(1_000);
    const collaborator = {
      id: "collaborator-1",
      contactId: initial.contacts[0].id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: null,
      rarity: "rare" as const,
    };
    const withCollaborator = {
      ...initial,
      collaborators: [collaborator],
      unlocks: { ...initial.unlocks, collaborators: true },
    };

    const assigned = gameReducer(withCollaborator, {
      type: "ASSIGN_COLLABORATOR",
      collaboratorId: collaborator.id,
      assignment: "writing",
      now: 1_500,
    });
    const automated = gameReducer(assigned, { type: "TICK", now: 2_000 });

    expect(assigned.collaborators[0].assignment).toBe("writing");
    expect(selectActiveEmail(automated)?.revealedCharacters).toBe(5);
    expect(automated.statistics.inputs).toBe(0);
    expect(automated.statistics.automatedCharacters).toBe(5);
  });

  it("turns Social cycles into scaled income with independent trial and contact chances", () => {
    const initial = createInitialState(1_000);
    const socialCollaborator = {
      id: "collaborator-social",
      contactId: initial.contacts[0].id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "social" as const,
      rarity: "rare" as const,
    };
    const equipmentCollaborator = {
      ...socialCollaborator,
      id: "collaborator-equipment",
      assignment: "equipment" as const,
    };
    const automated = gameReducer(
      {
        ...initial,
        randomSeed: 470_208,
        school: { ...initial.school, activeMembers: 12, followers: 1_000, euros: 1 },
        collaborators: [socialCollaborator, equipmentCollaborator],
        unlocks: { ...initial.unlocks, collaborators: true, social: true },
        equipment: { ...initial.equipment, wear: 5 },
        automation: {
          ...initial.automation,
          socialBuffer: 0.995,
          equipmentBuffer: 0.95,
        },
      },
      { type: "TICK", now: 2_000 },
    );

    expect(automated.school.euros).toBe(72);
    expect(automated.school.followers).toBe(1_001);
    expect(automated.statistics.eurosEarned).toBe(72);
    expect(automated.collaborators[0].mastery?.social).toBe(5);
    expect(automated.statistics.socialContacts).toBe(1);
    expect(automated.statistics.socialTrials).toBe(1);
    expect(automated.automation.socialBuffer).toBeCloseTo(0.995 + 1 / 120 - 1);
    expect(automated.contacts).toHaveLength(initial.contacts.length + 2);
    expect(automated.contacts.filter((contact) => contact.source === "social"))
      .toHaveLength(2);
    expect(automated.contacts.some((contact) =>
      contact.source === "social" && contact.status === "available"
    )).toBe(true);
    expect(automated.contacts.some((contact) =>
      contact.source === "social" && contact.status === "trialScheduled"
    )).toBe(true);
    expect(
      automated.contacts
        .filter((contact) => contact.source === "social")
        .every((contact) => contact.rarity !== "common"),
    ).toBe(true);
    expect(automated.scheduledTrials).toHaveLength(1);
    expect(automated.emails).toHaveLength(initial.emails.length);
    expect(automated.equipment.wear).toBe(4);
    expect(automated.automation.equipmentBuffer).toBe(0);
  });

  it("repairs damaged swords automatically after wear reaches zero", () => {
    const initial = createInitialState(1_000);
    const collaborator = {
      id: "collaborator-equipment-repair",
      contactId: initial.contacts[0].id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "equipment" as const,
      rarity: "rare" as const,
    };
    let state: GameState = {
      ...initial,
      school: { ...initial.school, euros: 125 },
      collaborators: [collaborator],
      equipment: { ...initial.equipment, availableSwords: 5, damagedSwords: 1 },
      unlocks: { ...initial.unlocks, collaborators: true },
    };

    for (let tick = 1; tick <= 449; tick += 1) {
      state = gameReducer(state, { type: "TICK", now: 1_000 + tick * 1_000 });
    }

    expect(state.equipment.damagedSwords).toBe(1);
    expect(state.automation.equipmentBuffer).toBeCloseTo(149.666_667);

    const repaired = gameReducer(state, { type: "TICK", now: 451_000 });

    expect(repaired.equipment).toMatchObject({ availableSwords: 6, damagedSwords: 0, wear: 0 });
    expect(repaired.automation.equipmentBuffer).toBe(0);
    expect(repaired.school.euros).toBe(0);
  });

  it("improves Arena or Style for one random enrolled athlete every lesson cycle", () => {
    const initial = createInitialState(1_000);
    const athlete = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      arenaBase: 50,
      styleBase: 60,
    };
    const lessonCollaborator = {
      id: "collaborator-lessons",
      contactId: initial.contacts[1].id,
      displayName: "Maestro Casuale",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "lessons" as const,
      rarity: "ultra-rare" as const,
    };
    const automated = gameReducer({
      ...initial,
      contacts: [athlete],
      collaborators: [lessonCollaborator],
      automation: { ...initial.automation, lessonBuffer: 0.99 },
    }, { type: "TICK", now: 2_000 });
    const improved = automated.contacts[0];

    expect((improved.arenaBase ?? 0) + (improved.styleBase ?? 0)).toBe(111);
    expect(automated.automation.lastImprovedAthlete).toBe(
      `${athlete.firstName} ${athlete.lastName}`,
    );
    expect(automated.automation.lessonBuffer).toBeLessThan(0.02);
  });

  it("does not select the same athlete consecutively but allows returning to it", () => {
    const initial = createInitialState(1_000);
    const athletes = [
      {
        ...initial.contacts[0],
        status: "enrolled" as const,
        arenaBase: 50,
        styleBase: 60,
      },
      {
        ...initial.contacts[1],
        status: "enrolled" as const,
        arenaBase: 50,
        styleBase: 60,
      },
    ];
    const baseState = { ...initial, contacts: athletes };
    const first = improveRandomAthletes(baseState, 1);
    const second = improveRandomAthletes(first.state, 1);
    const third = improveRandomAthletes(second.state, 1);

    expect(first.state.automation.lastImprovedAthleteId).toBeDefined();
    expect(second.state.automation.lastImprovedAthleteId).not.toBe(
      first.state.automation.lastImprovedAthleteId,
    );
    expect(third.state.automation.lastImprovedAthleteId).toBe(
      first.state.automation.lastImprovedAthleteId,
    );

    const batch = improveRandomAthletes(baseState, 4);
    expect(batch.improvements).toBe(4);
  });

  it("uses the favorite pool on the configured rare-priority roll", () => {
    const initial = createInitialState(1_000);
    const favorite = {
      ...initial.contacts[0],
      id: "favorite-athlete",
      status: "enrolled" as const,
      favorite: true,
      arenaBase: 50,
      styleBase: 50,
    };
    const ordinary = {
      ...initial.contacts[1],
      id: "ordinary-athlete",
      status: "enrolled" as const,
      favorite: false,
      arenaBase: 50,
      styleBase: 50,
    };
    let seed = 0;
    while (nextRandom(seed)[0] >= 0.025) seed += 1;

    const result = gameReducer({
      ...initial,
      randomSeed: seed,
      contacts: [favorite, ordinary],
      automation: { ...initial.automation, lessonBuffer: 0.99 },
      collaborators: [{
        id: "collaborator-favorite-priority",
        contactId: initial.contacts[2].id,
        displayName: "Preparatore Atletico",
        joinedAt: 1_000,
        forms: [],
        instructorForms: [],
        assignment: "lessons" as const,
        rarity: "rare" as const,
      }],
    }, { type: "TICK", now: 2_000 });

    expect(result.automation.lastImprovedAthleteId).toBe("favorite-athlete");
    expect(result.contacts[0].arenaBase ?? 0).toBeGreaterThanOrEqual(50);
  });

  it("runs paid Social campaigns after the fifteen-member unlock", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 30, activeMembers: 15 },
      unlocks: { ...initial.unlocks, social: true },
    };

    const campaigned = gameReducer(funded, { type: "RUN_SOCIAL_CAMPAIGN", now: 2_000 });

    expect(campaigned.school.euros).toBe(5);
    expect(campaigned.statistics.socialCampaigns).toBe(1);
    expect(campaigned.statistics.socialContacts).toBeGreaterThanOrEqual(4);
    expect(
      campaigned.contacts
        .filter((contact) => contact.source === "social")
        .every((contact) => contact.rarity !== "common"),
    ).toBe(true);
  });

  it("trains members once per school year, pauses in summer, and restarts in September", () => {
    const initial = createInitialState(1_000);
    const member = { ...initial.contacts[0], status: "enrolled" as const };
    const instructor = {
      id: "instructor-form-1",
      contactId: initial.contacts[1].id,
      displayName: "Istruttore Forma 1",
      joinedAt: 1_000,
      forms: ["form-1" as const, "course-x" as const],
      instructorForms: ["form-1" as const],
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, activeMembers: 1, euros: 200 },
      contacts: initial.contacts.map((contact) => contact.id === member.id ? member : contact),
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };

    const blocked = gameReducer(ready, { type: "START_FORM_TRAINING", personId: member.id, formId: "form-2", now: 2_000 });
    const training = gameReducer(ready, { type: "START_FORM_TRAINING", personId: member.id, formId: "form-1", now: 2_000 });
    const completed = gameReducer(training, { type: "TICK", now: 22_000 });
    const juneState = { ...completed, school: { ...completed.school, currentMonth: 18 } };
    const annualBlock = gameReducer(juneState, { type: "START_FORM_TRAINING", personId: member.id, formId: "course-x", now: 23_000 });
    const julyState = { ...completed, school: { ...completed.school, currentMonth: 19 } };
    const summerBlock = gameReducer(julyState, { type: "START_FORM_TRAINING", personId: member.id, formId: "course-x", now: 23_000 });
    const septemberState = { ...completed, school: { ...completed.school, currentMonth: 21 } };
    const duplicateBlock = gameReducer(septemberState, { type: "START_FORM_TRAINING", personId: member.id, formId: "form-1", now: 23_000 });
    const nextSchoolYear = gameReducer(septemberState, { type: "START_FORM_TRAINING", personId: member.id, formId: "course-x", now: 23_000 });

    expect(blocked).toBe(ready);
    expect(training.school.euros).toBe(193.75);
    expect(training.contacts[0].training?.formId).toBe("form-1");
    expect(completed.contacts[0].forms).toContain("form-1");
    expect(completed.contacts[0].training).toBeUndefined();
    expect(completed.statistics.formsCompleted).toBe(1);
    expect(annualBlock).toBe(juneState);
    expect(summerBlock).toBe(julyState);
    expect(duplicateBlock).toBe(septemberState);
    expect(nextSchoolYear.contacts[0].training?.formId).toBe("course-x");
    expect(nextSchoolYear.contacts[0].lastFormTrainingYear).toBe(2);
    expect(completed.collaborators).toHaveLength(1);
  });

  it("allows manual member training without an Instructor at the base cost", () => {
    const initial = createInitialState(1_000);
    const member = { ...initial.contacts[0], status: "enrolled" as const };
    const ready = {
      ...initial,
      school: { ...initial.school, activeMembers: 1, euros: 25 },
      contacts: initial.contacts.map((contact) => contact.id === member.id ? member : contact),
      unlocks: { ...initial.unlocks, forms: true },
    };

    const training = gameReducer(ready, {
      type: "START_FORM_TRAINING",
      personId: member.id,
      formId: "form-1",
      now: 2_000,
    });

    expect(training.school.euros).toBe(0);
    expect(training.contacts[0].training?.formId).toBe("form-1");
    expect(training.contacts[0].training?.instructorId).toBeUndefined();
    expect(training.contacts[0].training?.completesAt).toBe(22_000);
  });

  it("applies Tocco DiGilo only when an Instructor teaches a Form", () => {
    const initial = createInitialState(1_000);
    const member = { ...initial.contacts[0], status: "enrolled" as const };
    const instructor = {
      id: "divine-instructor",
      contactId: initial.contacts[1].id,
      displayName: "Istruttore Divino",
      joinedAt: 1_000,
      forms: ["form-1" as const],
      instructorForms: ["form-1" as const],
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, activeMembers: 1, euros: 25 },
      contacts: initial.contacts.map((contact) => contact.id === member.id ? member : contact),
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
      upgrades: { ...initial.upgrades, "divine-touch": 1 },
    };

    const training = gameReducer(ready, {
      type: "START_FORM_TRAINING",
      personId: member.id,
      formId: "form-1",
      now: 2_000,
    });

    expect(training.contacts[0].training?.instructorId).toBe(instructor.id);
    expect(training.contacts[0].training?.completesAt).toBe(3_000);
  });

  it("assigns the Instructor role for free and charges explicit 200% qualifications", () => {
    const initial = createInitialState(1_000);
    const collaborator = {
      id: "instructor-conversion",
      contactId: initial.contacts[0].id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: ["form-1" as const, "course-x" as const, "form-2" as const],
      instructorForms: [] as Array<"form-1" | "form-2">,
      assignment: null,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, euros: 400 },
      collaborators: [collaborator],
      unlocks: { ...initial.unlocks, forms: true },
    };

    const assigned = gameReducer(ready, {
      type: "ASSIGN_COLLABORATOR",
      collaboratorId: collaborator.id,
      assignment: "instructor",
      now: 2_000,
    });
    const qualifiedFormOne = gameReducer(assigned, {
      type: "START_FORM_TRAINING",
      personId: collaborator.id,
      formId: "form-1",
      now: 2_000,
    });

    expect(assigned.school.euros).toBe(400);
    expect(assigned.collaborators[0].assignment).toBe("instructor");
    expect(assigned.collaborators[0].instructorForms).toEqual([]);

    const bulkQualified = gameReducer(assigned, {
      type: "PAY_INSTRUCTOR_CERTIFICATES",
      collaboratorId: collaborator.id,
      now: 2_000,
    });

    expect(bulkQualified.school.euros).toBe(50);
    expect(bulkQualified.collaborators[0].instructorForms).toEqual(["form-1", "course-x", "form-2"]);
    expect(qualifiedFormOne.school.euros).toBe(350);
    expect(qualifiedFormOne.collaborators[0].instructorForms).toEqual(["form-1"]);
    expect(qualifiedFormOne.messages.some((message) => message.subject === "Qualifica da Istruttore ottenuta")).toBe(true);

    const coveredByPagoSport = {
      ...assigned,
      school: { ...assigned.school, euros: 0 },
      upgrades: { ...assigned.upgrades, pagosport: 3 },
    };
    const freeBulkQualification = gameReducer(coveredByPagoSport, {
      type: "PAY_INSTRUCTOR_CERTIFICATES",
      collaboratorId: collaborator.id,
      now: 2_000,
    });
    expect(freeBulkQualification.school.euros).toBe(0);
    expect(freeBulkQualification.collaborators[0].instructorForms).toEqual([
      "form-1",
      "course-x",
      "form-2",
    ]);
  });

  it.each([19, 20])("charges an Instructor 300% total for a new Form and includes its qualification during summer month %i", (currentMonth) => {
    const initial = createInitialState(1_000);
    const instructor = {
      id: "instructor-training",
      contactId: initial.contacts[0].id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: ["form-1" as const, "course-x" as const],
      instructorForms: ["form-1" as const],
      assignment: "instructor" as const,
      rarity: "legendary" as const,
      lastFormTrainingYear: 1,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, currentMonth, euros: 400 },
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };

    const training = gameReducer(ready, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "form-2",
      now: 2_000,
    });
    const completed = gameReducer(training, { type: "TICK", now: 32_000 });
    const freeTraining = gameReducer({
      ...ready,
      school: { ...ready.school, euros: 0 },
      upgrades: { ...ready.upgrades, pagosport: 3 },
    }, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "form-2",
      now: 2_000,
    });

    expect(training.school.euros).toBe(100);
    expect(training.collaborators[0].lastFormTrainingYear).toBe(2);
    expect(training.collaborators[0].formTrainingYearCount).toBe(1);
    expect(training.collaborators[0].training?.includesInstructorCertification).toBe(true);
    expect(completed.collaborators[0].forms).toContain("form-2");
    expect(completed.collaborators[0].instructorForms).toContain("form-2");
    expect(freeTraining.school.euros).toBe(0);
    expect(freeTraining.collaborators[0].training?.formId).toBe("form-2");
  });

  it("counts an Instructor's July course in the upcoming year and Extra Form adds one slot", () => {
    const initial = createInitialState(1_000);
    const instructor = {
      id: "instructor-extra-form",
      contactId: initial.contacts[0].id,
      displayName: "Istruttore Extra Forma",
      joinedAt: 1_000,
      forms: ["form-1", "course-x"] as FormId[],
      instructorForms: ["form-1", "course-x"] as FormId[],
      assignment: "instructor" as const,
      rarity: "legendary" as const,
      lastFormTrainingYear: 1,
      formTrainingYearCount: 1,
    };
    const julyState = {
      ...initial,
      school: { ...initial.school, currentMonth: 19, euros: 5_000 },
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };
    const julyTraining = gameReducer(julyState, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "form-2",
      now: 2_000,
    });
    const julyCompleted = gameReducer(julyTraining, { type: "TICK", now: 100_000 });
    const septemberState = {
      ...julyCompleted,
      school: { ...julyCompleted.school, currentMonth: 21 },
    };
    const blockedWithoutUpgrade = gameReducer(septemberState, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "course-y",
      now: 101_000,
    });
    const septemberWithExtraForm = {
      ...septemberState,
      upgrades: { ...septemberState.upgrades, "extra-form": 1 },
    };
    const secondTraining = gameReducer(septemberWithExtraForm, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "course-y",
      now: 101_000,
    });
    const secondCompleted = gameReducer(secondTraining, { type: "TICK", now: 200_000 });
    const thirdTraining = gameReducer(secondCompleted, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "form-3-long",
      now: 201_000,
    });

    expect(julyTraining.collaborators[0].lastFormTrainingYear).toBe(2);
    expect(julyTraining.collaborators[0].formTrainingYearCount).toBe(1);
    expect(blockedWithoutUpgrade).toBe(septemberState);
    expect(secondTraining.collaborators[0].training?.formId).toBe("course-y");
    expect(secondTraining.collaborators[0].formTrainingYearCount).toBe(2);
    expect(thirdTraining).toBe(secondCompleted);
  });

  it("slows an Instructor's own training while teaching and restores the normal speed when teaching stops", () => {
    const initial = createInitialState(1_000);
    const instructor = {
      id: "busy-instructor",
      contactId: initial.contacts[0].id,
      displayName: "Istruttore Impegnato",
      joinedAt: 1_000,
      forms: ["form-1", "course-x"] as FormId[],
      instructorForms: ["form-1", "course-x"] as FormId[],
      autoTeachingEnabled: true,
      assignment: "instructor" as const,
      rarity: "legendary" as const,
      lastFormTrainingYear: 1,
    };
    const student = {
      ...initial.contacts[1],
      status: "enrolled" as const,
      forms: ["form-1", "course-x"] as FormId[],
      training: {
        formId: "form-2" as const,
        startedAt: 1_000,
        completesAt: 11_000,
        instructorId: instructor.id,
      },
    };
    const ready = {
      ...initial,
      school: { ...initial.school, currentMonth: 21, euros: 1_000 },
      contacts: initial.contacts.map((contact) => contact.id === student.id ? student : contact),
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };
    const training = gameReducer(ready, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "form-2",
      now: 2_000,
    });
    const normalDuration = Math.round(
      30_000 / getCollaboratorProductivity(instructor, "instructor"),
    );
    const slowTraining = training.collaborators[0].training!;

    expect(slowTraining.completesAt - slowTraining.startedAt).toBe(normalDuration * 3);
    expect(slowTraining.instructorTrainingDurationMultiplier).toBe(3);

    const disabled = gameReducer(training, {
      type: "TOGGLE_INSTRUCTOR_AUTOMATION",
      collaboratorId: instructor.id,
      enabled: false,
      now: 6_000,
    });
    const remainingSlowWork = (slowTraining.completesAt - 6_000) / 3;
    expect(disabled.collaborators[0].training?.completesAt).toBe(
      6_000 + Math.round(remainingSlowWork),
    );
    expect(disabled.collaborators[0].training?.instructorTrainingDurationMultiplier).toBe(1);

    const studentFinished = gameReducer(training, { type: "TICK", now: 12_000 });
    expect(studentFinished.collaborators[0].training?.completesAt).toBe(
      12_000 + Math.round((slowTraining.completesAt - 12_000) / 3),
    );
  });

  it("uses the Instructor discount when available and falls back to manual training", () => {
    const initial = createInitialState(1_000);
    const [firstContact, secondContact, instructorContact] = initial.contacts;
    const first = { ...firstContact, status: "enrolled" as const };
    const second = { ...secondContact, status: "enrolled" as const };
    const instructor = {
      id: "single-capacity-instructor",
      contactId: instructorContact.id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: ["form-1" as const],
      instructorForms: ["form-1" as const],
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, activeMembers: 2, euros: 100 },
      contacts: initial.contacts.map((contact) =>
        contact.id === first.id ? first : contact.id === second.id ? second : contact
      ),
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };

    const firstTraining = gameReducer(ready, {
      type: "START_FORM_TRAINING",
      personId: first.id,
      formId: "form-1",
      now: 2_000,
    });
    const secondBlocked = gameReducer(firstTraining, {
      type: "START_FORM_TRAINING",
      personId: second.id,
      formId: "form-1",
      now: 3_000,
    });

    expect(firstTraining.contacts.find((contact) => contact.id === first.id)?.training?.instructorId).toBe(instructor.id);
    expect(secondBlocked.contacts.find((contact) => contact.id === second.id)?.training?.instructorId).toBeUndefined();
    expect(secondBlocked.school.euros).toBe(68.75);
  });

  it("starts automatic teaching, respects pause, and fills six Tiamat slots", () => {
    const initial = createInitialState(1_000);
    const students = Array.from({ length: 6 }, (_, index) => ({
      ...initial.contacts[index % initial.contacts.length],
      id: `tiamat-student-${index}`,
      status: "enrolled" as const,
      forms: [],
      training: undefined,
      lastFormTrainingYear: undefined,
    }));
    const instructor = {
      id: "tiamat-instructor",
      contactId: "external-instructor-contact",
      displayName: "Istruttore Tiamat",
      joinedAt: 1_000,
      forms: ["form-1" as const],
      instructorForms: ["form-1" as const],
      formBranchPreferences: ["Spada Lunga" as const],
      autoTeachingEnabled: true,
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, activeMembers: 6, euros: 0 },
      contacts: students,
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
      upgrades: {
        ...initial.upgrades,
        "promiscuous-instructor": 1,
        "tiamat-instructor": 4,
        pagosport: 3,
      },
    };

    const promiscuousOnly = gameReducer({
      ...ready,
      upgrades: {
        ...ready.upgrades,
        "tiamat-instructor": 0,
      },
    }, { type: "TICK", now: 2_000 });
    const teaching = gameReducer(ready, { type: "TICK", now: 2_000 });
    expect(promiscuousOnly.contacts.filter((contact) => contact.training).length).toBe(2);
    expect(teaching.contacts.filter((contact) => contact.training).length).toBe(6);
    expect(teaching.school.euros).toBe(0);

    const paused = gameReducer({
      ...ready,
      collaborators: [{ ...instructor, autoTeachingEnabled: false }],
    }, { type: "TICK", now: 2_000 });
    expect(paused.contacts.every((contact) => !contact.training)).toBe(true);
    expect(paused.school.euros).toBe(0);
  });

  it("gives favorite athletes priority for automatic instructor courses", () => {
    const initial = createInitialState(1_000);
    const favorite = {
      ...initial.contacts[0],
      id: "favorite-student",
      status: "enrolled" as const,
      acquiredAt: 1_000,
      forms: [] as FormId[],
      favorite: true,
    };
    const newerStudent = {
      ...initial.contacts[1],
      id: "newer-student",
      status: "enrolled" as const,
      acquiredAt: 2_000,
      forms: [] as FormId[],
      favorite: false,
    };
    const instructor = {
      id: "favorite-instructor",
      contactId: "external-favorite-instructor",
      displayName: "Istruttore Preferiti",
      joinedAt: 1_000,
      forms: ["form-1" as const],
      instructorForms: ["form-1" as const],
      formBranchPreferences: ["Spada Lunga" as const],
      autoTeachingEnabled: true,
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, activeMembers: 2, euros: 100 },
      contacts: [favorite, newerStudent],
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };

    const toggled = gameReducer(
      { ...ready, contacts: [{ ...favorite, favorite: false }, newerStudent] },
      { type: "TOGGLE_MEMBER_FAVORITE", contactId: favorite.id },
    );
    expect(toggled.contacts[0].favorite).toBe(true);

    const teaching = gameReducer(ready, { type: "TICK", now: 2_000 });
    expect(teaching.contacts.find((contact) => contact.id === favorite.id)?.training?.formId)
      .toBe("form-1");
    expect(teaching.contacts.find((contact) => contact.id === newerStudent.id)?.training)
      .toBeUndefined();
  });

  it("prioritizes effective departure risk before favorites", () => {
    const initial = createInitialState(1_000);
    const highRisk = {
      ...initial.contacts[0],
      id: "high-risk-student",
      status: "enrolled" as const,
      acquiredAt: 1_000,
      forms: [] as FormId[],
      favorite: false,
      rarity: "common" as const,
    };
    const lowRiskFavorite = {
      ...initial.contacts[1],
      id: "low-risk-favorite",
      status: "enrolled" as const,
      acquiredAt: 2_000,
      forms: [
        "form-1", "course-x", "form-2", "course-y",
        "form-3-long", "form-4-long", "form-5-long", "form-6", "form-7",
      ] as FormId[],
      favorite: true,
      rarity: "common" as const,
    };
    const instructor = {
      id: "risk-priority-instructor",
      contactId: "external-risk-priority-instructor",
      displayName: "Istruttore Rischio",
      joinedAt: 1_000,
      forms: ["form-1" as const],
      instructorForms: ["form-1" as const],
      autoTeachingEnabled: true,
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, currentMonth: 21, euros: 100 },
      contacts: [highRisk, lowRiskFavorite],
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };

    const teaching = gameReducer(ready, { type: "TICK", now: 2_000 });

    expect(teaching.contacts.find((contact) => contact.id === highRisk.id)?.training?.formId)
      .toBe("form-1");
    expect(teaching.contacts.find((contact) => contact.id === lowRiskFavorite.id)?.training)
      .toBeUndefined();
  });

  it("prioritizes collaborators after favorite members within the same effective risk", () => {
    const initial = createInitialState(1_000);
    const favorite = {
      ...initial.contacts[0],
      id: "favorite-zero-risk",
      status: "enrolled" as const,
      forms: [] as FormId[],
      favorite: true,
      rarity: "legendary" as const,
    };
    const regular = {
      ...initial.contacts[1],
      id: "regular-zero-risk",
      status: "enrolled" as const,
      forms: [] as FormId[],
      favorite: false,
      rarity: "legendary" as const,
    };
    const collaboratorContact = {
      ...initial.contacts[2],
      id: "collaborator-student-contact",
      status: "enrolled" as const,
      forms: [] as FormId[],
      favorite: false,
      rarity: "common" as const,
    };
    const instructor = {
      id: "collaborator-priority-instructor",
      contactId: "external-collaborator-priority-instructor",
      displayName: "Istruttore Priorità",
      joinedAt: 1_000,
      forms: ["form-1" as const],
      instructorForms: ["form-1" as const],
      autoTeachingEnabled: true,
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const studentCollaborator = {
      id: "collaborator-student",
      contactId: collaboratorContact.id,
      displayName: "Collaboratore Allievo",
      joinedAt: 1_000,
      forms: [] as FormId[],
      instructorForms: [] as FormId[],
      assignment: "lessons" as const,
      rarity: "common" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, currentMonth: 21, euros: 100 },
      contacts: [favorite, regular, collaboratorContact],
      collaborators: [instructor, studentCollaborator],
      unlocks: { ...initial.unlocks, forms: true },
      upgrades: { ...initial.upgrades, "promiscuous-instructor": 1 },
    };

    const teaching = gameReducer(ready, { type: "TICK", now: 2_000 });

    expect(teaching.contacts.find((contact) => contact.id === favorite.id)?.training?.formId)
      .toBe("form-1");
    expect(teaching.collaborators.find((collaborator) => collaborator.id === studentCollaborator.id)?.training?.formId)
      .toBe("form-1");
    expect(teaching.contacts.find((contact) => contact.id === regular.id)?.training)
      .toBeUndefined();
  });

  it("uses the most recent acquiredAt as the final automatic priority", () => {
    const initial = createInitialState(1_000);
    const older = {
      ...initial.contacts[0],
      id: "older-student",
      status: "enrolled" as const,
      acquiredAt: 1_000,
      forms: [] as FormId[],
      favorite: false,
      rarity: "common" as const,
    };
    const newer = {
      ...initial.contacts[1],
      id: "newer-student",
      status: "enrolled" as const,
      acquiredAt: 2_000,
      forms: [] as FormId[],
      favorite: false,
      rarity: "common" as const,
    };
    const instructor = {
      id: "recent-priority-instructor",
      contactId: "external-recent-priority-instructor",
      displayName: "Istruttore Acquisizioni",
      joinedAt: 1_000,
      forms: ["form-1" as const],
      instructorForms: ["form-1" as const],
      autoTeachingEnabled: true,
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, currentMonth: 21, euros: 100 },
      contacts: [older, newer],
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };

    const teaching = gameReducer(ready, { type: "TICK", now: 2_000 });

    expect(teaching.contacts.find((contact) => contact.id === newer.id)?.training?.formId)
      .toBe("form-1");
    expect(teaching.contacts.find((contact) => contact.id === older.id)?.training)
      .toBeUndefined();
  });

  it("allows an Instructor in formation to teach and applies the slowdown", () => {
    const initial = createInitialState(1_000);
    const student = {
      ...initial.contacts[1],
      id: "student-with-training-instructor",
      status: "enrolled" as const,
      forms: [] as FormId[],
      training: undefined,
    };
    const instructor = {
      id: "training-instructor",
      contactId: initial.contacts[0].id,
      displayName: "Istruttore in Formazione",
      joinedAt: 1_000,
      forms: ["form-1", "course-x"] as FormId[],
      instructorForms: ["form-1", "course-x"] as FormId[],
      autoTeachingEnabled: true,
      assignment: "instructor" as const,
      rarity: "legendary" as const,
      training: {
        formId: "form-2" as const,
        startedAt: 1_000,
        completesAt: 100_000,
        instructorTrainingDurationMultiplier: 1,
      },
    };
    const ready = {
      ...initial,
      school: { ...initial.school, currentMonth: 21, euros: 100 },
      contacts: initial.contacts.map((contact) => contact.id === initial.contacts[1].id ? student : contact),
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };

    const teaching = gameReducer(ready, { type: "TICK", now: 2_000 });

    expect(teaching.contacts.find((contact) => contact.id === student.id)?.training?.instructorId)
      .toBe(instructor.id);
    expect(teaching.collaborators[0].training?.instructorTrainingDurationMultiplier).toBe(3);
  });

  it("generates one to three weapon preferences when Course Y is completed", () => {
    const initial = createInitialState(1_000);
    const member = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      forms: ["form-1", "course-x", "form-2"] as FormId[],
    };
    const instructor = {
      id: "course-y-instructor",
      contactId: "external-course-y-instructor",
      displayName: "Istruttore Corso Y",
      joinedAt: 1_000,
      forms: ["course-y" as const],
      instructorForms: ["course-y" as const],
      autoTeachingEnabled: true,
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, euros: 100 },
      contacts: initial.contacts.map((contact) => contact.id === member.id ? member : contact),
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };
    const training = gameReducer(ready, {
      type: "START_FORM_TRAINING",
      personId: member.id,
      formId: "course-y",
      now: 2_000,
    });
    const completed = gameReducer(training, { type: "TICK", now: 37_000 });
    const preferences = completed.contacts.find((contact) => contact.id === member.id)
      ?.formBranchPreferences ?? [];

    expect(preferences.length).toBeGreaterThanOrEqual(1);
    expect(preferences.length).toBeLessThanOrEqual(3);
    expect(new Set(preferences).size).toBe(preferences.length);
  });

  it("uses Polivalenza didattica to unlock additional Instructor weapon branches", () => {
    const initial = createInitialState(1_000);
    const instructor = {
      id: "versatile-instructor",
      contactId: "external-versatile-instructor",
      displayName: "Istruttore Polivalente",
      joinedAt: 1_000,
      forms: ["form-1", "course-x", "form-2", "course-y", "form-3-long"] as FormId[],
      instructorForms: ["form-1", "form-2", "course-y", "form-3-long"] as FormId[],
      formBranchPreferences: ["Spada Lunga" as const],
      autoTeachingEnabled: true,
      assignment: "instructor" as const,
      rarity: "legendary" as const,
      lastFormTrainingYear: 1,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, currentMonth: 21, euros: 2_000 },
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };
    const blocked = gameReducer(ready, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "form-3-staff",
      now: 2_000,
    });
    const unlocked = gameReducer({
      ...ready,
      upgrades: { ...ready.upgrades, "instructor-versatility": 1 },
    }, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "form-3-staff",
      now: 2_000,
    });

    expect(blocked).toBe(ready);
    expect(unlocked.collaborators[0].training?.formId).toBe("form-3-staff");
    expect(unlocked.school.euros).toBe(200);
  });

  it("creates an Ultra Rare collaborator at Course Y and applies rarity bonuses", () => {
    const initial = createInitialState(1_000);
    const member = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      rarity: "ultra-rare" as const,
      forms: ["form-1", "course-x", "form-2"] as const,
      lastFormTrainingYear: 8,
    };
    const instructor = {
      id: "instructor-course-y",
      contactId: initial.contacts[1].id,
      displayName: "Istruttore Corso Y",
      joinedAt: 1_000,
      forms: ["course-y" as const],
      instructorForms: ["course-y" as const],
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, activeMembers: 1, currentMonth: 109, euros: 1_000 },
      contacts: initial.contacts.map((contact) => contact.id === member.id
        ? { ...member, forms: [...member.forms] }
        : contact),
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };
    const training = gameReducer(ready, { type: "START_FORM_TRAINING", personId: member.id, formId: "course-y", now: 2_000 });
    const completed = gameReducer(training, { type: "TICK", now: 37_000 });
    const collaborator = completed.collaborators.find((candidate) => candidate.contactId === member.id)!;

    expect(collaborator.forms.at(-1)).toBe("course-y");
    expect(completed.unlocks.collaborators).toBe(true);
    expect(completed.statistics.collaboratorsRecruited).toBe(1);
    const longFormFive = { ...collaborator, forms: ["form-1", "course-x", "form-2", "course-y", "form-3-long", "form-4-long", "form-5-long"] as const, formBranchPreferences: ["Spada Lunga" as const], assignment: "events" as const };
    expect(getCollaboratorProductivity({ ...longFormFive, forms: [...longFormFive.forms] })).toBe(1.5);
    expect(getAvailableForms({ ...longFormFive, forms: [...longFormFive.forms] }, 8).map((form) => form.id)).toEqual(["form-6"]);

    const legendary = { ...longFormFive, rarity: "legendary" as const, forms: [...longFormFive.forms, "form-6"] as const, lastFormTrainingYear: 8 };
    expect(getCollaboratorProductivity({ ...legendary, forms: [...legendary.forms] })).toBe(3.2);
    expect(getAvailableForms({ ...legendary, forms: [...legendary.forms] }, 9).map((form) => form.id)).toEqual(["form-7"]);

    const rareReady = {
      ...ready,
      contacts: ready.contacts.map((contact) =>
        contact.id === member.id ? { ...contact, rarity: "rare" as const } : contact,
      ),
    };
    const rareTraining = gameReducer(rareReady, {
      type: "START_FORM_TRAINING",
      personId: member.id,
      formId: "course-y",
      now: 2_000,
    });
    const rareCompleted = gameReducer(rareTraining, { type: "TICK", now: 37_000 });
    expect(rareCompleted.contacts.find((contact) => contact.id === member.id)?.forms)
      .toContain("course-y");
    expect(rareCompleted.collaborators.some((candidate) => candidate.contactId === member.id))
      .toBe(false);
  });
});
