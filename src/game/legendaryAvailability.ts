import { SPECIAL_COLLABORATORS } from "../content/specialCollaborators";
import {
  SECRET_LEGENDARY_IDS as SECRET_LEGENDARY_CATALOG_IDS,
} from "../content/secretLegendaries";
import type {
  GameState,
  SecretLegendaryId,
  SecretLegendaryProgress,
  SpecialCollaboratorId,
} from "./types";

const STANDARD_LEGENDARY_IDS = new Set<string>(
  SPECIAL_COLLABORATORS.map((profile) => profile.id),
);
const SECRET_LEGENDARY_ID_SET = new Set<string>(
  SECRET_LEGENDARY_CATALOG_IDS,
);

export function isStandardLegendaryId(value: unknown): value is SpecialCollaboratorId {
  return typeof value === "string" && STANDARD_LEGENDARY_IDS.has(value);
}

export function isSecretLegendaryId(value: unknown): value is SecretLegendaryId {
  return typeof value === "string" && SECRET_LEGENDARY_ID_SET.has(value);
}

export function createSecretLegendaryProgress(
  existing: Partial<Record<string, SecretLegendaryProgress>> = {},
): Record<SecretLegendaryId, SecretLegendaryProgress> {
  return Object.fromEntries(
    SECRET_LEGENDARY_CATALOG_IDS.map((id) => [
      id,
      existing[id] ?? { status: "external", defeats: 0, failedTrials: 0 },
    ]),
  ) as Record<SecretLegendaryId, SecretLegendaryProgress>;
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
    if (contact.specialProfileId && contact.status !== "departed") {
      reserved.add(contact.specialProfileId);
    }
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
