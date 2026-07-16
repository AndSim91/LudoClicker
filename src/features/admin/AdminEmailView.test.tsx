import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createInitialUpgradeLevels } from "../../content/upgrades";
import {
  EMAIL_TEMPLATES,
  resolveEmailTemplateCopy,
} from "../../content/emailTemplates";
import { AdminEmailView } from "./AdminEmailView";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("AdminEmailView", () => {
  it("saves subject and body overrides for the selected upgrade catalog", () => {
    render(<AdminEmailView upgrades={createInitialUpgradeLevels()} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Catalogo 1.*Controllo ortografico/ }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Oggetto" }), {
      target: { value: "Una prova per {{firstName}}" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Corpo email" }), {
      target: { value: "Ciao {{firstName}},\n\nTi aspettiamo.\n\n{{senderName}}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salva cataloghi" }));

    const template = EMAIL_TEMPLATES[0];
    expect(resolveEmailTemplateCopy(template, "Giulia", "Andrea", 1)).toEqual({
      subject: "Una prova per Giulia",
      body: "Ciao Giulia,\n\nTi aspettiamo.\n\nAndrea",
    });
    expect(resolveEmailTemplateCopy(template, "Giulia", "Andrea", 0).subject).toBe(
      template.subject,
    );
  });
});
