import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import type { InboxMessage } from "../../game/types";
import { MessageList } from "./MessageList";

afterEach(cleanup);

function message(
  id: string,
  subject: string,
  category: InboxMessage["category"],
): InboxMessage {
  return {
    id,
    sender: "Segreteria Ordine delle Onde",
    subject,
    preview: `Anteprima ${subject}`,
    receivedAt: 2_000,
    tone: "system",
    unread: true,
    category,
  };
}

describe("MessageList", () => {
  it("keeps operational mail focused and moves secondary notifications to Other", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const state = {
      ...initial,
      messages: [
        message("achievement", "Traguardo: Prima email inviata", "other"),
        message("member", "Primo iscritto registrato", "focused"),
        ...initial.messages,
      ],
    };
    const onSelectMessage = vi.fn();

    render(
      <MessageList
        state={state}
        folder="inbox"
        selectedMessageId={null}
        selectedSentEmailId={null}
        onSelectMessage={onSelectMessage}
        onSelectSentEmail={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: "Evidenziata (3)" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Primo iscritto registrato")).toBeVisible();
    expect(screen.queryByText("Traguardo: Prima email inviata")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Altra (1)" }));

    expect(screen.getByText("Traguardo: Prima email inviata")).toBeVisible();
    expect(screen.queryByText("Primo iscritto registrato")).not.toBeInTheDocument();
    expect(screen.queryByText(/Bozza per/)).not.toBeInTheDocument();
    expect(onSelectMessage).toHaveBeenCalledWith(null);
  });

  it("classifies legacy achievements as secondary notifications", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const legacyAchievement = message(
      "legacy-achievement",
      "Traguardo: Primo evento completato",
      undefined,
    );

    render(
      <MessageList
        state={{ ...initial, messages: [legacyAchievement] }}
        folder="inbox"
        selectedMessageId={null}
        selectedSentEmailId={null}
        onSelectMessage={vi.fn()}
        onSelectSentEmail={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: "Altra (1)" })).toBeVisible();
  });
});
