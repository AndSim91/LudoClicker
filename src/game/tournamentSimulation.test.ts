import { describe, expect, it } from "vitest";
import {
  SECRET_LEGENDARIES,
  SECRET_LEGENDARY_IDS,
  getSecretLegendaryForms,
  getSecretLegendaryProfile,
} from "../content/secretLegendaries";
import { getLevelForms } from "./levelForms";
import { getTournamentSchool } from "../content/tournamentSchools";
import { TOURNAMENT_DEFINITIONS } from "../content/tournaments";
import { addAdminMembers } from "./adminFlow";
import { FORM_DEFINITIONS } from "../content/forms";
import {
  getAthleteTournamentStats,
  getAthleteWeapon,
  getContactBaseStats,
  getFormStatBonuses,
  getContactPreparation,
  getPreparation,
  getStyleVote,
} from "./athleteStats";
import { createInitialState, gameReducer } from "./engine";
import { GAME_CONFIG } from "./config";
import { getAthleteImmunityStatus } from "./athleteImmunity";
import { departMembers } from "./membershipFlow";
import type { GameState } from "./types";
import {
  getEligibleSchoolContacts,
  isSecretLegendaryDefeated,
  SCHOOL_TOURNAMENT_FIELD_SIZE,
  selectSchoolTournamentEntrants,
  simulateTournament,
} from "./tournamentSimulation";

function createTournamentSchool(memberCount = 6) {
  const initial = createInitialState(1_000, "Test Manager");
  const enrolled = addAdminMembers(initial, memberCount);
  return {
    ...enrolled,
    contacts: enrolled.contacts.map((contact) =>
      contact.status === "enrolled" ? { ...contact, forms: ["form-1" as const] } : contact,
    ),
  };
}

function withoutExternalSecretLegendaries(state: GameState): GameState {
  return {
    ...state,
    network: {
      ...state.network,
      secretLegendaries: Object.fromEntries(
        Object.entries(state.network.secretLegendaries).map(([id, progress]) => [
          id,
          { ...progress, status: "enrolled" as const },
        ]),
      ) as GameState["network"]["secretLegendaries"],
    },
  };
}

describe("athlete tournament statistics", () => {
  it("uses forms and experience as multipliers of the immutable base", () => {
    expect(getPreparation(100, 0.4, 20)).toBe(224);
    expect(getPreparation(75, 0.7, 20)).toBeCloseTo(204);
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

  it("composes permanent values, forms and experience in one authoritative result", () => {
    const contact = {
      ...createInitialState(1_000).contacts[0],
      arenaBase: 52,
      styleBase: 41,
      tournamentExperience: 10,
      forms: [
        "form-1" as const,
        "form-2" as const,
        "form-3-long" as const,
        "form-4-long" as const,
        "form-5-long" as const,
        "form-6" as const,
        "form-7" as const,
      ],
    };
    const stats = getAthleteTournamentStats(contact, contact.forms);

    expect(stats.base).toEqual({ arena: 52, style: 41 });
    expect(stats.numericForms).toBe(7);
    expect(stats.tournamentExperience).toBe(10);
    // F1, F2, F3–F5 Lunga, F6, F7 (no Corso Y in this list): 10+10+15+10+10 = +55%.
    expect(stats.formBonus).toEqual({ arena: 0.55, style: 0.55 });
    expect(stats.weapon).toBe("Spada Lunga");
    expect(stats.experienceMultiplier).toBeCloseTo(1.3);
    expect(stats.arena).toBeCloseTo(52 * 1.55 * 1.3);
    expect(stats.style).toBeCloseTo(41 * 1.55 * 1.3);
  });
});

describe("secret legendary balancing", () => {
  it("uses the standards of 07/10 and the designer's tournament values as they are", () => {
    expect({
      academy: TOURNAMENT_DEFINITIONS.academy.standard,
      national: TOURNAMENT_DEFINITIONS.national.standard,
      champions: TOURNAMENT_DEFINITIONS.champions.standard,
    }).toEqual({ academy: 100, national: 200, champions: 400 });

    const initial = createTournamentSchool();
    const state = {
      ...initial,
      tournaments: { ...initial.tournaments, ordinaryVictoryAchieved: true },
    };
    const result = simulateTournament(state, "academy", 1, 421_000, getEligibleSchoolContacts(state)).result;
    const participant = result.participants.find((entry) => entry.secretLegendaryId)!;
    const id = participant.secretLegendaryId!;
    const profile = SECRET_LEGENDARIES[id];

    expect(profile.level).toBe("academy");
    expect([participant.arenaPreparation, participant.stylePreparation]).toEqual([...profile.tournament]);
    expect(participant.knownFormIds).toEqual(getSecretLegendaryForms(id));
    expect(participant.numericForms).toBe(4);
    expect(participant.schoolName).toBe(profile.school.name);
    // Ordinary NPCs: the average of the field is base × Forms × experience.
    const ordinaryNpcs = result.participants.filter(({ id: npcId }) => npcId.startsWith("npc-"));
    const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
    expect(mean(ordinaryNpcs.map((entry) => entry.arenaPreparation))).toBeCloseTo(TOURNAMENT_DEFINITIONS.academy.standard, 10);
    expect(mean(ordinaryNpcs.map((entry) => entry.stylePreparation))).toBeCloseTo(TOURNAMENT_DEFINITIONS.academy.standard, 10);
    for (const npc of ordinaryNpcs) {
      expect(npc.numericForms).toBe(4);
      const forms = getFormStatBonuses(getLevelForms("academy", "staff"));
      expect(npc.arenaPreparation).toBeCloseTo(getPreparation(npc.arenaBase, forms.arena, npc.experience));
    }
  });

  it("respects Arena, Style and complete Secret Legendary specialties", () => {
    expect(isSecretLegendaryDefeated("arena", true, false)).toBe(true);
    expect(isSecretLegendaryDefeated("arena", false, true)).toBe(false);
    expect(isSecretLegendaryDefeated("style", true, false)).toBe(false);
    expect(isSecretLegendaryDefeated("style", false, true)).toBe(true);
    expect(isSecretLegendaryDefeated("complete", true, false)).toBe(true);
    expect(isSecretLegendaryDefeated("complete", false, true)).toBe(true);
  });

  it("keeps specialists about 10% stronger in their discipline, the complete ones balanced", () => {
    for (const id of SECRET_LEGENDARY_IDS) {
      const { specialty, tournament: [arena, style], base } = getSecretLegendaryProfile(id);
      const ratio = arena / style;
      if (specialty === "arena") expect(ratio, id).toBeGreaterThan(1.08);
      if (specialty === "style") expect(ratio, id).toBeLessThan(1 / 1.08);
      if (specialty === "complete") expect(Math.abs(ratio - 1), id).toBeLessThanOrEqual(0.03);
      if (base && specialty !== "complete") expect(Math.sign(base[0] - base[1]), id).toBe(Math.sign(arena - style));
    }
  });

  it("puts every Legendary above the average of its tournament", () => {
    const standards = { academy: 100, national: 200, champions: 400, chronicles: 1_000 };
    for (const id of SECRET_LEGENDARY_IDS) {
      const { level, tournament: [arena, style] } = getSecretLegendaryProfile(id);
      expect((arena + style) / 2, id).toBeGreaterThan(standards[level] * 1.04);
    }
  });

  it("gives the Forms of the level: 4, 5, 6 and 7 numeric Forms", () => {
    expect(getLevelForms("academy", "staff")).toEqual(["form-1", "form-2", "course-y", "form-3-long", "form-4-long"]);
    expect(getLevelForms("national", "double")).toEqual([
      "form-1", "form-2", "course-y", "form-3-long", "form-4-long", "form-5-long", "form-3-double", "form-4-double",
    ]);
    expect(getLevelForms("champions", "staff")).toEqual([
      "form-1", "form-2", "course-y", "form-3-long", "form-4-long", "form-5-long",
      "form-3-staff", "form-4-staff", "form-5-staff", "form-3-double", "form-6",
    ]);
    expect(getLevelForms("chronicles", "staff")).toHaveLength(14);
    expect(getLevelForms("chronicles", "staff", true)).toContain("course-x");
    expect(getSecretLegendaryForms("sara-magnifico")).toContain("form-4-double");
    expect(getSecretLegendaryForms("pietro-scarica")).toContain("form-4-staff");
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
    expect(simulation.result.rewards).toEqual([
      expect.objectContaining({ discipline: "arena", position: 1 }),
      expect.objectContaining({ discipline: "style", position: 1 }),
    ]);
    expect(
      simulation.result.matches.every(
        (match) => {
          const wins = match.stage === "final" ? 3 : 2;
          return (match.arenaScoreA === wins) !== (match.arenaScoreB === wins);
        },
      ),
    ).toBe(true);
    for (const match of simulation.result.matches.filter((candidate) => candidate.assaults)) {
      expect(match.stage).toBe("final");
      expect(match.assaults!.split("a").length - 1).toBe(match.arenaScoreA);
      expect(match.assaults!.split("b").length - 1).toBe(match.arenaScoreB);
      expect(match.styleDetailA && match.styleDetailB).toBeTruthy();
    }
    expect(
      simulation.result.matches.every(
        (match) =>
          match.styleScoreA > 0 &&
          match.styleScoreA < 10 &&
          match.styleScoreB > 0 &&
          match.styleScoreB < 10,
      ),
    ).toBe(true);
  });

  it("expands qualification to six Arena and six distinct Style slots", () => {
    const state = createTournamentSchool(100);
    const simulation = simulateTournament(
      state,
      "school",
      1,
      181_000,
      getEligibleSchoolContacts(state),
    );
    const arenaQualifiers = simulation.result.qualifiers.filter(
      (entry) => entry.source === "arena",
    );
    const styleQualifiers = simulation.result.qualifiers.filter(
      (entry) => entry.source === "style",
    );

    expect(simulation.result.qualificationAllocation).toEqual({
      destinationLevel: "academy",
      activeMembers: 100,
      slotCount: 12,
    });
    expect(arenaQualifiers).toHaveLength(6);
    expect(styleQualifiers).toHaveLength(6);
    expect(new Set(simulation.result.qualifiers.map((entry) => entry.participantId)).size)
      .toBe(12);
    expect(styleQualifiers.every((entry) =>
      entry.repechage === (entry.rankingPosition > 6)
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
    expect(simulation.result.schoolPreliminary).toMatchObject({
      eligibleCount: 160,
    });
    expect(simulation.result.schoolPreliminary?.arenaSelectedContactIds).toHaveLength(32);
    expect(simulation.result.schoolPreliminary?.styleSelectedContactIds).toHaveLength(32);
    expect(new Set(simulation.result.schoolPreliminary?.selectedContactIds).size).toBe(64);
    expect(
      simulation.result.participants.every((participant) =>
        participant.knownFormIds?.includes("form-1"),
      ),
    ).toBe(true);
    expect([...standingsByGroup.values()].map((group) => group.length)).toEqual([
      8, 8, 8, 8, 8, 8, 8, 8,
    ]);
    expect(
      [...standingsByGroup.values()].every(
        (group) => group.filter((standing) => standing.qualified).length === 4,
      ),
    ).toBe(true);
    expect(qualifiedIds.size).toBe(32);
    expect(roundOf32Ids).toEqual(qualifiedIds);
    expect(simulation.result.matches.some((match) => match.stage === "round64")).toBe(false);
    expect(simulation.result.matches.length).toBeLessThanOrEqual(256);
  });

  it("selects 32 athletes through Arena and 32 distinct athletes through Style", () => {
    const initial = createTournamentSchool(80);
    const enrolledIds = initial.contacts
      .filter((contact) => contact.status === "enrolled")
      .map((contact) => contact.id);
    const state = {
      ...initial,
      contacts: initial.contacts.map((contact) => {
        const index = enrolledIds.indexOf(contact.id);
        if (index < 0) return contact;
        return index < 40
          ? { ...contact, arenaBase: 200 - index, styleBase: 1 }
          : { ...contact, arenaBase: 1, styleBase: 200 - (index - 40) };
      }),
    };
    const selection = selectSchoolTournamentEntrants(state);

    expect(selection.preliminary?.arenaSelectedContactIds).toEqual(enrolledIds.slice(0, 32));
    expect(selection.preliminary?.styleSelectedContactIds).toEqual(enrolledIds.slice(40, 72));
    expect(selection.selectedContacts).toHaveLength(64);
    expect(new Set(selection.selectedContacts.map((contact) => contact.id)).size).toBe(64);
  });

  it("uses Form and experience modifiers when choosing preliminary entrants", () => {
    const initial = createTournamentSchool(65);
    const enrolled = initial.contacts.filter((contact) => contact.status === "enrolled");
    const enhancedId = enrolled.at(-1)!.id;
    const state = {
      ...initial,
      contacts: initial.contacts.map((contact) =>
        contact.status !== "enrolled"
          ? contact
          : contact.id === enhancedId
            ? {
                ...contact,
                arenaBase: 70,
                styleBase: 70,
                tournamentExperience: 20,
                forms: [
                  "form-1" as const,
                  "form-2" as const,
                  "form-3-long" as const,
                  "form-4-long" as const,
                  "form-5-long" as const,
                  "form-6" as const,
                  "form-7" as const,
                ],
              }
            : { ...contact, arenaBase: 100, styleBase: 100 },
      ),
    };

    expect(
      selectSchoolTournamentEntrants(state).selectedContacts.map((contact) => contact.id),
    ).toContain(enhancedId);
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
    expect(
      simulation.result.participants
        .filter((entry) => !entry.ownedContactId)
        .every(
          (entry) => entry.schoolId && getTournamentSchool(entry.schoolId).level === "academy",
        ),
    ).toBe(true);
    expect(simulation.result.groupStandings.filter((entry) => entry.qualified)).toHaveLength(32);
  });

  it.each([
    { level: "academy" as const, standard: 100, qualifiers: 6 },
    { level: "academy" as const, standard: 100, qualifiers: 12 },
    { level: "national" as const, standard: 200, qualifiers: 6 },
    { level: "national" as const, standard: 200, qualifiers: 12 },
    { level: "champions" as const, standard: 400, qualifiers: 6 },
    { level: "champions" as const, standard: 400, qualifiers: 12 },
  ])(
    "normalizes $level NPCs to standard $standard with $qualifiers school qualifiers",
    ({ level, standard, qualifiers }) => {
      const state = withoutExternalSecretLegendaries(createTournamentSchool(qualifiers));
      const owned = getEligibleSchoolContacts(state).slice(0, qualifiers);
      const result = simulateTournament(state, level, 1, 421_000, owned).result;
      const npcs = result.participants.filter(({ id }) => id.startsWith("npc-"));
      const arenaAverage = npcs.reduce(
        (total, participant) => total + participant.arenaPreparation,
        0,
      ) / npcs.length;
      const styleAverage = npcs.reduce(
        (total, participant) => total + participant.stylePreparation,
        0,
      ) / npcs.length;

      expect(npcs).toHaveLength(64 - qualifiers);
      expect(arenaAverage).toBeCloseTo(standard, 10);
      expect(styleAverage).toBeCloseTo(standard, 10);
    },
  );

  it("uses 10% before the first ordinary victory and guarantees the first secret afterwards", () => {
    const initial = createTournamentSchool();
    const owned = getEligibleSchoolContacts(initial).slice(0, 6);
    const beforeVictoryCounts = Array.from({ length: 80 }, (_, index) => {
      const simulation = simulateTournament(
        { ...initial, randomSeed: index + 1 },
        "academy",
        1,
        421_000,
        owned,
      );
      return simulation.result.participants.filter(
        (participant) => participant.secretLegendaryId,
      ).length;
    });
    const victorious = {
      ...initial,
      tournaments: {
        ...initial.tournaments,
        ordinaryVictoryAchieved: true,
      },
    };
    const afterVictoryCounts = Array.from({ length: 80 }, (_, index) => {
      const simulation = simulateTournament(
        { ...victorious, randomSeed: index + 1 },
        "academy",
        2,
        422_000,
        owned,
      );
      return simulation.result.participants.filter(
        (participant) => participant.secretLegendaryId,
      ).length;
    });

    expect(beforeVictoryCounts).toContain(0);
    expect(beforeVictoryCounts.some((count) => count >= 1)).toBe(true);
    expect(beforeVictoryCounts.every((count) => count <= 2)).toBe(true);
    expect(afterVictoryCounts.every((count) => count >= 1 && count <= 2)).toBe(true);
    expect(afterVictoryCounts).toContain(2);
  });

  it("leaves qualified absences vacant instead of generating replacement opponents", () => {
    const state = createTournamentSchool();
    const eligible = getEligibleSchoolContacts(state);
    const vacantContactId = eligible[5].id;
    const simulation = simulateTournament(state, "academy", 1, 421_000, eligible.slice(0, 5), {
      vacantQualificationContactIds: [vacantContactId],
    });

    expect(simulation.result.participants).toHaveLength(63);
    expect(simulation.result.vacantQualificationContactIds).toEqual([vacantContactId]);
    expect(new Set(simulation.result.groupStandings.map((entry) => entry.groupIndex)).size).toBe(8);
  });

  it("awards the twelve external slots from the whole tournament ranking", () => {
    const state = createTournamentSchool(300);
    const owned = getEligibleSchoolContacts(state).slice(0, 12);
    const simulation = simulateTournament(state, "academy", 1, 421_000, owned);

    expect(simulation.result.qualificationAllocation?.slotCount).toBe(12);
    expect(simulation.result.qualifiers).toHaveLength(12);
    expect(simulation.result.qualifiers.some((entry) => !entry.ownedContactId)).toBe(true);
    expect(simulation.result.qualifiers.filter((entry) => entry.ownedContactId).length)
      .toBeLessThan(12);
  });
});

describe("tournament calendar and immunity", () => {
  it("runs the school tournament at the end of December", () => {
    const state = createTournamentSchool();
    const december = {
      ...state,
      school: {
        ...state.school,
        currentMonth: 12,
        nextFeeAt: 61_000,
      },
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
      school: {
        ...state.school,
        currentMonth: 12,
        nextFeeAt: 61_000,
        fame: GAME_CONFIG.tournamentUnlockMembers,
      },
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
    const immunity = getAthleteImmunityStatus(
      {
        currentMonth: processed.school.currentMonth,
        tournamentQualification: processed.tournaments.qualification,
      },
      athlete,
    );

    expect(processed.tournaments.results.at(-1)?.level).toBe("champions");
    expect(processed.tournaments.qualification).toBeUndefined();
    expect(processed.tournaments.immuneContactIds).toEqual([]);
    expect(immunity.reasons).toEqual([]);
  });
});

describe("Arena e Stile dalle Forme (06/10)", () => {
  const ALL_FORMS = FORM_DEFINITIONS.map((definition) => definition.id);

  it("gives +90% with every Form and +100% once Corso X counts", () => {
    expect(getFormStatBonuses(ALL_FORMS)).toEqual({ arena: 0.9, style: 0.9 });
    expect(getFormStatBonuses(ALL_FORMS, true)).toEqual({ arena: 1, style: 1 });
  });

  it("is worth 10 points per Form, split by weapon", () => {
    expect(getFormStatBonuses(["form-3-long"])).toEqual({ arena: 0.05, style: 0.05 });
    expect(getFormStatBonuses(["form-3-staff"])).toEqual({ arena: 0.075, style: 0.025 });
    expect(getFormStatBonuses(["form-3-double"])).toEqual({ arena: 0.025, style: 0.075 });
  });

  it("fights with the weapon of the deepest branch, then the preferred one", () => {
    expect(getAthleteWeapon(["form-1", "form-2"])).toBe("Spada Lunga");
    expect(getAthleteWeapon(["form-3-long", "form-3-staff", "form-4-staff"])).toBe("Staffa");
    expect(getAthleteWeapon(["form-3-long", "form-3-double"], ["Doppia spada corta"])).toBe("Doppia spada corta");
  });
});
