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

  it("shows every rarity and weapon of the school, in a new order every year (Andrea, 14/10)", () => {
    const rarities = { common: 900, rare: 80, "ultra-rare": 15, legendary: 3, "secret-legendary": 1 };
    const shares = { long: 95, staff: 4, dual: 1 };
    const year = rollSceneStudents(8, 3, rarities, shares);
    expect(year).toEqual(rollSceneStudents(8, 3, rarities, shares));
    expect(new Set(year.map((student) => student.rarity)).size).toBe(5);
    expect(new Set(year.map((student) => student.weapon))).toEqual(new Set(["long", "staff", "dual"]));
    expect(year[0].weapon).toBe("long");
    const years = Array.from({ length: 30 }, (_, index) => JSON.stringify(rollSceneStudents(8, index, rarities, shares)));
    expect(new Set(years).size).toBeGreaterThan(20);
    // Fewer places than kinds: the rarest go first.
    expect(rollSceneStudents(2, 1, rarities, shares).map((student) => student.rarity).sort())
      .toEqual(["legendary", "secret-legendary"]);
    expect(rollSceneStudents(8, 5, {}, { long: 0, staff: 0, dual: 0 }))
      .toEqual(Array.from({ length: 8 }, () => ({ rarity: "common", weapon: "long" })));
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
