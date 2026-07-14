import { describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import { exportGame, importGame, loadGame, resetGame, saveGame } from "./save";

describe("local save", () => {
  it("round-trips the game state", () => {
    const state = createInitialState(1_000);
    saveGame({ ...state, school: { ...state.school, euros: 42 } }, 2_000);

    expect(loadGame(3_000).school.euros).toBe(42);
    expect(loadGame(3_000).lastSavedAt).toBe(3_000);
  });

  it("falls back to a fresh state when the save is corrupt", () => {
    localStorage.setItem("oggetto-nuovi-iscritti.save", "not-json");

    const state = loadGame(5_000);
    expect(state.createdAt).toBe(5_000);
    expect(state.contacts).toHaveLength(10);
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

    expect(migrated.contacts.map((contact) => contact.email.split("@")[1])).toEqual([
      "cmail.com",
      "hotlook.it",
      "yabadabadoo.it",
      "gspot.com",
      "cmail.com",
      "hotlook.it",
      "yabadabadoo.it",
      "gspot.com",
      "cmail.com",
      "hotlook.it",
    ]);
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
    expect(migrated.version).toBe(15);
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
    expect(migrated.version).toBe(15);
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
        location: "Parco di Villa Croce",
        startedAt: 2_000,
        resolvesAt: 3_000,
        cost: 0,
        contactReward: 2,
        status: "completed",
      },
    ];
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(5_000);

    expect(migrated.version).toBe(15);
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

    expect(migrated.version).toBe(15);
    expect(migrated.equipment).toEqual({ totalSwords: 6, availableSwords: 6, wear: 0 });
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

    expect(migrated.version).toBe(15);
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

    expect(migrated.version).toBe(15);
    expect(migrated.statistics.socialCampaigns).toBe(0);
  });

  it("migrates version 7 Form progress", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 7;
    legacy.unlocks = { upgrades: true, collaborators: true, social: true };
    delete legacy.statistics.formsCompleted;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(5_000);

    expect(migrated.version).toBe(15);
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

    expect(migrated.version).toBe(15);
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

    expect(migrated.version).toBe(15);
    expect(migrated.achievements).toEqual([]);
    expect(migrated.narrative.history).toEqual([]);
    expect(migrated.narrative.nextEventAt).toBe(1_000 + 120_000);
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

    expect(migrated.version).toBe(15);
    expect(migrated.school.city).toBe("Genova");
    expect(migrated.school.specialization).toBe("generale");
    expect(migrated.network).toEqual({ reputation: 0, schools: [], prestigeOfferSent: false });
  });

  it("migrates version 11 saves into the month system", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 11;
    delete legacy.school.currentMonth;
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(15);
    expect(migrated.school.currentMonth).toBe(1);
    expect(migrated.school.nextFeeAt).toBe(61_000);
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
    delete legacy.contacts[8].specialProfileId;
    legacy.collaborators = [{
      id: "legacy-special",
      contactId: legacy.contacts[8].id,
      displayName: "Andrea Simonazzi",
      joinedAt: 1_000,
      forms: [],
      assignment: null,
    }];
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(15);
    expect(migrated.contacts[8].specialProfileId).toBe("andrea-simonazzi");
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

    expect(migrated.version).toBe(15);
    expect(migrated.legendaryCollaborators.encounteredProfileIds).toContain("andrea-simonazzi");
    expect(migrated.legendaryCollaborators.enrolledProfileIds).toEqual(["andrea-simonazzi"]);
    expect(migrated.legendaryCollaborators.enrollmentAttempts["andrea-simonazzi"]).toBe(1);
  });

  it("migrates version 14 contacts and collaborators into explicit rarities", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 14;
    for (const contact of legacy.contacts) delete contact.rarity;
    legacy.collaborators = [{
      id: "legacy-rarity",
      contactId: legacy.contacts[8].id,
      displayName: "Andrea Simonazzi",
      joinedAt: 1_000,
      forms: [],
      assignment: null,
      specialProfileId: "andrea-simonazzi",
    }];
    localStorage.setItem("oggetto-nuovi-iscritti.save", JSON.stringify(legacy));

    const migrated = loadGame(1_000);

    expect(migrated.version).toBe(15);
    expect(migrated.contacts[0].rarity).toBe("common");
    expect(migrated.contacts[8].rarity).toBe("legendary");
    expect(migrated.collaborators[0].rarity).toBe("legendary");
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
