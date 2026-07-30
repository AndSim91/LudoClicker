import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EMAIL_TEMPLATES } from "../../content/emailTemplates";
import { createInitialState } from "../../game/engine";
import { CampaignEmailContent } from "./CampaignEmailContent";

afterEach(() => cleanup());

describe("CampaignEmailContent", () => {
  it("shows the HTML editor and the larger mail preview from level 3", () => {
    const initialEmail = createInitialState(1_000, "Andrea Ungaro").emails[0];
    const email = { ...initialEmail, presentationLevel: 3 as const };
    render(
      <CampaignEmailContent
        email={email}
        revealedCharacters={15}
        showCaret
        showHtmlEditor
      />,
    );

    expect(screen.getByLabelText("Composizione HTML della mail")).toBeVisible();
    expect(screen.getByLabelText("Anteprima della mail in costruzione")).toBeVisible();
    expect(screen.getByLabelText("Codice HTML scritto")).toHaveTextContent("<!doctype html>");
    expect(screen.queryByRole("img", { name: "Struttura della mail in costruzione" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Ciao/)).not.toBeInTheDocument();
  });

  it.each([0, 1, 2] as const)("shows only plain text construction at level %i", (level) => {
    const initialEmail = createInitialState(1_000, "Andrea Ungaro").emails[0];
    const email = { ...initialEmail, presentationLevel: level };

    render(
      <CampaignEmailContent
        email={email}
        revealedCharacters={0}
        showCaret
        showHtmlEditor
      />,
    );

    const label = ["Bozza disastrata", "Controllo ortografico", "Email professionale"][level];
    expect(screen.getByLabelText(`Email in formato ${label}`)).toBeVisible();
    expect(screen.queryByLabelText("Composizione HTML della mail")).not.toBeInTheDocument();
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

  it("marks level zero grammar errors like a spell checker", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const body = "Ciao Nome, la prova è gratuita perchè puoi provore Udosport.";
    const email = {
      ...initial.emails[0],
      body,
      presentationLevel: 0 as const,
      revealedCharacters: body.length,
    };

    const { container } = render(<CampaignEmailContent email={email} />);

    expect(
      Array.from(container.querySelectorAll(".level-zero-grammar-error"), (node) =>
        node.textContent,
      ),
    ).toEqual(["perchè", "provore", "Udosport"]);
  });

  it("waits for an incorrect word to be fully typed before marking it", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const body = "Ciao Nome, puoi provore questo sport.";
    const email = {
      ...initial.emails[0],
      body,
      presentationLevel: 0 as const,
    };
    const errorEnd = body.indexOf("provore") + "provore".length;
    const { container, rerender } = render(
      <CampaignEmailContent email={email} revealedCharacters={errorEnd - 1} />,
    );

    expect(container.querySelector(".level-zero-grammar-error")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email in formato Bozza disastrata")).toHaveTextContent(
      body.slice(0, errorEnd - 1),
    );

    rerender(<CampaignEmailContent email={email} revealedCharacters={errorEnd} />);

    expect(container.querySelector(".level-zero-grammar-error")).toHaveTextContent("provore");
  });

  it("renders catalog 2 as plain text with its complete signature", () => {
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
    expect(screen.queryByLabelText("Composizione HTML della mail")).not.toBeInTheDocument();
  });

  it("keeps the HTML preview silent while only the first source characters are written", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const levelSevenCopy = EMAIL_TEMPLATES[0].body("Nome", "Andrea Ungaro", 7);
    const email = {
      ...initial.emails[0],
      body: levelSevenCopy,
      presentationLevel: 7 as const,
      revealedCharacters: 0,
    };
    const { container } = render(
      <CampaignEmailContent
        email={email}
        revealedCharacters={15}
        showHtmlEditor
      />,
    );

    expect(screen.getByLabelText("Codice HTML scritto")).toHaveTextContent("<!doctype html>");
    expect(container.querySelector(".email-source-preview-canvas")).toBeEmptyDOMElement();
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
    expect(screen.getByText(/grazie per l'interesse dimostrato durante il nostro incontro/)).toBeVisible();
    expect(screen.getByText(/COME PRENOTARE/)).toBeVisible();
    expect(screen.getByText("DA VEDERE")).toBeVisible();
    expect(screen.queryByText(/Andrea Ungaro · Ordine delle Onde/)).not.toBeInTheDocument();
  });
});
