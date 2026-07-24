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
import {
  improveRandomAthletes,
  resolveSocialContentCycles,
} from "./collaboratorAutomationOutcomes";
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

  it("turns Redazione work into Social content without immediate income or trials", () => {
    const initial = createInitialState(1_000);
    const socialCollaborator = {
      id: "collaborator-social",
      contactId: initial.contacts[0].id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "writing" as const,
      mastery: {
        writing: 0,
        events: 0,
        equipment: 0,
        instructor: 0,
      },
      rarity: "ultra-rare" as const,
    };
    const automated = gameReducer(
      {
        ...initial,
        randomSeed: 1,
        school: { ...initial.school, followers: 1_000, euros: 1 },
        contacts: [],
        emails: [],
        collaborators: [socialCollaborator],
        unlocks: { ...initial.unlocks, collaborators: true, social: true },
        automation: {
          ...initial.automation,
          socialContentBuffer: 7_495,
        },
      },
      { type: "TICK", now: 2_000 },
    );

    expect(automated.school.euros).toBe(1);
    expect(automated.school.followers).toBe(
      1_000 + automated.statistics.socialFollowersGained,
    );
    expect(automated.school.historicMembers).toBe(
      initial.school.historicMembers + automated.statistics.socialFollowersGained,
    );
    expect(automated.statistics.eurosEarned).toBe(0);
    expect(automated.collaborators[0].mastery?.writing).toBe(1);
    expect(automated.statistics.socialContentCycles).toBe(1);
    expect(automated.automation.socialContentBuffer).toBe(0);
    expect(automated.contacts).toHaveLength(automated.statistics.socialContacts);
    expect(automated.contacts.every((contact) => contact.source === "social")).toBe(true);
    expect(automated.scheduledTrials).toHaveLength(0);
  });

  it("rolls Social followers and contacts independently", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, followers: 1_000 },
      contacts: [],
      emails: [],
      unlocks: { ...initial.unlocks, social: true },
    };
    let followerSeed = 0;
    let contactSeed = 0;
    for (let seed = 1; ; seed += 1) {
      const [followerRoll, afterFollower] = nextRandom(seed);
      const [contactRoll] = nextRandom(afterFollower);
      if (followerRoll < 0.05 && contactRoll >= 0.05) followerSeed = seed;
      if (followerRoll >= 0.05 && contactRoll < 0.05) contactSeed = seed;
      if (followerSeed > 0 && contactSeed > 0) break;
    }

    const followerOnly = resolveSocialContentCycles(
      { ...state, randomSeed: followerSeed },
      1,
      2_000,
    );
    const contactOnly = resolveSocialContentCycles(
      { ...state, randomSeed: contactSeed },
      1,
      2_000,
    );

    expect(followerOnly).toMatchObject({ followersGained: 1, contactsAcquired: 0 });
    expect(followerOnly.state.school.followers).toBe(1_001);
    expect(followerOnly.state.school.historicMembers).toBe(
      initial.school.historicMembers + 1,
    );
    expect(contactOnly).toMatchObject({ followersGained: 0, contactsAcquired: 1 });
    expect(contactOnly.state.school.followers).toBe(1_000);
    expect(contactOnly.state.contacts[0]).toMatchObject({
      source: "social",
      status: "available",
    });
    expect(contactOnly.state.scheduledTrials).toHaveLength(0);
  });

  it("accelerates automatic repair as mastery grows and pays 75% of manual cost", () => {
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
      school: { ...initial.school, euros: 187.5 },
      collaborators: [collaborator],
      equipment: { ...initial.equipment, availableSwords: 5, damagedSwords: 1 },
      unlocks: { ...initial.unlocks, collaborators: true },
    };

    let repairedAtTick: number | undefined;
    for (let tick = 1; tick <= 224; tick += 1) {
      state = gameReducer(state, { type: "TICK", now: 1_000 + tick * 1_000 });
      if (state.equipment.damagedSwords === 0) {
        repairedAtTick = tick;
        break;
      }
    }

    expect(repairedAtTick).toBeGreaterThan(60);
    expect(repairedAtTick).toBeLessThan(225);
    expect(state.equipment).toMatchObject({ availableSwords: 6, damagedSwords: 0, wear: 0 });
    expect(state.automation.equipmentBuffer).toBe(0);
    expect(state.school.euros).toBe(0);
  });

  it("spends automatic work on healthy-sword wear before a broken sword", () => {
    const initial = createInitialState(1_000);
    const collaborator = {
      id: "collaborator-equipment-priority",
      contactId: initial.contacts[0].id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "equipment" as const,
      rarity: "rare" as const,
    };
    const state: GameState = {
      ...initial,
      school: { ...initial.school, euros: 1.5 },
      collaborators: [collaborator],
      equipment: {
        ...initial.equipment,
        availableSwords: 5,
        damagedSwords: 1,
        wear: 2,
      },
      unlocks: { ...initial.unlocks, collaborators: true },
    };

    const firstTick = gameReducer(state, {
      type: "TICK",
      now: 2_000,
    });
    const repaired = gameReducer(firstTick, {
      type: "TICK",
      now: 3_000,
    });

    expect(repaired.equipment).toMatchObject({
      availableSwords: 5,
      damagedSwords: 1,
      wear: 1,
    });
    expect(repaired.automation.equipmentBuffer).toBe(0);
    expect(repaired.school.euros).toBe(0);
  });

  it("uses an idle Instructor to improve Arena or Style after unlocking athletic preparation", () => {
    const initial = createInitialState(1_000);
    const athlete = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      arenaBase: 50,
      styleBase: 60,
    };
    const lessonCollaborator = {
      id: "collaborator-athletic-preparation",
      contactId: initial.contacts[1].id,
      displayName: "Maestro Casuale",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "instructor" as const,
      rarity: "ultra-rare" as const,
    };
    const automated = gameReducer({
      ...initial,
      contacts: [athlete],
      collaborators: [lessonCollaborator],
      automation: { ...initial.automation, lessonBuffer: 0.99 },
      upgrades: { ...initial.upgrades, "athletic-preparation": 1 },
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
        displayName: "Istruttore preparazione atletica",
        joinedAt: 1_000,
        forms: [],
        instructorForms: [],
        assignment: "instructor" as const,
        rarity: "rare" as const,
      }],
      upgrades: { ...initial.upgrades, "athletic-preparation": 1 },
    }, { type: "TICK", now: 2_000 });

    expect(result.automation.lastImprovedAthleteId).toBe("favorite-athlete");
    expect(result.contacts[0].arenaBase ?? 0).toBeGreaterThanOrEqual(50);
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
    const completed = gameReducer(
      { ...training, randomSeed: 1 },
      { type: "TICK", now: 22_000 },
    );
    const juneState = { ...completed, school: { ...completed.school, currentMonth: 18 } };
    const annualBlock = gameReducer(juneState, { type: "START_FORM_TRAINING", personId: member.id, formId: "course-x", now: 23_000 });
    const julyState = { ...completed, school: { ...completed.school, currentMonth: 19 } };
    const summerBlock = gameReducer(julyState, { type: "START_FORM_TRAINING", personId: member.id, formId: "course-x", now: 23_000 });
    const septemberState = { ...completed, school: { ...completed.school, currentMonth: 21 } };
    const duplicateBlock = gameReducer(septemberState, { type: "START_FORM_TRAINING", personId: member.id, formId: "form-1", now: 23_000 });
    const nextSchoolYear = gameReducer(septemberState, { type: "START_FORM_TRAINING", personId: member.id, formId: "course-x", now: 23_000 });

    expect(blocked).toBe(ready);
    expect(training.school.euros).toBe(162.5);
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
      school: { ...initial.school, activeMembers: 1, euros: 50 },
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
      school: { ...initial.school, activeMembers: 1, euros: 50 },
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

  it("assigns the Instructor role for free and starts a timed 250% qualification", () => {
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
      school: { ...initial.school, euros: 1_500 },
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

    expect(assigned.school.euros).toBe(1_500);
    expect(assigned.collaborators[0].assignment).toBe("instructor");
    expect(assigned.collaborators[0].instructorForms).toEqual([]);

    expect(qualifiedFormOne.school.euros).toBe(1_375);
    expect(qualifiedFormOne.collaborators[0].instructorForms).toEqual([]);
    expect(qualifiedFormOne.collaborators[0].training).toMatchObject({
      formId: "form-1",
      trainingTrack: "instructor",
      trainingPhase: "instructor",
      trainingBaseDurationMs: 7_500,
    });
  });

  it.each([19, 20])("charges 350% and doubles a combined Instructor course during summer month %i", (currentMonth) => {
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
      school: { ...initial.school, currentMonth, euros: 1_200 },
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };

    const training = gameReducer(ready, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "form-2",
      now: 2_000,
    });
    const pagoSportTraining = gameReducer({
      ...ready,
      school: { ...ready.school, euros: 1_200 },
      upgrades: { ...ready.upgrades, pagosport: 3 },
    }, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "form-2",
      now: 2_000,
    });

    expect(training.school.euros).toBe(325);
    expect(training.collaborators[0].lastFormTrainingYear).toBe(2);
    expect(training.collaborators[0].formTrainingYearCount).toBe(1);
    expect(training.collaborators[0].training?.includesInstructorCertification).toBe(true);
    expect(training.collaborators[0].training?.trainingBaseDurationMs).toBe(15_000);
    expect(training.collaborators[0].training?.completesAt).toBe(9_500);
    expect(pagoSportTraining.school.euros).toBe(325);
    expect(pagoSportTraining.collaborators[0].training?.completesAt).toBe(8_000);
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
    const julyAthleteCompleted = gameReducer(
      { ...julyTraining, randomSeed: 1 },
      { type: "TICK", now: 100_000 },
    );
    const julyCompleted = gameReducer(
      { ...julyAthleteCompleted, randomSeed: 1 },
      { type: "TICK", now: 200_000 },
    );
    const septemberState = {
      ...julyCompleted,
      school: { ...julyCompleted.school, currentMonth: 21 },
    };
    const blockedWithoutUpgrade = gameReducer(septemberState, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "course-y",
      now: 201_000,
    });
    const septemberWithExtraForm = {
      ...septemberState,
      upgrades: { ...septemberState.upgrades, "extra-form": 1 },
    };
    const secondTraining = gameReducer(septemberWithExtraForm, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "course-y",
      now: 201_000,
    });
    const secondAthleteCompleted = gameReducer(
      { ...secondTraining, randomSeed: 1 },
      { type: "TICK", now: 300_000 },
    );
    const secondCompleted = gameReducer(
      { ...secondAthleteCompleted, randomSeed: 1 },
      { type: "TICK", now: 400_000 },
    );
    const thirdTraining = gameReducer(secondCompleted, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "form-3-long",
      now: 401_000,
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

    const studentFinished = gameReducer(
      { ...training, randomSeed: 1 },
      { type: "TICK", now: 12_000 },
    );
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
    expect(secondBlocked.school.euros).toBe(12.5);
  });

  it("starts automatic teaching and fills six Tiamat slots", () => {
    const initial = createInitialState(1_000);
    const students = Array.from({ length: 8 }, (_, index) => ({
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
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, activeMembers: 8, euros: 300 },
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
    const nextTick = gameReducer(teaching, { type: "TICK", now: 3_000 });
    expect(promiscuousOnly.contacts.filter((contact) => contact.training).length).toBe(2);
    expect(teaching.contacts.filter((contact) => contact.training).length).toBe(6);
    expect(nextTick.contacts.filter((contact) => contact.training).length).toBe(6);
    expect(teaching.school.euros).toBe(75);

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

  it("prioritizes favorites before effective departure risk", () => {
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
      forms: [] as FormId[],
      favorite: true,
      rarity: "legendary" as const,
    };
    const instructor = {
      id: "risk-priority-instructor",
      contactId: "external-risk-priority-instructor",
      displayName: "Istruttore Rischio",
      joinedAt: 1_000,
      forms: ["form-1" as const],
      instructorForms: ["form-1" as const],
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

    expect(teaching.contacts.find((contact) => contact.id === lowRiskFavorite.id)?.training?.formId)
      .toBe("form-1");
    expect(teaching.contacts.find((contact) => contact.id === highRisk.id)?.training)
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
      assignment: null,
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
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, euros: 500 },
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
    const completed = gameReducer(
      { ...training, randomSeed: 1 },
      { type: "TICK", now: 37_000 },
    );
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
      assignment: "instructor" as const,
      rarity: "legendary" as const,
      lastFormTrainingYear: 1,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, currentMonth: 21, euros: 5_000 },
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
    expect(unlocked.school.euros).toBe(1_500);
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
    const completed = gameReducer(
      { ...training, randomSeed: 1 },
      { type: "TICK", now: 37_000 },
    );
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
    const rareCompleted = gameReducer(
      { ...rareTraining, randomSeed: 1 },
      { type: "TICK", now: 37_000 },
    );
    expect(rareCompleted.contacts.find((contact) => contact.id === member.id)?.forms)
      .toContain("course-y");
    expect(rareCompleted.collaborators.some((candidate) => candidate.contactId === member.id))
      .toBe(false);
  });
});
