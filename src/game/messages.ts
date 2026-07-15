import type { InboxMessage } from "./types";

const STACKED_MESSAGE_SUBJECTS = new Set(["Passaparola inatteso"]);

export function addInboxMessage(
  messages: InboxMessage[],
  message: InboxMessage,
): InboxMessage[] {
  if (!STACKED_MESSAGE_SUBJECTS.has(message.subject)) return [message, ...messages];

  const existing = messages.find((candidate) => candidate.subject === message.subject);
  if (!existing) return [message, ...messages];

  return [
    {
      ...message,
      id: existing.id,
      stackCount: (existing.stackCount ?? 1) + 1,
    },
    ...messages.filter((candidate) => candidate.subject !== message.subject),
  ];
}

export function normalizeStackedMessages(messages: InboxMessage[]): InboxMessage[] {
  const counts = new Map<string, number>();
  for (const message of messages) {
    if (!STACKED_MESSAGE_SUBJECTS.has(message.subject)) continue;
    counts.set(message.subject, (counts.get(message.subject) ?? 0) + (message.stackCount ?? 1));
  }

  const emitted = new Set<string>();
  return messages.flatMap((message) => {
    const count = counts.get(message.subject);
    if (!count) return [message];
    if (emitted.has(message.subject)) return [];
    emitted.add(message.subject);
    return [{ ...message, stackCount: count }];
  });
}
