import {
  BRANCH_FORM_IDS,
  FORM_BRANCHES,
  canTrainForm,
  getCollaboratorProductivity,
  getFormDefinition,
  getInstructorFormCost,
  getInstructorQualificationCost,
  getStudentFormCost,
  isInstructorForm,
} from "../content/forms";
import { COLLABORATOR_MASTERY_XP } from "../content/mastery";
import { getSchoolYear, isSummerBreak } from "./calendar";
import { nextRandom } from "./random";
import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import { selectAvailableInstructor, selectInstructorTeachingCount } from "./selectors";
import type {
  CollaboratorAssignment,
  Contact,
  FormBranch,
  FormId,
  GameState,
  InboxMessage,
} from "./types";

const euroFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

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
  addCollaboratorMasteryExperience: (
    state: GameState,
    role: CollaboratorAssignment,
    amount: number,
    now: number,
  ) => GameState;
  recruitCollaborator: (state: GameState, contact: Contact, now: number) => GameState;
}

export function assignCollaborator(
  state: GameState,
  collaboratorId: string,
  assignment: CollaboratorAssignment,
): GameState {
  if (assignment === "social" && !state.unlocks.social) return state;
  const collaborator = state.collaborators.find((candidate) => candidate.id === collaboratorId);
  if (!collaborator) return state;
  return {
    ...state,
    collaborators: state.collaborators.map((candidate) =>
      candidate.id === collaboratorId ? { ...candidate, assignment } : candidate,
    ),
  };
}

export function toggleInstructorAutomation(
  state: GameState,
  collaboratorId: string,
  enabled: boolean,
): GameState {
  return {
    ...state,
    collaborators: state.collaborators.map((candidate) =>
      candidate.id === collaboratorId
        ? { ...candidate, autoTeachingEnabled: enabled }
        : candidate,
    ),
  };
}

export function startFormTraining(
  state: GameState,
  personId: string,
  formId: FormId,
  now: number,
  dependencies: TrainingFlowDependencies,
): GameState {
  if (!state.unlocks.forms) return state;
  if (isSummerBreak(state.school.currentMonth)) return state;
  const collaborator = state.collaborators.find((candidate) => candidate.id === personId);
  const member = state.contacts.find((candidate) =>
    candidate.id === personId &&
    candidate.status === "enrolled" &&
    !state.collaborators.some((existing) => existing.contactId === candidate.id),
  );
  const student = collaborator ?? member;
  const definition = getFormDefinition(formId);
  const currentYear = getSchoolYear(state.school.currentMonth);
  const qualificationOnly = Boolean(
    collaborator?.assignment === "instructor" &&
    collaborator.forms.includes(formId) &&
    isInstructorForm(formId) &&
    !collaborator.instructorForms.includes(formId),
  );
  if (qualificationOnly && collaborator && definition) {
    const qualificationCost = getInstructorQualificationCost(definition.cost);
    if (collaborator.training || state.school.euros < qualificationCost) return state;
    return dependencies.addMessage(
      {
        ...state,
        school: {
          ...state.school,
          euros: roundCurrency(state.school.euros - qualificationCost),
        },
        collaborators: state.collaborators.map((candidate) =>
          candidate.id === collaborator.id
            ? { ...candidate, instructorForms: [...candidate.instructorForms, formId] }
            : candidate,
        ),
      },
      now,
      "Qualifica da Istruttore ottenuta",
      `${collaborator.displayName} ora può insegnare ${definition.title}${definition.branch ? ` — ${definition.branch}` : ""}. Costo: ${euroFormatter.format(qualificationCost)}.`,
      "positive",
      "other",
      "training",
    );
  }
  const instructorSelf = collaborator?.assignment === "instructor";
  const instructorTrack = Boolean(instructorSelf && isInstructorForm(formId));
  const instructor = !instructorSelf
    ? selectAvailableInstructor(state, formId, personId)
    : undefined;
  const trainingInstructor = instructor ?? (instructorSelf ? collaborator : undefined);
  const trainingCost = instructorTrack
    ? getInstructorFormCost(definition?.cost ?? 0)
    : collaborator?.assignment === "instructor"
      ? definition?.cost ?? 0
      : instructor
        ? getStudentFormCost(definition?.cost ?? 0)
        : definition?.cost ?? 0;
  const branchCapacity = collaborator?.assignment === "instructor"
    ? Math.min(3, 1 + (state.upgrades["instructor-versatility"] ?? 0))
    : undefined;
  const instructorLearnedBranches = new Set(
    collaborator?.forms.flatMap((learnedFormId) => {
      const branch = getFormDefinition(learnedFormId)?.branch;
      return branch ? [branch] : [];
    }) ?? [],
  );
  const initialBranchCompatible = !definition?.branch ||
    instructorLearnedBranches.size > 0 ||
    !collaborator?.formBranchPreferences?.length ||
    collaborator.formBranchPreferences.includes(definition.branch);
  if (
    !student ||
    !definition ||
    !canTrainForm(
      student,
      definition,
      currentYear,
      branchCapacity,
      collaborator?.assignment !== "instructor",
    ) ||
    !initialBranchCompatible ||
    (instructorSelf && selectInstructorTeachingCount(state, personId) > 0) ||
    state.school.euros < trainingCost
  ) return state;
  const trainingSpeed = trainingInstructor
    ? getCollaboratorProductivity(trainingInstructor, "instructor")
    : 1;
  const training = {
    formId,
    startedAt: now,
    completesAt: now + Math.max(
      GAME_CONFIG.minimumTrainingDurationMs,
      Math.round(definition.durationMs / trainingSpeed),
    ),
    instructorId: instructor?.id,
    includesInstructorCertification: instructorTrack || undefined,
  };
  return {
    ...state,
    school: {
      ...state.school,
      euros: roundCurrency(state.school.euros - trainingCost),
    },
    contacts: member
      ? state.contacts.map((candidate) => candidate.id === member.id
        ? { ...candidate, training, lastFormTrainingYear: currentYear }
        : candidate)
      : state.contacts,
    collaborators: collaborator
      ? state.collaborators.map((candidate) => candidate.id === collaborator.id
        ? { ...candidate, training, lastFormTrainingYear: currentYear }
        : candidate)
      : state.collaborators,
  };
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

export function resolveFormTraining(
  state: GameState,
  personId: string,
  now: number,
  dependencies: TrainingFlowDependencies,
): GameState {
  const collaborator = state.collaborators.find((candidate) => candidate.id === personId);
  const member = state.contacts.find((candidate) => candidate.id === personId);
  const student = collaborator ?? member;
  if (!student?.training || student.training.completesAt > now) return state;
  const completedFormId = student.training.formId;
  const definition = getFormDefinition(completedFormId);
  if (!definition) return state;
  const completedForms = [...student.forms, completedFormId];
  const preferenceResult = completedFormId === "course-y" &&
      (student.formBranchPreferences?.length ?? 0) === 0
    ? chooseFormBranchPreferences(state.randomSeed)
    : {
        preferences: [...(student.formBranchPreferences ?? [])],
        nextSeed: state.randomSeed,
      };
  let nextState: GameState = {
    ...state,
    randomSeed: preferenceResult.nextSeed,
    contacts: member && !collaborator
      ? state.contacts.map((candidate) => candidate.id === member.id
        ? {
            ...candidate,
            forms: completedForms,
            formBranchPreferences: preferenceResult.preferences,
            training: undefined,
          }
        : candidate)
      : state.contacts,
    collaborators: collaborator
      ? state.collaborators.map((candidate) => candidate.id === collaborator.id
        ? {
            ...candidate,
            forms: completedForms,
            formBranchPreferences: preferenceResult.preferences,
            instructorForms: student.training?.includesInstructorCertification
              ? [...candidate.instructorForms, completedFormId]
              : candidate.instructorForms,
            training: undefined,
          }
        : candidate)
      : state.collaborators,
    statistics: {
      ...state.statistics,
      formsCompleted: state.statistics.formsCompleted + 1,
    },
  };
  if (student.training.instructorId) {
    nextState = dependencies.addCollaboratorMasteryExperience(
      nextState,
      "instructor",
      COLLABORATOR_MASTERY_XP.instructorTraining,
      now,
    );
  }
  nextState = dependencies.addMessage(
    nextState,
    now,
    student.training.instructorId
      ? "Riepilogo formazione automatica"
      : "Formazione completata",
    `${collaborator?.displayName ?? `${member?.firstName} ${member?.lastName}`} ha completato ${definition.title}${definition.branch ? ` — ${definition.branch}` : ""}.`,
    "positive",
    "other",
    "training",
  );
  if (
    !member ||
    collaborator ||
    completedFormId !== "course-y" ||
    member.rarity !== "ultra-rare"
  ) return nextState;
  const qualifiedMember = nextState.contacts.find((contact) => contact.id === member.id);
  return qualifiedMember
    ? dependencies.recruitCollaborator(nextState, qualifiedMember, now)
    : nextState;
}

export function getAutomaticFormCandidates(student: {
  forms: FormId[];
  formBranchPreferences?: FormBranch[];
}): FormId[] {
  const core: FormId[] = ["form-1", "course-x", "form-2", "course-y"];
  const nextCore = core.find((formId) => !student.forms.includes(formId));
  if (nextCore) return [nextCore];

  const completedFormFive = (["form-5-long", "form-5-staff", "form-5-double"] as FormId[])
    .some((formId) => student.forms.includes(formId));
  if (completedFormFive && !student.forms.includes("form-6")) return ["form-6"];
  if (completedFormFive && !student.forms.includes("form-7")) return ["form-7"];

  const preferredBranches = student.formBranchPreferences ?? [];
  const orderedBranches = preferredBranches.slice().sort((left, right) => {
    const startedLeft = BRANCH_FORM_IDS[left].some((formId) => student.forms.includes(formId));
    const startedRight = BRANCH_FORM_IDS[right].some((formId) => student.forms.includes(formId));
    return Number(startedRight) - Number(startedLeft);
  });
  return orderedBranches.flatMap((branch) => {
    const nextForm = BRANCH_FORM_IDS[branch].find((formId) => !student.forms.includes(formId));
    return nextForm ? [nextForm] : [];
  });
}
