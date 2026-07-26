import type { PreparedGameSaveResult } from "./savePreparation";
import type { GameState } from "./types";

export interface PrepareGameSaveRequest {
  id: number;
  state: GameState;
  gameNow: number;
  wallNow: number;
}

export interface PrepareGameSaveResponse {
  id: number;
  result: PreparedGameSaveResult;
}
