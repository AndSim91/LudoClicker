import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createInitialState } from "../game/engine";
import { saveGame } from "../game/save";
import { App } from "./App";

afterEach(() => {
  cleanup();
});

describe("App profile and calendar flow", () => {
  it("asks for the name before showing the active draft", () => {
    render(<App />);

    expect(screen.getByRole("dialog", { name: "Come ti chiami?" })).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "Nome e cognome" }), {
      target: { value: "Andrea Ungaro" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Inizia" }));

    expect(screen.getByText("genova@ludosport.net")).toBeVisible();
    expect(screen.getByText(/Andrea Ungaro - Ordine delle Onde/)).toBeVisible();
  });

  it("opens the associated campaign in Sent mail", () => {
    const now = Date.now();
    const initial = createInitialState(now, "Andrea Ungaro");
    const contact = { ...initial.contacts[0], status: "trialScheduled" as const };
    const email = {
      ...initial.emails[0],
      status: "trialBooked" as const,
      revealedCharacters: initial.emails[0].body.length,
      sentAt: now,
    };
    saveGame({
      ...initial,
      contacts: [contact, ...initial.contacts.slice(1)],
      emails: [email],
      scheduledTrials: [
        {
          id: "trial-app-link",
          contactId: contact.id,
          startsAt: now + 60_000,
          resolvesAt: now + 90_000,
          resultSeed: 42,
          status: "scheduled",
        },
      ],
    }, now);

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Calendario" }));
    fireEvent.click(screen.getByRole("button", { name: "Apri mail inviata" }));

    expect(screen.getByRole("region", { name: "Posta inviata" })).toBeVisible();
    expect(screen.getByText("genova@ludosport.net")).toBeVisible();
    expect(screen.getAllByText(email.subject)).toHaveLength(2);
    expect(screen.getAllByText("Prova in palestra")).toHaveLength(2);
  });
});
