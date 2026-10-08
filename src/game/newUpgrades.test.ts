import { describe, expect, it } from "vitest";
import { getAcquisitionEventDefinition } from "../content/events";
import {
  getEventCopyContactMultiplier,
  getNetworkEventContactMultiplier,
  getNetworkSponsorIncome,
} from "../content/upgrades";
import { getAthleteGeneticsMultiplier, getPrestigeReputationPreview } from "./reputation";
import { resolveSocialContentCycles } from "./collaboratorAutomationOutcomes";
import { createInitialState } from "./engine";
import { createEventCooldown } from "./eventCooldowns";
import { getMemberAnnualDepartureChance } from "./formulas";
import { getGadgetRarityUpgradeChance } from "./gadgetRarity";
import { getMonthlyDepositInterest } from "./membershipEconomy";
import { resolveTrialBatch } from "./trialFlow";
import type { Contact, GameState, GadgetProductState, UpgradeId } from "./types";

const NOW = 200_000;

function withUpgrade(id: UpgradeId, level: number, state = createInitialState(NOW, "Test", false)): GameState {
  return { ...state, upgrades: { ...state.upgrades, [id]: level } };
}

describe("upgrade del 05/10", () => {
  it("Progetto Influencer: ogni contenuto porta un Follower sicuro per livello", () => {
    const outcome = resolveSocialContentCycles(withUpgrade("influencer-project", 5), 10);
    expect(outcome.followersGained).toBeGreaterThanOrEqual(50);
  });

  it("Calendario fitto: dimezza le attese, i mesi restano interi e almeno uno", () => {
    const state = withUpgrade("busy-calendar", 5);
    const sparring = getAcquisitionEventDefinition("park-sparring")!;
    const cooldown = createEventCooldown(state, sparring, 2_000);
    expect(cooldown.kind === "realtime" && cooldown.availableAt - 2_000).toBe(2_500);
    const local = createEventCooldown(state, getAcquisitionEventDefinition("local-event")!, 2_000);
    expect(local.kind === "calendar" && local.availableAtMonth - state.school.currentMonth).toBe(2);
  });

  it("Eventi nel Multiverso: le copie trovano il 25% e poi il 50% di contatti in meno", () => {
    expect([0, 1, 2].map(getEventCopyContactMultiplier)).toEqual([1, 0.75, 0.5]);
  });

  it("Chat di Gruppo: toglie una quota del rischio di non rinnovare", () => {
    expect(getMemberAnnualDepartureChance([], "common", 0, 0.5)).toBe(0.4);
  });

  it("Rhythm Gamer: moltiplica la probabilità della rarità successiva", () => {
    const product = {
      rarities: { common: { unlocked: true, quality: 100, unitsSold: 0 } },
    } as unknown as GadgetProductState;
    expect(getGadgetRarityUpgradeChance(product, "common", 2)).toBeCloseTo(0.5);
  });

  it("Conto deposito: interessi sui primi 250.000 € di Fondi", () => {
    const rich = withUpgrade("deposit-account", 5);
    rich.school.euros = 1_000_000;
    expect(getMonthlyDepositInterest(rich)).toBe(6_250);
    const small = withUpgrade("deposit-account", 1);
    small.school.euros = 100_000;
    expect(getMonthlyDepositInterest(small)).toBe(500);
  });

  it("Porta un amico: alcuni nuovi iscritti portano un contatto", () => {
    const initial = withUpgrade("bring-a-friend", 5);
    const contacts: Contact[] = Array.from({ length: 60 }, (_, index) => ({
      ...initial.contacts[0],
      id: `friend-${index}`,
      email: `friend-${index}@example.invalid`,
      status: "trialScheduled",
    }));
    const state: GameState = {
      ...initial,
      contacts,
      scheduledTrials: contacts.map((contact, index) => ({
        id: `friend-trial-${index}`,
        contactId: contact.id,
        startsAt: NOW - 20_000,
        resolvesAt: NOW - 1,
        resultSeed: index + 1,
        status: "scheduled",
        equipmentUsed: 0,
      })),
    };
    const resolved = resolveTrialBatch(state, state.scheduledTrials, NOW, 1);
    const brought = resolved.contacts.length - contacts.length;
    expect(brought).toBeGreaterThan(0);
    expect(brought).toBeLessThan(30);
    const without = resolveTrialBatch({ ...state, upgrades: { ...state.upgrades, "bring-a-friend": 0 } }, state.scheduledTrials, NOW, 1);
    expect(without.contacts).toHaveLength(contacts.length);
  });

  describe("Network delle Onde", () => {
    it("Lettere di raccomandazione e Gran Consiglio cambiano la Reputazione della fondazione", () => {
      const base = getPrestigeReputationPreview(createInitialState(NOW, "Test", false)).points;
      const letters = withUpgrade("recommendation-letters", 3);
      expect(getPrestigeReputationPreview(letters).points).toBe(base + 3);
      expect(getPrestigeReputationPreview(withUpgrade("grand-council", 1, letters)).points).toBe((base + 3) * 2);
    });

    it("Circuito del Network e Sponsor nazionale crescono con le scuole fondate", () => {
      const levels = withUpgrade("national-sponsor", 2, withUpgrade("network-circuit", 5)).upgrades;
      expect(getNetworkEventContactMultiplier(levels, 10)).toBeCloseTo(1.5);
      expect(getNetworkSponsorIncome(levels, 10)).toBe(20_000);
    });

    it("Arena del Network alza i valori di partenza", () => {
      expect(getAthleteGeneticsMultiplier(withUpgrade("network-arena", 3))).toBeCloseTo(1.15);
    });

    it("Albo dei Maestri: alcuni nuovi iscritti arrivano con la Forma 1", () => {
      const initial = withUpgrade("masters-roll", 5);
      const contacts: Contact[] = Array.from({ length: 40 }, (_, index) => ({
        ...initial.contacts[0],
        id: `roll-${index}`,
        email: `roll-${index}@example.invalid`,
        status: "trialScheduled",
        forms: [],
      }));
      const state: GameState = {
        ...initial,
        contacts,
        scheduledTrials: contacts.map((contact, index) => ({
          id: `roll-trial-${index}`,
          contactId: contact.id,
          startsAt: NOW - 20_000,
          resolvesAt: NOW - 1,
          resultSeed: index + 1,
          status: "scheduled",
          equipmentUsed: 0,
        })),
      };
      const withFormOne = resolveTrialBatch(state, state.scheduledTrials, NOW, 1).contacts
        .filter((contact) => contact.forms.includes("form-1")).length;
      expect(withFormOne).toBeGreaterThan(5);
      expect(withFormOne).toBeLessThan(35);
    });
  });
});
