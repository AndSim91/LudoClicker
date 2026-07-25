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
    onForceUpdate: vi.fn(),
    saveStatus: {
      phase: "saved" as const,
      lastSavedAt: 1_000,
      nextAutoSaveAt: 61_000,
      error: null,
    },
    onSaveNow: vi.fn(),
    onUpdateProfileName: vi.fn(),
    darkMode: false,
    onDarkModeChange: vi.fn(),
    reduceMotion: false,
    onReduceMotionChange: vi.fn(),
  };

  it("requires a second explicit click before resetting", () => {
    render(<OverviewView view="settings" state={createInitialState(1_000)} {...callbacks} />);

    fireEvent.click(screen.getByRole("button", { name: "Azzera partita" }));
    expect(callbacks.onReset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Conferma azzeramento" }));
    expect(callbacks.onReset).toHaveBeenCalledOnce();
  });

  it("imports pasted JSON and reports success", () => {
    render(<OverviewView view="settings" state={createInitialState(1_000)} {...callbacks} />);

    fireEvent.change(screen.getByPlaceholderText("Incolla qui il contenuto esportato"), {
      target: { value: '{"version":11}' },
    });
    fireEvent.click(screen.getByRole("button", { name: "Importa salvataggio" }));

    expect(callbacks.onImport).toHaveBeenCalledWith('{"version":11}');
    expect(screen.getByText("Salvataggio importato correttamente.")).toBeInTheDocument();
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

  it("toggles the dark theme preference", () => {
    render(<OverviewView view="settings" state={createInitialState(1_000)} {...callbacks} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /Tema scuro/ }));

    expect(callbacks.onDarkModeChange).toHaveBeenCalledWith(true);
  });

  it("offers a forced game update", () => {
    render(<OverviewView view="settings" state={createInitialState(1_000)} {...callbacks} />);

    fireEvent.click(screen.getByRole("button", { name: "Controlla aggiornamenti" }));

    expect(callbacks.onForceUpdate).toHaveBeenCalledOnce();
  });

  it("shows a reliable save status and allows an immediate save", () => {
    render(<OverviewView view="settings" state={createInitialState(1_000)} {...callbacks} />);

    expect(screen.getByRole("heading", { name: "Partita salvata" })).toBeInTheDocument();
    expect(screen.getByText(/Salvataggio automatico ogni minuto/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salva ora" }));

    expect(callbacks.onSaveNow).toHaveBeenCalledOnce();
  });

  it("makes a save failure explicit", () => {
    render(
      <OverviewView
        view="settings"
        state={createInitialState(1_000)}
        {...callbacks}
        saveStatus={{
          ...callbacks.saveStatus,
          phase: "error",
          error: {
            reason: "quota-exceeded",
            operation: "write-backup",
            errorName: "QuotaExceededError",
            errorMessage: "Quota exceeded",
            serializedLength: 512_000,
          },
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Salvataggio non riuscito" })).toBeInTheDocument();
    expect(screen.getByText(/Le modifiche restano in memoria/)).toBeInTheDocument();
    expect(screen.getByText(/spazio di archiviazione del browser/)).toBeInTheDocument();
    expect(screen.getByText("Dettagli tecnici per il bugfix")).toBeInTheDocument();
  });

  it("does not render prestige or school-foundation controls", () => {
    render(<OverviewView view="settings" state={createInitialState(1_000)} {...callbacks} />);

    expect(screen.queryByText("Coming Soon")).not.toBeInTheDocument();
    expect(screen.queryByText("Rete delle scuole")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fonda la nuova scuola" })).not.toBeInTheDocument();
  });
});
