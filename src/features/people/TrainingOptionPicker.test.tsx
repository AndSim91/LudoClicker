import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FORM_DEFINITIONS } from "../../content/forms";
import { TrainingOptionPicker } from "./TrainingOptionPicker";

describe("TrainingOptionPicker", () => {
  it("gives each menu its own id when the same person has two pickers", () => {
    const options = [{ definition: FORM_DEFINITIONS[0], costLabel: "400 €" }];
    render(
      <>
        <TrainingOptionPicker displayName="Edoardo" label="Istruttore" options={options} selectedFormId="" onSelect={() => {}} />
        <TrainingOptionPicker displayName="Edoardo" label="Tecnico" options={options} selectedFormId="" onSelect={() => {}} />
      </>,
    );
    const [first, second] = screen.getAllByRole("button", { name: /Formazione per Edoardo/ });
    const firstTarget = first.getAttribute("popovertarget");
    const secondTarget = second.getAttribute("popovertarget");
    expect(firstTarget).not.toBe(secondTarget);
    expect(document.getElementById(secondTarget!)?.getAttribute("aria-label")).toBe("Formazione per Edoardo");
    expect(second.parentElement!.contains(document.getElementById(secondTarget!))).toBe(true);
  });
});
