import { describe, expect, it } from "vitest";
import { addAdminMembers } from "./adminFlow";
import {
  getContactBaseStats,
  getContactPreparation,
  getPreparation,
  getStyleVote,
} from "./athleteStats";
import { createInitialState, gameReducer } from "./engine";
import { getAthleteImmunityStatus } from "./athleteImmunity";
import { departMembers } from "./membershipFlow";
import {
  getEligibleSchoolContacts,
  SCHOOL_TOURNAMENT_FIELD_SIZE,
  simulateTournament,
} from "./tournamentSimulation";

function createTournamentSchool(memberCount = 6) {
  const initial = createInitialState(1_000, "Test Manager");
  const enrolled = addAdminMembers(initial, memberCount);
  return {
    ...enrolled,
    contacts: enrolled.contacts.map((contact) => contact.status === "enrolled"
      ? { ...contact, forms: ["form-1" as const] }
      : contact),
  };
}

describe("athlete tournament statistics", () => {
  it("uses forms and experience as multipliers of the immutable base", () => {
    expect(getPreparation(100, 4, 20)).toBe(224);
    expect(getPreparation(75, 7, 20)).toBeCloseTo(204);
    expect(getStyleVote(125)).toBe(5);
  });

  it("generates independent stats inside rarity bounds", () => {
    const state = createInitialState(1_000);
    for (const contact of state.contacts) {
      const stats = getContactBaseStats(contact);
      expect(stats.arena).toBeGreaterThanOrEqual(contact.rarity === "rare" ? 25 : 1);
      expect(stats.arena).toBeLessThanOrEqual(100);
      expect(stats.style).toBeLessThanOrEqual(100);
      expect(getContactPreparation(contact).arena).toBe(stats.arena);
    }
  });
});

describe("tournament simulation", () => {
  it("creates variable school groups and six distinct qualifiers", () => {
    const state = createTournamentSchool();
    const eligible = getEligibleSchoolContacts(state);
    const simulation = simulateTournament(state, "school", 1, 181_000, eligible);

    expect(simulation.result.participants).toHaveLength(6);
    expect(new Set(simulation.result.groupStandings.map((entry) => entry.groupIndex)).size).toBe(1);
    expect(simulation.result.groupStandings.filter((entry) => entry.qualified)).toHaveLength(4);
    expect(simulation.result.qualifiers).toHaveLength(6);
    expect(new Set(simulation.result.qualifiers.map((entry) => entry.participantId)).size).toBe(6);
    expect(simulation.result.matches.every((match) =>
      (match.arenaScoreA === 2) !== (match.arenaScoreB === 2)
    )).toBe(true);
    expect(simulation.result.matches.every((match) =>
      match.styleScoreA > 0 && match.styleScoreA < 10 &&
      match.styleScoreB > 0 && match.styleScoreB < 10
    )).toBe(true);
  });

  it("keeps a large school tournament bounded to eight groups of eight", () => {
    const state = createTournamentSchool(160);
    const eligible = getEligibleSchoolContacts(state);
    const simulation = simulateTournament(state, "school", 1, 181_000, eligible);
    const standingsByGroup = new Map<number, typeof simulation.result.groupStandings>();
    simulation.result.groupStandings.forEach((standing) => {
      const group = standingsByGroup.get(standing.groupIndex) ?? [];
      group.push(standing);
      standingsByGroup.set(standing.groupIndex, group);
    });
    const qualifiedIds = new Set(
      simulation.result.groupStandings
        .filter((standing) => standing.qualified)
        .map((standing) => standing.participantId),
    );
    const roundOf32Ids = new Set(
      simulation.result.matches
        .filter((match) => match.stage === "round32")
        .flatMap((match) => [match.participantAId, match.participantBId]),
    );

    expect(standingsByGroup.size).toBe(8);
    expect(simulation.result.participants).toHaveLength(SCHOOL_TOURNAMENT_FIELD_SIZE);
    expect([...standingsByGroup.values()].map((group) => group.length)).toEqual([
      8, 8, 8, 8, 8, 8, 8, 8,
    ]);
    expect([...standingsByGroup.values()].every((group) =>
      group.filter((standing) => standing.qualified).length === 4
    )).toBe(true);
    expect(qualifiedIds.size).toBe(32);
    expect(roundOf32Ids).toEqual(qualifiedIds);
    expect(simulation.result.matches.some((match) => match.stage === "round64")).toBe(false);
    expect(simulation.result.matches.length).toBeLessThanOrEqual(256);
  });

  it("is deterministic from the saved seed", () => {
    const state = createTournamentSchool();
    const eligible = getEligibleSchoolContacts(state);
    const first = simulateTournament(state, "school", 1, 181_000, eligible);
    const second = simulateTournament(state, "school", 1, 181_000, eligible);
    expect(second).toEqual(first);
  });

  it("fills an academy field to 64 with generated opponents", () => {
    const state = createTournamentSchool();
    const owned = getEligibleSchoolContacts(state).slice(0, 6);
    const simulation = simulateTournament(state, "academy", 1, 421_000, owned);
    expect(simulation.result.participants).toHaveLength(64);
    expect(simulation.result.participants.filter((entry) => entry.ownedContactId)).toHaveLength(6);
    expect(simulation.result.groupStandings.filter((entry) => entry.qualified)).toHaveLength(32);
  });
});

describe("tournament calendar and immunity", () => {
  it("runs the school tournament at the end of December", () => {
    const state = createTournamentSchool();
    const december = {
      ...state,
      school: { ...state.school, currentMonth: 12, nextFeeAt: 61_000 },
    };
    const processed = gameReducer(december, { type: "TICK", now: 61_000 });
    expect(processed.tournaments.results).toHaveLength(1);
    expect(processed.tournaments.results[0].level).toBe("school");
    expect(processed.tournaments.qualification?.level).toBe("academy");
    expect(processed.tournaments.immuneContactIds).toHaveLength(6);
  });

  it("skips the season below six eligible members", () => {
    const state = createTournamentSchool(5);
    const december = {
      ...state,
      school: { ...state.school, currentMonth: 12, nextFeeAt: 61_000 },
    };
    const processed = gameReducer(december, { type: "TICK", now: 61_000 });
    expect(processed.tournaments.results).toHaveLength(0);
    expect(processed.tournaments.skippedSeasons).toEqual([1]);
  });

  it("never removes a qualified immune athlete", () => {
    const state = createTournamentSchool();
    const protectedId = getEligibleSchoolContacts(state)[0].id;
    const protectedState = {
      ...state,
      tournaments: {
        ...state.tournaments,
        qualification: {
          level: "academy" as const,
          season: 1,
          contactIds: [protectedId],
        },
        immuneContactIds: [protectedId],
      },
    };
    const departed = departMembers(protectedState, [protectedId]);
    expect(departed.contacts.find((entry) => entry.id === protectedId)?.status).toBe("enrolled");
  });

  it("removes tournament immunity after the Champion's Arena", () => {
    const state = createTournamentSchool();
    const protectedId = getEligibleSchoolContacts(state)[0].id;
    const championsState = {
      ...state,
      school: { ...state.school, currentMonth: 23, nextFeeAt: 61_000 },
      tournaments: {
        ...state.tournaments,
        qualification: {
          level: "champions" as const,
          season: 1,
          contactIds: [protectedId],
        },
        immuneContactIds: [protectedId],
      },
    };

    const processed = gameReducer(championsState, { type: "TICK", now: 61_000 });
    const athlete = processed.contacts.find((contact) => contact.id === protectedId)!;
    const immunity = getAthleteImmunityStatus({
      currentMonth: processed.school.currentMonth,
      tournamentQualification: processed.tournaments.qualification,
    }, athlete);

    expect(processed.tournaments.results.at(-1)?.level).toBe("champions");
    expect(processed.tournaments.qualification).toBeUndefined();
    expect(processed.tournaments.immuneContactIds).toEqual([]);
    expect(immunity.reasons).toEqual([]);
  });
});
