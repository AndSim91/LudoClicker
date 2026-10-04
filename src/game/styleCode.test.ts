import { expect, it } from "vitest";
import { encodeStyleCode } from "./styleCode";
import type { StyleSheet } from "./types";

// Codici prodotti dall'implementazione di riferimento Python (style_codes_v2a.py).
const GOLDEN: [StyleSheet, string][] = [
  [[1, 1, 0, 0, 0, 1, 0, 0, 0], "r6"],
  [[2, 1.5, 1.5, 1, 0, 2, 0, 1, 0], "eq16w1"],
  [[1.5, 1, 1, 0, 0, 1, 0, 0, 1], "wy9z01"],
  [[3, 3, 3, 3, 3, 3, 3, 3, 20], "pj42mc3m"],
  [[0, 0, 0, 0, 0, 0, 0, 0, 0], "z0"],
  [[1, 0.5, 1.5, 2.5, 0, 0, 3, 0, 1], "kv17bf01"],
  [[2, 0, 2, 0.5, 0, 0, 1.5, 3, 0], "cx12cr3"],
  [[0.5, 0, 2, 1.5, 0, 3, 2, 0, 0], "ns18an"],
  [[2.5, 2.5, 2, 0, 2, 2, 1.5, 0, 0], "jd25np"],
  [[0, 2, 3, 0.5, 1, 1.5, 0.5, 0, 12], "rz17cw0c"],
];

it("encodes style judgements exactly like Servizio", () => {
  for (const [sheet, code] of GOLDEN) expect(encodeStyleCode(sheet)).toBe(code);
});
