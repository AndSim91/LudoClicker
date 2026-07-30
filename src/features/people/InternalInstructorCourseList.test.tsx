import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Collaborator, FormId, FormTraining } from "../../game/types";
import { InternalInstructorCourseList } from "./InternalInstructorCourseList";
import type { InternalInstructorCourseEntry } from "./instructorGroupPresentation";

function collaborator(id: string, displayName: string): Collaborator {
  return {
    id,
    contactId: `${id}-contact`,
    displayName,
    joinedAt: 1_000,
    forms: ["form-1"],
    instructorForms: ["form-1"],
    technicianForms: [],
    assignment: "instructor",
    rarity: "common",
  };
}

function courseEntry({
  id,
  traineeName,
  technicianName,
  formId,
  completesAt,
}: {
  id: string;
  traineeName: string;
  technicianName: string;
  formId: FormId;
  completesAt: number;
}): InternalInstructorCourseEntry {
  const training: FormTraining = {
    formId,
    startedAt: 1_000,
    completesAt,
    status: "running",
    technicianId: `${id}-technician`,
    trainingTrack: "instructor",
    trainingPhase: "instructor",
  };
  return {
    trainee: { ...collaborator(`${id}-trainee`, traineeName), training },
    technician: collaborator(`${id}-technician`, technicianName),
    formId,
    training,
  };
}

describe("InternalInstructorCourseList", () => {
  it("uses the standard aggregated-course layout for shared Forms", () => {
    const view = render(
      <InternalInstructorCourseList
        entries={[
          courseEntry({
            id: "one",
            traineeName: "Aspirante Uno",
            technicianName: "Mario Rossi",
            formId: "form-5-staff",
            completesAt: 11_000,
          }),
          courseEntry({
            id: "two",
            traineeName: "Aspirante Due",
            technicianName: "Lucia Bianchi",
            formId: "form-5-staff",
            completesAt: 21_000,
          }),
          courseEntry({
            id: "three",
            traineeName: "Aspirante Tre",
            technicianName: "Andrea Verdi",
            formId: "form-4-staff",
            completesAt: 11_000,
          }),
        ]}
        now={6_000}
      />,
    );

    const list = view.container.querySelector(".aggregated-teaching-groups");
    expect(list).toHaveClass("is-internal-instructor");
    expect(list?.querySelectorAll(".aggregated-teaching-group")).toHaveLength(2);

    const sharedGroup = screen.getByText("Forma 5 Staffa").closest(
      ".aggregated-teaching-group",
    );
    expect(sharedGroup).not.toBeNull();
    expect(within(sharedGroup as HTMLElement).getByText("2 corsi")).toBeVisible();
    expect(screen.getByText("Forma 4 Staffa")).toBeVisible();

    const groupedProgress = screen.getByRole("progressbar", {
      name: "Forma 5 Staffa: 2 corsi",
    });
    expect(groupedProgress).toHaveClass("aggregated-teaching-bar");
    expect(groupedProgress).toHaveAttribute("aria-valuenow", "38");
    expect(groupedProgress).toHaveAttribute(
      "aria-valuetext",
      "2 corsi · 38%",
    );
    expect(groupedProgress.querySelectorAll(".aggregated-teaching-segment")).toHaveLength(2);
    expect(screen.getByTitle(
      "Aspirante Uno · con il Tecnico Mario Rossi: 50%",
    ).firstElementChild).toHaveStyle({ width: "50%" });
    expect(screen.getByTitle(
      "Aspirante Due · con il Tecnico Lucia Bianchi: 25%",
    ).firstElementChild).toHaveStyle({ width: "25%" });

    expect(screen.getByRole("progressbar", {
      name: "Forma 4 Staffa: 1 corso",
    })).toHaveAttribute("aria-valuenow", "50");
  });
});
