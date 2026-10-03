import { describe, expect, it } from "vitest";
import { createInitialState, gameReducer } from "./engine";
import { selectActiveEmail } from "./selectors";
import type { GameState } from "./types";

function withWriter(upgrades: Partial<GameState["upgrades"]>): GameState {
  const initial = createInitialState(1_000);
  return {
    ...initial,
    upgrades: { ...initial.upgrades, ...upgrades },
    collaborators: [{
      id: "collaborator-writer",
      contactId: initial.contacts[0].id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "writing",
      rarity: "rare",
    }],
    unlocks: { ...initial.unlocks, collaborators: true },
  };
}

function writtenAfter(state: GameState, seconds: number): { state: GameState; written: number } {
  let next = state;
  let written = 0;
  for (let second = 1; second <= seconds; second += 1) {
    const before = selectActiveEmail(next);
    next = gameReducer(next, { type: "TICK", now: 1_000 + second * 1_000 });
    const after = next.emails.find((email) => email.id === before?.id);
    written += (after?.revealedCharacters ?? 0) - (before?.revealedCharacters ?? 0);
  }
  return { state: next, written };
}

describe("Redazione collaborators and the writing rhythm", () => {
  it("fill the player's Flusso once Ritmo di battitura is bought", () => {
    const plain = writtenAfter(withWriter({}), 30);
    const rhythm = writtenAfter(withWriter({ "writing-rhythm": 4 }), 30);

    expect(plain.state.player.flow).toBeUndefined();
    expect(rhythm.state.player.flow?.meter).toBeGreaterThan(0);
    expect(rhythm.written).toBeGreaterThan(plain.written);
  });

  it("finish sentences with Frasi fatte", () => {
    const rhythm = writtenAfter(withWriter({ "writing-rhythm": 2 }), 30);
    const phrases = writtenAfter(withWriter({ "writing-rhythm": 2, "stock-phrases": 5 }), 30);

    expect(phrases.written).toBeGreaterThan(rhythm.written);
    expect(phrases.state.player.teamPerfectPhrases ?? 0).toBeGreaterThan(0);
    expect(phrases.state.player.perfectPhrases ?? 0).toBe(0);
  });
});
