import { describe, expect, it } from "vitest";
import {
  EMAIL_CATALOG,
  EMAIL_TEMPLATES,
  formatEmailSignature,
  resolveEmailTemplateCopy,
} from "./emailTemplates";
import { hasLevelZeroProofreadingError } from "./levelZeroProofreading";
import { getEmailBuildLength } from "./emailBuild";
import type { CampaignEmail, EmailPresentationLevel } from "../game/types";

function createEmailForLength(
  template: (typeof EMAIL_TEMPLATES)[number],
  presentationLevel: EmailPresentationLevel,
  expansion: number,
) {
  const copy = resolveEmailTemplateCopy(template, "Giulia", "Andrea", presentationLevel, undefined, undefined, expansion);
  return { ...copy, presentationLevel } as CampaignEmail;
}

describe("email template archive", () => {
  it("keeps every campaign in one catalog written in correct Italian", () => {
    expect(EMAIL_CATALOG).toHaveLength(100);
    expect(new Set(EMAIL_CATALOG.map((entry) => entry.id)).size).toBe(100);
    for (const entry of EMAIL_CATALOG) {
      for (const field of [entry.draftSubject, entry.draft, entry.subject, entry.opening, entry.invitation]) {
        expect(field.trim().length, entry.id).toBeGreaterThan(0);
      }
      // Errors are generated at level 0: the catalog itself stays clean.
      expect(hasLevelZeroProofreadingError(`${entry.draftSubject}\n${entry.draft}`), entry.id).toBe(false);
    }
  });

  it("contains one hundred unique simulated campaigns", () => {
    const subjects = new Set(EMAIL_TEMPLATES.map((template) => template.subject));
    const drafts = new Set(EMAIL_TEMPLATES.map((template) => template.body("Nome", "Andrea Ungaro")));
    expect(EMAIL_TEMPLATES).toHaveLength(100);
    expect(subjects.size).toBe(100);
    expect(drafts.size).toBe(100);
  });

  it("fills level 0 with gross, underlined errors but never touches the names", () => {
    for (const template of EMAIL_TEMPLATES) {
      const draft = resolveEmailTemplateCopy(template, "Giulia", "Andrea Ungaro", 0);
      const words = draft.body.match(/\p{L}+/gu)!.length;
      expect(draft.typos!.body.length, template.id).toBeGreaterThanOrEqual(Math.max(3, Math.floor(words / 5)));
      expect(draft.typos!.subject.length, template.id).toBeGreaterThanOrEqual(1);
      expect(draft.body.startsWith("Ciao Giulia,") || draft.body.startsWith("CIAO Giulia,") || /^\S+ Giulia,/.test(draft.body), template.id).toBe(true);
      expect(draft.body).not.toContain("Andrea Ungaro");
      expect(draft.body).not.toContain("Un saluto,");
      expect(draft.body.length, template.id).toBeLessThanOrEqual(220);
    }
    const first = resolveEmailTemplateCopy(EMAIL_TEMPLATES[0], "Giulia", "Andrea", 0);
    expect(resolveEmailTemplateCopy(EMAIL_TEMPLATES[0], "Giulia", "Andrea", 0)).toEqual(first);
  });

  it("restores the whole corrected draft at level 1 and adds lines without repeating it", () => {
    for (const [index, template] of EMAIL_TEMPLATES.entries()) {
      const clean = resolveEmailTemplateCopy(template, "Giulia", "Andrea Ungaro", 1, undefined, undefined, 5);
      expect(clean.typos).toBeUndefined();
      expect(clean.body).toContain(EMAIL_CATALOG[index].draft);
      expect(clean.subject).toBe(EMAIL_CATALOG[index].draftSubject);
      const added = clean.body.slice(clean.body.indexOf(EMAIL_CATALOG[index].draft) + EMAIL_CATALOG[index].draft.length);
      if (/gratis|gratuit/i.test(EMAIL_CATALOG[index].draft)) expect(added, template.id).not.toMatch(/gratis/i);
    }
  });

  it("never repeats the same sentence inside an email", () => {
    for (const level of [1, 2, 3, 4, 5, 6, 7] as const) {
      for (const template of EMAIL_TEMPLATES) {
        const body = template.body("Giulia", "Andrea Ungaro", level);
        const sentences = body.split(/(?<=[.!?])\s+|\n+/).map((line) => line.trim()).filter((line) => line.length > 12);
        expect(new Set(sentences).size, `${level}:${template.id}`).toBe(sentences.length);
      }
    }
  });

  it("personalizes the subject from level 3 and turns it into a campaign hook from level 6", () => {
    const template = EMAIL_TEMPLATES[0];
    expect(resolveEmailTemplateCopy(template, "Giulia", "Andrea", 2).subject).toBe(template.subject);
    expect(resolveEmailTemplateCopy(template, "Giulia", "Andrea", 3).subject).toBe("Giulia, una lezione di prova con l'Ordine delle Onde");
    for (const level of [6, 7] as const) {
      const copy = resolveEmailTemplateCopy(template, "Giulia", "Andrea", level);
      expect(copy.subject).toContain("Giulia");
      expect(copy.body).toContain("P.S.");
    }
    expect(template.body("Giulia", "Andrea", 5)).not.toContain("P.S.");
  });

  it("progresses from cleaned short copy to the marketing course", () => {
    const cleanBodies = EMAIL_TEMPLATES.map((template) => template.body("Nome", "Andrea Ungaro", 1));
    const professionalBodies = EMAIL_TEMPLATES.map((template) => template.body("Nome", "Andrea Ungaro", 2));
    const personalizedBodies = EMAIL_TEMPLATES.map((template) => template.body("Nome", "Andrea Ungaro", 3));
    const ctaBodies = EMAIL_TEMPLATES.map((template) => template.body("Nome", "Andrea Ungaro", 4));
    const layoutBodies = EMAIL_TEMPLATES.map((template) => template.body("Nome", "Andrea Ungaro", 5));
    const flyerBodies = EMAIL_TEMPLATES.map((template) => template.body("Nome", "Andrea Ungaro", 6));
    const marketingBodies = EMAIL_TEMPLATES.map((template) => template.body("Nome", "Andrea Ungaro", 7));

    expect(cleanBodies.every((body) => !body.includes("Spero che ti interessa"))).toBe(true);
    expect(professionalBodies.every((body) => body.includes("Un saluto,"))).toBe(true);
    expect(professionalBodies.every((body) =>
      body.includes("Andrea Ungaro, Ordine delle Onde - Genova")
    )).toBe(true);
    expect(professionalBodies.every((body) => !body.includes("Ordine delle Onde\nLudoSport Genova"))).toBe(true);
    expect(personalizedBodies.every((body) => body.length >= 450 && body.length <= 900)).toBe(true);
    expect(ctaBodies.every((body) => body.length <= 1_200)).toBe(true);
    expect(layoutBodies.every((body) => body.length <= 1_300)).toBe(true);
    expect(flyerBodies.every((body) => body.length <= 3_000)).toBe(true);
    expect(marketingBodies.every((body) => body.length <= 4_000)).toBe(true);
    expect(marketingBodies.every((body) => body.includes("PRENOTA ORA"))).toBe(true);
    expect(marketingBodies.every((body) => body.includes("DA VEDERE"))).toBe(true);
  });

  it("does not repeat the subject in catalog 2 bodies", () => {
    expect(EMAIL_TEMPLATES.every((template) => {
      const body = template.body("Nome", "Andrea Ungaro", 2);
      return body.startsWith("Ciao Nome,") && !body.includes(template.subject);
    })).toBe(true);
  });

  it("builds the HTML signature from player, order and city", () => {
    expect(formatEmailSignature("Legend", "Ordine delle Onde", "Genova")).toBe(
      "Legend, Ordine delle Onde - Genova",
    );
    expect(formatEmailSignature("Legend", "Ordine delle Onde - Genova", "Genova")).toBe(
      "Legend, Ordine delle Onde - Genova",
    );
    expect(
      EMAIL_TEMPLATES[0].body("Nome", "Legend", 2, "Ordine del Faro", "Trieste"),
    ).toContain("Legend, Ordine del Faro - Trieste");
  });
});

describe("email a blocchi", () => {
  const average = (level: EmailPresentationLevel, expansion: number) => {
    const lengths = EMAIL_TEMPLATES.map((template) =>
      getEmailBuildLength(createEmailForLength(template, level, expansion)),
    );
    return lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
  };

  it("keeps level zero short and grows every catalog with each Creatività point", () => {
    expect(average(0, 0)).toBeLessThan(130);
    for (const level of [1, 2, 3, 4, 5, 6, 7] as const) {
      for (let expansion = 1; expansion <= 5; expansion += 1) {
        expect(average(level, expansion)).toBeGreaterThan(average(level, expansion - 1));
      }
    }
    expect(average(1, 1)).toBeGreaterThan(average(0, 0));
    expect(average(2, 1)).toBeGreaterThan(average(1, 5));
    expect(average(3, 1)).toBeGreaterThan(average(2, 5));
  });
});
