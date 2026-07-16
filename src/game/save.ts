import { GAME_CONFIG } from "./config";
import { createInitialState } from "./engine";
import { simulateOfflineProgress } from "./offline";
import { createProspectEmail } from "../content/prospectDirectory";
import { SPECIAL_COLLABORATORS } from "../content/specialCollaborators";
import { createInitialUpgradeLevels, getUpgradeEffectTotal } from "../content/upgrades";
import { getEmailPresentationLevel } from "../content/emailPresentation";
import { getEmailBuildLength } from "../content/emailBuild";
import { synchronizeEquipmentAvailability } from "./equipment";
import { createShortGoalFromStatistics } from "../content/shortGoals";
import { normalizeStackedMessages } from "./messages";
import { getAcquisitionEventDefinition } from "../content/events";
import { EMAIL_TEMPLATES } from "../content/emailTemplates";
import { FORM_BRANCHES, getFormDefinition } from "../content/forms";
import {
  COLLABORATOR_MASTERY_ROLES,
  createInitialCollaboratorMastery,
} from "../content/mastery";
import type { CollaboratorMastery, GameState, UpgradeId } from "./types";

const SAVE_KEY = "oggetto-nuovi-iscritti.save";
const BACKUP_KEY = `${SAVE_KEY}.backup`;
const HIDDEN_MESSAGE_SUBJECTS = new Set([
  "Nuova lezione di prova prenotata",
  "Stiamo finendo i contatti",
  "Contatti terminati",
]);
const LEGACY_PROSPECT_EMAIL_DOMAIN = "@esempio.test";

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<GameState>;
  return (
    state.version === GAME_CONFIG.version &&
    Array.isArray(state.contacts) &&
    state.contacts.every((contact) =>
      (contact.rarity === "common" || contact.rarity === "rare" || contact.rarity === "legendary") &&
      Array.isArray(contact.forms)
    ) &&
    Array.isArray(state.emails) &&
    state.emails.every((email) =>
      Number.isInteger(email.presentationLevel) &&
      email.presentationLevel >= 0 &&
    email.presentationLevel <= 7
    ) &&
    Array.isArray(state.acquisitionEvents) &&
    state.acquisitionEvents.every((event) => typeof event.membersUsed === "number") &&
    typeof state.activities?.nextSparringAt === "number" &&
    typeof state.upgrades?.["comfortable-keyboard"] === "number" &&
    typeof state.statistics?.peopleMet === "number" &&
    typeof state.statistics?.demonstrationsGiven === "number" &&
    typeof state.statistics?.maintenanceCompleted === "number" &&
    typeof state.school?.peakActiveMembers === "number" &&
    typeof state.equipment?.totalSwords === "number" &&
    typeof state.equipment?.availableSwords === "number" &&
    typeof state.equipment?.damagedSwords === "number" &&
    typeof state.equipment?.wear === "number" &&
    Array.isArray(state.legendaryCollaborators?.encounteredProfileIds) &&
    Array.isArray(state.legendaryCollaborators?.enrolledProfileIds) &&
    typeof state.legendaryCollaborators?.enrollmentAttempts === "object" &&
    typeof state.legendaryCollaborators?.retainedProgress === "object" &&
    Array.isArray(state.collaborators) &&
    state.collaborators.every((collaborator) =>
      (collaborator.rarity === "rare" || collaborator.rarity === "legendary") &&
      Array.isArray(collaborator.forms) &&
      Array.isArray(collaborator.instructorForms) &&
      Array.isArray(collaborator.formBranchPreferences) &&
      typeof collaborator.autoTeachingEnabled === "boolean" &&
      typeof collaborator.mastery === "object" &&
      collaborator.mastery !== null &&
      COLLABORATOR_MASTERY_ROLES.every((role) =>
        Number.isFinite(collaborator.mastery?.[role]) &&
        (collaborator.mastery?.[role] ?? 0) >= 0
      )
    ) &&
    typeof state.upgrades?.["instructor-versatility"] === "number" &&
    typeof state.upgrades?.["tiamat-instructor"] === "number" &&
    typeof state.automation?.lastProcessedAt === "number" &&
    typeof state.automation?.offlineContactBuffer === "number" &&
    typeof state.statistics?.automatedCharacters === "number" &&
    typeof state.statistics?.socialCampaigns === "number" &&
    typeof state.statistics?.formsCompleted === "number" &&
    typeof state.statistics?.membersDeparted === "number" &&
    typeof state.statistics?.narrativeEvents === "number" &&
    typeof state.unlocks?.collaborators === "boolean" &&
    typeof state.unlocks?.forms === "boolean" &&
    Array.isArray(state.achievements) &&
    typeof state.narrative?.nextEventAt === "number" &&
    Array.isArray(state.narrative?.history) &&
    typeof state.shortGoal?.definitionId === "string" &&
    typeof state.shortGoal?.baseline === "number" &&
    typeof state.shortGoal?.target === "number" &&
    typeof state.shortGoal?.startedAt === "number" &&
    typeof state.shortGoal?.completedCount === "number" &&
    typeof state.randomSeed === "number" &&
    typeof state.profile?.displayName === "string" &&
    typeof state.school?.euros === "number" &&
    typeof state.school?.currentMonth === "number" &&
    typeof state.school?.city === "string" &&
    typeof state.school?.accentColor === "string" &&
    typeof state.network?.reputation === "number" &&
    Array.isArray(state.network?.schools) &&
    typeof state.network?.prestigeOfferSent === "boolean"
  );
}

function migrate(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  type MigratableState = Partial<GameState> & {
    version?: number;
    statistics?: Partial<GameState["statistics"]>;
    upgrades?: Record<string, number> & { speedLevel?: number };
  };
  let migrated = value as MigratableState;

  if (migrated.version === 1 && migrated.statistics) {
    migrated = {
      ...migrated,
      version: 2,
      acquisitionEvents: [],
      activities: {
        nextSparringAt: migrated.lastSavedAt ?? migrated.createdAt ?? Date.now(),
      },
      statistics: {
        ...migrated.statistics,
        contactsAcquired: 0,
        eventsCompleted: 0,
      } as GameState["statistics"],
    };
  }

  if (migrated.version === 2) {
    const legacySpeedLevel =
      migrated.upgrades?.speedLevel ?? Math.max(0, (migrated.player?.writingPower ?? 1) - 1);
    const upgrades = createInitialUpgradeLevels();
    upgrades["comfortable-keyboard"] = legacySpeedLevel;
    migrated = {
      ...migrated,
      version: 3,
      upgrades,
      player: { writingPower: 1 + legacySpeedLevel },
    };
  }

  if (migrated.version === 3 && migrated.statistics) {
    migrated = {
      ...migrated,
      version: 4,
      acquisitionEvents: (migrated.acquisitionEvents ?? []).map((event) => ({
        ...event,
        peopleMet: event.peopleMet ?? Math.max(0, (event.contactReward ?? 0) * 5),
        demonstrationsGiven:
          event.demonstrationsGiven ?? Math.max(0, (event.contactReward ?? 0) * 2),
      })),
      statistics: {
        ...migrated.statistics,
        peopleMet: migrated.statistics.peopleMet ?? 0,
        demonstrationsGiven: migrated.statistics.demonstrationsGiven ?? 0,
      } as GameState["statistics"],
    };
  }

  if (migrated.version === 4 && migrated.statistics) {
    migrated = {
      ...migrated,
      version: 5,
      equipment: migrated.equipment ?? {
        totalSwords: 6,
        availableSwords: 6,
        damagedSwords: 0,
        wear: 0,
      },
      acquisitionEvents: (migrated.acquisitionEvents ?? []).map((event) => ({
        ...event,
        equipmentUsed: event.equipmentUsed ?? 0,
        wearAdded: event.wearAdded ?? 0,
      })),
      statistics: {
        ...migrated.statistics,
        maintenanceCompleted: migrated.statistics.maintenanceCompleted ?? 0,
      } as GameState["statistics"],
    };
  }

  if (migrated.version === 5 && migrated.statistics) {
    migrated = {
      ...migrated,
      version: 6,
      collaborators: migrated.collaborators ?? [],
      automation: migrated.automation ?? {
        lastProcessedAt: migrated.lastSavedAt ?? migrated.createdAt ?? Date.now(),
        writingBuffer: 0,
        socialBuffer: 0,
        equipmentBuffer: 0,
        offlineContactBuffer: 0,
      },
      unlocks: {
        upgrades: migrated.unlocks?.upgrades ?? false,
        collaborators: migrated.unlocks?.collaborators ?? false,
        social: migrated.unlocks?.social ?? false,
        forms: migrated.unlocks?.forms ?? false,
      },
      statistics: {
        ...migrated.statistics,
        collaboratorsRecruited: migrated.statistics.collaboratorsRecruited ?? 0,
        automatedCharacters: migrated.statistics.automatedCharacters ?? 0,
        socialContacts: migrated.statistics.socialContacts ?? 0,
      } as GameState["statistics"],
    };
  }

  if (migrated.version === 6 && migrated.statistics) {
    migrated = {
      ...migrated,
      version: 7,
      statistics: {
        ...migrated.statistics,
        socialCampaigns: migrated.statistics.socialCampaigns ?? 0,
      } as GameState["statistics"],
    };
  }

  if (migrated.version === 7 && migrated.statistics) {
    migrated = {
      ...migrated,
      version: 8,
      collaborators: (migrated.collaborators ?? []).map((collaborator) => ({
        ...collaborator,
        forms: collaborator.forms ?? [],
      })),
      unlocks: {
        upgrades: migrated.unlocks?.upgrades ?? false,
        collaborators: migrated.unlocks?.collaborators ?? false,
        social: migrated.unlocks?.social ?? false,
        forms: migrated.unlocks?.forms ?? false,
      },
      statistics: {
        ...migrated.statistics,
        formsCompleted: migrated.statistics.formsCompleted ?? 0,
      } as GameState["statistics"],
    };
  }

  if (migrated.version === 8) {
    const upgrades = {
      ...createInitialUpgradeLevels(),
      ...(migrated.upgrades ?? {}),
    };
    const totalSwords =
      GAME_CONFIG.initialSwords + Math.floor(getUpgradeEffectTotal(upgrades, "totalSwords"));
    migrated = {
      ...migrated,
      version: 9,
      upgrades,
      equipment: migrated.equipment
        ? {
            ...migrated.equipment,
            totalSwords,
            availableSwords: Math.min(totalSwords, migrated.equipment.availableSwords),
          }
        : migrated.equipment,
    };
  }

  if (migrated.version === 9 && migrated.statistics) {
    const referenceTime = migrated.lastSavedAt ?? migrated.createdAt ?? Date.now();
    migrated = {
      ...migrated,
      version: 10,
      achievements: migrated.achievements ?? [],
      narrative: migrated.narrative ?? {
        nextEventAt: referenceTime + GAME_CONFIG.narrativeEventMinMs,
        history: [],
      },
      statistics: {
        ...migrated.statistics,
        narrativeEvents: migrated.statistics.narrativeEvents ?? 0,
      } as GameState["statistics"],
    };
  }

  if (migrated.version === 10) {
    migrated = {
      ...migrated,
      version: 11,
      school: migrated.school
        ? {
            ...migrated.school,
            city: migrated.school.city ?? "Genova",
            accentColor: migrated.school.accentColor ?? "#0f6cbd",
            motto: migrated.school.motto ?? "Ogni onda comincia da un movimento",
            specialization: migrated.school.specialization ?? "generale",
          }
        : migrated.school,
      network: migrated.network ?? {
        reputation: 0,
        schools: [],
        prestigeOfferSent: false,
      },
    };
  }

  if (migrated.version === 11) {
    migrated = {
      ...migrated,
      version: 12,
      school: migrated.school
        ? {
            ...migrated.school,
            currentMonth: migrated.school.currentMonth ?? 9,
          }
        : migrated.school,
    };
  }

  if (migrated.version === 12) {
    migrated = {
      ...migrated,
      version: 13,
      contacts: migrated.contacts?.map((contact) => {
        const profile = SPECIAL_COLLABORATORS.find(
          (candidate) => candidate.firstName === contact.firstName &&
            candidate.lastName === contact.lastName,
        );
        return profile ? { ...contact, specialProfileId: profile.id } : contact;
      }),
      collaborators: migrated.collaborators?.map((collaborator) => {
        const profile = SPECIAL_COLLABORATORS.find(
          (candidate) => `${candidate.firstName} ${candidate.lastName}` === collaborator.displayName,
        );
        return profile ? { ...collaborator, specialProfileId: profile.id } : collaborator;
      }),
    };
  }

  if (migrated.version === 13) {
    const encounteredProfileIds = [...new Set([
      ...(migrated.contacts ?? []).flatMap((contact) =>
        contact.specialProfileId ? [contact.specialProfileId] : [],
      ),
      ...(migrated.collaborators ?? []).flatMap((collaborator) =>
        collaborator.specialProfileId ? [collaborator.specialProfileId] : [],
      ),
    ])];
    const enrolledProfileIds = [...new Set(
      (migrated.collaborators ?? []).flatMap((collaborator) =>
        collaborator.specialProfileId ? [collaborator.specialProfileId] : [],
      ),
    )];
    migrated = {
      ...migrated,
      version: 14,
      legendaryCollaborators: {
        encounteredProfileIds,
        enrolledProfileIds,
        enrollmentAttempts: Object.fromEntries(
          enrolledProfileIds.map((profileId) => [profileId, 1]),
        ),
        retainedProgress: {},
      },
    };
  }

  if (migrated.version === 14) {
    migrated = {
      ...migrated,
      version: 15,
      contacts: migrated.contacts?.map((contact) => ({
        ...contact,
        rarity: contact.specialProfileId ? "legendary" : "common",
      })),
      collaborators: migrated.collaborators?.map((collaborator) => ({
        ...collaborator,
        rarity: collaborator.specialProfileId ? "legendary" : "common",
      })),
    };
  }

  if (migrated.version === 15) {
    const qualifiedForms = ["form-1", "course-x", "form-2", "course-y"] as const;
    const collaboratorsByContactId = new Map(
      (migrated.collaborators ?? []).map((collaborator) => [collaborator.contactId, collaborator]),
    );
    migrated = {
      ...migrated,
      version: 16,
      school: migrated.school
        ? { ...migrated.school, nextFeeAt: migrated.school.nextFeeAt + 60_000 }
        : migrated.school,
      contacts: migrated.contacts?.map((contact) => {
        const existingCollaborator = collaboratorsByContactId.get(contact.id);
        return {
          ...contact,
          rarity: contact.rarity === "common" && existingCollaborator ? "rare" : contact.rarity,
          forms: existingCollaborator
            ? [...new Set([...qualifiedForms, ...(existingCollaborator.forms ?? [])])]
            : [],
          training: undefined,
          lastFormTrainingYear: 0,
        };
      }),
      collaborators: migrated.collaborators?.map((collaborator) => ({
        ...collaborator,
        rarity: collaborator.rarity === "common" ? "rare" : collaborator.rarity,
        forms: [...new Set([...qualifiedForms, ...(collaborator.forms ?? [])])],
        training: collaborator.training && qualifiedForms.includes(
          collaborator.training.formId as (typeof qualifiedForms)[number],
        )
          ? undefined
          : collaborator.training,
        lastFormTrainingYear: 0,
      })),
      unlocks: migrated.unlocks
        ? {
            ...migrated.unlocks,
            forms: migrated.unlocks.forms || (migrated.school?.activeMembers ?? 0) > 0,
          }
        : migrated.unlocks,
    };
  }

  if (migrated.version === 16) {
    const upgrades = {
      ...createInitialUpgradeLevels(),
      ...(migrated.upgrades ?? {}),
    };
    const presentationLevel = getEmailPresentationLevel(upgrades);
    migrated = {
      ...migrated,
      version: 17,
      emails: (migrated.emails ?? []).map((email) => ({
        ...email,
        presentationLevel,
      })),
    };
  }

  if (migrated.version === 17) {
    migrated = {
      ...migrated,
      version: 18,
      automation: migrated.automation
        ? { ...migrated.automation, offlineContactBuffer: 0 }
        : migrated.automation,
      messages: normalizeStackedMessages(migrated.messages ?? []),
    };
  }

  if (migrated.version === 18 && migrated.statistics) {
    const referenceTime = migrated.lastSavedAt ?? migrated.createdAt ?? Date.now();
    migrated = {
      ...migrated,
      version: 19,
      shortGoal: createShortGoalFromStatistics(
        migrated.statistics as GameState["statistics"],
        0,
        referenceTime,
      ),
    };
  }

  if (migrated.version === 19) {
    migrated = {
      ...migrated,
      version: 20,
      acquisitionEvents: (migrated.acquisitionEvents ?? []).map((event) => ({
        ...event,
        membersUsed: event.membersUsed ??
          getAcquisitionEventDefinition(event.definitionId)?.requiredMembers ??
          0,
      })),
    };
  }

  if (migrated.version === 20 && migrated.statistics) {
    migrated = {
      ...migrated,
      version: 21,
      contacts: (migrated.contacts ?? []).map((contact) => ({
        ...contact,
        enrolledMonth: contact.status === "enrolled"
          ? contact.enrolledMonth ?? migrated.school?.currentMonth ?? 9
          : contact.enrolledMonth,
      })),
      statistics: {
        ...migrated.statistics,
        membersDeparted: migrated.statistics.membersDeparted ?? 0,
      } as GameState["statistics"],
    };
  }

  if (migrated.version === 21) {
    const recordedDepartures = (migrated.contacts ?? []).filter(
      (contact) => contact.status === "departed",
    ).length;
    const missedRenewals = (migrated.narrative?.history ?? []).filter(
      (event) => event.definitionId === "missed-renewal",
    ).length;
    const highestUnlockedEvent = (migrated.acquisitionEvents ?? []).reduce(
      (highest, event) => Math.max(
        highest,
        getAcquisitionEventDefinition(event.definitionId)?.unlockMembers ?? 0,
      ),
      0,
    );
    migrated = {
      ...migrated,
      version: 22,
      school: migrated.school
        ? {
            ...migrated.school,
            peakActiveMembers: Math.max(
              migrated.school.activeMembers ?? 0,
              (migrated.school.activeMembers ?? 0) + recordedDepartures + missedRenewals,
              highestUnlockedEvent,
            ),
          }
        : migrated.school,
    };
  }

  if (migrated.version === 22) {
    migrated = {
      ...migrated,
      version: 23,
      collaborators: (migrated.collaborators ?? []).map((collaborator) => ({
        ...collaborator,
        instructorForms: collaborator.instructorForms ?? [],
      })),
    };
  }

  if (migrated.version === 23) {
    const retainedProgress = Object.fromEntries(
      (migrated.collaborators ?? []).flatMap((collaborator) =>
        collaborator.specialProfileId
          ? [[collaborator.specialProfileId, {
              forms: [...collaborator.forms],
              instructorForms: [...(collaborator.instructorForms ?? [])],
              joinedAt: collaborator.joinedAt,
              lastFormTrainingYear: collaborator.lastFormTrainingYear,
            }]]
          : [],
      ),
    );
    migrated = {
      ...migrated,
      version: 24,
      legendaryCollaborators: migrated.legendaryCollaborators
        ? { ...migrated.legendaryCollaborators, retainedProgress }
        : migrated.legendaryCollaborators,
    };
  }

  if (migrated.version === 24) {
    const preferencesFor = (forms: GameState["contacts"][number]["forms"], index: number) => {
      if (!forms.includes("course-y")) return [];
      const learnedBranches = FORM_BRANCHES.filter((branch) =>
        forms.some((formId) => getFormDefinition(formId)?.branch === branch)
      );
      return learnedBranches.length > 0
        ? learnedBranches
        : [FORM_BRANCHES[index % FORM_BRANCHES.length]];
    };
    const retainedProgress = Object.fromEntries(
      Object.entries(migrated.legendaryCollaborators?.retainedProgress ?? {}).map(
        ([profileId, retained], index) => [profileId, retained
          ? {
              ...retained,
              formBranchPreferences: retained.formBranchPreferences ??
                preferencesFor(retained.forms, index),
            }
          : retained],
      ),
    );
    migrated = {
      ...migrated,
      version: 25,
      contacts: (migrated.contacts ?? []).map((contact, index) => ({
        ...contact,
        formBranchPreferences: contact.formBranchPreferences ??
          preferencesFor(contact.forms, index),
      })),
      collaborators: (migrated.collaborators ?? []).map((collaborator, index) => ({
        ...collaborator,
        formBranchPreferences: collaborator.formBranchPreferences ??
          preferencesFor(collaborator.forms, index),
        autoTeachingEnabled: collaborator.autoTeachingEnabled ?? true,
      })),
      legendaryCollaborators: migrated.legendaryCollaborators
        ? { ...migrated.legendaryCollaborators, retainedProgress }
        : migrated.legendaryCollaborators,
      upgrades: { ...createInitialUpgradeLevels(), ...(migrated.upgrades ?? {}) },
    };
  }

  if (migrated.version === 25) {
    const normalizeMastery = (
      mastery: Partial<CollaboratorMastery> | undefined,
    ): CollaboratorMastery => {
      const defaults = createInitialCollaboratorMastery();
      return Object.fromEntries(
        COLLABORATOR_MASTERY_ROLES.map((role) => [
          role,
          Math.max(0, Number.isFinite(mastery?.[role]) ? mastery?.[role] ?? 0 : defaults[role]),
        ]),
      ) as CollaboratorMastery;
    };
    migrated = {
      ...migrated,
      version: 26,
      collaborators: (migrated.collaborators ?? []).map((collaborator) => ({
        ...collaborator,
        mastery: normalizeMastery(collaborator.mastery),
      })),
    };
  }

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
    migrated = {
      ...migrated,
      version: 28,
      equipment: migrated.equipment
        ? synchronizeEquipmentAvailability({
            ...migrated.equipment,
            damagedSwords: migrated.equipment.damagedSwords ?? 0,
          })
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
      version: GAME_CONFIG.version,
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

  if (migrated.contacts?.some((contact) => contact.email.endsWith(LEGACY_PROSPECT_EMAIL_DOMAIN))) {
    migrated = {
      ...migrated,
      contacts: migrated.contacts.map((contact, index) =>
        contact.email.endsWith(LEGACY_PROSPECT_EMAIL_DOMAIN)
          ? {
              ...contact,
              email: createProspectEmail(
                contact.email.slice(0, -LEGACY_PROSPECT_EMAIL_DOMAIN.length),
                index,
              ),
            }
          : contact,
      ),
    };
  }

  if (migrated.contacts?.some((contact) => /\.\d+@/.test(contact.email))) {
    migrated = {
      ...migrated,
      contacts: migrated.contacts.map((contact) => ({
        ...contact,
        email: contact.email.replace(/\.\d+(?=@)/, ""),
      })),
    };
  }

  if (!migrated.profile) {
    migrated = {
      ...migrated,
      profile: { displayName: "" },
    };
  }

  return migrated;
}

function read(key: string): GameState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = migrate(JSON.parse(raw));
    return isGameState(parsed)
      ? {
          ...parsed,
          messages: normalizeStackedMessages(
            parsed.messages.filter(
              (message) => !HIDDEN_MESSAGE_SUBJECTS.has(message.subject),
            ),
          ),
        }
      : null;
  } catch {
    return null;
  }
}

export function loadGame(now = Date.now()): GameState {
  const saved = read(SAVE_KEY) ?? read(BACKUP_KEY);
  if (!saved) return createInitialState(now);
  if (!saved.profile.displayName.trim()) {
    return {
      ...saved,
      lastSavedAt: now,
      automation: { ...saved.automation, lastProcessedAt: now },
    };
  }
  return simulateOfflineProgress(saved, now).state;
}

export function saveGame(state: GameState, now = Date.now()): void {
  try {
    const current = localStorage.getItem(SAVE_KEY);
    if (current) localStorage.setItem(BACKUP_KEY, current);
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, lastSavedAt: now }));
  } catch {
    // Il gioco resta utilizzabile anche quando lo storage del browser è indisponibile.
  }
}

export function exportGame(state: GameState): string {
  return JSON.stringify(state, null, 2);
}

export function importGame(raw: string): GameState | null {
  try {
    const parsed = migrate(JSON.parse(raw));
    return isGameState(parsed)
      ? { ...parsed, messages: normalizeStackedMessages(parsed.messages) }
      : null;
  } catch {
    return null;
  }
}

export function resetGame(now = Date.now()): GameState {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(BACKUP_KEY);
  return createInitialState(now);
}
