import { blit, disc, ledGrid, ledSvg, line, off, path, polygon, rect, ring, setLed, text, textWidth, type LedGrid } from "./ledPixels";

/**
 * What the hall's LED band shows (Andrea's choices of 15/10): the Order, Lama di
 * Luce (L1: the eight-blade star, LAMA·DI·LUCE and the tricolour) and three invented
 * sponsors with their drawings (A1 «Ago illuminato», B2b «Mortaio basito», C2 «Spada
 * nella focaccia»). The band scrolls (concept C), so a sponsor's panel is as wide
 * as its name needs. Real sponsors carry no jokes; the invented ones do. The Order
 * only fills the slots of sponsors not yet under contract.
 */

export const LED_ROWS = 24;
const PANEL = 152;
const ART = 28;

const C = {
  teal: "#6cd3d6", gold: "#f0b85a", white: "#eef6fa", orange: "#f08a2a", green: "#36b45a", red: "#e23c43",
  silver: "#a9bccb", steel: "#6f8aa0", thread: "#ff5a5a", leaf: "#5fd66b", vein: "#2c9a45",
  pesto: "#a3c43a", oil: "#e6d36a", dough: "#f6cf5a", crust: "#d9893a", wood: "#b07a45",
};

const centered = (g: LedGrid, value: string, cx: number, top: number, color: string, scale = 1) =>
  text(g, value, Math.round(cx - textWidth(value, scale) / 2), top, color, scale);

function ordine() {
  const g = ledGrid(PANEL, LED_ROWS);
  centered(g, "ORDINE DELLE ONDE", PANEL / 2, 10, C.teal);
  return g;
}

/** Lama di Luce's star: eight blades, the cardinal ones longer, a small star cut in the middle. */
function star(g: LedGrid, cx: number, cy: number, r: number) {
  const pts = (n: number, radius: (i: number) => number, turn: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i * 2 * Math.PI) / n + turn;
      return [cx + Math.cos(a) * radius(i), cy + Math.sin(a) * radius(i)] as [number, number];
    });
  polygon(g, pts(16, (i) => (i % 2 ? r * 0.28 : i % 4 === 0 ? r : r * 0.72), -Math.PI / 2), C.white);
  polygon(g, pts(8, (i) => (i % 2 ? r * 0.1 : r * 0.22), Math.PI / 8), null);
}

function lamaDiLuce() {
  const g = ledGrid(PANEL, LED_ROWS);
  star(g, 15, 11.5, 11);
  let x = Math.round(91 - textWidth("LAMADILUCE", 2) / 2);
  x += text(g, "LAMA", x, 3, C.white, 2) + 2;
  x += text(g, "DI", x, 3, C.orange, 2) + 2;
  text(g, "LUCE", x, 3, C.white, 2);
  [C.green, C.white, C.red].forEach((color, i) => rect(g, 76 + i * 10, 17, 9, 2, color));
  return g;
}

/* ---- The invented sponsors' drawings (28 × 24) ---------------------------------- */

function needle() {
  const g = ledGrid(ART, LED_ROWS);
  line(g, 3, 21, 6, 18, C.steel); line(g, 4, 21, 7, 18, C.steel); line(g, 3, 20, 6, 17, C.steel);
  setLed(g, 5, 19, C.gold);
  line(g, 5, 15, 9, 19, C.gold);
  line(g, 8, 15, 19, 4, C.teal); line(g, 9, 17, 20, 6, C.teal); line(g, 8, 16, 20, 4, C.white); line(g, 9, 16, 20, 5, C.white);
  ring(g, 22, 3, 2, C.white); off(g, 22, 3);
  path(g, [[23, 4], [25, 6], [24, 9], [26, 12], [24, 15], [26, 18], [23, 21], [21, 20]], C.thread);
  return g;
}

/** A basil leaf: a rotated oval with its vein. */
function leaf(g: LedGrid, cx: number, cy: number, angle: number, a = 2.3, b = 4.6) {
  const cs = Math.cos(angle), sn = Math.sin(angle);
  for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) {
    const u = x * cs + y * sn, v = -x * sn + y * cs;
    if ((u / a) ** 2 + (v / b) ** 2 <= 1) setLed(g, cx + x, cy + y, C.leaf);
  }
  for (let t = -b + 1.5; t <= b - 0.5; t += 0.5) setLed(g, Math.round(cx - t * sn), Math.round(cy + t * cs), C.vein);
}

/** The Genoese marble mortar, astonished: pesto inside, basil on top, the wooden pestle. */
function mortar() {
  const g = ledGrid(ART, LED_ROWS);
  const top = 11;
  rect(g, 6, top - 2, 16, 1, C.pesto); rect(g, 5, top - 1, 18, 1, C.pesto);
  ([[9, top - 1], [15, top - 1], [19, top - 2], [12, top - 2]] as const).forEach(([x, y]) => setLed(g, x, y, C.oil));
  rect(g, 3, top, 22, 1, C.white);
  for (let y = top + 1; y <= top + 8; y++) {
    const w = Math.round(10 - ((y - top - 1) / 7) ** 2 * 4);
    rect(g, 14 - w, y, 2 * w, 1, C.white); rect(g, 14 + w - 2, y, 2, 1, C.silver);
  }
  rect(g, 2, top + 1, 2, 3, C.silver); rect(g, 24, top + 1, 2, 3, C.silver);
  rect(g, 9, top + 9, 10, 2, C.silver);
  line(g, 18, top - 2, 24, 2, C.wood); line(g, 19, top - 2, 25, 2, C.wood); disc(g, 25, 1, 1, C.wood);
  leaf(g, 8, 5, -0.55); leaf(g, 14, 5, 0.45);
  off(g, 9, 14, 2, 2); off(g, 16, 14, 2, 2); setLed(g, 9, 14, C.white); setLed(g, 16, 14, C.white);
  off(g, 12, 17, 3, 2);
  return g;
}

/** The sword in the focaccia: a lit blade stuck in the slab, sparkles and a drop of oil. */
function focaccia() {
  const g = ledGrid(ART, LED_ROWS);
  rect(g, 2, 16, 24, 6, C.dough); rect(g, 2, 15, 24, 1, C.crust); rect(g, 2, 21, 24, 1, C.crust); off(g, 2, 15); off(g, 25, 15);
  ([[5, 18], [10, 17], [17, 19], [21, 17], [7, 20]] as const).forEach(([x, y]) => setLed(g, x, y, C.crust));
  rect(g, 13, 1, 3, 5, C.silver); setLed(g, 14, 3, C.steel); rect(g, 12, 6, 5, 1, C.gold);
  line(g, 14, 7, 14, 15, C.white); line(g, 13, 8, 13, 15, C.teal); line(g, 15, 8, 15, 15, C.teal);
  ([[8, 9], [7, 8], [9, 8], [8, 7], [20, 6], [21, 10], [24, 22], [24, 23]] as const).forEach(([x, y]) => setLed(g, x, y, C.gold));
  return g;
}

/** Drawing on the left, two lines of name on the right; as wide as the longer line. */
function sponsor(art: LedGrid, lines: [string, string][]) {
  const textX = 6 + ART + 6;
  const g = ledGrid(textX + Math.max(...lines.map(([value]) => textWidth(value))) + 8, LED_ROWS);
  blit(g, art, 6);
  lines.forEach(([value, color], i) => text(g, value, textX, i ? 14 : 5, color));
  return g;
}

export type LedSponsorId = "lama-di-luce" | "sartoria" | "basito" | "strutto";

/** The band's slots, in order. A slot whose sponsor is not under contract shows the Order. */
export const LED_SPONSORS: LedSponsorId[] = ["lama-di-luce", "sartoria", "basito", "strutto"];

export function sponsorPanels(): Record<Exclude<LedSponsorId, "lama-di-luce">, LedGrid> {
  return {
    sartoria: sponsor(needle(), [["SARTORIA", C.thread], ["CRUNA DELL'AGO", C.white]]),
    basito: sponsor(mortar(), [["F4 BASITO", C.leaf], ["SOLO BASILICO GENOVESE", C.white]]),
    strutto: sponsor(focaccia(), [["FOCACCERIA INQUARTATA", C.dough], ["DI STRUTTO", C.white]]),
  };
}

/** The order the contracts sign them (Contratti di sponsorizzazione): Lama di Luce last. */
const CONTRACT_ORDER: LedSponsorId[] = ["sartoria", "basito", "strutto", "lama-di-luce"];

export function getSignedSponsors(contracts: number): LedSponsorId[] {
  return CONTRACT_ORDER.slice(0, Math.max(0, contracts));
}

/** Dark LEDs between two panels, so each sponsor stands on its own. */
const GAP = 28;

/** The strip that scrolls: one panel per slot, each followed by a gap. */
export function ledStrip(active: readonly LedSponsorId[]) {
  const sponsors = { "lama-di-luce": lamaDiLuce(), ...sponsorPanels() };
  const order = ordine();
  const panels = LED_SPONSORS.map((id) => (active.includes(id) ? sponsors[id] : order));
  const g = ledGrid(panels.reduce((sum, p) => sum + p.w + GAP, 0), LED_ROWS);
  let x = 0;
  for (const p of panels) { blit(g, p, x); x += p.w + GAP; }
  return g;
}

const cache = new Map<string, { href: string; cols: number }>();

/** The strip as an image URL, built once per set of sponsors. */
export function ledStripImage(active: readonly LedSponsorId[]) {
  const key = LED_SPONSORS.filter((id) => active.includes(id)).join();
  let image = cache.get(key);
  if (!image) {
    const g = ledStrip(active);
    image = { href: `data:image/svg+xml,${encodeURIComponent(ledSvg(g))}`, cols: g.w };
    cache.set(key, image);
  }
  return image;
}
