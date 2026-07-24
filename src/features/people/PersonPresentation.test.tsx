import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FORM_DEFINITIONS } from "../../content/forms";
import { FormLogoStrip } from "./PersonPresentation";

describe("nomi delle Forme", () => {
  it("definisce un nome lungo e uno corto per ogni Forma", () => {
    expect(
      FORM_DEFINITIONS.map(({ id, longName, shortName }) => [id, longName, shortName]),
    ).toEqual([
      ["form-1", "Forma 1", "F1"],
      ["course-x", "Corso X", "CX"],
      ["form-2", "Forma 2", "F2"],
      ["course-y", "Corso Y", "CY"],
      ["form-3-long", "Forma 3 Spada Lunga", "F3L"],
      ["form-4-long", "Forma 4 Spada Lunga", "F4L"],
      ["form-5-long", "Forma 5 Spada Lunga", "F5L"],
      ["form-3-staff", "Forma 3 Staffa", "F3S"],
      ["form-4-staff", "Forma 4 Staffa", "F4S"],
      ["form-5-staff", "Forma 5 Staffa", "F5S"],
      ["form-3-double", "Forma 3 Doppie Spade Corte", "F3D"],
      ["form-4-double", "Forma 4 Doppie Spade Corte", "F4D"],
      ["form-5-double", "Forma 5 Doppie Spade Corte", "F5D"],
      ["form-6", "Forma 6", "F6"],
      ["form-7", "Forma 7", "F7"],
    ]);
  });

  it("mostra i nomi corti nella lista compatta e conserva quelli lunghi per accessibilità", () => {
    render(<FormLogoStrip forms={["form-1", "course-x", "form-3-long"]} />);

    expect(screen.getByText("F1")).toBeVisible();
    expect(screen.getByText("CX")).toBeVisible();
    expect(screen.getByText("F3L")).toBeVisible();
    expect(screen.getByRole("img", {
      name: "Forma 3 Spada Lunga — emblema ufficiale",
    })).toBeVisible();
    expect(screen.getByLabelText(
      "Forme conosciute: Forma 1, Corso X, Forma 3 Spada Lunga",
    )).toBeVisible();
  });

  it("sostituisce la corona dorata con quella glicine per una qualifica da Tecnico", () => {
    render(
      <FormLogoStrip
        forms={["form-1"]}
        instructorForms={["form-1"]}
        technicianForms={["form-1"]}
      />,
    );

    const form = screen.getByTitle("Forma 1 · Qualifica da Tecnico");
    expect(form).toHaveClass("technician-certified");
    expect(form.querySelector(".form-instructor-crown")).toHaveClass("is-technician");
    expect(form.querySelectorAll(".form-instructor-crown")).toHaveLength(1);
  });
});
