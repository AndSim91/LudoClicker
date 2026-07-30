import { SECRET_LEGENDARIES } from "../../content/secretLegendaries";
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
  currentStatus: "enrolled" | "departed" | "remembered";
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
  state: Pick<GameState, "legendaryCollaborators">,
): ReadonlySet<SpecialCollaboratorId> {
  return new Set(state.legendaryCollaborators.enrolledProfileIds);
}

export function getLegendaryDossier(
  state: Pick<GameState, "contacts" | "legendaryCollaborators">,
  legendary: LudodexLegendary,
): LegendaryDossier {
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
  const secretProfile = legendary.secretLegendaryId
    ? SECRET_LEGENDARIES[legendary.secretLegendaryId]
    : undefined;
  const arenaBase = retained?.arenaBase ?? secretProfile?.arenaBase ?? 75;
  const styleBase = retained?.styleBase ?? secretProfile?.styleBase ?? 75;
  return {
    arenaBase,
    styleBase,
    currentStatus: "remembered",
  };
}
