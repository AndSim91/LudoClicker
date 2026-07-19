import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import { createInitialState } from "./initialState";
import { nextRandom } from "./random";
import { scheduleSecretLegendaryTrial } from "./tournamentFlow";
import { getLegendaryEnrollmentChance, resolveTrial } from "./trialFlow";

function findSeed(predicate: (roll: number) => boolean): number {
  for (let seed = 1; seed < 100_000; seed += 1) {
    if (predicate(nextRandom(seed)[0])) return seed;
  }
  throw new Error("No deterministic seed found");
}

describe("secret legendary tournament trials", () => {
  it("starts Marco Palena's automatic 150-second trial without an email", () => {
    const initial = createInitialState(1_000, "Manager");
    const scheduled = scheduleSecretLegendaryTrial(initial, "marco-palena", 20_000);
    const contact = scheduled.contacts.at(-1)!;
    const trial = scheduled.scheduledTrials.at(-1)!;

    expect(contact).toMatchObject({
      firstName: "Marco",
      lastName: "Palena",
      source: "tournament",
      status: "trialScheduled",
      secretLegendaryId: "marco-palena",
      arenaBase: 75,
      styleBase: 90,
      tournamentExperience: 5,
    });
    expect(contact.forms).toContain("form-4-long");
    expect(trial.resolvesAt - trial.startsAt).toBe(GAME_CONFIG.secretLegendaryTrialDurationMs);
    expect(scheduled.emails).toHaveLength(initial.emails.length);
    expect(scheduled.network.secretLegendaries["marco-palena"]).toMatchObject({
      status: "trial",
      defeats: 1,
    });
  });

  it("enrolls on success and returns the athlete to the external pool on failure", () => {
    const initial = createInitialState(1_000, "Manager");
    const scheduled = scheduleSecretLegendaryTrial(initial, "lorenzo-todaro", 20_000);
    const baseTrial = scheduled.scheduledTrials.at(-1)!;
    const chance = getLegendaryEnrollmentChance(scheduled, "lorenzo-todaro");
    const successSeed = findSeed((roll) => roll < chance);
    const failureSeed = findSeed((roll) => roll > chance);

    const successTrial = { ...baseTrial, resultSeed: successSeed };
    const successState = {
      ...scheduled,
      scheduledTrials: [successTrial],
    };
    const enrolled = resolveTrial(successState, successTrial, successTrial.resolvesAt, 1);
    expect(enrolled.network.secretLegendaries["lorenzo-todaro"]).toMatchObject({
      status: "enrolled",
      enrolledContactId: successTrial.contactId,
    });
    expect(enrolled.contacts.find((contact) => contact.id === successTrial.contactId)?.status)
      .toBe("enrolled");

    const failureTrial = { ...baseTrial, resultSeed: failureSeed };
    const failureState = {
      ...scheduled,
      scheduledTrials: [failureTrial],
    };
    const rejected = resolveTrial(failureState, failureTrial, failureTrial.resolvesAt, 1);
    expect(rejected.network.secretLegendaries["lorenzo-todaro"]).toMatchObject({
      status: "external",
      failedTrials: 1,
    });
    expect(rejected.contacts.find((contact) => contact.id === failureTrial.contactId)?.status)
      .toBe("lost");
  });
});
