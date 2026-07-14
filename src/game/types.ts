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
  source: "tutorial" | "sparring" | "event" | "social" | "collaborator";
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

export type AcquisitionEventId =
  | "park-sparring"
  | "public-demo"
  | "sports-stand"
  | "local-event"
  | "themed-event"
  | "school-open-day"
  | "organized-flyering";

export interface AcquisitionEvent {
  id: string;
  definitionId: AcquisitionEventId;
  title: string;
  location: string;
  startedAt: number;
  resolvesAt: number;
  cost: number;
  peopleMet: number;
  demonstrationsGiven: number;
  contactReward: number;
  equipmentUsed: number;
  wearAdded: number;
  status: "running" | "completed";
}

export type UpgradeId =
  | "comfortable-keyboard"
  | "outlook-templates"
  | "quick-phrases"
  | "automatic-signature"
  | "smart-fields"
  | "instant-review"
  | "mail-merge"
  | "prepared-presentation"
  | "qr-cards"
  | "coordinated-demo"
  | "recognizable-stand"
  | "order-welcome"
  | "difficult-questions"
  | "not-that-thing"
  | "clear-subject"
  | "personalized-invite"
  | "call-to-action"
  | "collective-review"
  | "testimonials"
  | "convincing-paragraph"
  | "honest-advertising"
  | "welcome-procedure"
  | "tested-intro"
  | "clear-material"
  | "dedicated-helper"
  | "prepared-room"
  | "memorable-experience"
  | "updated-page"
  | "editorial-calendar"
  | "lesson-photos"
  | "demo-video"
  | "weekly-column"
  | "viral-post"
  | "professional-management"
  | "pre-event-check"
  | "maintenance-kit"
  | "organized-rack"
  | "essential-parts"
  | "demo-set"
  | "equipment-register"
  | "all-fixed"
  | "shared-calendar"
  | "collaborator-shifts"
  | "checklist"
  | "registration-form"
  | "order-secretariat"
  | "multi-site-coordination";

export type UpgradeLevels = Record<UpgradeId, number>;

export type AchievementId =
  | "first-email"
  | "first-member"
  | "persistent-invites"
  | "first-event"
  | "hundred-contacts"
  | "first-maintenance"
  | "first-collaborator"
  | "first-form"
  | "thousand-emails"
  | "first-school"
  | "ten-schools"
  | "no-recognizable-reference";

export type NarrativeEventId =
  | "word-of-mouth"
  | "extra-donation"
  | "friends-at-training"
  | "missed-renewal"
  | "unexpected-repair"
  | "calendar-confusion"
  | "spreadsheet-fan-club"
  | "too-many-volunteers"
  | "perfect-rack";

export interface NarrativeEventRecord {
  id: string;
  definitionId: NarrativeEventId;
  title: string;
  occurredAt: number;
  summary: string;
}

export type SchoolSpecialization = "generale" | "redazione" | "eventi" | "accoglienza";

export interface FoundedSchool {
  id: string;
  name: string;
  city: string;
  motto: string;
  specialization: SchoolSpecialization;
  membersAtTransfer: number;
  emailsSent: number;
  eventsCompleted: number;
  transferredAt: number;
}

export interface SchoolFoundationDetails {
  name: string;
  city: string;
  accentColor: string;
  motto: string;
  specialization: SchoolSpecialization;
}

export type CollaboratorAssignment =
  | "writing"
  | "events"
  | "lessons"
  | "social"
  | "equipment"
  | null;

export type FormId =
  | "form-1"
  | "course-x"
  | "form-2"
  | "course-y"
  | "form-3-long"
  | "form-4-long"
  | "form-5-long"
  | "form-3-staff"
  | "form-4-staff"
  | "form-5-staff"
  | "form-3-double"
  | "form-4-double"
  | "form-5-double"
  | "form-6"
  | "form-7";

export interface Collaborator {
  id: string;
  contactId: string;
  displayName: string;
  joinedAt: number;
  forms: FormId[];
  assignment: CollaboratorAssignment;
  training?: {
    formId: FormId;
    startedAt: number;
    completesAt: number;
  };
}

export interface Statistics {
  inputs: number;
  emailsSent: number;
  trialsBooked: number;
  trialsCompleted: number;
  contactsLost: number;
  membersEnrolled: number;
  eurosEarned: number;
  contactsAcquired: number;
  peopleMet: number;
  demonstrationsGiven: number;
  eventsCompleted: number;
  maintenanceCompleted: number;
  collaboratorsRecruited: number;
  automatedCharacters: number;
  socialContacts: number;
  socialCampaigns: number;
  formsCompleted: number;
  narrativeEvents: number;
}

export interface GameState {
  version: number;
  createdAt: number;
  lastSavedAt: number;
  randomSeed: number;
  school: {
    name: string;
    city: string;
    accentColor: string;
    motto: string;
    specialization: SchoolSpecialization;
    activeMembers: number;
    historicMembers: number;
    euros: number;
    nextFeeAt: number;
  };
  player: {
    writingPower: number;
  };
  network: {
    reputation: number;
    schools: FoundedSchool[];
    prestigeOfferSent: boolean;
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
  equipment: {
    totalSwords: number;
    availableSwords: number;
    wear: number;
  };
  collaborators: Collaborator[];
  automation: {
    lastProcessedAt: number;
    writingBuffer: number;
    socialBuffer: number;
    equipmentBuffer: number;
  };
  achievements: AchievementId[];
  narrative: {
    nextEventAt: number;
    history: NarrativeEventRecord[];
  };
  statistics: Statistics;
  unlocks: {
    upgrades: boolean;
    collaborators: boolean;
    social: boolean;
    forms: boolean;
  };
  upgrades: UpgradeLevels;
}

export type GameAction =
  | { type: "WRITE"; now: number }
  | { type: "TICK"; now: number }
  | { type: "REPLACE_STATE"; state: GameState }
  | { type: "FOUND_SCHOOL"; details: SchoolFoundationDetails; now: number }
  | { type: "BUY_UPGRADE"; upgradeId: UpgradeId; now: number }
  | { type: "MARK_MESSAGE_READ"; messageId: string }
  | { type: "MAINTAIN_EQUIPMENT"; now: number }
  | {
      type: "ASSIGN_COLLABORATOR";
      collaboratorId: string;
      assignment: CollaboratorAssignment;
      now: number;
    }
  | { type: "RUN_SOCIAL_CAMPAIGN"; now: number }
  | {
      type: "START_FORM_TRAINING";
      collaboratorId: string;
      formId: FormId;
      now: number;
    }
  | {
      type: "START_ACQUISITION_EVENT";
      definitionId: AcquisitionEvent["definitionId"];
      now: number;
    };
