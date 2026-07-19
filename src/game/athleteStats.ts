import type { Contact, FormId, PersonRarity, SpecialCollaboratorId } from "./types";
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

const RARITY_MINIMUM: Record<PersonRarity, number> = {
  common: 1,
  rare: 25,
  "ultra-rare": 50,
  legendary: 1,
};

// I valori individuali dei Leggendari ordinari restano configurabili finché
// il design non li definirà. Il fallback è fisso, mai casuale.
const FIXED_LEGENDARY_STATS: Partial<Record<SpecialCollaboratorId, readonly [number, number]>> = {};
const DEFAULT_LEGENDARY_STATS = [75, 75] as const;

export function getNumericFormCount(forms: readonly FormId[]): number {
  return new Set(forms.flatMap((formId) => {
    const numericForm = NUMERIC_FORM_BY_ID[formId];
    return numericForm ? [numericForm] : [];
  })).size;
}

export function hasCompletedFormOne(forms: readonly FormId[]): boolean {
  return forms.includes("form-1");
}

export function hasCompletedCourseX(forms: readonly FormId[]): boolean {
  return forms.includes("course-x");
}

export function getPreparation(
  base: number,
  numericForms: number,
  tournamentExperience: number,
): number {
  return base * (1 + Math.max(0, numericForms) * 0.1) *
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

export function rollAthleteBaseStats(
  seed: number,
  rarity: PersonRarity,
  specialProfileId?: SpecialCollaboratorId,
): { arena: number; style: number; nextSeed: number } {
  if (rarity === "legendary") {
    const [arena, style] = FIXED_LEGENDARY_STATS[specialProfileId ?? "andrea-simonazzi"] ??
      DEFAULT_LEGENDARY_STATS;
    return { arena, style, nextSeed: seed };
  }
  const minimum = RARITY_MINIMUM[rarity];
  const [arenaRoll, afterArena] = nextRandom(seed);
  const [styleRoll, nextSeed] = nextRandom(afterArena);
  return {
    arena: minimum + Math.floor(arenaRoll * (101 - minimum)),
    style: minimum + Math.floor(styleRoll * (101 - minimum)),
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
  const minimum = RARITY_MINIMUM[rarity];
  const range = 101 - minimum;
  const arena = minimum + ((hash >>> 0) % range);
  const mixed = Math.imul(hash ^ 0x9e3779b9, 2246822519);
  const style = minimum + ((mixed >>> 0) % range);
  return { arena, style };
}

export function getContactPreparation(contact: Contact, forms: readonly FormId[] = contact.forms) {
  const stats = getContactBaseStats(contact);
  const numericForms = getNumericFormCount(forms);
  const experience = getContactTournamentExperience(contact);
  return {
    arena: getPreparation(stats.arena, numericForms, experience),
    style: getPreparation(stats.style, numericForms, experience),
  };
}

export function getStyleVote(performance: number): number {
  return 10 / (1 + Math.exp(-(performance - 125) / 50));
}
