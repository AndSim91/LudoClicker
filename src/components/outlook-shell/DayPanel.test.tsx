import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import type { ContactStatus, GameState } from "../../game/types";
import { DayPanel } from "./DayPanel";

function stateWithTrial(
  contactStatus: ContactStatus,
  trialStatus: "scheduled" | "completed",
): GameState {
  const initial = createInitialState(10_000);
  return {
    ...initial,
    contacts: [
      { ...initial.contacts[0], status: contactStatus },
      ...initial.contacts.slice(1),
    ],
    scheduledTrials: [
      {
        id: "trial-day-panel",
        contactId: initial.contacts[0].id,
        startsAt: 20_000,
        resolvesAt: 50_000,
        resultSeed: 42,
        status: trialStatus,
      },
    ],
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("DayPanel", () => {
  it("replaces the appointment time with a live countdown", () => {
    vi.useFakeTimers();
    vi.setSystemTime(15_000);

    render(<DayPanel state={stateWithTrial("trialScheduled", "scheduled")} />);

    expect(screen.getByText("00:05")).toBeVisible();
  });

  it("shows that the lesson is in progress after it starts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(25_000);

    render(<DayPanel state={stateWithTrial("trialScheduled", "scheduled")} />);

    expect(screen.getByText("In corso…")).toBeVisible();
  });

  it.each([
    ["enrolled", "Iscritto", "appointment-enrolled"],
    ["lost", "Non iscritto", "appointment-lost"],
  ] as const)("shows the %s outcome with its row color", (contactStatus, label, className) => {
    vi.useFakeTimers();
    vi.setSystemTime(55_000);

    render(<DayPanel state={stateWithTrial(contactStatus, "completed")} />);

    expect(screen.getByText(label).closest(".appointment")).toHaveClass(className);
    expect(screen.getByRole("progressbar", { name: /Tempo residuo/ }))
      .toHaveAttribute("aria-valuenow", "50");
  });

  it.each([
    ["enrolled", "Iscritto"],
    ["lost", "Non iscritto"],
  ] as const)("dismisses the %s outcome when its expiry bar ends", (contactStatus, label) => {
    vi.useFakeTimers();
    vi.setSystemTime(55_000);

    render(<DayPanel state={stateWithTrial(contactStatus, "completed")} />);

    expect(screen.getByText(label)).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.queryByText(label)).not.toBeInTheDocument();
    expect(screen.getByText("Nessuna prova in calendario")).toBeVisible();
  });
});
