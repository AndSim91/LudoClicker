import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../../content/mastery";
import type { Collaborator, FormTraining } from "../../game/types";
import { getFormActivity } from "./formActivity";

const course = (formId: FormTraining["formId"], extra: Partial<FormTraining> = {}): FormTraining => ({
  formId, startedAt: 0, completesAt: 100, status: "running", ...extra,
});

const student = (id: string, training: FormTraining) => ({ id, displayName: id, instructorId: "i", training });

const staff = (training?: FormTraining, reservation?: Collaborator["technicianCourseReservation"]): Collaborator => ({
  id: "c", contactId: "k", displayName: "C", joinedAt: 0, forms: [], instructorForms: [],
  assignment: "instructor", mastery: createInitialCollaboratorMastery(), rarity: "rare",
  training, technicianCourseReservation: reservation,
});

describe("getFormActivity", () => {
  it("averages the running courses and leaves the waiting ones out of the arc", () => {
    const activity = getFormActivity([
      student("a", course("form-1")),
      student("b", course("form-1", { completesAt: 500 })),
      student("c", course("form-1", { status: "waitingForEquipment" })),
      student("d", course("form-2", { status: "waitingForEquipment" })),
      student("e", course("agonist-course", { trainingTrack: "agonist" })),
    ], [], 50);

    expect(activity.get("form-1")?.students).toEqual({ count: 3, progress: 30, waiting: false });
    expect(activity.get("form-2")?.students).toEqual({ count: 1, progress: 0, waiting: true });
    expect(activity.get("agonist-course")?.students?.count).toBe(1);
  });

  it("puts Corso Istruttori, Corso Tecnici and a SIS booking on their own quadrants", () => {
    const activity = getFormActivity([], [
      staff(course("form-3-staff", { trainingPhase: "instructor" })),
      staff(course("form-1", { trainingPhase: "technician" })),
      staff(undefined, { formId: "form-2", bookedAt: 0, eligibleMonth: 7 }),
    ], 25);

    expect(activity.get("form-3-staff")?.instructorCourse).toEqual({ count: 1, progress: 25, waiting: false });
    expect(activity.get("form-1")?.technicianCourse).toEqual({ count: 1, progress: 25, waiting: false });
    expect(activity.get("form-2")?.technicianCourse).toEqual({ count: 1, progress: 0, waiting: true });
  });
});
