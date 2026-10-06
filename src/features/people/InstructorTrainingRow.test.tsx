import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AGONIST_COURSE_LOGO, ARENA_TECNICA_LOGO } from "../../content/formLogos";
import { InstructorTrainingRow } from "./InstructorTrainingRow";

const locked = { unlocked: false, active: false, summer: false, paused: false, instructorCount: 0 };

describe("InstructorTrainingRow", () => {
  it("keeps the place of what is locked and turns Arena Tecnica into the Corso Agonisti", () => {
    const view = render(<InstructorTrainingRow preparation={locked} agonist={{ unlocked: false, starred: false }} />);
    expect(view.container.querySelectorAll(".instructor-training-cell.is-locked")).toHaveLength(2);

    view.rerender(<InstructorTrainingRow preparation={locked} agonist={{ unlocked: true, starred: false }} />);
    expect(screen.getByRole("img", { name: "Arena Tecnica — emblema generato" }))
      .toHaveAttribute("src", ARENA_TECNICA_LOGO.assetPath);
    expect(screen.getByText("nessun atleta")).toBeVisible();

    view.rerender(
      <InstructorTrainingRow
        preparation={locked}
        agonist={{ unlocked: true, starred: true, ring: { count: 3, progress: 55, waiting: false } }}
      />,
    );
    expect(screen.getByRole("img", { name: "Corso Agonisti — emblema generato" }))
      .toHaveAttribute("src", AGONIST_COURSE_LOGO.assetPath);
    expect(screen.getByText(/atleti · 55%/)).toBeVisible();
  });
});
