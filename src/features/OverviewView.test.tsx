import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../game/engine";
import { OverviewView } from "./OverviewView";

afterEach(() => cleanup());

describe("OverviewView settings", () => {
  const callbacks = {
    onExport: vi.fn(),
    onImport: vi.fn(() => true),
    onReset: vi.fn(),
    onUpdateProfileName: vi.fn(),
    onFoundSchool: vi.fn(),
    reduceMotion: false,
    onReduceMotionChange: vi.fn(),
  };

  it("requires a second explicit click before resetting", () => {
    render(<OverviewView view="settings" state={createInitialState(1_000)} {...callbacks} />);

    fireEvent.click(screen.getByRole("button", { name: "Azzera salvataggio" }));
    expect(callbacks.onReset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Conferma: azzera definitivamente/ }));
    expect(callbacks.onReset).toHaveBeenCalledOnce();
  });

  it("imports pasted JSON and reports success", () => {
    render(<OverviewView view="settings" state={createInitialState(1_000)} {...callbacks} />);

    fireEvent.change(screen.getByPlaceholderText("Incolla qui il contenuto esportato"), { target: { value: "{\"version\":11}" } });
    fireEvent.click(screen.getByRole("button", { name: "Importa salvataggio" }));

    expect(callbacks.onImport).toHaveBeenCalledWith("{\"version\":11}");
    expect(screen.getByRole("status")).toHaveTextContent("Salvataggio importato correttamente");
  });

  it("updates the email signature name", () => {
    render(
      <OverviewView
        view="settings"
        state={createInitialState(1_000, "Andrea Ungaro")}
        {...callbacks}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nome e cognome"), {
      target: { value: "Giulia Bianchi" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aggiorna nome" }));

    expect(callbacks.onUpdateProfileName).toHaveBeenCalledWith("Giulia Bianchi");
  });
});
