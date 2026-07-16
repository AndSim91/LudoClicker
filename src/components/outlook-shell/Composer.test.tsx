import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createInitialState } from "../../game/engine";
import { Composer } from "./Composer";

afterEach(() => cleanup());

describe("Composer", () => {
  it("shows the recipient rarity from the first active email", () => {
    const initial = createInitialState(1_000);
    const activeContact = initial.contacts[0];
    const state = {
      ...initial,
      contacts: initial.contacts.map((contact) =>
        contact.id === activeContact.id
          ? { ...contact, rarity: "rare" as const }
          : contact,
      ),
    };

    render(<Composer state={state} onWrite={() => undefined} />);

    expect(screen.getByText(new RegExp(activeContact.email))).toHaveClass(
      "rarity-address",
      "rarity-rare",
    );
  });

  it("keeps the character count without a redundant email progress bar", () => {
    render(<Composer state={createInitialState(1_000)} onWrite={() => undefined} />);

    expect(screen.queryByRole("progressbar", { name: /Costruzione email/ })).not.toBeInTheDocument();
    expect(screen.getByText(/0 \/ \d+ caratteri/)).toBeVisible();
    expect(screen.queryByText(/Email aziendale grezza/)).not.toBeInTheDocument();
  });
});
