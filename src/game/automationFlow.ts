import {
  canTrainForm,
  getCollaboratorProductivity,
  getFormDefinition,
  getStudentFormCost,
  isInstructorForm,
} from "../content/forms";
import { COLLABORATOR_MASTERY_XP } from "../content/mastery";
import { getUpgradeEffectTotal } from "../content/upgrades";
import { getSchoolYear, isSummerBreak } from "./calendar";
import { GAME_CONFIG } from "./config";
import {
  addLegendaryEncounters,
  createAcquiredContacts,
} from "./contacts";
import { synchronizeEquipmentAvailability } from "./equipment";
import { nextRandom } from "./random";
import { selectActiveEmail, selectInstructorCapacity } from "./selectors";
import { getInstructorTeachingCounts } from "./runtimeIndexes";
import { getAutomaticFormCandidates } from "./trainingFlow";
import type {
  CollaboratorAssignment,
  FormId,
  GameState,
  InboxMessage,
} from "./types";

export interface AutomationFlowDependencies {
  addMessage: (
    state: GameState,
    now: number,
    subject: string,
    preview: string,
    tone?: InboxMessage["tone"],
    category?: NonNullable<InboxMessage["category"]>,
    threadKey?: InboxMessage["threadKey"],
  ) => GameState;
  addCollaboratorMasteryExperience: (
    state: GameState,
    role: CollaboratorAssignment,
    amount: number,
    now: number,
  ) => GameState;
  writeCharacters: (
    state: GameState,
    amount: number,
    now: number,
    source: "manual" | "automation",
  ) => GameState;
  startNextCampaign: (state: GameState, now: number) => GameState;
  startFormTraining: (state: GameState, personId: string, formId: FormId, now: number) => GameState;
}

interface AutomaticTeachingNoOp {
  currentMonth: number;
  euros: number;
  upgrades: GameState["upgrades"];
  formsUnlocked: boolean;
}

const automaticTeachingNoOpCache = new WeakMap<
  GameState["contacts"],
  WeakMap<GameState["collaborators"], AutomaticTeachingNoOp>
>();

function wasAutomaticTeachingNoOp(state: GameState): boolean {
  const cached = automaticTeachingNoOpCache
    .get(state.contacts)
    ?.get(state.collaborators);
  return Boolean(
    cached &&
    cached.currentMonth === state.school.currentMonth &&
    cached.euros === state.school.euros &&
    cached.upgrades === state.upgrades &&
    cached.formsUnlocked === state.unlocks.forms
  );
}

function rememberAutomaticTeachingNoOp(state: GameState): void {
  let byCollaborators = automaticTeachingNoOpCache.get(state.contacts);
  if (!byCollaborators) {
    byCollaborators = new WeakMap();
    automaticTeachingNoOpCache.set(state.contacts, byCollaborators);
  }
  byCollaborators.set(state.collaborators, {
    currentMonth: state.school.currentMonth,
    euros: state.school.euros,
    upgrades: state.upgrades,
    formsUnlocked: state.unlocks.forms,
  });
}

export function processAutomation(
  state: GameState,
  now: number,
  gainMultiplier: number,
  dependencies: AutomationFlowDependencies,
): GameState {
  const elapsedMs = Math.min(1_000, Math.max(0, now - state.automation.lastProcessedAt));
  if (elapsedMs <= 0) return state;

  let writingProductivity = 0;
  let socialProductivity = 0;
  let equipmentProductivity = 0;
  for (const collaborator of state.collaborators) {
    if (collaborator.assignment === "writing") {
      writingProductivity += getCollaboratorProductivity(collaborator);
    } else if (collaborator.assignment === "social" && state.unlocks.social) {
      socialProductivity += getCollaboratorProductivity(collaborator);
    } else if (collaborator.assignment === "equipment") {
      equipmentProductivity += getCollaboratorProductivity(collaborator);
    }
  }
  const wasWriting = selectActiveEmail(state)?.status === "writing";
  const automationMultiplier =
    1 + getUpgradeEffectTotal(state.upgrades, "automationMultiplier");
  const socialMultiplier = 1 + getUpgradeEffectTotal(state.upgrades, "socialMultiplier");

  const writingTotal =
    state.automation.writingBuffer +
    (elapsedMs / 1_000) *
      writingProductivity *
      GAME_CONFIG.collaboratorWritingPerSecond *
      state.player.writingPower *
      automationMultiplier;
  const automatedCharacters = Math.floor(writingTotal);
  const socialTotal =
    state.automation.socialBuffer +
    (elapsedMs / GAME_CONFIG.socialContactIntervalMs) *
      socialProductivity *
      socialMultiplier *
      automationMultiplier *
      Math.max(0, gainMultiplier);
  const socialContacts = Math.floor(socialTotal);
  const equipmentTotal =
    state.automation.equipmentBuffer +
    (elapsedMs / GAME_CONFIG.equipmentRepairIntervalMs) *
      equipmentProductivity *
      automationMultiplier;
  const repairedWear = Math.floor(equipmentTotal);

  let nextState: GameState = {
    ...state,
    automation: {
      ...state.automation,
      lastProcessedAt: now,
      writingBuffer: writingTotal - automatedCharacters,
      socialBuffer: socialTotal - socialContacts,
      equipmentBuffer: equipmentTotal - repairedWear,
    },
    equipment: synchronizeEquipmentAvailability({
      ...state.equipment,
      wear: Math.max(0, state.equipment.wear - repairedWear),
    }),
  };

  if (repairedWear > 0) {
    nextState = dependencies.addCollaboratorMasteryExperience(
      nextState,
      "equipment",
      repairedWear * COLLABORATOR_MASTERY_XP.equipmentRepairPoint,
      now,
    );
  }

  if (automatedCharacters > 0) {
    nextState = dependencies.writeCharacters(nextState, automatedCharacters, now, "automation");
    if (wasWriting) {
      nextState = dependencies.addCollaboratorMasteryExperience(
        nextState,
        "writing",
        (elapsedMs / 1_000) * COLLABORATOR_MASTERY_XP.writingPerSecond,
        now,
      );
    }
  }

  if (socialContacts > 0) {
    const acquired = createAcquiredContacts(nextState, socialContacts, "social", now);
    const contacts = acquired.contacts;
    nextState = {
      ...nextState,
      randomSeed: acquired.nextSeed,
      legendaryCollaborators: addLegendaryEncounters(
        nextState.legendaryCollaborators,
        contacts,
      ),
      contacts: [...nextState.contacts, ...contacts],
      statistics: {
        ...nextState.statistics,
        contactsAcquired: nextState.statistics.contactsAcquired + contacts.length,
        socialContacts: nextState.statistics.socialContacts + contacts.length,
      },
    };
    nextState = dependencies.addMessage(
      nextState,
      now,
      "Nuovi contatti dai Social",
      `${contacts.length} nuovi indirizzi sono stati raccolti dalle attività online.`,
      "positive",
      "other",
      "contacts",
    );
    nextState = dependencies.addCollaboratorMasteryExperience(
      nextState,
      "social",
      contacts.length * COLLABORATOR_MASTERY_XP.socialContact,
      now,
    );
    nextState = dependencies.startNextCampaign(nextState, now);
  }

  return nextState;
}

export function runSocialCampaign(
  state: GameState,
  now: number,
  dependencies: AutomationFlowDependencies,
): GameState {
  if (!state.unlocks.social || state.school.euros < GAME_CONFIG.socialCampaignCost) {
    return state;
  }
  const [viralRoll, nextSeed] = nextRandom(state.randomSeed);
  const viral = viralRoll < GAME_CONFIG.socialViralChance;
  const contactCount = Math.max(
    1,
    Math.round(
      GAME_CONFIG.socialCampaignContacts *
        (viral ? 3 : 1) *
        (1 + getUpgradeEffectTotal(state.upgrades, "socialMultiplier")),
    ),
  );
  const acquired = createAcquiredContacts(
    { ...state, randomSeed: nextSeed },
    contactCount,
    "social",
    now,
  );
  const contacts = acquired.contacts;
  let nextState: GameState = {
    ...state,
    randomSeed: acquired.nextSeed,
    legendaryCollaborators: addLegendaryEncounters(state.legendaryCollaborators, contacts),
    school: {
      ...state.school,
      euros: state.school.euros - GAME_CONFIG.socialCampaignCost,
    },
    contacts: [...state.contacts, ...contacts],
    statistics: {
      ...state.statistics,
      contactsAcquired: state.statistics.contactsAcquired + contacts.length,
      socialContacts: state.statistics.socialContacts + contacts.length,
      socialCampaigns: state.statistics.socialCampaigns + 1,
    },
  };
  nextState = dependencies.addCollaboratorMasteryExperience(
    nextState,
    "social",
    contacts.length * COLLABORATOR_MASTERY_XP.socialContact,
    now,
  );
  nextState = dependencies.addMessage(
    nextState,
    now,
    viral ? "Post inspiegabilmente virale" : "Campagna Social completata",
    `${contacts.length} nuovi indirizzi sono disponibili per la campagna email.`,
    "positive",
    "other",
    "contacts",
  );
  return dependencies.startNextCampaign(nextState, now);
}

export function processAutomaticTeaching(
  state: GameState,
  now: number,
  startFormTraining: AutomationFlowDependencies["startFormTraining"],
): GameState {
  if (isSummerBreak(state.school.currentMonth)) return state;
  if (wasAutomaticTeachingNoOp(state)) return state;
  const currentYear = getSchoolYear(state.school.currentMonth);
  let nextState = state;

  const collaboratorContactIds = new Set(
    state.collaborators.map((collaborator) => collaborator.contactId),
  );
  const students = [
    ...state.contacts.filter((contact) =>
      contact.status === "enrolled" &&
      !collaboratorContactIds.has(contact.id) &&
      !contact.training &&
      contact.lastFormTrainingYear !== currentYear
    ),
    ...state.collaborators.filter((collaborator) =>
      collaborator.assignment !== "instructor" &&
      !collaborator.training &&
      collaborator.lastFormTrainingYear !== currentYear
    ),
  ].sort((left, right) =>
    left.forms.length - right.forms.length ||
    ("acquiredAt" in left ? left.acquiredAt : left.joinedAt) -
      ("acquiredAt" in right ? right.acquiredAt : right.joinedAt)
  );
  const capacity = selectInstructorCapacity(state);
  const instructorLoads = new Map(
    getInstructorTeachingCounts(state.contacts, state.collaborators),
  );
  const instructorsByForm = new Map<FormId, GameState["collaborators"]>();
  for (const instructor of state.collaborators) {
    if (
      instructor.assignment !== "instructor" ||
      instructor.autoTeachingEnabled === false ||
      instructor.training
    ) continue;
    for (const formId of instructor.forms) {
      if (isInstructorForm(formId) && !instructor.instructorForms.includes(formId)) continue;
      const instructors = instructorsByForm.get(formId);
      if (instructors) instructors.push(instructor);
      else instructorsByForm.set(formId, [instructor]);
    }
  }

  for (const student of students) {
    const candidate = getAutomaticFormCandidates(student).find((formId) => {
      const definition = getFormDefinition(formId);
      const instructor = instructorsByForm.get(formId)?.find(
        (available) =>
          available.id !== student.id &&
          (instructorLoads.get(available.id) ?? 0) < capacity,
      );
      return Boolean(
        definition &&
        canTrainForm(student, definition, currentYear) &&
        instructor &&
        nextState.school.euros >= getStudentFormCost(definition.cost)
      );
    });
    if (!candidate) continue;

    const beforeEuros = nextState.school.euros;
    const startedState = startFormTraining(nextState, student.id, candidate, now);
    nextState = startedState;
    if (nextState.school.euros >= beforeEuros) continue;

    const startedStudent = "acquiredAt" in student
      ? nextState.contacts.find((contact) => contact.id === student.id)
      : nextState.collaborators.find((collaborator) => collaborator.id === student.id);
    const instructorId = startedStudent?.training?.instructorId;
    if (instructorId) {
      instructorLoads.set(instructorId, (instructorLoads.get(instructorId) ?? 0) + 1);
    }
  }

  if (nextState === state) rememberAutomaticTeachingNoOp(state);
  return nextState;
}
