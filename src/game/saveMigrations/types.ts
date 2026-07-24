import type { Collaborator, GameState } from "../types";

type LegacyCollaborator = Omit<Collaborator, "assignment" | "mastery"> & {
  assignment: Collaborator["assignment"] | "social" | "lessons";
  autoTeachingEnabled?: boolean;
  mastery?: Partial<NonNullable<Collaborator["mastery"]>> & {
    social?: number;
    lessons?: number;
  };
};

export type MigratableState = Omit<
  Partial<GameState>,
  "activities" | "automation" | "collaborators" | "statistics" | "upgrades"
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
  activities?: Partial<GameState["activities"]> & { nextSparringAt?: number };
};

export type SaveMigrationStage = (state: MigratableState) => MigratableState;
