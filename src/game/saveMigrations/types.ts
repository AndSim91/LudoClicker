import type { Collaborator, GameState } from "../types";

type LegacyCollaborator = Omit<Collaborator, "assignment" | "mastery"> & {
  assignment: Collaborator["assignment"] | "social";
  mastery?: Partial<NonNullable<Collaborator["mastery"]>> & { social?: number };
};

export type MigratableState = Omit<
  Partial<GameState>,
  "automation" | "collaborators" | "statistics" | "upgrades"
> & {
  version?: number;
  saveCompatibilityVersion?: number;
  automation?: Partial<GameState["automation"]> & { socialBuffer?: number };
  collaborators?: LegacyCollaborator[];
  statistics?: Partial<GameState["statistics"]> & {
    socialTrials?: number;
    socialCampaigns?: number;
  };
  upgrades?: Record<string, number> & { speedLevel?: number };
};

export type SaveMigrationStage = (state: MigratableState) => MigratableState;
