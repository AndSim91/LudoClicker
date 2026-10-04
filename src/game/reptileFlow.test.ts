import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../content/mastery";
import { addAdminMembers } from "./adminFlow";
import { GAME_CONFIG } from "./config";
import { createInitialState } from "./engine";
import {
  REPTILE_BASE_LOADS,
  calculateReptileMinigameBonus,
  cancelReptile,
  completeReptileMinigame,
  getReptileBarQuality,
  getReptileBarRates,
  getReptileTeamCount,
  organizeReptile,
  processReptilePreparation,
  startReptileMinigame,
} from "./reptilePreparation";
import { getReptileOrdinaryShare } from "./reptileSectors";
import { getReptileResa } from "./reptileSimulation";
import {
  applyReptileResult,
  holdReptileTournamentIfDue,
  processReptileCalendarTransition,
} from "./reptileFlow";
import { simulateReptileTournament } from "./reptileSimulation";
import { freezeGameState } from "./offline";
import { unlockReptileFromTournamentResult } from "./reptileUnlock";
import type { Collaborator, GameState, TournamentResult } from "./types";

const STARTED_AT = 10_000;
const MONTH = GAME_CONFIG.gameMonthMs;
const SEPTEMBER = 9;
const JULY = 19;

function createCollaborator(
  id: string,
  assignment: Collaborator["assignment"],
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

function createOrganizedState(fameXp = 0, collaborators?: Collaborator[]): GameState {
  let state = createInitialState(STARTED_AT, "Manager");
  state = addAdminMembers(state, 8);
  state = {
    ...state,
    contacts: state.contacts.map((contact, index) => contact.status === "enrolled"
      ? { ...contact, forms: ["form-1"], arenaBase: 80 + index * 2, styleBase: 90 + index }
      : contact),
    school: { ...state.school, currentMonth: SEPTEMBER, euros: 20_000 },
    equipment: { ...state.equipment, totalSwords: 40, availableSwords: 40 },
    collaborators: collaborators ?? [
      createCollaborator("social", "writing"),
      createCollaborator("events", "events"),
      createCollaborator("equipment", "equipment"),
      createCollaborator("instructor", "instructor"),
    ],
    tournaments: {
      ...state.tournaments,
      reptile: { ...state.tournaments.reptile, unlocked: true, fameXp },
    },
  };
  return organizeReptile(state, STARTED_AT);
}

function fillAndReachJuly(state: GameState): GameState {
  const filled = processReptilePreparation(state, STARTED_AT + 10_000 * MONTH);
  return { ...filled, school: { ...filled.school, currentMonth: JULY } };
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
    expect(unlockReptileFromTournamentResult(state, national, STARTED_AT).tournaments.reptile.unlocked)
      .toBe(true);
    const splitVictory = unlockReptileFromTournamentResult(state, {
      ...national,
      participants: [national.participants[0], { ...national.participants[1], ownedContactId: undefined }],
    }, STARTED_AT);
    expect(splitVictory).toBe(state);
  });

  it("raddoppia le squadre a ogni livello di fama e premia il minigioco fino a +25%", () => {
    expect([0, 499, 500, 1_000, 1_500, 2_000, 2_500, 3_000].map(getReptileTeamCount))
      .toEqual([16, 16, 32, 64, 128, 256, 512, 512]);
    expect(calculateReptileMinigameBonus(0, 40)).toBe(0);
    expect(calculateReptileMinigameBonus(15, 40)).toBe(10);
    expect(calculateReptileMinigameBonus(30, 40)).toBe(21);
    expect(calculateReptileMinigameBonus(36, 40)).toBe(25);
    expect(calculateReptileMinigameBonus(200, 40)).toBe(25);
    expect(calculateReptileMinigameBonus(10, 0)).toBe(0);
  });

  it("organizza pagando il palazzetto, una barra per settore, annulla con metà rimborso", () => {
    const organized = createOrganizedState();
    const edition = organized.tournaments.reptile.activeEdition!;
    expect(organized.school.euros).toBe(10_000);
    expect(Object.keys(edition.bars).sort()).toEqual(["equipment", "events", "instructors", "social"]);
    expect(edition.bars.social?.required).toBe(REPTILE_BASE_LOADS.social);
    expect(organizeReptile(organized, STARTED_AT)).toBe(organized);
    const cancelled = cancelReptile(organized);
    expect(cancelled.tournaments.reptile.activeEdition).toBeUndefined();
    expect(cancelled.school.euros).toBe(15_000);

    const withGadget = organizeReptile({
      ...cancelled,
      unlocks: { ...cancelled.unlocks, gadget: true },
    }, STARTED_AT);
    expect(withGadget.tournaments.reptile.activeEdition!.bars.gadget).toBeDefined();
  });

  it("riempie le barre con metà della forza, chi è fermo dà tutto, senza nessuno la barra resta ferma", () => {
    const organized = createOrganizedState(0, [
      createCollaborator("social", "writing"),
      createCollaborator("events", "events"),
      createCollaborator("free", null),
    ]);
    const rates = getReptileBarRates(organized);
    // Events with nothing running is idle: all of it to the bar.
    expect(rates.events?.idle).toBe(1);
    expect(rates.equipment?.rate).toBe(0);
    expect(rates.instructors?.rate).toBe(0);
    const later = processReptilePreparation(organized, STARTED_AT + 2 * MONTH);
    const bars = later.tournaments.reptile.activeEdition!.bars;
    expect(bars.social!.progress).toBeGreaterThan(0);
    expect(bars.events!.progress).toBeGreaterThan(0);
    expect(bars.equipment!.progress).toBe(0);
    expect(bars.instructors!.progress).toBe(0);
    // The one without a sector helps a staffed bar at half value, never an empty one.
    const helped = (["social", "events"] as const).find((sector) => (rates[sector]?.helpers ?? 0) > 0);
    expect(helped).toBeDefined();

    expect(getReptileOrdinaryShare(later, "writing")).toBe(0.5);
    const full = processReptilePreparation(later, STARTED_AT + 10_000 * MONTH);
    expect(full.tournaments.reptile.activeEdition!.bars.social!.completedAfterMs).toBeDefined();
    expect(getReptileOrdinaryShare(full, "writing")).toBe(1);
    expect(full.tournaments.reptile.activeEdition!.bars.equipment!.completedAfterMs).toBeUndefined();
  });

  it("a gioco chiuso le barre restano ferme (6.26)", () => {
    const organized = createOrganizedState();
    const reopened = freezeGameState(organized, STARTED_AT + 5 * MONTH, 5 * MONTH);
    const after = processReptilePreparation(reopened, STARTED_AT + 5 * MONTH);
    expect(after.tournaments.reptile.activeEdition!.bars.social!.progress).toBe(0);
    expect(after.tournaments.reptile.activeEdition!.elapsedMs).toBe(0);
  });

  it("misura la qualità dalla velocità: 3 mesi fanno 100, 6 mesi 50", () => {
    expect(getReptileBarQuality({ progress: 1, required: 1, completedAfterMs: 3 * MONTH })).toBe(100);
    expect(getReptileBarQuality({ progress: 1, required: 1, completedAfterMs: MONTH })).toBe(100);
    expect(getReptileBarQuality({ progress: 1, required: 1, completedAfterMs: 6 * MONTH })).toBe(50);
    expect(getReptileBarQuality({ progress: 0.5, required: 1 })).toBe(0);
  });

  it("si gioca solo a luglio a barre piene, applica tutto subito e una volta per luglio", () => {
    const organized = createOrganizedState();
    const notJuly = holdReptileTournamentIfDue(
      processReptilePreparation(organized, STARTED_AT + 10_000 * MONTH),
      STARTED_AT,
    );
    expect(notJuly.tournaments.reptile.activeEdition).toBeDefined();
    const early = holdReptileTournamentIfDue(
      { ...organized, school: { ...organized.school, currentMonth: JULY } },
      STARTED_AT,
    );
    expect(early.tournaments.reptile.activeEdition).toBeDefined();

    const july = fillAndReachJuly(organized);
    const done = holdReptileTournamentIfDue(july, STARTED_AT + 1);
    const reptile = done.tournaments.reptile;
    const result = reptile.latestRecap!;
    expect(reptile.activeEdition).toBeUndefined();
    expect(reptile.unseenRecap).toBe(true);
    expect(reptile.lastTournamentMonth).toBe(JULY);
    expect(reptile.hall).toHaveLength(1);
    expect(done.school.euros).toBe(july.school.euros + result.economy.gadgetGross);
    expect(done.school.followers).toBe(july.school.followers + result.economy.followersGained);
    expect(done.statistics.eventsCompleted).toBe(july.statistics.eventsCompleted + 1);
    expect(result.swissRounds).toBe(5);
    expect(new Set(result.podiumTeamIds).size).toBe(4);
    const swiss = result.matches.filter((match) => match.phase === "swiss");
    expect(swiss).toHaveLength(40);
    expect(new Set(swiss.map((match) => [match.teamAId, match.teamBId].sort().join("|"))).size)
      .toBe(swiss.length);

    // Organized again in the same July: it waits for the next one.
    const again = fillAndReachJuly(organizeReptile({ ...done, school: { ...done.school, euros: 20_000 } }, STARTED_AT));
    expect(holdReptileTournamentIfDue(again, STARTED_AT + 2).tournaments.reptile.activeEdition).toBeDefined();
    const nextJuly = { ...again, school: { ...again.school, currentMonth: JULY + 12 } };
    expect(holdReptileTournamentIfDue(nextJuly, STARTED_AT + 3).tournaments.reptile.activeEdition).toBeUndefined();
  });

  it("un solo tentativo di minigioco, che alza la resa ma non oltre 100", () => {
    const organized = createOrganizedState();
    const running = startReptileMinigame(organized, STARTED_AT);
    expect(startReptileMinigame(running, STARTED_AT)).toBe(running);
    const played = completeReptileMinigame(running, 36, 40);
    expect(played.tournaments.reptile.activeEdition!.minigame).toMatchObject({ status: "completed", bonusPercent: 25 });
    expect(startReptileMinigame(played, STARTED_AT)).toBe(played);
    expect(completeReptileMinigame(played, 40, 40)).toBe(played);

    const slow = processReptilePreparation(played, STARTED_AT + 10_000 * MONTH);
    const base = getReptileResa(fillAndReachJuly(organized))!;
    const boosted = getReptileResa(slow)!;
    expect(boosted.minigameBonusPercent).toBe(25);
    expect(boosted.resa).toBeCloseTo(Math.min(100, base.baseResa * 1.25));
  });

  it("ogni spada libera che manca abbassa la resa, fino a metà", () => {
    const july = fillAndReachJuly(createOrganizedState());
    const enough = getReptileResa(july)!;
    expect(enough.missingSwords).toBe(0);
    const fewer = getReptileResa({ ...july, equipment: { ...july.equipment, availableSwords: 16 } })!;
    expect(fewer.missingSwords).toBe(16);
    expect(fewer.resa).toBeCloseTo(enough.resa * 0.75);
    const none = getReptileResa({ ...july, equipment: { ...july.equipment, availableSwords: 0 } })!;
    expect(none.resa).toBeCloseTo(enough.resa * 0.5);
  });

  it("ricorda a giugno la giornata degli imprevisti, una volta", () => {
    const organized = createOrganizedState();
    const june = { ...organized, school: { ...organized.school, currentMonth: 18 } };
    const reminded = processReptileCalendarTransition(june, STARTED_AT);
    expect(reminded.messages.filter((message) => message.subject === "La giornata degli imprevisti aspetta"))
      .toHaveLength(1);
    expect(processReptileCalendarTransition(reminded, STARTED_AT)).toBe(reminded);
  });

  it("diventa per sempre il Torneo della Superba al livello 2 di fama", () => {
    const july = fillAndReachJuly(createOrganizedState());
    const { result } = simulateReptileTournament(july, STARTED_AT)!;
    const completed = applyReptileResult(july, {
      ...result,
      economy: { ...result.economy, fameAfter: 1_000 },
    }, STARTED_AT);
    expect(completed.network.superbaTournament).toBe(true);
    expect(completed.messages.some((message) => message.subject === "Nasce il Torneo della Superba!")).toBe(true);
  });

  it("vincere la Superba scopre Corso X e lo segna nell'albo", () => {
    const july = fillAndReachJuly(createOrganizedState());
    const superba = { ...july, network: { ...july.network, superbaTournament: true } };
    const { result } = simulateReptileTournament(superba, STARTED_AT)!;
    expect(result.superba).toBe(true);
    const homeTeam = result.teams.find((team) => team.home)!;
    const completed = applyReptileResult(superba, {
      ...result,
      podiumTeamIds: [homeTeam.id, ...result.podiumTeamIds.filter((id) => id !== homeTeam.id)]
        .slice(0, 4) as typeof result.podiumTeamIds,
    }, STARTED_AT);
    expect(completed.secretUpgradeDiscoveries).toContain("project-x");
    expect(completed.tournaments.reptile.hall.at(-1)?.superba).toBe(true);
  });

  it("scala fino a 512 squadre con nove turni svizzeri", () => {
    const july = fillAndReachJuly(createOrganizedState(2_500));
    const { result } = simulateReptileTournament(july, STARTED_AT)!;
    expect(result.teamCount).toBe(512);
    expect(result.swissRounds).toBe(9);
    expect(result.matches.filter((match) => match.phase === "swiss")).toHaveLength(2_304);
  });
});
