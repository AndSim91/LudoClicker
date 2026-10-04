import { expect, it } from "vitest";
import { createInitialState, gameReducer } from "./engine";
import { selectActiveEmail } from "./selectors";
import type { GameState } from "./types";

// Prova recuperata (Accoglienza): il contatto torna disponibile senza nessuna mail
// in corso. Il tick deve aprire la bozza, altrimenti la Posta resta vuota per sempre.
it("opens a draft whenever a contact is available and no email is active", () => {
  const initial = createInitialState(1_000);
  const [contact] = initial.contacts;
  const state: GameState = {
    ...initial,
    contacts: [{ ...contact, status: "available", trialRetryUsed: true }],
    emails: [],
  };
  expect(selectActiveEmail(state)).toBeUndefined();

  const next = gameReducer(state, { type: "TICK", now: state.automation.lastProcessedAt + 1_000 });

  expect(selectActiveEmail(next)?.contactId).toBe(contact.id);
  expect(next.contacts[0].status).toBe("writing");
});
