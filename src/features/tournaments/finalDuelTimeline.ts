import type { StyleSheet } from "../../game/types";
import {
  addExchanges,
  applyBoutEvent,
  decisive,
  decisiveMs,
  disarm,
  type AddBoutEvent,
  type BoutEffect,
  type BoutEvent,
  type DistributiveOmit,
  type DroppedSaber,
  type FighterPose,
} from "../arena/boutChoreography";
import type { DuelScript, DuelSide } from "./finalDuel";

export type { DroppedSaber, FighterPose } from "../arena/boutChoreography";

/**
 * «Guarda la finale» as data: every beat of the fight and of the Servizio
 * phone is an event at a time `t` (ms), folded into a DuelView by applyEvent.
 * The arena and the phone only draw the view.
 */

/** Where the two athletes stand, in the gym's own units (see GymPair). */
export const DUEL_LEFT = 270;
export const DUEL_RIGHT = 370;
const STAGE = { left: DUEL_LEFT, right: DUEL_RIGHT };
const between = (roll: () => number, low: number, high: number) => low + roll() * (high - low);

// Never more than 30 seconds, whatever the number of assaults.
const TOTAL_MS = 29_000;
const INTRO_MS = 1_200;
const OUTRO_MS = 1_400;
const GAP_MS = 1_500;

export const SERVIZIO_ROWS = ["BAS", "MOV", "DIN", "COM", "SAPD", "GCC", "DIF", "SOG", "PEN"] as const;
const COM_ROW = 3;
const SAPD_ROW = 4;
const DIF_ROW = 6;
const SOG_ROW = 7;
const PEN_ROW = 8;

export type DuelEffect = BoutEffect;

export type DuelSheets = Partial<Record<DuelSide, StyleSheet[]>>;

export type DuelEvent = BoutEvent | ({ t: number } & (
  | { type: "engage" }
  | { type: "card"; side: DuelSide }
  | { type: "mark"; side: DuelSide; judge: number; row: number; value: number }
  | { type: "release"; key: string }
  | { type: "end"; sheets: DuelSheets; score: Record<DuelSide, number>; history: DuelSide[]; poses: Record<DuelSide, FighterPose> }
));

export interface DuelView {
  score: Record<DuelSide, number>;
  history: DuelSide[];
  penalty: Record<DuelSide, boolean>;
  sheets: DuelSheets;
  /** «+» buttons being pressed on the phone: side and row, «a3». */
  pressed: string[];
  done: boolean;
  fighting: boolean;
  steps: [number, number];
  moveMs: number;
  poses: Record<DuelSide, FighterPose>;
  hit: Record<DuelSide, number>;
  effects: DuelEffect[];
  /** Bumps each time the judges raise a Style card. */
  carding: number;
  dropped?: DroppedSaber;
  nextId: number;
}

const blank = (sheets: StyleSheet[] | undefined) => sheets?.map((): StyleSheet => [0, 0, 0, 0, 0, 0, 0, 0, 0]);

export function startView(sheets: DuelSheets, penalty: Record<DuelSide, boolean> = { a: false, b: false }): DuelView {
  return {
    score: { a: 0, b: 0 },
    history: [],
    penalty,
    sheets: { a: blank(sheets.a), b: blank(sheets.b) },
    pressed: [],
    done: false,
    fighting: false,
    steps: [0, 0],
    moveMs: 0,
    poses: { a: { pose: "guard" }, b: { pose: "guard" } },
    hit: { a: 0, b: 0 },
    effects: [],
    carding: 0,
    nextId: 1,
  };
}

/** The final as it ends: what Outlook and «Riduci animazioni» show straight away. */
export function endView(script: DuelScript, sheets: DuelSheets): DuelView {
  const end = script.assaults.reduce(
    (state, assault) => ({ ...state, [assault.winner]: state[assault.winner] + 1 }),
    { a: 0, b: 0 },
  );
  const view = startView(sheets, {
    a: script.penalties.some((penalty) => penalty.side === "a"),
    b: script.penalties.some((penalty) => penalty.side === "b"),
  });
  return {
    ...view,
    score: end,
    history: script.assaults.map((assault) => assault.winner),
    sheets,
    poses: endPoses(script),
    done: true,
  };
}

function endPoses({ ending }: DuelScript): Record<DuelSide, FighterPose> {
  const loser = ending.winner === "a" ? "b" : "a";
  return { [ending.winner]: { pose: "guard", body: ending.win }, [loser]: { pose: "guard", body: ending.lose } } as Record<DuelSide, FighterPose>;
}

export function applyEvent(view: DuelView, event: DuelEvent): DuelView {
  switch (event.type) {
    case "engage":
      return { ...view, fighting: true, poses: { a: { pose: "attack" }, b: { pose: "attack" } } };
    case "move":
    case "pose":
    case "effect":
    case "hit":
    case "drop":
    case "pickup":
      return applyBoutEvent(view, event);
    case "point":
      return {
        ...view,
        score: { ...view.score, [event.side]: view.score[event.side] + 1 },
        history: [...view.history, event.side],
      };
    case "card":
      return { ...view, penalty: { ...view.penalty, [event.side]: true }, carding: view.carding + 1 };
    case "mark": {
      const sheets = view.sheets[event.side]?.map((sheet, judge) =>
        judge === event.judge ? (sheet.map((value, row) => (row === event.row ? event.value : value)) as StyleSheet) : sheet,
      );
      const key = `${event.side}${event.row}`;
      return { ...view, sheets: { ...view.sheets, [event.side]: sheets }, pressed: [...view.pressed.filter((k) => k !== key), key] };
    }
    case "release":
      return { ...view, pressed: view.pressed.filter((key) => key !== event.key) };
    case "end":
      return {
        ...view,
        done: true,
        fighting: false,
        sheets: event.sheets,
        score: event.score,
        history: event.history,
        pressed: [],
        steps: [0, 0],
        moveMs: 600,
        poses: event.poses,
        dropped: undefined,
      };
  }
}

/** Port of the gym bouts: feints and binds until the cut that scores. */
export function buildTimeline(
  script: DuelScript,
  sheets: DuelSheets,
  roll: () => number,
): { events: DuelEvent[]; durationMs: number } {
  const events: DuelEvent[] = [];
  const add = (t: number, event: DistributiveOmit<DuelEvent, "t">) => events.push({ t: Math.round(t), ...event } as DuelEvent);
  const addBout: AddBoutEvent = add;
  const count = script.assaults.length;
  const perAssault = (TOTAL_MS - INTRO_MS - OUTRO_MS) / Math.max(1, count) - GAP_MS;
  const ends: number[] = [];
  const momentAt: Partial<Record<string, number>> = {};
  const score = { a: 0, b: 0 };

  add(800, { type: "engage" });
  let t = INTRO_MS;
  script.assaults.forEach((assault) => {
    const disarming = assault.moment?.name === "Disarmo";
    const cutMs = decisiveMs(assault, disarming);
    const at = addExchanges(addBout, STAGE, t, perAssault - cutMs, roll);
    score[assault.winner] += 1;
    if (disarming) disarm(addBout, STAGE, at, assault);
    else decisive(addBout, STAGE, at, cutMs, assault);
    if (assault.moment) momentAt[`${assault.winner}${assault.moment.kind}`] = at + cutMs;
    ends.push(at + cutMs);
    t += perAssault + GAP_MS;
  });
  let durationMs = t + OUTRO_MS - GAP_MS;

  for (const penalty of script.penalties) add(ends[penalty.assault] - 600, { type: "card", side: penalty.side });
  for (const side of ["a", "b"] as const) {
    sheets[side]?.forEach((sheet, judge) => sheet.forEach((goal, row) => {
      if (row === PEN_ROW || goal <= 0) return;
      const mark = (time: number, value: number) => {
        add(time, { type: "mark", side, judge, row, value });
        add(time + 220, { type: "release", key: `${side}${row}` });
      };
      if (row === COM_ROW || row === SAPD_ROW) {
        // Counted the instant the technique lands and the other calls «OH!».
        const start = (momentAt[`${side}${SERVIZIO_ROWS[row]}`] ?? durationMs * 0.85) + judge * 120;
        for (let value = 0.5, k = 0; value <= goal; value += 0.5, k += 1) mark(start + k * 220, value);
        return;
      }
      if (row === DIF_ROW) {
        mark(durationMs * 0.9, goal);
        return;
      }
      // Half a point at a time, at random moments; now and then half a point too far, then back.
      const step = row === SOG_ROW ? 1 : 0.5;
      const values: number[] = [];
      for (let value = step; value <= goal + 1e-9; value += step) values.push(value);
      if (row !== SOG_ROW && goal < 3 && roll() < 0.35) values.push(goal + 0.5, goal);
      const from = row === SOG_ROW ? 0.55 : 0.04;
      const times = values.map(() => between(roll, from, 0.9) * durationMs).sort((x, y) => x - y);
      values.forEach((value, k) => mark(times[k], value));
    }));
  }
  // The end stances come once the last «OH!» has been called and everyone is back on guard.
  const lastBeat = Math.max(...events.filter((event) => event.type === "pose" || event.type === "pickup").map((event) => event.t));
  const endAt = Math.max(ends.at(-1)! + 1_300, lastBeat + 150);
  durationMs = Math.max(durationMs, endAt + 900);
  add(endAt, {
    type: "end",
    sheets,
    score,
    history: script.assaults.map((assault) => assault.winner),
    poses: endPoses(script),
  });
  return { events: events.sort((x, y) => x.t - y.t), durationMs };
}
