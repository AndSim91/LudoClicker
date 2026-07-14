import { EMAIL_TEMPLATES } from "../content/emailTemplates";
import { getAcquisitionEventDefinition } from "../content/events";
import { ACQUIRED_CONTACT_NAMES, CONTACT_NAMES } from "../content/names";
import {
  createInitialUpgradeLevels,
  getUpgradeCost,
  getUpgradeDefinition,
} from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import {
  getEmailBookingChance,
  getEnrollmentChance,
  getEventContactReward,
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
} from "./types";

function makeId(prefix: string, now: number, suffix: number | string): string {
  return `${prefix}-${now.toString(36)}-${suffix}`;
}

function createContacts(now: number): Contact[] {
  return CONTACT_NAMES.slice(0, GAME_CONFIG.initialContacts).map(([firstName, lastName], index) => ({
    id: makeId("contact", now, index),
    firstName,
    lastName,
    email: `${firstName}.${lastName}`.toLocaleLowerCase("it-IT") + "@esempio.test",
    source: "tutorial",
    acquiredAt: now,
    status: index === 0 ? "writing" : "available",
  }));
}

function createCampaign(contact: Contact, campaignIndex: number, now: number): CampaignEmail {
  const template = EMAIL_TEMPLATES[campaignIndex % EMAIL_TEMPLATES.length];
  return {
    id: makeId("email", now, campaignIndex),
    contactId: contact.id,
    templateId: template.id,
    subject: template.subject,
    body: template.body(contact.firstName),
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

export function createInitialState(now = Date.now()): GameState {
  const contacts = createContacts(now);
  return {
    version: GAME_CONFIG.version,
    createdAt: now,
    lastSavedAt: now,
    randomSeed: (now ^ 0x5f3759df) | 0,
    school: {
      name: "Ordine delle Onde — Genova",
      activeMembers: 0,
      historicMembers: 0,
      euros: 0,
      nextFeeAt: now + GAME_CONFIG.feePeriodMs,
    },
    player: { writingPower: 1 },
    contacts,
    emails: [createCampaign(contacts[0], 0, now)],
    pendingEmailOutcomes: [],
    scheduledTrials: [],
    messages: [systemMessage(now)],
    acquisitionEvents: [],
    activities: { nextSparringAt: now },
    statistics: {
      inputs: 0,
      emailsSent: 0,
      trialsBooked: 0,
      trialsCompleted: 0,
      contactsLost: 0,
      membersEnrolled: 0,
      eurosEarned: 0,
      contactsAcquired: 0,
      eventsCompleted: 0,
    },
    unlocks: { upgrades: false },
    upgrades: createInitialUpgradeLevels(),
  };
}

function createAcquiredContacts(
  state: GameState,
  count: number,
  source: "sparring" | "event",
  now: number,
): Contact[] {
  return Array.from({ length: count }, (_, index) => {
    const sequence = state.statistics.contactsAcquired + index;
    const [firstName, lastName] = ACQUIRED_CONTACT_NAMES[sequence % ACQUIRED_CONTACT_NAMES.length];
    const localPart = `${firstName}.${lastName}.${sequence + 1}`
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase("it-IT");
    return {
      id: makeId("contact", now, `acquired-${sequence}`),
      firstName,
      lastName,
      email: `${localPart}@esempio.test`,
      source,
      acquiredAt: now,
      status: "available",
    };
  });
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
  if (!nextContact) {
    const alreadyNotified = state.messages.some((message) => message.subject === "Contatti terminati");
    return alreadyNotified
      ? state
      : addMessage(
          state,
          now,
          "Contatti terminati",
          "La lista è vuota. Il Calendario sarà il prossimo strumento da attivare.",
          "system",
        );
  }

  const email = createCampaign(nextContact, state.emails.length, now);
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
  const result =
    guaranteedTutorialBooking || bookingRoll < getEmailBookingChance(state)
      ? "trialBooked"
      : "lost";
  const outcome: PendingEmailOutcome = {
    id: makeId("outcome", now, state.pendingEmailOutcomes.length),
    emailId: email.id,
    contactId: email.contactId,
    resolvesAt: now + outcomeDelay,
    result,
  };

  const nextState: GameState = {
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
  return startNextCampaign(nextState, now);
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
  const enrolled = tutorialGuarantee || enrollmentRoll < getEnrollmentChance(state);
  const wasEmpty = state.school.activeMembers === 0;

  let nextState: GameState = {
    ...state,
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
      eurosEarned: state.statistics.eurosEarned + (enrolled ? GAME_CONFIG.firstEnrollmentFee : 0),
    },
  };

  if (!enrolled) return nextState;

  nextState = {
    ...nextState,
    school: {
      ...nextState.school,
      activeMembers: nextState.school.activeMembers + 1,
      historicMembers: nextState.school.historicMembers + 1,
      euros: nextState.school.euros + GAME_CONFIG.firstEnrollmentFee,
      nextFeeAt: wasEmpty ? now + GAME_CONFIG.feePeriodMs : nextState.school.nextFeeAt,
    },
    unlocks: { ...nextState.unlocks, upgrades: true },
  };
  return addMessage(
    nextState,
    now,
    "Nuovo iscritto registrato",
    `Quota iniziale di € ${GAME_CONFIG.firstEnrollmentFee.toFixed(2).replace(".", ",")} accreditata. Nuovi miglioramenti disponibili.`,
  );
}

function collectFees(state: GameState, now: number): GameState {
  if (state.school.activeMembers === 0 || now < state.school.nextFeeAt) return state;
  const periods = Math.floor((now - state.school.nextFeeAt) / GAME_CONFIG.feePeriodMs) + 1;
  const earned = periods * state.school.activeMembers * GAME_CONFIG.memberFee;
  return {
    ...state,
    school: {
      ...state.school,
      euros: state.school.euros + earned,
      nextFeeAt: state.school.nextFeeAt + periods * GAME_CONFIG.feePeriodMs,
    },
    statistics: {
      ...state.statistics,
      eurosEarned: state.statistics.eurosEarned + earned,
    },
  };
}

function startAcquisitionEvent(
  state: GameState,
  definitionId: AcquisitionEvent["definitionId"],
  now: number,
): GameState {
  const definition = getAcquisitionEventDefinition(definitionId);
  if (!definition || state.acquisitionEvents.some((event) => event.status === "running")) {
    return state;
  }
  if (definitionId === "park-sparring" && now < state.activities.nextSparringAt) return state;
  if (
    definitionId === "public-demo" &&
    state.acquisitionEvents.some((event) => event.definitionId === "public-demo")
  ) {
    return state;
  }
  if (state.school.euros < definition.cost) return state;

  const event: AcquisitionEvent = {
    id: makeId("activity", now, state.acquisitionEvents.length),
    definitionId,
    title: definition.title,
    location: definition.location,
    startedAt: now,
    resolvesAt: now + definition.durationMs,
    cost: definition.cost,
    contactReward: getEventContactReward(state, definition.contactReward),
    status: "running",
  };
  return {
    ...state,
    school: { ...state.school, euros: state.school.euros - definition.cost },
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
  const contacts = createAcquiredContacts(state, contactReward, source, now);
  let nextState: GameState = {
    ...state,
    contacts: [...state.contacts, ...contacts],
    acquisitionEvents: state.acquisitionEvents.map((candidate) =>
      candidate.id === event.id
        ? { ...candidate, contactReward, status: "completed" }
        : candidate,
    ),
    statistics: {
      ...state.statistics,
      contactsAcquired: state.statistics.contactsAcquired + contacts.length,
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
  return startNextCampaign(nextState, now);
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

function tick(state: GameState, now: number): GameState {
  let nextState = state;

  for (const email of state.emails) {
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
  return collectFees(nextState, now);
}

function write(state: GameState, now: number): GameState {
  const activeEmail = selectActiveEmail(state);
  if (!activeEmail || activeEmail.status !== "writing") return state;
  const revealedCharacters = Math.min(
    activeEmail.body.length,
    activeEmail.revealedCharacters + state.player.writingPower,
  );
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
    statistics: { ...state.statistics, inputs: state.statistics.inputs + 1 },
  };
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
  const cost = getUpgradeCost(definition, currentLevel);
  if (state.school.euros < cost) return state;

  const upgrades = { ...state.upgrades, [upgradeId]: currentLevel + 1 };
  const nextState: GameState = {
    ...state,
    school: { ...state.school, euros: state.school.euros - cost },
    upgrades,
  };
  return {
    ...nextState,
    player: { ...nextState.player, writingPower: getWritingPower(nextState) },
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "WRITE":
      return write(state, action.now);
    case "TICK":
      return tick(state, action.now);
    case "BUY_UPGRADE":
      return buyUpgrade(state, action.upgradeId);
    case "MARK_MESSAGE_READ":
      return markMessageRead(state, action.messageId);
    case "START_ACQUISITION_EVENT":
      return startAcquisitionEvent(state, action.definitionId, action.now);
    default:
      return state;
  }
}
