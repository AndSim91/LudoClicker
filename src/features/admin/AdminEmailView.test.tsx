import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialUpgradeLevels } from "../../content/upgrades";
import {
  EMAIL_TEMPLATES,
  resolveEmailTemplateCopy,
} from "../../content/emailTemplates";
import { AdminEmailView } from "./AdminEmailView";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("AdminEmailView", () => {
  const renderAdmin = (onAddMembers = vi.fn(), onAddEuros = vi.fn()) => {
    render(
      <AdminEmailView
        upgrades={createInitialUpgradeLevels()}
        activeMembers={4}
        euros={250}
        onAddMembers={onAddMembers}
        onAddEuros={onAddEuros}
      />,
    );
  };

  it("saves subject and body overrides in the repository file", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    renderAdmin();

    fireEvent.click(
      screen.getByRole("button", { name: /Catalogo 1.*Controllo ortografico/ }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Oggetto" }), {
      target: { value: "Una prova per {{firstName}}" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Corpo email" }), {
      target: { value: "Ciao {{firstName}},\n\nTi aspettiamo.\n\n{{senderName}}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salva cataloghi nel file" }));

    expect(
      await screen.findByText("File modificato: src/content/emailCatalogOverrides.json"),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/__admin/email-catalogs",
      expect.objectContaining({ method: "PUT" }),
    );

    const template = EMAIL_TEMPLATES[0];
    expect(resolveEmailTemplateCopy(template, "Giulia", "Andrea", 1)).toEqual({
      subject: "Una prova per Giulia",
      body: "Ciao Giulia,\n\nTi aspettiamo.\n\nAndrea",
    });
    expect(resolveEmailTemplateCopy(template, "Giulia", "Andrea", 0).subject).toBe(
      "PROVA GRATIS (non è una truffa giuro)",
    );
  });

  it("adds the manually entered members and euros", () => {
    const onAddMembers = vi.fn();
    const onAddEuros = vi.fn();
    renderAdmin(onAddMembers, onAddEuros);

    expect(screen.getByLabelText("Iscritti da aggiungere")).toHaveValue(1);
    expect(screen.getByLabelText("Euro da aggiungere")).toHaveValue(1000);

    fireEvent.change(screen.getByLabelText("Iscritti da aggiungere"), {
      target: { value: "7" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aggiungi iscritti" }));
    fireEvent.change(screen.getByLabelText("Euro da aggiungere"), {
      target: { value: "1250.50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aggiungi Euro" }));

    expect(onAddMembers).toHaveBeenCalledWith(7);
    expect(onAddEuros).toHaveBeenCalledWith(1250.5);
  });
});
