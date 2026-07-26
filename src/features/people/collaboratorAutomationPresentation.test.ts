import { describe, expect, it } from "vitest";
import { createInitialState } from "../../game/engine";
import type { Collaborator } from "../../game/types";
import {
  getCollaboratorAutomationPresentation,
  getEmailAutomationPresentation,
  getSocialContentAutomationPresentation,
} from "./collaboratorAutomationPresentation";

describe("getCollaboratorAutomationPresentation", () => {
  it("describes idle equipment as waiting and explains why", () => {
    const initial = createInitialState(1_000);

    const presentation = getCollaboratorAutomationPresentation({
      state: initial,
      collaboratorId: "equipment-collaborator",
      assignment: "equipment",
      now: 1_000,
      activeEmail: undefined,
    });

    expect(presentation).toEqual({
      title: "In attesa",
      detail: "Attrezzatura in ordine",
    });
  });

  it("shows when Redazione is waiting for the player's final send action", () => {
    const initial = createInitialState(1_000);
    const activeEmail = {
      ...initial.emails[0],
      status: "readyToSend" as const,
    };

    const presentation = getCollaboratorAutomationPresentation({
      state: {
        ...initial,
        automation: { ...initial.automation, autoSendEmails: false },
      },
      collaboratorId: "writer-1",
      assignment: "writing",
      now: 1_000,
      activeEmail,
    });

    expect(presentation).toMatchObject({
      title: activeEmail.subject,
      detail: "Mail completa · in attesa dell'invio del giocatore",
      progress: 100,
    });
  });

  it("projects equipment progress smoothly between engine ticks", () => {
    const initial = createInitialState(1_000);
    const equipmentCollaborator: Collaborator = {
      id: "equipment-collaborator",
      contactId: initial.contacts[0].id,
      displayName: "Collaboratore Attrezzatura",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "equipment",
      rarity: "rare",
    };
    const state = {
      ...initial,
      collaborators: [equipmentCollaborator],
      equipment: { ...initial.equipment, wear: 10 },
      automation: {
        ...initial.automation,
        equipmentBuffer: 0.2,
        lastProcessedAt: 1_000,
      },
    };

    const getProgressAt = (now: number) => getCollaboratorAutomationPresentation({
      state,
      collaboratorId: equipmentCollaborator.id,
      assignment: "equipment",
      now,
      activeEmail: undefined,
    }).progress;

    expect(getProgressAt(1_500)).toBeCloseTo(53.333_333, 6);
    expect(getProgressAt(1_750)).toBeCloseTo(70, 6);
    expect(getProgressAt(3_000)).toBeCloseTo(86.666_667, 6);
  });

  it("projects sword repair progress against its 150-point workload", () => {
    const initial = createInitialState(1_000);
    const equipmentCollaborator: Collaborator = {
      id: "equipment-collaborator",
      contactId: initial.contacts[0].id,
      displayName: "Collaboratore Attrezzatura",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "equipment",
      rarity: "rare",
    };
    const state = {
      ...initial,
      collaborators: [equipmentCollaborator],
      equipment: {
        ...initial.equipment,
        wear: 0,
        damagedSwords: 1,
      },
      automation: {
        ...initial.automation,
        equipmentBuffer: 1.5,
        lastProcessedAt: 1_000,
      },
    };

    const presentation = getCollaboratorAutomationPresentation({
      state,
      collaboratorId: equipmentCollaborator.id,
      assignment: "equipment",
      now: 1_500,
      activeEmail: undefined,
    });

    expect(presentation.durationMs).toBe(225_000);
    expect(presentation.progress).toBeCloseTo(1.222_222, 6);
  });

  it("shows Social content progress and its monthly return after Redazione evolves", () => {
    const initial = createInitialState(1_000);
    const socialCollaborator: Collaborator = {
      id: "social-collaborator",
      contactId: initial.contacts[0].id,
      displayName: "Collaboratore Social",
      joinedAt: 1_000,
      forms: [
        "form-1",
        "course-x",
        "form-2",
        "course-y",
        "form-3-double",
        "form-4-double",
        "form-5-double",
        "form-6",
        "form-7",
      ],
      instructorForms: [],
      assignment: "writing" as const,
      mastery: {
        writing: 1_500,
        events: 0,
        equipment: 0,
        instructor: 0,
      },
      rarity: "ultra-rare" as const,
    };
    const state = {
      ...initial,
      school: { ...initial.school, activeMembers: 35, followers: 100 },
      emails: [],
      collaborators: [socialCollaborator],
      unlocks: { ...initial.unlocks, social: true },
      automation: { ...initial.automation, socialContentBuffer: 50_000 },
      upgrades: {
        ...initial.upgrades,
        "automatic-signature": 1,
      },
    };

    const presentation = getCollaboratorAutomationPresentation({
      state,
      collaboratorId: socialCollaborator.id,
      assignment: "writing",
      now: 1_000,
      activeEmail: undefined,
    });

    expect(presentation.title).toBe("Contenuti Social");
    expect(presentation.detail).toBe("50% follower · +0,5% Eventi · 10,00\u00a0€/mese");
    expect(presentation.progress).toBe(50);
    expect(presentation.progressLabel).toBe("Produzione dei prossimi contenuti Social");
    expect(presentation.durationMs).toBeGreaterThan(0);
  });

  it("exposes separate Social and email workstreams for the sector card", () => {
    const initial = createInitialState(1_000);
    const collaborator: Collaborator = {
      id: "social-workstreams",
      contactId: initial.contacts[0].id,
      displayName: "Collaboratore Social",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "writing",
      rarity: "rare",
    };
    const state = {
      ...initial,
      collaborators: [collaborator],
      unlocks: { ...initial.unlocks, social: true },
    };
    const activeEmail = state.emails[0];
    const social = getSocialContentAutomationPresentation(state, true);
    const fullSpeedSocial = getSocialContentAutomationPresentation(
      { ...state, emails: [] },
      false,
    );
    const email = getEmailAutomationPresentation(state, activeEmail);
    const idleEmail = getEmailAutomationPresentation(
      { ...state, emails: [] },
      undefined,
    );

    expect(social.title).toBe("Contenuti Social");
    expect(social.detail).not.toContain("forza lavoro");
    expect(social.durationMs).toBeGreaterThan(0);
    expect(social.durationMs).toBeCloseTo((fullSpeedSocial.durationMs ?? 0) * 20);
    expect(email.title).toBe("Scrittura email");
    expect(email.detail).toContain(activeEmail.subject);
    expect(email.detail).not.toContain("forza lavoro");
    expect(email.inactive).not.toBe(true);
    expect(idleEmail).toMatchObject({
      title: "Scrittura email",
      detail: "Nessuna email da scrivere",
      inactive: true,
    });
  });
});
