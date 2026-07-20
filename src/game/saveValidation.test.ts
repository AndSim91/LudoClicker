import { describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import { isValidGameState } from "./saveValidation";

describe("save validation at extreme scale", () => {
  it("accepts safe billion-scale counters and a finite quadrillion-scale balance", () => {
    const initial = createInitialState(1_000, "", false);
    const extreme = {
      ...initial,
      school: {
        ...initial.school,
        activeMembers: 1_000_000_000,
        peakActiveMembers: 1_000_000_000,
        historicMembers: 1_000_000_000,
        euros: 2_000_000_000_000_000,
      },
      statistics: {
        ...initial.statistics,
        contactsAcquired: 1_000_000_000,
      },
    };

    expect(isValidGameState(JSON.parse(JSON.stringify(extreme)))).toBe(true);
  });

  it.each([
    ["fractional members", { activeMembers: 1.5 }],
    ["negative members", { activeMembers: -1 }],
    ["unsafe members", { activeMembers: Number.MAX_SAFE_INTEGER + 1 }],
    ["infinite euros", { euros: Infinity }],
    ["negative euros", { euros: -1 }],
  ])("rejects %s", (_label, schoolPatch) => {
    const initial = createInitialState(1_000, "", false);
    expect(isValidGameState({
      ...initial,
      school: { ...initial.school, ...schoolPatch },
    })).toBe(false);
  });
});

describe("Legendary save invariants", () => {
  it("rejects generic and duplicated Legendary profiles", () => {
    const initial = createInitialState(1_000, "", false);
    const base = initial.contacts[0];
    const generic = { ...base, id: "generic-legendary", rarity: "legendary" as const };
    const eva = {
      ...base,
      id: "eva-one",
      rarity: "legendary" as const,
      specialProfileId: "eva-parodi" as const,
    };
    const duplicateEva = { ...eva, id: "eva-two" };
    const duplicatedTrials = {
      ...initial,
      contacts: [{ ...eva, status: "trialScheduled" as const }],
      scheduledTrials: [
        {
          id: "eva-trial-one",
          contactId: eva.id,
          startsAt: 1_000,
          resolvesAt: 2_000,
          resultSeed: 1,
          status: "scheduled" as const,
        },
        {
          id: "eva-trial-two",
          contactId: eva.id,
          startsAt: 1_000,
          resolvesAt: 2_000,
          resultSeed: 2,
          status: "scheduled" as const,
        },
      ],
    };

    expect(isValidGameState({ ...initial, contacts: [generic] })).toBe(false);
    expect(isValidGameState({ ...initial, contacts: [eva, duplicateEva] })).toBe(false);
    expect(isValidGameState(duplicatedTrials)).toBe(false);
  });
});
