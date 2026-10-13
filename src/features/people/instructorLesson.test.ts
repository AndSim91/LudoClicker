import { describe, expect, it } from "vitest";
import {
  getKataLevel,
  getSceneStudentCount,
  getSceneWeapons,
  pickStaffMove,
  planInstructorScene,
} from "./instructorLesson";

describe("Lezione degli Istruttori", () => {
  it("caps the students by gym stage, up to two rows of four", () => {
    expect(getSceneStudentCount(30, 10, false)).toBe(1);
    expect(getSceneStudentCount(30, 30, false)).toBe(2);
    expect(getSceneStudentCount(30, 120, false)).toBe(4);
    expect(getSceneStudentCount(30, 300, false)).toBe(6);
    expect(getSceneStudentCount(30, 900, false)).toBe(8);
    expect(getSceneStudentCount(3, 900, false)).toBe(3);
    expect(getSceneStudentCount(30, 900, true)).toBe(4);
    expect(getSceneStudentCount(0, 900, false)).toBe(0);
  });

  it("grows the kata with Forma 2 and Corso Y", () => {
    expect(getKataLevel(["form-1"])).toBe(1);
    expect(getKataLevel(["form-1", "form-2"])).toBe(2);
    expect(getKataLevel(["form-1", "form-2", "course-y"])).toBe(3);
  });

  it("gives one staff and one pair of short sabers when the school teaches those Forms", () => {
    expect(getSceneWeapons(4, ["form-1"])).toEqual(["long", "long", "long", "long"]);
    expect(getSceneWeapons(4, ["form-3-staff", "form-3-double"])).toEqual(["long", "dual", "staff", "long"]);
    expect(getSceneWeapons(2, ["form-3-staff", "form-3-double"])).toEqual(["long", "staff"]);
    expect(getSceneWeapons(2, ["form-3-double"])).toEqual(["long", "dual"]);
    expect(getSceneWeapons(1, ["form-3-staff"])).toEqual(["long"]);
  });

  it("places two staggered rows facing the instructor and stops by everyone in the round", () => {
    const plan = planInstructorScene({
      width: 480,
      studentsInCourses: 40,
      activeMembers: 600,
      rarityCounts: { common: 500, rare: 80, legendary: 1 },
      coverage: ["form-1", "form-2", "course-y"],
    });
    expect(plan.students).toHaveLength(8);
    expect(plan.students.filter((student) => student.back)).toHaveLength(4);
    expect(plan.students[0].rarity).toBe("legendary");
    expect(plan.students.every((student) => student.x > plan.spot)).toBe(true);
    expect(plan.stops).toHaveLength(8);
    expect([...plan.stops].sort((a, b) => a - b)).toEqual(plan.stops);
    expect(plan.level).toBe(3);
  });

  it("never picks the same staff move twice in a row", () => {
    expect(pickStaffMove("otto", () => 0)).toBe("mulino");
    expect(pickStaffMove("mulino", () => 0.99)).toBe("spazzata");
    expect(pickStaffMove(undefined, () => 0)).toBe("otto");
  });
});
