import { getSchoolYear } from "./calendar";
import { makeGameId } from "./ids";
import type { GameState, InboxMessage, YearDigestCounts } from "./types";

/*
 * Riepilogo dell'anno scolastico (4.1). Routine news (new members, automatic
 * Forms, contacts, ordinary collaborators, narrative events, departures) no
 * longer arrive one by one: one message per school year sums them up. The
 * numbers are the growth of the cumulative statistics since the year opened;
 * the message refreshes every month in place, without going back to the top.
 */

type DigestStatistic = keyof Pick<
  GameState["statistics"],
  "membersEnrolled" | "formsCompleted" | "contactsAcquired" | "collaboratorsRecruited" | "membersDeparted"
>;

// Narrative events are counted apart: yearly departures also land in the narrative history.
const DIGEST_STATISTICS: Record<Exclude<keyof YearDigestCounts, "lastNarrative" | "narrative">, DigestStatistic> = {
  members: "membersEnrolled",
  forms: "formsCompleted",
  contacts: "contactsAcquired",
  collaborators: "collaboratorsRecruited",
  departures: "membersDeparted",
};

export const DIGEST_LABELS: Record<Exclude<keyof YearDigestCounts, "lastNarrative">, string> = {
  members: "Nuovi iscritti",
  forms: "Forme completate",
  contacts: "Contatti acquisiti",
  collaborators: "Nuovi collaboratori",
  departures: "Abbandoni",
  narrative: "Eventi narrativi",
};

type Snapshot = Partial<Record<DigestStatistic, number>>;

function snapshot(state: GameState): Snapshot {
  return Object.fromEntries(
    Object.values(DIGEST_STATISTICS).map((key) => [key, state.statistics[key]]),
  );
}

function countSince(
  state: GameState,
  start: Snapshot,
  narrative: { count?: number; last?: string } = {},
): YearDigestCounts {
  const counts = Object.fromEntries(
    Object.entries(DIGEST_STATISTICS).map(([key, statistic]) => [
      key,
      Math.max(0, state.statistics[statistic] - (start[statistic] ?? state.statistics[statistic])),
    ]),
  ) as unknown as YearDigestCounts;
  return {
    ...counts,
    narrative: narrative.count ?? 0,
    ...(narrative.last ? { lastNarrative: narrative.last } : {}),
  };
}

export function describeDigest(counts: YearDigestCounts): string {
  const nf = (value: number) => value.toLocaleString("it-IT");
  const parts = [
    counts.members > 0 ? `+${nf(counts.members)} iscritti` : "",
    counts.forms > 0 ? `${nf(counts.forms)} Forme` : "",
    counts.contacts > 0 ? `${nf(counts.contacts)} contatti` : "",
    counts.collaborators > 0 ? `${nf(counts.collaborators)} collaboratori` : "",
    counts.departures > 0 ? `${nf(counts.departures)} abbandoni` : "",
    counts.narrative > 0 ? `${nf(counts.narrative)} eventi` : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Ancora nessuna novità quest'anno.";
}

function withDigestMessage(
  state: GameState,
  messageId: string,
  update: (message: InboxMessage) => InboxMessage,
): GameState {
  let changed = false;
  const messages = state.messages.map((message) => {
    if (message.id !== messageId) return message;
    changed = true;
    return update(message);
  });
  return changed ? { ...state, messages } : state;
}

function createDigestMessage(
  schoolYear: number,
  counts: YearDigestCounts,
  now: number,
  category: InboxMessage["category"],
): InboxMessage {
  return {
    id: makeGameId("digest", now, schoolYear),
    sender: "Ordine delle Onde",
    subject: `Riepilogo dell'anno scolastico ${schoolYear}`,
    preview: describeDigest(counts),
    receivedAt: now,
    tone: "neutral",
    unread: true,
    category,
    digest: counts,
  };
}

/** Writes the counts into the year's message, creating it with the first news. */
function publish(
  state: GameState,
  digest: NonNullable<GameState["yearDigest"]>,
  now: number,
  final: boolean,
): GameState {
  const counts = countSince(state, digest.start, { count: digest.narrative, last: digest.lastNarrative });
  const category = final ? "other" : "focused";
  if (digest.messageId) {
    return withDigestMessage(state, digest.messageId, (message) => ({
      ...message,
      preview: describeDigest(counts),
      digest: counts,
      category,
    }));
  }
  const hasNews = counts.narrative > 0 ||
    Object.keys(DIGEST_STATISTICS).some((key) => counts[key as keyof typeof DIGEST_STATISTICS] > 0);
  if (!hasNews) return state;
  const message = createDigestMessage(digest.schoolYear, counts, now, category);
  return {
    ...state,
    messages: [message, ...state.messages],
    yearDigest: { ...digest, messageId: message.id },
  };
}

/**
 * Called after every action and tick step: once a month it refreshes the
 * year's digest in place; at a new school year (or a new school) it closes
 * the old one into «Altra» and starts counting again.
 */
export function syncYearDigest(state: GameState, now: number): GameState {
  const schoolYear = getSchoolYear(state.school.currentMonth);
  const digest = state.yearDigest;
  const month = state.school.currentMonth;
  if (digest && digest.schoolYear === schoolYear && digest.month === month) return state;

  if (digest && digest.schoolYear === schoolYear) {
    const published = publish(state, digest, now, false);
    return { ...published, yearDigest: { ...(published.yearDigest ?? digest), month } };
  }

  const closed = digest ? publish(state, digest, now, true) : state;
  return {
    ...closed,
    yearDigest: { schoolYear, month, start: snapshot(state) },
  };
}

/** A narrative event of the year: it goes in the digest instead of its own message. */
export function noteNarrativeEvent(state: GameState, title: string): GameState {
  const digest = state.yearDigest;
  if (!digest) return state;
  return {
    ...state,
    yearDigest: { ...digest, narrative: (digest.narrative ?? 0) + 1, lastNarrative: title },
  };
}
