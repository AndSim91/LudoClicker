import { describe, expect, it } from "vitest";
import { appendItems, indexById, replaceById } from "./replaceById";
import { getAvailableContactCount, getFirstAvailableContactIndex } from "./runtimeIndexes";
import type { Contact } from "./types";

const STATUSES = ["available", "writing", "invited", "enrolled", "lost"] as const;

describe("indici che seguono la discendenza degli array (20/10/2026)", () => {
  it("contano e trovano il primo contatto disponibile come una scansione completa", () => {
    let seed = 7;
    const roll = (n: number) => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed % n;
    };
    const person = (id: number) => ({ id: `c${id}`, status: STATUSES[roll(STATUSES.length)] }) as Contact;
    let contacts: Contact[] = Array.from({ length: 50 }, (_, index) => person(index));
    let nextId = 50;
    for (let step = 0; step < 2_000; step += 1) {
      const kind = roll(10);
      if (kind < 7) {
        const target = contacts[roll(contacts.length)].id;
        contacts = replaceById(contacts, target, (contact) => ({ ...contact, status: STATUSES[roll(STATUSES.length)] }));
      } else if (kind < 9) {
        contacts = appendItems(contacts, Array.from({ length: roll(3) }, () => person(nextId++)));
      } else if (contacts.length > 20) {
        contacts = contacts.filter(() => roll(20) > 0); // senza discendenza: si riparte da una scansione
      }
      // A volte si chiede solo ogni tanto: le catene si allungano.
      if (roll(3) > 0) continue;
      const first = contacts.findIndex((contact) => contact.status === "available");
      expect(getFirstAvailableContactIndex(contacts)).toBe(first < 0 ? contacts.length : first);
      expect(getAvailableContactCount(contacts)).toBe(contacts.filter((contact) => contact.status === "available").length);
      const probe = contacts[roll(contacts.length)]?.id ?? "nessuno";
      expect(indexById(contacts, probe)).toBe(contacts.findIndex((contact) => contact.id === probe));
    }
  });
});
