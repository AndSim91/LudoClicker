import { createLegendaryEmailAddress } from "../../content/emailAddresses";
import type { Contact } from "../types";
import type { MigratableState } from "./types";

function isLegendaryContact(contact: Contact): boolean {
  return contact.rarity === "legendary" ||
    contact.specialProfileId !== undefined ||
    contact.secretLegendaryId !== undefined;
}

export function migrateLegendaryEmailState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 76) return state;

  return {
    ...state,
    version: 77,
    contacts: state.contacts?.map((contact) =>
      isLegendaryContact(contact)
        ? {
            ...contact,
            email: createLegendaryEmailAddress(contact.firstName, contact.lastName),
          }
        : contact
    ),
  };
}
