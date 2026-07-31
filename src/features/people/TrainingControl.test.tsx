import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/initialState";
import type { Collaborator, FormId, GameState } from "../../game/types";
import { TechnicianCourseControl, TrainingControl } from "./TrainingControl";

function instructor(
  id: string,
  forms: FormId[],
): Collaborator {
  return {
    id,
    contactId: "external-" + id,
    displayName: id,
    joinedAt: 1_000,
    forms: [...forms],
    instructorForms: [...forms],
    assignment: "instructor",
    rarity: "legendary",
  };
}

describe("TrainingControl Instructor students", () => {
  it("shows the Instructor discount when a qualified colleague can teach the next Form", () => {
    const initial = createInitialState(1_000, "", false);
    const teacher = instructor(
      "senior-instructor",
      ["form-1", "course-x", "form-2"],
    );
    const trainee = instructor(
      "junior-instructor",
      ["form-1", "course-x"],
    );
    const state: GameState = {
      ...initial,
      contacts: [],
      collaborators: [teacher, trainee],
      school: {
        ...initial.school,
        currentMonth: 9,
        euros: 10_000,
      },
      unlocks: {
        ...initial.unlocks,
        collaborators: true,
        forms: true,
      },
    };
    const collaboratorsById = new Map(
      state.collaborators.map((collaborator) => [collaborator.id, collaborator]),
    );

    render(
      <TrainingControl
        personId={trainee.id}
        displayName={trainee.displayName}
        student={trainee}
        state={state}
        collaboratorsById={collaboratorsById}
        onStartTraining={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Paga e avvia/ }))
      .toHaveTextContent("187,50");
  });

  it("shows every weapon branch after Course Y at Master of none level five", () => {
    const initial = createInitialState(1_000, "", false);
    const student = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      forms: ["form-1", "course-x", "form-2", "course-y"] as FormId[],
      formBranchPreferences: ["Spada Lunga" as const],
      lastFormTrainingYear: 1,
    };
    const state: GameState = {
      ...initial,
      contacts: [student],
      school: {
        ...initial.school,
        activeMembers: 1,
        currentMonth: 21,
        euros: 10_000,
      },
      unlocks: { ...initial.unlocks, forms: true },
      upgrades: { ...initial.upgrades, "instructor-versatility": 5 },
    };

    render(
      <TrainingControl
        personId={student.id}
        displayName={`${student.firstName} ${student.lastName}`}
        student={student}
        state={state}
        collaboratorsById={new Map()}
        onStartTraining={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: /Forma 3 Spada Lunga/ })).toBeVisible();
    expect(screen.getByRole("radio", { name: /Forma 3 Staffa/ })).toBeVisible();
    expect(screen.getByRole("radio", { name: /Forma 3 Doppie Spade Corte/ })).toBeVisible();
  });

  it("highlights Instructor courses for Forms without school coverage", () => {
    const initial = createInitialState(1_000, "", false);
    const teacher = instructor("senior-instructor", ["form-1"]);
    const trainee = {
      ...instructor("junior-instructor", ["form-1", "course-x", "form-2"]),
      instructorForms: [] as FormId[],
    };
    const state: GameState = {
      ...initial,
      contacts: [],
      collaborators: [teacher, trainee],
      school: { ...initial.school, currentMonth: 9, euros: 10_000 },
      unlocks: { ...initial.unlocks, collaborators: true, forms: true },
      upgrades: { ...initial.upgrades, "project-x": 1 },
    };

    const view = render(
      <TrainingControl
        personId={trainee.id}
        displayName={trainee.displayName}
        student={trainee}
        state={state}
        collaboratorsById={new Map(state.collaborators.map((collaborator) => [collaborator.id, collaborator]))}
        onStartTraining={vi.fn()}
      />,
    );

    expect(within(view.container).getByRole("radio", { name: /Forma 1/ })).not.toHaveClass("is-uncovered");
    const uncoveredInstructorOption = within(view.container).getByRole("radio", { name: /Corso X/ });
    expect(uncoveredInstructorOption).toHaveClass("is-uncovered");
    fireEvent.click(uncoveredInstructorOption);
    expect(uncoveredInstructorOption).toHaveClass("is-selected", "is-uncovered");
    expect(within(view.container).getByText("Evidenziate: Forme non coperte nella scuola")).toBeVisible();
  });

  it("highlights Technician courses without technical coverage", () => {
    const initial = createInitialState(1_000, "", false);
    const coveredTechnician = {
      ...instructor("covered-technician", ["form-1"]),
      technicianForms: ["form-1"] as FormId[],
    };
    const candidate = {
      ...instructor("candidate-technician", ["form-1", "course-x", "form-2"]),
      technicianForms: [] as FormId[],
    };
    const state: GameState = {
      ...initial,
      contacts: [],
      collaborators: [coveredTechnician, candidate],
      school: { ...initial.school, euros: 10_000 },
      unlocks: { ...initial.unlocks, collaborators: true, forms: true },
      upgrades: {
        ...initial.upgrades,
        "instructor-versatility": 5,
        "sis-accreditation": 1,
        "project-x": 1,
      },
    };

    const view = render(
      <TechnicianCourseControl
        collaborator={candidate}
        state={state}
        onBookTechnicianCourse={vi.fn()}
      />,
    );

    fireEvent.click(within(view.container).getByRole("button", { name: /Corso Tecnici/ }));
    expect(within(view.container).getByRole("radio", { name: /Forma 1/ })).not.toHaveClass("is-uncovered");
    const uncoveredTechnicianOption = within(view.container).getByRole("radio", { name: /Corso X/ });
    expect(uncoveredTechnicianOption).toHaveClass("is-uncovered");
    fireEvent.click(uncoveredTechnicianOption);
    expect(uncoveredTechnicianOption).toHaveClass("is-selected", "is-uncovered");
    expect(within(view.container).getByText("Evidenziate: Forme non coperte nella scuola")).toBeVisible();
  });
});
