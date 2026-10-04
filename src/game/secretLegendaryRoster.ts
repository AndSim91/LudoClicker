import { SECRET_LEGENDARIES } from "../content/secretLegendaries";
import { createLegendaryEmailAddress } from "../content/emailAddresses";
import { isCourseXUnlocked } from "../content/upgrades";
import { makeGameId } from "./ids";
import type { Contact, FormId, GameState, SecretLegendaryId } from "./types";

export function getCanonicalSecretForms(
  numericForms: number,
  courseXUnlocked = true,
): FormId[] {
  const result: FormId[] = ["form-1"];
  if (numericForms >= 2) {
    if (courseXUnlocked) result.push("course-x");
    result.push("form-2");
  }
  if (numericForms >= 3) result.push("course-y", "form-3-long");
  if (numericForms >= 4) result.push("form-4-long");
  if (numericForms >= 5) result.push("form-5-long");
  if (numericForms >= 6) result.push("form-6");
  if (numericForms >= 7) result.push("form-7");
  return result;
}

export function createSecretLegendaryContact(
  state: GameState,
  id: SecretLegendaryId,
  now: number,
  status: Contact["status"],
): Contact {
  const existing = state.contacts.find((contact) => contact.secretLegendaryId === id);
  if (existing) return { ...existing, status };
  const profile = SECRET_LEGENDARIES[id];
  // Won in a tournament: always the full canonical profile, whatever an earlier school left.
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
    forms: getCanonicalSecretForms(profile.numericForms, isCourseXUnlocked(state.upgrades)),
    formBranchPreferences: ["Spada Lunga"],
    arenaBase: profile.arenaBase,
    styleBase: profile.styleBase,
    tournamentExperience: profile.externalExperience,
    agonistCourseCompletions: 0,
    agonistCourseArenaBonus: 0,
    agonistCourseStyleBonus: 0,
  };
}
