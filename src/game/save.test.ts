import { describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import { loadGame, saveGame } from "./save";

describe("local save", () => {
  it("round-trips the game state", () => {
    const state = createInitialState(1_000);
    saveGame({ ...state, school: { ...state.school, euros: 42 } }, 2_000);

    expect(loadGame(3_000).school.euros).toBe(42);
    expect(loadGame(3_000).lastSavedAt).toBe(2_000);
  });

  it("falls back to a fresh state when the save is corrupt", () => {
    localStorage.setItem("oggetto-nuovi-iscritti.save", "not-json");

    const state = loadGame(5_000);
    expect(state.createdAt).toBe(5_000);
    expect(state.contacts).toHaveLength(10);
  });

  it("migrates an existing version 1 save without losing progress", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 1;
    legacy.school.euros = 37;
    delete legacy.acquisitionEvents;
    delete legacy.activities;
    delete legacy.statistics.contactsAcquired;
    delete legacy.statistics.eventsCompleted;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(5_000);
    expect(migrated.version).toBe(3);
    expect(migrated.school.euros).toBe(37);
    expect(migrated.acquisitionEvents).toEqual([]);
    expect(migrated.statistics.contactsAcquired).toBe(0);
    expect(migrated.upgrades["comfortable-keyboard"]).toBe(0);
  });

  it("migrates version 2 speed progress into the upgrade catalog", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 2;
    legacy.upgrades = { speedLevel: 2 };
    legacy.player = { writingPower: 3 };
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(5_000);
    expect(migrated.version).toBe(3);
    expect(migrated.upgrades["comfortable-keyboard"]).toBe(2);
    expect(migrated.upgrades["prepared-presentation"]).toBe(0);
    expect(migrated.player.writingPower).toBe(3);
  });

  it("removes previously saved trial-booking messages", () => {
    const state = createInitialState(1_000);
    const bookingMessage = {
      ...state.messages[0],
      id: "message-booking",
      subject: "Nuova lezione di prova prenotata",
    };
    localStorage.setItem(
      "oggetto-nuovi-iscritti.save",
      JSON.stringify({ ...state, messages: [bookingMessage, ...state.messages] }),
    );

    const loaded = loadGame(5_000);

    expect(loaded.messages).toEqual(state.messages);
  });
});
