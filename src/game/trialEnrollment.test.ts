import { describe, expect, it } from "vitest";
import { createInitialState } from "./initialState";
import { resolveEmailOutcome } from "./emailFlow";
import { isTrialEnrollmentGuaranteed } from "./trialEnrollment";
import type { ScheduledTrial } from "./types";

describe("Andrea Simonazzi alla prova", () => {
  it("si iscrive sempre, in qualunque scuola", () => {
    const initial = createInitialState(1_000);
    const contact = { ...initial.contacts[0], rarity: "legendary" as const, specialProfileId: "andrea-simonazzi" as const };
    const trial: ScheduledTrial = {
      id: "trial-1", contactId: contact.id, startsAt: 1_000, resolvesAt: 2_000, resultSeed: 1, status: "scheduled",
    };
    for (const schoolCount of [0, 3]) {
      const state = {
        ...initial,
        contacts: [contact],
        school: { ...initial.school, fame: 5_000 },
        network: { ...initial.network, schoolCount },
      };
      expect(isTrialEnrollmentGuaranteed(state, trial)).toBe(true);
    }
  });
});

describe("Andrea Simonazzi nella scuola iniziale", () => {
  it("dalla risposta alla fine della prova passano pochi secondi solo la prima volta", () => {
    const initial = createInitialState(1_000);
    const contact = { ...initial.contacts[0], rarity: "legendary" as const, specialProfileId: "andrea-simonazzi" as const };
    const outcome = { id: "outcome-1", emailId: "email-1", contactId: contact.id, resolvesAt: 1_000, result: "trialBooked" as const };
    const iterMs = (schoolCount: number) => {
      const state = { ...initial, contacts: [contact], pendingEmailOutcomes: [outcome], network: { ...initial.network, schoolCount } };
      return resolveEmailOutcome(state, outcome, 1_000).scheduledTrials[0].resolvesAt - 1_000;
    };
    expect(iterMs(0)).toBe(20_000);
    expect(iterMs(3)).toBeGreaterThan(30_000);
  });
});

describe("Rete di sicurezza dei collaboratori (20/10/2026)", () => {
  it("dalla seconda scuola, dal secondo anno scolastico e sotto i 3 collaboratori il Leggendario si iscrive sempre", () => {
    const initial = createInitialState(1_000);
    const contact = { ...initial.contacts[0], rarity: "legendary" as const, specialProfileId: "eva-parodi" as const };
    const trial: ScheduledTrial = {
      id: "trial-1", contactId: contact.id, startsAt: 1_000, resolvesAt: 2_000, resultSeed: 1, status: "scheduled",
    };
    const guaranteed = (schoolCount: number, currentMonth: number, collaborators: number) => isTrialEnrollmentGuaranteed({
      ...initial,
      contacts: [contact],
      collaborators: Array.from({ length: collaborators }, (_, index) => ({ ...initial.collaborators[0], id: `c${index}` })),
      school: { ...initial.school, fame: 5_000, currentMonth },
      network: { ...initial.network, schoolCount },
    }, trial);
    expect(guaranteed(1, 24, 2)).toBe(true);
    expect(guaranteed(0, 24, 2)).toBe(false); // la prima scuola ha la sua Spinta
    expect(guaranteed(1, 10, 2)).toBe(false); // ancora il primo anno scolastico
    expect(guaranteed(1, 24, 3)).toBe(false);
  });
});
