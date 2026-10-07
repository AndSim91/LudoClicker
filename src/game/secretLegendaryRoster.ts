import {
  SECRET_LEGENDARIES,
  getSecretLegendaryBase,
  getSecretLegendaryForms,
  getSecretLegendarySecondWeapon,
} from "../content/secretLegendaries";
import { createLegendaryEmailAddress } from "../content/emailAddresses";
import { isCourseXUnlocked } from "../content/upgrades";
import { makeGameId } from "./ids";
import type { Contact, GameState, SecretLegendaryId } from "./types";

export function createSecretLegendaryContact(
  state: GameState,
  id: SecretLegendaryId,
  now: number,
  status: Contact["status"],
): Contact {
  const existing = state.contacts.find((contact) => contact.secretLegendaryId === id);
  if (existing) return { ...existing, status };
  const profile = SECRET_LEGENDARIES[id];
  const [arenaBase, styleBase] = getSecretLegendaryBase(id);
  // Won in a tournament: the Forms of their level and their own base values
  // (not the tournament ones), whatever an earlier school left.
  return {
    id: makeGameId("secret", now, id),
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: createLegendaryEmailAddress(profile.firstName, profile.lastName),
    source: "tournament",
    acquiredAt: now,
    status,
    rarity: "legendary",
    specialProfileId: id,
    secretLegendaryId: id,
    forms: getSecretLegendaryForms(id, isCourseXUnlocked(state.upgrades)),
    formBranchPreferences: ["Spada Lunga", getSecretLegendarySecondWeapon(id) === "staff" ? "Staffa" : "Doppia spada corta"],
    arenaBase,
    styleBase,
    // Enters with no tournament experience: it grows with the school (07/10).
    tournamentExperience: 0,
    agonistCourseCompletions: 0,
    agonistCourseArenaBonus: 0,
    agonistCourseStyleBonus: 0,
  };
}
