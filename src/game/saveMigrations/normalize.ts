import { createProspectEmail } from "../../content/prospectDirectory";
import {
  isCataloguedLegendaryId,
  isSecretLegendaryId,
} from "../legendaryAvailability";
import type { Contact } from "../types";
import type { MigratableState } from "./types";

const LEGACY_PROSPECT_EMAIL_DOMAIN = "@esempio.test";

function demoteLegendaryContact(contact: Contact): Contact {
  const ordinaryContact = { ...contact };
  delete ordinaryContact.specialProfileId;
  delete ordinaryContact.secretLegendaryId;
  return { ...ordinaryContact, rarity: "ultra-rare" };
}

function getLegendaryContactPriority(state: MigratableState, contact: Contact): number {
  const statusPriority: Record<Contact["status"], number> = {
    enrolled: 6_000,
    trialScheduled: 5_000,
    writing: 4_000,
    invited: 3_000,
    available: 2_000,
    lost: 1_000,
    departed: 0,
  };
  const activeTrial = state.scheduledTrials?.some(
    (trial) => trial.contactId === contact.id && trial.status === "scheduled",
  );
  const collaborator = state.collaborators?.some(
    (candidate) => candidate.contactId === contact.id,
  );
  const secretEnrollment = contact.secretLegendaryId
    ? state.network?.secretLegendaries?.[contact.secretLegendaryId]?.enrolledContactId === contact.id
    : false;
  return statusPriority[contact.status] +
    (activeTrial ? 10_000 : 0) +
    (collaborator ? 100 : 0) +
    (secretEnrollment ? 20_000 : 0);
}

function normalizeLegendaryAssignments(state: MigratableState): MigratableState {
  if (!state.contacts) return state;

  const canonicalContactByProfile = new Map<string, Contact>();
  for (const contact of state.contacts) {
    if (!isCataloguedLegendaryId(contact.specialProfileId)) continue;
    const current = canonicalContactByProfile.get(contact.specialProfileId);
    if (
      !current ||
      getLegendaryContactPriority(state, contact) > getLegendaryContactPriority(state, current)
    ) {
      canonicalContactByProfile.set(contact.specialProfileId, contact);
    }
  }

  const contacts = state.contacts.map((contact) => {
    if (
      !isCataloguedLegendaryId(contact.specialProfileId) ||
      canonicalContactByProfile.get(contact.specialProfileId)?.id !== contact.id
    ) {
      return contact.rarity === "legendary" || contact.specialProfileId || contact.secretLegendaryId
        ? demoteLegendaryContact(contact)
        : contact;
    }
    if (isSecretLegendaryId(contact.specialProfileId)) {
      return {
        ...contact,
        rarity: "legendary" as const,
        secretLegendaryId: contact.specialProfileId,
      };
    }
    const standardLegendary = { ...contact };
    delete standardLegendary.secretLegendaryId;
    return { ...standardLegendary, rarity: "legendary" as const };
  });

  const collaborators = state.collaborators?.map((collaborator) => {
    const canonicalContact = collaborator.specialProfileId
      ? canonicalContactByProfile.get(collaborator.specialProfileId)
      : undefined;
    if (
      !isCataloguedLegendaryId(collaborator.specialProfileId) ||
      canonicalContact?.id !== collaborator.contactId
    ) {
      if (collaborator.rarity !== "legendary" && !collaborator.specialProfileId) {
        return collaborator;
      }
      const ordinaryCollaborator = { ...collaborator };
      delete ordinaryCollaborator.specialProfileId;
      return { ...ordinaryCollaborator, rarity: "ultra-rare" as const };
    }
    return { ...collaborator, rarity: "legendary" as const };
  });

  const encounteredProfileIds = [
    ...(state.legendaryCollaborators?.encounteredProfileIds ?? []),
    ...canonicalContactByProfile.keys(),
  ].filter(isCataloguedLegendaryId);
  const enrolledProfileIds = [
    ...(state.legendaryCollaborators?.enrolledProfileIds ?? []),
    ...contacts.flatMap((contact) =>
      contact.status === "enrolled" && contact.specialProfileId
        ? [contact.specialProfileId]
        : [],
    ),
  ].filter(isCataloguedLegendaryId);
  const legendaryProfileByContactId = new Map(
    contacts.flatMap((contact) => contact.specialProfileId
      ? [[contact.id, contact.specialProfileId] as const]
      : []),
  );
  const activeTrialProfiles = new Set<string>();
  const scheduledTrials = state.scheduledTrials?.filter((trial) => {
    if (trial.status !== "scheduled") return true;
    const profileId = legendaryProfileByContactId.get(trial.contactId);
    if (!profileId) return true;
    if (activeTrialProfiles.has(profileId)) return false;
    activeTrialProfiles.add(profileId);
    return true;
  });

  return {
    ...state,
    contacts,
    collaborators,
    scheduledTrials,
    legendaryCollaborators: state.legendaryCollaborators
      ? {
          ...state.legendaryCollaborators,
          encounteredProfileIds: [...new Set(encounteredProfileIds)],
          enrolledProfileIds: [...new Set(enrolledProfileIds)],
        }
      : state.legendaryCollaborators,
  };
}

export function normalizeLegacySave(state: MigratableState): MigratableState {
  let migrated = state;

  if (migrated.contacts?.some((contact) => contact.email.endsWith(LEGACY_PROSPECT_EMAIL_DOMAIN))) {
    migrated = {
      ...migrated,
      contacts: migrated.contacts.map((contact, index) =>
        contact.email.endsWith(LEGACY_PROSPECT_EMAIL_DOMAIN)
          ? {
              ...contact,
              email: createProspectEmail(
                contact.email.slice(0, -LEGACY_PROSPECT_EMAIL_DOMAIN.length),
                index,
              ),
            }
          : contact,
      ),
    };
  }

  if (migrated.contacts?.some((contact) => /\.\d+@/.test(contact.email))) {
    migrated = {
      ...migrated,
      contacts: migrated.contacts.map((contact) => ({
        ...contact,
        email: contact.email.replace(/\.\d+(?=@)/, ""),
      })),
    };
  }

  if (!migrated.profile) {
    migrated = {
      ...migrated,
      profile: { displayName: "" },
    };
  }

  return normalizeLegendaryAssignments(migrated);
}
