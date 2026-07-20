import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GAME_CONFIG } from "../../game/config";
import { createInitialState } from "../../game/engine";
import type { CampaignEmail, InboxMessage } from "../../game/types";
import { MessageList } from "./MessageList";

afterEach(cleanup);

function message(
  id: string,
  subject: string,
  category: InboxMessage["category"],
): InboxMessage {
  return {
    id,
    sender: "Ordine delle Onde",
    subject,
    preview: `Anteprima ${subject}`,
    receivedAt: 2_000,
    tone: "system",
    unread: true,
    category,
  };
}

describe("MessageList", () => {
  it("keeps sent-mail rendering bounded and provides access to the full archive", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const contact = initial.contacts[0];
    const emails: CampaignEmail[] = Array.from({ length: 160 }, (_, index) => ({
      id: `sent-${index}`,
      contactId: contact.id,
      templateId: "default",
      subject: `Archivio ${index}`,
      body: "Corpo",
      revealedCharacters: 5,
      createdAt: index,
      sentAt: index + 1,
      presentationLevel: 0,
      status: "sent",
    }));
    const onSelectSentEmail = vi.fn();

    render(
      <MessageList
        state={{ ...initial, emails }}
        folder="sent"
        selectedMessageId={null}
        selectedSentEmailId={null}
        onSelectMessage={vi.fn()}
        onSelectSentEmail={onSelectSentEmail}
      />,
    );

    const archive = screen.getByRole("region", { name: "Posta inviata" });
    expect(archive.querySelectorAll(".sent-row")).toHaveLength(75);
    expect(screen.getByText("Archivio 159")).toBeVisible();
    expect(screen.getByText("Pagina 1 di 3")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Successiva" }));

    expect(archive.querySelectorAll(".sent-row")).toHaveLength(75);
    expect(screen.queryByText("Archivio 159")).not.toBeInTheDocument();
    expect(screen.getByText("Archivio 84")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Successiva" }));

    expect(archive.querySelectorAll(".sent-row")).toHaveLength(10);
    fireEvent.click(screen.getByRole("button", { name: /Archivio 0/ }));
    expect(onSelectSentEmail).toHaveBeenCalledWith("sent-0");
  });

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

  it("hides tournament notifications until tournaments are unlocked", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const tournamentMessage: InboxMessage = {
      ...message("tournament", "Torneo Scolastico non disputato", "focused"),
      threadKey: "tournaments",
    };
    const { rerender } = render(
      <MessageList
        state={{ ...initial, messages: [tournamentMessage, ...initial.messages] }}
        folder="inbox"
        selectedMessageId={null}
        selectedSentEmailId={null}
        onSelectMessage={vi.fn()}
        onSelectSentEmail={vi.fn()}
      />,
    );

    expect(screen.queryByText(tournamentMessage.subject)).not.toBeInTheDocument();

    rerender(
      <MessageList
        state={{
          ...initial,
          school: {
            ...initial.school,
            activeMembers: GAME_CONFIG.tournamentUnlockMembers,
            historicMembers: GAME_CONFIG.tournamentUnlockMembers,
          },
          messages: [tournamentMessage, ...initial.messages],
        }}
        folder="inbox"
        selectedMessageId={null}
        selectedSentEmailId={null}
        onSelectMessage={vi.fn()}
        onSelectSentEmail={vi.fn()}
      />,
    );

    expect(screen.getByText(tournamentMessage.subject)).toBeVisible();
  });
});
