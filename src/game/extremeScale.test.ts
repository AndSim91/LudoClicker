import { ACHIEVEMENTS } from "../content/achievements";
import { describe, expect, it } from "vitest";
import { createInitialState, gameReducer } from "./engine";
import { compactGameHistory } from "./historyArchive";
import {
  getActiveCampaignEmails,
  getAvailableContactCount,
  getContactsById,
  getPendingEmailOutcomes,
  getPeopleInTraining,
  getRunningAcquisitionEvents,
  getScheduledTrials,
} from "./runtimeIndexes";
import {
  selectActiveContact,
  selectAvailableContacts,
  selectAvailableEventMembers,
  selectIncomePerMonth,
  selectSentEmailStatus,
} from "./selectors";
import type { CampaignEmail, Contact, GameState } from "./types";

const LOGICAL_MEMBERS = 1_000_000_000;
const LOGICAL_CONTACTS = 1_000_000_000;
const EXTREME_EUROS = 2_000_000_000_000_000;
const NOW = 1_800_000_000_000;
const MATERIAL_SIZES = [1_000, 10_000, 100_000] as const;
const CACHE_HIT_REPETITIONS = 1_000;

type RuntimeWithProcess = typeof globalThis & {
  process?: {
    env?: Record<string, string | undefined>;
    memoryUsage?: () => { heapUsed: number };
  };
};

interface BenchmarkRow {
  materialRecords: number;
  heapDeltaMiB: number | null;
  indexColdMs: number;
  indexCacheHitAverageMs: number;
  selectorsMs: number;
  compactionMs: number;
  tickColdMs: number;
  tickWarmAverageMs: number;
  rawStringifyMs: number;
  rawSnapshotMiB: number;
  compactedStringifyMs: number;
  compactedSnapshotMiB: number;
}

const runtime = globalThis as RuntimeWithProcess;
const runExtremeBenchmark =
  runtime.process?.env?.RUN_EXTREME_SCALE_BENCHMARK === "1";

function elapsedMs<T>(operation: () => T): { value: T; milliseconds: number } {
  const startedAt = performance.now();
  const value = operation();
  return { value, milliseconds: performance.now() - startedAt };
}

function createMaterialHistory(size: number): {
  contacts: Contact[];
  emails: CampaignEmail[];
} {
  const contacts = new Array<Contact>(size);
  const emails = new Array<CampaignEmail>(size);

  for (let index = 0; index < size; index += 1) {
    const id = `stress-contact-${index}`;
    contacts[index] = {
      id,
      firstName: "Stress",
      lastName: `Record ${index}`,
      email: `stress-${index}@example.invalid`,
      source: "event",
      acquiredAt: NOW - index,
      status: "lost",
      rarity: "common",
      forms: [],
    };
    emails[index] = {
      id: `stress-email-${index}`,
      contactId: id,
      templateId: "stress-history",
      subject: "Record storico",
      body: "Snapshot deterministico per il benchmark di scalabilita.",
      revealedCharacters: 58,
      createdAt: NOW - index,
      sentAt: NOW - index,
      presentationLevel: 0,
      status: "lost",
    };
  }

  return { contacts, emails };
}

function createExtremeState(size: number): GameState {
  const base = createInitialState(NOW, "Stress test", false);
  const history = createMaterialHistory(size);

  return {
    ...base,
    school: {
      ...base.school,
      activeMembers: LOGICAL_MEMBERS,
      peakActiveMembers: LOGICAL_MEMBERS,
      fame: LOGICAL_MEMBERS,
      euros: EXTREME_EUROS,
      nextFeeAt: NOW + 60_000,
    },
    contacts: history.contacts,
    emails: history.emails,
    pendingEmailOutcomes: [],
    scheduledTrials: [],
    acquisitionEvents: [],
    collaborators: [],
    achievements: ACHIEVEMENTS.map((achievement) => achievement.id),
    network: { ...base.network, prestigeOfferSent: true },
    narrative: { ...base.narrative, nextEventAt: NOW + 300_000 },
    statistics: {
      ...base.statistics,
      contactsAcquired: LOGICAL_CONTACTS,
      membersEnrolled: LOGICAL_MEMBERS,
    },
    historyArchive: {
      ...base.historyArchive,
      contactsBySource: {
        ...base.historyArchive.contactsBySource,
        event: {
          total: LOGICAL_CONTACTS - size,
          enrolled: 0,
        },
      },
    },
    automation: { ...base.automation, lastProcessedAt: NOW },
    unlocks: { ...base.unlocks, forms: false },
  };
}

function readHeapUsed(): number | null {
  return runtime.process?.memoryUsage?.().heapUsed ?? null;
}

function runBenchmark(size: number): BenchmarkRow {
  const heapBefore = readHeapUsed();
  const state = createExtremeState(size);
  const heapAfter = readHeapUsed();

  const coldIndexes = elapsedMs(() => ({
    contactsById: getContactsById(state.contacts),
    availableContacts: getAvailableContactCount(state.contacts),
    activeEmails: getActiveCampaignEmails(state.emails),
    scheduledTrials: getScheduledTrials(state.scheduledTrials),
    runningEvents: getRunningAcquisitionEvents(state.acquisitionEvents),
    contactsInTraining: getPeopleInTraining(state.contacts),
  }));

  const cacheHits = elapsedMs(() => {
    for (let repetition = 0; repetition < CACHE_HIT_REPETITIONS; repetition += 1) {
      expect(getContactsById(state.contacts)).toBe(coldIndexes.value.contactsById);
      expect(getActiveCampaignEmails(state.emails)).toBe(coldIndexes.value.activeEmails);
      expect(getPeopleInTraining(state.contacts)).toBe(
        coldIndexes.value.contactsInTraining,
      );
    }
  });

  const selectors = elapsedMs(() => ({
    activeContact: selectActiveContact(state),
    availableContacts: selectAvailableContacts(state),
    availableEventMembers: selectAvailableEventMembers(state),
    incomePerMonth: selectIncomePerMonth(state),
    lastEmailStatus: selectSentEmailStatus(state, state.emails[size - 1]),
  }));

  const compaction = elapsedMs(() => compactGameHistory(state));
  const coldTick = elapsedMs(() =>
    gameReducer(compaction.value, { type: "TICK", now: NOW, gainMultiplier: 1 }),
  );
  const warmTicks = elapsedMs(() => {
    let ticked = coldTick.value;
    for (let repetition = 0; repetition < 5; repetition += 1) {
      ticked = gameReducer(ticked, { type: "TICK", now: NOW, gainMultiplier: 1 });
    }
    return ticked;
  });

  let rawSnapshotBytes = 0;
  const rawSerialization = elapsedMs(() => {
    const snapshot = JSON.stringify(state);
    rawSnapshotBytes = new TextEncoder().encode(snapshot).byteLength;
  });
  let compactedSnapshotBytes = 0;
  const compactedSerialization = elapsedMs(() => {
    const snapshot = JSON.stringify(warmTicks.value);
    compactedSnapshotBytes = new TextEncoder().encode(snapshot).byteLength;
  });

  expect(state.school).toMatchObject({
    activeMembers: LOGICAL_MEMBERS,
    peakActiveMembers: LOGICAL_MEMBERS,
    fame: LOGICAL_MEMBERS,
    euros: EXTREME_EUROS,
  });
  expect(state.statistics.contactsAcquired).toBe(LOGICAL_CONTACTS);
  expect(Number.isSafeInteger(state.school.euros)).toBe(true);
  expect(coldIndexes.value.contactsById.size).toBe(size);
  expect(coldIndexes.value.availableContacts).toBe(0);
  expect(coldIndexes.value.activeEmails).toHaveLength(0);
  expect(coldIndexes.value.scheduledTrials).toHaveLength(0);
  expect(coldIndexes.value.runningEvents).toHaveLength(0);
  expect(coldIndexes.value.contactsInTraining).toHaveLength(0);
  expect(getPendingEmailOutcomes(state.pendingEmailOutcomes)).toHaveLength(0);
  expect(selectors.value).toEqual({
    activeContact: undefined,
    availableContacts: 0,
    availableEventMembers: LOGICAL_MEMBERS,
    incomePerMonth: LOGICAL_MEMBERS * 40,
    lastEmailStatus: "Perso",
  });
  expect(compaction.value).not.toBe(state);
  expect(coldTick.value).toBe(compaction.value);
  expect(warmTicks.value).toBe(compaction.value);
  expect(warmTicks.value.contacts.length).toBeLessThanOrEqual(500);
  expect(warmTicks.value.emails.length).toBeLessThanOrEqual(500);
  expect(warmTicks.value.historyArchive.contactsBySource.event.total).toBe(
    LOGICAL_CONTACTS - 500,
  );
  expect(warmTicks.value.historyArchive.emails.count).toBe(size - 500);

  return {
    materialRecords: size,
    heapDeltaMiB:
      heapBefore === null || heapAfter === null
        ? null
        : (heapAfter - heapBefore) / 1024 / 1024,
    indexColdMs: coldIndexes.milliseconds,
    indexCacheHitAverageMs:
      cacheHits.milliseconds / CACHE_HIT_REPETITIONS,
    selectorsMs: selectors.milliseconds,
    compactionMs: compaction.milliseconds,
    tickColdMs: coldTick.milliseconds,
    tickWarmAverageMs: warmTicks.milliseconds / 5,
    rawStringifyMs: rawSerialization.milliseconds,
    rawSnapshotMiB: rawSnapshotBytes / 1024 / 1024,
    compactedStringifyMs: compactedSerialization.milliseconds,
    compactedSnapshotMiB: compactedSnapshotBytes / 1024 / 1024,
  };
}

describe.runIf(runExtremeBenchmark)("extreme logical scale benchmark", () => {
  it("keeps billion-scale counters exact while material history grows safely", () => {
    const report = MATERIAL_SIZES.map(runBenchmark);
    console.info(
      "EXTREME_SCALE_REPORT",
      JSON.stringify(
        report.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
              key,
              typeof value === "number" ? Number(value.toFixed(4)) : value,
            ]),
          ),
        ),
      ),
    );
  }, 60_000);
});
