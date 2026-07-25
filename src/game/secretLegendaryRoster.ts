import { SECRET_LEGENDARIES } from "../content/secretLegendaries";
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
  const retained = state.legendaryCollaborators.retainedProgress[id];
  return {
    id: makeGameId("secret", now, id),
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: `${id}@chronicles.ludosport`,
    source: "tournament",
    acquiredAt: now,
    status,
    rarity: "legendary",
    specialProfileId: id,
    secretLegendaryId: id,
    forms: [...(retained?.forms ?? getCanonicalSecretForms(
      profile.numericForms,
      isCourseXUnlocked(state.upgrades),
    ))],
    formBranchPreferences: [...(retained?.formBranchPreferences ?? ["Spada Lunga"])],
    arenaBase: retained?.arenaBase ?? profile.arenaBase,
    styleBase: retained?.styleBase ?? profile.styleBase,
    tournamentExperience: retained?.tournamentExperience ?? profile.externalExperience,
    agonistCourseCompletions: retained?.agonistCourseCompletions ?? 0,
    agonistCourseArenaBonus: retained?.agonistCourseArenaBonus ?? 0,
    agonistCourseStyleBonus: retained?.agonistCourseStyleBonus ?? 0,
    lastAgonistCourseYear: retained?.lastAgonistCourseYear,
  };
}
