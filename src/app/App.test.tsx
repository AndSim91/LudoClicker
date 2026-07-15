import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getByText(/Andrea Ungaro - Ordine delle Onde/)).toBeVisible();
  });

  it("shows the requested application order without Calendar", () => {
    saveGame(createInitialState(Date.now(), "Andrea Ungaro"));
    render(<App />);

    const navigation = screen.getByRole("navigation", { name: "Applicazioni" });
    expect(navigation.querySelectorAll("button")).toHaveLength(6);
    expect(Array.from(navigation.querySelectorAll("button"), (button) => button.textContent)).toEqual([
      "Posta",
      "Eventi",
      "Iscritti",
      "Miglioramenti",
      "Attività",
      "Impostazioni",
    ]);
    expect(screen.queryByRole("button", { name: "Calendario" })).not.toBeInTheDocument();
  });
});
