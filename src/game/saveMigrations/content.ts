import { getEmailBuildLength } from "../../content/emailBuild";
import {
  EMAIL_TEMPLATES,
  resolveEmailTemplateCopy,
} from "../../content/emailTemplates";
import { getEmailPresentationLevel } from "../../content/emailPresentation";
import { TUTORIAL_SCENE_IDS } from "../../content/tutorialScenes";
import { createInitialUpgradeLevels } from "../../content/upgrades";
import { GAME_CONFIG } from "../config";
import { departMembers } from "../membershipFlow";
import type { GameState, UpgradeId } from "../types";
import type { MigratableState } from "./types";

export function migrateContentState(state: MigratableState): MigratableState {
  let migrated = state;

  if (migrated.version === 26) {
    migrated = {
      ...migrated,
      version: 27,
      equipment: migrated.equipment
        ? { ...migrated.equipment, damagedSwords: migrated.equipment.damagedSwords ?? 0 }
        : {
            totalSwords: GAME_CONFIG.initialSwords,
            availableSwords: GAME_CONFIG.initialSwords,
            damagedSwords: 0,
            wear: 0,
          },
    };
  }

  if (migrated.version === 27) {
    const totalSwords = Math.max(0, Math.floor(
      migrated.equipment?.totalSwords ?? GAME_CONFIG.initialSwords,
    ));
    const legacyWear = Math.max(0, migrated.equipment?.wear ?? 0);
    const damagedSwords = Math.min(
      totalSwords,
      Math.max(
        Math.floor(migrated.equipment?.damagedSwords ?? 0),
        Math.floor(totalSwords * Math.min(100, legacyWear) / 100),
      ),
    );
    migrated = {
      ...migrated,
      version: 28,
      equipment: migrated.equipment
        ? {
            ...migrated.equipment,
            totalSwords,
            damagedSwords,
            availableSwords: Math.max(
              0,
              Math.min(migrated.equipment.availableSwords, totalSwords - damagedSwords),
            ),
          }
        : {
            totalSwords: GAME_CONFIG.initialSwords,
            availableSwords: GAME_CONFIG.initialSwords,
            damagedSwords: 0,
            wear: 0,
          },
    };
  }

  if (migrated.version === 28) {
    const legacyUpgrades = migrated.upgrades ?? {};
    const aliases: Record<string, UpgradeId> = {
      "outlook-templates": "professional-email",
      "clear-subject": "spell-check",
      "collective-review": "email-layout",
      testimonials: "winning-advertising",
      "convincing-paragraph": "marketing-course",
      "honest-advertising": "marketing-course",
      "lesson-photos": "winning-advertising",
      "demo-video": "marketing-course",
    };
    const upgrades = createInitialUpgradeLevels();
    for (const [id, rawLevel] of Object.entries(legacyUpgrades)) {
      const target = aliases[id] ?? (id in upgrades ? id as UpgradeId : undefined);
      const level = typeof rawLevel === "number" ? rawLevel : Number(rawLevel);
      if (!target || !Number.isFinite(level)) continue;
      upgrades[target] = Math.max(upgrades[target], Math.max(0, Math.floor(level)));
    }
    const levelMap = [0, 2, 4, 6, 7] as const;
    const activeLevel = getEmailPresentationLevel(upgrades);
    const displayName = migrated.profile?.displayName ?? "";
    migrated = {
      ...migrated,
      version: 29,
      upgrades,
      emails: (migrated.emails ?? []).map((email) => {
        const contact = migrated.contacts?.find((candidate) => candidate.id === email.contactId);
        const template = EMAIL_TEMPLATES.find((candidate) => candidate.id === email.templateId);
        const oldLevel = Number.isInteger(email.presentationLevel)
          ? Math.min(4, Math.max(0, email.presentationLevel ?? 0))
          : 0;
        const presentationLevel = email.status === "writing"
          ? activeLevel
          : levelMap[oldLevel];
        return {
          ...email,
          presentationLevel,
          body: email.status === "writing" && contact && template
            ? template.body(contact.firstName, displayName, activeLevel)
            : email.body,
        };
      }),
    };
  }

  if (migrated.version === 29) {
    migrated = {
      ...migrated,
      version: 30,
      emails: (migrated.emails ?? []).map((email) => {
        const legacyLength = Math.max(1, email.body.length);
        const sourceLength = getEmailBuildLength(email);
        const legacyProgress = Math.min(1, Math.max(0, email.revealedCharacters / legacyLength));
        return {
          ...email,
          revealedCharacters: Math.round(legacyProgress * sourceLength),
        };
      }),
    };
  }

  if (migrated.version === 30) {
    const displayName = migrated.profile?.displayName ?? "";
    const orderName = migrated.school?.name ?? "Ordine delle Onde";
    const city = migrated.school?.city ?? "Genova";
    migrated = {
      ...migrated,
      version: 31,
      emails: (migrated.emails ?? []).map((email) => {
        if (email.status !== "writing" || email.presentationLevel < 2) return email;
        const contact = migrated.contacts?.find((candidate) => candidate.id === email.contactId);
        const template = EMAIL_TEMPLATES.find((candidate) => candidate.id === email.templateId);
        if (!contact || !template) return email;

        const previousLength = Math.max(1, getEmailBuildLength(email));
        const progress = Math.min(1, Math.max(0, email.revealedCharacters / previousLength));
        const copy = resolveEmailTemplateCopy(
          template,
          contact.firstName,
          displayName,
          email.presentationLevel,
          orderName,
          city,
        );
        const updatedEmail = { ...email, subject: copy.subject, body: copy.body };
        return {
          ...updatedEmail,
          revealedCharacters: Math.round(progress * getEmailBuildLength(updatedEmail)),
        };
      }),
    };
  }

  if (migrated.version === 31) {
    const legacyCollaboratorContactIds = new Set(
      (migrated.collaborators ?? [])
        .filter((collaborator) => collaborator.rarity === "rare")
        .map((collaborator) => collaborator.contactId),
    );
    migrated = {
      ...migrated,
      version: 32,
      contacts: (migrated.contacts ?? []).map((contact) =>
        legacyCollaboratorContactIds.has(contact.id) && contact.rarity === "rare"
          ? { ...contact, rarity: "ultra-rare" }
          : contact,
      ),
      collaborators: (migrated.collaborators ?? []).map((collaborator) =>
        collaborator.rarity === "rare"
          ? { ...collaborator, rarity: "ultra-rare" }
          : collaborator,
      ),
    };
  }

  if (migrated.version === 32) {
    migrated = {
      ...migrated,
      version: 33,
      narrative: migrated.narrative
        ? {
            ...migrated.narrative,
            history: migrated.narrative.history.slice(-GAME_CONFIG.narrativeHistoryLimit),
          }
        : migrated.narrative,
    };
  }

  if (migrated.version === 33) {
    const activeMembers = Math.max(0, migrated.school?.activeMembers ?? 0);
    const enrolledContacts = (migrated.contacts ?? []).filter(
      (contact) => contact.status === "enrolled",
    );
    const surplus = Math.max(0, enrolledContacts.length - activeMembers);
    const renewalNames = new Set(
      (migrated.narrative?.history ?? []).flatMap((record) =>
        record.definitionId === "missed-renewal" && record.person
          ? [record.person.displayName]
          : [],
      ),
    );
    const collaboratorContactIds = new Set(
      (migrated.collaborators ?? []).map((collaborator) => collaborator.contactId),
    );
    const departureIds = [...enrolledContacts]
      .sort((left, right) => {
        const score = (contact: typeof left) => {
          const namedInRenewal = renewalNames.has(`${contact.firstName} ${contact.lastName}`);
          const collaborator = collaboratorContactIds.has(contact.id);
          if (namedInRenewal && !collaborator) return 0;
          if (!collaborator) return 1;
          if (namedInRenewal) return 2;
          return 3;
        };
        return score(left) - score(right);
      })
      .slice(0, surplus)
      .map((contact) => contact.id);
    const reconciled: MigratableState = departureIds.length > 0
      ? departMembers(migrated as GameState, departureIds, false, "data-reconciliation")
      : migrated;
    migrated = {
      ...reconciled,
      school: reconciled.school
        ? {
            ...reconciled.school,
            activeMembers: Math.max(
              activeMembers,
              (reconciled.contacts ?? []).filter(
                (contact) => contact.status === "enrolled",
              ).length,
            ),
          }
        : reconciled.school,
      version: 34,
    };
  }

  if (migrated.version === 34) {
    migrated = {
      ...migrated,
      version: GAME_CONFIG.version,
      automation: migrated.automation
        ? {
            ...migrated.automation,
            autoSendEmails: migrated.automation.autoSendEmails ?? true,
          }
        : migrated.automation,
      tutorial: {
        completedSceneIds: [...TUTORIAL_SCENE_IDS],
        skippedSceneIds: [],
      },
    };
  }

  return migrated;
}
