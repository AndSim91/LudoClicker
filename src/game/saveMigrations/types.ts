import type { GameState } from "../types";

export type MigratableState = Partial<GameState> & {
  version?: number;
  statistics?: Partial<GameState["statistics"]>;
  upgrades?: Record<string, number> & { speedLevel?: number };
};

export type SaveMigrationStage = (state: MigratableState) => MigratableState;
