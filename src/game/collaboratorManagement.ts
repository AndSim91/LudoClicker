import { COLLABORATOR_MASTERY_ROLES } from "../content/mastery";
import {
  getCollaboratorProductivity,
} from "../content/forms";
import { GAME_CONFIG } from "./config";
import { getInstructorTeachingCounts, getRunningAcquisitionEvents } from "./runtimeIndexes";
import type {
  Collaborator,
  CollaboratorManagementState,
  CollaboratorMasteryRole,
  CollaboratorPresetId,
  GameState,
} from "./types";

export const COLLABORATOR_PRESET_IDS: readonly CollaboratorPresetId[] = [
  "preset-1",
  "preset-2",
  "preset-3",
];

export function createEmptyCollaboratorTargets(): Record<CollaboratorMasteryRole, number> {
  return {
    writing: 0,
    events: 0,
    equipment: 0,
    instructor: 0,
  };
}

export function createInitialCollaboratorManagement(): CollaboratorManagementState {
  return {
    aggregateViewUnlocked: false,
    activePresetId: null,
    hasUnsavedChanges: false,
    targets: createEmptyCollaboratorTargets(),
    presets: {
      "preset-1": { saved: false, targets: createEmptyCollaboratorTargets() },
      "preset-2": { saved: false, targets: createEmptyCollaboratorTargets() },
      "preset-3": { saved: false, targets: createEmptyCollaboratorTargets() },
    },
  };
}

function sanitizeTarget(value: number): number {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value)))
    : 0;
}

export function sanitizeCollaboratorTargets(
  targets: Partial<Record<CollaboratorMasteryRole | "lessons", number>>,
): Record<CollaboratorMasteryRole, number> {
  const sanitized = COLLABORATOR_MASTERY_ROLES.reduce(
    (result, role) => {
      result[role] = sanitizeTarget(targets[role] ?? 0);
      return result;
    },
    createEmptyCollaboratorTargets(),
  );
  // Compatibilità con i preset creati quando Preparatore Atletico era un
  // settore separato: quelle persone confluiscono negli Istruttori.
  sanitized.instructor += sanitizeTarget(targets.lessons ?? 0);
  return sanitized;
}

export function getBusyCollaboratorIds(state: GameState): ReadonlySet<string> {
  const busyIds = new Set<string>();
  for (const event of getRunningAcquisitionEvents(state.acquisitionEvents)) {
    if (event.collaboratorId) busyIds.add(event.collaboratorId);
  }
  for (const collaborator of state.collaborators) {
    if (collaborator.training) busyIds.add(collaborator.id);
  }
  for (const instructorId of getInstructorTeachingCounts(
    state.contacts,
    state.collaborators,
  ).keys()) {
    busyIds.add(instructorId);
  }
  return busyIds;
}

export function getCollaboratorAssignmentCounts(
  state: GameState,
): Record<CollaboratorMasteryRole, number> {
  const counts = createEmptyCollaboratorTargets();
  for (const collaborator of state.collaborators) {
    if (collaborator.assignment) counts[collaborator.assignment] += 1;
  }
  return counts;
}

export function saveCollaboratorPreset(
  state: GameState,
  presetId: CollaboratorPresetId,
  targets: Record<CollaboratorMasteryRole, number>,
): GameState {
  if (!state.collaboratorManagement.aggregateViewUnlocked) return state;
  const nextState: GameState = {
    ...state,
    collaboratorManagement: {
      ...state.collaboratorManagement,
      activePresetId: presetId,
      hasUnsavedChanges: false,
      targets: sanitizeCollaboratorTargets(targets),
      presets: {
        ...state.collaboratorManagement.presets,
        [presetId]: {
          saved: true,
          targets: sanitizeCollaboratorTargets(targets),
        },
      },
    },
  };
  return reconcileCollaboratorManagement(nextState);
}

export function applyCollaboratorPreset(
  state: GameState,
  presetId: CollaboratorPresetId,
): GameState {
  if (
    !state.collaboratorManagement.aggregateViewUnlocked ||
    !state.collaboratorManagement.presets[presetId].saved
  ) return state;
  return reconcileCollaboratorManagement({
    ...state,
    collaboratorManagement: {
      ...state.collaboratorManagement,
      activePresetId: presetId,
      hasUnsavedChanges: false,
      targets: sanitizeCollaboratorTargets(
        state.collaboratorManagement.presets[presetId].targets,
      ),
    },
  });
}

function getInstructorCoverage(
  collaborators: GameState["collaborators"],
  excludedId?: string,
): Set<string> {
  return new Set(
    collaborators.flatMap((collaborator) =>
      collaborator.id !== excludedId && collaborator.assignment === "instructor"
        ? collaborator.instructorForms
        : []
    ),
  );
}

function compareInstructorSuitability(
  left: Collaborator,
  right: Collaborator,
  coveredForms: ReadonlySet<string>,
): number {
  const leftScore = getInstructorSuitabilityScore(left, coveredForms);
  const rightScore = getInstructorSuitabilityScore(right, coveredForms);
  for (let index = 0; index < leftScore.length; index += 1) {
    if (leftScore[index] !== rightScore[index]) {
      return rightScore[index] - leftScore[index];
    }
  }
  return left.joinedAt - right.joinedAt || left.id.localeCompare(right.id);
}

function getInstructorSuitabilityScore(
  collaborator: Collaborator,
  coveredForms: ReadonlySet<string>,
): readonly number[] {
  const newCoverage = collaborator.instructorForms.filter(
    (formId) => !coveredForms.has(formId),
  ).length;
  const certified = new Set(collaborator.instructorForms);
  const certifiableForms = collaborator.forms.filter(
    (formId) => !certified.has(formId),
  ).length;
  return [
    newCoverage,
    certifiableForms,
    collaborator.forms.length,
    collaborator.mastery?.instructor ?? 0,
    getCollaboratorProductivity(collaborator, "instructor"),
  ];
}

function compareRoleSuitability(
  left: Collaborator,
  right: Collaborator,
  role: CollaboratorMasteryRole,
  collaborators: GameState["collaborators"],
): number {
  if (role === "instructor") {
    return compareInstructorSuitability(
      left,
      right,
      getInstructorCoverage(collaborators),
    );
  }
  const productivityDifference =
    getCollaboratorProductivity(right, role) -
    getCollaboratorProductivity(left, role);
  return productivityDifference ||
    (right.mastery?.[role] ?? 0) - (left.mastery?.[role] ?? 0) ||
    left.joinedAt - right.joinedAt ||
    left.id.localeCompare(right.id);
}

function selectLeastEffectiveFreeCollaborator(
  collaborators: GameState["collaborators"],
  role: CollaboratorMasteryRole,
  busyIds: ReadonlySet<string>,
): Collaborator | undefined {
  const candidates = collaborators.filter(
    (collaborator) => collaborator.assignment === role && !busyIds.has(collaborator.id),
  );
  if (role === "instructor") {
    return candidates.sort((left, right) => {
      const leftScore = getInstructorSuitabilityScore(
        left,
        getInstructorCoverage(collaborators, left.id),
      );
      const rightScore = getInstructorSuitabilityScore(
        right,
        getInstructorCoverage(collaborators, right.id),
      );
      for (let index = 0; index < leftScore.length; index += 1) {
        if (leftScore[index] !== rightScore[index]) {
          return leftScore[index] - rightScore[index];
        }
      }
      return right.joinedAt - left.joinedAt || right.id.localeCompare(left.id);
    })[0];
  }
  return candidates.sort((left, right) =>
    compareRoleSuitability(right, left, role, collaborators)
  )[0];
}

function selectBestUnassignedCollaborator(
  collaborators: GameState["collaborators"],
  role: CollaboratorMasteryRole,
): Collaborator | undefined {
  return collaborators
    .filter((collaborator) => collaborator.assignment === null)
    .sort((left, right) =>
      compareRoleSuitability(left, right, role, collaborators)
    )[0];
}

function rebalanceTargets(state: GameState): GameState {
  if (!state.collaboratorManagement.aggregateViewUnlocked) return state;

  const busyIds = getBusyCollaboratorIds(state);
  const targets = sanitizeCollaboratorTargets(state.collaboratorManagement.targets);
  let collaborators = state.collaborators;
  let changed = false;

  // Prima rilascia soltanto persone libere dai settori sopra il target.
  // Chi sta lavorando conserva il settore finché l'attività non termina.
  for (const role of COLLABORATOR_MASTERY_ROLES) {
    let assignedCount = collaborators.filter(
      (collaborator) => collaborator.assignment === role,
    ).length;
    while (assignedCount > targets[role]) {
      const removable = selectLeastEffectiveFreeCollaborator(
        collaborators,
        role,
        busyIds,
      );
      if (!removable) break;
      collaborators = collaborators.map((collaborator) =>
        collaborator.id === removable.id
          ? { ...collaborator, assignment: null }
          : collaborator
      );
      assignedCount -= 1;
      changed = true;
    }
  }

  // Poi riempie i buchi usando esclusivamente collaboratori non assegnati.
  for (const role of COLLABORATOR_MASTERY_ROLES) {
    let assignedCount = collaborators.filter(
      (collaborator) => collaborator.assignment === role,
    ).length;
    while (assignedCount < targets[role]) {
      const selected = selectBestUnassignedCollaborator(collaborators, role);
      if (!selected) break;
      collaborators = collaborators.map((collaborator) =>
        collaborator.id === selected.id
          ? { ...collaborator, assignment: role }
          : collaborator
      );
      assignedCount += 1;
      changed = true;
    }
  }

  const targetsChanged = COLLABORATOR_MASTERY_ROLES.some(
    (role) => targets[role] !== state.collaboratorManagement.targets[role],
  );
  return changed || targetsChanged
    ? {
        ...state,
        collaborators,
        collaboratorManagement: {
          ...state.collaboratorManagement,
          targets,
        },
      }
    : state;
}

export function incrementCollaboratorAssignment(
  state: GameState,
  assignment: CollaboratorMasteryRole,
): GameState {
  if (
    !state.collaboratorManagement.aggregateViewUnlocked ||
    !state.collaborators.some((collaborator) => collaborator.assignment === null)
  ) return state;
  return rebalanceTargets({
    ...state,
    collaboratorManagement: {
      ...state.collaboratorManagement,
      activePresetId: null,
      hasUnsavedChanges: true,
      targets: {
        ...state.collaboratorManagement.targets,
        [assignment]: state.collaboratorManagement.targets[assignment] + 1,
      },
    },
  });
}

export function decrementCollaboratorAssignment(
  state: GameState,
  assignment: CollaboratorMasteryRole,
): GameState {
  if (
    !state.collaboratorManagement.aggregateViewUnlocked ||
    state.collaboratorManagement.targets[assignment] <= 0
  ) return state;
  return rebalanceTargets({
    ...state,
    collaboratorManagement: {
      ...state.collaboratorManagement,
      activePresetId: null,
      hasUnsavedChanges: true,
      targets: {
        ...state.collaboratorManagement.targets,
        [assignment]: state.collaboratorManagement.targets[assignment] - 1,
      },
    },
  });
}

export function reconcileCollaboratorManagement(state: GameState): GameState {
  const shouldUnlock = state.collaboratorManagement.aggregateViewUnlocked ||
    state.collaborators.length >= GAME_CONFIG.collaboratorAggregateUnlockCount;
  const unlockedNow = shouldUnlock &&
    !state.collaboratorManagement.aggregateViewUnlocked;
  const unlockedState = !unlockedNow
    ? state
    : {
        ...state,
        collaboratorManagement: {
          ...state.collaboratorManagement,
          aggregateViewUnlocked: true,
          targets: getCollaboratorAssignmentCounts(state),
        },
      };
  return rebalanceTargets(unlockedState);
}
