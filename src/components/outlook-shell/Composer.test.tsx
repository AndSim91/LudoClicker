import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EMAIL_TEMPLATES } from "../../content/emailTemplates";
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

    const { container } = render(
      <Composer
        state={state}
        onWrite={() => undefined}
        onAutomaticSendingChange={() => undefined}
      />,
    );

    const recipient = screen.getByText(new RegExp(activeContact.email));
    const mailHeader = container.querySelector<HTMLElement>(".mail-fields")!;
    expect(mailHeader).toHaveAttribute("data-tutorial-region", "composer-header");
    expect(mailHeader).toHaveAttribute("data-tutorial-target", "true");
    expect(recipient).toHaveClass(
      "rarity-address",
      "rarity-rare",
    );
    expect(recipient).toHaveAttribute("data-tutorial-region", "composer-recipient");
    expect(recipient).toHaveAttribute("data-tutorial-target", "true");
  });

  it("keeps the character count without a redundant email progress bar", () => {
    render(
      <Composer
        state={createInitialState(1_000)}
        onWrite={() => undefined}
        onAutomaticSendingChange={() => undefined}
      />,
    );

    expect(screen.queryByRole("progressbar", { name: /Costruzione email/ })).not.toBeInTheDocument();
    expect(screen.getByText(/0 \/ \d+ caratteri/)).toBeVisible();
    expect(screen.queryByText(/Email aziendale grezza/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Corpo del messaggio/ })).toHaveAttribute(
      "data-tutorial-region",
      "composer-body",
    );
  });

  it("shows whole numbers in the writing status without changing decimal game values", () => {
    const initial = createInitialState(1_000);
    const activeEmail = initial.emails[0];
    const revealedCharacters = 15.399999999999999;
    const writingPower = 2.2;
    const state = {
      ...initial,
      player: { ...initial.player, writingPower },
      emails: initial.emails.map((email) =>
        email.id === activeEmail.id
          ? { ...email, revealedCharacters }
          : email,
      ),
    };

    render(
      <Composer
        state={state}
        onWrite={() => undefined}
        onAutomaticSendingChange={() => undefined}
      />,
    );

    expect(screen.getByText(/15 \/ \d+ caratteri · 2 per input/)).toBeVisible();
    expect(state.emails[0].revealedCharacters).toBe(revealedCharacters);
    expect(state.player.writingPower).toBe(writingPower);
  });

  it("shows automatic sending enabled by default and lets the player disable it", () => {
    const onAutomaticSendingChange = vi.fn();

    render(
      <Composer
        state={createInitialState(1_000)}
        onWrite={() => undefined}
        onAutomaticSendingChange={onAutomaticSendingChange}
      />,
    );

    const toggle = screen.getByRole("checkbox", { name: "Invio automatico" });
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);
    expect(onAutomaticSendingChange).toHaveBeenCalledWith(false);
  });

  it("uses the HTML source workspace for an active level 3 draft", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const activeEmail = initial.emails[0];
    const body = EMAIL_TEMPLATES[0].body(
      initial.contacts[0].firstName,
      "Andrea Ungaro",
      3,
    );
    const state = {
      ...initial,
      emails: initial.emails.map((email) =>
        email.id === activeEmail.id
          ? {
              ...email,
              body,
              presentationLevel: 3 as const,
              revealedCharacters: 15,
            }
          : email,
      ),
    };

    render(
      <Composer
        state={state}
        onWrite={() => undefined}
        onAutomaticSendingChange={() => undefined}
      />,
    );

    expect(screen.getByLabelText("Composizione HTML della mail")).toBeVisible();
    expect(screen.getByLabelText("Codice HTML scritto")).toHaveTextContent("<!doctype html>");
  });
});
