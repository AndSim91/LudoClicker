import type { StyleSheet } from "../../game/types";
import { type DuelMoment, type DuelScript, type DuelSide } from "./finalDuel";

/**
 * «Guarda la finale» as data: every beat of the fight and of the Servizio
 * phone is an event at a time `t` (ms), folded into a DuelView by applyEvent.
 * The arena and the phone only draw the view.
 */

/** Where the two athletes stand, in the gym's own units (see GymPair). */
export const DUEL_LEFT = 270;
export const DUEL_RIGHT = 370;
const CLASH_Y = 101;
const HAND_Y = 116;
const BLADE = 40;

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

export interface FighterPose {
  pose: "guard" | "attack";
  tip?: { x: number; y: number };
  declare?: boolean;
}

export type DuelEffect =
  | { id: number; kind: "clash" | "touch" | "oh"; x: number; y: number }
  | { id: number; kind: "tech"; x: number; y: number; moment: DuelMoment };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type DuelSheets = Partial<Record<DuelSide, StyleSheet[]>>;

export type DuelEvent = { t: number } & (
  | { type: "engage" }
  | { type: "move"; ms: number; steps: [number, number] }
  | { type: "pose"; side: DuelSide; pose: FighterPose }
  | { type: "effect"; effect: DistributiveOmit<DuelEffect, "id"> }
  | { type: "hit"; side: DuelSide }
  | { type: "point"; side: DuelSide }
  | { type: "card"; side: DuelSide }
  | { type: "mark"; side: DuelSide; judge: number; row: number; value: number }
  | { type: "release"; key: string }
  | { type: "end"; sheets: DuelSheets; score: Record<DuelSide, number>; history: DuelSide[] }
);

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
  return { ...view, score: end, history: script.assaults.map((assault) => assault.winner), sheets, done: true };
}

export function applyEvent(view: DuelView, event: DuelEvent): DuelView {
  switch (event.type) {
    case "engage":
      return { ...view, fighting: true, poses: { a: { pose: "attack" }, b: { pose: "attack" } } };
    case "move":
      return { ...view, moveMs: event.ms, steps: event.steps };
    case "pose":
      return { ...view, poses: { ...view.poses, [event.side]: event.pose } };
    case "effect":
      // Old effects have already faded (CSS); keep the list short.
      return {
        ...view,
        effects: [...view.effects.slice(-7), { ...event.effect, id: view.nextId } as DuelEffect],
        nextId: view.nextId + 1,
      };
    case "hit":
      return { ...view, hit: { ...view.hit, [event.side]: view.hit[event.side] + 1 } };
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
        poses: { a: { pose: "guard" }, b: { pose: "guard" } },
      };
  }
}

const between = (roll: () => number, low: number, high: number) => low + roll() * (high - low);

/** Port of the gym bouts: feints and binds until the cut that scores. */
export function buildTimeline(
  script: DuelScript,
  sheets: DuelSheets,
  roll: () => number,
): { events: DuelEvent[]; durationMs: number } {
  const events: DuelEvent[] = [];
  const add = (t: number, event: DistributiveOmit<DuelEvent, "t">) => events.push({ t: Math.round(t), ...event } as DuelEvent);
  const count = script.assaults.length;
  const perAssault = (TOTAL_MS - INTRO_MS - OUTRO_MS) / Math.max(1, count) - GAP_MS;
  const ends: number[] = [];
  const momentAt: Partial<Record<string, number>> = {};
  const score = { a: 0, b: 0 };

  add(800, { type: "engage" });
  let t = INTRO_MS;
  script.assaults.forEach((assault) => {
    const decisiveMs = assault.moment ? 560 : 340;
    let at = t;
    // Exchanges: someone attacks, the blades meet (mostly), both reset their feet.
    while (true) {
      const attacker = roll() < 0.5 ? "a" : "b";
      const reach = Math.round(between(roll, 5, 12));
      const attackMs = Math.round(between(roll, 170, 300));
      const recoverMs = Math.round(between(roll, 220, 440));
      const clash = roll() < 0.8;
      if (at - t + attackMs + recoverMs > perAssault - decisiveMs) break;
      const landed: [number, number] = attacker === "a" ? [reach, Math.round(reach * 0.4)] : [-Math.round(reach * 0.4), -reach];
      add(at, { type: "move", ms: attackMs, steps: landed });
      if (clash) add(at + attackMs, { type: "effect", effect: { kind: "clash", x: (DUEL_LEFT + DUEL_RIGHT) / 2 + (landed[0] + landed[1]) / 2, y: CLASH_Y } });
      const wiggle = () => Math.round((roll() * 6 - 3) * 10) / 10;
      add(at + attackMs, { type: "move", ms: recoverMs, steps: [wiggle(), wiggle()] });
      at += attackMs + recoverMs;
    }
    score[assault.winner] += 1;
    decisive(add, at, decisiveMs, assault);
    if (assault.moment) momentAt[`${assault.winner}${assault.moment.kind}`] = at + decisiveMs;
    ends.push(at + decisiveMs);
    t += perAssault + GAP_MS;
  });
  const durationMs = t + OUTRO_MS - GAP_MS;

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
  add(durationMs - 900, {
    type: "end",
    sheets,
    score,
    history: script.assaults.map((assault) => assault.winner),
  });
  return { events: events.sort((x, y) => x.t - y.t), durationMs };
}

type Add = (t: number, event: DistributiveOmit<DuelEvent, "t">) => void;

/** The cut that scores: the blade sweeps onto the other's body, a flash, then «OH!». */
function decisive(add: Add, at: number, ms: number, assault: DuelScript["assaults"][number]) {
  const attacker = assault.winner;
  const defender = attacker === "a" ? "b" : "a";
  const dir = attacker === "a" ? 1 : -1;
  const strike = assault.moment ? { ...assault.strike, from: -150 } : assault.strike;
  const defShift = 4 * dir;
  const defX = (defender === "a" ? DUEL_LEFT : DUEL_RIGHT) + defShift;
  const contact = { x: defX - 5 * dir, y: strike.y };
  const dy = contact.y - HAND_Y;
  const reach = Math.sqrt(Math.max(0, BLADE * BLADE - dy * dy));
  const base = attacker === "a" ? DUEL_LEFT : DUEL_RIGHT;
  const attShift = contact.x - dir * reach - (base + 14 * dir);

  if (assault.moment) add(at, { type: "effect", effect: { kind: "tech", x: base, y: 60, moment: assault.moment } });
  add(at, { type: "move", ms, steps: attacker === "a" ? [attShift, defShift] : [defShift, attShift] });
  const hand = { x: base + 14 * dir, y: HAND_Y };
  const local = { x: contact.x - attShift, y: contact.y };
  const end = Math.atan2(local.y - hand.y, (local.x - hand.x) * dir);
  const from = (strike.from * Math.PI) / 180;
  const frames = assault.moment ? 10 : 7;
  for (let frame = 0; frame <= frames; frame += 1) {
    const angle = from + (end - from) * (frame / frames);
    const length = frame === frames ? Math.hypot(local.x - hand.x, local.y - hand.y) : BLADE;
    const tip = { x: hand.x + Math.cos(angle) * length * dir, y: hand.y + Math.sin(angle) * length };
    add(at + (ms * frame) / frames, { type: "pose", side: attacker, pose: { pose: "attack", tip } });
  }
  add(at + ms, { type: "effect", effect: { kind: "touch", x: contact.x, y: contact.y } });
  add(at + ms, { type: "hit", side: defender });
  add(at + ms + 240, { type: "pose", side: defender, pose: { pose: "guard", declare: true } });
  add(at + ms + 240, { type: "effect", effect: { kind: "oh", x: defX, y: 74 } });
  add(at + ms + 240, { type: "point", side: attacker });
  add(at + ms + 1_100, { type: "pose", side: defender, pose: { pose: "attack" } });
  add(at + ms + 1_100, { type: "pose", side: attacker, pose: { pose: "attack" } });
  add(at + ms + 1_100, { type: "move", ms: 500, steps: [0, 0] });
}

