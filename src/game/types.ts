export type ContactStatus =
  | "available"
  | "writing"
  | "invited"
  | "trialScheduled"
  | "enrolled"
  | "departed"
  | "lost";

export type SpecialCollaboratorId =
  | "andrea-simonazzi"
  | "eva-parodi"
  | "andrea-ferrari"
  | "marco-gabriele-fedozzi"
  | "matteo-scarzello"
  | "chris-usai"
  | "guglielmo-oliveri"
  | "niccolo-efrati"
  | SecretLegendaryId;

export type SecretLegendaryId = "marco-palena" | "lorenzo-todaro";

export type PersonRarity = "common" | "rare" | "ultra-rare" | "legendary";
export type FormBranch = "Spada Lunga" | "Staffa" | "Doppia spada corta";

export interface FormTraining {
  formId: TrainingCourseId;
  startedAt: number;
  completesAt: number;
  instructorId?: string;
  includesInstructorCertification?: boolean;
  instructorTrainingDurationMultiplier?: number;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  source: "tutorial" | "sparring" | "event" | "social" | "collaborator" | "tournament";
  acquiredAt: number;
  status: ContactStatus;
  rarity: PersonRarity;
  specialProfileId?: SpecialCollaboratorId;
  secretLegendaryId?: SecretLegendaryId;
  forms: FormId[];
  arenaBase?: number;
  styleBase?: number;
  tournamentExperience?: number;
  formBranchPreferences?: FormBranch[];
  training?: FormTraining;
  lastFormTrainingYear?: number;
  formTrainingYearCount?: number;
  enrolledMonth?: number;
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
  presentationLevel: EmailPresentationLevel;
  status: "writing" | "sending" | "sent" | "trialBooked" | "lost";
}

export type EmailPresentationLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

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
  secretLegendaryId?: SecretLegendaryId;
}

export interface InboxMessage {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  receivedAt: number;
  tone: "system" | "positive" | "neutral";
  unread: boolean;
  stackCount?: number;
  category?: "focused" | "other";
  threadKey?:
    | "contacts"
    | "members"
    | "departures"
    | "collaborators"
    | "training"
    | "progress"
    | "narrative"
    | "offline"
    | "tournaments";
}

export type AcquisitionEventId =
  | "park-sparring"
  | "public-demo"
  | "sports-stand"
  | "local-event"
  | "themed-event"
  | "school-open-day"
  | "organized-flyering"
  | "burtomics"
  | "genova-comics"
  | "megacon-genova"
  | "lucca-comics"
  | "milan-games-week";

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
  membersUsed: number;
  equipmentUsed: number;
  wearAdded: number;
  collaboratorId?: string;
  status: "running" | "completed";
}

export type UpgradeId =
  | "comfortable-keyboard"
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
  | "spell-check"
  | "professional-email"
  | "personalized-invite"
  | "call-to-action"
  | "email-layout"
  | "winning-advertising"
  | "marketing-course"
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
  | "multi-site-coordination"
  | "instructor-versatility"
  | "technical-arena"
  | "extra-form"
  | "tiamat-instructor";

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
  person?: {
    displayName: string;
    rarity: PersonRarity;
  };
}

export type ShortGoalId =
  | "send-emails"
  | "book-trials"
  | "complete-event"
  | "enroll-member";

export interface ShortGoalProgress {
  definitionId: ShortGoalId;
  baseline: number;
  target: number;
  startedAt: number;
  completedCount: number;
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
  | "instructor"
  | null;

export type CollaboratorMasteryRole = Exclude<CollaboratorAssignment, null>;
export type CollaboratorMastery = Record<CollaboratorMasteryRole, number>;

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

export type TrainingCourseId = FormId | "agonist-course";

export interface Collaborator {
  id: string;
  contactId: string;
  displayName: string;
  joinedAt: number;
  forms: FormId[];
  instructorForms: FormId[];
  formBranchPreferences?: FormBranch[];
  autoTeachingEnabled?: boolean;
  assignment: CollaboratorAssignment;
  mastery?: CollaboratorMastery;
  rarity: PersonRarity;
  specialProfileId?: SpecialCollaboratorId;
  training?: FormTraining;
  lastFormTrainingYear?: number;
  formTrainingYearCount?: number;
}

export interface RetainedLegendaryProgress {
  forms: FormId[];
  instructorForms: FormId[];
  formBranchPreferences?: FormBranch[];
  joinedAt: number;
  lastFormTrainingYear?: number;
  formTrainingYearCount?: number;
}

export interface LegendaryCollaboratorProgress {
  encounteredProfileIds: SpecialCollaboratorId[];
  enrolledProfileIds: SpecialCollaboratorId[];
  enrollmentAttempts: Partial<Record<SpecialCollaboratorId, number>>;
  retainedProgress: Partial<Record<SpecialCollaboratorId, RetainedLegendaryProgress>>;
}

export interface Statistics {
  inputs: number;
  emailsSent: number;
  trialsBooked: number;
  trialsCompleted: number;
  contactsLost: number;
  membersEnrolled: number;
  membersDeparted: number;
  eurosEarned: number;
  contactsAcquired: number;
  peopleMet: number;
  demonstrationsGiven: number;
  eventsCompleted: number;
  maintenanceCompleted: number;
  collaboratorsRecruited: number;
  automatedCharacters: number;
  socialContacts: number;
  socialTrials: number;
  socialCampaigns: number;
  formsCompleted: number;
  narrativeEvents: number;
}

export type TournamentLevel = "school" | "academy" | "national" | "champions";
export type TournamentDiscipline = "arena" | "style";

export interface TournamentParticipant {
  id: string;
  ownedContactId?: string;
  secretLegendaryId?: SecretLegendaryId;
  firstName: string;
  lastName: string;
  schoolName: string;
  city: string;
  rarity: PersonRarity | "secret-legendary";
  numericForms: number;
  experience: number;
  arenaBase: number;
  styleBase: number;
  arenaPreparation: number;
  stylePreparation: number;
  condition: number;
  qualificationDiscipline?: TournamentDiscipline;
}

export interface TournamentMatch {
  id: string;
  stage: "group" | "round64" | "round32" | "round16" | "quarterfinal" | "semifinal" | "bronze" | "final";
  groupIndex?: number;
  participantAId: string;
  participantBId: string;
  arenaScoreA: number;
  arenaScoreB: number;
  styleScoreA: number;
  styleScoreB: number;
  winnerId: string;
}

export interface TournamentGroupStanding {
  participantId: string;
  groupIndex: number;
  wins: number;
  assaultPoints: number;
  styleAverage: number;
  qualified: boolean;
}

export interface TournamentPodiumEntry {
  participantId: string;
  position: 1 | 2 | 3;
  discipline: TournamentDiscipline;
  score: number;
}

export interface TournamentQualifier {
  participantId: string;
  ownedContactId?: string;
  source: TournamentDiscipline;
  rankingPosition: number;
  repechage: boolean;
}

export interface TournamentReward {
  discipline: TournamentDiscipline;
  position: 1 | 2 | 3;
  euros: number;
  contacts: number;
}

export interface TournamentResult {
  id: string;
  level: TournamentLevel;
  season: number;
  completedAt: number;
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
  groupStandings: TournamentGroupStanding[];
  arenaRanking: string[];
  styleRanking: string[];
  arenaPodium: TournamentPodiumEntry[];
  stylePodium: TournamentPodiumEntry[];
  qualifiers: TournamentQualifier[];
  rewards: TournamentReward[];
  secretLegendaryDefeatedIds: SecretLegendaryId[];
}

export interface SecretLegendaryProgress {
  status: "external" | "trial" | "enrolled";
  defeats: number;
  failedTrials: number;
  enrolledContactId?: string;
}

export interface TournamentState {
  results: TournamentResult[];
  missedTournaments: {
    level: TournamentLevel;
    season: number;
    reason: "insufficient-members" | "not-qualified";
  }[];
  qualification?: {
    level: Exclude<TournamentLevel, "school">;
    season: number;
    contactIds: string[];
  };
  immuneContactIds: string[];
  skippedSeasons: number[];
  championsVictoryCurrentSchool: boolean;
}

export interface HistorySourceSummary {
  total: number;
  enrolled: number;
}

export interface HistoryArchive {
  contactsBySource: Record<Contact["source"], HistorySourceSummary>;
  emails: {
    count: number;
    totalWritingMs: number;
  };
  completedTrials: number;
  completedEventsByDefinition: Partial<Record<AcquisitionEventId, number>>;
}

export interface GameState {
  version: number;
  saveCompatibilityVersion: number;
  createdAt: number;
  lastSavedAt: number;
  randomSeed: number;
  profile: {
    displayName: string;
  };
  school: {
    name: string;
    city: string;
    accentColor: string;
    motto: string;
    specialization: SchoolSpecialization;
    activeMembers: number;
    peakActiveMembers: number;
    historicMembers: number;
    euros: number;
    currentMonth: number;
    nextFeeAt: number;
  };
  player: {
    writingPower: number;
  };
  network: {
    reputation: number;
    schools: FoundedSchool[];
    prestigeOfferSent: boolean;
    secretLegendaries: Record<SecretLegendaryId, SecretLegendaryProgress>;
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
    damagedSwords: number;
    wear: number;
  };
  legendaryCollaborators: LegendaryCollaboratorProgress;
  tournaments: TournamentState;
  collaborators: Collaborator[];
  automation: {
    lastProcessedAt: number;
    writingBuffer: number;
    lessonBuffer: number;
    socialBuffer: number;
    equipmentBuffer: number;
    offlineContactBuffer: number;
    agonistCoursesEnabled: boolean;
    lastImprovedAthlete?: string;
  };
  achievements: AchievementId[];
  narrative: {
    nextEventAt: number;
    history: NarrativeEventRecord[];
  };
  shortGoal: ShortGoalProgress;
  statistics: Statistics;
  historyArchive: HistoryArchive;
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
  | { type: "TICK"; now: number; gainMultiplier?: number }
  | { type: "RESUME_FROM_PAUSE"; now: number; elapsedMs: number }
  | { type: "OFFLINE_PASSIVE_PROGRESS"; now: number; elapsedMs: number; rawElapsedMs: number }
  | { type: "REPLACE_STATE"; state: GameState }
  | { type: "ADMIN_ADD_CONTACTS"; amount: number }
  | { type: "ADMIN_ADD_MEMBERS"; amount: number }
  | { type: "ADMIN_ADD_EUROS"; amount: number }
  | { type: "UPDATE_PROFILE_NAME"; displayName: string }
  | { type: "FOUND_SCHOOL"; details: SchoolFoundationDetails; now: number }
  | { type: "BUY_UPGRADE"; upgradeId: UpgradeId; now: number }
  | { type: "MARK_MESSAGE_READ"; messageId: string }
  | { type: "MARK_ALL_MESSAGES_READ" }
  | { type: "MAINTAIN_EQUIPMENT"; now: number }
  | { type: "BUY_OFFICIAL_SWORD"; now: number }
  | {
      type: "ASSIGN_COLLABORATOR";
      collaboratorId: string;
      assignment: CollaboratorAssignment;
      now: number;
    }
  | {
      type: "TOGGLE_INSTRUCTOR_AUTOMATION";
      collaboratorId: string;
      enabled: boolean;
      now: number;
    }
  | {
      type: "TOGGLE_AGONIST_COURSES";
      enabled: boolean;
      now: number;
    }
  | {
      type: "PAY_INSTRUCTOR_CERTIFICATES";
      collaboratorId: string;
      now: number;
    }
  | { type: "RUN_SOCIAL_CAMPAIGN"; now: number }
  | {
      type: "START_FORM_TRAINING";
      personId: string;
      formId: FormId;
      now: number;
    }
  | {
      type: "START_ACQUISITION_EVENT";
      definitionId: AcquisitionEvent["definitionId"];
      now: number;
    };
