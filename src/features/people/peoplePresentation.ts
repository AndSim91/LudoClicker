import { getFormDefinition, getVisibleForms } from "../../content/forms";
import { getMemberAnnualDepartureChance } from "../../game/formulas";
import type { FormId, PersonRarity } from "../../game/types";

export function formatFormPath(forms: FormId[], courseXUnlocked = true): string {
  const visibleForms = getVisibleForms(forms, courseXUnlocked);
  if (visibleForms.length === 0) return "Da iniziare · Forma 1";
  const latest = getFormDefinition(visibleForms.at(-1)!);
  return latest?.longName ?? visibleForms.at(-1)!;
}

export function getMemberDepartureRiskLabel(
  forms: FormId[],
  rarity: PersonRarity,
  foundedSchools: number,
): string {
  const annualDepartureChance = getMemberAnnualDepartureChance(forms, rarity, foundedSchools);
  if (annualDepartureChance >= 0.5) return "Rischio abbandono - alto";
  if (annualDepartureChance >= 0.15) return "Rischio abbandono - medio";
  if (annualDepartureChance > 0) return "Rischio abbandono - basso";
  return "Nessun rischio";
}
