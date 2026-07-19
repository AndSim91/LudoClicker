import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS } from "../content/achievements";
import { createInitialState, gameReducer } from "./engine";
import {
  compactGameHistory,
  getAverageWritingSeconds,
  getCurrentSchoolContactCount,
  getSourceSummaries,
} from "./historyArchive";
import { migrate } from "./saveMigrations";
import type {
  AcquisitionEvent,
  CampaignEmail,
  Contact,
  ScheduledTrial,
} from "./types";

function createTerminalHistory(count: number, now: number) {
  const contacts: Contact[] = [];
  const emails: CampaignEmail[] = [];
  const trials: ScheduledTrial[] = [];
  const events: AcquisitionEvent[] = [];
  for (let index = 0; index < count; index += 1) {
    const contactId = `archived-contact-${index}`;
    contacts.push({
      id: contactId,
      firstName: "Archivio",
      lastName: `${index}`,
      email: `archivio-${index}@example.invalid`,
      source: "event",
      acquiredAt: now + index,
      status: "lost",
      rarity: "common",
      forms: [],
    });
    emails.push({
      id: `archived-email-${index}`,
      contactId,
      templateId: "archive-test",
      subject: "Test",
      body: "Test",
      revealedCharacters: 4,
      createdAt: now + index,
      sentAt: now + index + 2_000,
      presentationLevel: 0,
      status: "lost",
    });
    trials.push({
      id: `archived-trial-${index}`,
      contactId,
      startsAt: now + index,
      resolvesAt: now + index + 1_000,
      resultSeed: index,
      status: "completed",
    });
    events.push({
      id: `archived-event-${index}`,
      definitionId: "themed-event",
      title: "Evento",
      location: "Genova",
      startedAt: now + index,
      resolvesAt: now + index + 1_000,
      cost: 0,
      peopleMet: 1,
      demonstrationsGiven: 1,
      contactReward: 1,
      membersUsed: 0,
      equipmentUsed: 0,
      wearAdded: 0,
      status: "completed",
    });
  }
  return { contacts, emails, trials, events };
}

describe("bounded game history", () => {
  it("compacts terminal records atomically while preserving reports", () => {
    const now = 1_000;
    const base = createInitialState(now, "", false);
    const history = createTerminalHistory(800, now);
    const activeContact: Contact = {
      ...history.contacts[0],
      id: "active-contact",
      email: "active@example.invalid",
      status: "available",
    };
    const state = {
      ...base,
      contacts: [...history.contacts, activeContact],
      emails: history.emails,
      scheduledTrials: history.trials,
      acquisitionEvents: history.events,
    };

    const compacted = compactGameHistory(state);
    const compactedAgain = compactGameHistory(compacted);

    expect(compactedAgain).toBe(compacted);
    expect(compacted.contacts).toContain(activeContact);
    expect(compacted.emails).toHaveLength(500);
    expect(compacted.scheduledTrials).toHaveLength(500);
    expect(compacted.acquisitionEvents).toHaveLength(200);
    expect(compacted.historyArchive.emails.count).toBe(300);
    expect(compacted.historyArchive.completedTrials).toBe(300);
    expect(compacted.historyArchive.completedEventsByDefinition["themed-event"]).toBe(600);
    expect(getAverageWritingSeconds(
      compacted.emails,
      compacted.historyArchive.emails,
    )).toBe(2);
    expect(getSourceSummaries(
      compacted.contacts,
      compacted.historyArchive.contactsBySource,
    ).event.total).toBe(801);
    expect(getCurrentSchoolContactCount(compacted)).toBe(801);
    const retainedContactIds = new Set(compacted.contacts.map((contact) => contact.id));
    expect(compacted.emails.every((email) => retainedContactIds.has(email.contactId))).toBe(true);
    expect(
      ACHIEVEMENTS.find((item) => item.id === "no-recognizable-reference")?.condition(compacted),
    ).toBe(true);
  });

  it("migrates version 35 and compacts it once", () => {
    const now = 1_000;
    const base = createInitialState(now, "", false);
    const history = createTerminalHistory(800, now);
    const legacy: Record<string, unknown> = {
      ...base,
      version: 35,
      contacts: history.contacts,
      emails: history.emails,
      scheduledTrials: history.trials,
      acquisitionEvents: history.events,
    };
    delete legacy.historyArchive;

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(37);
    expect(migrated.emails).toHaveLength(500);
    expect(migrated.historyArchive.emails.count).toBe(300);
    expect(migrate(migrated)).toBe(migrated);
  });

  it("compacts imported runtime state before it enters the game loop", () => {
    const now = 1_000;
    const base = createInitialState(now, "", false);
    const history = createTerminalHistory(800, now);
    const replacement = {
      ...base,
      contacts: history.contacts,
      emails: history.emails,
      scheduledTrials: history.trials,
      acquisitionEvents: history.events,
    };

    const replaced = gameReducer(base, { type: "REPLACE_STATE", state: replacement });

    expect(replaced.emails).toHaveLength(500);
    expect(replaced.scheduledTrials).toHaveLength(500);
    expect(replaced.acquisitionEvents).toHaveLength(200);
  });
});
