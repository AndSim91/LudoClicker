import { describe, expect, it } from "vitest";
import { migrateParallelCoursesState } from "./parallelCourses";
import type { MigratableState } from "./types";

describe("migrateParallelCoursesState", () => {
  it("sposta i corsi Istruttori e Tecnici nei loro posti", () => {
    const course = (trainingTrack: string) => ({ formId: "form-1", startedAt: 0, completesAt: 10, trainingTrack });
    const migrated = migrateParallelCoursesState({
      version: 111,
      collaborators: [
        { id: "a", training: course("instructor") },
        { id: "b", training: course("technician") },
        { id: "c", training: course("combined-instructor") },
        { id: "d" },
      ],
    } as unknown as MigratableState) as unknown as { version: number; collaborators: Record<string, unknown>[] };
    expect(migrated.version).toBe(112);
    expect(migrated.collaborators[0]).toEqual({ id: "a", instructorCourse: course("instructor") });
    expect(migrated.collaborators[1]).toEqual({ id: "b", technicianCourse: course("technician") });
    expect(migrated.collaborators[2]).toEqual({ id: "c", training: course("combined-instructor") });
    expect(migrated.collaborators[3]).toEqual({ id: "d" });
  });
});
