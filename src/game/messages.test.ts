import { describe, expect, it } from "vitest";
import { addInboxMessage, getInboxCategory, normalizeStackedMessages } from "./messages";
import type { InboxMessage } from "./types";

function message(id: string, subject = "Passaparola inatteso"): InboxMessage {
  return {
    id,
    sender: "Ordine delle Onde",
    subject,
    preview: "Sono arrivati nuovi contatti.",
    receivedAt: Number(id.replace(/\D/g, "")) || 1,
    tone: "positive",
    unread: true,
  };
}

describe("inbox message digests", () => {
  it("stacks repeated narrative notifications into one conversation", () => {
    const first = addInboxMessage([], message("message-1"));
    const second = addInboxMessage(first, message("message-2"));

    expect(second).toHaveLength(1);
    expect(second[0].id).toBe("message-1");
    expect(second[0].stackCount).toBe(2);
  });

  it("normalizes duplicate messages already present in old saves", () => {
    const normalized = normalizeStackedMessages([
      { ...message("message-3"), stackCount: 3 },
      message("message-2"),
      message("message-1", "Contributo straordinario"),
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].stackCount).toBe(5);
    expect(normalized[0].threadKey).toBe("narrative");
  });

  it("groups different operational subjects into one thematic conversation", () => {
    const sparring = addInboxMessage([], message("message-1", "Nuovi contatti dallo sparring"));
    const social = addInboxMessage(sparring, message("message-2", "Nuovi contatti dai Social"));

    expect(social).toHaveLength(1);
    expect(social[0].subject).toBe("Nuovi contatti dai Social");
    expect(social[0].threadKey).toBe("contacts");
    expect(social[0].stackCount).toBe(2);
  });

  it("condenses achievements and recurring goals into a single progress digest", () => {
    const achievement = addInboxMessage([], message("message-1", "Traguardo: Prima email inviata"));
    const goal = addInboxMessage(achievement, message("message-2", "Obiettivo completato: Tre inviti in partenza"));

    expect(goal).toHaveLength(1);
    expect(goal[0].threadKey).toBe("progress");
    expect(goal[0].stackCount).toBe(2);
  });

  it("condenses offline summaries and moves them out of the priority inbox", () => {
    const first = addInboxMessage([], message("message-1", "Riepilogo attività offline"));
    const second = addInboxMessage(first, message("message-2", "Riepilogo attività offline"));

    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({ threadKey: "offline", stackCount: 2 });
    expect(getInboxCategory(second[0])).toBe("other");
  });
});
