import {
  UPGRADE_CATEGORIES,
  getRequiredNetworkSchools,
  getUpgradeRequirements,
  type UpgradeCategory,
  type UpgradeDefinition,
} from "../../content/upgrades";
import { GADGET_DEFINITIONS } from "../../content/gadgets";
import type { GameState, SecretUpgradeId } from "../../game/types";
import { getSocialUnlockRequirementLabel } from "../../game/unlocks";

/* What the Upgrade page shows of a node: open, locked (a «?») or completed, and why. */

export type UpgradeStatus = "locked" | "available" | "completed";

export function getCategoryTitle(category: UpgradeCategory): string {
  return UPGRADE_CATEGORIES.find((entry) => entry.id === category)?.title ?? "";
}

export interface UpgradeRequirementRow {
  /** Short line under a locked node («🔒 9 punti in Scrittura»). */
  short: string;
  /** Line in the details window («Si apre con»). */
  full: string;
  met: boolean;
}

/**
 * Everything that opens a node, in display order: points of its branch, then
 * the narrative links (another branch, a node at a given level, a game feature).
 */
export function getUpgradeRequirementRows(state: GameState, definition: UpgradeDefinition): UpgradeRequirementRow[] {
  const rows: UpgradeRequirementRow[] = [];
  for (const requirement of getUpgradeRequirements(state.upgrades, definition)) {
    if (requirement.kind === "points") {
      const branch = getCategoryTitle(requirement.category);
      rows.push({
        short: `${requirement.required} ${requirement.required === 1 ? "punto" : "punti"} in ${branch}`,
        full: `${requirement.required} ${requirement.required === 1 ? "punto" : "punti"} in ${branch} (ne hai ${requirement.current})`,
        met: requirement.met,
      });
    } else {
      const { definition: required, level } = requirement;
      const label = level >= required.maxLevel && required.maxLevel > 1
        ? `${required.title} completo`
        : required.maxLevel === 1
          ? required.title
          : `${required.title} liv. ${level}`;
      rows.push({ short: label, full: label, met: requirement.met });
    }
  }
  for (const unlock of definition.requiredUnlocks ?? []) {
    const met = Boolean(state.unlocks[unlock]);
    if (unlock === "social") rows.push({ short: "Serve il Social", full: `Social sbloccato (${getSocialUnlockRequirementLabel()})`, met });
    else if (unlock === "gadget") rows.push({ short: "Serve il settore Gadget", full: "Settore Gadget sbloccato (vittoria alla Champion's Arena)", met });
    else if (unlock === "forms") rows.push({ short: "Servono le Forme", full: "Centro didattico aperto (Forme)", met });
    else rows.push({ short: "Funzione da sbloccare", full: "Funzione del gioco sbloccata", met });
  }
  const networkSchools = getRequiredNetworkSchools(definition, state.upgrades[definition.id] ?? 0);
  if (networkSchools !== undefined) {
    const one = networkSchools === 1;
    rows.push({
      short: one ? "Fonda un'altra scuola" : `${networkSchools} scuole fondate`,
      full: one ? "Un'altra scuola fondata" : `${networkSchools} scuole fondate`,
      met: state.network.schoolCount >= networkSchools,
    });
  }
  if (definition.requiredGadgetProduct !== undefined) {
    const name = GADGET_DEFINITIONS[definition.requiredGadgetProduct].name;
    rows.push({
      short: `Serve il progetto ${name}`,
      full: `Progetto ${name} sbloccato`,
      met: state.gadgets.products[definition.requiredGadgetProduct].unlocked,
    });
  }
  if (definition.requiredFame > 0) {
    rows.push({
      short: `Fama ${definition.requiredFame}`,
      full: `Fama della scuola ${definition.requiredFame}`,
      met: state.school.fame >= definition.requiredFame,
    });
  }
  return rows;
}

export function getUpgradeLockReason(state: GameState, definition: UpgradeDefinition): string | null {
  if (
    definition.secretHint !== undefined &&
    !state.secretUpgradeDiscoveries.includes(definition.id as SecretUpgradeId)
  ) return "Percorso segreto non ancora scoperto";
  return getUpgradeRequirementRows(state, definition).find((row) => !row.met)?.short ?? null;
}

export function isUpgradeVisible(state: GameState, definition: UpgradeDefinition): boolean {
  return !definition.hidden &&
    (definition.category !== "secrets" ||
      state.secretUpgradeDiscoveries.includes(definition.id as SecretUpgradeId)) &&
    (definition.category !== "social" || state.unlocks.social) &&
    (definition.category !== "gadget" || state.unlocks.gadget) &&
    (definition.category !== "network" || state.network.schoolCount > 0);
}

export function isUpgradeCategoryVisible(state: GameState, category: UpgradeCategory): boolean {
  if (category === "social") return state.unlocks.social;
  if (category === "gadget") return state.unlocks.gadget;
  // Network delle Onde: from the first foundation on.
  if (category === "network") return state.network.schoolCount > 0;
  return true;
}

export function getUpgradeStatus(state: GameState, definition: UpgradeDefinition): UpgradeStatus {
  const level = state.upgrades[definition.id];
  if (level >= definition.maxLevel) return "completed";
  return getUpgradeLockReason(state, definition) ? "locked" : "available";
}

/**
 * A locked node stays a semi-transparent «?»: no name, price or requirement,
 * so the tree keeps its surprises (decision of 06/10/2026, concept Q1). Discovered
 * secret paths keep their own lock, since finding them is the point.
 */
export function isUpgradeHidden(state: GameState, definition: UpgradeDefinition): boolean {
  return definition.category !== "secrets" && getUpgradeStatus(state, definition) === "locked";
}
