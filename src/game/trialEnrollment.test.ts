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
