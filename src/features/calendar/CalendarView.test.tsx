import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import type { GameState } from "../../game/types";
import { CalendarView } from "./CalendarView";

function stateWithTrial(status: "trialScheduled" | "enrolled" | "lost"): GameState {
  const initial = createInitialState(1_000);
  const contact = { ...initial.contacts[0], status };
  const completed = status === "enrolled" || status === "lost";
  return {
    ...initial,
    contacts: [contact, ...initial.contacts.slice(1)],
    emails: [{ ...initial.emails[0], status: "trialBooked", sentAt: 2_000 }],
    scheduledTrials: [
      {
        id: "trial-1",
        contactId: contact.id,
        startsAt: 10_000,
        resolvesAt: 20_000,
        resultSeed: 42,
        status: completed ? "completed" : "scheduled",
      },
    ],
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CalendarView", () => {
  it("shows live trial progress and opens the associated sent email", () => {
    vi.useFakeTimers();
    vi.setSystemTime(15_000);
    const onOpenSentEmail = vi.fn();
    const state = stateWithTrial("trialScheduled");

    render(<CalendarView state={state} onOpenSentEmail={onOpenSentEmail} />);

    expect(screen.getByText("In corso")).toBeVisible();
    expect(screen.getByText("Giulia Ferrando")).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Avanzamento lezione di prova di Giulia Ferrando" }),
    ).toHaveAttribute("aria-valuenow", "50");

    fireEvent.click(screen.getByRole("button", { name: "Apri mail inviata" }));
    expect(onOpenSentEmail).toHaveBeenCalledWith(state.emails[0].id);
  });

  it("shows the final enrollment outcome", () => {
    vi.useFakeTimers();
    vi.setSystemTime(21_000);

    render(<CalendarView state={stateWithTrial("enrolled")} onOpenSentEmail={() => undefined} />);

    expect(screen.getByText("Iscritto")).toBeVisible();
    expect(screen.getByText("Lezione conclusa")).toBeVisible();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
