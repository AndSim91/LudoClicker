/** A rectangle in the gym scene's SVG units (viewBox -180 0 1000 180). */
export interface GymBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bounding box of some points, grown by a margin for strokes and glows. */
export function boxAround(points: Array<[number, number]>, margin: number): GymBox {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x = Math.min(...xs) - margin;
  const y = Math.min(...ys) - margin;
  return { x, y, w: Math.max(...xs) + margin - x, h: Math.max(...ys) + margin - y };
}
