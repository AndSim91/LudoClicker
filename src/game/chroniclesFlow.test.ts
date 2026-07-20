import { describe, expect, it } from "vitest";
import {
  SECRET_LEGENDARIES,
  getChroniclesLegendaryIds,
} from "../content/secretLegendaries";
import { addAdminMembers } from "./adminFlow";
import {
  createChroniclesVictoryChallenge,
  playChroniclesHand,
} from "./chroniclesFlow";
import { GAME_CONFIG } from "./config";
import { createInitialState } from "./initialState";
import { nextRandom } from "./random";
import {
  didSchoolEarnChroniclesKey,
  startChroniclesTournament,
} from "./tournamentFlow";
import {
  getEligibleSchoolContacts,
  simulateTournament,
} from "./tournamentSimulation";
import type {
  GameState,
  RockPaperScissorsChoice,
  TournamentResult,
} from "./types";

const CHOICES: readonly RockPaperScissorsChoice[] = ["rock", "paper", "scissors"];

function teamState(): GameState {
  const initial = addAdminMembers(createInitialState(1_000, "Manager"), 6);
  return {
    ...initial,
    contacts: initial.contacts.map((contact) => contact.status === "enrolled"
      ? { ...contact, forms: ["form-1" as const] }
      : contact),
  };
}

function ownedFirst(
  result: TournamentResult,
  arena: boolean,
  style: boolean,
): TournamentResult {
  const owned = result.participants.find((participant) => participant.ownedContactId)!;
  const external = result.participants.find((participant) => !participant.ownedContactId)!;
  const moveFirst = (ranking: string[], id: string) => [id, ...ranking.filter((entry) => entry !== id)];
  return {
    ...result,
    arenaRanking: moveFirst(result.arenaRanking, arena ? owned.id : external.id),
    styleRanking: moveFirst(result.styleRanking, style ? owned.id : external.id),
  };
}

function counterChoice(seed: number, shouldWin: boolean): RockPaperScissorsChoice {
  const legendary = CHOICES[Math.floor(nextRandom(seed)[0] * CHOICES.length)];
  const winning: Record<RockPaperScissorsChoice, RockPaperScissorsChoice> = {
    rock: "paper",
    paper: "scissors",
    scissors: "rock",
  };
  const losing: Record<RockPaperScissorsChoice, RockPaperScissorsChoice> = {
    rock: "scissors",
    paper: "rock",
    scissors: "paper",
  };
  return shouldWin ? winning[legendary] : losing[legendary];
}

function playDecisiveMatch(state: GameState, shouldWin: boolean): GameState {
  let next = state;
  for (let hand = 0; hand < 2; hand += 1) {
    next = playChroniclesHand(next, counterChoice(next.randomSeed, shouldWin), 20_000 + hand);
  }
  return next;
}

describe("Chronicles tournament", () => {
  it("fields every available schoolless Legendary and keeps their average 20% above NPCs", () => {
    const state = teamState();
    const simulation = simulateTournament(
      state,
      "chronicles",
      1,
      10_000,
      getEligibleSchoolContacts(state),
    );
    const secrets = simulation.result.participants.filter(
      (participant) => participant.secretLegendaryId,
    );
    const generated = simulation.result.participants.filter(
      (participant) => !participant.ownedContactId && !participant.secretLegendaryId,
    );
    const average = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;

    expect(simulation.result.participants).toHaveLength(64);
    expect(secrets.map((participant) => participant.secretLegendaryId).sort())
      .toEqual([...getChroniclesLegendaryIds()].sort());
    expect(average(secrets.map((participant) => participant.arenaPreparation))).toBe(1_200);
    expect(average(secrets.map((participant) => participant.stylePreparation))).toBeCloseTo(1_199.714, 3);
    expect(average(generated.map((participant) => participant.arenaPreparation)))
      .toBeGreaterThan(950);
    expect(average(generated.map((participant) => participant.arenaPreparation)))
      .toBeLessThan(1_050);
    expect(simulation.result.secretLegendaryDefeatedIds).toEqual([]);
    expect(secrets.find((participant) => participant.secretLegendaryId === "francesco-d-addosio"))
      .toMatchObject({ arenaPreparation: 1_200, stylePreparation: 1_200 });
  });

  it("removes a recruited unique Legendary from later fields", () => {
    const initial = teamState();
    const state = {
      ...initial,
      network: {
        ...initial.network,
        secretLegendaries: {
          ...initial.network.secretLegendaries,
          "enrico-giovanetti": {
            ...initial.network.secretLegendaries["enrico-giovanetti"],
            status: "enrolled" as const,
          },
        },
      },
    };
    const result = simulateTournament(
      state,
      "chronicles",
      1,
      10_000,
      getEligibleSchoolContacts(state),
    ).result;

    expect(result.participants.some(
      (participant) => participant.secretLegendaryId === "enrico-giovanetti",
    )).toBe(false);
  });

  it("consumes one key only for a valid manually selected team of six", () => {
    const initial = teamState();
    const state = {
      ...initial,
      tournaments: {
        ...initial.tournaments,
        chronicles: { unlocked: true, keys: 1 },
      },
    };
    const ids = getEligibleSchoolContacts(state).map((contact) => contact.id);

    expect(startChroniclesTournament(state, ids.slice(0, 5), 10_000)).toBe(state);
    const started = startChroniclesTournament(state, ids, 10_000);
    expect(started.tournaments.chronicles.keys).toBe(0);
    expect(started.tournaments.results.at(-1)?.level).toBe("chronicles");
  });

  it("awards a key only when the same Champion's edition is won in both disciplines", () => {
    const state = teamState();
    const base = simulateTournament(state, "champions", 1, 10_000, getEligibleSchoolContacts(state)).result;

    expect(didSchoolEarnChroniclesKey(ownedFirst(base, true, true))).toBe(true);
    expect(didSchoolEarnChroniclesKey(ownedFirst(base, true, false))).toBe(false);
  });
});

describe("Chronicles Legendary challenge", () => {
  function challengeState(arena: boolean, style: boolean) {
    const state = teamState();
    const result = ownedFirst(
      simulateTournament(state, "chronicles", 1, 10_000, getEligibleSchoolContacts(state)).result,
      arena,
      style,
    );
    return createChroniclesVictoryChallenge(state, result, 10_000);
  }

  it("starts from the weakest available Legendary and retries it with the second title", () => {
    const challenged = challengeState(true, true);
    expect(challenged.tournaments.chronicles.activeChallenge).toMatchObject({
      legendaryId: "enrico-giovanetti",
      discipline: "arena",
      queuedDisciplines: ["style"],
    });

    const retried = playDecisiveMatch(challenged, false);
    expect(retried.tournaments.chronicles.activeChallenge).toMatchObject({
      legendaryId: "enrico-giovanetti",
      discipline: "style",
      queuedDisciplines: [],
      playerWins: 0,
      legendaryWins: 0,
      hands: [],
    });
  });

  it("recruits permanently, grants 500 bonus Fame and moves the second attempt forward", () => {
    const challenged = challengeState(true, true);
    const originalFame = challenged.school.historicMembers;
    const won = playDecisiveMatch(challenged, true);
    const contact = won.contacts.find(
      (candidate) => candidate.secretLegendaryId === "enrico-giovanetti",
    );

    expect(contact?.status).toBe("enrolled");
    expect(won.collaborators.some((collaborator) => collaborator.contactId === contact?.id)).toBe(true);
    expect(won.network.secretLegendaries["enrico-giovanetti"].status).toBe("enrolled");
    expect(won.school.historicMembers).toBe(
      originalFame + GAME_CONFIG.chroniclesLegendaryFameReward + 1,
    );
    expect(won.tournaments.chronicles.activeChallenge).toMatchObject({
      legendaryId: "antonio-rocchitelli",
      discipline: "style",
    });
    expect(SECRET_LEGENDARIES["antonio-rocchitelli"].arenaBase).toBe(1_080);
  });

  it("ends a single-title attempt on loss and offers the same Legendary next time", () => {
    const challenged = challengeState(true, false);
    const lost = playDecisiveMatch(challenged, false);
    expect(lost.tournaments.chronicles.activeChallenge).toBeUndefined();

    const next = challengeState(true, false);
    expect(next.tournaments.chronicles.activeChallenge?.legendaryId)
      .toBe("enrico-giovanetti");
  });
});
