import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createInitialState } from "../game/engine";
import { saveGame } from "../game/save";
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
      school: { ...initial.school, activeMembers: 1, historicMembers: 1 },
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
      "Upgrade",
      "Attività",
      "Impostazioni",
      "Admin",
    ]);
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

    expect(screen.getByRole("heading", { name: "Admin · Cataloghi email" })).toBeVisible();
    expect(screen.getByText("DEV ONLY")).toBeVisible();
  });
});
