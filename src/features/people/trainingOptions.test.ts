import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../../content/mastery";
import type { Collaborator, FormId } from "../../game/types";
import { getTechnicianCourseDefinitions } from "./trainingOptions";

describe("getTechnicianCourseDefinitions", () => {
  it("never offers Corso X: its Tecnico title comes from Forma 1 + Forma 2 (15/10/2026)", () => {
    const known: FormId[] = ["form-1", "course-x", "form-2"];
    const collaborator: Collaborator = {
      id: "c",
      contactId: "contact-c",
      displayName: "Istruttore",
      joinedAt: 1_000,
      forms: known,
      instructorForms: known,
      assignment: "instructor",
      mastery: createInitialCollaboratorMastery(),
      rarity: "common",
    };
    expect(getTechnicianCourseDefinitions(collaborator, true).map(({ id }) => id))
      .toEqual(["form-1", "form-2"]);
  });
});
