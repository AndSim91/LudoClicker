import type { TutorialRegionId } from "../../content/tutorialScenes";

/**
 * «Segnale» (09/10/2026): an elbow trace from the tutorial card to the element
 * it talks about, with a corner frame on the element. Pure geometry, no DOM.
 */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type Point = readonly [number, number];

export interface SignalRoute {
  /** The trace, card edge first; empty when the element is too close to draw one. */
  points: readonly Point[];
  /** The corner frame around the element. */
  frame: Box;
}

/** Whole areas the tutorial lights up but does not point at. */
const BROAD_REGIONS = new Set<TutorialRegionId>([
  "title", "commands", "navigation", "folders", "messages", "main", "day-panel", "status",
]);

/** The region the signal points at: the most specific one, listed last by the scenes. */
export function pickSignalRegion(regionIds: readonly TutorialRegionId[]): TutorialRegionId | undefined {
  return [...regionIds].reverse().find((regionId) => !BROAD_REGIONS.has(regionId));
}

const FRAME_PAD = 7;
const CORNER = 10;
const MIN_GAP = 24;

const overlaps = (a: Box, b: Box) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/**
 * Leaves the card from the side that faces the element (top/bottom when the
 * element is above/below it, else left/right at `anchorY`, the speaker's
 * badge), runs in straight lines with 45° corners and never crosses the card.
 * Null when there is nothing sensible to draw: element too big, off screen or
 * under the card.
 */
export function computeSignalRoute(
  card: Box,
  target: Box,
  anchorY: number,
  viewport: { width: number; height: number },
): SignalRoute | null {
  const width = target.right - target.left;
  const height = target.bottom - target.top;
  if (width <= 0 || height <= 0) return null;
  if (width * height > viewport.width * viewport.height * 0.3) return null;
  if (target.right < 0 || target.bottom < 0 || target.left > viewport.width || target.top > viewport.height) {
    return null;
  }
  const frame: Box = {
    left: target.left - FRAME_PAD,
    top: target.top - FRAME_PAD,
    right: target.right + FRAME_PAD,
    bottom: target.bottom + FRAME_PAD,
  };
  if (overlaps(frame, card)) return null;

  const cx = (target.left + target.right) / 2;
  const cy = (target.top + target.bottom) / 2;
  const k = CORNER;

  if (frame.bottom <= card.top || frame.top >= card.bottom) {
    const above = frame.bottom <= card.top;
    const start: Point = [clamp(cx, card.left + 34, card.right - 34), above ? card.top : card.bottom];
    const end: Point = [cx, above ? frame.bottom : frame.top];
    if (Math.abs(end[1] - start[1]) < MIN_GAP) return { points: [], frame };
    const v = above ? -1 : 1;
    const mid = Math.round((start[1] + end[1]) / 2);
    if (Math.abs(end[0] - start[0]) < 2 * k) return { points: [start, [start[0], end[1]]], frame };
    const h = Math.sign(end[0] - start[0]);
    return {
      points: [start, [start[0], mid - v * k], [start[0] + h * k, mid], [end[0] - h * k, mid], [end[0], mid + v * k], end],
      frame,
    };
  }

  const left = frame.right <= card.left;
  const start: Point = [left ? card.left : card.right, anchorY];
  const end: Point = [left ? frame.right : frame.left, cy];
  if (Math.abs(end[0] - start[0]) < MIN_GAP) return { points: [], frame };
  if (Math.abs(end[1] - start[1]) < 2 * k) return { points: [start, [end[0], start[1]]], frame };
  const h = left ? -1 : 1;
  const v = Math.sign(end[1] - start[1]);
  const mid = Math.round((start[0] + end[0]) / 2);
  return {
    points: [start, [mid - h * k, start[1]], [mid, start[1] + v * k], [mid, end[1] - v * k], [mid + h * k, end[1]], end],
    frame,
  };
}

/**
 * Where to slide the card so it does not sit on the element it talks about
 * (09/10/2026): the smallest move below, above, right or left of the element
 * that keeps the whole card on screen. {0, 0} when they do not overlap or the
 * card fits nowhere.
 */
export function avoidTarget(
  card: Box,
  target: Box,
  viewport: { width: number; height: number },
): { dx: number; dy: number } {
  const gap = 20;
  const margin = 16;
  const halo: Box = {
    left: target.left - gap,
    top: target.top - gap,
    right: target.right + gap,
    bottom: target.bottom + gap,
  };
  if (!overlaps(card, halo)) return { dx: 0, dy: 0 };
  const width = card.right - card.left;
  const height = card.bottom - card.top;
  const fitsX = (left: number) => left >= margin && left + width <= viewport.width - margin;
  const fitsY = (top: number) => top >= margin && top + height <= viewport.height - margin;
  const options = [
    { dx: 0, dy: halo.bottom - card.top },
    { dx: 0, dy: halo.top - height - card.top },
    { dx: halo.right - card.left, dy: 0 },
    { dx: halo.left - width - card.left, dy: 0 },
  ].filter(({ dx, dy }) => fitsX(card.left + dx) && fitsY(card.top + dy));
  options.sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy));
  return options[0] ?? { dx: 0, dy: 0 };
}

/** The point at fraction `f` of the trace length (for the data packets). */
export function pointAlong(points: readonly Point[], f: number): Point {
  const lengths = points.slice(1).map((point, index) =>
    Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) * clamp(f, 0, 1);
  for (let index = 0; index < lengths.length; index += 1) {
    if (remaining <= lengths[index]) {
      const t = lengths[index] === 0 ? 0 : remaining / lengths[index];
      const [ax, ay] = points[index];
      const [bx, by] = points[index + 1];
      return [ax + (bx - ax) * t, ay + (by - ay) * t];
    }
    remaining -= lengths[index];
  }
  return points[points.length - 1];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
