import { describe, expect, it } from "vitest";
import { createInitialState, gameReducer } from "./engine";
import { selectAvailableContacts } from "./selectors";

describe("admin resource actions", () => {
  it("adds members and updates member-based progression", () => {
    const initial = createInitialState(1_000);
    const state = gameReducer(initial, { type: "ADMIN_ADD_MEMBERS", amount: 12 });

    expect(state.school).toMatchObject({
      activeMembers: 12,
      peakActiveMembers: 12,
      historicMembers: 12,
      euros: 0,
    });
    expect(state.unlocks).toMatchObject({ upgrades: true, social: true, forms: true });
    expect(state.statistics.membersEnrolled).toBe(0);
    expect(state.contacts.filter((contact) => contact.status === "enrolled")).toHaveLength(12);
    expect(new Set(state.contacts.map((contact) => contact.id)).size).toBe(state.contacts.length);
  });

  it("adds euros without counting them as earned income", () => {
    const initial = createInitialState(1_000);
    const state = gameReducer(initial, { type: "ADMIN_ADD_EUROS", amount: 1_000.55 });

    expect(state.school.euros).toBe(1_000.55);
    expect(state.statistics.eurosEarned).toBe(0);
  });

  it("adds or removes available email contacts", () => {
    const initial = createInitialState(1_000);
    const added = gameReducer(initial, { type: "ADMIN_ADD_CONTACTS", amount: 2 });
    const removed = gameReducer(added, { type: "ADMIN_ADD_CONTACTS", amount: -3 });

    expect(selectAvailableContacts(initial)).toBe(4);
    expect(selectAvailableContacts(added)).toBe(6);
    expect(selectAvailableContacts(removed)).toBe(3);
    expect(removed.statistics.contactsAcquired).toBe(0);
  });

  it("keeps contact ids unique across repeated admin additions", () => {
    const initial = createInitialState(1_000);
    const first = gameReducer(initial, { type: "ADMIN_ADD_CONTACTS", amount: 1 });
    const second = gameReducer(first, { type: "ADMIN_ADD_CONTACTS", amount: 1 });

    expect(second.contacts).toHaveLength(initial.contacts.length + 2);
    expect(new Set(second.contacts.map((contact) => contact.id)).size).toBe(second.contacts.length);
  });

  it("keeps the active member counter aligned when members are removed", () => {
    const initial = createInitialState(1_000);
    const added = gameReducer(initial, { type: "ADMIN_ADD_MEMBERS", amount: 3 });
    const removed = gameReducer(added, { type: "ADMIN_ADD_MEMBERS", amount: -2 });

    expect(removed.school.activeMembers).toBe(1);
    expect(removed.contacts.filter((contact) => contact.status === "enrolled")).toHaveLength(1);
    expect(removed.statistics.membersDeparted).toBe(0);
  });

  it("repairs old admin saves that have counters without member records", () => {
    const initial = createInitialState(1_000);
    const legacyState = {
      ...initial,
      school: { ...initial.school, activeMembers: 4, historicMembers: 4 },
    };
    const repaired = gameReducer(legacyState, { type: "ADMIN_ADD_MEMBERS", amount: 1 });

    expect(repaired.school.activeMembers).toBe(5);
    expect(repaired.contacts.filter((contact) => contact.status === "enrolled")).toHaveLength(5);
  });

  it("does not let negative resources go below zero", () => {
    const initial = createInitialState(1_000);
    const state = gameReducer(
      gameReducer(initial, { type: "ADMIN_ADD_MEMBERS", amount: -10 }),
      { type: "ADMIN_ADD_EUROS", amount: -10 },
    );

    expect(state.school.activeMembers).toBe(0);
    expect(state.school.euros).toBe(0);
  });
});
