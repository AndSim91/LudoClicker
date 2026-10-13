import { describe, expect, it } from "vitest";
import { syncCourseXTitles } from "./courseXTitles";
import type { FormId } from "./types";

describe("Corso X titles", () => {
  it("follow Forma 1 + Forma 2, for Istruttori and Tecnici", () => {
    const synced = syncCourseXTitles({
      instructorForms: ["form-1", "form-2"] as FormId[],
      technicianForms: ["form-1", "course-x"] as FormId[],
      eLearningInstructorForms: ["form-2"] as FormId[],
    });
    expect(synced.instructorForms).toEqual(["form-1", "form-2", "course-x"]);
    expect(synced.technicianForms).toEqual(["form-1"]);
    expect(synced.eLearningInstructorForms).toEqual(["form-2", "course-x"]);
  });

  it("keeps the same object when nothing changes", () => {
    const holder = { instructorForms: ["form-1"] as FormId[] };
    expect(syncCourseXTitles(holder)).toBe(holder);
  });
});
