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
    expect(source).toContain("<style>");
    expect(source).toContain('class="card"');
    expect(source).toContain("/email-assets/lezione-prova.jpg");
  });
});
