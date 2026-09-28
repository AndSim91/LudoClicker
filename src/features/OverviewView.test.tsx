import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../game/engine";
import { CrashReporter } from "../game/crashReporting";
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
    onFoundSchool: vi.fn(),
  };

  it("founds a new school only after the national title and a second click", () => {
    const locked = createInitialState(1_000);
    const { unmount } = render(<OverviewView view="settings" state={locked} {...callbacks} />);
    expect(screen.getByRole("button", { name: "Fonda la nuova scuola" })).toBeDisabled();
    unmount();

    const ready = { ...locked, tournaments: { ...locked.tournaments, nationalTitlesCurrentSchool: 1 } };
    render(<OverviewView view="settings" state={ready} {...callbacks} />);
    fireEvent.change(screen.getByLabelText("Nome della scuola"), { target: { value: "Onde di Levante" } });
    fireEvent.change(screen.getByLabelText("Città"), { target: { value: "La Spezia" } });
    fireEvent.click(screen.getByRole("button", { name: "Fonda la nuova scuola" }));
    expect(callbacks.onFoundSchool).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Conferma: fonda la scuola" }));
    expect(callbacks.onFoundSchool).toHaveBeenCalledWith(expect.objectContaining({
      name: "Onde di Levante",
      city: "La Spezia",
      specialization: "redazione",
    }));
  });

  it("requires a second explicit click before resetting", () => {
    render(<OverviewView view="settings" state={createInitialState(1_000)} {...callbacks} />);

    fireEvent.click(screen.getByRole("button", { name: "Azzera partita" }));
    expect(callbacks.onReset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Conferma azzeramento" }));
    expect(callbacks.onReset).toHaveBeenCalledOnce();
  });

  it("imports a selected JSON file and reports success", async () => {
    render(<OverviewView view="settings" state={createInitialState(1_000)} {...callbacks} />);

    const input = screen.getByLabelText("File JSON");
    const file = new File(['{"version":11}'], "salvataggio.json", { type: "application/json" });
    const importButton = screen.getByRole("button", { name: "Importa salvataggio" });

    expect(input).toHaveAttribute("accept", ".json,application/json");
    expect(importButton).toBeDisabled();
    fireEvent.change(input, {
      target: { files: [file] },
    });
    expect(importButton).toBeEnabled();
    fireEvent.click(importButton);

    await waitFor(() => expect(callbacks.onImport).toHaveBeenCalledWith('{"version":11}'));
    expect(screen.getByText("Salvataggio importato correttamente.")).toBeInTheDocument();
    expect(importButton).toBeDisabled();
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

  it("confirms that a rejected stored save was not overwritten", () => {
    render(
      <OverviewView
        view="settings"
        state={createInitialState(1_000)}
        {...callbacks}
        saveStatus={{
          ...callbacks.saveStatus,
          phase: "error",
          error: {
            reason: "stored-save-protected",
            operation: "protect-existing",
            errorName: "StoredSaveRejected",
            errorMessage: "Invalid migrated state",
            serializedLength: 512_000,
          },
        }}
      />,
    );

    expect(screen.getByText(/salvataggio esistente non ha superato il caricamento/))
      .toBeInTheDocument();
    expect(screen.getByText(/salvataggio originale è ancora nel browser/))
      .toBeInTheDocument();
  });

  it("shows and clears the latest local crash report", () => {
    const reporter = new CrashReporter({
      storage: localStorage,
      now: () => 1_000,
      createId: (() => {
        const ids = ["session-1", "report-1"];
        return () => ids.shift() ?? "generated-id";
      })(),
      heartbeatIntervalMs: 0,
    });
    reporter.start();
    reporter.updateView("events");
    reporter.recordError("javascript-error", new Error("runtime boom"));
    reporter.stop();

    render(<OverviewView view="settings" state={createInitialState(1_000)} {...callbacks} />);

    expect(screen.getByRole("heading", { name: "Crash registrato" })).toBeInTheDocument();
    expect(screen.getByText(/Errore JavaScript non gestito/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scarica report" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Elimina report" }));
    expect(screen.getByRole("heading", { name: "Nessun crash registrato" }))
      .toBeInTheDocument();
  });

  it("lists the network schools with their fixed rent", () => {
    const initial = createInitialState(1_000);
    const school = {
      id: "school-1", name: "Ordine delle Onde", city: "Genova", motto: "", specialization: "generale" as const,
      membersAtTransfer: 120, emailsSent: 0, eventsCompleted: 0, transferredAt: 1_000, monthlyRent: 1_450, championsWin: true, reptileWin: "superba" as const,
    };
    render(<OverviewView view="settings" state={{ ...initial, network: { ...initial.network, schools: [school] } }} {...callbacks} />);

    expect(screen.queryByText("Coming Soon")).not.toBeInTheDocument();
    expect(screen.getByText("Ordine delle Onde · Sede madre")).toBeInTheDocument();
    expect(screen.getByText(/120 iscritti · Champions · Superba/)).toBeInTheDocument();
  });
});
