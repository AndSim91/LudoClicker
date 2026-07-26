import { NARRATIVE_EVENTS } from "../content/narrativeEvents";
import type { InboxMessage } from "./types";

export type InboxCategory = NonNullable<InboxMessage["category"]>;

type InboxThreadKey = NonNullable<InboxMessage["threadKey"]>;

const SUBJECT_THREADS = new Map<string, InboxThreadKey>([
  ["Nuovi contatti dal volantinaggio", "contacts"],
  ["Nuovi contatti dallo sparring", "contacts"],
  ["Contatti acquisiti alla dimostrazione", "contacts"],
  ["Nuovi contatti dai Social", "contacts"],
  ["Campagna Social completata", "contacts"],
  ["Post inspiegabilmente virale", "contacts"],
  ["Nuovo iscritto registrato", "members"],
  ["Nuovo collaboratore disponibile", "collaborators"],
  ["Riepilogo formazione automatica", "training"],
  ["Formazione completata", "training"],
  ["Qualifica da Istruttore ottenuta", "training"],
]);

const NARRATIVE_SUBJECTS = new Set(
  NARRATIVE_EVENTS.map((definition) => definition.title),
);

export function getMessageThreadKey(message: InboxMessage): InboxThreadKey | undefined {
  if (message.threadKey) return message.threadKey;
  if (message.subject.includes("Riepilogo") && message.subject.includes("offline")) {
    return "offline";
  }
  if (
    message.subject.startsWith("Traguardo:") ||
    message.subject.startsWith("Obiettivo completato:")
  ) return "progress";
  if (NARRATIVE_SUBJECTS.has(message.subject)) return "narrative";
  if (message.subject.includes("iscritt") && message.subject.includes("lasciato la scuola")) {
    return "departures";
  }
  return SUBJECT_THREADS.get(message.subject);
}

export function getInboxCategory(message: InboxMessage): InboxCategory {
  if (message.category) return message.category;
  if (getMessageThreadKey(message) === "offline") return "other";
  if (
    message.subject.startsWith("Traguardo:") ||
    message.subject.startsWith("Obiettivo completato:")
  ) return "other";
  return "focused";
}

export function addInboxMessage(
  messages: InboxMessage[],
  message: InboxMessage,
): InboxMessage[] {
  const threadKey = getMessageThreadKey(message);
  if (!threadKey) return [message, ...messages];

  const existing = messages.find((candidate) => getMessageThreadKey(candidate) === threadKey);
  if (!existing) return [{ ...message, threadKey }, ...messages];

  return [
    {
      ...message,
      id: existing.id,
      threadKey,
      stackCount: (existing.stackCount ?? 1) + 1,
    },
    ...messages.filter((candidate) => getMessageThreadKey(candidate) !== threadKey),
  ];
}

export function normalizeStackedMessages(messages: InboxMessage[]): InboxMessage[] {
  const counts = new Map<string, number>();
  for (const message of messages) {
    const threadKey = getMessageThreadKey(message);
    if (!threadKey) continue;
    counts.set(threadKey, (counts.get(threadKey) ?? 0) + (message.stackCount ?? 1));
  }

  const emitted = new Set<string>();
  return messages.flatMap((message) => {
    const threadKey = getMessageThreadKey(message);
    if (!threadKey) return [message];
    const count = counts.get(threadKey);
    if (!count) return [message];
    if (emitted.has(threadKey)) return [];
    emitted.add(threadKey);
    return [{ ...message, threadKey, stackCount: count }];
  });
}
