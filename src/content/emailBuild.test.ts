import { describe, expect, it } from "vitest";
import { createInitialState } from "../game/engine";
import {
  EMAIL_STRUCTURE_INPUTS,
  getEmailBuildSource,
  getEmailStructureProgress,
  getEmailTextRevealCount,
} from "./emailBuild";
import { EMAIL_TEMPLATES } from "./emailTemplates";

describe("email construction phases", () => {
  it("builds the visual structure before revealing copy", () => {
    const email = createInitialState(1_000).emails[0];

    expect(getEmailStructureProgress(email)).toBe(0);
    expect(getEmailTextRevealCount(email)).toBe(0);

    const builtStructure = {
      ...email,
      revealedCharacters: EMAIL_STRUCTURE_INPUTS,
    };
    expect(getEmailStructureProgress(builtStructure)).toBe(100);
    expect(getEmailTextRevealCount(builtStructure)).toBe(0);
  });

  it("reveals the complete copy when the email reaches its final character", () => {
    const email = createInitialState(1_000).emails[0];
    const completed = { ...email, revealedCharacters: email.body.length };

    expect(getEmailTextRevealCount(completed)).toBe(email.body.length);
  });

  it("writes catalog 2 as plain text and retains the full signature", () => {
    const initialEmail = createInitialState(1_000, "Andrea Ungaro").emails[0];
    const body = EMAIL_TEMPLATES[0].body("Nome", "Andrea Ungaro", 2);
    const email = {
      ...initialEmail,
      body,
      presentationLevel: 2 as const,
      revealedCharacters: body.length,
    };

    expect(getEmailBuildSource(email)).toBe(body);
    expect(getEmailStructureProgress(email)).toBe(100);
    expect(getEmailTextRevealCount(email)).toBe(body.length);
    expect(body).toContain("Andrea Ungaro, Ordine delle Onde - Genova");
    expect(body).not.toContain("IL PROSSIMO PASSO");
  });
});
