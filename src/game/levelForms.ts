import type { FormId } from "./types";

/**
 * Forme per livello (decisione di Andrea del 07/10): le stesse per i
 * Leggendari Segreti e per gli avversari generati. L'arma principale è la
 * Spada Lunga; la seconda e la terza sono Staffa o Doppia spada corta.
 * - Accademico: F1, F2, Y, F3 e F4 Lunga.
 * - Nazionale: anche F5 Lunga, F3 e F4 sulla seconda arma.
 * - Champion's: anche F5 sulla seconda arma, F3 sulla terza e F6.
 * - Chronicles: tutte (Corso X solo se il percorso segreto è aperto).
 */
export type FormLevel = "academy" | "national" | "champions" | "chronicles";
export type SecondWeapon = "staff" | "double";

/** Esperienza di torneo per livello: quella con cui un Leggendario entra a scuola. */
export const LEVEL_EXPERIENCE: Record<FormLevel, number> = {
  academy: 5,
  national: 10,
  champions: 15,
  chronicles: 20,
};

const OTHER: Record<SecondWeapon, SecondWeapon> = { staff: "double", double: "staff" };

export function getLevelForms(
  level: FormLevel,
  second: SecondWeapon,
  courseXUnlocked = false,
): FormId[] {
  const third = OTHER[second];
  const forms: FormId[] = ["form-1", "form-2", "course-y", "form-3-long", "form-4-long"];
  if (level === "academy") return forms;
  forms.push("form-5-long", `form-3-${second}`, `form-4-${second}`);
  if (level === "national") return forms;
  forms.push(`form-5-${second}`, `form-3-${third}`, "form-6");
  if (level === "champions") return forms;
  forms.push(`form-4-${third}`, `form-5-${third}`, "form-7");
  if (courseXUnlocked) forms.push("course-x");
  return forms;
}

/** Livello che corrisponde a un numero di Forme numeriche: 4, 5, 6 o 7. */
export function getFormLevelForCount(numericForms: number): FormLevel {
  if (numericForms >= 7) return "chronicles";
  if (numericForms >= 6) return "champions";
  if (numericForms >= 5) return "national";
  return "academy";
}
