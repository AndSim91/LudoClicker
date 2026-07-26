import { render, screen } from "@testing-library/react";
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
  it("groups shared Forms while keeping each individual progress segment", () => {
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

    expect(view.container.querySelectorAll(".internal-instructor-course")).toHaveLength(2);
    expect(screen.getByText("Forma 5 Staffa · 2 corsi")).toBeVisible();
    expect(screen.getByText("2 istruttori con 2 Tecnici")).toBeVisible();
    expect(screen.getByText("Forma 4 Staffa · Aspirante Tre")).toBeVisible();

    const groupedProgress = screen.getByRole("progressbar", {
      name: "Corsi Istruttori interni di Forma 5 Staffa: 2 corsi",
    });
    expect(groupedProgress).toHaveAttribute("aria-valuenow", "38");
    expect(groupedProgress).toHaveAttribute(
      "aria-valuetext",
      "2 corsi · avanzamento medio 38%",
    );
    expect(groupedProgress.querySelectorAll(".internal-instructor-course-segment")).toHaveLength(2);
    expect(screen.getByTitle(
      "Aspirante Uno · con il Tecnico Mario Rossi: 50%",
    ).firstElementChild).toHaveStyle({ width: "50%" });
    expect(screen.getByTitle(
      "Aspirante Due · con il Tecnico Lucia Bianchi: 25%",
    ).firstElementChild).toHaveStyle({ width: "25%" });

    expect(screen.getByRole("progressbar", {
      name: "Corso Istruttori interno di Aspirante Tre",
    })).toHaveAttribute("aria-valuenow", "50");
  });
});
