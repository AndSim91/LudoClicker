import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState, gameReducer } from "./engine";
import { exportGame, importGame, loadGame, resetGame, saveGame } from "./save";
import { GAME_CONFIG } from "./config";
import { PROSPECT_EMAIL_PROVIDERS } from "../content/prospectDirectory";
import { getEmailBuildLength } from "../content/emailBuild";
import { EMAIL_TEMPLATES } from "../content/emailTemplates";
import { createSaveScheduler } from "./saveScheduler";

afterEach(() => {
  vi.useRealTimers();
});

describe("local save", () => {
  it("persists the initial reconciled state once", () => {
    const state = createInitialState(1_000);
    const persist = vi.fn(() => true);
    const scheduler = createSaveScheduler(state, persist);

    expect(scheduler.flush(2_000)).toBe(true);
    expect(scheduler.flush(3_000)).toBe(false);
    expect(persist).toHaveBeenCalledOnce();
  });

  it("coalesces multiple dirty revisions into one interval save", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    let state = createInitialState(1_000);
    const persist = vi.fn(() => true);
    const scheduler = createSaveScheduler(state, persist);
    const stop = scheduler.start(GAME_CONFIG.saveIntervalMs);

    state = { ...state, school: { ...state.school, euros: 1 } };
    scheduler.markDirty(state);
    state = { ...state, school: { ...state.school, euros: 2 } };
    scheduler.markDirty(state);

    vi.advanceTimersByTime(GAME_CONFIG.saveIntervalMs);

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith(state, 20_000);
    expect(scheduler.isDirty()).toBe(false);

    vi.advanceTimersByTime(GAME_CONFIG.saveIntervalMs);
    expect(persist).toHaveBeenCalledTimes(1);
    stop();
  });

  it("keeps a failed revision dirty so a later flush can retry it", () => {
    const state = createInitialState(1_000);
    const persist = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const scheduler = createSaveScheduler(state, persist);
    scheduler.markDirty(state);

    expect(scheduler.flush(2_000)).toBe(false);
    expect(scheduler.isDirty()).toBe(true);
    expect(scheduler.flush(3_000)).toBe(true);
    expect(scheduler.isDirty()).toBe(false);
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it("round-trips the game state", () => {
    const state = createInitialState(1_000);
    saveGame({ ...state, school: { ...state.school, euros: 42 } }, 2_000);

    expect(loadGame(3_000).school.euros).toBe(42);
    expect(loadGame(3_000).lastSavedAt).toBe(3_000);
  });

  it("repairs enrolled Legendary members missing from collaborators on load", () => {
    const initial = createInitialState(1_000);
    const legendaryMembers = initial.contacts.slice(0, 3).map((contact, index) => ({
      ...contact,
      id: `saved-legendary-${index}`,
      status: "enrolled" as const,
      rarity: "legendary" as const,
    }));
    saveGame({
      ...initial,
      contacts: [...legendaryMembers, ...initial.contacts.slice(3)],
      school: {
        ...initial.school,
        activeMembers: legendaryMembers.length,
        historicMembers: legendaryMembers.length,
      },
    }, 2_000);

    const loaded = loadGame(3_000);

    expect(loaded.collaborators.map((collaborator) => collaborator.contactId))
      .toEqual(legendaryMembers.map((contact) => contact.id));
  });

  it("falls back to a fresh state when the save is corrupt", () => {
    localStorage.setItem("oggetto-nuovi-iscritti.save", "not-json");

    const state = loadGame(5_000);
    expect(state.createdAt).toBe(5_000);
    expect(state.contacts).toHaveLength(5);
  });

  it("updates legacy prospect providers without resetting the save", () => {
    const state = createInitialState(1_000);
    const legacy = {
      ...state,
      contacts: state.contacts.map((contact) => ({
        ...contact,
        email: `${contact.email.split("@")[0]}@esempio.test`,
      })),
    };
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    const providers = migrated.contacts.map((contact) => contact.email.split("@")[1]);
    expect(providers.every((provider) =>
      PROSPECT_EMAIL_PROVIDERS.includes(
        provider as (typeof PROSPECT_EMAIL_PROVIDERS)[number],
      )
    )).toBe(true);
    expect(new Set(providers).size).toBeGreaterThan(1);
  });

  it("removes numeric suffixes from previously saved prospect emails", () => {
    const state = createInitialState(1_000);
    const withNumericSuffixes = {
      ...state,
      contacts: state.contacts.map((contact, index) => ({
        ...contact,
        email: contact.email.replace("@", `.${index + 1}@`),
      })),
    };
    localStorage.setItem(
      "oggetto-nuovi-iscritti.save",
      JSON.stringify(withNumericSuffixes),
    );

    const migrated = loadGame(1_000);

    expect(migrated.contacts.map((contact) => contact.email)).toEqual(
      state.contacts.map((contact) => contact.email),
    );
  });

  it("prompts for a name when an existing save has no user profile", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    delete legacy.profile;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.profile.displayName).toBe("");
  });

  it("migrates an existing version 1 save without losing progress", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 1;
    legacy.school.euros = 37;
    delete legacy.acquisitionEvents;
    delete legacy.activities;
    delete legacy.statistics.contactsAcquired;
    delete legacy.statistics.peopleMet;
    delete legacy.statistics.demonstrationsGiven;
    delete legacy.statistics.eventsCompleted;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(5_000);
    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.school.euros).toBe(37);
    expect(migrated.acquisitionEvents).toEqual([]);
    expect(migrated.statistics.contactsAcquired).toBe(0);
    expect(migrated.statistics.peopleMet).toBe(0);
    expect(migrated.statistics.demonstrationsGiven).toBe(0);
    expect(migrated.upgrades["comfortable-keyboard"]).toBe(0);
  });

  it("migrates version 2 speed progress into the upgrade catalog", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 2;
    legacy.upgrades = { speedLevel: 2 };
    legacy.player = { writingPower: 3 };
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(5_000);
    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.upgrades["comfortable-keyboard"]).toBe(2);
    expect(migrated.upgrades["prepared-presentation"]).toBe(0);
    expect(migrated.player.writingPower).toBe(3);
  });

  it("migrates version 3 event funnel totals", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 3;
    delete legacy.statistics.peopleMet;
    delete legacy.statistics.demonstrationsGiven;
    legacy.acquisitionEvents = [
      {
        id: "legacy-event",
        definitionId: "park-sparring",
        title: "Sparring al parco",
        location: "Parco Carlo Alberto Dalla Chiesa",
        startedAt: 2_000,
        resolvesAt: 3_000,
        cost: 0,
        contactReward: 2,
        status: "completed",
      },
    ];
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(5_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.acquisitionEvents[0].peopleMet).toBe(10);
    expect(migrated.acquisitionEvents[0].demonstrationsGiven).toBe(4);
    expect(migrated.acquisitionEvents[0].equipmentUsed).toBe(0);
    expect(migrated.equipment.totalSwords).toBe(6);
  });

  it("migrates version 4 equipment state", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 4;
    delete legacy.equipment;
    delete legacy.statistics.maintenanceCompleted;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(5_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.equipment).toEqual({ totalSwords: 6, availableSwords: 6, damagedSwords: 0, wear: 0 });
    expect(migrated.statistics.maintenanceCompleted).toBe(0);
  });

  it("migrates version 5 collaborator automation state", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 5;
    delete legacy.collaborators;
    delete legacy.automation;
    legacy.unlocks = { upgrades: true };
    delete legacy.statistics.collaboratorsRecruited;
    delete legacy.statistics.automatedCharacters;
    delete legacy.statistics.socialContacts;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(5_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.collaborators).toEqual([]);
    expect(migrated.automation.lastProcessedAt).toBe(5_000);
    expect(migrated.unlocks).toEqual({ upgrades: true, collaborators: false, social: false, forms: false });
    expect(migrated.statistics.automatedCharacters).toBe(0);
  });

  it("migrates version 6 Social campaign totals", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 6;
    delete legacy.statistics.socialCampaigns;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(5_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.statistics.socialCampaigns).toBe(0);
  });

  it("migrates version 7 Form progress", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 7;
    legacy.unlocks = { upgrades: true, collaborators: true, social: true };
    delete legacy.statistics.formsCompleted;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(5_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.unlocks.forms).toBe(false);
    expect(migrated.statistics.formsCompleted).toBe(0);
  });

  it("migrates version 8 into the complete upgrade catalog", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 8;
    legacy.upgrades = {
      "comfortable-keyboard": 2,
      "prepared-presentation": 1,
      "clear-subject": 0,
      "welcome-procedure": 0,
    };
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(5_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.upgrades["comfortable-keyboard"]).toBe(2);
    expect(migrated.upgrades["organized-rack"]).toBe(0);
    expect(migrated.upgrades["multi-site-coordination"]).toBe(0);
  });

  it("migrates version 9 achievements and narrative state", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 9;
    delete legacy.achievements;
    delete legacy.narrative;
    delete legacy.statistics.narrativeEvents;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(5_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.achievements).toEqual([]);
    expect(migrated.narrative.history).toEqual([]);
    expect(migrated.narrative.nextEventAt).toBe(5_000 + 120_000);
    expect(migrated.statistics.narrativeEvents).toBe(0);
  });

  it("migrates version 10 network state", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 10;
    delete legacy.network;
    delete legacy.school.city;
    delete legacy.school.accentColor;
    delete legacy.school.motto;
    delete legacy.school.specialization;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.school.city).toBe("Genova");
    expect(migrated.school.specialization).toBe("generale");
    expect(migrated.network).toEqual({
      reputation: 0,
      schools: [],
      prestigeOfferSent: false,
      secretLegendaries: {
        "marco-palena": { status: "external", defeats: 0, failedTrials: 0 },
        "lorenzo-todaro": { status: "external", defeats: 0, failedTrials: 0 },
      },
    });
  });

  it("migrates version 11 saves into the month system", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 11;
    delete legacy.school.currentMonth;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.school.currentMonth).toBe(9);
    expect(migrated.school.nextFeeAt).toBe(181_000);
  });

  it("exports and imports the same valid state", () => {
    const state = createInitialState(1_000);
    const imported = importGame(exportGame({ ...state, school: { ...state.school, euros: 73 } }));

    expect(imported?.school.euros).toBe(73);
    expect(imported?.version).toBe(state.version);
    expect(importGame("not-json")).toBeNull();
  });

  it("restores special profile identifiers in version 12 saves", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 12;
    legacy.contacts[4].firstName = "Andrea";
    legacy.contacts[4].lastName = "Simonazzi";
    delete legacy.contacts[4].specialProfileId;
    legacy.collaborators = [{
      id: "legacy-special",
      contactId: legacy.contacts[4].id,
      displayName: "Andrea Simonazzi",
      joinedAt: 1_000,
      forms: [],
      assignment: null,
    }];
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.contacts[4].specialProfileId).toBe("andrea-simonazzi");
    expect(migrated.collaborators[0].specialProfileId).toBe("andrea-simonazzi");
    expect(migrated.legendaryCollaborators.enrolledProfileIds).toContain("andrea-simonazzi");
  });

  it("migrates version 13 saves into global Legendary progress", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 13;
    delete legacy.legendaryCollaborators;
    legacy.collaborators = [{
      id: "legacy-legendary",
      contactId: legacy.contacts[0].id,
      displayName: "Andrea Simonazzi",
      joinedAt: 1_000,
      forms: [],
      assignment: null,
      specialProfileId: "andrea-simonazzi",
    }];
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.legendaryCollaborators.encounteredProfileIds).toContain("andrea-simonazzi");
    expect(migrated.legendaryCollaborators.enrolledProfileIds).toEqual(["andrea-simonazzi"]);
    expect(migrated.legendaryCollaborators.enrollmentAttempts["andrea-simonazzi"]).toBe(1);
  });

  it("migrates version 14 contacts and collaborators into explicit rarities", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 14;
    for (const contact of legacy.contacts) delete contact.rarity;
    legacy.contacts[4].specialProfileId = "andrea-simonazzi";
    legacy.collaborators = [{
      id: "legacy-rarity",
      contactId: legacy.contacts[4].id,
      displayName: "Andrea Simonazzi",
      joinedAt: 1_000,
      forms: [],
      assignment: null,
      specialProfileId: "andrea-simonazzi",
    }];
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.contacts[0].rarity).toBe("common");
    expect(migrated.contacts[4].rarity).toBe("legendary");
    expect(migrated.collaborators[0].rarity).toBe("legendary");
  });

  it("migrates version 16 campaigns to the visual format unlocked in the save", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 16;
    legacy.upgrades["call-to-action"] = 1;
    delete legacy.emails[0].presentationLevel;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.emails[0].presentationLevel).toBe(4);
  });

  it("migrates version 17 saves into balanced offline progress, digests and short goals", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 17;
    delete legacy.automation.offlineContactBuffer;
    delete legacy.shortGoal;
    legacy.statistics.emailsSent = 12;
    legacy.messages = [
      { ...legacy.messages[0], id: "word-1", subject: "Passaparola inatteso" },
      { ...legacy.messages[0], id: "word-2", subject: "Passaparola inatteso" },
    ];
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.automation.offlineContactBuffer).toBe(0);
    expect(migrated.shortGoal.definitionId).toBe("send-emails");
    expect(migrated.shortGoal.baseline).toBe(12);
    expect(migrated.messages).toHaveLength(1);
    expect(migrated.messages[0].stackCount).toBe(2);
  });

  it("migrates version 19 running events with their assigned members", () => {
    const initial = createInitialState(1_000);
    const started = gameReducer({
      ...initial,
      school: { ...initial.school, euros: 120, activeMembers: 5, peakActiveMembers: 5 },
    }, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "public-demo",
      now: 2_000,
    });
    const legacy = JSON.parse(JSON.stringify({ ...started, version: 19 }));
    delete legacy.acquisitionEvents[0].membersUsed;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(2_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.acquisitionEvents[0].membersUsed).toBe(2);
  });

  it("migrates version 20 saves into annual member retention tracking", () => {
    const initial = createInitialState(1_000);
    const legacy = JSON.parse(JSON.stringify({
      ...initial,
      version: 20,
      school: { ...initial.school, currentMonth: 7, activeMembers: 1 },
      contacts: initial.contacts.map((contact, index) => ({
        ...contact,
        status: index === 0 ? "enrolled" : contact.status,
      })),
    }));
    delete legacy.contacts[0].enrolledMonth;
    delete legacy.statistics.membersDeparted;
    delete legacy.school.peakActiveMembers;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.contacts[0].enrolledMonth).toBe(7);
    expect(migrated.statistics.membersDeparted).toBe(0);
    expect(migrated.school.peakActiveMembers).toBe(1);
  });

  it("migrates version 21 fame from the best available historical evidence", () => {
    const initial = createInitialState(1_000);
    const legacy = JSON.parse(JSON.stringify({
      ...initial,
      version: 21,
      school: { ...initial.school, activeMembers: 70, historicMembers: 100 },
      statistics: { ...initial.statistics, membersDeparted: 30 },
      contacts: Array.from({ length: 30 }, (_, index) => ({
        ...initial.contacts[index % initial.contacts.length],
        id: `departed-${index}`,
        status: "departed",
      })),
    }));
    delete legacy.school.peakActiveMembers;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.school.activeMembers).toBe(70);
    expect(migrated.school.peakActiveMembers).toBe(100);
  });

  it("migrates version 22 collaborators into explicit Instructor certificates", () => {
    const initial = createInitialState(1_000);
    const legacy = JSON.parse(JSON.stringify({
      ...initial,
      version: 22,
      collaborators: [{
        id: "legacy-instructor",
        contactId: initial.contacts[0].id,
        displayName: "Giulia Ferrando",
        joinedAt: 1_000,
        forms: ["form-1"],
        assignment: null,
        rarity: "legendary",
      }],
    }));
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.collaborators[0].instructorForms).toEqual([]);
  });

  it("migrates version 23 Legendary progression into retained profile memory", () => {
    const initial = createInitialState(1_000);
    const legacy = JSON.parse(JSON.stringify({
      ...initial,
      version: 23,
      collaborators: [{
        id: "legacy-eva",
        contactId: initial.contacts[0].id,
        displayName: "Eva Parodi",
        joinedAt: 500,
        forms: ["form-1", "course-x", "form-2"],
        instructorForms: ["form-1", "form-2"],
        assignment: "lessons",
        rarity: "legendary",
        specialProfileId: "eva-parodi",
        lastFormTrainingYear: 2,
      }],
    }));
    delete legacy.legendaryCollaborators.retainedProgress;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.legendaryCollaborators.retainedProgress["eva-parodi"]).toEqual({
      forms: ["form-1", "course-x", "form-2"],
      instructorForms: ["form-1", "form-2"],
      formBranchPreferences: [],
      joinedAt: 500,
      lastFormTrainingYear: 2,
    });
  });

  it("migrates version 25 collaborators into Novizio mastery", () => {
    const initial = createInitialState(1_000);
    const legacy = JSON.parse(JSON.stringify({
      ...initial,
      version: 25,
      collaborators: [{
        id: "legacy-mastery",
        contactId: initial.contacts[0].id,
        displayName: "Collaboratore storico",
        joinedAt: 1_000,
        forms: [],
        instructorForms: [],
        formBranchPreferences: [],
        autoTeachingEnabled: true,
        assignment: "writing",
        rarity: "rare",
      }],
    }));
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.collaborators[0].mastery).toEqual({
      writing: 0,
      events: 0,
      lessons: 0,
      social: 0,
      equipment: 0,
      instructor: 0,
    });
  });

  it("migrates version 26 saves into sword damage tracking", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 26;
    delete legacy.equipment.damagedSwords;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.equipment.damagedSwords).toBe(0);
  });

  it("migrates worn version 27 equipment into broken sword availability", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 27;
    legacy.equipment.wear = 100;
    legacy.equipment.damagedSwords = 0;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.equipment).toMatchObject({ availableSwords: 0, damagedSwords: 6 });
  });

  it("adds the active school signature to a version 30 HTML draft", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000, "Legend")));
    const signedBody = EMAIL_TEMPLATES[0].body(
      legacy.contacts[0].firstName,
      "Legend",
      2,
    );
    legacy.version = 30;
    legacy.school.name = "Ordine del Faro";
    legacy.school.city = "Trieste";
    legacy.emails[0] = {
      ...legacy.emails[0],
      presentationLevel: 2,
      body: signedBody.replace("\n\nLegend, Ordine delle Onde - Genova", ""),
    };
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.emails[0].body).toContain("Legend, Ordine del Faro - Trieste");
  });

  it("migrates legacy Rare collaborators to the Ultra Rare tier", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    const contact = legacy.contacts[0];
    legacy.version = 31;
    contact.rarity = "rare";
    legacy.collaborators = [{
      id: "legacy-rare-collaborator",
      contactId: contact.id,
      displayName: `${contact.firstName} ${contact.lastName}`,
      joinedAt: 1_000,
      forms: ["form-1", "course-x", "form-2", "course-y"],
      instructorForms: [],
      formBranchPreferences: ["Spada Lunga"],
      autoTeachingEnabled: true,
      assignment: null,
      mastery: {
        writing: 0,
        events: 0,
        lessons: 0,
        social: 0,
        equipment: 0,
        instructor: 0,
      },
      rarity: "rare",
    }];
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.collaborators[0].rarity).toBe("ultra-rare");
    expect(migrated.contacts.find((candidate) => candidate.id === contact.id)?.rarity)
      .toBe("ultra-rare");
  });

  it("runs every later migration when loading a version 32 save", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 32;
    legacy.school.activeMembers = 1;
    legacy.school.historicMembers = 3;
    legacy.contacts = legacy.contacts.map((contact: { status: string }, index: number) => ({
      ...contact,
      status: index < 3 ? "enrolled" : contact.status,
    }));
    const renewalContacts = legacy.contacts.slice(1, 3);
    legacy.narrative.history = Array.from({ length: 35 }, (_, index) => ({
      id: `story-${index}`,
      definitionId: index >= 33 ? "missed-renewal" : "word-of-mouth",
      title: `Episodio ${index}`,
      occurredAt: 1_000 + index,
      summary: `Dettaglio ${index}`,
      ...(index >= 33
        ? {
            person: {
              displayName: `${renewalContacts[index - 33].firstName} ${renewalContacts[index - 33].lastName}`,
              rarity: "common",
            },
          }
        : {}),
    }));
    legacy.statistics.narrativeEvents = 35;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.narrative.history).toHaveLength(GAME_CONFIG.narrativeHistoryLimit);
    expect(migrated.narrative.history[0].id).toBe("story-5");
    expect(migrated.contacts.filter((contact) => contact.status === "enrolled")).toHaveLength(1);
    expect(migrated.contacts.filter((contact) => contact.status === "departed")).toHaveLength(2);
  });

  it("repairs enrolled contacts left behind by missed renewals in version 33 saves", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 33;
    legacy.school.activeMembers = 1;
    legacy.school.historicMembers = 3;
    legacy.contacts = legacy.contacts.map((contact: { status: string }, index: number) => ({
      ...contact,
      status: index < 3 ? "enrolled" : contact.status,
    }));
    legacy.narrative.history = legacy.contacts.slice(1, 3).map((contact: { firstName: string; lastName: string }, index: number) => ({
      id: `renewal-${index}`,
      definitionId: "missed-renewal",
      title: "Mancato rinnovo",
      occurredAt: 2_000 + index,
      summary: "Un iscritto ha sospeso temporaneamente la partecipazione.",
      person: {
        displayName: `${contact.firstName} ${contact.lastName}`,
        rarity: "common",
      },
    }));
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.school.activeMembers).toBe(1);
    expect(migrated.contacts.filter((contact) => contact.status === "enrolled")).toHaveLength(1);
    expect(migrated.contacts.filter((contact) => contact.status === "departed")).toHaveLength(2);
    expect(migrated.statistics.membersDeparted).toBe(2);
  });

  it("preserves level 2 plain-text draft progress in version 34 saves", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000, "Andrea Ungaro")));
    const body = EMAIL_TEMPLATES[0].body(
      legacy.contacts[0].firstName,
      "Andrea Ungaro",
      2,
    );
    legacy.version = 34;
    legacy.emails[0] = {
      ...legacy.emails[0],
      body,
      presentationLevel: 2,
      revealedCharacters: Math.round(body.length / 2),
    };
    const previousRevealedCharacters = legacy.emails[0].revealedCharacters;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);
    const migratedEmail = migrated.emails[0];

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(getEmailBuildLength(migratedEmail)).toBe(body.length);
    expect(migratedEmail.revealedCharacters).toBe(previousRevealedCharacters);
  });

  it("resets both primary and backup saves", () => {
    const state = createInitialState(1_000);
    saveGame(state, 2_000);
    saveGame({ ...state, school: { ...state.school, euros: 10 } }, 3_000);

    const reset = resetGame(4_000);

    expect(reset.createdAt).toBe(4_000);
    expect(localStorage.getItem("oggetto-nuovi-iscritti.save")).toBeNull();
    expect(localStorage.getItem("oggetto-nuovi-iscritti.save.backup")).toBeNull();
  });

  it("removes previously saved obsolete messages", () => {
    const state = createInitialState(1_000);
    const obsoleteMessages = [
      "Nuova lezione di prova prenotata",
      "Stiamo finendo i contatti",
      "Contatti terminati",
    ].map((subject, index) => ({
      ...state.messages[0],
      id: `message-obsolete-${index}`,
      subject,
    }));
    localStorage.setItem(
      "oggetto-nuovi-iscritti.save",
      JSON.stringify({ ...state, messages: [...obsoleteMessages, ...state.messages] }),
    );

    const loaded = loadGame(5_000);

    expect(loaded.messages).toEqual(state.messages);
  });
});
