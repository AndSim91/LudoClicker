import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FormPathMap } from "./FormPathMap";
import { FormLogoStrip } from "./PersonPresentation";

afterEach(cleanup);

describe("Istruttori in e-Learning", () => {
  const E_LEARNING = "Forma 1 · Attestato da istruttore (e-Learning) · in attesa di un Tecnico";

  it("Onde: Wi-Fi on the e-Learning Form, plain notch elsewhere, none once Tecnico", () => {
    render(
      <FormPathMap
        forms={["form-1", "form-2", "course-y"]}
        instructorForms={["form-1", "form-2", "course-y"]}
        technicianForms={["course-y"]}
        eLearningForms={["form-1", "course-y"]}
      />,
    );
    expect(screen.getByTitle(E_LEARNING)).toHaveClass("is-instructor", "is-elearning");
    expect(screen.getByTitle("Forma 2 · Attestato da istruttore")).not.toHaveClass("is-elearning");
    expect(screen.getByTitle("Corso Y · Qualifica da Tecnico")).not.toHaveClass("is-elearning");
  });

  it("Outlook strip: half dot class and the same tooltip", () => {
    const { container } = render(
      <FormLogoStrip forms={["form-1"]} instructorForms={["form-1"]} eLearningForms={["form-1"]} />,
    );
    expect(screen.getByTitle(E_LEARNING)).toBeInTheDocument();
    expect(container.querySelector(".form-instructor-crown")).toHaveClass("is-elearning");
  });
});
