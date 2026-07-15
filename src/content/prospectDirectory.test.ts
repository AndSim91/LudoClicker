import { describe, expect, it } from "vitest";
import {
  PROSPECT_EMAIL_PROVIDERS,
  PROSPECT_FIRST_NAMES,
  PROSPECT_LAST_NAMES,
  createRandomProspect,
} from "./prospectDirectory";

describe("prospect directory", () => {
  it("contains at least 50 unique Italian first and last names", () => {
    expect(PROSPECT_FIRST_NAMES.length).toBeGreaterThanOrEqual(50);
    expect(PROSPECT_LAST_NAMES.length).toBeGreaterThanOrEqual(50);
    expect(new Set(PROSPECT_FIRST_NAMES).size).toBe(PROSPECT_FIRST_NAMES.length);
    expect(new Set(PROSPECT_LAST_NAMES).size).toBe(PROSPECT_LAST_NAMES.length);
  });

  it("randomly combines first name, last name, and email provider", () => {
    const generated = Array.from({ length: 20 }, (_, seed) =>
      createRandomProspect(seed)
    );

    expect(generated.every((prospect) =>
      PROSPECT_FIRST_NAMES.includes(
        prospect.firstName as (typeof PROSPECT_FIRST_NAMES)[number],
      ) &&
      PROSPECT_LAST_NAMES.includes(
        prospect.lastName as (typeof PROSPECT_LAST_NAMES)[number],
      ) &&
      PROSPECT_EMAIL_PROVIDERS.includes(
        prospect.email.split("@")[1] as (typeof PROSPECT_EMAIL_PROVIDERS)[number],
      )
    )).toBe(true);
    expect(new Set(generated.map((prospect) => prospect.firstName)).size).toBeGreaterThan(1);
    expect(new Set(generated.map((prospect) => prospect.lastName)).size).toBeGreaterThan(1);
    expect(new Set(generated.map((prospect) => prospect.email.split("@")[1])).size)
      .toBeGreaterThan(1);
  });

  it("is reproducible from the game seed", () => {
    expect(createRandomProspect(12_345)).toEqual(createRandomProspect(12_345));
  });

  it("keeps a special profile name while randomizing its provider", () => {
    const generated = createRandomProspect(12_345, {
      firstName: "Andrea",
      lastName: "Simonazzi",
    });

    expect(generated.firstName).toBe("Andrea");
    expect(generated.lastName).toBe("Simonazzi");
    expect(generated.email).toMatch(/^andrea\.simonazzi@/);
    expect(PROSPECT_EMAIL_PROVIDERS).toContain(generated.email.split("@")[1]);
  });
});
