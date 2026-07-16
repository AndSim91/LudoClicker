import { describe, expect, it } from "vitest";
import { EMAIL_TEMPLATES } from "./emailTemplates";

describe("email template archive", () => {
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
    expect([...bodies].every((body) => body.length >= 150 && body.length <= 200)).toBe(true);
    expect([...bodies].some((body) => /\b(?:piu|perche|puo)\b|Spero che ti interessa/u.test(body))).toBe(true);
    expect([...bodies].every((body) => !body.includes("LudoSport Genova"))).toBe(true);
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
    expect(professionalBodies.every((body) => body.includes("LudoSport Genova"))).toBe(true);
    expect(personalizedBodies.every((body) => body.length >= 250 && body.length <= 450)).toBe(true);
    expect(ctaBodies.every((body) => body.length <= 500)).toBe(true);
    expect(layoutBodies.every((body) => body.length <= 600)).toBe(true);
    expect(flyerBodies.every((body) => body.length <= 800)).toBe(true);
    expect(marketingBodies.every((body) => body.length <= 2_000)).toBe(true);
  });
});
