import { SPECIAL_COLLABORATORS } from "../../content/specialCollaborators";
import type { MigratableState } from "./types";

/*
 * v110 (09/10/2026): i Leggendari ordinari passano da 75/75 a 80/80. Chi è già
 * in partita sale di +5 e tiene quello che ha guadagnato (Corso Agonisti).
 */
const ORDINARY_IDS = new Set<string>(SPECIAL_COLLABORATORS.map((profile) => profile.id));
const shift = (value: number | undefined) => (value === undefined ? undefined : value + 5);

export function migrateLegendaryBase80State(state: MigratableState): MigratableState {
  if (state.version !== 109) return state;
  const contacts = state.contacts?.map((contact) =>
    contact.rarity === "legendary" && !contact.secretLegendaryId
      ? { ...contact, arenaBase: shift(contact.arenaBase), styleBase: shift(contact.styleBase) }
      : contact);
  const legendaryCollaborators = state.legendaryCollaborators;
  const retainedProgress = legendaryCollaborators?.retainedProgress
    ? Object.fromEntries(Object.entries(legendaryCollaborators.retainedProgress).map(([id, progress]) => [
        id,
        progress && ORDINARY_IDS.has(id)
          ? { ...progress, arenaBase: shift(progress.arenaBase), styleBase: shift(progress.styleBase) }
          : progress,
      ]))
    : undefined;
  return {
    ...state,
    version: 110,
    ...(contacts ? { contacts } : {}),
    ...(legendaryCollaborators && retainedProgress
      ? { legendaryCollaborators: { ...legendaryCollaborators, retainedProgress } }
      : {}),
  };
}
