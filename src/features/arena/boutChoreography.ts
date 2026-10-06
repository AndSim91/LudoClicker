import type { FighterBody } from "../people/fighterBodies";

/**
 * How two stick athletes fight, shared by the Arena final of the tournaments
 * (finalDuelTimeline.ts) and the central pair of the gym (GymBoutPair.tsx):
 * exchanges, the cut that scores with its «OH!», the Disarmo. Every beat is an
 * event at a time `t` (ms); applyBoutEvent folds them into what is drawn.
 * Units are the gym's: feet at y 150, hand at 116.
 */

export type BoutSide = "a" | "b";

export interface BoutMoment {
  kind: "COM" | "SAPD";
  name: string;
  /** «Forma 1», «Forma 3 Spada Lunga»; none for a Disarmo. */
  form?: string;
}

/** Cuts that score: never a thrust. `from` is the blade's starting angle, `y` where it lands. */
export const STRIKES = [
  { name: "Fendente alla spalla", from: -105, y: 106 },
  { name: "Tondo al fianco", from: -165, y: 121 },
  { name: "Montante al busto", from: 85, y: 116 },
  { name: "Diagonale al braccio", from: -60, y: 111 },
  { name: "Taglio alla gamba", from: -40, y: 137 },
] as const;

export type BoutStrike = (typeof STRIKES)[number];

export interface BoutAssault {
  winner: BoutSide;
  strike: BoutStrike;
  /** A COM or SAPD is the decisive cut of an assault won by whoever performs it. */
  moment?: BoutMoment;
}

/** Where the two athletes stand (x of each body), in gym units. */
export interface BoutStage {
  left: number;
  right: number;
}

export interface FighterPose {
  pose: "guard" | "attack";
  tip?: { x: number; y: number };
  declare?: boolean;
  unarmed?: boolean;
  body?: FighterBody;
}

/** A sword knocked out of the hand (Disarmo): it flies from the hand (x, y) and lands dx further on. */
export interface DroppedSaber {
  side: BoutSide;
  x: number;
  y: number;
  /** Blade from the hilt, as it was held. */
  blade: [number, number];
  dx: number;
  floor: number;
  /** Degrees; ends with the blade flat on the floor. */
  spin: number;
}

export type BoutEffect =
  | { id: number; kind: "clash" | "touch" | "oh"; x: number; y: number }
  | { id: number; kind: "tech"; x: number; y: number; moment: BoutMoment };

export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type BoutEvent = { t: number } & (
  | { type: "move"; ms: number; steps: [number, number] }
  | { type: "pose"; side: BoutSide; pose: FighterPose }
  | { type: "effect"; effect: DistributiveOmit<BoutEffect, "id"> }
  | { type: "hit"; side: BoutSide }
  | { type: "point"; side: BoutSide }
  | { type: "drop"; saber: DroppedSaber }
  | { type: "pickup" }
);

export type AddBoutEvent = (t: number, event: DistributiveOmit<BoutEvent, "t">) => void;

export const CLASH_Y = 101;
const HAND_Y = 116;
const BLADE = 40;

/** What a bout looks like at a given moment. */
export interface BoutView {
  steps: [number, number];
  moveMs: number;
  poses: Record<BoutSide, FighterPose>;
  hit: Record<BoutSide, number>;
  effects: BoutEffect[];
  dropped?: DroppedSaber;
  nextId: number;
}

export const startBoutView = (): BoutView => ({
  steps: [0, 0],
  moveMs: 0,
  poses: { a: { pose: "attack" }, b: { pose: "attack" } },
  hit: { a: 0, b: 0 },
  effects: [],
  nextId: 1,
});

/** Folds one beat into the view; «point» is for whoever keeps the score. */
export function applyBoutEvent<V extends BoutView>(view: V, event: BoutEvent): V {
  switch (event.type) {
    case "move":
      return { ...view, moveMs: event.ms, steps: event.steps };
    case "pose":
      return { ...view, poses: { ...view.poses, [event.side]: event.pose } };
    case "effect":
      // Old effects have already faded (CSS); keep the list short.
      return {
        ...view,
        effects: [...view.effects.slice(-7), { ...event.effect, id: view.nextId } as BoutEffect],
        nextId: view.nextId + 1,
      };
    case "hit":
      return { ...view, hit: { ...view.hit, [event.side]: view.hit[event.side] + 1 } };
    case "drop":
      return { ...view, dropped: event.saber };
    case "pickup":
      return { ...view, dropped: undefined };
    case "point":
      return view;
  }
}

const between = (roll: () => number, low: number, high: number) => low + roll() * (high - low);

/**
 * Feints and binds: someone attacks, the blades meet (mostly), both reset their
 * feet. Stops before going past `budgetMs`; returns when the last one ends.
 */
export function addExchanges(add: AddBoutEvent, stage: BoutStage, from: number, budgetMs: number, roll: () => number): number {
  let at = from;
  while (true) {
    const attacker = roll() < 0.5 ? "a" : "b";
    const reach = Math.round(between(roll, 5, 12));
    const attackMs = Math.round(between(roll, 170, 300));
    const recoverMs = Math.round(between(roll, 220, 440));
    const clash = roll() < 0.8;
    if (at - from + attackMs + recoverMs > budgetMs) break;
    const landed: [number, number] = attacker === "a" ? [reach, Math.round(reach * 0.4)] : [-Math.round(reach * 0.4), -reach];
    add(at, { type: "move", ms: attackMs, steps: landed });
    if (clash) add(at + attackMs, { type: "effect", effect: { kind: "clash", x: (stage.left + stage.right) / 2 + (landed[0] + landed[1]) / 2, y: CLASH_Y } });
    const wiggle = () => Math.round((roll() * 6 - 3) * 10) / 10;
    add(at + attackMs, { type: "move", ms: recoverMs, steps: [wiggle(), wiggle()] });
    at += attackMs + recoverMs;
  }
  return at;
}

const BIND_MS = 480;
const FLY_MS = 820;
const DISARM_CUT_MS = 340;
/** The bind, the flight, then the cut lands just as the sword hits the floor. */
export const DISARM_MS = BIND_MS + FLY_MS - 160 + DISARM_CUT_MS;
// The blade winds round the other's and flicks up.
const BIND_ANGLES = [-40, -12, 18, 42, 28, 2, -26, -55, -78];

/** How long the decisive move of an assault takes. */
export const decisiveMs = (assault: BoutAssault, disarming: boolean) =>
  disarming ? DISARM_MS : assault.moment ? 560 : 340;

/** The cut that scores: the blade sweeps onto the other's body, a flash, then «OH!». */
export function decisive(add: AddBoutEvent, stage: BoutStage, at: number, ms: number, assault: BoutAssault, dropDx?: number) {
  const attacker = assault.winner;
  const defender = attacker === "a" ? "b" : "a";
  const dir = attacker === "a" ? 1 : -1;
  const strike = assault.moment ? { ...assault.strike, from: -150 } : assault.strike;
  const defShift = 4 * dir;
  const defX = (defender === "a" ? stage.left : stage.right) + defShift;
  const contact = { x: defX - 5 * dir, y: strike.y };
  const dy = contact.y - HAND_Y;
  const reach = Math.sqrt(Math.max(0, BLADE * BLADE - dy * dy));
  const base = attacker === "a" ? stage.left : stage.right;
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
  add(at + ms + 240, { type: "pose", side: defender, pose: { pose: "guard", declare: true, unarmed: dropDx !== undefined } });
  add(at + ms + 240, { type: "effect", effect: { kind: "oh", x: defX, y: 74 } });
  add(at + ms + 240, { type: "point", side: attacker });
  if (dropDx === undefined) {
    add(at + ms + 1_100, { type: "pose", side: defender, pose: { pose: "attack" } });
    add(at + ms + 1_100, { type: "pose", side: attacker, pose: { pose: "attack" } });
    add(at + ms + 1_100, { type: "move", ms: 500, steps: [0, 0] });
    return;
  }
  // Disarmed: off to pick the sword up, then back on guard.
  const fetch = dropDx * 0.8;
  add(at + ms + 700, { type: "pose", side: attacker, pose: { pose: "guard" } });
  add(at + ms + 700, { type: "move", ms: 350, steps: attacker === "a" ? [0, fetch] : [fetch, 0] });
  add(at + ms + 1_050, { type: "pickup" });
  add(at + ms + 1_050, { type: "pose", side: defender, pose: { pose: "guard" } });
  add(at + ms + 1_050, { type: "move", ms: 400, steps: [0, 0] });
  add(at + ms + 1_450, { type: "pose", side: defender, pose: { pose: "attack" } });
  add(at + ms + 1_450, { type: "pose", side: attacker, pose: { pose: "attack" } });
}

/**
 * Disarmo (SAPD): the blade winds round the other's, the sword flies and falls
 * behind its owner, who takes the cut empty-handed and calls «OH!».
 */
export function disarm(add: AddBoutEvent, stage: BoutStage, at: number, assault: BoutAssault) {
  const attacker = assault.winner;
  const defender = attacker === "a" ? "b" : "a";
  const dir = attacker === "a" ? 1 : -1;
  const base = attacker === "a" ? stage.left : stage.right;
  if (assault.moment) add(at, { type: "effect", effect: { kind: "tech", x: base, y: 60, moment: assault.moment } });
  add(at, { type: "move", ms: 260, steps: attacker === "a" ? [9, 0] : [0, -9] });
  const hand = { x: base + 14 * dir, y: HAND_Y };
  BIND_ANGLES.forEach((degrees, index) => {
    const angle = (degrees * Math.PI) / 180;
    const t = at + (BIND_MS * index) / (BIND_ANGLES.length - 1);
    add(t, { type: "pose", side: attacker, pose: { pose: "attack", tip: { x: hand.x + Math.cos(angle) * BLADE * dir, y: hand.y + Math.sin(angle) * BLADE } } });
    if (index === 2) add(t, { type: "effect", effect: { kind: "clash", x: (stage.left + stage.right) / 2 + 4 * dir, y: 106 } });
  });

  const drop = at + BIND_MS;
  const owner = -dir;
  const blade: [number, number] = [30 * owner, -26];
  const start = (Math.atan2(blade[1], blade[0]) * 180) / Math.PI;
  let spin = -owner * 540;
  spin += ((-(start + spin) % 180) + 180) % 180; // lands flat
  const dx = dir * 52;
  add(drop, { type: "pose", side: defender, pose: { pose: "guard", unarmed: true } });
  add(drop, { type: "hit", side: defender });
  add(drop, {
    type: "drop",
    saber: { side: defender, x: (defender === "a" ? stage.left : stage.right) + 14 * owner, y: HAND_Y, blade, dx, floor: 150 - HAND_Y - 1, spin },
  });
  decisive(add, stage, drop + FLY_MS - 160, DISARM_CUT_MS, { ...assault, moment: undefined }, dx);
}

/** Recovering after the decisive move: back on guard, or the sword picked up. */
const AFTERMATH_MS = { cut: 1_700, disarm: 2_050 };

/**
 * A bout of the gym: a few exchanges, then a cut that scores (or, now and then,
 * a Disarmo and the cut). The point goes to `winner` with the «OH!».
 */
export function planCutBout(
  stage: BoutStage,
  roll: () => number,
  disarmChance: number,
): { events: BoutEvent[]; durationMs: number; winner: BoutSide; disarmed: boolean } {
  const events: BoutEvent[] = [];
  const add: AddBoutEvent = (t, event) => events.push({ t: Math.round(t), ...event } as BoutEvent);
  const winner: BoutSide = roll() < 0.5 ? "a" : "b";
  const disarmed = roll() < disarmChance;
  const strike = STRIKES[Math.min(STRIKES.length - 1, Math.floor(roll() * STRIKES.length))];
  const assault: BoutAssault = disarmed
    ? { winner, strike, moment: { kind: "SAPD", name: "Disarmo" } }
    : { winner, strike };
  const at = addExchanges(add, stage, 0, Math.round(between(roll, 1_200, 2_600)), roll);
  if (disarmed) disarm(add, stage, at, assault);
  else decisive(add, stage, at, decisiveMs(assault, false), assault);
  const durationMs = at + decisiveMs(assault, disarmed) + AFTERMATH_MS[disarmed ? "disarm" : "cut"];
  return { events: events.sort((x, y) => x.t - y.t), durationMs, winner, disarmed };
}
