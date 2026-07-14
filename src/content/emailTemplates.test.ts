import { describe, expect, it } from "vitest";
import { EMAIL_TEMPLATES } from "./emailTemplates";

describe("email template archive", () => {
  it("contains one hundred unique simulated campaigns", () => {
    const ids = new Set(EMAIL_TEMPLATES.map((template) => template.id));
    const subjects = new Set(EMAIL_TEMPLATES.map((template) => template.subject));
    const bodies = new Set(
      EMAIL_TEMPLATES.map((template) => template.body("Nome", "Andrea Simonazzi")),
    );

    expect(EMAIL_TEMPLATES).toHaveLength(100);
    expect(ids.size).toBe(100);
    expect(subjects.size).toBe(100);
    expect(bodies.size).toBe(100);
    expect([...bodies].every((body) => body.includes("LudoSport Genova"))).toBe(true);
    expect(
      [...bodies].every((body) => body.includes("Andrea Simonazzi - Ordine delle Onde")),
    ).toBe(true);
    expect([...bodies].every((body) => !body.toLocaleLowerCase("it-IT").includes("segreteria")))
      .toBe(true);
  });
});
