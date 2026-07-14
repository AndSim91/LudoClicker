export type ContactStatus =
  | "available"
  | "writing"
  | "invited"
  | "trialScheduled"
  | "enrolled"
  | "lost";

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  source: "tutorial" | "sparring" | "event";
  acquiredAt: number;
  status: ContactStatus;
}

export interface CampaignEmail {
  id: string;
  contactId: string;
  templateId: string;
  subject: string;
  body: string;
  revealedCharacters: number;
  createdAt: number;
  sentAt?: number;
  sendCompletesAt?: number;
  status: "writing" | "sending" | "sent" | "trialBooked" | "lost";
}

export interface PendingEmailOutcome {
  id: string;
  emailId: string;
  contactId: string;
  resolvesAt: number;
  result: "trialBooked" | "lost";
}

export interface ScheduledTrial {
  id: string;
  contactId: string;
  startsAt: number;
  resolvesAt: number;
  resultSeed: number;
  status: "scheduled" | "completed";
}

export interface InboxMessage {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  receivedAt: number;
  tone: "system" | "positive" | "neutral";
  unread: boolean;
}

export interface AcquisitionEvent {
  id: string;
  definitionId: "park-sparring" | "public-demo";
  title: string;
  location: string;
  startedAt: number;
  resolvesAt: number;
  cost: number;
  contactReward: number;
  status: "running" | "completed";
}

export type UpgradeId =
  | "comfortable-keyboard"
  | "prepared-presentation"
  | "clear-subject"
  | "welcome-procedure";

export type UpgradeLevels = Record<UpgradeId, number>;

export interface Statistics {
  inputs: number;
  emailsSent: number;
  trialsBooked: number;
  trialsCompleted: number;
  contactsLost: number;
  membersEnrolled: number;
  eurosEarned: number;
  contactsAcquired: number;
  eventsCompleted: number;
}

export interface GameState {
  version: number;
  createdAt: number;
  lastSavedAt: number;
  randomSeed: number;
  school: {
    name: string;
    activeMembers: number;
    historicMembers: number;
    euros: number;
    nextFeeAt: number;
  };
  player: {
    writingPower: number;
  };
  contacts: Contact[];
  emails: CampaignEmail[];
  pendingEmailOutcomes: PendingEmailOutcome[];
  scheduledTrials: ScheduledTrial[];
  messages: InboxMessage[];
  acquisitionEvents: AcquisitionEvent[];
  activities: {
    nextSparringAt: number;
  };
  statistics: Statistics;
  unlocks: {
    upgrades: boolean;
  };
  upgrades: UpgradeLevels;
}

export type GameAction =
  | { type: "WRITE"; now: number }
  | { type: "TICK"; now: number }
  | { type: "BUY_UPGRADE"; upgradeId: UpgradeId; now: number }
  | { type: "MARK_MESSAGE_READ"; messageId: string }
  | {
      type: "START_ACQUISITION_EVENT";
      definitionId: AcquisitionEvent["definitionId"];
      now: number;
    };
