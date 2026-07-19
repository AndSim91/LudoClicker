import type {
  AcquisitionEvent,
  CampaignEmail,
  Collaborator,
  Contact,
  PendingEmailOutcome,
  ScheduledTrial,
} from "./types";

type TrainingPerson = Contact | Collaborator;

const activeEmailsCache = new WeakMap<CampaignEmail[], CampaignEmail[]>();
const sendingEmailsCache = new WeakMap<CampaignEmail[], CampaignEmail[]>();
const pendingOutcomesCache = new WeakMap<PendingEmailOutcome[], PendingEmailOutcome[]>();
const scheduledTrialsCache = new WeakMap<ScheduledTrial[], ScheduledTrial[]>();
const scheduledTrialsByStartCache = new WeakMap<ScheduledTrial[], ScheduledTrial[]>();
const completedTrialsCache = new WeakMap<ScheduledTrial[], ScheduledTrial[]>();
const completedTrialsByStartDayCache = new WeakMap<
  ScheduledTrial[],
  ReadonlyMap<number, ScheduledTrial[]>
>();
const runningEventsCache = new WeakMap<AcquisitionEvent[], AcquisitionEvent[]>();
const activeTrainingsCache = new WeakMap<TrainingPerson[], TrainingPerson[]>();
const contactsByIdCache = new WeakMap<Contact[], ReadonlyMap<string, Contact>>();
const availableContactCountCache = new WeakMap<Contact[], number>();
const contactsAwaitingEmailCountCache = new WeakMap<Contact[], number>();
const enrolledLegendaryContactsCache = new WeakMap<Contact[], Contact[]>();
const collaboratorsByIdCache = new WeakMap<Collaborator[], ReadonlyMap<string, Collaborator>>();
const collaboratorsByContactIdCache = new WeakMap<
  Collaborator[],
  ReadonlyMap<string, Collaborator>
>();
const instructorLoadsCache = new WeakMap<
  Contact[],
  WeakMap<Collaborator[], ReadonlyMap<string, number>>
>();

function cachedFilter<T extends object>(
  cache: WeakMap<T[], T[]>,
  values: T[],
  predicate: (value: T) => boolean,
): T[] {
  const cached = cache.get(values);
  if (cached) return cached;
  const filtered = values.filter(predicate);
  cache.set(values, filtered);
  return filtered;
}

export function getActiveCampaignEmails(emails: CampaignEmail[]): CampaignEmail[] {
  return cachedFilter(
    activeEmailsCache,
    emails,
    (email) => email.status === "writing" || email.status === "sending",
  );
}

export function getSendingEmails(emails: CampaignEmail[]): CampaignEmail[] {
  const activeEmails = getActiveCampaignEmails(emails);
  return cachedFilter(
    sendingEmailsCache,
    activeEmails,
    (email) => email.status === "sending",
  );
}

export function getPendingEmailOutcomes(
  outcomes: PendingEmailOutcome[],
): PendingEmailOutcome[] {
  // The collection contains active outcomes only. Caching its identity also lets
  // callers use it as a stable snapshot while a resolver creates a replacement.
  const cached = pendingOutcomesCache.get(outcomes);
  if (cached) return cached;
  pendingOutcomesCache.set(outcomes, outcomes);
  return outcomes;
}

export function getScheduledTrials(trials: ScheduledTrial[]): ScheduledTrial[] {
  return cachedFilter(scheduledTrialsCache, trials, (trial) => trial.status === "scheduled");
}

export function getScheduledTrialsByStart(trials: ScheduledTrial[]): ScheduledTrial[] {
  const cached = scheduledTrialsByStartCache.get(trials);
  if (cached) return cached;
  const scheduled = getScheduledTrials(trials)
    .slice()
    .sort((left, right) => left.startsAt - right.startsAt);
  scheduledTrialsByStartCache.set(trials, scheduled);
  return scheduled;
}

export function getCompletedTrialsByMostRecent(
  trials: ScheduledTrial[],
): ScheduledTrial[] {
  const cached = completedTrialsCache.get(trials);
  if (cached) return cached;
  const completed = trials
    .filter((trial) => trial.status === "completed")
    .sort((left, right) => right.resolvesAt - left.resolvesAt);
  completedTrialsCache.set(trials, completed);
  return completed;
}

function getLocalDayStart(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function getCompletedTrialsByStartDay(
  trials: ScheduledTrial[],
): ReadonlyMap<number, ScheduledTrial[]> {
  const cached = completedTrialsByStartDayCache.get(trials);
  if (cached) return cached;
  const byDay = new Map<number, ScheduledTrial[]>();
  for (const trial of trials) {
    if (trial.status !== "completed") continue;
    const dayStart = getLocalDayStart(trial.startsAt);
    const dayTrials = byDay.get(dayStart);
    if (dayTrials) dayTrials.push(trial);
    else byDay.set(dayStart, [trial]);
  }
  completedTrialsByStartDayCache.set(trials, byDay);
  return byDay;
}

export function getRunningAcquisitionEvents(
  events: AcquisitionEvent[],
): AcquisitionEvent[] {
  return cachedFilter(runningEventsCache, events, (event) => event.status === "running");
}

export function getPeopleInTraining<T extends TrainingPerson>(people: T[]): T[] {
  return cachedFilter(
    activeTrainingsCache as WeakMap<T[], T[]>,
    people,
    (person) => Boolean(person.training),
  );
}

export function getContactsById(contacts: Contact[]): ReadonlyMap<string, Contact> {
  const cached = contactsByIdCache.get(contacts);
  if (cached) return cached;
  const index = new Map(contacts.map((contact) => [contact.id, contact]));
  contactsByIdCache.set(contacts, index);
  return index;
}

export function getAvailableContactCount(contacts: Contact[]): number {
  const cached = availableContactCountCache.get(contacts);
  if (cached !== undefined) return cached;
  let count = 0;
  for (const contact of contacts) {
    if (contact.status === "available") count += 1;
  }
  availableContactCountCache.set(contacts, count);
  return count;
}

export function getContactsAwaitingEmailCount(contacts: Contact[]): number {
  const cached = contactsAwaitingEmailCountCache.get(contacts);
  if (cached !== undefined) return cached;
  let count = 0;
  for (const contact of contacts) {
    if (contact.status === "available" || contact.status === "writing") count += 1;
  }
  contactsAwaitingEmailCountCache.set(contacts, count);
  return count;
}

export function getEnrolledLegendaryContacts(contacts: Contact[]): Contact[] {
  return cachedFilter(
    enrolledLegendaryContactsCache,
    contacts,
    (contact) => contact.status === "enrolled" && contact.rarity === "legendary",
  );
}

export function getCollaboratorsById(
  collaborators: Collaborator[],
): ReadonlyMap<string, Collaborator> {
  const cached = collaboratorsByIdCache.get(collaborators);
  if (cached) return cached;
  const index = new Map(collaborators.map((collaborator) => [collaborator.id, collaborator]));
  collaboratorsByIdCache.set(collaborators, index);
  return index;
}

export function getCollaboratorsByContactId(
  collaborators: Collaborator[],
): ReadonlyMap<string, Collaborator> {
  const cached = collaboratorsByContactIdCache.get(collaborators);
  if (cached) return cached;
  const index = new Map(
    collaborators.map((collaborator) => [collaborator.contactId, collaborator]),
  );
  collaboratorsByContactIdCache.set(collaborators, index);
  return index;
}

export function getInstructorTeachingCounts(
  contacts: Contact[],
  collaborators: Collaborator[],
): ReadonlyMap<string, number> {
  let byCollaborators = instructorLoadsCache.get(contacts);
  if (!byCollaborators) {
    byCollaborators = new WeakMap();
    instructorLoadsCache.set(contacts, byCollaborators);
  }
  const cached = byCollaborators.get(collaborators);
  if (cached) return cached;

  const counts = new Map<string, number>();
  for (const person of [...getPeopleInTraining(contacts), ...getPeopleInTraining(collaborators)]) {
    const instructorId = person.training?.instructorId;
    if (instructorId) counts.set(instructorId, (counts.get(instructorId) ?? 0) + 1);
  }
  byCollaborators.set(collaborators, counts);
  return counts;
}
