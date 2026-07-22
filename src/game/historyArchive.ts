import { GAME_CONFIG } from "./config";
import type {
  AcquisitionEventId,
  CampaignEmail,
  Contact,
  GameState,
  HistoryArchive,
} from "./types";

const CONTACT_SOURCES: Contact["source"][] = [
  "tutorial",
  "sparring",
  "event",
  "social",
  "collaborator",
  "tournament",
];

export function createEmptyHistoryArchive(): HistoryArchive {
  return {
    contactsBySource: {
      tutorial: { total: 0, enrolled: 0 },
      sparring: { total: 0, enrolled: 0 },
      event: { total: 0, enrolled: 0 },
      social: { total: 0, enrolled: 0 },
      collaborator: { total: 0, enrolled: 0 },
      tournament: { total: 0, enrolled: 0 },
    },
    emails: { count: 0, totalWritingMs: 0 },
    completedTrials: 0,
    completedEventsByDefinition: {},
  };
}

function newestIds<T>(
  values: T[],
  limit: number,
  isTerminal: (value: T) => boolean,
  getId: (value: T) => string,
): Set<string> {
  const retained = new Set<string>();
  for (let index = values.length - 1; index >= 0 && retained.size < limit; index -= 1) {
    const value = values[index];
    if (isTerminal(value)) retained.add(getId(value));
  }
  return retained;
}

function hasMoreThan<T>(
  values: T[],
  limit: number,
  predicate: (value: T) => boolean,
): boolean {
  let count = 0;
  for (const value of values) {
    if (predicate(value) && ++count > limit) return true;
  }
  return false;
}

function emailWritingMs(email: CampaignEmail): number {
  return typeof email.sentAt === "number"
    ? Math.max(0, email.sentAt - email.createdAt)
    : 0;
}

export function getArchivedCompletedEventCount(
  archive: HistoryArchive,
  definitionId?: AcquisitionEventId,
): number {
  if (definitionId) return archive.completedEventsByDefinition[definitionId] ?? 0;
  return Object.values(archive.completedEventsByDefinition)
    .reduce((total, count) => total + (count ?? 0), 0);
}

export function getArchivedContactCount(archive: HistoryArchive): number {
  return CONTACT_SOURCES.reduce(
    (total, source) => total + archive.contactsBySource[source].total,
    0,
  );
}

export function getCurrentSchoolContactCount(state: GameState): number {
  return getArchivedContactCount(state.historyArchive) + state.contacts.length;
}

export function compactGameHistory(state: GameState): GameState {
  const shouldCompactEmails = hasMoreThan(
    state.emails,
    GAME_CONFIG.recentEmailsLimit,
    (email) => email.status === "lost" || email.status === "trialBooked",
  );
  const shouldCompactTrials = hasMoreThan(
    state.scheduledTrials,
    GAME_CONFIG.recentCompletedTrialsLimit,
    (trial) => trial.status === "completed" || trial.status === "cancelled",
  );
  const shouldCompactEvents = hasMoreThan(
    state.acquisitionEvents,
    GAME_CONFIG.recentCompletedEventsLimit,
    (event) => event.status === "completed",
  );
  const shouldCompactContacts = hasMoreThan(
    state.contacts,
    GAME_CONFIG.recentTerminalContactsLimit,
    (contact) => contact.status === "lost" || contact.status === "departed",
  );
  if (!shouldCompactEmails && !shouldCompactTrials && !shouldCompactEvents && !shouldCompactContacts) {
    return state;
  }

  const archive: HistoryArchive = {
    contactsBySource: Object.fromEntries(
      CONTACT_SOURCES.map((source) => [source, { ...state.historyArchive.contactsBySource[source] }]),
    ) as HistoryArchive["contactsBySource"],
    emails: { ...state.historyArchive.emails },
    completedTrials: state.historyArchive.completedTrials,
    completedEventsByDefinition: { ...state.historyArchive.completedEventsByDefinition },
  };

  const retainedEmailIds = newestIds(
    state.emails,
    GAME_CONFIG.recentEmailsLimit,
    (email) => email.status === "lost" || email.status === "trialBooked",
    (email) => email.id,
  );
  const retainedEmails = state.emails.filter((email) => {
    const terminal = email.status === "lost" || email.status === "trialBooked";
    if (!terminal || retainedEmailIds.has(email.id)) return true;
    archive.emails.count += 1;
    archive.emails.totalWritingMs += emailWritingMs(email);
    return false;
  });

  const retainedTrialIds = newestIds(
    state.scheduledTrials,
    GAME_CONFIG.recentCompletedTrialsLimit,
    (trial) => trial.status === "completed" || trial.status === "cancelled",
    (trial) => trial.id,
  );
  const retainedTrials = state.scheduledTrials.filter((trial) => {
    const terminal = trial.status === "completed" || trial.status === "cancelled";
    if (!terminal || retainedTrialIds.has(trial.id)) return true;
    if (trial.status === "completed") archive.completedTrials += 1;
    return false;
  });

  const retainedEventIds = newestIds(
    state.acquisitionEvents,
    GAME_CONFIG.recentCompletedEventsLimit,
    (event) => event.status === "completed",
    (event) => event.id,
  );
  const retainedEvents = state.acquisitionEvents.filter((event) => {
    if (event.status !== "completed" || retainedEventIds.has(event.id)) return true;
    archive.completedEventsByDefinition[event.definitionId] =
      (archive.completedEventsByDefinition[event.definitionId] ?? 0) + 1;
    return false;
  });

  const referencedContactIds = new Set<string>();
  for (const email of retainedEmails) referencedContactIds.add(email.contactId);
  for (const outcome of state.pendingEmailOutcomes) referencedContactIds.add(outcome.contactId);
  for (const trial of retainedTrials) referencedContactIds.add(trial.contactId);
  for (const collaborator of state.collaborators) referencedContactIds.add(collaborator.contactId);

  const terminalContactIds = newestIds(
    state.contacts,
    GAME_CONFIG.recentTerminalContactsLimit,
    (contact) => contact.status === "lost" || contact.status === "departed",
    (contact) => contact.id,
  );
  const retainedContacts = state.contacts.filter((contact) => {
    const terminal = contact.status === "lost" || contact.status === "departed";
    if (!terminal || referencedContactIds.has(contact.id) || terminalContactIds.has(contact.id)) {
      return true;
    }
    archive.contactsBySource[contact.source].total += 1;
    return false;
  });

  if (
    retainedContacts.length === state.contacts.length &&
    retainedEmails.length === state.emails.length &&
    retainedTrials.length === state.scheduledTrials.length &&
    retainedEvents.length === state.acquisitionEvents.length
  ) return state;

  return {
    ...state,
    contacts: retainedContacts,
    emails: retainedEmails,
    scheduledTrials: retainedTrials,
    acquisitionEvents: retainedEvents,
    historyArchive: archive,
  };
}

export function getSourceSummaries(
  contacts: Contact[],
  archived: HistoryArchive["contactsBySource"],
): HistoryArchive["contactsBySource"] {
  const summaries = Object.fromEntries(
    CONTACT_SOURCES.map((source) => [source, { ...archived[source] }]),
  ) as HistoryArchive["contactsBySource"];
  for (const contact of contacts) {
    summaries[contact.source].total += 1;
    if (contact.status === "enrolled") summaries[contact.source].enrolled += 1;
  }
  return summaries;
}

export function getAverageWritingSeconds(
  emails: CampaignEmail[],
  archived: HistoryArchive["emails"],
): number {
  let count = archived.count;
  let totalMs = archived.totalWritingMs;
  for (const email of emails) {
    if (typeof email.sentAt !== "number") continue;
    count += 1;
    totalMs += emailWritingMs(email);
  }
  return count === 0 ? 0 : Math.round(totalMs / count / 1_000);
}
