import type { Collaborator, GameState } from "../types";

export type MigratableSchool = Partial<GameState["school"]> & {
  /** Campo usato dai salvataggi fino alla versione 64. */
  historicMembers?: number;
  /** Campi usati fino alla versione 90. */
  motto?: string;
  specialization?: string;
};

/** A school left behind as saved up to v90. */
export interface LegacyFoundedSchool {
  id?: string;
  name: string;
  city: string;
  motto?: string;
  specialization?: string;
  membersAtTransfer?: number;
  emailsSent?: number;
  eventsCompleted?: number;
  transferredAt?: number;
  monthlyRent?: number;
  championsWin?: boolean;
  reptileWin?: "reptile" | "superba";
  chroniclesWin?: boolean;
  fame?: number;
}

export type MigratableNetwork = Omit<Partial<GameState["network"]>, "schools" | "reputationUpgrades"> & {
  schools?: LegacyFoundedSchool[];
  reputationUpgrades?: Record<string, number | undefined>;
};

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
  "activities" | "automation" | "collaborators" | "school" | "statistics" | "upgrades" | "network"
> & {
  network?: MigratableNetwork;
  version?: number;
  saveCompatibilityVersion?: number;
  automation?: Partial<GameState["automation"]> & { socialBuffer?: number };
  collaborators?: LegacyCollaborator[];
  school?: MigratableSchool;
  statistics?: Partial<GameState["statistics"]> & {
    socialTrials?: number;
    socialCampaigns?: number;
  };
  upgrades?: Record<string, number> & { speedLevel?: number };
  activities?: Partial<GameState["activities"]> & { nextSparringAt?: number };
};

export type SaveMigrationStage = (state: MigratableState) => MigratableState;
