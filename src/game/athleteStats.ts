import type { Contact, FormBranch, FormId, PersonRarity, SpecialCollaboratorId } from "./types";
import { nextRandom } from "./random";

const NUMERIC_FORM_BY_ID: Partial<Record<FormId, number>> = {
  "form-1": 1,
  "form-2": 2,
  "form-3-long": 3,
  "form-3-staff": 3,
  "form-3-double": 3,
  "form-4-long": 4,
  "form-4-staff": 4,
  "form-4-double": 4,
  "form-5-long": 5,
  "form-5-staff": 5,
  "form-5-double": 5,
  "form-6": 6,
  "form-7": 7,
};

/**
 * Arena and Stile each Form adds (decision of 06/10): every Form is worth 10
 * points in all. Spada Lunga splits them evenly, Staffa leans to Arena, Doppie
 * Spade Corte to Stile. Every Form known adds, whatever the branch: all of them
 * give +90%, +100% with Corso X, which counts only once its secret path is open.
 */
export const FORM_STAT_BONUSES: Partial<Record<FormId, { arena: number; style: number }>> = {
  "form-1": { arena: 0.1, style: 0.1 },
  "course-x": { arena: 0.1, style: 0.1 },
  "form-2": { arena: 0.1, style: 0.1 },
  "course-y": { arena: 0.05, style: 0.05 },
  "form-3-long": { arena: 0.05, style: 0.05 },
  "form-4-long": { arena: 0.05, style: 0.05 },
  "form-5-long": { arena: 0.05, style: 0.05 },
  "form-3-staff": { arena: 0.075, style: 0.025 },
  "form-4-staff": { arena: 0.075, style: 0.025 },
  "form-5-staff": { arena: 0.075, style: 0.025 },
  "form-3-double": { arena: 0.025, style: 0.075 },
  "form-4-double": { arena: 0.025, style: 0.075 },
  "form-5-double": { arena: 0.025, style: 0.075 },
  "form-6": { arena: 0.1, style: 0.1 },
  "form-7": { arena: 0.1, style: 0.1 },
};

export function getFormStatBonuses(
  forms: readonly FormId[],
  courseXUnlocked = false,
): { arena: number; style: number } {
  let arena = 0;
  let style = 0;
  for (const formId of new Set(forms)) {
    if (formId === "course-x" && !courseXUnlocked) continue;
    const bonus = FORM_STAT_BONUSES[formId];
    if (!bonus) continue;
    arena += bonus.arena;
    style += bonus.style;
  }
  // Rounded to the tenth of a percent: sums of 0,025 must not drift.
  return { arena: Math.round(arena * 1_000) / 1_000, style: Math.round(style * 1_000) / 1_000 };
}

const BRANCH_LEVELS: Record<FormBranch, readonly FormId[]> = {
  "Spada Lunga": ["form-3-long", "form-4-long", "form-5-long"],
  Staffa: ["form-3-staff", "form-4-staff", "form-5-staff"],
  "Doppia spada corta": ["form-3-double", "form-4-double", "form-5-double"],
};
const WEAPON_ORDER: readonly FormBranch[] = ["Spada Lunga", "Staffa", "Doppia spada corta"];

/**
 * The weapon an athlete fights with: the branch where they went furthest
 * (Forme 3–5). A tie goes to their preferred branch, then Lunga, Staffa,
 * Doppie. With only Forme 1–2 it is the Spada Lunga.
 */
export function getAthleteWeapon(
  forms: readonly FormId[],
  preferences: readonly FormBranch[] = [],
): FormBranch {
  const depth = (branch: FormBranch) =>
    BRANCH_LEVELS[branch].reduce((level, formId, index) => forms.includes(formId) ? index + 1 : level, 0);
  const order = [...new Set([...preferences, ...WEAPON_ORDER])];
  let best: FormBranch = "Spada Lunga";
  let bestDepth = 0;
  for (const branch of order) {
    const level = depth(branch);
    if (level > bestDepth) {
      best = branch;
      bestDepth = level;
    }
  }
  return best;
}

/** Arena e Stile base per rarità, tiro uniforme min–max (decisione del 09/10). */
export const RARITY_BASE_RANGE: Record<Exclude<PersonRarity, "legendary">, readonly [number, number]> = {
  common: [1, 75],
  rare: [25, 80],
  "ultra-rare": [45, 85],
};

// I valori individuali dei Leggendari ordinari restano configurabili finché
// il design non li definirà. Il fallback è fisso, mai casuale.
const FIXED_LEGENDARY_STATS: Partial<Record<SpecialCollaboratorId, readonly [number, number]>> = {};
export const DEFAULT_LEGENDARY_STATS = [80, 80] as const;

export function getNumericFormCount(forms: readonly FormId[]): number {
  return new Set(forms.flatMap((formId) => {
    const numericForm = NUMERIC_FORM_BY_ID[formId];
    return numericForm ? [numericForm] : [];
  })).size;
}

export function hasCompletedFormOne(forms: readonly FormId[]): boolean {
  return forms.includes("form-1");
}

/**
 * Arena and Style are shown by Occhio del Maestro (statsTier = its level):
 * never without it, after Corso Y at level 1, from enrolment at level 2.
 */
export function hasUnlockedOfficialStats(forms: readonly FormId[], statsTier: number): boolean {
  if (statsTier >= 2) return true;
  return statsTier >= 1 && forms.includes("course-y");
}

/** Tooltip on the «???» shown while Arena and Style stay hidden. */
export function getHiddenStatsHint(statsTier: number): string {
  return statsTier >= 1
    ? "Si vedono dopo il Corso Y"
    : "Si vedono con Occhio del Maestro (Upgrade, Insegnamento)";
}

/** Arena or Stile for a tournament: base × (1 + bonus of the Forms) × experience. */
export function getPreparation(
  base: number,
  formBonus: number,
  tournamentExperience: number,
): number {
  return base * (1 + Math.max(0, formBonus)) *
    (1 + Math.min(20, Math.max(0, tournamentExperience)) * 0.03);
}

export function getContactTournamentExperience(contact: Contact): number {
  return Math.max(0, Math.floor(contact.tournamentExperience ?? 0));
}

export function getContactBaseStats(contact: Contact): { arena: number; style: number } {
  if (Number.isFinite(contact.arenaBase) && Number.isFinite(contact.styleBase)) {
    return { arena: contact.arenaBase!, style: contact.styleBase! };
  }
  return createStableFallbackStats(contact.id, contact.rarity, contact.specialProfileId);
}

export interface AthleteTournamentStats {
  base: { arena: number; style: number };
  numericForms: number;
  tournamentExperience: number;
  /** Bonus of the Forms known, as a fraction (0,9 = +90%). */
  formBonus: { arena: number; style: number };
  weapon: FormBranch;
  experienceMultiplier: number;
  arena: number;
  style: number;
}

/**
 * Composes the authoritative Arena and Style values used by tournament-facing
 * features. Permanent training gains are already stored in arenaBase/styleBase;
 * every future school-wide modifier must be added here so lists, preliminaries
 * and the tournament simulation cannot diverge.
 */
export function getAthleteTournamentStats(
  contact: Contact,
  forms: readonly FormId[] = contact.forms,
  courseXUnlocked = false,
): AthleteTournamentStats {
  const base = getContactBaseStats(contact);
  const numericForms = getNumericFormCount(forms);
  const tournamentExperience = getContactTournamentExperience(contact);
  const formBonus = getFormStatBonuses(forms, courseXUnlocked);
  const experienceMultiplier = 1 + Math.min(20, tournamentExperience) * 0.03;
  return {
    base,
    numericForms,
    tournamentExperience,
    formBonus,
    weapon: getAthleteWeapon(forms, contact.formBranchPreferences),
    experienceMultiplier,
    arena: getPreparation(base.arena, formBonus.arena, tournamentExperience),
    style: getPreparation(base.style, formBonus.style, tournamentExperience),
  };
}

export function rollAthleteBaseStats(
  seed: number,
  rarity: PersonRarity,
  specialProfileId?: SpecialCollaboratorId,
  /** Genetica (Reputation): scales the rolled base values, legendaries keep theirs. */
  geneticsMultiplier = 1,
): { arena: number; style: number; nextSeed: number } {
  if (rarity === "legendary") {
    const [arena, style] = FIXED_LEGENDARY_STATS[specialProfileId ?? "andrea-simonazzi"] ??
      DEFAULT_LEGENDARY_STATS;
    return { arena, style, nextSeed: seed };
  }
  const [minimum, maximum] = RARITY_BASE_RANGE[rarity];
  const [arenaRoll, afterArena] = nextRandom(seed);
  const [styleRoll, nextSeed] = nextRandom(afterArena);
  return {
    arena: Math.round((minimum + Math.floor(arenaRoll * (maximum + 1 - minimum))) * geneticsMultiplier),
    style: Math.round((minimum + Math.floor(styleRoll * (maximum + 1 - minimum))) * geneticsMultiplier),
    nextSeed,
  };
}

export function advanceRandomSeed(seed: number, steps: number): number {
  let nextSeed = seed;
  for (let index = 0; index < steps; index += 1) {
    [, nextSeed] = nextRandom(nextSeed);
  }
  return nextSeed;
}

export function createStableFallbackStats(
  identity: string,
  rarity: PersonRarity,
  specialProfileId?: SpecialCollaboratorId,
): { arena: number; style: number } {
  if (rarity === "legendary") {
    const [arena, style] = FIXED_LEGENDARY_STATS[specialProfileId ?? "andrea-simonazzi"] ??
      DEFAULT_LEGENDARY_STATS;
    return { arena, style };
  }
  let hash = 2166136261;
  for (const character of identity) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const [minimum, maximum] = RARITY_BASE_RANGE[rarity];
  const range = maximum + 1 - minimum;
  const arena = minimum + ((hash >>> 0) % range);
  const mixed = Math.imul(hash ^ 0x9e3779b9, 2246822519);
  const style = minimum + ((mixed >>> 0) % range);
  return { arena, style };
}

export function getContactPreparation(
  contact: Contact,
  forms: readonly FormId[] = contact.forms,
  courseXUnlocked = false,
) {
  const stats = getAthleteTournamentStats(contact, forms, courseXUnlocked);
  return {
    arena: stats.arena,
    style: stats.style,
  };
}

export function getStyleVote(performance: number): number {
  return 10 / (1 + Math.exp(-(performance - 125) / 50));
}
