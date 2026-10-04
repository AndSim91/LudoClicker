import type { StyleSheet } from "./types";

/**
 * Codice di Stile INCOM v2 (mezzi punti), come lo scrive l'app Servizio.
 * Porting di style_encode_v2a da github.com/anfive/style-codes (Unlicense).
 */
const ALPHABET_23 = "zyxwvutsrqpnmkjhgfedcba";
const PEN_CODE = "0123456789abcdefghjkm";

export function encodeStyleCode([bas, mov, din, com, sapd, gcc, dif, sog, pen]: StyleSheet): string {
  const [b, m, d, c, s, g, f] = [bas, mov, din, com, sapd, gcc, dif].map((points) => points * 2);
  let value =
    (m % 3) +
    (g % 3) * 3 +
    (d % 3) * 9 +
    Math.floor(m / 3) * 27 +
    Math.floor(d / 3) * 81 +
    Math.floor(g / 3) * 243 +
    c * 729 +
    s * 729 * 7 +
    f * 729 * 49;
  const digits: number[] = [];
  for (let index = 0; index < 4; index += 1) {
    digits.push(value % 23);
    value = Math.floor(value / 23);
  }
  const [aVal, bVal, cVal, dVal] = digits;
  const dChar = dVal !== 0 ? ALPHABET_23[dVal] : "";
  let cChar = cVal !== 0 || dChar ? ALPHABET_23[cVal] : "";
  const bChar = bVal !== 0 || cChar ? ALPHABET_23[bVal] : "";
  const penChar = pen === 0 ? "" : PEN_CODE[pen];
  const sogChar = sog === 0 && !penChar ? "" : String(sog);
  if (sogChar && !cChar) cChar = "z";
  return `${ALPHABET_23[aVal]}${bChar}${b + m + d + c + s + g + f}${cChar}${dChar}${sogChar}${penChar}`;
}
