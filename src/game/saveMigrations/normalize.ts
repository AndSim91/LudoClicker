import { createProspectEmail } from "../../content/prospectDirectory";
import type { MigratableState } from "./types";

const LEGACY_PROSPECT_EMAIL_DOMAIN = "@esempio.test";

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

  return migrated;
}
