import { SPECIAL_COLLABORATORS } from "../content/specialCollaborators";
import { SECRET_LEGENDARIES } from "../content/tournaments";
import type {
  GameState,
  SecretLegendaryId,
  SpecialCollaboratorId,
} from "./types";

const STANDARD_LEGENDARY_IDS = new Set<string>(
  SPECIAL_COLLABORATORS.map((profile) => profile.id),
);
const SECRET_LEGENDARY_IDS = new Set<string>(
  Object.keys(SECRET_LEGENDARIES),
);

export function isStandardLegendaryId(value: unknown): value is SpecialCollaboratorId {
  return typeof value === "string" && STANDARD_LEGENDARY_IDS.has(value);
}

export function isSecretLegendaryId(value: unknown): value is SecretLegendaryId {
  return typeof value === "string" && SECRET_LEGENDARY_IDS.has(value);
}

export function isCataloguedLegendaryId(value: unknown): value is SpecialCollaboratorId {
  return isStandardLegendaryId(value) || isSecretLegendaryId(value);
}

export function getReservedLegendaryProfileIds(
  state: Pick<GameState, "contacts" | "collaborators" | "legendaryCollaborators">,
): Set<SpecialCollaboratorId> {
  const reserved = new Set<SpecialCollaboratorId>([
    ...state.legendaryCollaborators.enrolledProfileIds,
  ]);
  for (const contact of state.contacts) {
    if (contact.specialProfileId) reserved.add(contact.specialProfileId);
  }
  for (const collaborator of state.collaborators) {
    if (collaborator.specialProfileId) reserved.add(collaborator.specialProfileId);
  }
  return reserved;
}

export function getAvailableStandardLegendaryProfiles(
  state: Pick<GameState, "contacts" | "collaborators" | "legendaryCollaborators">,
) {
  const reserved = getReservedLegendaryProfileIds(state);
  return SPECIAL_COLLABORATORS.filter((profile) => !reserved.has(profile.id));
}
