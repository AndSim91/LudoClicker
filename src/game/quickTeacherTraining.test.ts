import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../content/mastery";
import { gameReducer } from "./engine";
import { createInitialState } from "./initialState";
import { startQuickTeacherTraining } from "./quickTeacherTraining";
import type { Collaborator, Contact, FormId, GameState } from "./types";

function instructor(index: number, forms: FormId[], instructorForms: FormId[], masteryXp = 0): Collaborator {
  return {
    id: `collaborator-${index}`,
    contactId: `contact-${index}`,
    displayName: `Collaboratore ${index}`,
    joinedAt: 1_000 + index,
    forms,
    instructorForms,
    formBranchPreferences: [],
    assignment: "instructor",
    mastery: { ...createInitialCollaboratorMastery(), instructor: masteryXp },
    rarity: "ultra-rare",
  };
}

function school(collaborators: Collaborator[], styles: number[], upgrades: Partial<GameState["upgrades"]> = {}): GameState {
  const base = createInitialState(1_000);
  const contacts = styles.map((styleBase, index) => ({
    id: `contact-${index + 1}`, arenaBase: 100, styleBase, forms: [], tournamentExperience: 0,
  }) as unknown as Contact);
  return {
    ...base,
    collaborators,
    contacts,
    unlocks: { ...base.unlocks, forms: true },
    school: { ...base.school, euros: 100_000 },
    upgrades: { ...base.upgrades, "training-office": 1, ...upgrades },
  };
}

const known: FormId[] = ["form-1", "course-x", "form-2"];

describe("Ufficio formazione", () => {
  it("does nothing without the upgrade", () => {
    const state = school([instructor(1, known, ["form-1"])], [100], { "training-office": 0 });
    expect(startQuickTeacherTraining(state, "instructor", 5_000)).toBe(state);
  });

  it("qualifies the least covered Form, picking the higher Stile when Maestria ties", () => {
    const state = school([
      instructor(1, ["form-1"], ["form-1"]),
      instructor(2, known, ["form-1"], 400),
      instructor(3, known, ["form-1"], 400),
    ], [300, 100, 200]);
    const next = gameReducer(state, { type: "START_QUICK_TEACHER_TRAINING", kind: "instructor", now: 5_000 });
    expect(next.collaborators[2].training?.formId).toBe("form-2");
    expect(next.collaborators[1].training).toBeUndefined();
  });

  it("prefers higher Maestria over Stile", () => {
    const state = school([
      instructor(1, known, ["form-1"], 2_200),
      instructor(2, known, ["form-1"], 400),
    ], [100, 300]);
    expect(startQuickTeacherTraining(state, "instructor", 5_000).collaborators[0].training?.formId).toBe("form-2");
  });

  it("does not pile two clicks on the same Form", () => {
    const state = school([
      instructor(1, ["form-1", "form-2"], [], 400),
      instructor(2, ["form-1", "form-2"], []),
    ], [100, 100]);
    const once = startQuickTeacherTraining(state, "instructor", 5_000);
    const twice = startQuickTeacherTraining(once, "instructor", 5_000);
    expect(once.collaborators[0].training?.formId).toBe("form-1");
    expect(twice.collaborators[1].training?.formId).toBe("form-2");
  });

  it("lets someone with only Forma 1 learn Forma 2 when Corso X is locked", () => {
    const state = school([instructor(1, ["form-1"], ["form-1"])], [100]);
    expect(startQuickTeacherTraining(state, "instructor", 5_000).collaborators[0].training?.formId).toBe("form-2");
  });

  it("books a SIS course on a Form without Tecnici, only with the SIS", () => {
    const state = school([
      instructor(1, known, ["form-1", "form-2"]),
      instructor(2, known, ["form-1", "form-2"], 400),
    ], [100, 100]);
    expect(startQuickTeacherTraining(state, "technician", 5_000)).toBe(state);
    const sis = { ...state, upgrades: { ...state.upgrades, "sis-accreditation": 1 } };
    const booked = startQuickTeacherTraining(sis, "technician", 5_000);
    expect(booked.collaborators[1].technicianCourseReservation?.formId).toBe("form-1");
    const again = startQuickTeacherTraining(booked, "technician", 5_000);
    expect(again.collaborators[0].technicianCourseReservation?.formId).toBe("form-2");
  });
});
