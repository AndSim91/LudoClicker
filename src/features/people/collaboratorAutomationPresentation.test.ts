import { describe, expect, it } from "vitest";
import { createInitialState } from "../../game/engine";
import type { Collaborator } from "../../game/types";
import { getCollaboratorAutomationPresentation } from "./collaboratorAutomationPresentation";

describe("getCollaboratorAutomationPresentation", () => {
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

    expect(getProgressAt(1_500)).toBeCloseTo(25, 6);
    expect(getProgressAt(1_750)).toBeCloseTo(27.5, 6);
    expect(getProgressAt(3_000)).toBeCloseTo(30, 6);
  });

  it("projects sword repair progress against its three-cycle workload", () => {
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

    expect(presentation.durationMs).toBe(30_000);
    expect(presentation.progress).toBeCloseTo(51.666_667, 6);
  });

  it("shows Social income per second using the effective cycle with every speed bonus", () => {
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
      assignment: "social" as const,
      mastery: {
        writing: 0,
        events: 0,
        lessons: 0,
        social: 1_500,
        equipment: 0,
        instructor: 0,
      },
      rarity: "ultra-rare" as const,
    };
    const state = {
      ...initial,
      school: { ...initial.school, activeMembers: 16 },
      collaborators: [socialCollaborator],
      upgrades: {
        ...initial.upgrades,
        "automatic-signature": 1,
        "updated-page": 1,
      },
    };

    const presentation = getCollaboratorAutomationPresentation({
      state,
      collaboratorId: socialCollaborator.id,
      assignment: "social",
      now: 1_000,
      activeEmail: undefined,
    });

    expect(presentation.title).toBe(
      "Rendimento: 1,78\u00a0€/s | <0,01/s Lezioni di prova | <0,01/s Nuovi contatti",
    );
    expect(presentation.detail).toBeUndefined();
    expect(presentation.title).not.toMatch(/Prossimo rendimento|Ciclo base/);
    expect(presentation.durationMs).toBeCloseTo(
      120_000 / (1.55 * 1.25 * 1.2 * 1.15),
      6,
    );
  });
});
