import type { SaveFailure } from "./saveDiagnostics";

export type SavePhase = "pending" | "saved" | "error";

export interface GameSaveStatus {
  phase: SavePhase;
  lastSavedAt: number | null;
  nextAutoSaveAt: number;
  error: SaveFailure | null;
}
