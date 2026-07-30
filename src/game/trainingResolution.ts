import {
  FORM_BRANCHES,
  getCollaboratorProductivity,
  getFormDefinition,
  getInstructorQualificationDuration,
  getTechnicianCourseDuration,
  isAgonistCourse,
} from "../content/forms";
import {
  getAgonistCourseMaximumStatGain,
  getTrainingExamSuccessChanceBonus,
} from "../content/upgrades";
import { getContactBaseStats } from "./athleteStats";
import { GAME_CONFIG } from "./config";
import { completeEquipmentUse, getPlannedEquipmentWear } from "./equipment";
import { nextRandom } from "./random";
import { getInstructorTeachingCounts } from "./runtimeIndexes";
import {
  getTrainingDurationMultiplier,
  getTrainingPhase,
  getTrainingTrack,
  scheduleTraining,
} from "./teacherTrainingFlow";
import type {
  Collaborator,
  Contact,
  FormBranch,
  FormTraining,
  GameState,
  InboxMessage,
} from "./types";

export interface TrainingFlowDependencies {
  addMessage: (
    state: GameState,
    now: number,
    subject: string,
    preview: string,
    tone?: InboxMessage["tone"],
    category?: NonNullable<InboxMessage["category"]>,
    threadKey?: InboxMessage["threadKey"],
  ) => GameState;
  recruitCollaborator: (state: GameState, contact: Contact, now: number) => GameState;
}

interface TrainingResolutionContext {
  state: GameState;
  contactsById: Map<string, Contact>;
  collaboratorsById: Map<string, Collaborator>;
  contactUpdates: Map<string, Contact>;
  collaboratorUpdates: Map<string, Collaborator>;
  teachingCounts: Map<string, number>;
  dependencies: TrainingFlowDependencies;
  now: number;
}

export function chooseFormBranchPreferences(seed: number): {
  preferences: FormBranch[];
  nextSeed: number;
} {
  const [countRoll, seedAfterCount] = nextRandom(seed);
  const count = countRoll < 0.65 ? 1 : countRoll < 0.95 ? 2 : 3;
  const [startRoll, nextSeed] = nextRandom(seedAfterCount);
  const start = Math.floor(startRoll * FORM_BRANCHES.length) % FORM_BRANCHES.length;
  return {
    preferences: Array.from(
      { length: count },
      (_, index) => FORM_BRANCHES[(start + index) % FORM_BRANCHES.length],
    ),
    nextSeed,
  };
}

function createContext(
  state: GameState,
  now: number,
  dependencies: TrainingFlowDependencies,
): TrainingResolutionContext {
  return {
    state,
    contactsById: new Map(state.contacts.map((contact) => [contact.id, contact])),
    collaboratorsById: new Map(
      state.collaborators.map((collaborator) => [collaborator.id, collaborator]),
    ),
    contactUpdates: new Map(),
    collaboratorUpdates: new Map(),
    teachingCounts: new Map(
      getInstructorTeachingCounts(state.contacts, state.collaborators),
    ),
    dependencies,
    now,
  };
}

function updateContact(context: TrainingResolutionContext, contact: Contact): void {
  context.contactsById.set(contact.id, contact);
  context.contactUpdates.set(contact.id, contact);
}

function updateCollaborator(
  context: TrainingResolutionContext,
  collaborator: Collaborator,
): void {
  context.collaboratorsById.set(collaborator.id, collaborator);
  context.collaboratorUpdates.set(collaborator.id, collaborator);
}

function materializeCollections(context: TrainingResolutionContext): void {
  if (context.contactUpdates.size === 0 && context.collaboratorUpdates.size === 0) return;
  context.state = {
    ...context.state,
    contacts: context.contactUpdates.size > 0
      ? context.state.contacts.map(
          (contact) => context.contactUpdates.get(contact.id) ?? contact,
        )
      : context.state.contacts,
    collaborators: context.collaboratorUpdates.size > 0
      ? context.state.collaborators.map(
          (collaborator) => context.collaboratorUpdates.get(collaborator.id) ?? collaborator,
        )
      : context.state.collaborators,
  };
  context.contactUpdates.clear();
  context.collaboratorUpdates.clear();
}

function rebuildIndexes(context: TrainingResolutionContext): void {
  context.contactsById = new Map(
    context.state.contacts.map((contact) => [contact.id, contact]),
  );
  context.collaboratorsById = new Map(
    context.state.collaborators.map((collaborator) => [collaborator.id, collaborator]),
  );
  context.teachingCounts = new Map(
    getInstructorTeachingCounts(context.state.contacts, context.state.collaborators),
  );
}

function getTeachingInstructorId(training: FormTraining | undefined): string | undefined {
  return training?.instructorId ?? training?.requestedInstructorId;
}

function transitionTeachingLoad(
  context: TrainingResolutionContext,
  previousTraining: FormTraining,
  nextTraining: FormTraining | undefined,
): void {
  const previousInstructorId = getTeachingInstructorId(previousTraining);
  const nextInstructorId = getTeachingInstructorId(nextTraining);
  if (previousInstructorId === nextInstructorId) return;
  if (previousInstructorId) {
    const nextCount = Math.max(0, (context.teachingCounts.get(previousInstructorId) ?? 0) - 1);
    if (nextCount === 0) context.teachingCounts.delete(previousInstructorId);
    else context.teachingCounts.set(previousInstructorId, nextCount);
  }
  if (nextInstructorId) {
    context.teachingCounts.set(
      nextInstructorId,
      (context.teachingCounts.get(nextInstructorId) ?? 0) + 1,
    );
  }
}

function replacePersonTraining(
  context: TrainingResolutionContext,
  personId: string,
  training: FormTraining | undefined,
): void {
  const contact = context.contactsById.get(personId);
  const collaborator = context.collaboratorsById.get(personId);
  if (contact) updateContact(context, { ...contact, training });
  if (collaborator) updateCollaborator(context, { ...collaborator, training });
}

function getExamFailureChance(
  state: GameState,
  training: FormTraining,
): number | undefined {
  const phase = getTrainingPhase(training);
  const baseFailureChance = phase === "athlete"
    ? 0.55
    : phase === "instructor"
      ? 0.5
      : phase === "technician"
        ? 0.45
        : undefined;
  if (baseFailureChance === undefined) return undefined;
  return Math.max(
    0,
    baseFailureChance - getTrainingExamSuccessChanceBonus(state.upgrades),
  );
}

function getFallbackTrainingBaseDuration(training: FormTraining): number {
  const definition = isAgonistCourse(training.formId)
    ? undefined
    : getFormDefinition(training.formId);
  if (!definition) return GAME_CONFIG.minimumTrainingDurationMs;
  const phase = getTrainingPhase(training);
  if (phase === "instructor") {
    return getInstructorQualificationDuration(definition.durationMs);
  }
  if (phase === "technician") {
    return getTechnicianCourseDuration(definition.durationMs);
  }
  return definition.durationMs;
}

function resolveHiddenExam(
  context: TrainingResolutionContext,
  personId: string,
  training: FormTraining,
): boolean {
  const failureChance = getExamFailureChance(context.state, training);
  if (failureChance === undefined) return true;
  const [roll, nextSeed] = nextRandom(context.state.randomSeed);
  context.state = { ...context.state, randomSeed: nextSeed };
  if (roll >= failureChance) return true;

  const baseDuration = training.trainingBaseDurationMs ??
    getFallbackTrainingBaseDuration(training);
  const durationMultiplier = getTrainingDurationMultiplier(
    context.state,
    personId,
    training,
    context.teachingCounts,
  );
  replacePersonTraining(context, personId, {
    ...training,
    completesAt: context.now + Math.max(
      GAME_CONFIG.minimumTrainingDurationMs,
      Math.round(baseDuration * 0.1 * durationMultiplier),
    ),
    examFailures: (training.examFailures ?? 0) + 1,
    trainingBaseDurationMs: baseDuration,
    trainingDurationMultiplier: durationMultiplier,
  });
  return false;
}

function resolveInstructorOrTechnicianPhase(
  context: TrainingResolutionContext,
  collaborator: Collaborator | undefined,
  personId: string,
  training: FormTraining,
): boolean {
  const phase = getTrainingPhase(training);
  if (phase !== "instructor" && phase !== "technician") return false;
  const definition = isAgonistCourse(training.formId)
    ? undefined
    : getFormDefinition(training.formId);
  if (!collaborator || !definition || isAgonistCourse(training.formId)) {
    replacePersonTraining(context, personId, undefined);
    transitionTeachingLoad(context, training, undefined);
    return true;
  }

  const updated: Collaborator = phase === "instructor"
    ? {
        ...collaborator,
        instructorForms: collaborator.instructorForms.includes(training.formId)
          ? collaborator.instructorForms
          : [...collaborator.instructorForms, training.formId],
        training: undefined,
      }
    : {
        ...collaborator,
        technicianForms: (collaborator.technicianForms ?? []).includes(training.formId)
          ? collaborator.technicianForms
          : [...(collaborator.technicianForms ?? []), training.formId],
        training: undefined,
      };
  updateCollaborator(context, updated);
  transitionTeachingLoad(context, training, undefined);
  context.state = context.dependencies.addMessage(
    context.state,
    context.now,
    phase === "instructor" ? "Corso Istruttori completato" : "Corso Tecnico completato",
    phase === "instructor"
      ? `${collaborator.displayName} ha ottenuto l'attestato per ${definition.longName}.`
      : `${collaborator.displayName} è ora Tecnico di ${definition.longName}.`,
    "positive",
    "other",
    "training",
  );
  return true;
}

function resolveAgonistCourse(
  context: TrainingResolutionContext,
  collaborator: Collaborator | undefined,
  member: Contact | undefined,
  training: FormTraining,
): boolean {
  if (!isAgonistCourse(training.formId)) return false;
  const athleteContact = collaborator
    ? context.contactsById.get(collaborator.contactId)
    : member;
  if (!athleteContact) return true;

  const completedEquipment = completeEquipmentUse(
    context.state.equipment,
    training.equipmentUsed ?? 0,
    getPlannedEquipmentWear(
      context.state.upgrades,
      (training.equipmentUsed ?? 0) * (training.wearPerSword ?? 0),
    ),
  );
  const grantsStats = training.agonistCourseGrantsStats ?? true;
  if (!grantsStats) {
    updateContact(context, {
      ...athleteContact,
      training: collaborator ? athleteContact.training : undefined,
    });
    if (collaborator) updateCollaborator(context, { ...collaborator, training: undefined });
    transitionTeachingLoad(context, training, undefined);
    context.state = { ...context.state, equipment: completedEquipment };
    return true;
  }

  const baseStats = getContactBaseStats(athleteContact);
  const maximumGain = getAgonistCourseMaximumStatGain(context.state.upgrades);
  const [arenaRoll, afterArena] = nextRandom(context.state.randomSeed);
  const [styleRoll, nextSeed] = nextRandom(afterArena);
  const slotsConsumed = Math.max(1, training.agonistCourseSlotsConsumed ?? 1);
  const arenaGain = (1 + Math.floor(arenaRoll * maximumGain)) * slotsConsumed;
  const styleGain = (1 + Math.floor(styleRoll * maximumGain)) * slotsConsumed;
  updateContact(context, {
    ...athleteContact,
    training: collaborator ? athleteContact.training : undefined,
    arenaBase: baseStats.arena + arenaGain,
    styleBase: baseStats.style + styleGain,
    agonistCourseCompletions: (athleteContact.agonistCourseCompletions ?? 0) + 1,
    agonistCourseArenaBonus:
      (athleteContact.agonistCourseArenaBonus ??
        athleteContact.agonistCourseCompletions ?? 0) + arenaGain,
    agonistCourseStyleBonus:
      (athleteContact.agonistCourseStyleBonus ??
        athleteContact.agonistCourseCompletions ?? 0) + styleGain,
  });
  if (collaborator) updateCollaborator(context, { ...collaborator, training: undefined });
  transitionTeachingLoad(context, training, undefined);
  context.state = {
    ...context.state,
    equipment: completedEquipment,
    randomSeed: nextSeed,
  };
  return true;
}

function recruitQualifiedMember(
  context: TrainingResolutionContext,
  contactId: string,
): void {
  materializeCollections(context);
  const contact = context.state.contacts.find((candidate) => candidate.id === contactId);
  if (!contact) return;
  context.state = context.dependencies.recruitCollaborator(
    context.state,
    contact,
    context.now,
  );
  rebuildIndexes(context);
}

function resolveTraining(
  context: TrainingResolutionContext,
  personId: string,
): void {
  const collaborator = context.collaboratorsById.get(personId);
  const member = context.contactsById.get(personId);
  const student = collaborator ?? member;
  const training = student?.training;
  if (
    !student ||
    !training ||
    training.status === "waitingForEquipment" ||
    training.completesAt > context.now
  ) return;

  if (!resolveHiddenExam(context, personId, training)) return;
  if (resolveInstructorOrTechnicianPhase(
    context,
    collaborator,
    personId,
    training,
  )) return;
  if (isAgonistCourse(training.formId)) {
    resolveAgonistCourse(context, collaborator, member, training);
    return;
  }

  const definition = getFormDefinition(training.formId);
  if (!definition || student.forms.includes(training.formId)) return;
  const completedForms = [...student.forms, training.formId];
  const preferenceResult = training.formId === "course-y" &&
      (student.formBranchPreferences?.length ?? 0) === 0
    ? chooseFormBranchPreferences(context.state.randomSeed)
    : {
        preferences: [...(student.formBranchPreferences ?? [])],
        nextSeed: context.state.randomSeed,
      };
  const combinedInstructorCourse = getTrainingTrack(training) === "combined-instructor";
  const instructorPhase = combinedInstructorCourse && collaborator
    ? scheduleTraining(
        context.state,
        collaborator.id,
        context.now,
        getInstructorQualificationDuration(definition.durationMs) /
          getCollaboratorProductivity(collaborator, "instructor"),
        {
          formId: training.formId,
          status: "running",
          equipmentUsed: 0,
          wearPerSword: 0,
          includesInstructorCertification: true,
          trainingTrack: "combined-instructor",
          trainingPhase: "instructor",
        },
        context.teachingCounts,
      )
    : undefined;

  if (member && !collaborator) {
    updateContact(context, {
      ...member,
      forms: completedForms,
      formBranchPreferences: preferenceResult.preferences,
      training: undefined,
    });
  }
  if (collaborator) {
    updateCollaborator(context, {
      ...collaborator,
      forms: completedForms,
      formBranchPreferences: preferenceResult.preferences,
      training: instructorPhase,
    });
  }
  transitionTeachingLoad(context, training, instructorPhase);
  context.state = {
    ...context.state,
    equipment: completeEquipmentUse(
      context.state.equipment,
      training.equipmentUsed ?? 0,
      getPlannedEquipmentWear(
        context.state.upgrades,
        (training.equipmentUsed ?? 0) * (training.wearPerSword ?? 0),
      ),
    ),
    randomSeed: preferenceResult.nextSeed,
    statistics: {
      ...context.state.statistics,
      formsCompleted: context.state.statistics.formsCompleted + 1,
    },
  };
  if (instructorPhase) return;

  context.state = context.dependencies.addMessage(
    context.state,
    context.now,
    training.instructorId
      ? "Riepilogo formazione automatica"
      : "Formazione completata",
    `${collaborator?.displayName ?? `${member?.firstName} ${member?.lastName}`} ha completato ${definition.longName}.`,
    "positive",
    "other",
    "training",
  );
  if (
    member &&
    !collaborator &&
    training.formId === "course-y" &&
    member.rarity === "ultra-rare"
  ) {
    recruitQualifiedMember(context, member.id);
  }
}

export function resolveFormTrainingBatch(
  state: GameState,
  personIds: readonly string[],
  now: number,
  dependencies: TrainingFlowDependencies,
): GameState {
  if (personIds.length === 0) return state;
  const context = createContext(state, now, dependencies);
  for (const personId of personIds) resolveTraining(context, personId);
  materializeCollections(context);
  return context.state;
}

export function resolveFormTraining(
  state: GameState,
  personId: string,
  now: number,
  dependencies: TrainingFlowDependencies,
): GameState {
  return resolveFormTrainingBatch(state, [personId], now, dependencies);
}
