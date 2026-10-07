import { describe, expect, it } from "vitest";
import type { StyleSheet, TournamentMatch, TournamentParticipant } from "../../game/types";
import { getDuelScript, seededRoll } from "./finalDuel";
import { applyEvent, buildTimeline, endView, startView } from "./finalDuelTimeline";

const athlete = (id: string, owned: boolean): TournamentParticipant => ({
  id,
  ...(owned ? { ownedContactId: `contact-${id}` } : {}),
  firstName: id,
  lastName: "Prova",
  schoolName: "Ordine delle Onde",
  city: "Genova",
  rarity: "rare",
  numericForms: 5,
  knownFormIds: ["form-1", "form-2", "form-3-long", "form-4-long", "form-5-long"],
  experience: 3,
  arenaBase: 300,
  styleBase: 300,
  arenaPreparation: 1_000,
  stylePreparation: 1_000,
  condition: 1,
});

const sheetsA: StyleSheet[] = [[2, 2.5, 2, 1, 1, 2.5, 0, 1, 0], [2, 3, 2, 1, 1, 2, 0, 2, 0]];
const sheetsB: StyleSheet[] = [[1.5, 1.5, 2, 0, 0, 1.5, 0, 0, 1], [2, 1.5, 1.5, 0, 0, 1.5, 0, 1, 1]];

const match: TournamentMatch = {
  id: "match-final-0-99",
  stage: "final",
  participantAId: "a",
  participantBId: "b",
  arenaScoreA: 3,
  arenaScoreB: 2,
  styleScoreA: 7.2,
  styleScoreB: 6.1,
  styleDetailA: { sheets: sheetsA, technique: "Cruna dell'Ago", highlight: "Sync" },
  styleDetailB: { sheets: sheetsB },
  stylePenaltyB: "cura",
  assaults: "babaa",
  winnerId: "a",
};
const final = { match, a: athlete("a", true), b: athlete("b", false) };

describe("Guarda la finale: copione e regia", () => {
  it("puts COM and SAPD on assaults won by whoever performs them, with the Form", () => {
    const script = getDuelScript(final);
    expect(script.assaults.map((assault) => assault.winner).join("")).toBe("babaa");
    const moments = script.assaults.filter((assault) => assault.moment);
    expect(moments).toHaveLength(2);
    expect(moments.every((assault) => assault.winner === "a")).toBe(true);
    expect(moments.map((assault) => assault.moment)).toEqual(expect.arrayContaining([
      { kind: "COM", name: "Cruna dell'Ago", form: "Forma 3 Spada Lunga" },
      { kind: "SAPD", name: "Sync", form: "Forma 3 Spada Lunga" },
    ]));
    // One Style card per athlete, at the end of the bout.
    expect(script.penalties).toEqual([{ side: "b", reason: "cura", count: 1, assault: 4 }]);
    expect(getDuelScript(final)).toEqual(script);
  });

  it("fits in 30 seconds and ends on the real sheets and score", () => {
    const script = getDuelScript(final);
    const sheets = { a: sheetsA, b: sheetsB };
    const { events, durationMs } = buildTimeline(script, sheets, seededRoll("test"));
    expect(durationMs).toBeLessThanOrEqual(30_000);
    expect(events.filter((event) => event.type === "point")).toHaveLength(5);
    for (const event of events) {
      if (event.type !== "mark") continue;
      const goal = sheets[event.side][event.judge][event.row];
      expect(event.value).toBeLessThanOrEqual(goal + 0.5);
    }
    const beforeEnd = events.filter((event) => event.type !== "end").reduce(applyEvent, startView(sheets));
    expect(beforeEnd.score).toEqual({ a: 3, b: 2 });
    expect(beforeEnd.penalty).toEqual({ a: 0, b: 1 });
    const last = events.reduce(applyEvent, startView(sheets));
    const ended = endView(script, sheets);
    expect(last.sheets).toEqual(ended.sheets);
    expect(last.score).toEqual(ended.score);
    expect(last.history).toEqual(ended.history);
    expect(last.done).toBe(true);
    // The winner celebrates, the loser takes it badly.
    expect(last.poses.a.body).toMatch(/^win-/);
    expect(last.poses.b.body).toMatch(/^lose-/);
    expect(endView(script, sheets).poses).toEqual(last.poses);
  });

  it("shows a Disarmo: the sword falls, the athlete takes the cut empty-handed, then picks it up", () => {
    const disarming = getDuelScript({ ...final, match: { ...match, styleDetailA: { sheets: sheetsA, highlight: "Disarmo" } } });
    const assault = disarming.assaults.findIndex((candidate) => candidate.moment?.name === "Disarmo");
    expect(disarming.assaults[assault]).toMatchObject({ winner: "a", moment: { kind: "SAPD", name: "Disarmo", form: undefined } });
    const { events, durationMs } = buildTimeline(disarming, { a: sheetsA, b: sheetsB }, seededRoll("disarm"));
    expect(durationMs).toBeLessThanOrEqual(30_000);
    const drop = events.find((event) => event.type === "drop")!;
    const pickup = events.find((event) => event.type === "pickup")!;
    const oh = events.filter((event) => event.type === "pose" && event.side === "b" && event.pose.declare);
    const ohAfterDrop = oh.find((event) => event.t > drop.t && event.t < pickup.t);
    expect(ohAfterDrop?.type === "pose" && ohAfterDrop.pose.unarmed).toBe(true);
    const fallen = events.filter((event) => event.t <= drop.t + 900).reduce(applyEvent, startView({ a: sheetsA, b: sheetsB }));
    expect(fallen.dropped?.side).toBe("b");
    expect(events.reduce(applyEvent, startView({ a: sheetsA, b: sheetsB })).dropped).toBeUndefined();
  });
});
