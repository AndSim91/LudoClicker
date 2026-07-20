import { createInitialUpgradeLevels } from "../content/upgrades";
import { createInitialShortGoal } from "../content/shortGoals";
import { GAME_CONFIG } from "./config";
import { createCampaign, createWelcomeMessage } from "./campaignContent";
import { createInitialContacts } from "./contacts";
import type { GameState, LegendaryCollaboratorProgress } from "./types";
import { createEmptyHistoryArchive } from "./historyArchive";

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
    retainedProgress: {},
  };
  const initialContacts = createInitialContacts(
    now,
    includeAndrea,
    initialSeed,
    legendaryProgress,
  );
  const contacts = initialContacts.contacts;

  return {
    version: GAME_CONFIG.version,
    saveCompatibilityVersion: GAME_CONFIG.saveCompatibilityVersion,
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
      followers: 0,
      currentMonth: 9,
      nextFeeAt: now + GAME_CONFIG.gameMonthMs,
    },
    player: { writingPower: 1 },
    network: {
      reputation: 0,
      schools: [],
      prestigeOfferSent: false,
      secretLegendaries: {
        "marco-palena": { status: "external", defeats: 0, failedTrials: 0 },
        "lorenzo-todaro": { status: "external", defeats: 0, failedTrials: 0 },
      },
    },
    contacts,
    emails: [createCampaign(contacts[0], 0, now, displayName)],
    pendingEmailOutcomes: [],
    scheduledTrials: [],
    messages: [createWelcomeMessage(now)],
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
    tournaments: {
      results: [],
      missedTournaments: [],
      immuneContactIds: [],
      skippedSeasons: [],
      championsVictoryCurrentSchool: false,
    },
    collaborators: [],
    automation: {
      lastProcessedAt: now,
      writingBuffer: 0,
      lessonBuffer: 0,
      socialBuffer: 0,
      equipmentBuffer: 0,
      offlineContactBuffer: 0,
      agonistCoursesEnabled: false,
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
      socialTrials: 0,
      socialCampaigns: 0,
      formsCompleted: 0,
      narrativeEvents: 0,
    },
    historyArchive: createEmptyHistoryArchive(),
    unlocks: { upgrades: false, collaborators: false, social: false, forms: false },
    upgrades: createInitialUpgradeLevels(),
  };
}
