import { createRandomProspect } from "../content/prospectDirectory";
import { PERSON_RARITIES } from "../content/rarities";
import { SPECIAL_COLLABORATORS } from "../content/specialCollaborators";
import { GAME_CONFIG } from "./config";
import { makeGameId } from "./ids";
import { nextRandom } from "./random";
import type {
  Contact,
  GameState,
  LegendaryCollaboratorProgress,
  PersonRarity,
  SpecialCollaboratorId,
} from "./types";

export type AcquiredContactSource = "sparring" | "event" | "social" | "collaborator";

export const ANDREA_SIMONAZZI_ID: SpecialCollaboratorId = "andrea-simonazzi";
export const ANDREA_SIMONAZZI_PROFILE = SPECIAL_COLLABORATORS.find(
  (profile) => profile.id === ANDREA_SIMONAZZI_ID,
)!;

export function getLegendaryAppearanceChance(): number {
  return PERSON_RARITIES.legendary.queueAppearanceChance;
}

function chooseOrdinaryRarity(seed: number): { rarity: Exclude<PersonRarity, "legendary">; nextSeed: number } {
  const [rarityRoll, nextSeed] = nextRandom(seed);
  const nonLegendaryChance = 1 - PERSON_RARITIES.legendary.queueAppearanceChance;
  const ultraRareThreshold =
    PERSON_RARITIES["ultra-rare"].queueAppearanceChance / nonLegendaryChance;
  const rareThreshold = ultraRareThreshold +
    PERSON_RARITIES.rare.queueAppearanceChance / nonLegendaryChance;
  return {
    rarity: rarityRoll < ultraRareThreshold
      ? "ultra-rare"
      : rarityRoll < rareThreshold
        ? "rare"
        : "common",
    nextSeed,
  };
}

function chooseLegendaryProfile(
  seed: number,
  progress: LegendaryCollaboratorProgress,
) {
  const [appearanceRoll, seedAfterAppearance] = nextRandom(seed);
  if (appearanceRoll >= getLegendaryAppearanceChance()) {
    return { profile: undefined, nextSeed: seedAfterAppearance };
  }
  const candidates = SPECIAL_COLLABORATORS.filter(
    (profile) => !progress.enrolledProfileIds.includes(profile.id),
  );
  if (candidates.length === 0) return { profile: undefined, nextSeed: seedAfterAppearance };
  if (candidates.length === 1) return { profile: candidates[0], nextSeed: seedAfterAppearance };
  const [profileRoll, nextSeed] = nextRandom(seedAfterAppearance);
  return {
    profile: candidates[Math.min(candidates.length - 1, Math.floor(profileRoll * candidates.length))],
    nextSeed,
  };
}

export function addLegendaryEncounter(
  progress: LegendaryCollaboratorProgress,
  profileId: SpecialCollaboratorId,
): LegendaryCollaboratorProgress {
  if (progress.encounteredProfileIds.includes(profileId)) return progress;
  return {
    ...progress,
    encounteredProfileIds: [...progress.encounteredProfileIds, profileId],
  };
}

export function addLegendaryEncounters(
  progress: LegendaryCollaboratorProgress,
  contacts: Contact[],
): LegendaryCollaboratorProgress {
  let nextProgress = progress;
  for (const contact of contacts) {
    if (contact.specialProfileId) {
      nextProgress = addLegendaryEncounter(nextProgress, contact.specialProfileId);
    }
  }
  return nextProgress;
}

export function createInitialContacts(
  now: number,
  includeAndrea: boolean,
  seed: number,
  existingProgress: LegendaryCollaboratorProgress,
): { contacts: Contact[]; nextSeed: number; progress: LegendaryCollaboratorProgress } {
  let nextSeed = seed;
  let progress = existingProgress;
  const contacts = Array.from({ length: GAME_CONFIG.initialContacts }, (_, index) => {
    let legendaryProfile = includeAndrea &&
      index + 1 === GAME_CONFIG.guaranteedAndreaContactPosition &&
      !progress.enrolledProfileIds.includes(ANDREA_SIMONAZZI_ID)
      ? ANDREA_SIMONAZZI_PROFILE
      : undefined;
    if (!legendaryProfile) {
      const selected = chooseLegendaryProfile(nextSeed, progress);
      legendaryProfile = selected.profile;
      nextSeed = selected.nextSeed;
    }
    if (legendaryProfile) {
      progress = addLegendaryEncounter(progress, legendaryProfile.id);
    }
    const ordinary = legendaryProfile ? undefined : chooseOrdinaryRarity(nextSeed);
    if (ordinary) nextSeed = ordinary.nextSeed;
    const generated = createRandomProspect(nextSeed, legendaryProfile);
    const { firstName, lastName, email } = generated;
    const retained = legendaryProfile
      ? progress.retainedProgress[legendaryProfile.id]
      : undefined;
    return {
      id: makeGameId("contact", now, index),
      firstName,
      lastName,
      email,
      source: "tutorial" as const,
      acquiredAt: now,
      status: index === 0 ? "writing" as const : "available" as const,
      rarity: legendaryProfile ? "legendary" as const : ordinary!.rarity,
      specialProfileId: legendaryProfile?.id,
      forms: [...(retained?.forms ?? [])],
      formBranchPreferences: [...(retained?.formBranchPreferences ?? [])],
      lastFormTrainingYear: retained?.lastFormTrainingYear,
    };
  });
  return { contacts, nextSeed, progress };
}

export function createAcquiredContacts(
  state: GameState,
  count: number,
  source: AcquiredContactSource,
  now: number,
): { contacts: Contact[]; nextSeed: number } {
  let nextSeed = state.randomSeed;
  let progress = state.legendaryCollaborators;
  const contacts = Array.from({ length: count }, (_, index) => {
    const sequence = state.statistics.contactsAcquired + index;
    const queuePosition = state.contacts.length + index + 1;
    const selected = queuePosition === GAME_CONFIG.guaranteedAndreaContactPosition &&
      state.network.schools.length === 0 &&
      !progress.enrolledProfileIds.includes(ANDREA_SIMONAZZI_ID)
      ? { profile: ANDREA_SIMONAZZI_PROFILE, nextSeed }
      : chooseLegendaryProfile(nextSeed, progress);
    const specialProfile = selected.profile;
    nextSeed = selected.nextSeed;
    if (specialProfile) progress = addLegendaryEncounter(progress, specialProfile.id);
    const ordinary = specialProfile ? undefined : chooseOrdinaryRarity(nextSeed);
    if (ordinary) nextSeed = ordinary.nextSeed;
    const generated = createRandomProspect(nextSeed, specialProfile);
    const { firstName, lastName, email } = generated;
    const retained = specialProfile
      ? progress.retainedProgress[specialProfile.id]
      : undefined;
    return {
      id: makeGameId("contact", now, `acquired-${sequence}`),
      firstName,
      lastName,
      email,
      source,
      acquiredAt: now,
      status: "available" as const,
      rarity: specialProfile ? "legendary" as const : ordinary!.rarity,
      specialProfileId: specialProfile?.id,
      forms: [...(retained?.forms ?? [])],
      formBranchPreferences: [...(retained?.formBranchPreferences ?? [])],
      lastFormTrainingYear: retained?.lastFormTrainingYear,
    };
  });
  return { contacts, nextSeed };
}
