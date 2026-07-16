import { describe, expect, it } from "vitest";
import {
  buildEmailHtmlSource,
  buildFinalEmailBody,
  getFinalEmailTextSections,
} from "./finalEmail";

describe("final HTML email model", () => {
  it("adds the visual sections in the same order as the reference mail", () => {
    const body = buildFinalEmailBody(
      "Nome",
      { opening: "La disciplina cresce con il gruppo.", invitation: "Vieni a provarla." },
    );
    const sections = getFinalEmailTextSections(body, 7);

    expect(sections.map(({ key }) => key)).toEqual([
      "title",
      "greeting",
      "intro",
      "mainLabel",
      "details",
      "booking",
      "contactsLabel",
      "contacts",
      "videoLabel",
      "videoTitle",
      "videoCaption",
      "signoff",
      "signature",
      "disclaimer",
    ]);
  });

  it("starts from HTML and CSS scaffolding instead of visible copy", () => {
    const source = buildEmailHtmlSource({
      subject: "Oggetto",
      body: "Ciao Nome,",
    });

    expect(source).toContain("<!doctype html>");
    expect(source).toContain("<style data-email-source>");
    expect(source).toContain('class="final-email-card final-email-main-card"');
    expect(source).toContain("/email-assets/lezione-prova.jpg");
  });

  it("keeps the third presentation level as plain text with its signature", () => {
    const body = buildFinalEmailBody(
      "Nome",
      {
        title: "Oggetto ripetuto",
        opening: "La disciplina cresce con il gruppo.",
        invitation: "Vieni a provarla.",
        signature: "Legend, Ordine delle Onde - Genova",
      },
      2,
    );
    const source = buildEmailHtmlSource({
      subject: "Oggetto",
      body,
      presentationLevel: 2,
    });

    expect(body).toContain("Legend, Ordine delle Onde - Genova");
    expect(body).toMatch(/^Ciao Nome,/);
    expect(body).not.toContain("Oggetto ripetuto");
    expect(body).not.toContain("IL PROSSIMO PASSO");
    expect(source).toBe(body);
    expect(source).toContain("Legend, Ordine delle Onde - Genova");
    expect(source).not.toContain("<!doctype html>");
  });

  it("uses the LudoSport invitation from catalog 4 onward", () => {
    const context = {
      opening: "La disciplina cresce con il gruppo.",
      invitation: "Vieni a provarla.",
    };

    expect(buildFinalEmailBody("Nome", context, 3)).not.toContain("IL PROSSIMO PASSO");
    expect(buildFinalEmailBody("Nome", context, 4)).toContain("Unisciti a Ludosport!");
    expect(buildFinalEmailBody("Nome", context, 4)).not.toContain("IL PROSSIMO PASSO");
    expect(buildFinalEmailBody("Nome", context, 5)).toContain("Unisciti a Ludosport!");
    expect(buildFinalEmailBody("Nome", context, 7)).not.toContain("IL PROSSIMO PASSO");
  });

  it("keeps the title in HTML catalogs", () => {
    const body = buildFinalEmailBody(
      "Nome",
      {
        title: "Titolo della campagna",
        opening: "La disciplina cresce con il gruppo.",
        invitation: "Vieni a provarla.",
      },
      3,
    );

    expect(body).toMatch(/^Titolo della campagna\n\nCiao Nome,/);
  });
});
