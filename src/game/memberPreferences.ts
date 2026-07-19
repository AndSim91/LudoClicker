import type { GameState } from "./types";

export function toggleMemberFavorite(state: GameState, contactId: string): GameState {
  const member = state.contacts.find(
    (contact) =>
      contact.id === contactId &&
      contact.status === "enrolled",
  );
  if (!member) return state;

  return {
    ...state,
    contacts: state.contacts.map((contact) =>
      contact.id === contactId ? { ...contact, favorite: !contact.favorite } : contact,
    ),
  };
}
