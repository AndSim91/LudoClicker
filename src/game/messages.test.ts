import { describe, expect, it } from "vitest";
import { addInboxMessage, normalizeStackedMessages } from "./messages";
import type { InboxMessage } from "./types";

function message(id: string, subject = "Passaparola inatteso"): InboxMessage {
  return {
    id,
    sender: "Segreteria Ordine delle Onde",
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

    expect(normalized).toHaveLength(2);
    expect(normalized[0].stackCount).toBe(4);
    expect(normalized[1].subject).toBe("Contributo straordinario");
  });
});
