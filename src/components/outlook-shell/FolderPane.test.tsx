import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GAME_CONFIG } from "../../game/config";
import { createInitialState } from "../../game/engine";
import type { InboxMessage } from "../../game/types";
import { FolderPane } from "./FolderPane";
import { formatExactCurrency } from "./resourceFormatting";

describe("FolderPane", () => {
  it("excludes locked tournament notifications from the inbox counter", () => {
    const initial = createInitialState(1_000);
    const tournamentMessage: InboxMessage = {
      ...initial.messages[0],
      id: "tournament-notification",
      subject: "Torneo Scolastico non disputato",
      threadKey: "tournaments",
    };
    const { container, rerender } = render(
      <FolderPane
        state={{ ...initial, messages: [tournamentMessage, ...initial.messages] }}
        folder="inbox"
        onSelectFolder={() => undefined}
        onOpenComposer={() => undefined}
        onOpenMembers={() => undefined}
      />,
    );

    expect(within(container).getByRole("button", { name: "Posta in arrivo 1" }))
      .toBeVisible();

    rerender(
      <FolderPane
        state={{
          ...initial,
          school: {
            ...initial.school,
            historicMembers: GAME_CONFIG.tournamentUnlockMembers,
          },
          messages: [tournamentMessage, ...initial.messages],
        }}
        folder="inbox"
        onSelectFolder={() => undefined}
        onOpenComposer={() => undefined}
        onOpenMembers={() => undefined}
      />,
    );

    expect(within(container).getByRole("button", { name: "Posta in arrivo 2" }))
      .toBeVisible();
  });

  it("includes the active draft in the contacts still to email", () => {
    const state = createInitialState(1_000);
    const { container } = render(
      <FolderPane
        state={state}
        folder="inbox"
        onSelectFolder={() => undefined}
        onOpenComposer={() => undefined}
        onOpenMembers={() => undefined}
      />,
    );

    const contactsRow = within(container).getByRole("button", { name: /Contatti/ });
    expect(state.contacts.filter((contact) => contact.status === "available")).toHaveLength(4);
    expect(contactsRow).toHaveTextContent("Contatti5");
  });

  it("compacts every sidebar counter and keeps the full balance available on hover", () => {
    const initial = createInitialState(1_000);
    const euros = 99_999_999_088;
    const availableContact = initial.contacts.find((contact) => contact.status === "available");
    const state = {
      ...initial,
      contacts: Array.from({ length: 1_200 }, (_, index) => ({
        ...availableContact!,
        id: `contact-${index}`,
      })),
      school: { ...initial.school, activeMembers: 999_999, euros },
    };

    const { container } = render(
      <FolderPane
        state={state}
        folder="inbox"
        onSelectFolder={() => undefined}
        onOpenComposer={() => undefined}
        onOpenMembers={() => undefined}
      />,
    );
    const rows = container.querySelectorAll(".resource-row");

    expect(rows[0]).toHaveTextContent(/1,2K/);
    expect(rows[1]).toHaveTextContent(/1\s+Mln/);
    expect(rows[2]).toHaveTextContent(/100\s+Mld\s+€/);
    expect(container.querySelector(`b[title="${formatExactCurrency(euros)}"]`)).toHaveTextContent(
      /100\s+Mld\s+€/,
    );
  });

  it("opens the composer and members from their resource rows", () => {
    const state = createInitialState(1_000);
    const onOpenComposer = vi.fn();
    const onOpenMembers = vi.fn();

    const { container } = render(
      <FolderPane
        state={state}
        folder="inbox"
        onSelectFolder={() => undefined}
        onOpenComposer={onOpenComposer}
        onOpenMembers={onOpenMembers}
      />,
    );

    const pane = within(container);
    fireEvent.click(pane.getByRole("button", { name: /Contatti/ }));
    fireEvent.click(pane.getByRole("button", { name: /Iscritti/ }));

    expect(onOpenComposer).toHaveBeenCalledOnce();
    expect(onOpenMembers).toHaveBeenCalledOnce();
    expect(pane.getByText(/Disponibilit/).closest("button")).toBeNull();
  });
});
