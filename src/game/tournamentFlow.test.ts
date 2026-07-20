import { describe, expect, it } from "vitest";
import { getTournamentReward } from "../content/tournaments";
import { GAME_CONFIG } from "./config";
import { createInitialState } from "./initialState";
import { nextRandom } from "./random";
import {
  compactTournamentHistory,
  scheduleSecretLegendaryTrial,
} from "./tournamentFlow";
import {
  applyTournamentRewards,
  resolveTournamentRewardFallbacks,
} from "./tournamentRewardFlow";
import { getLegendaryEnrollmentChance, resolveTrial } from "./trialFlow";
import type { SpecialCollaboratorId, TournamentResult } from "./types";

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

    const retried = scheduleSecretLegendaryTrial(rejected, "lorenzo-todaro", 40_000);
    expect(retried.contacts.filter((contact) =>
      contact.secretLegendaryId === "lorenzo-todaro",
    )).toHaveLength(1);
    expect(retried.scheduledTrials).toHaveLength(2);
    expect(retried.scheduledTrials.at(-1)?.contactId).toBe(failureTrial.contactId);
    expect(retried.contacts.find((contact) => contact.id === failureTrial.contactId)?.status)
      .toBe("trialScheduled");
  });
});

describe("tournament reward effects", () => {
  it("uses the requested tournament reward catalogue", () => {
    expect(getTournamentReward("academy", "arena", 1)).toMatchObject({
      euros: 1_000,
      contacts: 3,
      bonus: { kind: "random-contacts", amount: 3 },
    });
    expect(getTournamentReward("national", "arena", 1)).toMatchObject({
      euros: 5_000,
      bonus: { kind: "trial", rarity: "ultra-rare" },
    });
    expect(getTournamentReward("national", "style", 2)).toMatchObject({
      euros: 2_500,
      bonus: { kind: "email", rarity: "ultra-rare" },
    });
    expect(getTournamentReward("champions", "arena", 1)).toMatchObject({
      euros: 50_000,
      bonus: { kind: "enrollment", rarity: "legendary" },
    });
  });

  function rewardState() {
    const initial = createInitialState(1_000, "Manager");
    return {
      ...initial,
      contacts: initial.contacts.map((contact) => ({ ...contact, status: "enrolled" as const })),
      emails: [],
      school: {
        ...initial.school,
        activeMembers: initial.contacts.length,
        historicMembers: initial.contacts.length,
      },
    };
  }

  function resultWithReward(reward: TournamentResult["rewards"][number]): TournamentResult {
    return {
      id: "reward-result",
      level: "academy",
      season: 1,
      completedAt: 2_000,
      participants: [],
      matches: [],
      groupStandings: [],
      arenaRanking: [],
      styleRanking: [],
      arenaPodium: [],
      stylePodium: [],
      qualifiers: [],
      rewards: [reward],
      secretLegendaryDefeatedIds: [],
    };
  }

  it("puts random tournament contacts into the email queue", () => {
    const state = rewardState();
    const rewarded = applyTournamentRewards(state, resultWithReward({
      discipline: "arena",
      position: 1,
      euros: 1_000,
      contacts: 3,
      bonus: { kind: "random-contacts", amount: 3 },
    }), 2_000);

    const tournamentContacts = rewarded.contacts.filter((contact) => contact.source === "tournament");
    expect(tournamentContacts).toHaveLength(3);
    expect(rewarded.emails.some((email) => email.contactId === tournamentContacts[0].id)).toBe(true);
    expect(tournamentContacts.filter((contact) => contact.status === "available")).toHaveLength(2);
  });

  it("creates guaranteed special contacts for email, trial and enrollment rewards", () => {
    const emailState = applyTournamentRewards(rewardState(), resultWithReward({
      discipline: "style",
      position: 2,
      euros: 2_500,
      contacts: 0,
      bonus: { kind: "email", rarity: "ultra-rare" },
    }), 2_000);
    const emailContact = emailState.contacts.at(-1)!;
    expect(emailContact.rarity).toBe("ultra-rare");
    expect(emailState.emails.at(-1)?.contactId).toBe(emailContact.id);

    const trialState = applyTournamentRewards(rewardState(), resultWithReward({
      discipline: "arena",
      position: 1,
      euros: 5_000,
      contacts: 0,
      bonus: { kind: "trial", rarity: "ultra-rare" },
    }), 2_000);
    expect(trialState.contacts.at(-1)?.rarity).toBe("ultra-rare");
    expect(trialState.contacts.at(-1)?.status).toBe("trialScheduled");
    expect(trialState.scheduledTrials).toHaveLength(1);

    const enrollmentState = applyTournamentRewards(rewardState(), resultWithReward({
      discipline: "arena",
      position: 1,
      euros: 50_000,
      contacts: 0,
      bonus: { kind: "enrollment", rarity: "legendary" },
    }), 2_000);
    expect(enrollmentState.contacts.at(-1)?.rarity).toBe("legendary");
    expect(enrollmentState.contacts.at(-1)?.status).toBe("enrolled");
    expect(enrollmentState.collaborators).toHaveLength(1);
    expect(enrollmentState.school.activeMembers).toBe(rewardState().school.activeMembers + 1);
  });

  it("falls back to Ultra Rare when no standard Legendary profile is available", () => {
    const state = rewardState();
    const exhausted = {
      ...state,
      legendaryCollaborators: {
        ...state.legendaryCollaborators,
        enrolledProfileIds: [
          "andrea-simonazzi",
          "eva-parodi",
          "andrea-ferrari",
          "marco-gabriele-fedozzi",
          "matteo-scarzello",
          "chris-usai",
          "guglielmo-oliveri",
          "niccolo-efrati",
        ] as SpecialCollaboratorId[],
      },
    };
    const result = resultWithReward({
      discipline: "arena",
      position: 1,
      euros: 50_000,
      contacts: 0,
      bonus: { kind: "enrollment", rarity: "legendary" },
    });

    const resolved = resolveTournamentRewardFallbacks(exhausted, result);
    const rewarded = applyTournamentRewards(exhausted, result, 2_000);

    expect(resolved.rewards[0].bonus).toEqual({
      kind: "enrollment",
      rarity: "ultra-rare",
    });
    expect(rewarded.contacts.at(-1)).toMatchObject({
      rarity: "ultra-rare",
      specialProfileId: undefined,
      status: "enrolled",
    });
    expect(rewarded.collaborators).toHaveLength(exhausted.collaborators.length);
  });
});
