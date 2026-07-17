import { getEmailBuildLength } from "../content/emailBuild";
import { getCollaboratorProductivity } from "../content/forms";
import {
  COLLABORATOR_MASTERY_XP,
} from "../content/mastery";
import {
  getUpgradeCost,
  getUpgradeDefinition,
  getUpgradeEffectTotal,
} from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import { collectFees as collectMemberFees } from "./membershipFlow";
import {
  resolveAcquisitionEvent as settleAcquisitionEvent,
  startAcquisitionEvent as beginAcquisitionEvent,
} from "./eventFlow";
import {
  finalizeEmail as completeEmail,
  resolveEmailOutcome as settleEmailOutcome,
  startNextCampaign as startEmailCampaign,
} from "./emailFlow";
import {
  addLegendaryEncounters,
  createAcquiredContacts,
} from "./contacts";
import { refreshWritingCampaignCopies } from "./campaignContent";
import { recruitCollaborator } from "./collaboratorFlow";
import { createInitialState as buildInitialState } from "./initialState";
import {
  getEquipmentMaintenanceCost,
  synchronizeEquipmentAvailability,
} from "./equipment";
import {
  getWritingPower,
} from "./formulas";
import {
  addCollaboratorMasteryExperience as awardCollaboratorMasteryExperience,
  addMessage as appendMessage,
} from "./stateUpdates";
import {
  processAutomaticTeaching as teachAutomatically,
  processAutomation as advanceAutomation,
  runSocialCampaign as executeSocialCampaign,
} from "./automationFlow";
import {
  assignCollaborator as setCollaboratorAssignment,
  resolveFormTraining as completeFormTraining,
  startFormTraining as beginFormTraining,
  toggleInstructorAutomation as setInstructorAutomation,
} from "./trainingFlow";
import { notifyPrestigeOffer, processNarrativeEvent } from "./narrativeFlow";
import {
  completeShortGoal,
  foundSchool,
  grantAchievements,
} from "./schoolProgressionFlow";
import { resolveTrial } from "./trialFlow";
import {
  selectActiveEmail,
  selectIncomePerMonth,
} from "./selectors";
import type {
  AcquisitionEvent,
  GameAction,
  GameState,
  InboxMessage,
  PendingEmailOutcome,
  UpgradeId,
  CollaboratorAssignment,
  FormId,
  LegendaryCollaboratorProgress,
} from "./types";

export { getLegendaryAppearanceChance } from "./contacts";
export { getLegendaryEnrollmentChance } from "./trialFlow";
export { canFoundSchool, getPrestigeRequirements } from "./progression";

export function createInitialState(
  now = Date.now(),
  displayName = "",
  includeAndrea = true,
  existingLegendaryProgress?: LegendaryCollaboratorProgress,
): GameState {
  return buildInitialState(now, displayName, includeAndrea, existingLegendaryProgress);
}

function addMessage(
  state: GameState,
  now: number,
  subject: string,
  preview: string,
  tone: InboxMessage["tone"] = "positive",
  category: NonNullable<InboxMessage["category"]> = "focused",
  threadKey?: InboxMessage["threadKey"],
): GameState {
  return appendMessage(state, now, subject, preview, tone, category, threadKey);
}

function addCollaboratorMasteryExperience(
  state: GameState,
  role: CollaboratorAssignment,
  amount: number,
  now: number,
): GameState {
  return awardCollaboratorMasteryExperience(state, role, amount, now);
}


function startNextCampaign(state: GameState, now: number): GameState {
  return startEmailCampaign(state, now);
}

function finalizeEmail(state: GameState, emailId: string, now: number): GameState {
  return completeEmail(state, emailId, now);
}

function resolveEmailOutcome(
  state: GameState,
  outcome: PendingEmailOutcome,
  now: number,
): GameState {
  return settleEmailOutcome(state, outcome, now);
}


function collectFees(state: GameState, now: number, gainMultiplier: number): GameState {
  return collectMemberFees(state, now, gainMultiplier);
}


function startAcquisitionEvent(
  state: GameState,
  definitionId: AcquisitionEvent["definitionId"],
  now: number,
): GameState {
  return beginAcquisitionEvent(state, definitionId, now);
}

function resolveAcquisitionEvent(
  state: GameState,
  event: AcquisitionEvent,
  now: number,
  gainMultiplier: number,
): GameState {
  return settleAcquisitionEvent(state, event, now, gainMultiplier);
}


function maintainEquipment(state: GameState, now: number): GameState {
  const maintenanceCost = getEquipmentMaintenanceCost(state.equipment);
  if (
    (state.equipment.wear <= 0 && state.equipment.damagedSwords <= 0) ||
    state.school.euros < maintenanceCost ||
    state.acquisitionEvents.some((event) => event.status === "running")
  ) {
    return state;
  }
  const swordsInRunningEvents = state.acquisitionEvents
    .filter((event) => event.status === "running")
    .reduce((total, event) => total + event.equipmentUsed, 0);
  const maintained = {
    ...state,
    school: {
      ...state.school,
      euros: state.school.euros - maintenanceCost,
    },
    equipment: {
      ...state.equipment,
      availableSwords: Math.max(0, state.equipment.totalSwords - swordsInRunningEvents),
      damagedSwords: 0,
      wear: 0,
    },
    statistics: {
      ...state.statistics,
      maintenanceCompleted: state.statistics.maintenanceCompleted + 1,
    },
  };
  return addCollaboratorMasteryExperience(
    maintained,
    "equipment",
    COLLABORATOR_MASTERY_XP.equipmentMaintenance,
    now,
  );
}

function buyOfficialSword(state: GameState): GameState {
  if (state.school.euros < GAME_CONFIG.officialSwordCost) return state;
  return {
    ...state,
    school: {
      ...state.school,
      euros: state.school.euros - GAME_CONFIG.officialSwordCost,
    },
    equipment: synchronizeEquipmentAvailability({
      ...state.equipment,
      totalSwords: state.equipment.totalSwords + 1,
      availableSwords: state.equipment.availableSwords + 1,
    }),
  };
}

function markMessageRead(state: GameState, messageId: string): GameState {
  if (!state.messages.some((message) => message.id === messageId && message.unread)) return state;
  return {
    ...state,
    messages: state.messages.map((message) =>
      message.id === messageId ? { ...message, unread: false } : message,
    ),
  };
}

function markAllMessagesRead(state: GameState): GameState {
  if (!state.messages.some((message) => message.unread)) return state;
  return {
    ...state,
    messages: state.messages.map((message) => ({ ...message, unread: false })),
  };
}


function assignCollaborator(
  state: GameState,
  collaboratorId: string,
  assignment: CollaboratorAssignment,
  now: number,
): GameState {
  void now;
  return setCollaboratorAssignment(state, collaboratorId, assignment);
}

function toggleInstructorAutomation(
  state: GameState,
  collaboratorId: string,
  enabled: boolean,
): GameState {
  return setInstructorAutomation(state, collaboratorId, enabled);
}

function startFormTraining(
  state: GameState,
  personId: string,
  formId: FormId,
  now: number,
): GameState {
  return beginFormTraining(state, personId, formId, now, {
    addMessage,
    addCollaboratorMasteryExperience,
    recruitCollaborator,
  });
}

function resolveFormTraining(state: GameState, personId: string, now: number): GameState {
  return completeFormTraining(state, personId, now, {
    addMessage,
    addCollaboratorMasteryExperience,
    recruitCollaborator,
  });
}

function writeCharacters(
  state: GameState,
  amount: number,
  now: number,
  source: "manual" | "automation",
): GameState {
  const activeEmail = selectActiveEmail(state);
  if (!activeEmail || activeEmail.status !== "writing" || amount <= 0) return state;
  const buildLength = getEmailBuildLength(activeEmail);
  const revealedCharacters = Math.min(
    buildLength,
    activeEmail.revealedCharacters + amount,
  );
  const charactersWritten = revealedCharacters - activeEmail.revealedCharacters;
  const completed = revealedCharacters >= buildLength;
  return {
    ...state,
    emails: state.emails.map((email) =>
      email.id === activeEmail.id
        ? {
            ...email,
            revealedCharacters,
            status: completed ? "sending" : "writing",
            sendCompletesAt: completed ? now + GAME_CONFIG.sendDelayMs : undefined,
          }
        : email,
    ),
    statistics: {
      ...state.statistics,
      inputs: state.statistics.inputs + (source === "manual" ? 1 : 0),
      automatedCharacters:
        state.statistics.automatedCharacters +
        (source === "automation" ? charactersWritten : 0),
    },
  };
}








function processAutomation(state: GameState, now: number, gainMultiplier: number): GameState {
  return advanceAutomation(state, now, gainMultiplier, {
    addMessage,
    addCollaboratorMasteryExperience,
    writeCharacters,
    startNextCampaign,
    startFormTraining,
  });
}

function runSocialCampaign(state: GameState, now: number): GameState {
  return executeSocialCampaign(state, now, {
    addMessage,
    addCollaboratorMasteryExperience,
    writeCharacters,
    startNextCampaign,
    startFormTraining,
  });
}

function processAutomaticTeaching(state: GameState, now: number): GameState {
  return teachAutomatically(state, now, startFormTraining);
}

function tick(state: GameState, now: number, gainMultiplier: number): GameState {
  let nextState = processAutomation(state, now, gainMultiplier);

  for (const email of nextState.emails.slice()) {
    if (email.status === "sending" && (email.sendCompletesAt ?? Infinity) <= now) {
      nextState = finalizeEmail(nextState, email.id, now);
    }
  }
  for (const outcome of nextState.pendingEmailOutcomes.slice()) {
    if (outcome.resolvesAt <= now) nextState = resolveEmailOutcome(nextState, outcome, now);
  }
  for (const trial of nextState.scheduledTrials.slice()) {
    if (trial.status === "scheduled" && trial.resolvesAt <= now) {
      nextState = resolveTrial(nextState, trial, now, gainMultiplier);
    }
  }
  for (const event of nextState.acquisitionEvents.slice()) {
    if (event.status === "running" && event.resolvesAt <= now) {
      nextState = resolveAcquisitionEvent(nextState, event, now, gainMultiplier);
    }
  }
  for (const contact of nextState.contacts.slice()) {
    if (contact.training && contact.training.completesAt <= now) {
      nextState = resolveFormTraining(nextState, contact.id, now);
    }
  }
  for (const collaborator of nextState.collaborators.slice()) {
    if (collaborator.training && collaborator.training.completesAt <= now) {
      nextState = resolveFormTraining(nextState, collaborator.id, now);
    }
  }
  nextState = collectFees(nextState, now, gainMultiplier);
  nextState = processAutomaticTeaching(nextState, now);
  nextState = processNarrativeEvent(nextState, now, gainMultiplier);
  return notifyPrestigeOffer(nextState, now);
}

function write(state: GameState, now: number): GameState {
  return writeCharacters(state, state.player.writingPower, now, "manual");
}

function buyUpgrade(state: GameState, upgradeId: UpgradeId): GameState {
  const definition = getUpgradeDefinition(upgradeId);
  if (!definition) return state;
  const currentLevel = state.upgrades[upgradeId];
  if (
    currentLevel >= definition.maxLevel ||
    state.school.historicMembers < definition.requiredHistoricMembers
  ) {
    return state;
  }
  const cost = getUpgradeCost(definition, currentLevel, state.network.schools.length);
  if (state.school.euros < cost) return state;

  const upgrades = { ...state.upgrades, [upgradeId]: currentLevel + 1 };
  const previousUpgradeSwords = Math.floor(getUpgradeEffectTotal(state.upgrades, "totalSwords"));
  const upgradedSwords = Math.floor(getUpgradeEffectTotal(upgrades, "totalSwords"));
  const addedSwords = Math.max(0, upgradedSwords - previousUpgradeSwords);
  const totalSwords = state.equipment.totalSwords + addedSwords;
  const nextState: GameState = {
    ...state,
    school: { ...state.school, euros: state.school.euros - cost },
    upgrades,
    equipment: synchronizeEquipmentAvailability({
      ...state.equipment,
      totalSwords,
      availableSwords: state.equipment.availableSwords + addedSwords,
    }),
  };
  return {
    ...nextState,
    player: { ...nextState.player, writingPower: getWritingPower(nextState) },
  };
}


function updateProfileName(state: GameState, displayName: string): GameState {
  const normalizedName = displayName.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!normalizedName || normalizedName === state.profile.displayName) return state;

  return refreshWritingCampaignCopies({
    ...state,
    profile: { displayName: normalizedName },
  });
}

function processOfflinePassiveProgress(
  state: GameState,
  now: number,
  elapsedMs: number,
  rawElapsedMs: number,
): GameState {
  const automationMultiplier = 1 + getUpgradeEffectTotal(state.upgrades, "automationMultiplier");
  const socialMultiplier = 1 + getUpgradeEffectTotal(state.upgrades, "socialMultiplier");
  const socialProductivity = state.unlocks.social
    ? state.collaborators
        .filter((collaborator) => collaborator.assignment === "social")
        .reduce((total, collaborator) => total + getCollaboratorProductivity(collaborator), 0)
    : 0;
  const socialTotal = state.automation.socialBuffer +
    (elapsedMs / GAME_CONFIG.socialContactIntervalMs) *
      socialProductivity *
      socialMultiplier *
      automationMultiplier *
      GAME_CONFIG.offlineGainMultiplier;
  const socialContacts = Math.floor(socialTotal);
  const eurosEarned = Math.round(
    selectIncomePerMonth(state) *
      (elapsedMs / GAME_CONFIG.gameMonthMs) *
      GAME_CONFIG.offlineGainMultiplier *
      100,
  ) / 100;
  const shiftTraining = <T extends { training?: { startedAt: number; completesAt: number } }>(
    person: T,
  ): T => person.training
    ? {
        ...person,
        training: {
          ...person.training,
          startedAt: person.training.startedAt + rawElapsedMs,
          completesAt: person.training.completesAt + rawElapsedMs,
        },
      }
    : person;
  let nextState: GameState = {
    ...state,
    school: {
      ...state.school,
      euros: state.school.euros + eurosEarned,
      nextFeeAt: state.school.nextFeeAt + rawElapsedMs,
    },
    contacts: state.contacts.map(shiftTraining),
    collaborators: state.collaborators.map(shiftTraining),
    emails: state.emails.map((email) => email.sendCompletesAt
      ? { ...email, sendCompletesAt: email.sendCompletesAt + rawElapsedMs }
      : email),
    pendingEmailOutcomes: state.pendingEmailOutcomes.map((outcome) => ({
      ...outcome,
      resolvesAt: outcome.resolvesAt + rawElapsedMs,
    })),
    scheduledTrials: state.scheduledTrials.map((trial) => ({
      ...trial,
      startsAt: trial.startsAt + rawElapsedMs,
      resolvesAt: trial.resolvesAt + rawElapsedMs,
    })),
    acquisitionEvents: state.acquisitionEvents.map((event) => ({
      ...event,
      startedAt: event.startedAt + rawElapsedMs,
      resolvesAt: event.resolvesAt + rawElapsedMs,
    })),
    activities: { nextSparringAt: state.activities.nextSparringAt + rawElapsedMs },
    narrative: { ...state.narrative, nextEventAt: state.narrative.nextEventAt + rawElapsedMs },
    automation: {
      ...state.automation,
      lastProcessedAt: now,
      socialBuffer: socialTotal - socialContacts,
    },
    statistics: {
      ...state.statistics,
      eurosEarned: state.statistics.eurosEarned + eurosEarned,
    },
  };
  if (socialContacts <= 0) return nextState;
  const acquired = createAcquiredContacts(nextState, socialContacts, "social", now);
  nextState = {
    ...nextState,
    randomSeed: acquired.nextSeed,
    legendaryCollaborators: addLegendaryEncounters(
      nextState.legendaryCollaborators,
      acquired.contacts,
    ),
    contacts: [...nextState.contacts, ...acquired.contacts],
    statistics: {
      ...nextState.statistics,
      contactsAcquired: nextState.statistics.contactsAcquired + socialContacts,
      socialContacts: nextState.statistics.socialContacts + socialContacts,
    },
  };
  return addCollaboratorMasteryExperience(
    nextState,
    "social",
    socialContacts * COLLABORATOR_MASTERY_XP.socialContact,
    now,
  );
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  let nextState: GameState;
  switch (action.type) {
    case "WRITE":
      nextState = write(state, action.now);
      break;
    case "TICK":
      nextState = tick(state, action.now, action.gainMultiplier ?? 1);
      break;
    case "OFFLINE_PASSIVE_PROGRESS":
      nextState = processOfflinePassiveProgress(
        state,
        action.now,
        action.elapsedMs,
        action.rawElapsedMs,
      );
      break;
    case "REPLACE_STATE":
      nextState = action.state;
      break;
    case "ADMIN_ADD_CONTACTS": {
      const amount = Math.trunc(action.amount);
      if (!Number.isSafeInteger(amount) || amount === 0) {
        nextState = state;
        break;
      }
      if (amount > 0) {
        const acquired = createAcquiredContacts(state, amount, "event", state.lastSavedAt);
        nextState = startNextCampaign({
          ...state,
          randomSeed: acquired.nextSeed,
          legendaryCollaborators: addLegendaryEncounters(
            state.legendaryCollaborators,
            acquired.contacts,
          ),
          contacts: [...state.contacts, ...acquired.contacts],
        }, state.lastSavedAt);
        break;
      }
      let remaining = Math.abs(amount);
      const contacts = state.contacts.filter((contact) => {
        if (contact.status !== "available" || remaining === 0) return true;
        remaining -= 1;
        return false;
      });
      nextState = contacts.length === state.contacts.length
        ? state
        : { ...state, contacts };
      break;
    }
    case "ADMIN_ADD_MEMBERS": {
      const amount = Math.trunc(action.amount);
      if (!Number.isSafeInteger(amount) || amount === 0) {
        nextState = state;
        break;
      }
      const activeMembers = state.school.activeMembers + amount;
      const nextActiveMembers = Math.max(0, activeMembers);
      const historicMembers = amount > 0
        ? state.school.historicMembers + amount
        : state.school.historicMembers;
      if (!Number.isSafeInteger(nextActiveMembers) || !Number.isSafeInteger(historicMembers)) {
        nextState = state;
        break;
      }
      nextState = {
        ...state,
        school: {
          ...state.school,
          activeMembers: nextActiveMembers,
          peakActiveMembers: Math.max(state.school.peakActiveMembers, nextActiveMembers),
          historicMembers,
        },
        unlocks: {
          ...state.unlocks,
          upgrades: amount > 0 ? true : state.unlocks.upgrades,
          social: amount > 0 && nextActiveMembers >= 10
            ? true
            : state.unlocks.social,
          forms: amount > 0 ? true : state.unlocks.forms,
        },
      };
      break;
    }
    case "ADMIN_ADD_EUROS": {
      if (!Number.isFinite(action.amount) || action.amount === 0) {
        nextState = state;
        break;
      }
      const euros = Math.max(0, Math.round((state.school.euros + action.amount) * 100) / 100);
      nextState = Number.isFinite(euros)
        ? { ...state, school: { ...state.school, euros } }
        : state;
      break;
    }
    case "UPDATE_PROFILE_NAME":
      nextState = updateProfileName(state, action.displayName);
      break;
    case "FOUND_SCHOOL":
      nextState = foundSchool(state, action.details, action.now);
      break;
    case "BUY_UPGRADE":
      nextState = buyUpgrade(state, action.upgradeId);
      break;
    case "MARK_MESSAGE_READ":
      nextState = markMessageRead(state, action.messageId);
      break;
    case "MARK_ALL_MESSAGES_READ":
      nextState = markAllMessagesRead(state);
      break;
    case "MAINTAIN_EQUIPMENT":
      nextState = maintainEquipment(state, action.now);
      break;
    case "BUY_OFFICIAL_SWORD":
      nextState = buyOfficialSword(state);
      break;
    case "ASSIGN_COLLABORATOR":
      nextState = assignCollaborator(state, action.collaboratorId, action.assignment, action.now);
      break;
    case "TOGGLE_INSTRUCTOR_AUTOMATION":
      nextState = toggleInstructorAutomation(
        state,
        action.collaboratorId,
        action.enabled,
      );
      break;
    case "RUN_SOCIAL_CAMPAIGN":
      nextState = runSocialCampaign(state, action.now);
      break;
    case "START_FORM_TRAINING":
      nextState = startFormTraining(state, action.personId, action.formId, action.now);
      break;
    case "START_ACQUISITION_EVENT":
      nextState = startAcquisitionEvent(state, action.definitionId, action.now);
      break;
    default:
      nextState = state;
  }
  const now = "now" in action ? action.now : state.lastSavedAt;
  if (action.type === "OFFLINE_PASSIVE_PROGRESS") return nextState;
  const gainMultiplier = action.type === "TICK" ? (action.gainMultiplier ?? 1) : 1;
  return completeShortGoal(
    grantAchievements(nextState, now, gainMultiplier),
    now,
    gainMultiplier,
  );
}
