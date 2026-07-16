import {
  EMAIL_TEMPLATES,
  resolveEmailTemplateCopy,
} from "../content/emailTemplates";
import { getEmailBuildLength } from "../content/emailBuild";
import {
  chooseEmailPresentationLevel,
  getEmailPresentationMix,
} from "../content/emailPresentation";
import { getNewAchievements } from "../content/achievements";
import { getAcquisitionEventDefinition } from "../content/events";
import {
  BRANCH_FORM_IDS,
  FORM_BRANCHES,
  canTrainForm,
  getCollaboratorProductivity,
  getFormDefinition,
  getInstructorFormCost,
  getInstructorQualificationCost,
  getStudentFormCost,
  isInstructorForm,
} from "../content/forms";
import { NARRATIVE_EVENTS } from "../content/narrativeEvents";
import {
  COLLABORATOR_MASTERY_ROLE_LABELS,
  COLLABORATOR_MASTERY_XP,
  createInitialCollaboratorMastery,
  getCollaboratorMasteryDefinition,
  getCollaboratorMasteryLevel,
} from "../content/mastery";
import { createRandomProspect } from "../content/prospectDirectory";
import { PERSON_RARITIES } from "../content/rarities";
import { SPECIAL_COLLABORATORS } from "../content/specialCollaborators";
import {
  SHORT_GOALS,
  createInitialShortGoal,
  createNextShortGoal,
  getShortGoalProgress,
  getShortGoalReward,
} from "../content/shortGoals";
import {
  createInitialUpgradeLevels,
  getUpgradeCost,
  getUpgradeDefinition,
  getUpgradeEffectTotal,
} from "../content/upgrades";
import {
  getSchoolYear,
  getSchoolYearStartMonth,
  isSchoolYearDepartureMonth,
  isSummerBreak,
} from "./calendar";
import { GAME_CONFIG } from "./config";
import {
  applyEquipmentWear,
  applySwordDamage,
  getAvailableSwords,
  getEquipmentMaintenanceCost,
  synchronizeEquipmentAvailability,
} from "./equipment";
import { addInboxMessage } from "./messages";
import {
  getEmailBookingChance,
  getEnrollmentChance,
  getEventFunnelOutcome,
  getMemberAnnualDepartureChance,
  getWritingPower,
} from "./formulas";
import { nextRandom, randomBetween } from "./random";
import {
  selectActiveEmail,
  selectAvailableEventMembers,
  selectAvailableInstructor,
  selectIncomePerMonth,
  selectInstructorTeachingCount,
} from "./selectors";
import type {
  CampaignEmail,
  Contact,
  AcquisitionEvent,
  GameAction,
  GameState,
  InboxMessage,
  PendingEmailOutcome,
  ScheduledTrial,
  UpgradeId,
  CollaboratorAssignment,
  FormId,
  SchoolFoundationDetails,
  SpecialCollaboratorId,
  LegendaryCollaboratorProgress,
  FormBranch,
} from "./types";

const euroFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

function scaleCurrencyGain(amount: number, gainMultiplier: number): number {
  return Math.round(amount * Math.max(0, gainMultiplier) * 100) / 100;
}

function scaleContactGain(
  state: GameState,
  amount: number,
  gainMultiplier: number,
): { state: GameState; amount: number } {
  if (gainMultiplier >= 1) return { state, amount };

  const total = state.automation.offlineContactBuffer + amount * Math.max(0, gainMultiplier);
  const scaledAmount = Math.floor(total + Number.EPSILON);
  return {
    state: {
      ...state,
      automation: {
        ...state.automation,
        offlineContactBuffer: total - scaledAmount,
      },
    },
    amount: scaledAmount,
  };
}

function makeId(prefix: string, now: number, suffix: number | string): string {
  return `${prefix}-${now.toString(36)}-${suffix}`;
}

function chooseOrdinaryRarity(seed: number) {
  const [rarityRoll, nextSeed] = nextRandom(seed);
  return {
    rarity: rarityRoll < PERSON_RARITIES.rare.queueAppearanceChance
      ? "rare" as const
      : "common" as const,
    nextSeed,
  };
}

export function getLegendaryAppearanceChance(foundedSchools: number): number {
  return PERSON_RARITIES.legendary.queueAppearanceChance *
    (foundedSchools > 0
      ? GAME_CONFIG.subsequentSchoolLegendaryAppearanceMultiplier
      : 1);
}

function chooseLegendaryProfile(
  seed: number,
  progress: LegendaryCollaboratorProgress,
  foundedSchools: number,
) {
  const [appearanceRoll, seedAfterAppearance] = nextRandom(seed);
  if (appearanceRoll >= getLegendaryAppearanceChance(foundedSchools)) {
    return { profile: undefined, nextSeed: seedAfterAppearance };
  }
  const candidates = SPECIAL_COLLABORATORS.filter((profile) =>
    !progress.enrolledProfileIds.includes(profile.id),
  );
  if (candidates.length === 0) return { profile: undefined, nextSeed: seedAfterAppearance };
  if (candidates.length === 1) return { profile: candidates[0], nextSeed: seedAfterAppearance };
  const [profileRoll, nextSeed] = nextRandom(seedAfterAppearance);
  return {
    profile: candidates[Math.min(candidates.length - 1, Math.floor(profileRoll * candidates.length))],
    nextSeed,
  };
}

function createContacts(
  now: number,
  seed: number,
  existingProgress: LegendaryCollaboratorProgress,
): { contacts: Contact[]; nextSeed: number; progress: LegendaryCollaboratorProgress } {
  let nextSeed = seed;
  let progress = existingProgress;
  const contacts = Array.from({ length: GAME_CONFIG.initialContacts }, (_, index) => {
    let legendaryProfile: (typeof SPECIAL_COLLABORATORS)[number] | undefined;
    if (index >= 8) {
      const selected = chooseLegendaryProfile(nextSeed, progress, 0);
      legendaryProfile = selected.profile;
      nextSeed = selected.nextSeed;
    }
    if (legendaryProfile) {
      progress = addLegendaryEncounter(progress, legendaryProfile.id);
    }
    const ordinary = legendaryProfile
      ? undefined
      : chooseOrdinaryRarity(nextSeed);
    if (ordinary) nextSeed = ordinary.nextSeed;
    const generated = createRandomProspect(nextSeed, legendaryProfile);
    const { firstName, lastName, email } = generated;
    return {
      id: makeId("contact", now, index),
      firstName,
      lastName,
      email,
      source: "tutorial" as const,
      acquiredAt: now,
      status: index === 0 ? "writing" as const : "available" as const,
      rarity: legendaryProfile ? "legendary" as const : ordinary!.rarity,
      specialProfileId: legendaryProfile?.id,
      forms: legendaryProfile
        ? [...(progress.retainedProgress[legendaryProfile.id]?.forms ?? [])]
        : [],
      formBranchPreferences: legendaryProfile
        ? [...(progress.retainedProgress[legendaryProfile.id]?.formBranchPreferences ?? [])]
        : [],
      lastFormTrainingYear: legendaryProfile
        ? progress.retainedProgress[legendaryProfile.id]?.lastFormTrainingYear
        : undefined,
    };
  });
  return { contacts, nextSeed, progress };
}

function createCampaign(
  contact: Contact,
  campaignIndex: number,
  now: number,
  senderName: string,
  presentationLevel: CampaignEmail["presentationLevel"] = 0,
): CampaignEmail {
  const template = EMAIL_TEMPLATES[campaignIndex % EMAIL_TEMPLATES.length];
  const copy = resolveEmailTemplateCopy(
    template,
    contact.firstName,
    senderName,
    presentationLevel,
  );
  return {
    id: makeId("email", now, campaignIndex),
    contactId: contact.id,
    templateId: template.id,
    subject: copy.subject,
    body: copy.body,
    revealedCharacters: 0,
    createdAt: now,
    presentationLevel,
    status: "writing",
  };
}

function systemMessage(now: number): InboxMessage {
  return {
    id: makeId("message", now, "welcome"),
    sender: "Sistema Oggetto: Nuovi Iscritti",
    subject: "Benvenuto! Inizia da qui",
    preview: "Completa il messaggio aperto: ogni tasto inserisce il prossimo carattere.",
    receivedAt: now,
    tone: "system",
    unread: true,
  };
}

export function createInitialState(
  now = Date.now(),
  displayName = "",
  _legacyIncludeAndrea = true,
  existingLegendaryProgress?: LegendaryCollaboratorProgress,
): GameState {
  void _legacyIncludeAndrea;
  const initialSeed = (now ^ 0x5f3759df) | 0;
  const legendaryProgress = existingLegendaryProgress ?? {
    encounteredProfileIds: [],
    enrolledProfileIds: [],
    enrollmentAttempts: {},
    retainedProgress: {},
  };
  const initialContacts = createContacts(
    now,
    initialSeed,
    legendaryProgress,
  );
  const contacts = initialContacts.contacts;
  return {
    version: GAME_CONFIG.version,
    createdAt: now,
    lastSavedAt: now,
    randomSeed: initialContacts.nextSeed,
    profile: { displayName },
    school: {
      name: "Ordine delle Onde — Genova",
      city: "Genova",
      accentColor: "#0f6cbd",
      motto: "Ogni onda comincia da un movimento",
      specialization: "generale",
      activeMembers: 0,
      peakActiveMembers: 0,
      historicMembers: 0,
      euros: 0,
      currentMonth: 9,
      nextFeeAt: now + GAME_CONFIG.gameMonthMs,
    },
    player: { writingPower: 1 },
    network: { reputation: 0, schools: [], prestigeOfferSent: false },
    contacts,
    emails: [createCampaign(contacts[0], 0, now, displayName)],
    pendingEmailOutcomes: [],
    scheduledTrials: [],
    messages: [systemMessage(now)],
    acquisitionEvents: [],
    achievements: [],
    narrative: {
      nextEventAt: now + GAME_CONFIG.narrativeEventMinMs,
      history: [],
    },
    shortGoal: createInitialShortGoal(now),
    activities: { nextSparringAt: now },
    equipment: {
      totalSwords: GAME_CONFIG.initialSwords,
      availableSwords: GAME_CONFIG.initialSwords,
      damagedSwords: 0,
      wear: 0,
    },
    legendaryCollaborators: initialContacts.progress,
    collaborators: [],
    automation: {
      lastProcessedAt: now,
      writingBuffer: 0,
      socialBuffer: 0,
      equipmentBuffer: 0,
      offlineContactBuffer: 0,
    },
    statistics: {
      inputs: 0,
      emailsSent: 0,
      trialsBooked: 0,
      trialsCompleted: 0,
      contactsLost: 0,
      membersEnrolled: 0,
      membersDeparted: 0,
      eurosEarned: 0,
      contactsAcquired: 0,
      peopleMet: 0,
      demonstrationsGiven: 0,
      eventsCompleted: 0,
      maintenanceCompleted: 0,
      collaboratorsRecruited: 0,
      automatedCharacters: 0,
      socialContacts: 0,
      socialCampaigns: 0,
      formsCompleted: 0,
      narrativeEvents: 0,
    },
    unlocks: { upgrades: false, collaborators: false, social: false, forms: false },
    upgrades: createInitialUpgradeLevels(),
  };
}

function createAcquiredContacts(
  state: GameState,
  count: number,
  source: "sparring" | "event" | "social" | "collaborator",
  now: number,
): { contacts: Contact[]; nextSeed: number } {
  let nextSeed = state.randomSeed;
  let progress = state.legendaryCollaborators;
  const contacts = Array.from({ length: count }, (_, index) => {
    const sequence = state.statistics.contactsAcquired + index;
    const queuePosition = state.contacts.length + index + 1;
    const selected = queuePosition >= 9
        ? chooseLegendaryProfile(nextSeed, progress, state.network.schools.length)
        : { profile: undefined, nextSeed };
    const specialProfile = selected.profile;
    nextSeed = selected.nextSeed;
    if (specialProfile) progress = addLegendaryEncounter(progress, specialProfile.id);
    const ordinary = specialProfile ? undefined : chooseOrdinaryRarity(nextSeed);
    if (ordinary) nextSeed = ordinary.nextSeed;
    const generated = createRandomProspect(nextSeed, specialProfile);
    const { firstName, lastName, email } = generated;
    const retained = specialProfile
      ? progress.retainedProgress[specialProfile.id]
      : undefined;
    return {
      id: makeId("contact", now, `acquired-${sequence}`),
      firstName,
      lastName,
      email,
      source,
      acquiredAt: now,
      status: "available" as const,
      rarity: specialProfile ? "legendary" as const : ordinary!.rarity,
      specialProfileId: specialProfile?.id,
      forms: [...(retained?.forms ?? [])],
      formBranchPreferences: [...(retained?.formBranchPreferences ?? [])],
      lastFormTrainingYear: retained?.lastFormTrainingYear,
    };
  });
  return { contacts, nextSeed };
}

function addLegendaryEncounter(
  progress: LegendaryCollaboratorProgress,
  profileId: SpecialCollaboratorId,
): LegendaryCollaboratorProgress {
  if (progress.encounteredProfileIds.includes(profileId)) return progress;
  return {
    ...progress,
    encounteredProfileIds: [...progress.encounteredProfileIds, profileId],
  };
}

function addLegendaryEncounters(
  progress: LegendaryCollaboratorProgress,
  contacts: Contact[],
): LegendaryCollaboratorProgress {
  let nextProgress = progress;
  for (const contact of contacts) {
    if (contact.specialProfileId) {
      nextProgress = addLegendaryEncounter(nextProgress, contact.specialProfileId);
    }
  }
  return nextProgress;
}

export function getLegendaryEnrollmentChance(state: GameState, profileId: SpecialCollaboratorId) {
  const previousAttempts = state.legendaryCollaborators.enrollmentAttempts[profileId] ?? 0;
  return getEnrollmentChance(state, "legendary", previousAttempts);
}

function addMessage(
  state: GameState,
  now: number,
  subject: string,
  preview: string,
  tone: InboxMessage["tone"] = "positive",
  category: NonNullable<InboxMessage["category"]> = "focused",
  threadKey?: InboxMessage["threadKey"],
): GameState {
  const message: InboxMessage = {
    id: makeId("message", now, state.messages.length),
    sender: "Ordine delle Onde",
    subject,
    preview,
    receivedAt: now,
    tone,
    unread: true,
    category,
    threadKey,
  };
  return { ...state, messages: addInboxMessage(state.messages, message) };
}

function addCollaboratorMasteryExperience(
  state: GameState,
  role: CollaboratorAssignment,
  amount: number,
  now: number,
): GameState {
  if (!role || !Number.isFinite(amount) || amount <= 0) return state;

  const leveledUp: Array<{ displayName: string; levelName: string; multiplier: number }> = [];
  const nextState: GameState = {
    ...state,
    collaborators: state.collaborators.map((collaborator) => {
      if (collaborator.assignment !== role) return collaborator;
      const mastery = collaborator.mastery ?? createInitialCollaboratorMastery();
      const currentXp = Math.max(0, mastery[role] ?? 0);
      const nextXp = currentXp + amount;
      if (getCollaboratorMasteryLevel(nextXp) > getCollaboratorMasteryLevel(currentXp)) {
        const definition = getCollaboratorMasteryDefinition(nextXp);
        leveledUp.push({
          displayName: collaborator.displayName,
          levelName: definition.name,
          multiplier: definition.multiplier,
        });
      }
      return {
        ...collaborator,
        mastery: { ...mastery, [role]: nextXp },
      };
    }),
  };

  return leveledUp.reduce(
    (currentState, collaborator) => addMessage(
      currentState,
      now,
      `Maestria raggiunta: ${collaborator.displayName}`,
      `${collaborator.displayName} è ora ${collaborator.levelName} in ${COLLABORATOR_MASTERY_ROLE_LABELS[role]}. Bonus del settore: +${Math.round(collaborator.multiplier * 100)}%.`,
      "positive",
      "other",
      "collaborators",
    ),
    nextState,
  );
}

function recruitCollaborator(state: GameState, contact: Contact, now: number): GameState {
  if (
    contact.rarity === "common" ||
    state.collaborators.some((collaborator) => collaborator.contactId === contact.id)
  ) return state;

  const retained = contact.specialProfileId
    ? state.legendaryCollaborators.retainedProgress[contact.specialProfileId]
    : undefined;
  const collaborator = {
    id: makeId("collaborator", now, state.collaborators.length),
    contactId: contact.id,
    displayName: `${contact.firstName} ${contact.lastName}`,
    joinedAt: retained?.joinedAt ?? now,
    forms: [...(retained?.forms ?? contact.forms)],
    instructorForms: [...(retained?.instructorForms ?? [])],
    formBranchPreferences: [
      ...(retained?.formBranchPreferences ?? contact.formBranchPreferences ?? []),
    ],
    autoTeachingEnabled: true,
    assignment: null,
    mastery: createInitialCollaboratorMastery(),
    rarity: contact.rarity,
    specialProfileId: contact.specialProfileId,
    lastFormTrainingYear: retained?.lastFormTrainingYear ?? contact.lastFormTrainingYear,
  };
  const nextState: GameState = {
    ...state,
    collaborators: [...state.collaborators, collaborator],
    unlocks: { ...state.unlocks, collaborators: true },
    statistics: {
      ...state.statistics,
      collaboratorsRecruited: state.statistics.collaboratorsRecruited + 1,
    },
  };
  const power = contact.rarity === "legendary"
    ? " Il suo potere VIP raddoppia l'efficacia di ogni incarico."
    : "";
  return addMessage(
    nextState,
    now + 1,
    "Nuovo collaboratore disponibile",
    `${collaborator.displayName} è disponibile per Redazione, Eventi, Lezioni, Social, Attrezzatura o come Istruttore.${power}`,
    "positive",
    "focused",
    "collaborators",
  );
}

function startNextCampaign(state: GameState, now: number): GameState {
  if (selectActiveEmail(state)) return state;
  const nextContact = state.contacts.find((contact) => contact.status === "available");
  if (!nextContact) return state;

  const mix = getEmailPresentationMix(state.upgrades);
  let presentationLevel = mix.newLevel;
  let randomSeed = state.randomSeed;
  if (mix.newCatalogShare > 0 && mix.newCatalogShare < 1) {
    const [roll, nextSeed] = nextRandom(randomSeed);
    presentationLevel = chooseEmailPresentationLevel(state.upgrades, roll);
    randomSeed = nextSeed;
  }
  const email = createCampaign(
    nextContact,
    state.emails.length,
    now,
    state.profile.displayName,
    presentationLevel,
  );
  return {
    ...state,
    randomSeed,
    contacts: state.contacts.map((contact) =>
      contact.id === nextContact.id ? { ...contact, status: "writing" } : contact,
    ),
    emails: [...state.emails, email],
  };
}

function finalizeEmail(state: GameState, emailId: string, now: number): GameState {
  const email = state.emails.find((candidate) => candidate.id === emailId);
  if (!email || email.status !== "sending") return state;

  const [bookingRoll, afterRoll] = nextRandom(state.randomSeed);
  const [outcomeDelay, nextSeed] = randomBetween(
    afterRoll,
    GAME_CONFIG.emailOutcomeMinMs,
    GAME_CONFIG.emailOutcomeMaxMs,
  );
  const guaranteedTutorialBooking = state.statistics.emailsSent === 0;
  const recentEmailResults = state.emails
    .slice()
    .reverse()
    .filter((candidate) => candidate.status === "lost" || candidate.status === "trialBooked");
  const emailLossStreak = recentEmailResults.findIndex((candidate) => candidate.status !== "lost");
  const protectedBooking =
    (emailLossStreak === -1 ? recentEmailResults.length : emailLossStreak) >= 4;
  const result =
    guaranteedTutorialBooking || protectedBooking ||
      bookingRoll < getEmailBookingChance(state)
      ? "trialBooked"
      : "lost";
  const outcome: PendingEmailOutcome = {
    id: makeId("outcome", now, state.pendingEmailOutcomes.length),
    emailId: email.id,
    contactId: email.contactId,
    resolvesAt: now + outcomeDelay,
    result,
  };

  let nextState: GameState = {
    ...state,
    randomSeed: nextSeed,
    emails: state.emails.map((candidate) =>
      candidate.id === email.id
        ? { ...candidate, status: "sent", sentAt: now, sendCompletesAt: undefined }
        : candidate,
    ),
    contacts: state.contacts.map((contact) =>
      contact.id === email.contactId ? { ...contact, status: "invited" } : contact,
    ),
    pendingEmailOutcomes: [...state.pendingEmailOutcomes, outcome],
    statistics: { ...state.statistics, emailsSent: state.statistics.emailsSent + 1 },
  };
  nextState = startNextCampaign(nextState, now);
  if (state.statistics.emailsSent === 0) {
    nextState = addMessage(
      nextState,
      now,
      "Configurazione campagna completata",
      "Hai inviato la tua prima email! Il sistema registrerà eventuali risposte e appuntamenti automaticamente senza interrompere la stesura delle tue prossime email",
      "system",
    );
  }
  if (state.statistics.emailsSent === 2) {
    nextState = addMessage(
      nextState,
      now + 1,
      "Ufficio Eventi disponibile",
      "La prima tornata di inviti è sufficiente per aprire l'organizzazione delle attività esterne. La nuova area è comparsa nella barra laterale.",
      "system",
    );
  }
  return nextState;
}

function resolveEmailOutcome(
  state: GameState,
  outcome: PendingEmailOutcome,
  now: number,
): GameState {
  if (!state.pendingEmailOutcomes.some((candidate) => candidate.id === outcome.id)) return state;

  let nextState: GameState = {
    ...state,
    pendingEmailOutcomes: state.pendingEmailOutcomes.filter(
      (candidate) => candidate.id !== outcome.id,
    ),
  };

  if (outcome.result === "lost") {
    return {
      ...nextState,
      contacts: nextState.contacts.map((contact) =>
        contact.id === outcome.contactId ? { ...contact, status: "lost" } : contact,
      ),
      emails: nextState.emails.map((email) =>
        email.id === outcome.emailId ? { ...email, status: "lost" } : email,
      ),
      statistics: {
        ...nextState.statistics,
        contactsLost: nextState.statistics.contactsLost + 1,
      },
    };
  }

  const [trialWait, seedAfterWait] = randomBetween(
    nextState.randomSeed,
    GAME_CONFIG.trialWaitMinMs,
    GAME_CONFIG.trialWaitMaxMs,
  );
  const [resultSeed, nextSeed] = nextRandom(seedAfterWait);
  const startsAt = now + trialWait;
  const trial: ScheduledTrial = {
    id: makeId("trial", now, nextState.scheduledTrials.length),
    contactId: outcome.contactId,
    startsAt,
    resolvesAt: startsAt + GAME_CONFIG.trialDurationMs,
    resultSeed: Math.floor(resultSeed * 2_147_483_647),
    status: "scheduled",
  };
  nextState = {
    ...nextState,
    randomSeed: nextSeed,
    contacts: nextState.contacts.map((contact) =>
      contact.id === outcome.contactId ? { ...contact, status: "trialScheduled" } : contact,
    ),
    emails: nextState.emails.map((email) =>
      email.id === outcome.emailId ? { ...email, status: "trialBooked" } : email,
    ),
    scheduledTrials: [...nextState.scheduledTrials, trial],
    statistics: {
      ...nextState.statistics,
      trialsBooked: nextState.statistics.trialsBooked + 1,
    },
  };
  return nextState;
}

function resolveTrial(
  state: GameState,
  trial: ScheduledTrial,
  now: number,
  gainMultiplier: number,
): GameState {
  if (trial.status !== "scheduled") return state;
  const [enrollmentRoll] = nextRandom(trial.resultSeed);
  const tutorialGuarantee = state.school.historicMembers === 0;
  const trialContact = state.contacts.find((contact) => contact.id === trial.contactId);
  const specialProfileId = trialContact?.specialProfileId;
  const alreadyEnrolledLegendary = specialProfileId
    ? state.legendaryCollaborators.enrolledProfileIds.includes(specialProfileId)
    : false;
  const recentTrials = state.scheduledTrials
    .filter((candidate) => candidate.status === "completed")
    .slice()
    .sort((a, b) => b.resolvesAt - a.resolvesAt);
  const trialLossStreak = recentTrials.findIndex((candidate) =>
    state.contacts.some((contact) => contact.id === candidate.contactId && contact.status === "enrolled"),
  );
  const protectedEnrollment =
    (trialLossStreak === -1 ? recentTrials.length : trialLossStreak) >= 4;
  const enrolled = specialProfileId
    ? !alreadyEnrolledLegendary &&
      enrollmentRoll < getLegendaryEnrollmentChance(state, specialProfileId)
    : tutorialGuarantee || protectedEnrollment ||
      enrollmentRoll < getEnrollmentChance(state, trialContact?.rarity ?? "common");
  const enrollmentBonus = scaleCurrencyGain(GAME_CONFIG.enrollmentBonus, gainMultiplier);
  const legendaryCollaborators = specialProfileId
    ? {
        ...state.legendaryCollaborators,
        enrollmentAttempts: {
          ...state.legendaryCollaborators.enrollmentAttempts,
          [specialProfileId]:
            (state.legendaryCollaborators.enrollmentAttempts[specialProfileId] ?? 0) + 1,
        },
        enrolledProfileIds: enrolled
          ? [...new Set([...state.legendaryCollaborators.enrolledProfileIds, specialProfileId])]
          : state.legendaryCollaborators.enrolledProfileIds,
      }
    : state.legendaryCollaborators;
  let nextState: GameState = {
    ...state,
    legendaryCollaborators,
    scheduledTrials: state.scheduledTrials.map((candidate) =>
      candidate.id === trial.id ? { ...candidate, status: "completed" } : candidate,
    ),
    contacts: state.contacts.map((contact) =>
      contact.id === trial.contactId
        ? {
            ...contact,
            status: enrolled ? "enrolled" : "lost",
            enrolledMonth: enrolled ? state.school.currentMonth : undefined,
          }
        : contact,
    ),
    statistics: {
      ...state.statistics,
      trialsCompleted: state.statistics.trialsCompleted + 1,
      contactsLost: state.statistics.contactsLost + (enrolled ? 0 : 1),
      membersEnrolled: state.statistics.membersEnrolled + (enrolled ? 1 : 0),
      eurosEarned: state.statistics.eurosEarned + (enrolled ? enrollmentBonus : 0),
    },
  };

  nextState = addCollaboratorMasteryExperience(
    nextState,
    "lessons",
    COLLABORATOR_MASTERY_XP.lessonCompleted,
    now,
  );

  if (!enrolled) return nextState;

  const firstEnrollment = state.school.historicMembers === 0;
  const socialUnlockedNow = !state.unlocks.social && state.school.activeMembers + 1 >= 10;
  nextState = {
    ...nextState,
    school: {
      ...nextState.school,
      activeMembers: nextState.school.activeMembers + 1,
      peakActiveMembers: Math.max(
        nextState.school.peakActiveMembers,
        nextState.school.activeMembers + 1,
      ),
      historicMembers: nextState.school.historicMembers + 1,
      euros: nextState.school.euros + enrollmentBonus,
    },
    unlocks: {
      ...nextState.unlocks,
      upgrades: true,
      social: nextState.school.activeMembers + 1 >= 10,
      forms: true,
    },
  };
  nextState = addMessage(
    nextState,
    now,
    firstEnrollment ? "Primo iscritto registrato" : "Nuovo iscritto registrato",
    firstEnrollment
      ? `Bonus di iscrizione di € ${enrollmentBonus.toFixed(2).replace(".", ",")} accreditato. I registri Iscritti e Miglioramenti sono ora disponibili nella barra laterale.`
      : `Bonus di iscrizione di € ${enrollmentBonus.toFixed(2).replace(".", ",")} accreditato. La quota mensile di € ${GAME_CONFIG.monthlyMemberFee.toFixed(2).replace(".", ",")} arriverà al prossimo cambio mese.`,
    "positive",
    firstEnrollment ? "focused" : "other",
    firstEnrollment ? undefined : "members",
  );
  if (socialUnlockedNow) {
    nextState = addMessage(
      nextState,
      now + 1,
      "Canale Social disponibile",
      "La scuola ha dimensioni sufficienti per sostenere campagne e raccolta passiva di contatti. Il nuovo pannello è disponibile in Attività.",
      "system",
    );
  }
  const enrolledContact = nextState.contacts.find((contact) => contact.id === trial.contactId);
  return enrolledContact?.rarity === "legendary"
    ? recruitCollaborator(nextState, enrolledContact, now)
    : nextState;
}

function processMemberDepartures(
  state: GameState,
  completedSchoolYear: number,
  now: number,
): GameState {
  const collaboratorsByContactId = new Map(
    state.collaborators.map((collaborator) => [collaborator.contactId, collaborator]),
  );
  const firstMonthOfCompletedYear = getSchoolYearStartMonth(completedSchoolYear);
  const eligibleMembers = state.contacts.filter((contact) =>
    contact.status === "enrolled" &&
    (contact.rarity === "legendary" || !collaboratorsByContactId.has(contact.id)) &&
    (contact.enrolledMonth ?? state.school.currentMonth) <= firstMonthOfCompletedYear &&
    (collaboratorsByContactId.get(contact.id)?.lastFormTrainingYear ??
      contact.lastFormTrainingYear) !== completedSchoolYear
  );
  if (eligibleMembers.length === 0) return state;

  let nextSeed = state.randomSeed;
  const departedIds = new Set<string>();
  for (const member of eligibleMembers) {
    const [roll, seedAfterRoll] = nextRandom(nextSeed);
    nextSeed = seedAfterRoll;
    const collaborator = collaboratorsByContactId.get(member.id);
    const forms = collaborator?.forms ?? member.forms;
    const departureChance = getMemberAnnualDepartureChance(
      forms,
      member.rarity,
      state.network.schools.length,
    );
    if (roll < departureChance) departedIds.add(member.id);
  }
  if (departedIds.size === 0) return { ...state, randomSeed: nextSeed };

  const departed = eligibleMembers.filter((member) => departedIds.has(member.id));
  const names = departed
    .slice(0, 3)
    .map((member) => `${member.firstName} ${member.lastName}`)
    .join(", ");
  const others = departed.length > 3 ? ` e altri ${departed.length - 3}` : "";
  const retainedProgress = { ...state.legendaryCollaborators.retainedProgress };
  const departedProfileIds = new Set<SpecialCollaboratorId>();
  for (const member of departed) {
    if (!member.specialProfileId) continue;
    const collaborator = collaboratorsByContactId.get(member.id);
    departedProfileIds.add(member.specialProfileId);
    retainedProgress[member.specialProfileId] = {
      forms: [...(collaborator?.forms ?? member.forms)],
      instructorForms: [...(collaborator?.instructorForms ?? [])],
      formBranchPreferences: [
        ...(collaborator?.formBranchPreferences ?? member.formBranchPreferences ?? []),
      ],
      joinedAt: collaborator?.joinedAt ?? member.acquiredAt,
      lastFormTrainingYear:
        collaborator?.lastFormTrainingYear ?? member.lastFormTrainingYear,
    };
  }
  const updated: GameState = {
    ...state,
    randomSeed: nextSeed,
    contacts: state.contacts.map((contact) =>
      departedIds.has(contact.id)
        ? {
            ...contact,
            status: "departed",
            forms: [...(collaboratorsByContactId.get(contact.id)?.forms ?? contact.forms)],
            formBranchPreferences: [
              ...(collaboratorsByContactId.get(contact.id)?.formBranchPreferences ??
                contact.formBranchPreferences ?? []),
            ],
            lastFormTrainingYear:
              collaboratorsByContactId.get(contact.id)?.lastFormTrainingYear ??
              contact.lastFormTrainingYear,
            training: undefined,
          }
        : contact,
    ),
    collaborators: state.collaborators.filter(
      (collaborator) => !departedIds.has(collaborator.contactId),
    ),
    legendaryCollaborators: {
      ...state.legendaryCollaborators,
      enrolledProfileIds: state.legendaryCollaborators.enrolledProfileIds.filter(
        (profileId) => !departedProfileIds.has(profileId),
      ),
      retainedProgress,
    },
    school: {
      ...state.school,
      activeMembers: Math.max(0, state.school.activeMembers - departed.length),
    },
    statistics: {
      ...state.statistics,
      membersDeparted: state.statistics.membersDeparted + departed.length,
    },
  };
  return addMessage(
    updated,
    now,
    departed.length === 1
      ? "Un iscritto ha lasciato la scuola"
      : `${departed.length} iscritti hanno lasciato la scuola`,
    `${names}${others} ${departed.length === 1 ? "ha" : "hanno"} lasciato la scuola dopo un anno senza formazione. Ogni Forma completata riduce questo rischio.`,
    "neutral",
    "focused",
    "departures",
  );
}

function collectFees(state: GameState, now: number, gainMultiplier: number): GameState {
  if (now < state.school.nextFeeAt) return state;
  const periods = Math.floor((now - state.school.nextFeeAt) / GAME_CONFIG.gameMonthMs) + 1;
  const networkMultiplier = 1 + state.network.schools.length * GAME_CONFIG.prestigeBonusPerSchool;
  let nextState = state;
  for (let period = 0; period < periods; period += 1) {
    const currentMonth = nextState.school.currentMonth;
    const completedSchoolYear = getSchoolYear(currentMonth);
    const earned = scaleCurrencyGain((
      (nextState.school.activeMembers * GAME_CONFIG.monthlyMemberFee +
        nextState.network.schools.length * GAME_CONFIG.networkIncomePerSchool) *
      (1 + getUpgradeEffectTotal(nextState.upgrades, "incomeMultiplier")) *
      networkMultiplier
    ), gainMultiplier);
    nextState = {
      ...nextState,
      school: {
        ...nextState.school,
        euros: Math.round((nextState.school.euros + earned) * 100) / 100,
        currentMonth: currentMonth + 1,
        nextFeeAt: nextState.school.nextFeeAt + GAME_CONFIG.gameMonthMs,
      },
      statistics: {
        ...nextState.statistics,
        eurosEarned: Math.round((nextState.statistics.eurosEarned + earned) * 100) / 100,
      },
    };
    if (isSchoolYearDepartureMonth(currentMonth)) {
      nextState = processMemberDepartures(nextState, completedSchoolYear, now + period);
    }
  }
  return nextState;
}

function startAcquisitionEvent(
  state: GameState,
  definitionId: AcquisitionEvent["definitionId"],
  now: number,
): GameState {
  const definition = getAcquisitionEventDefinition(definitionId);
  if (!definition) return state;
  if (definitionId === "park-sparring" && now < state.activities.nextSparringAt) return state;
  if (state.school.peakActiveMembers < definition.unlockMembers) return state;
  if (selectAvailableEventMembers(state) < definition.requiredMembers) return state;
  const availableSwords = getAvailableSwords(state.equipment);
  if (availableSwords < definition.requiredSwords) return state;
  if (state.school.euros < definition.cost) return state;

  const [varianceRoll, nextSeed] = nextRandom(state.randomSeed);
  const attendanceVariance =
    definition.varianceMin + varianceRoll * (definition.varianceMax - definition.varianceMin);
  const outcome = getEventFunnelOutcome(state, definition, attendanceVariance);

  const event: AcquisitionEvent = {
    id: makeId("activity", now, state.acquisitionEvents.length),
    definitionId,
    title: definition.title,
    location: definition.location,
    startedAt: now,
    resolvesAt: now + definition.durationMs,
    cost: definition.cost,
    peopleMet: outcome.peopleMet,
    demonstrationsGiven: outcome.demonstrationsGiven,
    contactReward: outcome.contactsObtained,
    membersUsed: definition.requiredMembers,
    equipmentUsed: definition.requiredSwords,
    wearAdded: Math.max(
      0,
      Math.round(
        definition.wearAdded *
          GAME_CONFIG.eventWearMultiplier *
          (1 - Math.min(0.8, getUpgradeEffectTotal(state.upgrades, "equipmentWearReduction"))),
      ),
    ),
    status: "running",
  };
  return {
    ...state,
    randomSeed: nextSeed,
    school: { ...state.school, euros: state.school.euros - definition.cost },
    equipment: {
      ...state.equipment,
      availableSwords: availableSwords - definition.requiredSwords,
    },
    acquisitionEvents: [...state.acquisitionEvents, event],
    activities: {
      ...state.activities,
      nextSparringAt:
        definitionId === "park-sparring"
          ? event.resolvesAt + GAME_CONFIG.sparringCooldownMs
          : state.activities.nextSparringAt,
    },
  };
}

function resolveAcquisitionEvent(
  state: GameState,
  event: AcquisitionEvent,
  now: number,
  gainMultiplier: number,
): GameState {
  if (event.status !== "running") return state;
  const source = event.definitionId === "park-sparring" ? "sparring" : "event";
  const scaledReward = scaleContactGain(state, event.contactReward ?? 0, gainMultiplier);
  const rewardState = scaledReward.state;
  const contactReward = scaledReward.amount;
  const acquired = createAcquiredContacts(rewardState, contactReward, source, now);
  const contacts = acquired.contacts;
  let nextState: GameState = {
    ...rewardState,
    randomSeed: acquired.nextSeed,
    legendaryCollaborators: addLegendaryEncounters(rewardState.legendaryCollaborators, contacts),
    contacts: [...rewardState.contacts, ...contacts],
    equipment: applyEquipmentWear(
      {
        ...rewardState.equipment,
        availableSwords: Math.min(
          rewardState.equipment.totalSwords,
          rewardState.equipment.availableSwords + (event.equipmentUsed ?? 0),
        ),
      },
      event.wearAdded ?? 0,
    ),
    acquisitionEvents: rewardState.acquisitionEvents.map((candidate) =>
      candidate.id === event.id
        ? { ...candidate, contactReward, status: "completed" }
        : candidate,
    ),
    statistics: {
      ...rewardState.statistics,
      contactsAcquired: rewardState.statistics.contactsAcquired + contacts.length,
      peopleMet: rewardState.statistics.peopleMet + event.peopleMet,
      demonstrationsGiven:
        rewardState.statistics.demonstrationsGiven + event.demonstrationsGiven,
      eventsCompleted: rewardState.statistics.eventsCompleted + 1,
    },
  };
  nextState = addCollaboratorMasteryExperience(
    nextState,
    "events",
    COLLABORATOR_MASTERY_XP.eventCompleted,
    now,
  );
  if (contacts.length > 0) {
    nextState = addMessage(
      nextState,
      now,
      event.definitionId === "park-sparring"
        ? "Nuovi contatti dallo sparring"
        : "Contatti acquisiti alla dimostrazione",
      `${contacts.length} nuovi indirizzi sono disponibili per la campagna email.`,
      "positive",
      "other",
      "contacts",
    );
  }
  if (rewardState.statistics.eventsCompleted === 0) {
    nextState = addMessage(
      nextState,
      now + 1,
      "Attività operative disponibili",
      "Il primo evento ha attivato registro operativo, attrezzatura e traguardi. La nuova area è comparsa nella barra laterale.",
      "system",
    );
  }
  return contacts.length > 0 ? startNextCampaign(nextState, now) : nextState;
}

function maintainEquipment(state: GameState, now: number): GameState {
  const maintenanceCost = getEquipmentMaintenanceCost(state.equipment);
  if (
    (state.equipment.wear <= 0 && state.equipment.damagedSwords <= 0) ||
    state.school.euros < maintenanceCost ||
    state.acquisitionEvents.some((event) => event.status === "running")
  ) {
    return state;
  }
  const swordsInRunningEvents = state.acquisitionEvents
    .filter((event) => event.status === "running")
    .reduce((total, event) => total + event.equipmentUsed, 0);
  const maintained = {
    ...state,
    school: {
      ...state.school,
      euros: state.school.euros - maintenanceCost,
    },
    equipment: {
      ...state.equipment,
      availableSwords: Math.max(0, state.equipment.totalSwords - swordsInRunningEvents),
      damagedSwords: 0,
      wear: 0,
    },
    statistics: {
      ...state.statistics,
      maintenanceCompleted: state.statistics.maintenanceCompleted + 1,
    },
  };
  return addCollaboratorMasteryExperience(
    maintained,
    "equipment",
    COLLABORATOR_MASTERY_XP.equipmentMaintenance,
    now,
  );
}

function buyOfficialSword(state: GameState): GameState {
  if (state.school.euros < GAME_CONFIG.officialSwordCost) return state;
  return {
    ...state,
    school: {
      ...state.school,
      euros: state.school.euros - GAME_CONFIG.officialSwordCost,
    },
    equipment: synchronizeEquipmentAvailability({
      ...state.equipment,
      totalSwords: state.equipment.totalSwords + 1,
      availableSwords: state.equipment.availableSwords + 1,
    }),
  };
}

function markMessageRead(state: GameState, messageId: string): GameState {
  if (!state.messages.some((message) => message.id === messageId && message.unread)) return state;
  return {
    ...state,
    messages: state.messages.map((message) =>
      message.id === messageId ? { ...message, unread: false } : message,
    ),
  };
}

function markAllMessagesRead(state: GameState): GameState {
  if (!state.messages.some((message) => message.unread)) return state;
  return {
    ...state,
    messages: state.messages.map((message) => ({ ...message, unread: false })),
  };
}

function assignCollaborator(
  state: GameState,
  collaboratorId: string,
  assignment: CollaboratorAssignment,
  now: number,
): GameState {
  void now;
  if (assignment === "social" && !state.unlocks.social) return state;
  const collaborator = state.collaborators.find((candidate) => candidate.id === collaboratorId);
  if (!collaborator) return state;
  return {
    ...state,
    collaborators: state.collaborators.map((candidate) =>
      candidate.id === collaboratorId ? { ...candidate, assignment } : candidate,
    ),
  };
}

function toggleInstructorAutomation(
  state: GameState,
  collaboratorId: string,
  enabled: boolean,
): GameState {
  return {
    ...state,
    collaborators: state.collaborators.map((candidate) =>
      candidate.id === collaboratorId
        ? { ...candidate, autoTeachingEnabled: enabled }
        : candidate,
    ),
  };
}

function startFormTraining(
  state: GameState,
  personId: string,
  formId: FormId,
  now: number,
): GameState {
  if (!state.unlocks.forms) return state;
  if (isSummerBreak(state.school.currentMonth)) return state;
  const collaborator = state.collaborators.find((candidate) => candidate.id === personId);
  const member = state.contacts.find((candidate) =>
    candidate.id === personId &&
    candidate.status === "enrolled" &&
    !state.collaborators.some((existing) => existing.contactId === candidate.id),
  );
  const student = collaborator ?? member;
  const definition = getFormDefinition(formId);
  const currentYear = getSchoolYear(state.school.currentMonth);
  const qualificationOnly = Boolean(
    collaborator?.assignment === "instructor" &&
    collaborator.forms.includes(formId) &&
    isInstructorForm(formId) &&
    !collaborator.instructorForms.includes(formId),
  );
  if (qualificationOnly && collaborator && definition) {
    const qualificationCost = getInstructorQualificationCost(definition.cost);
    if (collaborator.training || state.school.euros < qualificationCost) return state;
    return addMessage(
      {
        ...state,
        school: {
          ...state.school,
          euros: Math.round((state.school.euros - qualificationCost) * 100) / 100,
        },
        collaborators: state.collaborators.map((candidate) =>
          candidate.id === collaborator.id
            ? { ...candidate, instructorForms: [...candidate.instructorForms, formId] }
            : candidate,
        ),
      },
      now,
      "Qualifica da Istruttore ottenuta",
      `${collaborator.displayName} ora può insegnare ${definition.title}${definition.branch ? ` — ${definition.branch}` : ""}. Costo: ${euroFormatter.format(qualificationCost)}.`,
      "positive",
      "other",
      "training",
    );
  }
  const instructorSelf = collaborator?.assignment === "instructor";
  const instructorTrack = Boolean(instructorSelf && isInstructorForm(formId));
  const instructor = !instructorSelf
    ? selectAvailableInstructor(state, formId, personId)
    : undefined;
  const trainingInstructor = instructor ?? (instructorSelf ? collaborator : undefined);
  const trainingCost = instructorTrack
    ? getInstructorFormCost(definition?.cost ?? 0)
    : collaborator?.assignment === "instructor"
      ? definition?.cost ?? 0
      : instructor
        ? getStudentFormCost(definition?.cost ?? 0)
        : definition?.cost ?? 0;
  const branchCapacity = collaborator?.assignment === "instructor"
    ? Math.min(3, 1 + (state.upgrades["instructor-versatility"] ?? 0))
    : undefined;
  const instructorLearnedBranches = new Set(
    collaborator?.forms.flatMap((learnedFormId) => {
      const branch = getFormDefinition(learnedFormId)?.branch;
      return branch ? [branch] : [];
    }) ?? [],
  );
  const initialBranchCompatible = !definition?.branch ||
    instructorLearnedBranches.size > 0 ||
    !collaborator?.formBranchPreferences?.length ||
    collaborator.formBranchPreferences.includes(definition.branch);
  if (
    !student ||
    !definition ||
    !canTrainForm(
      student,
      definition,
      currentYear,
      branchCapacity,
      collaborator?.assignment !== "instructor",
    ) ||
    !initialBranchCompatible ||
    (instructorSelf && selectInstructorTeachingCount(state, personId) > 0) ||
    state.school.euros < trainingCost
  ) return state;
  const trainingSpeed = trainingInstructor
    ? getCollaboratorProductivity(trainingInstructor, "instructor")
    : 1;
  const training = {
    formId,
    startedAt: now,
    completesAt: now + Math.max(1_000, Math.round(definition.durationMs / trainingSpeed)),
    instructorId: instructor?.id,
    includesInstructorCertification: instructorTrack || undefined,
  };
  return {
    ...state,
    school: {
      ...state.school,
      euros: Math.round((state.school.euros - trainingCost) * 100) / 100,
    },
    contacts: member
      ? state.contacts.map((candidate) => candidate.id === member.id
        ? { ...candidate, training, lastFormTrainingYear: currentYear }
        : candidate)
      : state.contacts,
    collaborators: collaborator
      ? state.collaborators.map((candidate) => candidate.id === collaborator.id
        ? { ...candidate, training, lastFormTrainingYear: currentYear }
        : candidate)
      : state.collaborators,
  };
}

function chooseFormBranchPreferences(seed: number): {
  preferences: FormBranch[];
  nextSeed: number;
} {
  const [countRoll, seedAfterCount] = nextRandom(seed);
  const count = countRoll < 0.65 ? 1 : countRoll < 0.95 ? 2 : 3;
  const [startRoll, nextSeed] = nextRandom(seedAfterCount);
  const start = Math.floor(startRoll * FORM_BRANCHES.length) % FORM_BRANCHES.length;
  return {
    preferences: Array.from(
      { length: count },
      (_, index) => FORM_BRANCHES[(start + index) % FORM_BRANCHES.length],
    ),
    nextSeed,
  };
}

function resolveFormTraining(state: GameState, personId: string, now: number): GameState {
  const collaborator = state.collaborators.find((candidate) => candidate.id === personId);
  const member = state.contacts.find((candidate) => candidate.id === personId);
  const student = collaborator ?? member;
  if (!student?.training || student.training.completesAt > now) return state;
  const completedFormId = student.training.formId;
  const definition = getFormDefinition(completedFormId);
  if (!definition) return state;
  const completedForms = [...student.forms, completedFormId];
  const preferenceResult = completedFormId === "course-y" &&
      (student.formBranchPreferences?.length ?? 0) === 0
    ? chooseFormBranchPreferences(state.randomSeed)
    : {
        preferences: [...(student.formBranchPreferences ?? [])],
        nextSeed: state.randomSeed,
      };
  let nextState: GameState = {
    ...state,
    randomSeed: preferenceResult.nextSeed,
    contacts: member && !collaborator
      ? state.contacts.map((candidate) => candidate.id === member.id
        ? {
            ...candidate,
            forms: completedForms,
            formBranchPreferences: preferenceResult.preferences,
            training: undefined,
          }
        : candidate)
      : state.contacts,
    collaborators: collaborator
      ? state.collaborators.map((candidate) => candidate.id === collaborator.id
        ? {
            ...candidate,
            forms: completedForms,
            formBranchPreferences: preferenceResult.preferences,
            instructorForms: student.training?.includesInstructorCertification
              ? [...candidate.instructorForms, completedFormId]
              : candidate.instructorForms,
            training: undefined,
          }
        : candidate)
      : state.collaborators,
    statistics: {
      ...state.statistics,
      formsCompleted: state.statistics.formsCompleted + 1,
    },
  };
  if (student.training.instructorId) {
    nextState = addCollaboratorMasteryExperience(
      nextState,
      "instructor",
      COLLABORATOR_MASTERY_XP.instructorTraining,
      now,
    );
  }
  nextState = addMessage(
    nextState,
    now,
    student.training.instructorId
      ? "Riepilogo formazione automatica"
      : "Formazione completata",
    `${collaborator?.displayName ?? `${member?.firstName} ${member?.lastName}`} ha completato ${definition.title}${definition.branch ? ` — ${definition.branch}` : ""}.`,
    "positive",
    "other",
    "training",
  );
  if (
    !member ||
    collaborator ||
    completedFormId !== "form-7" ||
    member.rarity !== "rare"
  ) return nextState;
  const qualifiedMember = nextState.contacts.find((contact) => contact.id === member.id);
  return qualifiedMember ? recruitCollaborator(nextState, qualifiedMember, now) : nextState;
}

function writeCharacters(
  state: GameState,
  amount: number,
  now: number,
  source: "manual" | "automation",
): GameState {
  const activeEmail = selectActiveEmail(state);
  if (!activeEmail || activeEmail.status !== "writing" || amount <= 0) return state;
  const buildLength = getEmailBuildLength(activeEmail);
  const revealedCharacters = Math.min(
    buildLength,
    activeEmail.revealedCharacters + amount,
  );
  const charactersWritten = revealedCharacters - activeEmail.revealedCharacters;
  const completed = revealedCharacters >= buildLength;
  return {
    ...state,
    emails: state.emails.map((email) =>
      email.id === activeEmail.id
        ? {
            ...email,
            revealedCharacters,
            status: completed ? "sending" : "writing",
            sendCompletesAt: completed ? now + GAME_CONFIG.sendDelayMs : undefined,
          }
        : email,
    ),
    statistics: {
      ...state.statistics,
      inputs: state.statistics.inputs + (source === "manual" ? 1 : 0),
      automatedCharacters:
        state.statistics.automatedCharacters +
        (source === "automation" ? charactersWritten : 0),
    },
  };
}

function processAutomation(state: GameState, now: number, gainMultiplier: number): GameState {
  const elapsedMs = Math.min(1_000, Math.max(0, now - state.automation.lastProcessedAt));
  if (elapsedMs <= 0) return state;

  const productivityFor = (assignment: CollaboratorAssignment) =>
    state.collaborators
      .filter((collaborator) => collaborator.assignment === assignment)
      .reduce((total, collaborator) => total + getCollaboratorProductivity(collaborator), 0);
  const writingProductivity = productivityFor("writing");
  const socialProductivity = state.unlocks.social ? productivityFor("social") : 0;
  const equipmentProductivity = productivityFor("equipment");
  const wasWriting = selectActiveEmail(state)?.status === "writing";
  const automationMultiplier =
    1 + getUpgradeEffectTotal(state.upgrades, "automationMultiplier");
  const socialMultiplier = 1 + getUpgradeEffectTotal(state.upgrades, "socialMultiplier");

  const writingTotal =
    state.automation.writingBuffer +
    (elapsedMs / 1_000) *
      writingProductivity *
      GAME_CONFIG.collaboratorWritingPerSecond *
      state.player.writingPower *
      automationMultiplier;
  const automatedCharacters = Math.floor(writingTotal);
  const socialTotal =
    state.automation.socialBuffer +
    (elapsedMs / GAME_CONFIG.socialContactIntervalMs) *
    socialProductivity *
    socialMultiplier *
    automationMultiplier *
    Math.max(0, gainMultiplier);
  const socialContacts = Math.floor(socialTotal);
  const equipmentTotal =
    state.automation.equipmentBuffer +
    (elapsedMs / GAME_CONFIG.equipmentRepairIntervalMs) *
    equipmentProductivity *
    automationMultiplier;
  const repairedWear = Math.floor(equipmentTotal);

  let nextState: GameState = {
    ...state,
    automation: {
      ...state.automation,
      lastProcessedAt: now,
      writingBuffer: writingTotal - automatedCharacters,
      socialBuffer: socialTotal - socialContacts,
      equipmentBuffer: equipmentTotal - repairedWear,
    },
    equipment: synchronizeEquipmentAvailability({
      ...state.equipment,
      wear: Math.max(0, state.equipment.wear - repairedWear),
    }),
  };

  if (repairedWear > 0) {
    nextState = addCollaboratorMasteryExperience(
      nextState,
      "equipment",
      repairedWear * COLLABORATOR_MASTERY_XP.equipmentRepairPoint,
      now,
    );
  }

  if (automatedCharacters > 0) {
    nextState = writeCharacters(nextState, automatedCharacters, now, "automation");
    if (wasWriting) {
      nextState = addCollaboratorMasteryExperience(
        nextState,
        "writing",
        (elapsedMs / 1_000) * COLLABORATOR_MASTERY_XP.writingPerSecond,
        now,
      );
    }
  }

  if (socialContacts > 0) {
    const acquired = createAcquiredContacts(nextState, socialContacts, "social", now);
    const contacts = acquired.contacts;
    nextState = {
      ...nextState,
      randomSeed: acquired.nextSeed,
      legendaryCollaborators: addLegendaryEncounters(
        nextState.legendaryCollaborators,
        contacts,
      ),
      contacts: [...nextState.contacts, ...contacts],
      statistics: {
        ...nextState.statistics,
        contactsAcquired: nextState.statistics.contactsAcquired + contacts.length,
        socialContacts: nextState.statistics.socialContacts + contacts.length,
      },
    };
    nextState = addMessage(
      nextState,
      now,
      "Nuovi contatti dai Social",
      `${contacts.length} nuovi indirizzi sono stati raccolti dalle attività online.`,
      "positive",
      "other",
      "contacts",
    );
    nextState = addCollaboratorMasteryExperience(
      nextState,
      "social",
      contacts.length * COLLABORATOR_MASTERY_XP.socialContact,
      now,
    );
    nextState = startNextCampaign(nextState, now);
  }

  return nextState;
}

function runSocialCampaign(state: GameState, now: number): GameState {
  if (!state.unlocks.social || state.school.euros < GAME_CONFIG.socialCampaignCost) {
    return state;
  }
  const [viralRoll, nextSeed] = nextRandom(state.randomSeed);
  const viral = viralRoll < GAME_CONFIG.socialViralChance;
  const contactCount = Math.max(
    1,
    Math.round(
      GAME_CONFIG.socialCampaignContacts *
        (viral ? 3 : 1) *
        (1 + getUpgradeEffectTotal(state.upgrades, "socialMultiplier")),
    ),
  );
  const acquired = createAcquiredContacts(
    { ...state, randomSeed: nextSeed },
    contactCount,
    "social",
    now,
  );
  const contacts = acquired.contacts;
  let nextState: GameState = {
    ...state,
    randomSeed: acquired.nextSeed,
    legendaryCollaborators: addLegendaryEncounters(state.legendaryCollaborators, contacts),
    school: {
      ...state.school,
      euros: state.school.euros - GAME_CONFIG.socialCampaignCost,
    },
    contacts: [...state.contacts, ...contacts],
    statistics: {
      ...state.statistics,
      contactsAcquired: state.statistics.contactsAcquired + contacts.length,
      socialContacts: state.statistics.socialContacts + contacts.length,
      socialCampaigns: state.statistics.socialCampaigns + 1,
    },
  };
  nextState = addCollaboratorMasteryExperience(
    nextState,
    "social",
    contacts.length * COLLABORATOR_MASTERY_XP.socialContact,
    now,
  );
  nextState = addMessage(
    nextState,
    now,
    viral ? "Post inspiegabilmente virale" : "Campagna Social completata",
    `${contacts.length} nuovi indirizzi sono disponibili per la campagna email.`,
    "positive",
    "other",
    "contacts",
  );
  return startNextCampaign(nextState, now);
}

function processNarrativeEvent(state: GameState, now: number, gainMultiplier: number): GameState {
  if (now < state.narrative.nextEventAt || state.school.activeMembers <= 0) return state;
  const recentKinds = state.narrative.history.slice(-2).map((record) =>
    NARRATIVE_EVENTS.find((definition) => definition.id === record.definitionId)?.kind,
  );
  const blockNegative = recentKinds.length === 2 && recentKinds.every((kind) => kind === "negative");
  const eligible = NARRATIVE_EVENTS.filter(
    (definition) => state.school.activeMembers >= definition.minMembers &&
      (!blockNegative || definition.kind !== "negative"),
  );
  if (eligible.length === 0) return state;
  const [eventRoll, seedAfterEvent] = nextRandom(state.randomSeed);
  const definition = eligible[Math.min(eligible.length - 1, Math.floor(eventRoll * eligible.length))];
  const [nextDelay, nextSeed] = randomBetween(
    seedAfterEvent,
    GAME_CONFIG.narrativeEventMinMs,
    GAME_CONFIG.narrativeEventMaxMs,
  );
  const rewardState = definition.contactDelta
    ? scaleContactGain(
        { ...state, randomSeed: nextSeed },
        definition.contactDelta,
        gainMultiplier,
      )
    : { state: { ...state, randomSeed: nextSeed }, amount: 0 };
  const acquired = rewardState.amount > 0
    ? createAcquiredContacts(
        rewardState.state,
        rewardState.amount,
        "collaborator",
        now,
      )
    : { contacts: [], nextSeed: rewardState.state.randomSeed };
  const contacts = acquired.contacts;
  const euroDelta = (definition.euroDelta ?? 0) > 0
    ? scaleCurrencyGain(definition.euroDelta ?? 0, gainMultiplier)
    : (definition.euroDelta ?? 0);
  const summary = definition.euroDelta && definition.euroDelta > 0
    ? `${definition.description} Contributo ricevuto: ${euroFormatter.format(euroDelta)}.`
    : definition.description;
  let nextState: GameState = {
    ...rewardState.state,
    randomSeed: acquired.nextSeed,
    legendaryCollaborators: addLegendaryEncounters(rewardState.state.legendaryCollaborators, contacts),
    school: {
      ...rewardState.state.school,
      activeMembers: Math.max(0, rewardState.state.school.activeMembers + (definition.memberDelta ?? 0)),
      euros: Math.max(0, rewardState.state.school.euros + euroDelta),
    },
    equipment: applySwordDamage(
      applyEquipmentWear(rewardState.state.equipment, definition.wearDelta ?? 0),
      definition.damagedSwordsDelta ?? 0,
    ),
    contacts: [...rewardState.state.contacts, ...contacts],
    narrative: {
      nextEventAt: now + nextDelay,
      history: [
        ...rewardState.state.narrative.history,
        {
          id: makeId("narrative", now, state.narrative.history.length),
          definitionId: definition.id,
          title: definition.title,
          occurredAt: now,
          summary,
        },
      ],
    },
    statistics: {
      ...rewardState.state.statistics,
      contactsAcquired: rewardState.state.statistics.contactsAcquired + contacts.length,
      narrativeEvents: rewardState.state.statistics.narrativeEvents + 1,
      eurosEarned:
        rewardState.state.statistics.eurosEarned + Math.max(0, euroDelta),
    },
  };
  nextState = addMessage(
    nextState,
    now,
    definition.title,
    summary,
    definition.tone,
    "other",
    "narrative",
  );
  return contacts.length > 0 ? startNextCampaign(nextState, now) : nextState;
}

export function getPrestigeRequirements(state: GameState) {
  const cycle = state.network.schools.length + 1;
  return {
    historicMembers: GAME_CONFIG.prestigeHistoricMembers * cycle,
    collaborators: GAME_CONFIG.prestigeCollaborators + (cycle - 1) * 2,
    events: GAME_CONFIG.prestigeEvents * cycle,
  };
}

export function canFoundSchool(state: GameState): boolean {
  const requirements = getPrestigeRequirements(state);
  return (
    state.school.historicMembers >= requirements.historicMembers &&
    state.collaborators.length >= requirements.collaborators &&
    state.statistics.eventsCompleted >= requirements.events
  );
}

function notifyPrestigeOffer(state: GameState, now: number): GameState {
  if (!canFoundSchool(state) || state.network.prestigeOfferSent) return state;
  const ready: GameState = {
    ...state,
    network: { ...state.network, prestigeOfferSent: true },
  };
  return addMessage(
    ready,
    now,
    "Richiesta apertura nuova scuola",
    "La rete ha approvato la fondazione di una nuova sede. Completa la procedura nelle Impostazioni quando desideri trasferirti.",
    "system",
  );
}

function prepareLegendaryProgressForNewSchool(
  state: GameState,
): LegendaryCollaboratorProgress {
  const retainedProgress = { ...state.legendaryCollaborators.retainedProgress };
  const collaboratorsByContactId = new Map(
    state.collaborators.map((collaborator) => [collaborator.contactId, collaborator]),
  );
  for (const contact of state.contacts) {
    if (contact.status !== "enrolled" || !contact.specialProfileId) continue;
    const collaborator = collaboratorsByContactId.get(contact.id);
    retainedProgress[contact.specialProfileId] = {
      forms: [...(collaborator?.forms ?? contact.forms)],
      instructorForms: [...(collaborator?.instructorForms ?? [])],
      formBranchPreferences: [
        ...(collaborator?.formBranchPreferences ?? contact.formBranchPreferences ?? []),
      ],
      joinedAt: collaborator?.joinedAt ?? contact.acquiredAt,
      lastFormTrainingYear:
        collaborator?.lastFormTrainingYear ?? contact.lastFormTrainingYear,
    };
  }
  return {
    ...state.legendaryCollaborators,
    enrolledProfileIds: [],
    retainedProgress,
  };
}

function foundSchool(
  state: GameState,
  details: SchoolFoundationDetails,
  now: number,
): GameState {
  if (!canFoundSchool(state) || !details.name.trim() || !details.city.trim()) return state;
  const legendaryProgress = prepareLegendaryProgressForNewSchool(state);
  const fresh = createInitialState(
    now,
    state.profile.displayName,
    true,
    legendaryProgress,
  );
  const archivedSchool = {
    id: makeId("school", now, state.network.schools.length),
    name: state.school.name,
    city: state.school.city,
    motto: state.school.motto,
    specialization: state.school.specialization,
    membersAtTransfer: state.school.activeMembers,
    emailsSent: state.statistics.emailsSent,
    eventsCompleted: state.statistics.eventsCompleted,
    transferredAt: now,
  };
  const nextState: GameState = {
    ...fresh,
    createdAt: state.createdAt,
    randomSeed: state.randomSeed,
    school: {
      ...fresh.school,
      name: details.name.trim(),
      city: details.city.trim(),
      accentColor: details.accentColor,
      motto: details.motto.trim(),
      specialization: details.specialization,
      historicMembers: state.school.historicMembers,
    },
    network: {
      reputation: state.network.reputation + 1,
      schools: [...state.network.schools, archivedSchool],
      prestigeOfferSent: false,
    },
    achievements: state.achievements,
    legendaryCollaborators: fresh.legendaryCollaborators,
    statistics: state.statistics,
    messages: state.messages,
    shortGoal: state.shortGoal,
  };
  const announced = addMessage(
    nextState,
    now,
    `Nuova scuola fondata: ${details.name.trim()}`,
    `La sede di ${details.city.trim()} è operativa. Bonus permanente di rete: +${Math.round((state.network.schools.length + 1) * GAME_CONFIG.prestigeBonusPerSchool * 100)}%.`,
    "system",
  );
  return {
    ...announced,
    player: { writingPower: getWritingPower(announced) },
  };
}

function grantAchievements(state: GameState, now: number, gainMultiplier: number): GameState {
  const earned = getNewAchievements(state);
  if (earned.length === 0) return state;
  const reward = scaleCurrencyGain(
    earned.reduce((total, definition) => total + definition.euroReward, 0),
    gainMultiplier,
  );
  let nextState: GameState = {
    ...state,
    achievements: [...state.achievements, ...earned.map((definition) => definition.id)],
    school: { ...state.school, euros: state.school.euros + reward },
    statistics: { ...state.statistics, eurosEarned: state.statistics.eurosEarned + reward },
  };
  for (const definition of earned) {
    const achievementReward = scaleCurrencyGain(definition.euroReward, gainMultiplier);
    nextState = addMessage(
      nextState,
      now,
      `Traguardo: ${definition.title}`,
      `${definition.description} Premio amministrativo: ${euroFormatter.format(achievementReward)}.`,
      "system",
      "other",
      "progress",
    );
  }
  return nextState;
}

function completeShortGoal(
  state: GameState,
  now: number,
  gainMultiplier: number,
): GameState {
  if (getShortGoalProgress(state) < state.shortGoal.target) return state;

  const definition = SHORT_GOALS[state.shortGoal.definitionId];
  const reward = scaleCurrencyGain(getShortGoalReward(state.shortGoal), gainMultiplier);
  const completedCount = state.shortGoal.completedCount + 1;
  const rewarded: GameState = {
    ...state,
    school: { ...state.school, euros: state.school.euros + reward },
    statistics: {
      ...state.statistics,
      eurosEarned: state.statistics.eurosEarned + reward,
    },
  };
  const nextGoal = createNextShortGoal(rewarded, completedCount, now);
  const nextDefinition = SHORT_GOALS[nextGoal.definitionId];
  return addMessage(
    { ...rewarded, shortGoal: nextGoal },
    now,
    `Obiettivo completato: ${definition.title}`,
    `${definition.completionNarrative} Premio operativo: ${euroFormatter.format(reward)}. Prossima priorità: ${nextDefinition.title}.`,
    "positive",
    "other",
    "progress",
  );
}

type AutomaticStudent = Contact | GameState["collaborators"][number];

function getAutomaticFormCandidates(student: AutomaticStudent): FormId[] {
  const core: FormId[] = ["form-1", "course-x", "form-2", "course-y"];
  const nextCore = core.find((formId) => !student.forms.includes(formId));
  if (nextCore) return [nextCore];

  const completedFormFive = (["form-5-long", "form-5-staff", "form-5-double"] as FormId[])
    .some((formId) => student.forms.includes(formId));
  if (completedFormFive && !student.forms.includes("form-6")) return ["form-6"];
  if (completedFormFive && !student.forms.includes("form-7")) return ["form-7"];

  const preferredBranches = student.formBranchPreferences ?? [];
  const orderedBranches = preferredBranches.slice().sort((left, right) => {
    const startedLeft = BRANCH_FORM_IDS[left].some((formId) => student.forms.includes(formId));
    const startedRight = BRANCH_FORM_IDS[right].some((formId) => student.forms.includes(formId));
    return Number(startedRight) - Number(startedLeft);
  });
  return orderedBranches.flatMap((branch) => {
    const nextForm = BRANCH_FORM_IDS[branch].find((formId) => !student.forms.includes(formId));
    return nextForm ? [nextForm] : [];
  });
}

function processAutomaticTeaching(state: GameState, now: number): GameState {
  if (isSummerBreak(state.school.currentMonth)) return state;
  const currentYear = getSchoolYear(state.school.currentMonth);
  let nextState = state;

  while (true) {
    const collaboratorContactIds = new Set(
      nextState.collaborators.map((collaborator) => collaborator.contactId),
    );
    const students: AutomaticStudent[] = [
      ...nextState.contacts.filter((contact) =>
        contact.status === "enrolled" &&
        !collaboratorContactIds.has(contact.id) &&
        !contact.training &&
        contact.lastFormTrainingYear !== currentYear
      ),
      ...nextState.collaborators.filter((collaborator) =>
        collaborator.assignment !== "instructor" &&
        !collaborator.training &&
        collaborator.lastFormTrainingYear !== currentYear
      ),
    ].sort((left, right) =>
      left.forms.length - right.forms.length ||
      ("acquiredAt" in left ? left.acquiredAt : left.joinedAt) -
        ("acquiredAt" in right ? right.acquiredAt : right.joinedAt)
    );

    let started = false;
    for (const student of students) {
      const candidate = getAutomaticFormCandidates(student).find((formId) => {
        const definition = getFormDefinition(formId);
        return Boolean(
          definition &&
          canTrainForm(student, definition, currentYear) &&
          selectAvailableInstructor(nextState, formId, student.id) &&
          nextState.school.euros >= getStudentFormCost(definition.cost),
        );
      });
      if (!candidate) continue;
      const beforeEuros = nextState.school.euros;
      nextState = startFormTraining(nextState, student.id, candidate, now);
      if (nextState.school.euros < beforeEuros) {
        started = true;
        break;
      }
    }
    if (!started) return nextState;
  }
}

function tick(state: GameState, now: number, gainMultiplier: number): GameState {
  let nextState = processAutomation(state, now, gainMultiplier);

  for (const email of nextState.emails.slice()) {
    if (email.status === "sending" && (email.sendCompletesAt ?? Infinity) <= now) {
      nextState = finalizeEmail(nextState, email.id, now);
    }
  }
  for (const outcome of nextState.pendingEmailOutcomes.slice()) {
    if (outcome.resolvesAt <= now) nextState = resolveEmailOutcome(nextState, outcome, now);
  }
  for (const trial of nextState.scheduledTrials.slice()) {
    if (trial.status === "scheduled" && trial.resolvesAt <= now) {
      nextState = resolveTrial(nextState, trial, now, gainMultiplier);
    }
  }
  for (const event of nextState.acquisitionEvents.slice()) {
    if (event.status === "running" && event.resolvesAt <= now) {
      nextState = resolveAcquisitionEvent(nextState, event, now, gainMultiplier);
    }
  }
  for (const contact of nextState.contacts.slice()) {
    if (contact.training && contact.training.completesAt <= now) {
      nextState = resolveFormTraining(nextState, contact.id, now);
    }
  }
  for (const collaborator of nextState.collaborators.slice()) {
    if (collaborator.training && collaborator.training.completesAt <= now) {
      nextState = resolveFormTraining(nextState, collaborator.id, now);
    }
  }
  nextState = collectFees(nextState, now, gainMultiplier);
  nextState = processAutomaticTeaching(nextState, now);
  nextState = processNarrativeEvent(nextState, now, gainMultiplier);
  return notifyPrestigeOffer(nextState, now);
}

function write(state: GameState, now: number): GameState {
  return writeCharacters(state, state.player.writingPower, now, "manual");
}

function buyUpgrade(state: GameState, upgradeId: UpgradeId): GameState {
  const definition = getUpgradeDefinition(upgradeId);
  if (!definition) return state;
  const currentLevel = state.upgrades[upgradeId];
  if (
    currentLevel >= definition.maxLevel ||
    state.school.historicMembers < definition.requiredHistoricMembers
  ) {
    return state;
  }
  const cost = getUpgradeCost(definition, currentLevel, state.network.schools.length);
  if (state.school.euros < cost) return state;

  const upgrades = { ...state.upgrades, [upgradeId]: currentLevel + 1 };
  const previousUpgradeSwords = Math.floor(getUpgradeEffectTotal(state.upgrades, "totalSwords"));
  const upgradedSwords = Math.floor(getUpgradeEffectTotal(upgrades, "totalSwords"));
  const addedSwords = Math.max(0, upgradedSwords - previousUpgradeSwords);
  const totalSwords = state.equipment.totalSwords + addedSwords;
  const nextState: GameState = {
    ...state,
    school: { ...state.school, euros: state.school.euros - cost },
    upgrades,
    equipment: synchronizeEquipmentAvailability({
      ...state.equipment,
      totalSwords,
      availableSwords: state.equipment.availableSwords + addedSwords,
    }),
  };
  return {
    ...nextState,
    player: { ...nextState.player, writingPower: getWritingPower(nextState) },
  };
}

function updateProfileName(state: GameState, displayName: string): GameState {
  const normalizedName = displayName.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!normalizedName || normalizedName === state.profile.displayName) return state;

  return {
    ...state,
    profile: { displayName: normalizedName },
    emails: state.emails.map((email) => {
      if (email.status !== "writing") return email;
      const contact = state.contacts.find((candidate) => candidate.id === email.contactId);
      const template = EMAIL_TEMPLATES.find((candidate) => candidate.id === email.templateId);
      if (!contact || !template) return email;
      const copy = resolveEmailTemplateCopy(
        template,
        contact.firstName,
        normalizedName,
        email.presentationLevel,
      );
      const updatedEmail = {
        ...email,
        subject: copy.subject,
        body: copy.body,
      };
      return {
        ...updatedEmail,
        revealedCharacters: Math.min(email.revealedCharacters, getEmailBuildLength(updatedEmail)),
      };
    }),
  };
}

function processOfflinePassiveProgress(
  state: GameState,
  now: number,
  elapsedMs: number,
  rawElapsedMs: number,
): GameState {
  const automationMultiplier = 1 + getUpgradeEffectTotal(state.upgrades, "automationMultiplier");
  const socialMultiplier = 1 + getUpgradeEffectTotal(state.upgrades, "socialMultiplier");
  const socialProductivity = state.unlocks.social
    ? state.collaborators
        .filter((collaborator) => collaborator.assignment === "social")
        .reduce((total, collaborator) => total + getCollaboratorProductivity(collaborator), 0)
    : 0;
  const socialTotal = state.automation.socialBuffer +
    (elapsedMs / GAME_CONFIG.socialContactIntervalMs) *
      socialProductivity *
      socialMultiplier *
      automationMultiplier *
      GAME_CONFIG.offlineGainMultiplier;
  const socialContacts = Math.floor(socialTotal);
  const eurosEarned = Math.round(
    selectIncomePerMonth(state) *
      (elapsedMs / GAME_CONFIG.gameMonthMs) *
      GAME_CONFIG.offlineGainMultiplier *
      100,
  ) / 100;
  const shiftTraining = <T extends { training?: { startedAt: number; completesAt: number } }>(
    person: T,
  ): T => person.training
    ? {
        ...person,
        training: {
          ...person.training,
          startedAt: person.training.startedAt + rawElapsedMs,
          completesAt: person.training.completesAt + rawElapsedMs,
        },
      }
    : person;
  let nextState: GameState = {
    ...state,
    school: {
      ...state.school,
      euros: state.school.euros + eurosEarned,
      nextFeeAt: state.school.nextFeeAt + rawElapsedMs,
    },
    contacts: state.contacts.map(shiftTraining),
    collaborators: state.collaborators.map(shiftTraining),
    emails: state.emails.map((email) => email.sendCompletesAt
      ? { ...email, sendCompletesAt: email.sendCompletesAt + rawElapsedMs }
      : email),
    pendingEmailOutcomes: state.pendingEmailOutcomes.map((outcome) => ({
      ...outcome,
      resolvesAt: outcome.resolvesAt + rawElapsedMs,
    })),
    scheduledTrials: state.scheduledTrials.map((trial) => ({
      ...trial,
      startsAt: trial.startsAt + rawElapsedMs,
      resolvesAt: trial.resolvesAt + rawElapsedMs,
    })),
    acquisitionEvents: state.acquisitionEvents.map((event) => ({
      ...event,
      startedAt: event.startedAt + rawElapsedMs,
      resolvesAt: event.resolvesAt + rawElapsedMs,
    })),
    activities: { nextSparringAt: state.activities.nextSparringAt + rawElapsedMs },
    narrative: { ...state.narrative, nextEventAt: state.narrative.nextEventAt + rawElapsedMs },
    automation: {
      ...state.automation,
      lastProcessedAt: now,
      socialBuffer: socialTotal - socialContacts,
    },
    statistics: {
      ...state.statistics,
      eurosEarned: state.statistics.eurosEarned + eurosEarned,
    },
  };
  if (socialContacts <= 0) return nextState;
  const acquired = createAcquiredContacts(nextState, socialContacts, "social", now);
  nextState = {
    ...nextState,
    randomSeed: acquired.nextSeed,
    legendaryCollaborators: addLegendaryEncounters(
      nextState.legendaryCollaborators,
      acquired.contacts,
    ),
    contacts: [...nextState.contacts, ...acquired.contacts],
    statistics: {
      ...nextState.statistics,
      contactsAcquired: nextState.statistics.contactsAcquired + socialContacts,
      socialContacts: nextState.statistics.socialContacts + socialContacts,
    },
  };
  return addCollaboratorMasteryExperience(
    nextState,
    "social",
    socialContacts * COLLABORATOR_MASTERY_XP.socialContact,
    now,
  );
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  let nextState: GameState;
  switch (action.type) {
    case "WRITE":
      nextState = write(state, action.now);
      break;
    case "TICK":
      nextState = tick(state, action.now, action.gainMultiplier ?? 1);
      break;
    case "OFFLINE_PASSIVE_PROGRESS":
      nextState = processOfflinePassiveProgress(
        state,
        action.now,
        action.elapsedMs,
        action.rawElapsedMs,
      );
      break;
    case "REPLACE_STATE":
      nextState = action.state;
      break;
    case "ADMIN_ADD_CONTACTS": {
      const amount = Math.trunc(action.amount);
      if (!Number.isSafeInteger(amount) || amount === 0) {
        nextState = state;
        break;
      }
      if (amount > 0) {
        const acquired = createAcquiredContacts(state, amount, "event", state.lastSavedAt);
        nextState = startNextCampaign({
          ...state,
          randomSeed: acquired.nextSeed,
          legendaryCollaborators: addLegendaryEncounters(
            state.legendaryCollaborators,
            acquired.contacts,
          ),
          contacts: [...state.contacts, ...acquired.contacts],
        }, state.lastSavedAt);
        break;
      }
      let remaining = Math.abs(amount);
      const contacts = state.contacts.filter((contact) => {
        if (contact.status !== "available" || remaining === 0) return true;
        remaining -= 1;
        return false;
      });
      nextState = contacts.length === state.contacts.length
        ? state
        : { ...state, contacts };
      break;
    }
    case "ADMIN_ADD_MEMBERS": {
      const amount = Math.trunc(action.amount);
      if (!Number.isSafeInteger(amount) || amount === 0) {
        nextState = state;
        break;
      }
      const activeMembers = state.school.activeMembers + amount;
      const nextActiveMembers = Math.max(0, activeMembers);
      const historicMembers = amount > 0
        ? state.school.historicMembers + amount
        : state.school.historicMembers;
      if (!Number.isSafeInteger(nextActiveMembers) || !Number.isSafeInteger(historicMembers)) {
        nextState = state;
        break;
      }
      nextState = {
        ...state,
        school: {
          ...state.school,
          activeMembers: nextActiveMembers,
          peakActiveMembers: Math.max(state.school.peakActiveMembers, nextActiveMembers),
          historicMembers,
        },
        unlocks: {
          ...state.unlocks,
          upgrades: amount > 0 ? true : state.unlocks.upgrades,
          social: amount > 0 && nextActiveMembers >= 10
            ? true
            : state.unlocks.social,
          forms: amount > 0 ? true : state.unlocks.forms,
        },
      };
      break;
    }
    case "ADMIN_ADD_EUROS": {
      if (!Number.isFinite(action.amount) || action.amount === 0) {
        nextState = state;
        break;
      }
      const euros = Math.max(0, Math.round((state.school.euros + action.amount) * 100) / 100);
      nextState = Number.isFinite(euros)
        ? { ...state, school: { ...state.school, euros } }
        : state;
      break;
    }
    case "UPDATE_PROFILE_NAME":
      nextState = updateProfileName(state, action.displayName);
      break;
    case "FOUND_SCHOOL":
      nextState = foundSchool(state, action.details, action.now);
      break;
    case "BUY_UPGRADE":
      nextState = buyUpgrade(state, action.upgradeId);
      break;
    case "MARK_MESSAGE_READ":
      nextState = markMessageRead(state, action.messageId);
      break;
    case "MARK_ALL_MESSAGES_READ":
      nextState = markAllMessagesRead(state);
      break;
    case "MAINTAIN_EQUIPMENT":
      nextState = maintainEquipment(state, action.now);
      break;
    case "BUY_OFFICIAL_SWORD":
      nextState = buyOfficialSword(state);
      break;
    case "ASSIGN_COLLABORATOR":
      nextState = assignCollaborator(state, action.collaboratorId, action.assignment, action.now);
      break;
    case "TOGGLE_INSTRUCTOR_AUTOMATION":
      nextState = toggleInstructorAutomation(
        state,
        action.collaboratorId,
        action.enabled,
      );
      break;
    case "RUN_SOCIAL_CAMPAIGN":
      nextState = runSocialCampaign(state, action.now);
      break;
    case "START_FORM_TRAINING":
      nextState = startFormTraining(state, action.personId, action.formId, action.now);
      break;
    case "START_ACQUISITION_EVENT":
      nextState = startAcquisitionEvent(state, action.definitionId, action.now);
      break;
    default:
      nextState = state;
  }
  const now = "now" in action ? action.now : state.lastSavedAt;
  if (action.type === "OFFLINE_PASSIVE_PROGRESS") return nextState;
  const gainMultiplier = action.type === "TICK" ? (action.gainMultiplier ?? 1) : 1;
  return completeShortGoal(
    grantAchievements(nextState, now, gainMultiplier),
    now,
    gainMultiplier,
  );
}
