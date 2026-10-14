import { getFormDefinition, getVisibleForms } from "../../content/forms";
import type { AthleteImmunityStatus } from "../../game/athleteImmunity";
import { GAME_CONFIG } from "../../game/config";
import { getHighestFormLevel, getMemberAnnualDepartureChance } from "../../game/formulas";
import type { FormId, PersonRarity } from "../../game/types";
import type { TrainingOption } from "./TrainingOptionPicker";

export function formatFormPath(forms: FormId[], courseXUnlocked = true): string {
  const visibleForms = getVisibleForms(forms, courseXUnlocked);
  if (visibleForms.length === 0) return "Da iniziare · Forma 1";
  const latest = getFormDefinition(visibleForms.at(-1)!);
  return latest?.longName ?? visibleForms.at(-1)!;
}

/**
 * Permanenza (Andrea, 14/10/2026, concept C3 «Voce delle Onde»): the yearly departure
 * risk as a mood, from 0 (safe this year) to 5. No percentages on screen.
 */
export const PERMANENCE_LABELS = ["Entusiasta", "Affezionato", "Felice", "Indifferente", "Infelice", "Ostile"] as const;

export interface MemberPermanence {
  level: number;
  label: string;
  /** What the tooltip explains: the reason it is safe, or Forma, rarity and protections. */
  detail: string;
}

export function getPermanenceLevel(chance: number): number {
  if (chance < 0.1) return 1;
  if (chance < 0.3) return 2;
  if (chance < 0.5) return 3;
  if (chance < 0.7) return 4;
  return 5;
}

const RARITY_DETAIL: Partial<Record<PersonRarity, string>> = { rare: "Raro", "ultra-rare": "Ultra Raro" };

function getCourseDetail(courseRiskReduction: number): string | null {
  const { form, arenaTecnica, agonist } = GAME_CONFIG.courseDepartureReduction;
  if (courseRiskReduction === agonist) return "Corso Agonisti";
  if (courseRiskReduction === arenaTecnica) return "Arena Tecnica";
  if (courseRiskReduction === form) return "Corso dell'anno";
  return null;
}

export function getMemberPermanence(
  forms: FormId[],
  rarity: PersonRarity,
  immunity: Pick<AthleteImmunityStatus, "annualRollout" | "message" | "courseRiskReduction">,
  chatRiskReduction = 0,
): MemberPermanence {
  if (immunity.annualRollout) {
    return { level: 0, label: PERMANENCE_LABELS[0], detail: immunity.message || "Al sicuro quest'anno" };
  }
  const chance = getMemberAnnualDepartureChance(
    forms,
    rarity,
    1 - (1 - chatRiskReduction) * (1 - immunity.courseRiskReduction),
  );
  const level = getPermanenceLevel(chance);
  const formLevel = getHighestFormLevel(forms);
  const detail = [
    formLevel > 0 ? `Forma ${formLevel}` : "Nessuna Forma",
    RARITY_DETAIL[rarity],
    getCourseDetail(immunity.courseRiskReduction),
    chatRiskReduction > 0 ? "Chat di Gruppo" : null,
  ].filter(Boolean).join(" · ");
  return { level, label: PERMANENCE_LABELS[level], detail };
}

/** La prima Forma non coperta in scuola, altrimenti la prima della lista. */
export function getDefaultTrainingOption<T extends TrainingOption>(options: readonly T[]): T | undefined {
  return options.find((option) => option.coverage === "uncovered") ?? options[0];
}
