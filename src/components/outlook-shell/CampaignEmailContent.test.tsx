import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EMAIL_TEMPLATES } from "../../content/emailTemplates";
import { createInitialState } from "../../game/engine";
import { CampaignEmailContent } from "./CampaignEmailContent";

afterEach(() => cleanup());

describe("CampaignEmailContent", () => {
  it("builds the visual structure before showing any copy", () => {
    const email = createInitialState(1_000, "Andrea Ungaro").emails[0];
    render(<CampaignEmailContent email={email} revealedCharacters={0} />);

    expect(screen.getByRole("img", { name: "Struttura della mail in costruzione" })).toBeVisible();
    expect(screen.queryByText(/Ciao/)).not.toBeInTheDocument();
  });

  it("reveals the initial campaign as plain text after the structure is built", () => {
    const email = createInitialState(1_000, "Andrea Ungaro").emails[0];
    render(<CampaignEmailContent email={email} revealedCharacters={email.body.length} />);

    expect(screen.getByLabelText("Email in formato Bozza disastrata")).toHaveAttribute(
      "data-email-presentation",
      "0",
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders catalog 2 as plain text while preserving the signature", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const body = EMAIL_TEMPLATES[0].body("Nome", "Andrea Ungaro", 2);
    const email = {
      ...initial.emails[0],
      body,
      presentationLevel: 2 as const,
      revealedCharacters: body.length,
    };

    render(<CampaignEmailContent email={email} />);

    expect(screen.getByLabelText("Email in formato Email professionale")).toHaveTextContent(
      "Andrea Ungaro, Ordine delle Onde - Genova",
    );
    expect(screen.getByLabelText("Email in formato Email professionale")).toHaveTextContent(
      /^Ciao Nome,/,
    );
    expect(screen.queryByText(EMAIL_TEMPLATES[0].subject)).not.toBeInTheDocument();
    expect(screen.queryByText("IL PROSSIMO PASSO")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Preview del codice HTML in costruzione")).not.toBeInTheDocument();
  });

  it("keeps the final HTML canvas silent while its structure is being written", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const levelSevenCopy = EMAIL_TEMPLATES[0].body("Nome", "Andrea Ungaro", 7);
    const email = {
      ...initial.emails[0],
      body: levelSevenCopy,
      presentationLevel: 7 as const,
      revealedCharacters: 0,
    };
    render(<CampaignEmailContent email={email} revealedCharacters={0} />);

    expect(screen.getByRole("img", { name: "Struttura della mail in costruzione" })).toBeVisible();
    expect(screen.queryByText("Ciao! Grazie di aver provato il nostro sport al MegaCon di Genova!")).not.toBeInTheDocument();
    expect(screen.queryByText("COME PRENOTARE")).not.toBeInTheDocument();
  });

  it("renders the complete HTML email with local imagery and typed sections", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const levelSevenCopy = EMAIL_TEMPLATES[0].body("Nome", "Andrea Ungaro", 7);
    const email = {
      ...initial.emails[0],
      body: levelSevenCopy,
      presentationLevel: 7 as const,
      revealedCharacters: levelSevenCopy.length,
    };
    render(<CampaignEmailContent email={email} />);

    expect(screen.getByLabelText("Email finale in formato HTML")).toHaveAttribute(
      "data-email-presentation",
      "7",
    );
    expect(screen.getByRole("img", { name: "LudoSport Genova" })).toHaveAttribute(
      "src",
      "/email-assets/ordine-onde.png",
    );
    expect(screen.getByText("Ciao! Grazie di aver provato il nostro sport al MegaCon di Genova!")).toBeVisible();
    expect(screen.getByText("COME PRENOTARE")).toBeVisible();
    expect(screen.getByText("DA VEDERE")).toBeVisible();
    expect(screen.queryByText(/Andrea Ungaro · Ordine delle Onde/)).not.toBeInTheDocument();
  });
});
