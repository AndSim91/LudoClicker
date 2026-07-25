import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/initialState";
import type { Collaborator, FormId, GameState } from "../../game/types";
import { TrainingControl } from "./TrainingControl";

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
});
