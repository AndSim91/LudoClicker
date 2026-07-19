import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import { createInitialState } from "./initialState";
import { nextRandom } from "./random";
import {
  compactTournamentHistory,
  scheduleSecretLegendaryTrial,
} from "./tournamentFlow";
import { getLegendaryEnrollmentChance, resolveTrial } from "./trialFlow";
import type { TournamentResult } from "./types";

function findSeed(predicate: (roll: number) => boolean): number {
  for (let seed = 1; seed < 100_000; seed += 1) {
    if (predicate(nextRandom(seed)[0])) return seed;
  }
  throw new Error("No deterministic seed found");
}

describe("tournament history retention", () => {
  it("keeps detailed results and missed seasons bounded", () => {
    const initial = createInitialState(1_000, "Manager");
    const result = (index: number): TournamentResult => ({
      id: `result-${index}`,
      level: "school",
      season: index,
      completedAt: index,
      participants: [],
      matches: [],
      groupStandings: [],
      arenaRanking: [],
      styleRanking: [],
      arenaPodium: [],
      stylePodium: [],
      qualifiers: [],
      rewards: [],
      secretLegendaryDefeatedIds: [],
    });
    const expanded = {
      ...initial,
      tournaments: {
        ...initial.tournaments,
        results: Array.from({ length: 30 }, (_, index) => result(index)),
        missedTournaments: Array.from({ length: 60 }, (_, season) => ({
          level: "school" as const,
          season,
          reason: "insufficient-members" as const,
        })),
        skippedSeasons: Array.from({ length: 60 }, (_, index) => index),
      },
    };

    const compacted = compactTournamentHistory(expanded);

    expect(compacted.tournaments.results).toHaveLength(
      GAME_CONFIG.recentTournamentResultsLimit,
    );
    expect(compacted.tournaments.results[0].id).toBe("result-6");
    expect(compacted.tournaments.missedTournaments).toHaveLength(
      GAME_CONFIG.recentMissedTournamentsLimit,
    );
    expect(compacted.tournaments.skippedSeasons[0]).toBe(12);
  });
});

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
