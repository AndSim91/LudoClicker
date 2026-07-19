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
import type { FormId } from "./types";

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

  it("generates direct Social trials and reduces equipment wear through assignments", () => {
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
        collaborators: [socialCollaborator, equipmentCollaborator],
        unlocks: { ...initial.unlocks, collaborators: true, social: true },
        equipment: { ...initial.equipment, wear: 5 },
        automation: {
          ...initial.automation,
          socialBuffer: 0.99,
          equipmentBuffer: 0.95,
        },
      },
      { type: "TICK", now: 2_000 },
    );

    expect(automated.statistics.socialContacts).toBe(0);
    expect(automated.statistics.socialTrials).toBe(1);
    expect(automated.automation.socialBuffer).toBeCloseTo(0.99 + 1 / 60 - 1);
    expect(automated.contacts).toHaveLength(initial.contacts.length + 1);
    expect(automated.contacts.at(-1)?.source).toBe("social");
    expect(automated.contacts.at(-1)?.status).toBe("trialScheduled");
    expect(automated.scheduledTrials).toHaveLength(1);
    expect(automated.emails).toHaveLength(initial.emails.length);
    expect(automated.equipment.wear).toBe(4);
    expect(automated.automation.equipmentBuffer).toBeCloseTo(0.05);
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

  it("runs paid Social campaigns after the ten-member unlock", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 30, activeMembers: 10 },
      unlocks: { ...initial.unlocks, social: true },
    };

    const campaigned = gameReducer(funded, { type: "RUN_SOCIAL_CAMPAIGN", now: 2_000 });

    expect(campaigned.school.euros).toBe(5);
    expect(campaigned.statistics.socialCampaigns).toBe(1);
    expect(campaigned.statistics.socialContacts).toBeGreaterThanOrEqual(4);
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
    const nextSchoolYear = gameReducer(septemberState, { type: "START_FORM_TRAINING", personId: member.id, formId: "course-x", now: 23_000 });

    expect(blocked).toBe(ready);
    expect(training.school.euros).toBe(193.75);
    expect(training.contacts[0].training?.formId).toBe("form-1");
    expect(completed.contacts[0].forms).toContain("form-1");
    expect(completed.contacts[0].training).toBeUndefined();
    expect(completed.statistics.formsCompleted).toBe(1);
    expect(annualBlock).toBe(juneState);
    expect(summerBlock).toBe(julyState);
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

    expect(training.school.euros).toBe(100);
    expect(training.collaborators[0].lastFormTrainingYear).toBe(2);
    expect(training.collaborators[0].formTrainingYearCount).toBe(1);
    expect(training.collaborators[0].training?.includesInstructorCertification).toBe(true);
    expect(completed.collaborators[0].forms).toContain("form-2");
    expect(completed.collaborators[0].instructorForms).toContain("form-2");
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
      school: { ...initial.school, activeMembers: 6, euros: 100 },
      contacts: students,
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
      upgrades: { ...initial.upgrades, "tiamat-instructor": 5 },
    };

    const teaching = gameReducer(ready, { type: "TICK", now: 2_000 });
    expect(teaching.contacts.filter((contact) => contact.training).length).toBe(6);
    expect(teaching.school.euros).toBe(62.5);

    const paused = gameReducer({
      ...ready,
      collaborators: [{ ...instructor, autoTeachingEnabled: false }],
    }, { type: "TICK", now: 2_000 });
    expect(paused.contacts.every((contact) => !contact.training)).toBe(true);
    expect(paused.school.euros).toBe(100);
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
