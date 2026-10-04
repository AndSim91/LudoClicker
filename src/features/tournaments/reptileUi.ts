import type { IconName } from "../../components/common/Icon";
import type { ReptileSector, ReptileTeam } from "../../game/types";

export const REPTILE_SECTOR_ICONS: Record<ReptileSector, IconName> = {
  social: "megaphone",
  events: "calendar",
  equipment: "wrench",
  instructors: "people",
  gadget: "gift",
};

export const REPTILE_SECTOR_ROLES: Record<ReptileSector, string> = {
  social: "Fa conoscere il torneo e porta follower",
  events: "Logistica: accrediti, orari, tribune",
  equipment: "Spade, tavoli, sedie, nastro delle arene",
  instructors: "Coordinano tutto e preparano gli arbitri",
  gadget: "Gadget dell'evento e trofei",
};

export function reptileTeamLabel(team: ReptileTeam | undefined): string {
  if (!team) return "—";
  return `${team.athletes[0].lastName} / ${team.athletes[1].lastName}`;
}

export function getIncidentsStorageKey(editionId: string): string {
  return `reptile-incidents-${editionId}`;
}

export function readIncidentsAttempt(editionId: string): { score: number; available: number } {
  try {
    const stored = JSON.parse(localStorage.getItem(getIncidentsStorageKey(editionId)) ?? "null") as
      | { score?: number; available?: number }
      | null;
    return { score: Number(stored?.score) || 0, available: Number(stored?.available) || 0 };
  } catch {
    return { score: 0, available: 0 };
  }
}

export function storeIncidentsAttempt(editionId: string, score: number, available: number): void {
  try {
    localStorage.setItem(getIncidentsStorageKey(editionId), JSON.stringify({ score, available }));
  } catch {
    // Storage blocked: a reload would close the attempt at zero.
  }
}

export function clearIncidentsAttempt(editionId: string): void {
  try {
    localStorage.removeItem(getIncidentsStorageKey(editionId));
  } catch {
    // Nothing to clear.
  }
}

/** Whole euros, «7.496 €»: the Reptile never needs cents. */
export function formatReptileEuros(value: number): string {
  return `${Math.round(value).toLocaleString("it-IT")} €`;
}
