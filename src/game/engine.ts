import { EMAIL_TEMPLATES } from "../content/emailTemplates";
import { createProspectEmail } from "../content/emailAddresses";
import { getNewAchievements } from "../content/achievements";
import { getAcquisitionEventDefinition } from "../content/events";
import { canTrainForm, getCollaboratorProductivity, getFormDefinition } from "../content/forms";
import { NARRATIVE_EVENTS } from "../content/narrativeEvents";
import { ACQUIRED_CONTACT_NAMES, CONTACT_NAMES } from "../content/names";
import { PERSON_RARITIES } from "../content/rarities";
import { SPECIAL_COLLABORATORS } from "../content/specialCollaborators";
import {
  createInitialUpgradeLevels,
  getUpgradeCost,
  getUpgradeDefinition,
  getUpgradeEffectTotal,
} from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import {
  getEmailBookingChance,
  getEnrollmentChance,
  getEventFunnelOutcome,
  getWritingPower,
} from "./formulas";
import { nextRandom, randomBetween } from "./random";
import { selectActiveEmail } from "./selectors";
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
} from "./types";

const euroFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

function makeId(prefix: string, now: number, suffix: number | string): string {
  return `${prefix}-${now.toString(36)}-${suffix}`;
}

function normalizeEmailLocalPart(firstName: string, lastName: string): string {
  return `${firstName}.${lastName}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, ".")
    .toLocaleLowerCase("it-IT");
}

const ANDREA_SIMONAZZI_ID: SpecialCollaboratorId = "andrea-simonazzi";

function chooseLegendaryProfile(
  seed: number,
  progress: LegendaryCollaboratorProgress,
) {
  const [appearanceRoll, seedAfterAppearance] = nextRandom(seed);
  if (appearanceRoll >= PERSON_RARITIES.legendary.queueAppearanceChance) {
    return { profile: undefined, nextSeed: seedAfterAppearance };
  }
  const candidates = SPECIAL_COLLABORATORS.filter((profile) =>
    !progress.enrolledProfileIds.includes(profile.id) &&
    profile.id !== ANDREA_SIMONAZZI_ID,
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
  includeAndrea: boolean,
  seed: number,
  existingProgress: LegendaryCollaboratorProgress,
): { contacts: Contact[]; nextSeed: number; progress: LegendaryCollaboratorProgress } {
  let nextSeed = seed;
  let progress = existingProgress;
  const andrea = SPECIAL_COLLABORATORS.find((profile) => profile.id === ANDREA_SIMONAZZI_ID)!;
  const contacts = Array.from({ length: GAME_CONFIG.initialContacts }, (_, index) => {
    let legendaryProfile = includeAndrea && index === 8 &&
      !progress.enrolledProfileIds.includes(ANDREA_SIMONAZZI_ID)
      ? andrea
      : undefined;
    if (!legendaryProfile && index >= 9) {
      const selected = chooseLegendaryProfile(nextSeed, progress);
      legendaryProfile = selected.profile;
      nextSeed = selected.nextSeed;
    }
    if (legendaryProfile) {
      progress = addLegendaryEncounter(progress, legendaryProfile.id);
    }
    const [regularFirstName, regularLastName] = CONTACT_NAMES[index % CONTACT_NAMES.length];
    const firstName = legendaryProfile?.firstName ?? regularFirstName;
    const lastName = legendaryProfile?.lastName ?? regularLastName;
    return {
      id: makeId("contact", now, index),
      firstName,
      lastName,
      email: createProspectEmail(normalizeEmailLocalPart(firstName, lastName), index),
      source: "tutorial" as const,
      acquiredAt: now,
      status: index === 0 ? "writing" as const : "available" as const,
      rarity: legendaryProfile ? "legendary" as const : "common" as const,
      specialProfileId: legendaryProfile?.id,
    };
  });
  return { contacts, nextSeed, progress };
}

function createCampaign(
  contact: Contact,
  campaignIndex: number,
  now: number,
  senderName: string,
): CampaignEmail {
  const template = EMAIL_TEMPLATES[campaignIndex % EMAIL_TEMPLATES.length];
  return {
    id: makeId("email", now, campaignIndex),
    contactId: contact.id,
    templateId: template.id,
    subject: template.subject,
    body: template.body(contact.firstName, senderName),
    revealedCharacters: 0,
    createdAt: now,
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
  includeAndrea = true,
  existingLegendaryProgress?: LegendaryCollaboratorProgress,
): GameState {
  const initialSeed = (now ^ 0x5f3759df) | 0;
  const legendaryProgress = existingLegendaryProgress ?? {
    encounteredProfileIds: [],
    enrolledProfileIds: [],
    enrollmentAttempts: {},
  };
  const initialContacts = createContacts(
    now,
    includeAndrea,
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
      historicMembers: 0,
      euros: 0,
      currentMonth: 1,
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
    activities: { nextSparringAt: now },
    equipment: {
      totalSwords: GAME_CONFIG.initialSwords,
      availableSwords: GAME_CONFIG.initialSwords,
      wear: 0,
    },
    legendaryCollaborators: initialContacts.progress,
    collaborators: [],
    automation: {
      lastProcessedAt: now,
      writingBuffer: 0,
      socialBuffer: 0,
      equipmentBuffer: 0,
    },
    statistics: {
      inputs: 0,
      emailsSent: 0,
      trialsBooked: 0,
      trialsCompleted: 0,
      contactsLost: 0,
      membersEnrolled: 0,
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
    const selected = queuePosition >= 10
      ? chooseLegendaryProfile(nextSeed, progress)
      : { profile: undefined, nextSeed };
    const specialProfile = selected.profile;
    nextSeed = selected.nextSeed;
    if (specialProfile) progress = addLegendaryEncounter(progress, specialProfile.id);
    const [regularFirstName, regularLastName] =
      ACQUIRED_CONTACT_NAMES[sequence % ACQUIRED_CONTACT_NAMES.length];
    const firstName = specialProfile?.firstName ?? regularFirstName;
    const lastName = specialProfile?.lastName ?? regularLastName;
    const localPart = normalizeEmailLocalPart(firstName, lastName);
    return {
      id: makeId("contact", now, `acquired-${sequence}`),
      firstName,
      lastName,
      email: createProspectEmail(localPart, sequence),
      source,
      acquiredAt: now,
      status: "available" as const,
      rarity: specialProfile ? "legendary" as const : "common" as const,
      specialProfileId: specialProfile?.id,
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
  if (profileId === "andrea-simonazzi") return 1;
  const previousAttempts = state.legendaryCollaborators.enrollmentAttempts[profileId] ?? 0;
  return getEnrollmentChance(state, "legendary", previousAttempts);
}

function addMessage(
  state: GameState,
  now: number,
  subject: string,
  preview: string,
  tone: InboxMessage["tone"] = "positive",
): GameState {
  const message: InboxMessage = {
    id: makeId("message", now, state.messages.length),
    sender: "Segreteria Ordine delle Onde",
    subject,
    preview,
    receivedAt: now,
    tone,
    unread: true,
  };
  return { ...state, messages: [message, ...state.messages] };
}

function startNextCampaign(state: GameState, now: number): GameState {
  if (selectActiveEmail(state)) return state;
  const nextContact = state.contacts.find((contact) => contact.status === "available");
  if (!nextContact) return state;

  const email = createCampaign(nextContact, state.emails.length, now, state.profile.displayName);
  return {
    ...state,
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
    guaranteedTutorialBooking || protectedBooking || bookingRoll < getEmailBookingChance(state)
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
      "La prima email è partita. Miglioramenti di Scrittura e Velocità sono disponibili nella barra laterale.",
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

function resolveTrial(state: GameState, trial: ScheduledTrial, now: number): GameState {
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
        ? { ...contact, status: enrolled ? "enrolled" : "lost" }
        : contact,
    ),
    statistics: {
      ...state.statistics,
      trialsCompleted: state.statistics.trialsCompleted + 1,
      contactsLost: state.statistics.contactsLost + (enrolled ? 0 : 1),
      membersEnrolled: state.statistics.membersEnrolled + (enrolled ? 1 : 0),
      eurosEarned: state.statistics.eurosEarned + (enrolled ? GAME_CONFIG.enrollmentBonus : 0),
    },
  };

  if (!enrolled) return nextState;

  nextState = {
    ...nextState,
    school: {
      ...nextState.school,
      activeMembers: nextState.school.activeMembers + 1,
      historicMembers: nextState.school.historicMembers + 1,
      euros: nextState.school.euros + GAME_CONFIG.enrollmentBonus,
    },
    unlocks: {
      ...nextState.unlocks,
      upgrades: true,
      social: nextState.school.activeMembers >= 10,
      forms: nextState.school.activeMembers >= 50,
    },
  };
  nextState = addMessage(
    nextState,
    now,
    state.school.historicMembers === 0 ? "Primo iscritto registrato" : "Nuovo iscritto registrato",
    `Bonus di iscrizione di € ${GAME_CONFIG.enrollmentBonus.toFixed(2).replace(".", ",")} accreditato. La quota mensile di € ${GAME_CONFIG.monthlyMemberFee.toFixed(2).replace(".", ",")} arriverà al prossimo cambio mese.`,
  );

  const enrolledContact = nextState.contacts.find((contact) => contact.id === trial.contactId);
  const [volunteerRoll, nextSeed] = nextRandom(nextState.randomSeed);
  const becomesVolunteer =
    Boolean(enrolledContact?.specialProfileId) || nextState.collaborators.length === 0 ||
    volunteerRoll < GAME_CONFIG.volunteerChance;
  nextState = { ...nextState, randomSeed: nextSeed };
  if (!becomesVolunteer || !enrolledContact) return nextState;

  const collaborator = {
    id: makeId("collaborator", now, nextState.collaborators.length),
    contactId: enrolledContact.id,
    displayName: `${enrolledContact.firstName} ${enrolledContact.lastName}`,
    joinedAt: now,
    forms: [] as FormId[],
    assignment: null,
    rarity: enrolledContact.rarity,
    specialProfileId: enrolledContact.specialProfileId,
  };
  nextState = {
    ...nextState,
    collaborators: [...nextState.collaborators, collaborator],
    unlocks: { ...nextState.unlocks, collaborators: true },
    statistics: {
      ...nextState.statistics,
      collaboratorsRecruited: nextState.statistics.collaboratorsRecruited + 1,
    },
  };
  return addMessage(
    nextState,
    now + 1,
    "Nuovo collaboratore disponibile",
    `${collaborator.displayName} è disponibile per Redazione, Eventi, Lezioni, Social o Attrezzatura.`,
  );
}

function collectFees(state: GameState, now: number): GameState {
  if (now < state.school.nextFeeAt) return state;
  const periods = Math.floor((now - state.school.nextFeeAt) / GAME_CONFIG.gameMonthMs) + 1;
  const networkMultiplier = 1 + state.network.schools.length * GAME_CONFIG.prestigeBonusPerSchool;
  const earned = Math.round((
    periods *
    (state.school.activeMembers * GAME_CONFIG.monthlyMemberFee +
      state.network.schools.length * GAME_CONFIG.networkIncomePerSchool) *
    (1 + getUpgradeEffectTotal(state.upgrades, "incomeMultiplier")) *
    networkMultiplier
  ) * 100) / 100;
  return {
    ...state,
    school: {
      ...state.school,
      euros: Math.round((state.school.euros + earned) * 100) / 100,
      currentMonth: state.school.currentMonth + periods,
      nextFeeAt: state.school.nextFeeAt + periods * GAME_CONFIG.gameMonthMs,
    },
    statistics: {
      ...state.statistics,
      eurosEarned: Math.round((state.statistics.eurosEarned + earned) * 100) / 100,
    },
  };
}

function startAcquisitionEvent(
  state: GameState,
  definitionId: AcquisitionEvent["definitionId"],
  now: number,
): GameState {
  const definition = getAcquisitionEventDefinition(definitionId);
  const maxConcurrentEvents = 1 + Math.floor(state.network.schools.length / 2);
  const runningEvents = state.acquisitionEvents.filter((event) => event.status === "running").length;
  if (!definition || runningEvents >= maxConcurrentEvents) {
    return state;
  }
  if (definitionId === "park-sparring" && now < state.activities.nextSparringAt) return state;
  if (state.school.activeMembers < definition.requiredMembers) return state;
  if (state.equipment.availableSwords < definition.requiredSwords) return state;
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
    equipmentUsed: definition.requiredSwords,
    wearAdded: Math.max(
      0,
      Math.round(
        definition.wearAdded *
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
      availableSwords: state.equipment.availableSwords - definition.requiredSwords,
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
): GameState {
  if (event.status !== "running") return state;
  const source = event.definitionId === "park-sparring" ? "sparring" : "event";
  const contactReward = event.contactReward ?? 0;
  const acquired = createAcquiredContacts(state, contactReward, source, now);
  const contacts = acquired.contacts;
  let nextState: GameState = {
    ...state,
    randomSeed: acquired.nextSeed,
    legendaryCollaborators: addLegendaryEncounters(state.legendaryCollaborators, contacts),
    contacts: [...state.contacts, ...contacts],
    equipment: {
      ...state.equipment,
      availableSwords: Math.min(
        state.equipment.totalSwords,
        state.equipment.availableSwords + (event.equipmentUsed ?? 0),
      ),
      wear: Math.min(100, state.equipment.wear + (event.wearAdded ?? 0)),
    },
    acquisitionEvents: state.acquisitionEvents.map((candidate) =>
      candidate.id === event.id
        ? { ...candidate, contactReward, status: "completed" }
        : candidate,
    ),
    statistics: {
      ...state.statistics,
      contactsAcquired: state.statistics.contactsAcquired + contacts.length,
      peopleMet: state.statistics.peopleMet + event.peopleMet,
      demonstrationsGiven:
        state.statistics.demonstrationsGiven + event.demonstrationsGiven,
      eventsCompleted: state.statistics.eventsCompleted + 1,
    },
  };
  if (contacts.length === 0) return nextState;

  nextState = addMessage(
    nextState,
    now,
    event.definitionId === "park-sparring"
      ? "Nuovi contatti dallo sparring"
      : "Contatti acquisiti alla dimostrazione",
    `${contacts.length} nuovi indirizzi sono disponibili per la campagna email.`,
  );
  if (state.statistics.eventsCompleted === 0) {
    nextState = addMessage(
      nextState,
      now + 1,
      "Le spade non si sistemano da sole",
      "Gli eventi consumano l'attrezzatura. Controlla l'usura e pianifica la manutenzione dalla sezione Attività.",
      "system",
    );
  }
  return startNextCampaign(nextState, now);
}

function maintainEquipment(state: GameState): GameState {
  if (
    state.equipment.wear <= 0 ||
    state.school.euros < GAME_CONFIG.equipmentMaintenanceCost ||
    state.acquisitionEvents.some((event) => event.status === "running")
  ) {
    return state;
  }
  return {
    ...state,
    school: {
      ...state.school,
      euros: state.school.euros - GAME_CONFIG.equipmentMaintenanceCost,
    },
    equipment: { ...state.equipment, wear: 0 },
    statistics: {
      ...state.statistics,
      maintenanceCompleted: state.statistics.maintenanceCompleted + 1,
    },
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

function assignCollaborator(
  state: GameState,
  collaboratorId: string,
  assignment: CollaboratorAssignment,
): GameState {
  if (assignment === "social" && !state.unlocks.social) return state;
  if (!state.collaborators.some((collaborator) => collaborator.id === collaboratorId)) {
    return state;
  }
  return {
    ...state,
    collaborators: state.collaborators.map((collaborator) =>
      collaborator.id === collaboratorId ? { ...collaborator, assignment } : collaborator,
    ),
  };
}

function startFormTraining(
  state: GameState,
  collaboratorId: string,
  formId: FormId,
  now: number,
): GameState {
  if (!state.unlocks.forms) return state;
  const collaborator = state.collaborators.find((candidate) => candidate.id === collaboratorId);
  const definition = getFormDefinition(formId);
  if (
    !collaborator ||
    !definition ||
    !canTrainForm(collaborator, definition) ||
    state.school.euros < definition.cost
  ) return state;
  return {
    ...state,
    school: { ...state.school, euros: state.school.euros - definition.cost },
    collaborators: state.collaborators.map((candidate) =>
      candidate.id === collaboratorId
        ? {
            ...candidate,
            training: {
              formId,
              startedAt: now,
              completesAt: now + definition.durationMs,
            },
          }
        : candidate,
    ),
  };
}

function resolveFormTraining(state: GameState, collaboratorId: string, now: number): GameState {
  const collaborator = state.collaborators.find((candidate) => candidate.id === collaboratorId);
  if (!collaborator?.training || collaborator.training.completesAt > now) return state;
  const definition = getFormDefinition(collaborator.training.formId);
  if (!definition) return state;
  let nextState: GameState = {
    ...state,
    collaborators: state.collaborators.map((candidate) =>
      candidate.id === collaboratorId
        ? {
            ...candidate,
            forms: [...candidate.forms, collaborator.training!.formId],
            training: undefined,
          }
        : candidate,
    ),
    statistics: {
      ...state.statistics,
      formsCompleted: state.statistics.formsCompleted + 1,
    },
  };
  nextState = addMessage(
    nextState,
    now,
    "Formazione completata",
    `${collaborator.displayName} ha completato ${definition.title}${definition.branch ? ` — ${definition.branch}` : ""}.`,
  );
  return nextState;
}

function writeCharacters(
  state: GameState,
  amount: number,
  now: number,
  source: "manual" | "automation",
): GameState {
  const activeEmail = selectActiveEmail(state);
  if (!activeEmail || activeEmail.status !== "writing" || amount <= 0) return state;
  const revealedCharacters = Math.min(
    activeEmail.body.length,
    activeEmail.revealedCharacters + amount,
  );
  const charactersWritten = revealedCharacters - activeEmail.revealedCharacters;
  const completed = revealedCharacters >= activeEmail.body.length;
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

function processAutomation(state: GameState, now: number): GameState {
  const elapsedMs = Math.min(1_000, Math.max(0, now - state.automation.lastProcessedAt));
  if (elapsedMs <= 0) return state;

  const productivityFor = (assignment: CollaboratorAssignment) =>
    state.collaborators
      .filter((collaborator) => collaborator.assignment === assignment)
      .reduce((total, collaborator) => total + getCollaboratorProductivity(collaborator), 0);
  const writingProductivity = productivityFor("writing");
  const socialProductivity = state.unlocks.social ? productivityFor("social") : 0;
  const equipmentProductivity = productivityFor("equipment");
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
    automationMultiplier;
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
      lastProcessedAt: now,
      writingBuffer: writingTotal - automatedCharacters,
      socialBuffer: socialTotal - socialContacts,
      equipmentBuffer: equipmentTotal - repairedWear,
    },
    equipment: {
      ...state.equipment,
      wear: Math.max(0, state.equipment.wear - repairedWear),
    },
  };

  if (automatedCharacters > 0) {
    nextState = writeCharacters(nextState, automatedCharacters, now, "automation");
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
  nextState = addMessage(
    nextState,
    now,
    viral ? "Post inspiegabilmente virale" : "Campagna Social completata",
    `${contacts.length} nuovi indirizzi sono disponibili per la campagna email.`,
  );
  return startNextCampaign(nextState, now);
}

function processNarrativeEvent(state: GameState, now: number): GameState {
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
  const acquired = definition.contactDelta
    ? createAcquiredContacts(
        { ...state, randomSeed: nextSeed },
        definition.contactDelta,
        "collaborator",
        now,
      )
    : { contacts: [], nextSeed };
  const contacts = acquired.contacts;
  const summary = definition.euroDelta && definition.euroDelta > 0
    ? `${definition.description} Contributo ricevuto: ${euroFormatter.format(definition.euroDelta)}.`
    : definition.description;
  let nextState: GameState = {
    ...state,
    randomSeed: acquired.nextSeed,
    legendaryCollaborators: addLegendaryEncounters(state.legendaryCollaborators, contacts),
    school: {
      ...state.school,
      activeMembers: Math.max(0, state.school.activeMembers + (definition.memberDelta ?? 0)),
      euros: Math.max(0, state.school.euros + (definition.euroDelta ?? 0)),
    },
    equipment: {
      ...state.equipment,
      wear: Math.min(100, Math.max(0, state.equipment.wear + (definition.wearDelta ?? 0))),
    },
    contacts: [...state.contacts, ...contacts],
    narrative: {
      nextEventAt: now + nextDelay,
      history: [
        ...state.narrative.history,
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
      ...state.statistics,
      contactsAcquired: state.statistics.contactsAcquired + contacts.length,
      narrativeEvents: state.statistics.narrativeEvents + 1,
      eurosEarned:
        state.statistics.eurosEarned + Math.max(0, definition.euroDelta ?? 0),
    },
  };
  nextState = addMessage(nextState, now, definition.title, summary, definition.tone);
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

function foundSchool(
  state: GameState,
  details: SchoolFoundationDetails,
  now: number,
): GameState {
  if (!canFoundSchool(state) || !details.name.trim() || !details.city.trim()) return state;
  const fresh = createInitialState(
    now,
    state.profile.displayName,
    !state.legendaryCollaborators.enrolledProfileIds.includes(ANDREA_SIMONAZZI_ID),
    state.legendaryCollaborators,
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

function grantAchievements(state: GameState, now: number): GameState {
  const earned = getNewAchievements(state);
  if (earned.length === 0) return state;
  const reward = earned.reduce((total, definition) => total + definition.euroReward, 0);
  let nextState: GameState = {
    ...state,
    achievements: [...state.achievements, ...earned.map((definition) => definition.id)],
    school: { ...state.school, euros: state.school.euros + reward },
    statistics: { ...state.statistics, eurosEarned: state.statistics.eurosEarned + reward },
  };
  for (const definition of earned) {
    nextState = addMessage(
      nextState,
      now,
      `Traguardo: ${definition.title}`,
      `${definition.description} Premio amministrativo: € ${definition.euroReward}.`,
      "system",
    );
  }
  return nextState;
}

function tick(state: GameState, now: number): GameState {
  let nextState = processAutomation(state, now);

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
      nextState = resolveTrial(nextState, trial, now);
    }
  }
  for (const event of nextState.acquisitionEvents.slice()) {
    if (event.status === "running" && event.resolvesAt <= now) {
      nextState = resolveAcquisitionEvent(nextState, event, now);
    }
  }
  for (const collaborator of nextState.collaborators.slice()) {
    if (collaborator.training && collaborator.training.completesAt <= now) {
      nextState = resolveFormTraining(nextState, collaborator.id, now);
    }
  }
  nextState = collectFees(nextState, now);
  nextState = processNarrativeEvent(nextState, now);
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
  const totalSwords =
    GAME_CONFIG.initialSwords +
    Math.floor(getUpgradeEffectTotal(upgrades, "totalSwords"));
  const addedSwords = Math.max(0, totalSwords - state.equipment.totalSwords);
  const nextState: GameState = {
    ...state,
    school: { ...state.school, euros: state.school.euros - cost },
    upgrades,
    equipment: {
      ...state.equipment,
      totalSwords,
      availableSwords: state.equipment.availableSwords + addedSwords,
    },
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
      const body = template.body(contact.firstName, normalizedName);
      return {
        ...email,
        body,
        revealedCharacters: Math.min(email.revealedCharacters, body.length),
      };
    }),
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  let nextState: GameState;
  switch (action.type) {
    case "WRITE":
      nextState = write(state, action.now);
      break;
    case "TICK":
      nextState = tick(state, action.now);
      break;
    case "REPLACE_STATE":
      nextState = action.state;
      break;
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
    case "MAINTAIN_EQUIPMENT":
      nextState = maintainEquipment(state);
      break;
    case "ASSIGN_COLLABORATOR":
      nextState = assignCollaborator(state, action.collaboratorId, action.assignment);
      break;
    case "RUN_SOCIAL_CAMPAIGN":
      nextState = runSocialCampaign(state, action.now);
      break;
    case "START_FORM_TRAINING":
      nextState = startFormTraining(state, action.collaboratorId, action.formId, action.now);
      break;
    case "START_ACQUISITION_EVENT":
      nextState = startAcquisitionEvent(state, action.definitionId, action.now);
      break;
    default:
      nextState = state;
  }
  const now = "now" in action ? action.now : state.lastSavedAt;
  return grantAchievements(nextState, now);
}
