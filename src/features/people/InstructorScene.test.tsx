import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InstructorScene } from "./InstructorScene";

const props = {
  activeMembers: 600,
  rarityCounts: { common: 500, rare: 50 },
  weaponShares: { long: 6, staff: 4, dual: 0 },
  schoolYear: 2,
  coverage: ["form-1", "form-2", "course-y", "form-3-staff"] as const,
  hasInstructors: true,
  hasTechnician: false,
};

describe("InstructorScene", () => {
  it("draws up to eight students on two rows, with the members' weapons, and the instructor in green", () => {
    const { container } = render(<InstructorScene {...props} studentsInCourses={30} />);
    expect(container.querySelectorAll(".iscene-box:not(.iscene-bulb)")).toHaveLength(9);
    expect(container.querySelectorAll(".is-back-row")).toHaveLength(4);
    expect(container.querySelectorAll(".iscene-staff").length).toBeGreaterThan(0);
    expect(container.querySelector(".iscene-arm.k3")).not.toBeNull();
    expect(container.querySelector('path[fill="#2f8a64"]')).not.toBeNull();
  });

  it("turns the tunic lilac with a Tecnico and lets the instructor practise his sword tricks when no course runs", () => {
    const { container } = render(<InstructorScene {...props} hasTechnician studentsInCourses={0} />);
    expect(container.querySelectorAll(".is-back-row")).toHaveLength(0);
    expect(container.querySelector(".iscene-idle .iscene-idle-spin")).not.toBeNull();
    expect(container.querySelector('path[fill="#a68ad6"]')).not.toBeNull();
  });
});
