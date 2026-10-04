import { GAME_CONFIG } from "./config";
import type { CollaboratorAssignment, GameState, ReptileSector } from "./types";

/*
 * The five school sectors and their Reptile bar. Kept apart from the
 * preparation logic so the ordinary work (Redazione, Eventi, Gadget,
 * Attrezzature, Istruttori) can ask «is my bar still open?» without cycles.
 */

export const REPTILE_SECTORS: readonly ReptileSector[] = [
  "social",
  "events",
  "equipment",
  "instructors",
  "gadget",
];

export const REPTILE_SECTOR_LABELS: Record<ReptileSector, string> = {
  social: "Social",
  events: "Eventi",
  equipment: "Attrezzature",
  instructors: "Istruttori",
  gadget: "Gadget",
};

export const REPTILE_ROLE_BY_SECTOR: Record<ReptileSector, Exclude<CollaboratorAssignment, null>> = {
  social: "writing",
  events: "events",
  equipment: "equipment",
  instructors: "instructor",
  gadget: "gadget",
};

export function getReptileSectorForRole(role: CollaboratorAssignment): ReptileSector | undefined {
  return REPTILE_SECTORS.find((sector) => REPTILE_ROLE_BY_SECTOR[sector] === role);
}

/** The sector is still filling its bar: its people work at half pace. */
export function isReptileBarOpen(state: Pick<GameState, "tournaments">, sector: ReptileSector): boolean {
  const bar = state.tournaments.reptile.activeEdition?.bars[sector];
  return Boolean(bar && bar.completedAfterMs === undefined);
}

/** Share of a role's power left to its ordinary work (1 when no bar is open). */
export function getReptileOrdinaryShare(
  state: Pick<GameState, "tournaments">,
  role: CollaboratorAssignment,
): number {
  const sector = getReptileSectorForRole(role);
  return sector && isReptileBarOpen(state, sector) ? 1 - GAME_CONFIG.reptilePreparationShare : 1;
}
