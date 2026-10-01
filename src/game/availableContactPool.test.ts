import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import { startNextCampaign } from "./emailFlow";
import { createInitialState, gameReducer } from "./engine";
import { getCurrentSchoolContactCount, poolExcessAvailableContacts } from "./historyArchive";
import { loadGame, saveGame } from "./save";
import { selectAvailableContacts, selectContactsAwaitingEmail } from "./selectors";
import type { Contact, GameState } from "./types";

const NOW = 1_800_000_000_000;
const LIMIT = GAME_CONFIG.materialAvailableContactsLimit;

function withContacts(amount: number): GameState {
  return gameReducer(createInitialState(NOW, "Andrea", false), {
    type: "ADMIN_ADD_CONTACTS",
    amount,
  });
}

function materialAvailable(state: GameState): Contact[] {
  return state.contacts.filter((contact) => contact.status === "available");
}

describe("available contact pool", () => {
  it("keeps only the oldest available contacts as objects and counts the rest", () => {
    const base = createInitialState(NOW, "Andrea", false);
    const state = withContacts(1_000);

    const ordinary = materialAvailable(state).filter((contact) => contact.rarity !== "legendary");
    expect(ordinary.length).toBeLessThanOrEqual(LIMIT);
    expect(selectAvailableContacts(state)).toBe(selectAvailableContacts(base) + 1_000);
    expect(selectContactsAwaitingEmail(state)).toBe(selectContactsAwaitingEmail(base) + 1_000);
    expect(getCurrentSchoolContactCount(state)).toBe(base.contacts.length + 1_000);
  });

  it("never pools legendary or special contacts", () => {
    const state = withContacts(LIMIT + 10);
    const legendary: Contact = {
      ...materialAvailable(state)[0],
      id: "legendary-late",
      rarity: "legendary",
      specialProfileId: "andrea-simonazzi",
    };
    const extra: Contact[] = Array.from({ length: 20 }, (_, index) => ({
      ...materialAvailable(state)[0],
      id: `late-${index}`,
    }));

    const pooled = poolExcessAvailableContacts({
      ...state,
      contacts: [...state.contacts, ...extra, legendary],
    });

    expect(pooled.contacts.some((contact) => contact.id === "legendary-late")).toBe(true);
    expect(pooled.contacts.some((contact) => contact.id.startsWith("late-"))).toBe(false);
  });

  it("creates the next contact from the pool when no object is left", () => {
    const base = createInitialState(NOW, "Andrea", false);
    const state: GameState = {
      ...base,
      contacts: base.contacts.filter((contact) => contact.status !== "available" &&
        contact.status !== "writing"),
      emails: [],
      availableContactPool: [{ source: "social", rarity: "rare", count: 2 }],
    };

    const started = startNextCampaign(state, NOW);
    const writing = started.contacts.find((contact) => contact.status === "writing");

    expect(writing).toMatchObject({ source: "social", rarity: "rare", forms: [] });
    expect(started.emails.at(-1)?.contactId).toBe(writing?.id);
    expect(started.availableContactPool).toEqual([{ source: "social", rarity: "rare", count: 1 }]);
  });

  it("removes pooled contacts first when the admin takes contacts away", () => {
    const state = withContacts(1_000);
    const before = selectAvailableContacts(state);

    const reduced = gameReducer(state, { type: "ADMIN_ADD_CONTACTS", amount: -500 });

    expect(selectAvailableContacts(reduced)).toBe(before - 500);
    expect(materialAvailable(reduced)).toHaveLength(materialAvailable(state).length);
  });

  it("survives a save and load", () => {
    const state = withContacts(500);

    expect(saveGame(state, NOW)).toBe(true);
    const loaded = loadGame(NOW);

    expect(loaded.availableContactPool).toEqual(state.availableContactPool);
    expect(selectAvailableContacts(loaded)).toBe(selectAvailableContacts(state));
  });
});
