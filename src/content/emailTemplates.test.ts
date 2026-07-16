import { describe, expect, it } from "vitest";
import { EMAIL_CATALOG, EMAIL_TEMPLATES } from "./emailTemplates";

describe("email template archive", () => {
  it("keeps every campaign copy in one editable catalog", () => {
    expect(EMAIL_CATALOG).toHaveLength(100);
    expect(EMAIL_CATALOG.every((entry) => entry.shortDraft.length > 0)).toBe(true);
    expect(EMAIL_CATALOG.every((entry) => entry.shortClean.length > 0)).toBe(true);
    expect(EMAIL_CATALOG.every((entry) => entry.opening.length > 0 && entry.invitation.length > 0)).toBe(true);
    expect(EMAIL_CATALOG[0].shortDraft).toContain("Vieni a provore Udosport");
    expect(EMAIL_CATALOG[0].shortClean).toContain("Vieni a provare LudoSport");
  });

  it("contains one hundred unique simulated campaigns", () => {
    const ids = new Set(EMAIL_TEMPLATES.map((template) => template.id));
    const subjects = new Set(EMAIL_TEMPLATES.map((template) => template.subject));
    const bodies = new Set(
      EMAIL_TEMPLATES.map((template) => template.body("Nome", "Andrea Ungaro")),
    );

    expect(EMAIL_TEMPLATES).toHaveLength(100);
    expect(ids.size).toBe(100);
    expect(subjects.size).toBe(100);
    expect(bodies.size).toBe(100);
    expect([...bodies].every((body) => body.length >= 135 && body.length <= 200)).toBe(true);
    expect([...bodies].every((body) => !body.includes("…"))).toBe(true);
    expect([...bodies].every((body) => !body.includes("..."))).toBe(true);
    expect([...bodies].some((body) => body.includes("Udosport") && body.includes("provore"))).toBe(true);
    expect([...bodies].some((body) => body.includes("La prova e"))).toBe(true);
    expect([...bodies].every((body) => !body.includes("LudoSport Genova"))).toBe(true);
    expect([...bodies].every((body) => !body.endsWith("Andrea Ungaro"))).toBe(true);

    const firstDraft = EMAIL_TEMPLATES[0].body("Nome", "Andrea Ungaro");
    const firstClean = EMAIL_TEMPLATES[0].body("Nome", "Andrea Ungaro", 1);
    expect(firstDraft).toContain("Vieni a provore Udosport in palestra");
    expect(firstClean).toContain("Vieni a provare LudoSport in palestra");
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
    expect(professionalBodies.every((body) => !body.includes("Ordine delle Onde\nLudoSport Genova"))).toBe(true);
    expect(personalizedBodies.every((body) => body.length >= 450 && body.length <= 900)).toBe(true);
    expect(ctaBodies.every((body) => body.length <= 1_200)).toBe(true);
    expect(layoutBodies.every((body) => body.length <= 1_300)).toBe(true);
    expect(flyerBodies.every((body) => body.length <= 3_000)).toBe(true);
    expect(marketingBodies.every((body) => body.length <= 4_000)).toBe(true);
    expect(marketingBodies.every((body) => body.includes("COME PRENOTARE"))).toBe(true);
    expect(marketingBodies.every((body) => body.includes("DA VEDERE"))).toBe(true);
  });
});
