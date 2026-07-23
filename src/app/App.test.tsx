import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createInitialState } from "../game/engine";
import { saveGame } from "../game/save";
import { APP_VERSION } from "../shared/appVersion";
import { App } from "./App";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("App profile and navigation", () => {
  it("asks for the name before showing the active draft", () => {
    render(<App />);

    expect(screen.getByRole("dialog", { name: "Come ti chiami?" })).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "Nome e cognome" }), {
      target: { value: "Andrea Ungaro" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Inizia" }));

    expect(screen.getByText("genova@ludosport.net")).toBeVisible();
    expect(screen.getByText(/Andrea Ungaro/)).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Il primo giorno da Preside" })).toBeVisible();
  });

  it("shows the generated application version in the status bar", () => {
    saveGame(createInitialState(Date.now(), "Andrea Ungaro"));
    render(<App />);

    expect(screen.getByRole("contentinfo")).toHaveTextContent(`v${APP_VERSION}`);
  });

  it("ends the first tutorial on sending and starts the three-email mission paused at zero", async () => {
    const initial = createInitialState(Date.now(), "Andrea Ungaro");
    saveGame({
      ...initial,
      player: { ...initial.player, writingPower: 10_000 },
    });
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Continua" }));
    fireEvent.click(screen.getByRole("button", { name: "Continua" }));

    expect(screen.getByText("Invia la tua prima mail")).toBeVisible();
    expect(screen.getByRole("button", { name: "Riprendi" })).toBeVisible();

    fireEvent.keyDown(window, { key: "a", code: "KeyA" });

    expect(screen.getAllByText("Invio in corso…").length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.queryByText("Invia la tua prima mail")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Pausa" })).toBeVisible();
    });
    expect(screen.getByText("0/3")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Eventi" })).not.toBeInTheDocument();
  });

  it("guides the first unlocked Event through the free sparring", async () => {
    const initial = createInitialState(Date.now(), "Andrea Ungaro");
    saveGame({
      ...initial,
      tutorial: {
        ...initial.tutorial,
        completedSceneIds: ["first-invitation"],
      },
      shortGoal: {
        definitionId: "book-trials",
        baseline: 0,
        target: 2,
        startedAt: Date.now(),
        completedCount: 1,
      },
    });
    render(<App />);

    expect(screen.getByText("Apri la pagina Eventi")).toBeVisible();
    expect(screen.getByRole("button", { name: "Pausa" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Eventi" }));

    expect(screen.getByRole("dialog", { name: "Eventi e attrezzatura" })).toBeVisible();
    expect(screen.getByText(/potrebbe anche danneggiarsi/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Riprendi" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Continua" }));

    expect(screen.getByText("Avvia l'evento di sparring gratuito")).toBeVisible();
    expect(screen.getByRole("button", { name: "Pausa" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Partecipa gratis" }));

    await waitFor(() => {
      expect(screen.queryByText("Avvia l'evento di sparring gratuito")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Annulla evento" })).toBeVisible();
  });

  it("starts with only the applications useful during the first campaign", () => {
    saveGame(createInitialState(Date.now(), "Andrea Ungaro"));
    render(<App />);

    const navigation = screen.getByRole("navigation", { name: "Applicazioni" });
    expect(navigation.querySelectorAll("button")).toHaveLength(3);
    expect(Array.from(navigation.querySelectorAll("button"), (button) => button.textContent)).toEqual([
      "Posta",
      "Impostazioni",
      "Admin",
    ]);
    expect(screen.queryByRole("button", { name: "Calendario" })).not.toBeInTheDocument();
  });

  it("reveals the complete application set as systems become useful", () => {
    const initial = createInitialState(Date.now(), "Andrea Ungaro");
    saveGame({
      ...initial,
      school: { ...initial.school, activeMembers: 6, historicMembers: 6 },
      equipment: { ...initial.equipment, wear: 3 },
      statistics: { ...initial.statistics, emailsSent: 3, eventsCompleted: 1 },
      unlocks: { ...initial.unlocks, upgrades: true, forms: true },
    });
    render(<App />);

    const navigation = screen.getByRole("navigation", { name: "Applicazioni" });
    expect(Array.from(navigation.querySelectorAll("button"), (button) => button.textContent)).toEqual([
      "Posta",
      "Eventi",
      "Iscritti",
      "Tornei",
      "Upgrade",
      "Attività",
      "Impostazioni",
      "Admin",
    ]);
  });

  it("reveals Follower in the top bar only when Social is unlocked", () => {
    const initial = createInitialState(Date.now(), "Andrea Ungaro");
    saveGame({
      ...initial,
      school: { ...initial.school, followers: 12 },
    });
    const { unmount } = render(<App />);

    expect(screen.queryByText("Follower")).not.toBeInTheDocument();
    unmount();

    saveGame({
      ...initial,
      school: { ...initial.school, followers: 12 },
      unlocks: { ...initial.unlocks, social: true },
    });
    render(<App />);

    expect(screen.getByLabelText("Follower Social: 12")).toBeVisible();
  });

  it("unlocks tournaments after reaching six members", () => {
    const initial = createInitialState(Date.now(), "Andrea Ungaro");
    saveGame({
      ...initial,
      school: { ...initial.school, activeMembers: 5, historicMembers: 5 },
    });
    const { unmount } = render(<App />);

    expect(screen.queryByRole("button", { name: "Tornei" })).not.toBeInTheDocument();
    unmount();

    saveGame({
      ...initial,
      school: { ...initial.school, activeMembers: 6, historicMembers: 6 },
    });
    render(<App />);

    expect(screen.getByRole("button", { name: "Tornei" })).toBeVisible();
  });

  it("uses the resource rows as shortcuts to the composer and members", () => {
    const initial = createInitialState(Date.now(), "Andrea Ungaro");
    saveGame({
      ...initial,
      school: { ...initial.school, activeMembers: 1, historicMembers: 1 },
    });
    render(<App />);

    const folderPane = screen.getByText("Cartelle").closest("aside");
    expect(folderPane).not.toBeNull();
    const folders = within(folderPane!);

    fireEvent.click(folders.getByRole("button", { name: /Posta inviata/ }));
    expect(screen.getByRole("heading", { name: "Nessuna mail inviata" })).toBeVisible();

    fireEvent.click(folders.getByRole("button", { name: /Contatti/ }));
    expect(screen.getByRole("button", { name: /Corpo del messaggio/ })).toBeVisible();

    fireEvent.click(folders.getByRole("button", { name: /Iscritti/ }));
    expect(screen.getByRole("heading", { name: "Iscritti" })).toBeVisible();
  });

  it("opens the development-only email catalog editor", () => {
    saveGame(createInitialState(Date.now(), "Andrea Ungaro"));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Admin" }));

    expect(screen.getByRole("heading", { name: "Admin" })).toBeVisible();
    expect(screen.getByText("DEV ONLY")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Passa a Ottobre" }));
    expect(screen.getByRole("button", { name: "Passa a Novembre" })).toBeVisible();
  });

  it("keeps the same day panel mounted when changing page", () => {
    saveGame(createInitialState(Date.now(), "Andrea Ungaro"));
    render(<App />);

    expect(screen.getAllByRole("complementary", { name: "La mia giornata" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Admin" }));

    expect(screen.getByRole("heading", { name: "Admin" })).toBeVisible();
    expect(screen.getAllByRole("complementary", { name: "La mia giornata" })).toHaveLength(1);
  });
});
