import { describe, expect, it } from "vitest";
import { createInitialState } from "./initialState";
import { getEnrollmentChance } from "./formulas";
import { nextRandom } from "./random";
import { scheduleSecretLegendaryTrial } from "./tournamentFlow";
import { getLegendaryEnrollmentChance, resolveTrial } from "./trialFlow";
import type { GameState, ScheduledTrial, SpecialCollaboratorId } from "./types";

function findSeed(predicate: (roll: number) => boolean): number {
  for (let seed = 0; seed < 100_000; seed += 1) {
    if (predicate(nextRandom(seed)[0])) return seed;
  }
  throw new Error("No deterministic seed found");
}

function createTrialState({
  legendaryPity,
  resultSeed,
  specialProfileId,
}: {
  legendaryPity: number;
  resultSeed: number;
  specialProfileId?: SpecialCollaboratorId;
}): { state: GameState; trial: ScheduledTrial } {
  const initial = createInitialState(1_000, "", false);
  const contact = {
    ...initial.contacts[0],
    rarity: specialProfileId ? "legendary" as const : "common" as const,
    specialProfileId,
    status: "trialScheduled" as const,
  };
  const trial: ScheduledTrial = {
    id: `trial-pity-${specialProfileId ?? "common"}`,
    contactId: contact.id,
    startsAt: 1_500,
    resolvesAt: 2_000,
    resultSeed,
    status: "scheduled",
    equipmentUsed: 1,
  };
  return {
    trial,
    state: {
      ...initial,
      legendaryPity,
      school: {
        ...initial.school,
        activeMembers: 1,
        peakActiveMembers: 1,
        historicMembers: 1,
      },
      contacts: initial.contacts.map((candidate) =>
        candidate.id === contact.id ? contact : candidate
      ),
      scheduledTrials: [trial],
      equipment: {
        ...initial.equipment,
        availableSwords: initial.equipment.availableSwords - 1,
      },
    },
  };
}

describe("Legendary Pity", () => {
  it("gains one point on every failed trial and survives an ordinary enrollment", () => {
    const initial = createInitialState(1_000, "", false);
    const ordinaryChance = getEnrollmentChance(initial, "common");
    const failureSeed = findSeed((roll) => roll >= ordinaryChance);
    const successSeed = findSeed((roll) => roll < ordinaryChance);
    const failedTrial = createTrialState({ legendaryPity: 5, resultSeed: failureSeed });
    const successfulTrial = createTrialState({ legendaryPity: 6, resultSeed: successSeed });

    const failed = resolveTrial(
      failedTrial.state,
      failedTrial.trial,
      failedTrial.trial.resolvesAt,
      1,
    );
    const ordinaryEnrollment = resolveTrial(
      successfulTrial.state,
      successfulTrial.trial,
      successfulTrial.trial.resolvesAt,
      1,
    );

    expect(failed.contacts[0].status).toBe("lost");
    expect(failed.legendaryPity).toBe(6);
    expect(ordinaryEnrollment.contacts[0].status).toBe("enrolled");
    expect(ordinaryEnrollment.legendaryPity).toBe(6);
  });

  it("adds whole Pity points after the personal Legendary bonus and caps at 100%", () => {
    const base = createTrialState({
      legendaryPity: 20,
      resultSeed: 0,
      specialProfileId: "eva-parodi",
    });
    const withPersonalFailures: GameState = {
      ...base.state,
      legendaryCollaborators: {
        ...base.state.legendaryCollaborators,
        enrollmentAttempts: { "eva-parodi": 2 },
      },
    };
    const capped: GameState = { ...withPersonalFailures, legendaryPity: 100 };

    expect(getLegendaryEnrollmentChance(base.state, "eva-parodi")).toBeCloseTo(0.35);
    expect(getLegendaryEnrollmentChance(withPersonalFailures, "eva-parodi")).toBeCloseTo(0.41);
    expect(getLegendaryEnrollmentChance(capped, "eva-parodi")).toBe(1);
  });

  it("resets on a standard Legendary enrollment and increments on its failure", () => {
    const pity = 20;
    const chanceWithoutPity = 0.15;
    const chanceWithPity = chanceWithoutPity + pity / 100;
    const successOnlyWithPitySeed = findSeed(
      (roll) => roll >= chanceWithoutPity && roll < chanceWithPity,
    );
    const failureSeed = findSeed((roll) => roll >= chanceWithPity);
    const successfulTrial = createTrialState({
      legendaryPity: pity,
      resultSeed: successOnlyWithPitySeed,
      specialProfileId: "eva-parodi",
    });
    const failedTrial = createTrialState({
      legendaryPity: pity,
      resultSeed: failureSeed,
      specialProfileId: "eva-parodi",
    });

    const enrolled = resolveTrial(
      successfulTrial.state,
      successfulTrial.trial,
      successfulTrial.trial.resolvesAt,
      1,
    );
    const rejected = resolveTrial(
      failedTrial.state,
      failedTrial.trial,
      failedTrial.trial.resolvesAt,
      1,
    );

    expect(enrolled.contacts[0].status).toBe("enrolled");
    expect(enrolled.legendaryPity).toBe(0);
    expect(rejected.contacts[0].status).toBe("lost");
    expect(rejected.legendaryPity).toBe(pity + 1);
  });

  it("makes a 100% Pity trial guaranteed even when no sword is available", () => {
    const prepared = createTrialState({
      legendaryPity: 85,
      resultSeed: 1,
      specialProfileId: "eva-parodi",
    });
    const trial = { ...prepared.trial, equipmentUsed: undefined };
    const state: GameState = {
      ...prepared.state,
      scheduledTrials: [trial],
      equipment: {
        ...prepared.state.equipment,
        availableSwords: 0,
        damagedSwords: prepared.state.equipment.totalSwords,
      },
    };

    const enrolled = resolveTrial(state, trial, trial.resolvesAt, 1);

    expect(enrolled.contacts[0].status).toBe("enrolled");
    expect(enrolled.scheduledTrials[0].equipmentUsed).toBe(0);
    expect(enrolled.legendaryPity).toBe(0);
  });

  it("applies and resets Pity for a Secret Legendary", () => {
    const initial = { ...createInitialState(1_000), legendaryPity: 20 };
    const scheduled = scheduleSecretLegendaryTrial(initial, "lorenzo-todaro", 2_000);
    const trial = scheduled.scheduledTrials.at(-1)!;
    const successOnlyWithPitySeed = findSeed((roll) => roll >= 0.15 && roll < 0.35);
    const ready = {
      ...scheduled,
      scheduledTrials: scheduled.scheduledTrials.map((candidate) =>
        candidate.id === trial.id
          ? { ...candidate, resultSeed: successOnlyWithPitySeed }
          : candidate
      ),
    };
    const readyTrial = ready.scheduledTrials.at(-1)!;

    const enrolled = resolveTrial(ready, readyTrial, readyTrial.resolvesAt, 1);

    expect(enrolled.network.secretLegendaries["lorenzo-todaro"].status).toBe("enrolled");
    expect(enrolled.legendaryPity).toBe(0);
  });
});
