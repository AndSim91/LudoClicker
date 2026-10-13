import { describe, expect, it } from "vitest";
import {
  getKataLevel,
  getSceneStudentCount,
  getSceneWeaponShares,
  rollSceneStudents,
  pickIdleTrick,
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

  it("counts the members' weapons, preferences shared and the archive by its size", () => {
    expect(getSceneWeaponShares([
      {},
      { formBranchPreferences: ["Staffa"] },
      { formBranchPreferences: ["Staffa", "Doppia spada corta"] },
      { formBranchPreferences: ["Spada Lunga"], count: 10 },
    ])).toEqual({ long: 11, staff: 1.5, dual: 0.5 });
  });

  it("draws weapons and blades again every school year, as the members are (Andrea, 13/10)", () => {
    const rarities = { common: 90, rare: 10 };
    const shares = { long: 50, staff: 30, dual: 20 };
    expect(rollSceneStudents(8, 3, rarities, shares)).toEqual(rollSceneStudents(8, 3, rarities, shares));
    expect(rollSceneStudents(4, 3, rarities, shares)).toEqual(rollSceneStudents(8, 3, rarities, shares).slice(0, 4));
    const years = Array.from({ length: 40 }, (_, year) => rollSceneStudents(8, year, rarities, shares));
    expect(new Set(years.map((year) => JSON.stringify(year))).size).toBeGreaterThan(30);
    expect(years.every((year) => year[0].weapon === "long")).toBe(true);
    const places = years.flat().slice(0);
    const exotic = places.filter((student) => student.weapon !== "long").length / places.length;
    expect(exotic).toBeGreaterThan(0.3);
    expect(exotic).toBeLessThan(0.6);
    expect(rollSceneStudents(8, 5, {}, { long: 0, staff: 0, dual: 0 }))
      .toEqual(Array.from({ length: 8 }, () => ({ rarity: "common", weapon: "long" })));
    expect(rollSceneStudents(8, 5, { legendary: 1 }, { long: 0, staff: 1, dual: 0 }).slice(1)
      .every((student) => student.weapon === "staff" && student.rarity === "legendary")).toBe(true);
  });

  it("places two staggered rows facing the instructor and stops by everyone in the round", () => {
    const plan = planInstructorScene({
      width: 480,
      studentsInCourses: 40,
      activeMembers: 600,
      rarityCounts: { common: 500, rare: 80, legendary: 1 },
      weaponShares: { long: 1, staff: 0, dual: 0 },
      schoolYear: 4,
      coverage: ["form-1", "form-2", "course-y"],
    });
    expect(plan.students).toHaveLength(8);
    expect(plan.students.filter((student) => student.back)).toHaveLength(4);
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

  it("picks the sword tricks at random, never the same twice in a row (Andrea, 13/10)", () => {
    expect(pickIdleTrick(undefined, () => 0)).toBe("a");
    expect(pickIdleTrick("a", () => 0)).toBe("b");
    expect(pickIdleTrick("i", () => 0.99)).toBe("e");
    for (let roll = 0; roll < 1; roll += 0.05) expect(pickIdleTrick("d", () => roll)).not.toBe("d");
  });
});
