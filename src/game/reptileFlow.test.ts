import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../content/mastery";
import { addAdminMembers } from "./adminFlow";
import { createInitialState } from "./engine";
import {
  bookReptileVenue,
  calculateReptileMinigameModifier,
  getReptileTeamCount,
  processReptilePreparation,
  skipReptileMinigame,
  startReptilePreparation,
} from "./reptilePreparation";
import {
  skipReptilePresentation,
  startReptileTournamentIfDue,
} from "./reptileFlow";
import { unlockReptileFromTournamentResult } from "./reptileUnlock";
import type {
  Collaborator,
  GameState,
  ReptileSectorAssignments,
  TournamentResult,
} from "./types";

const STARTED_AT = 10_000;

function createCollaborator(
  id: string,
  assignment: Exclude<Collaborator["assignment"], null>,
): Collaborator {
  return {
    id,
    contactId: `contact-${id}`,
    displayName: id,
    joinedAt: STARTED_AT,
    forms: [],
    instructorForms: [],
    technicianForms: [],
    formBranchPreferences: [],
    assignment,
    mastery: createInitialCollaboratorMastery(),
    rarity: "ultra-rare",
  };
}

const ASSIGNMENTS: ReptileSectorAssignments = {
  social: ["social"],
  equipment: ["equipment"],
  gadget: ["gadget"],
  events: ["events"],
};

function createReptileReadyState(fameXp = 0): GameState {
  let state = createInitialState(STARTED_AT, "Manager");
  state = addAdminMembers(state, 8);
  state = {
    ...state,
    contacts: state.contacts.map((contact, index) => contact.status === "enrolled"
      ? {
          ...contact,
          forms: ["form-1"],
          arenaBase: 80 + index * 2,
          styleBase: 90 + index,
        }
      : contact),
    school: { ...state.school, currentMonth: 7, euros: 20_000 },
    collaborators: [
      createCollaborator("social", "writing"),
      createCollaborator("equipment", "equipment"),
      createCollaborator("gadget", "gadget"),
      createCollaborator("events", "events"),
    ],
    tournaments: {
      ...state.tournaments,
      reptile: { ...state.tournaments.reptile, unlocked: true, fameXp },
    },
  };
  state = startReptilePreparation(state, ASSIGNMENTS, STARTED_AT);
  state = skipReptileMinigame(state, STARTED_AT);
  return processReptilePreparation(state, STARTED_AT + 1_000_000_000);
}

describe("Torneo Reptile", () => {
  it("si sblocca soltanto vincendo Arena e Stile nello stesso Nazionale", () => {
    const state = createInitialState(STARTED_AT, "Manager");
    const national = {
      level: "national",
      participants: [
        { id: "arena", ownedContactId: "home-a" },
        { id: "style", ownedContactId: "home-b" },
      ],
      arenaRanking: ["arena"],
      styleRanking: ["style"],
    } as TournamentResult;
    const unlocked = unlockReptileFromTournamentResult(state, national, STARTED_AT);
    expect(unlocked.tournaments.reptile.unlocked).toBe(true);

    const splitVictory = unlockReptileFromTournamentResult(state, {
      ...national,
      participants: [
        national.participants[0],
        { ...national.participants[1], ownedContactId: undefined },
      ],
    }, STARTED_AT);
    expect(splitVictory).toBe(state);
  });

  it("usa i cap confermati per il mini-gioco e le potenze di due della fama", () => {
    expect(calculateReptileMinigameModifier(50, 0, 0)).toBe(50);
    expect(calculateReptileMinigameModifier(0, 50, 0)).toBe(-25);
    expect(calculateReptileMinigameModifier(0, 50, 100)).toBe(-50);
    expect(calculateReptileMinigameModifier(17, 33, 0)).toBe(0.5);
    expect([0, 499, 500, 1_000, 1_500, 2_000, 2_500, 3_000].map(getReptileTeamCount))
      .toEqual([16, 16, 32, 64, 128, 256, 512, 512]);
  });

  it("blocca il lavoro ordinario, fotografa la qualità e ripristina gli incarichi", () => {
    const ready = createReptileReadyState();
    const edition = ready.tournaments.reptile.activeEdition!;
    expect(edition.status).toBe("ready");
    expect(edition.sectors?.equipment.quality).toBeGreaterThan(0);
    expect(edition.sectors?.equipment.quality).toBeLessThanOrEqual(100);
    expect(ready.collaborators.map((collaborator) => collaborator.assignment))
      .toEqual(["writing", "equipment", "gadget", "events"]);
  });

  it("genera una fase svizzera senza rematch, top 16 e podio completo", () => {
    const ready = createReptileReadyState();
    const booked = bookReptileVenue(ready, STARTED_AT + 1_000_000_001);
    const presenting = startReptileTournamentIfDue(booked, STARTED_AT + 1_000_000_001);
    const result = presenting.tournaments.reptile.activeEdition?.result;
    expect(result).toBeDefined();
    expect(result?.teamCount).toBe(16);
    expect(result?.swissRounds).toBe(5);
    expect(result?.top16TeamIds).toHaveLength(16);
    expect(new Set(result?.podiumTeamIds).size).toBe(4);
    const swiss = result!.matches.filter((match) => match.phase === "swiss");
    expect(swiss).toHaveLength(40);
    expect(new Set(swiss.map((match) => [match.teamAId, match.teamBId].sort().join("|"))).size)
      .toBe(swiss.length);
    expect(swiss.every((match) => Math.max(match.scoreA, match.scoreB) === 3)).toBe(true);
  });

  it("applica costi e ricompense una volta sola quando si chiude la presentazione", () => {
    const ready = createReptileReadyState();
    const booked = bookReptileVenue(ready, STARTED_AT + 1_000_000_001);
    const presenting = startReptileTournamentIfDue(booked, STARTED_AT + 1_000_000_001);
    const result = presenting.tournaments.reptile.activeEdition!.result!;
    const completed = skipReptilePresentation(presenting, STARTED_AT + 1_000_000_002);
    expect(completed.tournaments.reptile.activeEdition).toBeUndefined();
    expect(completed.tournaments.reptile.latestRecap?.rewardsApplied).toBe(true);
    expect(completed.tournaments.reptile.hall).toHaveLength(1);
    expect(completed.school.euros).toBe(
      20_000 - result.economy.venueCost + result.economy.gadgetGross - result.economy.rentalCost,
    );
    expect(completed.school.followers).toBe(result.economy.followersGained);
    expect(completed.equipment.damagedSwords).toBeGreaterThan(0);
    expect(completed.statistics.eventsCompleted).toBe(
      presenting.statistics.eventsCompleted + 1,
    );

    const secondAttempt = skipReptilePresentation(completed, STARTED_AT + 1_000_000_003);
    expect(secondAttempt).toBe(completed);
  });

  it("diventa per sempre il Torneo della Superba al livello 2 di fama", () => {
    const presenting = startReptileTournamentIfDue(
      bookReptileVenue(createReptileReadyState(), STARTED_AT + 1_000_000_001),
      STARTED_AT + 1_000_000_001,
    );
    const edition = presenting.tournaments.reptile.activeEdition!;
    const famous = {
      ...presenting,
      tournaments: {
        ...presenting.tournaments,
        reptile: {
          ...presenting.tournaments.reptile,
          activeEdition: {
            ...edition,
            result: { ...edition.result!, economy: { ...edition.result!.economy, fameAfter: 1_000 } },
          },
        },
      },
    };
    const completed = skipReptilePresentation(famous, STARTED_AT + 1_000_000_002);
    expect(completed.network.superbaTournament).toBe(true);
    expect(completed.messages.some((message) => message.subject === "Nasce il Torneo della Superba")).toBe(true);
    expect(completed.secretUpgradeDiscoveries).toEqual([]);
  });

  it("vincere la Superba scopre Corso X e lo segna nell'albo", () => {
    const ready = createReptileReadyState();
    const superba = { ...ready, network: { ...ready.network, superbaTournament: true } };
    const presenting = startReptileTournamentIfDue(
      bookReptileVenue(superba, STARTED_AT + 1_000_000_001),
      STARTED_AT + 1_000_000_001,
    );
    const edition = presenting.tournaments.reptile.activeEdition!;
    const result = edition.result!;
    expect(result.superba).toBe(true);
    const homeTeam = result.teams.find((team) => team.home)!;
    const won = {
      ...presenting,
      tournaments: {
        ...presenting.tournaments,
        reptile: {
          ...presenting.tournaments.reptile,
          activeEdition: {
            ...edition,
            result: { ...result, podiumTeamIds: [homeTeam.id, ...result.podiumTeamIds.filter((id) => id !== homeTeam.id)].slice(0, 4) as typeof result.podiumTeamIds },
          },
        },
      },
    };
    const completed = skipReptilePresentation(won, STARTED_AT + 1_000_000_002);
    expect(completed.secretUpgradeDiscoveries).toContain("project-x");
    expect(completed.tournaments.reptile.hall.at(-1)?.superba).toBe(true);
    expect(completed.messages.some((message) => message.subject === "Torneo della Superba completato")).toBe(true);
  });

  it("scala fino a 512 team mantenendo nove turni svizzeri", () => {
    const ready = createReptileReadyState(2_500);
    const booked = bookReptileVenue(ready, STARTED_AT + 1_000_000_001);
    const presenting = startReptileTournamentIfDue(booked, STARTED_AT + 1_000_000_001);
    const result = presenting.tournaments.reptile.activeEdition?.result;
    expect(result?.teamCount).toBe(512);
    expect(result?.swissRounds).toBe(9);
    expect(result?.matches.filter((match) => match.phase === "swiss")).toHaveLength(2_304);
  });
});
