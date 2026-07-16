import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { InboxMessage } from "../../game/types";
import { MessageDetail } from "./MessageDetail";

afterEach(() => cleanup());

describe("MessageDetail", () => {
  it("does not show the stacked-conversation explanation", () => {
    const message: InboxMessage = {
      id: "repair-message",
      sender: "Ordine delle Onde",
      subject: "Riparazione non programmata",
      preview: "Una spada ha subito un danno.",
      receivedAt: 2_000,
      tone: "neutral",
      unread: true,
      stackCount: 3,
    };

    render(<MessageDetail message={message} />);

    expect(screen.getByText("Una spada ha subito un danno.")).toBeVisible();
    expect(screen.queryByText(/Questa conversazione raccoglie/)).not.toBeInTheDocument();
  });
});
