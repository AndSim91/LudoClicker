import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import type { Contact } from "../types";

describe("Fame save migration", () => {
  it("renames the legacy counter and removes unreferenced terminal contacts", () => {
    const initial = createInitialState(1_000, "", false);
    const departed: Contact = {
      ...initial.contacts[0],
      id: "departed-unreferenced",
      status: "departed",
    };
    const legacy = JSON.parse(JSON.stringify({
      ...initial,
      version: 64,
      contacts: [...initial.contacts, departed],
    }));
    legacy.school.historicMembers = 8_879;
    delete legacy.school.fame;

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.school.fame).toBe(8_879);
    expect(migrated.school).not.toHaveProperty("historicMembers");
    expect(migrated.contacts.some((contact) => contact.id === departed.id)).toBe(false);
    expect(migrated.historyArchive.contactsBySource.tutorial.total).toBe(1);
  });

  it("temporarily retains a terminal contact still referenced by sent mail", () => {
    const initial = createInitialState(1_000, "", false);
    const lost: Contact = {
      ...initial.contacts[0],
      id: "lost-with-email",
      status: "lost",
    };
    const legacy = JSON.parse(JSON.stringify({
      ...initial,
      version: 64,
      contacts: [...initial.contacts, lost],
      emails: [{
        id: "retained-email",
        contactId: lost.id,
        templateId: "migration-test",
        subject: "Test",
        body: "Test",
        revealedCharacters: 4,
        createdAt: 1_000,
        sentAt: 2_000,
        presentationLevel: 0,
        status: "lost",
      }],
    }));
    legacy.school.historicMembers = 12;
    delete legacy.school.fame;

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.contacts.some((contact) => contact.id === lost.id)).toBe(true);
    expect(migrated.historyArchive.contactsBySource.tutorial.total).toBe(0);
  });
});
