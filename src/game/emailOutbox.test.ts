import { describe, expect, it } from "vitest";
import { createInitialState, gameReducer } from "./engine";
import { selectActiveEmail, selectRecentEmailsPerMinute } from "./selectors";
import type { GameState } from "./types";

function fastNewsroom(): GameState {
  const initial = createInitialState(1_000);
  return {
    ...initial,
    player: { ...initial.player, writingPower: 100_000 },
    collaborators: [{
      id: "collaborator-writer",
      contactId: "collaborator-contact",
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

describe("Posta in uscita", () => {
  it("lets the Redazione finish several emails in one step, carrying the extra work", () => {
    const start = fastNewsroom();
    const contacts = start.contacts.filter((contact) => contact.status !== "lost").length;
    const afterStep = gameReducer(start, { type: "TICK", now: 2_000 });

    const sending = afterStep.emails.filter((email) => email.status === "sending");
    expect(sending.length).toBeGreaterThan(1);
    expect(sending.length).toBeLessThanOrEqual(contacts);

    const sent = gameReducer(afterStep, { type: "TICK", now: 2_400 });
    expect(sent.statistics.emailsSent).toBe(sending.length);
    expect(selectRecentEmailsPerMinute(sent)).toBeGreaterThan(0);
  });

  it("opens the next draft while the previous email is still sending", () => {
    const start = fastNewsroom();
    const first = selectActiveEmail(start);
    const written = gameReducer(
      { ...start, collaborators: [], automation: { ...start.automation, autoSendEmails: false } },
      { type: "WRITE", now: 1_100 },
    );
    expect(selectActiveEmail(written)?.status).toBe("readyToSend");

    const sending = gameReducer(written, { type: "SEND_EMAIL", now: 1_200 });
    expect(sending.emails.find((email) => email.id === first?.id)?.status).toBe("sending");
    expect(selectActiveEmail(sending)?.status).toBe("writing");
    expect(selectActiveEmail(sending)?.id).not.toBe(first?.id);
  });
});
