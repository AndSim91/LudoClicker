import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../../content/mastery";
import { createInitialState } from "../../game/initialState";
import type { Collaborator } from "../../game/types";
import {
  getAggregateInstructorProgress,
  getAvailableInstructorCourseCount,
  getInstructorCoverageForms,
  getInstructorTeachingEntries,
} from "./instructorGroupPresentation";

function instructor(id: string, instructorForms: Collaborator["instructorForms"]): Collaborator {
  return {
    id,
    contactId: `contact-${id}`,
    displayName: `Istruttore ${id}`,
    joinedAt: 1_000,
    forms: [...instructorForms],
    instructorForms,
    assignment: "instructor",
    mastery: createInitialCollaboratorMastery(),
    rarity: "ultra-rare",
  };
}

describe("instructor group presentation", () => {
  it("deduplicates certified Forms following the canonical course order", () => {
    expect(getInstructorCoverageForms([
      instructor("uno", ["form-2", "form-1"]),
      instructor("due", ["form-1", "course-x"]),
    ])).toEqual(["form-1", "course-x", "form-2"]);
  });

  it("counts the instructor courses still available across the assigned group", () => {
    const first = instructor("uno", ["form-1"]);
    first.forms = ["form-1", "course-x", "form-2"];
    const second = instructor("due", ["form-1", "course-x"]);
    second.forms = ["form-1", "course-x", "form-2", "course-y"];

    expect(getAvailableInstructorCourseCount([first, second])).toBe(4);
  });

  it("averages active lessons and keeps equipment waits at zero", () => {
    const initial = createInitialState(1_000);
    const instructors = [instructor("uno", ["form-1"]), instructor("due", ["form-1"])];
    const contacts = initial.contacts.slice(0, 2).map((contact, index) => ({
      ...contact,
      status: "enrolled" as const,
      training: {
        formId: "form-1" as const,
        startedAt: 1_000,
        completesAt: 2_000,
        status: index === 0 ? "running" as const : "waitingForEquipment" as const,
        instructorId: instructors[index].id,
      },
    }));
    const entries = getInstructorTeachingEntries({ contacts, collaborators: instructors });

    expect(entries).toHaveLength(2);
    expect(getAggregateInstructorProgress(entries, 1_500)).toBe(25);
  });
});
