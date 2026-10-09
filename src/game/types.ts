import type { ReputationSpending, ReputationUpgradeLevels } from "./reputation";
import type { SecretLegendaryId } from "../content/secretLegendaries";
import type { TournamentSchoolId } from "../content/tournamentSchools";

export type { SecretLegendaryId } from "../content/secretLegendaries";

export type ContactStatus =
  "available" | "writing" | "invited" | "trialScheduled" | "enrolled" | "departed" | "lost";

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

export type PersonRarity = "common" | "rare" | "ultra-rare" | "legendary";
export type FormBranch = "Spada Lunga" | "Staffa" | "Doppia spada corta";

export type FormTrainingTrack =
  | "athlete"
  | "combined-instructor"
  | "instructor"
  | "technician"
  | "agonist";

export type FormTrainingStartMode = "standard" | "student-only";

export type FormTrainingPhase = "athlete" | "instructor" | "technician" | "agonist";

export interface FormTraining {
  formId: TrainingCourseId;
  startedAt: number;
  completesAt: number;
  status?: "running" | "waitingForEquipment";
  requestedInstructorId?: string;
  equipmentUsed?: number;
  wearPerSword?: number;
  instructorId?: string;
  technicianId?: string;
  includesInstructorCertification?: boolean;
  trainingTrack?: FormTrainingTrack;
  trainingPhase?: FormTrainingPhase;
  trainingBaseDurationMs?: number;
  trainingDurationMultiplier?: number;
  examFailures?: number;
  instructorTrainingDurationMultiplier?: number;
  agonistCourseSlotsConsumed?: number;
  agonistCourseGrantsStats?: boolean;
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
  lastAgonistCourseYear?: number;
  agonistCourseCompletions?: number;
  agonistCourseArenaBonus?: number;
  agonistCourseStyleBonus?: number;
  enrolledMonth?: number;
  favorite?: boolean;
  /** Un contatto ordinario può ricevere al massimo una seconda prova. */
  trialRetryUsed?: boolean;
}

/** Ordinary available contacts beyond the material limit, oldest first (Fase 7.4). */
export interface AvailableContactPoolEntry {
  source: Contact["source"];
  rarity: Exclude<PersonRarity, "legendary">;
  count: number;
}

/**
 * Ordinary members with no individual history beyond the material limit (Fase 7.5).
 * Only the fields that change a rule are kept; name and stats are rolled again
 * when a member of the group becomes an object.
 */
export interface MemberGroup {
  rarity: Exclude<PersonRarity, "legendary">;
  source: Contact["source"];
  forms: FormId[];
  /** Set only while the enrollment still protects from the yearly departures. */
  recentEnrolledMonth?: number;
  /** Set only while it still counts for this year's courses or protections. */
  lastFormTrainingYear?: number;
  formTrainingYearCount?: number;
  /** Preferred weapons, in order (Corso Y onwards): most members have them. */
  formBranchPreferences?: FormBranch[];
  /** Set only during the training year of their last Corso Agonisti. */
  lastAgonistCourseYear?: number;
  count: number;
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
  status: "writing" | "readyToSend" | "sending" | "sent" | "trialBooked" | "lost";
  /** Level 0: positions of the generated spelling errors, for the underline. */
  typos?: { subject: [number, number][]; body: [number, number][] };
}

export type EmailPresentationLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface WritingFlow {
  meter: number;
  updatedAt: number;
  /** Redazione schools lose the Flusso more slowly (0.5). */
  drainScale?: number;
}

export interface PendingEmailOutcome {
  id: string;
  emailId: string;
  contactId: string;
  resolvesAt: number;
  result: "trialBooked" | "lost";
  tutorialSceneId?: "first-event";
  waitForTutorialEvent?: boolean;
}

export interface ScheduledTrial {
  id: string;
  contactId: string;
  startsAt: number;
  resolvesAt: number;
  resultSeed: number;
  status: "scheduled" | "completed" | "cancelled";
  /** Zero indica una prova garantita avviata senza riservare una spada. */
  equipmentUsed?: number;
  cancellationReason?: "equipment";
  secretLegendaryId?: SecretLegendaryId;
  tutorialSceneId?: "first-event";
}

export interface YearDigestCounts {
  members: number;
  forms: number;
  contacts: number;
  collaborators: number;
  departures: number;
  narrative: number;
  lastNarrative?: string;
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
  /** Riepilogo dell'anno scolastico (4.1, src/game/yearDigest.ts). */
  digest?: YearDigestCounts;
  threadKey?:
    | "contacts"
    | "members"
    | "departures"
    | "collaborators"
    | "training"
    | "progress"
    | "narrative"
    | "offline"
    | "gadget"
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
  | "milan-games-week"
  | "oktoberfest"
  | "kata-sea-waves"
  | "romics"
  | "napoli-comicon"
  | "rai-tv-event"
  | "japan-expo"
  | "gamescom"
  | "san-diego-comic-con"
  | "time-travel"
  | "eldorado"
  | "cthulhu-challenge";

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
  tutorialSceneId?: "first-event";
}

export type AcquisitionEventCooldown =
  | {
      kind: "realtime";
      startedAt: number;
      availableAt: number;
    }
  | {
      kind: "calendar";
      startedMonthPosition: number;
      availableAtMonth: number;
    };

export type UpgradeId =
  | "comfortable-keyboard"
  | "writing-rhythm"
  | "stock-phrases"
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
  | "social-content-synthesis"
  | "social-editorial-plan"
  | "social-content-distribution"
  | "social-sponsorships"
  | "official-supplier"
  | "talent-eye"
  | "e-learning"
  | "event-multiverse"
  | "influencer-project"
  | "busy-calendar"
  | "group-chat"
  | "bring-a-friend"
  | "rhythm-gamer"
  | "deposit-account"
  | "cash-advance"
  | "instructor-exchange"
  | "recommendation-letters"
  | "network-circuit"
  | "masters-roll"
  | "national-sponsor"
  | "network-arena"
  | "legends-visit"
  | "time-is-money"
  | "grand-council"
  | "multitasking"
  | "gadget-event-stall"
  | "pre-event-check"
  | "maintenance-kit"
  | "organized-rack"
  | "essential-parts"
  | "demo-set"
  | "equipment-register"
  | "all-fixed"
  | "shared-calendar"
  | "collaborator-shifts"
  | "standard-procedures"
  | "checklist"
  | "registration-form"
  | "operational-priorities"
  | "training-office"
  | "order-secretariat"
  | "multi-site-coordination"
  | "instructor-versatility"
  | "technical-arena"
  | "sis-accreditation"
  | "cost-of-service"
  | "agonist-course-intensity"
  | "athletic-preparation"
  | "promiscuous-instructor"
  | "extra-form"
  | "tiamat-instructor"
  | "pagosport"
  | "divine-touch"
  | "project-x"
  | "gadget-showcase"
  | "gadget-online-store"
  | "gadget-design-tools"
  | "gadget-revision-lab"
  | "gadget-order-management"
  | "gadget-sales-training"
  | "gadget-cross-selling";

export type UpgradeLevels = Record<UpgradeId, number>;

export type SecretUpgradeId = "project-x" | "divine-touch";

/** An unlocked achievement: "<id>:<tier>" for tiered ones, "<id>" for secrets (src/content/achievements.ts). */
export type AchievementKey = string;

export type NarrativeEventId =
  | "word-of-mouth"
  | "extra-donation"
  | "friends-at-training"
  | "missed-renewal"
  | "unexpected-repair"
  | "calendar-confusion"
  | "new-sabersmith"
  | "black-sword-request"
  | "pini-at-work"
  | "spreadsheet-fan-club"
  | "too-many-volunteers"
  | "perfect-rack"
  | "rancor-den"
  | "thirty-milanese-coins";

/** What an Evento or Imprevisto actually did to the game (pastiglie in La mia giornata). */
export interface NarrativeEffects {
  contacts?: number;
  euros?: number;
  wear?: number;
  damagedSwords?: number;
  repairedSwords?: number;
}

export interface NarrativeEventRecord {
  id: string;
  definitionId: NarrativeEventId;
  title: string;
  occurredAt: number;
  summary: string;
  /** Missing on records saved before 07/10: the definition's values stand in. */
  effects?: NarrativeEffects;
  /** Mancato rinnovo (R13, 07/10): the whole yearly rollout, the same on each of its records. */
  renewal?: { departed: number; before: number };
  person?: {
    displayName: string;
    rarity: PersonRarity;
  };
}

export type ShortGoalId = "send-emails" | "book-trials" | "complete-event" | "enroll-member";

export interface ShortGoalProgress {
  definitionId: ShortGoalId;
  baseline: number;
  target: number;
  startedAt: number;
  completedCount: number;
  isActive: boolean;
  reactivationStartedAt?: number;
}

export interface TutorialProgress {
  completedSceneIds: string[];
  skippedSceneIds: string[];
  triggeredSceneIds?: string[];
}

/** A school left behind, as the map of the network shows it: nothing heavier. */
export interface FoundedSchool {
  name: string;
  city: string;
  /** Fama when it was left; missing for schools left before v91. */
  fame?: number;
}

export interface SchoolFoundationDetails {
  name: string;
  city: string;
}

export type CollaboratorAssignment =
  "writing" | "events" | "equipment" | "instructor" | "gadget" | null;

export type CollaboratorMasteryRole = Exclude<CollaboratorAssignment, null>;
export type CollaboratorMastery =
  Record<Exclude<CollaboratorMasteryRole, "gadget">, number> &
  Partial<Record<"gadget", number>>;

export interface CollaboratorManagementState {
  aggregateViewUnlocked: boolean;
  targets: Record<Exclude<CollaboratorMasteryRole, "gadget">, number> &
    Partial<Record<"gadget", number>>;
  operationalPriorities: CollaboratorMasteryRole[];
  /** ponytail: ignored since «Turni e precedenza» (proposta B); kept only so old saves validate. */
  fallbackAssignments?: Partial<Record<CollaboratorMasteryRole, CollaboratorMasteryRole>>;
  /**
   * «Assegnazione automatica» (4.7): present = on. Effort of each sector, 20
   * per bar notch (0–100); right after switching on, the exact proportions left.
   */
  automaticShares?: Partial<Record<CollaboratorMasteryRole, number>>;
  /** Istruttori moved by the automatic assignment who finish their lessons first: id → next sector. */
  automaticPendingMoves?: Record<string, CollaboratorMasteryRole>;
}

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

export interface TechnicianCourseReservation {
  formId: FormId;
  bookedAt: number;
  eligibleMonth: number;
}

export interface Collaborator {
  id: string;
  contactId: string;
  displayName: string;
  joinedAt: number;
  forms: FormId[];
  instructorForms: FormId[];
  technicianForms?: FormId[];
  technicianCourseReservation?: TechnicianCourseReservation;
  formBranchPreferences?: FormBranch[];
  assignment: CollaboratorAssignment;
  /** ponytail: ignored since «Turni e precedenza» (proposta B); kept only so old saves validate. */
  secondaryAssignment?: CollaboratorAssignment;
  mastery?: CollaboratorMastery;
  rarity: PersonRarity;
  specialProfileId?: SpecialCollaboratorId;
  training?: FormTraining;
  lastFormTrainingYear?: number;
  formTrainingYearCount?: number;
  lastAgonistCourseYear?: number;
}

export interface RetainedLegendaryProgress {
  forms: FormId[];
  instructorForms: FormId[];
  technicianForms?: FormId[];
  formBranchPreferences?: FormBranch[];
  joinedAt: number;
  mastery?: CollaboratorMastery;
  arenaBase?: number;
  styleBase?: number;
  tournamentExperience?: number;
  agonistCourseCompletions?: number;
  agonistCourseArenaBonus?: number;
  agonistCourseStyleBonus?: number;
  lastAgonistCourseYear?: number;
  lastFormTrainingYear?: number;
  formTrainingYearCount?: number;
}

export interface LegendaryCollaboratorProgress {
  encounteredProfileIds: SpecialCollaboratorId[];
  enrolledProfileIds: SpecialCollaboratorId[];
  enrollmentAttempts: Partial<Record<SpecialCollaboratorId, number>>;
  retainedProgress: Partial<Record<SpecialCollaboratorId, RetainedLegendaryProgress>>;
  /** Times each Leggendario joined one of the player's schools, over the whole save (4.2). */
  enrollmentCounts?: Partial<Record<SpecialCollaboratorId, number>>;
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
  socialContentCycles: number;
  socialFollowersGained: number;
  formsCompleted: number;
  narrativeEvents: number;
  /** Trials cancelled for lack of swords; absent before the Pianificazione delle Onde. */
  trialsCancelled?: number;
  /** Euros earned per source (the rest is prizes and bonuses); absent before the Pianificazione. */
  incomeBySource?: Partial<Record<IncomeSource, number>>;
  /** Cumulative counters for the achievements (src/game/career.ts); absent before v87. */
  career?: CareerStatistics;
}

export type IncomeSource = "fees" | "network" | "social" | "gadgets";

/** "council", "foundation", `victory:${level}` or `legendary:${profileId}` (src/game/moments.ts). */
export type MomentKey = string;

export interface CareerStatistics {
  perfectPhrases: number;
  agonistCourses: number;
  nationalTitles: number;
  championsWins: number;
  reptileWins: number;
  chroniclesWins: number;
  reputationEarned: number;
  gadgetsSold: number;
  largestYearlyDeparture: number;
  maxRentPoints: number;
  /** School year (1 = first) of the earliest foundation; absent before any. */
  earliestFoundationYear?: number;
}

export type TournamentLevel = "school" | "academy" | "national" | "champions" | "chronicles";
export type TournamentDiscipline = "arena" | "style";
export type RockPaperScissorsChoice = "rock" | "paper" | "scissors";

export interface TournamentParticipant {
  id: string;
  ownedContactId?: string;
  secretLegendaryId?: SecretLegendaryId;
  schoolId?: TournamentSchoolId;
  firstName: string;
  lastName: string;
  schoolName: string;
  city: string;
  rarity: PersonRarity | "secret-legendary";
  numericForms: number;
  knownFormIds?: FormId[];
  /** Weapon used in the matches; NPCs without it fight with their stable one. */
  weapon?: FormBranch;
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
  stage:
    "group" | "round64" | "round32" | "round16" | "quarterfinal" | "semifinal" | "bronze" | "final";
  groupIndex?: number;
  participantAId: string;
  participantBId: string;
  arenaScoreA: number;
  arenaScoreB: number;
  styleScoreA: number;
  styleScoreB: number;
  /** Schede dei giudici di Stile: atleti della scuola, ed entrambi nella finale con un nostro atleta. */
  styleDetailA?: TournamentStyleDetail;
  styleDetailB?: TournamentStyleDetail;
  /** Cartellino di Stile a fine incontro, per chiunque: −0,5 per ogni sanzione. */
  stylePenaltyA?: StylePenaltyReason;
  stylePenaltyB?: StylePenaltyReason;
  /** Sanzioni sullo stesso cartellino, solo se più di una (assente = 1). */
  stylePenaltyCountA?: number;
  stylePenaltyCountB?: number;
  /** Chi ha preso ogni assalto («abba»): solo nella finale con un nostro atleta. */
  assaults?: string;
  winnerId: string;
}

/** BAS, MOV, DIN, COM, SAPD, GCC, DIF (0–3 a mezzi punti), SOG (0–3), PEN: come in Servizio. */
export type StyleSheet = [
  bas: number,
  mov: number,
  din: number,
  com: number,
  sapd: number,
  gcc: number,
  dif: number,
  sog: number,
  pen: number,
];

export type StylePenaltyReason = "declaration" | "cura" | "rispetto";

export interface TournamentStyleDetail {
  /** Una scheda per giudice, nell'ordine Giudice 1, 2… */
  sheets: StyleSheet[];
  technique?: string;
  highlight?: string;
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

export interface TournamentQualificationAllocation {
  destinationLevel: Exclude<TournamentLevel, "school" | "chronicles">;
  activeMembers: number;
  slotCount: 6 | 12;
}

export type TournamentRewardBonus =
  | { kind: "random-contacts"; amount: number }
  | { kind: "trial"; rarity: "ultra-rare" | "legendary" }
  | { kind: "email"; rarity: "ultra-rare" | "legendary" }
  | { kind: "enrollment"; rarity: "ultra-rare" | "legendary" };

export interface TournamentReward {
  discipline: TournamentDiscipline;
  position: 1 | 2 | 3;
  euros: number;
  /** Optional so tournament results stored by older saves remain compatible. */
  followers?: number;
  /** Preserved for old saves; current rewards use followers instead. */
  contacts: number;
  bonus?: TournamentRewardBonus;
}

export interface SchoolTournamentPreliminary {
  eligibleCount: number;
  selectedContactIds: string[];
  arenaSelectedContactIds: string[];
  styleSelectedContactIds: string[];
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
  schoolPreliminary?: SchoolTournamentPreliminary;
  qualificationAllocation?: TournamentQualificationAllocation;
  vacantQualificationContactIds?: string[];
}

export interface TournamentHallEntry {
  level: TournamentLevel;
  season: number;
  arenaWinner?: string;
  styleWinner?: string;
}

export interface SecretLegendaryProgress {
  status: "external" | "trial" | "enrolled";
  defeats: number;
  failedTrials: number;
  enrolledContactId?: string;
}

export interface ChroniclesHand {
  playerChoice: RockPaperScissorsChoice;
  legendaryChoice: RockPaperScissorsChoice;
  outcome: "player" | "legendary" | "draw";
}

export interface ChroniclesChallenge {
  legendaryId: SecretLegendaryId;
  tournamentResultId: string;
  discipline: TournamentDiscipline;
  queuedDisciplines: TournamentDiscipline[];
  playerWins: number;
  legendaryWins: number;
  hands: ChroniclesHand[];
}

export interface ChroniclesProgress {
  unlocked: boolean;
  keys: number;
  activeChallenge?: ChroniclesChallenge;
}

export type ReptileSector = "social" | "events" | "equipment" | "instructors" | "gadget";

/** «La giornata degli imprevisti»: one attempt per tournament, a bonus on the resa. */
export interface ReptileMinigameProgress {
  status: "ready" | "running" | "completed";
  startedAt?: number;
  score: number;
  /** Points of the perfect day: every trouble solved in one long series. */
  available: number;
  bonusPercent: number;
}

/** One preparation bar: work done and needed, in collaborator power × game months. */
export interface ReptileBar {
  progress: number;
  required: number;
  /** Game time from the organization to the moment the bar filled up. */
  completedAfterMs?: number;
}

export interface ReptileAthlete {
  id: string;
  ownedContactId?: string;
  secretLegendaryId?: SecretLegendaryId;
  firstName: string;
  lastName: string;
  rarity: PersonRarity | "secret-legendary";
  arena: number;
  style: number;
}

export interface ReptileTeam {
  id: string;
  schoolId?: TournamentSchoolId;
  schoolName: string;
  city: string;
  home: boolean;
  athletes: [ReptileAthlete, ReptileAthlete];
  arena: number;
  style: number;
  condition: number;
  tieBreaker: number;
}

export type ReptileKnockoutStage =
  "round16" | "quarterfinal" | "semifinal" | "bronze" | "final";

export interface ReptileMatch {
  id: string;
  phase: "swiss" | ReptileKnockoutStage;
  round: number;
  teamAId: string;
  teamBId: string;
  scoreA: number;
  scoreB: number;
  winnerId: string;
}

export interface ReptileStanding {
  rank: number;
  teamId: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  opponentsWins: number;
  qualified: boolean;
}

export interface ReptileEconomyResult {
  venueCost: number;
  gadgetGross: number;
  requiredSwords: number;
  usedSchoolSwords: number;
  missingSwords: number;
  swordWear: number;
  followersGained: number;
  fameDelta: number;
  fameBefore: number;
  fameAfter: number;
}

export interface ReptileTournamentResult {
  /** Played as Torneo della Superba (tougher field, Corso X for the winner). */
  superba?: boolean;
  id: string;
  schoolYear: number;
  completedAt: number;
  teamCount: number;
  swissRounds: number;
  teams: ReptileTeam[];
  matches: ReptileMatch[];
  standings: ReptileStanding[];
  top16TeamIds: string[];
  podiumTeamIds: [string, string, string, string];
  /** 0–100 per bar, from how fast it filled. */
  sectorQualities: Partial<Record<ReptileSector, number>>;
  /** Average of the bars, before the minigame and the swords. */
  baseResa: number;
  minigameBonusPercent: number;
  /** Final resa (0–100) that sets fame, stall, followers and home couples. */
  resa: number;
  economy: ReptileEconomyResult;
  difficultyMultiplier: number;
}

export interface ReptileActiveEdition {
  id: string;
  organizedAt: number;
  organizedMonth: number;
  teamCount: number;
  /** Game time spent preparing (pause excluded). */
  elapsedMs: number;
  lastProgressAt: number;
  bars: Partial<Record<ReptileSector, ReptileBar>>;
  minigame: ReptileMinigameProgress;
  juneReminderSent?: boolean;
}

export interface ReptileHallEntry {
  schoolYear: number;
  teamId: string;
  schoolName: string;
  athleteNames: [string, string];
  /** Edition played as Torneo della Superba. */
  superba?: boolean;
}

export interface ReptileProgress {
  unlocked: boolean;
  fameXp: number;
  victories: number;
  /** Month of the last tournament held: one per July. */
  lastTournamentMonth?: number;
  activeEdition?: ReptileActiveEdition;
  latestRecap?: ReptileTournamentResult;
  /** The tournament day scene is waiting to be watched. */
  unseenRecap?: boolean;
  hall: ReptileHallEntry[];
}

export interface TournamentState {
  results: TournamentResult[];
  hall: TournamentHallEntry[];
  missedTournaments: {
    level: TournamentLevel;
    season: number;
    reason: "insufficient-members" | "not-qualified";
  }[];
  qualification?: {
    level: Exclude<TournamentLevel, "school">;
    season: number;
    contactIds: string[];
    slotCount?: 6 | 12;
    activeMembersAtQualification?: number;
  };
  immuneContactIds: string[];
  skippedSeasons: number[];
  ordinaryVictoryAchieved: boolean;
  /** school.currentMonth of the first Torneo Scolastico (end of the 1st story stage). */
  firstSchoolTournamentMonth?: number;
  championsVictoryCurrentSchool: boolean;
  /** Accademico titles (Arena or Style) won by the current school: one opens the prestige. */
  academyTitlesCurrentSchool?: number;
  /** National titles (Arena or Style) won by the current school: 2 points of Reputation. */
  nationalTitlesCurrentSchool?: number;
  chroniclesVictoryCurrentSchool?: boolean;
  chronicles: ChroniclesProgress;
  reptile: ReptileProgress;
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

export interface LightInflationEvent {
  cause: string;
  /** Price increase as a fraction (0.1 = +10%). */
  increase: number;
  /** Wall-clock timestamp, shifted only by explicit pauses. */
  occurredAt: number;
  /** Wall-clock deadline for the notification window, suspended while paused. */
  visibleUntil: number;
}

export interface LightInflationState {
  priceMultiplier: number;
  /** Inflazioni di Luce in this school. */
  increases: number;
  /** Swords bought since the last September check. */
  purchasedSwords: number;
  /** Swords owned before the first of those purchases (demand denominator). */
  swordsBeforePurchases: number;
  /** `statistics.eurosEarned` at the last September check (start of the income year). */
  eurosEarnedAtCheck: number;
  /**
   * Absolute September month already checked, so catch-up cannot roll twice.
   * ponytail: the name predates the move to September; renaming needs a save migration.
   */
  lastCheckedJanuaryMonth?: number;
  event?: LightInflationEvent;
}

export type GadgetProductId =
  | "keychain"
  | "sticker-set"
  | "wristband"
  | "mug"
  | "tshirt"
  | "cap"
  | "underwear"
  | "sports-tshirt"
  | "hoodie"
  | "custom-hilt";

export type GadgetRarity =
  | "common"
  | "rare"
  | "ultra-rare"
  | "legendary"
  | "secret-legendary";

export type GadgetWorkKind = "development" | "revision";

export interface GadgetRarityState {
  unlocked: boolean;
  quality: number;
  unitsSold: number;
  /** Vendite oltre il pubblico raggiungibile, escluse dal consumo di domanda futura. */
  extraUnitsSold: number;
  totalProfit: number;
  salesRemainder: number;
}

export interface GadgetProductState {
  unlocked: boolean;
  projectPurchased: boolean;
  prototypeCompleted: boolean;
  accepted: boolean;
  rarities: Record<GadgetRarity, GadgetRarityState>;
}

export interface GadgetMonthlyRevenueState {
  month: number;
  totals: Record<GadgetProductId, number>;
}

export interface GadgetWorkState {
  productId: GadgetProductId;
  kind: GadgetWorkKind;
  rarity: GadgetRarity;
  opportunityRarity?: GadgetRarity;
  completedWorkMs: number;
}

export interface GadgetMinigameState {
  productId: GadgetProductId;
  kind: GadgetWorkKind;
  rarity: GadgetRarity;
  opportunityRarity?: GadgetRarity;
  unlockedRarity?: GadgetRarity;
  seed: number;
  previousQuality: number;
  status: "ready" | "running" | "result";
  score?: number;
}

export interface GadgetState {
  products: Record<GadgetProductId, GadgetProductState>;
  /** One per bench: 1, then 2 or 3 with Multitasking. */
  activeWorks: GadgetWorkState[];
  minigame?: GadgetMinigameState;
  /** Collaudi ready while another one is open: played in order. */
  minigameQueue?: GadgetMinigameState[];
  crossSellRemainder: number;
  crossSellCursor: number;
  monthlyRevenue: GadgetMonthlyRevenueState;
  /** Banchetto agli eventi: sale attempts already used in `month` (cap of the month). */
  eventStall?: { month: number; attempts: number };
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
    activeMembers: number;
    peakActiveMembers: number;
    /** Fee tiers already announced by email in the current school. */
    feeTiersAnnounced?: number;
    fame: number;
    euros: number;
    followers: number;
    currentMonth: number;
    nextFeeAt: number;
  };
  player: {
    writingPower: number;
    /** Manual writing rhythm; absent in saves made before the Flusso existed. */
    flow?: WritingFlow;
    /** Count of Frase perfetta bonuses, used by the UI to spot new ones. */
    perfectPhrases?: number;
    /** Frasi perfette written by Redazione: shown like the player's, never counted for achievements. */
    teamPerfectPhrases?: number;
  };
  network: {
    /** Reputation points still to spend: the only value carried to the next school. */
    reputation: number;
    /** Permanent Reputation upgrades, 0–50 points each (src/game/reputation.ts). */
    reputationUpgrades?: ReputationUpgradeLevels;
    /** Map of the network: the Sede madre and the latest schools left, up to networkMapSchoolsLimit. */
    schools: FoundedSchool[];
    /** Every school left behind, also those no longer on the map. */
    schoolCount: number;
    /** Fixed monthly rent locked with Reputation points, summed over every school left. */
    monthlyRent: number;
    prestigeOfferSent: boolean;
    secretLegendaries: Record<SecretLegendaryId, SecretLegendaryProgress>;
    /** The Reptile has become the Torneo della Superba: permanent, kept by every new school. */
    superbaTournament?: boolean;
    /** Maestria dei gadget: product×rarity reached at 100%, collaudo skipped for good (gadgetRarity.ts). */
    gadgetMastery?: Partial<Record<GadgetProductId, GadgetRarity[]>>;
  };
  contacts: Contact[];
  availableContactPool?: AvailableContactPoolEntry[];
  memberGroups?: MemberGroup[];
  emails: CampaignEmail[];
  pendingEmailOutcomes: PendingEmailOutcome[];
  scheduledTrials: ScheduledTrial[];
  messages: InboxMessage[];
  acquisitionEvents: AcquisitionEvent[];
  activities: {
    eventCooldowns: Partial<Record<AcquisitionEventId, AcquisitionEventCooldown>>;
  };
  equipment: {
    totalSwords: number;
    availableSwords: number;
    damagedSwords: number;
    wear: number;
  };
  lightInflation: LightInflationState;
  gadgets: GadgetState;
  legendaryPity: number;
  legendaryCollaborators: LegendaryCollaboratorProgress;
  tournaments: TournamentState;
  collaborators: Collaborator[];
  collaboratorManagement: CollaboratorManagementState;
  secretUpgradeDiscoveries: SecretUpgradeId[];
  automation: {
    lastProcessedAt: number;
    autoSendEmails: boolean;
    autoTeachingEnabled: boolean;
    /** Speed the player chose with «Il tempo è denaro» (1–5); capped by its level. */
    gameSpeed?: number;
    writingBuffer: number;
    lessonBuffer: number;
    socialContentBuffer: number;
    equipmentBuffer: number;
    equipmentPreparedWork: number;
    offlineContactBuffer: number;
    /** Fraction of a Frase perfetta the collaborators have built up. */
    perfectPhraseBuffer?: number;
    lastImprovedAthlete?: string;
    lastImprovedAthleteId?: string;
  };
  achievements: AchievementKey[];
  /** Riepilogo dell'anno scolastico in corso (4.1): statistics at its start, its message. */
  yearDigest?: {
    schoolYear: number;
    month: number;
    start: Partial<Record<keyof Statistics, number>>;
    messageId?: string;
    narrative?: number;
    lastNarrative?: string;
  };
  /** Animated moments (4.2): each plays once per save; the queue waits to be shown. */
  moments: { seen: MomentKey[]; queue: MomentKey[] };
  narrative: {
    nextEventAt: number;
    history: NarrativeEventRecord[];
  };
  tutorial: TutorialProgress;
  shortGoal: ShortGoalProgress;
  statistics: Statistics;
  historyArchive: HistoryArchive;
  unlocks: {
    upgrades: boolean;
    collaborators: boolean;
    social: boolean;
    forms: boolean;
    /** Tornei opens once with 8 athletes with Forma 1, in every school (08/10/2026). */
    tournaments: boolean;
    gadget: boolean;
  };
  upgrades: UpgradeLevels;
  /** Debito della Pianificazione delle Onde (src/game/debt.ts); absent when the school owes nothing. */
  debt?: SchoolDebt;
  /** Report annuale and Pianificazione delle Onde (src/game/annualReport.ts). */
  annual?: AnnualState;
}

export type AnnualSubject =
  | "enrollment"
  | "loyalty"
  | "teaching"
  | "tournaments"
  | "administration"
  | "finances";
export type AnnualGrade = "A" | "B" | "C" | "D" | "E";

/** Cumulative counters at a point of the year: the report is the difference between two. */
export interface AnnualSnapshot {
  /** Game time and month of the snapshot. */
  at: number;
  month: number;
  activeMembers: number;
  peakActiveMembers: number;
  membersEnrolled: number;
  membersDeparted: number;
  formsCompleted: number;
  trialsCompleted: number;
  trialsCancelled: number;
  eventsCompleted: number;
  eurosEarned: number;
  euros: number;
  income: Partial<Record<IncomeSource, number>>;
  totalSwords: number;
  collaborators: number;
  instructors: number;
  technicians: number;
  schoolCount: number;
  nationalTitles: number;
  championsWins: number;
  reptileEditions: number;
  council: boolean;
  schoolTournamentPlayed: boolean;
  /** Highest level with a title in this school, as a rank (0 = none). */
  bestTitleRank: number;
  legendaries: string[];
}

export interface AnnualMonth {
  month: number;
  earned: number;
  enrolled: number;
}

/** Candidate for the Highlight annuale: categories 1 (story) … 5 (record). */
export interface AnnualMark {
  category: 1 | 2 | 3 | 4 | 5;
  title: string;
  month: number;
  rarity: number;
}

export interface AnnualLedger {
  schoolYear: number;
  start: AnnualSnapshot;
  /** The end of the last month closed, to find what happened in the next one. */
  last: AnnualSnapshot;
  months: AnnualMonth[];
  marks: AnnualMark[];
  /** Contacts by source at the start, for «Da dove arrivano i Contatti». */
  startSources?: Partial<Record<Contact["source"], HistorySourceSummary>>;
}

export interface AnnualGradeRow {
  subject: AnnualSubject;
  text: string;
  /** Absent when the subject has nothing to judge yet (no Forme, no tournaments). */
  grade?: AnnualGrade;
}

export interface AnnualHighlight {
  category: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  /** Game month, absent for the number of the year. */
  month?: number;
  mentions: string[];
}

export interface PlannedCourse {
  formId: FormId;
  track: "instructor" | "technician";
  count: number;
}

/** What the player set in the Pianificazione, still provisional. */
export interface AnnualPlan {
  courses: PlannedCourse[];
  repair: boolean;
  swords: number;
}

export interface AnnualPlanSummary {
  courses: { formId: FormId; track: "instructor" | "technician"; count: number }[];
  repaired: boolean;
  swordsBought: number;
  spent: number;
  borrowed: number;
}

/** The pagella of a closed year, kept until the next one replaces it. */
export interface AnnualReport {
  schoolYear: number;
  /** Game month the report was written (August). */
  month: number;
  grades: AnnualGradeRow[];
  /** Grades of the year before, for the arrows. */
  previousGrades?: Partial<Record<AnnualSubject, AnnualGrade>>;
  highlight?: AnnualHighlight;
  months: AnnualMonth[];
  plan?: AnnualPlanSummary;
}

export interface AnnualState {
  ledger?: AnnualLedger;
  /** Pagella of the last closed year. */
  report?: AnnualReport;
  /** The Pianificazione waits for «Conferma il piano»: the game stays paused. */
  planningOpen?: boolean;
  lastHighlightCategory?: number;
  /** The player switched the yearly Pianificazione off (it can be switched on again). */
  planningDisabled?: boolean;
}

/** Debt from «Anticipo di cassa»: capital still owed, the interest follows the upgrade level. */
export interface SchoolDebt {
  principal: number;
  /** Installments still to pay; 0 with capital left = overdue, the school is blocked. */
  monthsLeft: number;
  /** Game month whose end pays the first installment (September after the Pianificazione). */
  firstMonth: number;
}

export type GameAction =
  | { type: "WRITE"; now: number }
  | { type: "SEND_EMAIL"; now: number }
  | { type: "SET_AUTOMATIC_EMAIL_SENDING"; enabled: boolean; now: number }
  | { type: "SET_AUTOMATIC_TEACHING"; enabled: boolean }
  | {
    type: "TICK";
    now: number;
    /** Real timestamp of this tick; legacy callers fall back to `now`. */
    wallNow?: number;
    gainMultiplier?: number;
    stepBudget?: number;
    /** Maximum number of simultaneous queued operations handled before yielding. */
    workBudget?: number;
    /** Disabled while settling a pause so queued work cannot start another event. */
    allowAutomaticEventStarts?: boolean;
    /** Shortest step: lighter display modes group deadlines over a longer span. */
    minStepMs?: number;
    /** Real milliseconds after which a catch-up yields to the browser (next tick goes on). */
    timeBudgetMs?: number;
  }
  | { type: "RESUME_FROM_PAUSE"; now: number; elapsedMs: number }
  | { type: "REPLACE_STATE"; state: GameState }
  | { type: "ADMIN_ADD_CONTACTS"; amount: number }
  | { type: "ADMIN_ADD_MEMBERS"; amount: number }
  | { type: "ADMIN_ADD_EUROS"; amount: number }
  | { type: "ADMIN_ADD_SWORDS"; amount: number }
  | { type: "ADMIN_RESET_GADGET_SALES" }
  | { type: "ADMIN_ADVANCE_MONTH"; now: number }
  | { type: "ADMIN_SCHEDULE_LEGENDARY_TRIAL"; now: number }
  | { type: "UPDATE_PROFILE_NAME"; displayName: string }
  | { type: "CONFIRM_ANNUAL_PLAN"; plan: AnnualPlan; now: number }
  | { type: "SET_ANNUAL_PLANNING"; enabled: boolean }
  | { type: "FOUND_SCHOOL"; details: SchoolFoundationDetails; now: number; spending?: ReputationSpending }
  | { type: "BUY_UPGRADE"; upgradeId: UpgradeId; now: number }
  | { type: "BUY_ALL_UPGRADES"; now: number }
  | { type: "SET_GAME_SPEED"; speed: number }
  | { type: "START_GADGET_PROJECT"; productId: GadgetProductId; now: number }
  | { type: "START_GADGET_REVISION"; productId: GadgetProductId; now: number }
  | { type: "START_GADGET_MINIGAME"; productId: GadgetProductId }
  | { type: "SKIP_GADGET_MINIGAME"; productId: GadgetProductId }
  | { type: "COMPLETE_GADGET_MINIGAME"; productId: GadgetProductId; score: number }
  | { type: "DISMISS_GADGET_MINIGAME_RESULT"; productId: GadgetProductId }
  | { type: "ACCEPT_GADGET_PRODUCT"; productId: GadgetProductId }
  | { type: "MARK_MESSAGE_READ"; messageId: string }
  | { type: "MARK_ALL_MESSAGES_READ" }
  | { type: "FINISH_TUTORIAL_SCENE"; sceneId: string; skipped: boolean }
  | { type: "DISMISS_MOMENT" }
  | { type: "SET_AUTOMATIC_ASSIGNMENT"; enabled: boolean }
  | { type: "CHANGE_AUTOMATIC_SHARE"; assignment: CollaboratorMasteryRole; level: number }
  | { type: "MAINTAIN_EQUIPMENT"; now: number }
  | { type: "BUY_OFFICIAL_SWORD"; now: number; amount?: number }
  | {
      type: "ASSIGN_COLLABORATOR";
      collaboratorId: string;
      assignment: CollaboratorAssignment;
      now: number;
    }
  | {
      type: "INCREMENT_COLLABORATOR_ASSIGNMENT";
      assignment: CollaboratorMasteryRole;
    }
  | {
      type: "DECREMENT_COLLABORATOR_ASSIGNMENT";
      assignment: CollaboratorMasteryRole;
    }
  | {
      type: "MOVE_OPERATIONAL_PRIORITY";
      assignment: CollaboratorMasteryRole;
      toIndex: number;
    }
  | { type: "TOGGLE_MEMBER_FAVORITE"; contactId: string }
  | { type: "CANCEL_MEMBER_ENROLLMENT"; contactId: string }
  | {
      type: "START_FORM_TRAINING";
      personId: string;
      formId: FormId;
      now: number;
      mode?: FormTrainingStartMode;
    }
  | {
      type: "START_QUICK_TEACHER_TRAINING";
      kind: "instructor" | "technician";
      now: number;
    }
  | {
      type: "BOOK_TECHNICIAN_COURSE";
      collaboratorId: string;
      formId: FormId;
      now: number;
    }
  | {
      type: "START_ACQUISITION_EVENT";
      definitionId: AcquisitionEvent["definitionId"];
      now: number;
    }
  | {
      type: "CANCEL_ACQUISITION_EVENT";
      eventId: string;
      now: number;
    }
  | { type: "START_CHRONICLES_TOURNAMENT"; contactIds: string[]; now: number }
  | {
      type: "PLAY_CHRONICLES_HAND";
      choice: RockPaperScissorsChoice;
      now: number;
    }
  | { type: "ORGANIZE_REPTILE"; now: number }
  | { type: "CANCEL_REPTILE"; now: number }
  | { type: "START_REPTILE_MINIGAME"; now: number }
  | { type: "COMPLETE_REPTILE_MINIGAME"; score: number; available: number; now: number }
  | { type: "DISMISS_REPTILE_RECAP" };
