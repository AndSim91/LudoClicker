import {
  getSecretLegendaryBase,
  getSecretLegendaryProfile,
  SECRET_LEGENDARY_IDS,
} from "../../content/secretLegendaries";
import type { LudodexLegendary } from "../../content/ludowiki";
import { getContactBaseStats } from "../../game/athleteStats";
import type {
  Contact,
  GameState,
  SpecialCollaboratorId,
} from "../../game/types";

export interface LegendaryDossier {
  arenaBase: number;
  styleBase: number;
  currentStatus: "enrolled" | "departed" | "remembered" | "external";
}

function getMostRelevantContact(
  contacts: readonly Contact[],
  profileId: SpecialCollaboratorId,
): Contact | undefined {
  let candidate: Contact | undefined;
  for (const contact of contacts) {
    if (contact.specialProfileId !== profileId) continue;
    if (contact.status === "enrolled") return contact;
    if (!candidate || contact.acquiredAt >= candidate.acquiredAt) candidate = contact;
  }
  return candidate;
}

export function getDiscoveredLegendaryIds(
  state: Pick<GameState, "legendaryCollaborators" | "network">,
): ReadonlySet<SpecialCollaboratorId> {
  // Enrolled now, or in an earlier school (their progress is kept): the Ludodex survives the prestige.
  // Who never enrolls is discovered at the first defeat (the network survives the prestige too).
  return new Set([
    ...state.legendaryCollaborators.enrolledProfileIds,
    ...Object.keys(state.legendaryCollaborators.retainedProgress) as SpecialCollaboratorId[],
    ...SECRET_LEGENDARY_IDS.filter((id) =>
      getSecretLegendaryProfile(id).recruitment === "never" &&
      (state.network.secretLegendaries[id]?.defeats ?? 0) > 0),
  ]);
}

/** Never met, met but never enrolled (partial card), or enrolled at least once (full dossier). */
export type LudodexStatus = "unknown" | "encountered" | "enrolled";

export function getLudodexStatus(
  state: Pick<GameState, "legendaryCollaborators">,
  discoveredIds: ReadonlySet<SpecialCollaboratorId>,
  profileId: SpecialCollaboratorId,
): LudodexStatus {
  if (discoveredIds.has(profileId)) return "enrolled";
  return state.legendaryCollaborators.encounteredProfileIds.includes(profileId) ? "encountered" : "unknown";
}

export function getLegendaryEnrollmentCount(
  state: Pick<GameState, "legendaryCollaborators">,
  profileId: SpecialCollaboratorId,
): number {
  return Math.max(1, state.legendaryCollaborators.enrollmentCounts?.[profileId] ?? 0);
}

export function getLegendaryDossier(
  state: Pick<GameState, "contacts" | "legendaryCollaborators">,
  legendary: LudodexLegendary,
): LegendaryDossier {
  if (legendary.external && legendary.secretLegendaryId) {
    // No base for who never enrolls: the dossier shows the tournament values.
    const [arenaBase, styleBase] = getSecretLegendaryProfile(legendary.secretLegendaryId).tournament;
    return { arenaBase, styleBase, currentStatus: "external" };
  }
  const contact = getMostRelevantContact(state.contacts, legendary.id);
  if (contact) {
    const baseStats = getContactBaseStats(contact);
    return {
      arenaBase: baseStats.arena,
      styleBase: baseStats.style,
      currentStatus: contact.status === "enrolled" ? "enrolled" : "departed",
    };
  }

  const retained = state.legendaryCollaborators.retainedProgress[legendary.id];
  const [secretArena, secretStyle] = legendary.secretLegendaryId
    ? getSecretLegendaryBase(legendary.secretLegendaryId)
    : [75, 75];
  const arenaBase = retained?.arenaBase ?? secretArena;
  const styleBase = retained?.styleBase ?? secretStyle;
  return {
    arenaBase,
    styleBase,
    currentStatus: "remembered",
  };
}
