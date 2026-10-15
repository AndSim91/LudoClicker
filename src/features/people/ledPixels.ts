/**
 * Pixel-art for the hall's LED band (sponsors, concept of 15/10): a grid of LEDs,
 * a 5-row pixel font and a few drawing helpers. Pure code, no canvas: the band is
 * turned into an SVG image of horizontal runs, one path per colour.
 */

export type LedGrid = { w: number; h: number; px: (string | null)[] };

export const ledGrid = (w: number, h: number): LedGrid => ({ w, h, px: new Array(w * h).fill(null) });

export function setLed(g: LedGrid, x: number, y: number, color: string | null) {
  if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.px[y * g.w + x] = color;
}

export function rect(g: LedGrid, x: number, y: number, w: number, h: number, color: string | null) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setLed(g, i, j, color);
}

export const off = (g: LedGrid, x: number, y: number, w = 1, h = 1) => rect(g, x, y, w, h, null);

/** Bresenham, one LED wide. */
export function line(g: LedGrid, x0: number, y0: number, x1: number, y1: number, color: string) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (;;) {
    setLed(g, x0, y0, color);
    if (x0 === x1 && y0 === y1) return;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}

export function path(g: LedGrid, points: [number, number][], color: string) {
  for (let i = 1; i < points.length; i++) line(g, ...points[i - 1], ...points[i], color);
}

export function disc(g: LedGrid, cx: number, cy: number, r: number, color: string) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) setLed(g, cx + x, cy + y, color);
}

export function ring(g: LedGrid, cx: number, cy: number, r: number, color: string) {
  for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
    if (Math.abs(Math.hypot(x, y) - r) < 0.6) setLed(g, cx + x, cy + y, color);
  }
}

/** Fills (or, with null, clears) the LEDs whose centre is inside the polygon. */
export function polygon(g: LedGrid, points: [number, number][], color: string | null) {
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const px = x + 0.5, py = y + 0.5;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i], [xj, yj] = points[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) setLed(g, x, y, color);
  }
}

/** Copies the lit LEDs of `src` onto `dst` at (x, y). */
export function blit(dst: LedGrid, src: LedGrid, x: number, y = 0) {
  for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
    const c = src.px[j * src.w + i];
    if (c) setLed(dst, x + i, y + j, c);
  }
}

// 5-row font, capitals only (the band speaks like a stadium board).
const FONT: Record<string, string[]> = {
  A: [".###.", "#...#", "#####", "#...#", "#...#"],
  B: ["####.", "#...#", "####.", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "####.", "#....", "#####"],
  F: ["#####", "#....", "####.", "#....", "#...."],
  G: [".####", "#....", "#..##", "#...#", ".####"],
  H: ["#...#", "#...#", "#####", "#...#", "#...#"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  J: ["..###", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "###..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "####.", "#....", "#...."],
  Q: [".###.", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "####.", "#..#.", "#...#"],
  S: [".####", "#....", ".###.", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  Y: ["#...#", ".#.#.", "..#..", "..#..", "..#.."],
  Z: ["#####", "...#.", "..#..", ".#...", "#####"],
  0: [".###.", "#..##", "#.#.#", "##..#", ".###."],
  1: [".#.", "##.", ".#.", ".#.", "###"],
  2: ["####.", "....#", ".###.", "#....", "#####"],
  3: ["####.", "....#", ".###.", "....#", "####."],
  4: ["#..#.", "#..#.", "#####", "...#.", "...#."],
  5: ["#####", "#....", "####.", "....#", "####."],
  6: [".###.", "#....", "####.", "#...#", ".###."],
  7: ["#####", "....#", "...#.", "..#..", "..#.."],
  8: [".###.", "#...#", ".###.", "#...#", ".###."],
  9: [".###.", "#...#", ".####", "....#", ".###."],
  "'": ["#", "#", ".", ".", "."],
  "!": ["#", "#", "#", ".", "#"],
  "?": ["###.", "...#", ".##.", "....", ".#.."],
  ".": [".", ".", ".", ".", "#"],
  " ": ["..", "..", "..", "..", ".."],
};

const glyph = (ch: string) => {
  const rows = FONT[ch];
  if (!rows) throw new Error(`LED font: no glyph for «${ch}»`);
  return rows;
};

/** Width in LEDs of `text` at `scale` (one LED between letters). */
export function textWidth(text: string, scale = 1) {
  const chars = [...text];
  return chars.reduce((sum, ch) => sum + glyph(ch)[0].length, 0) * scale + (chars.length - 1) * scale;
}

/** Writes `text` with its top-left corner at (x, top); returns the width. */
export function text(g: LedGrid, value: string, x: number, top: number, color: string, scale = 1) {
  let cursor = x;
  for (const ch of value) {
    const rows = glyph(ch);
    rows.forEach((row, j) => [...row].forEach((cell, i) => {
      if (cell === "#") rect(g, cursor + i * scale, top + j * scale, scale, scale, color);
    }));
    cursor += (rows[0].length + 1) * scale;
  }
  return cursor - x - scale;
}

/** The grid as an SVG document: each row's runs of one colour, one path per colour. */
export function ledSvg(g: LedGrid) {
  const paths = new Map<string, string>();
  for (let y = 0; y < g.h; y++) {
    let x = 0;
    while (x < g.w) {
      const c = g.px[y * g.w + x];
      let end = x + 1;
      while (end < g.w && g.px[y * g.w + end] === c) end++;
      if (c) paths.set(c, `${paths.get(c) ?? ""}M${x} ${y}h${end - x}v1h-${end - x}z`);
      x = end;
    }
  }
  const body = [...paths].map(([c, d]) => `<path fill="${c}" d="${d}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.w} ${g.h}" width="${g.w}" height="${g.h}" shape-rendering="crispEdges">${body}</svg>`;
}
