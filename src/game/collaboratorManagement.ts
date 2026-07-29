import { COLLABORATOR_MASTERY_ROLES } from "../content/mastery";
import {
  getCollaboratorProductivity,
  getVisibleForms,
} from "../content/forms";
import {
  getUpgradeEffectTotal,
  isCourseXUnlocked,
  isOperationalPrioritiesUnlocked,
} from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import { getInstructorTeachingCounts, getRunningAcquisitionEvents } from "./runtimeIndexes";
import type {
  Collaborator,
  CollaboratorManagementState,
  CollaboratorMasteryRole,
  GameState,
} from "./types";

export function createEmptyCollaboratorTargets(): Record<CollaboratorMasteryRole, number> {
  return {
    writing: 0,
    events: 0,
    equipment: 0,
    instructor: 0,
    gadget: 0,
  };
}

export function createInitialCollaboratorManagement(): CollaboratorManagementState {
  return {
    aggregateViewUnlocked: false,
    targets: createEmptyCollaboratorTargets(),
    operationalPriorities: ["writing", "events", "equipment", "instructor", "gadget"],
    fallbackAssignments: {},
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
  // Compatibilità con le vecchie configurazioni in cui Preparatore Atletico
  // era un settore separato: quelle persone confluiscono negli Istruttori.
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

function getInstructorCoverage(
  collaborators: GameState["collaborators"],
  excludedId?: string,
  courseXUnlocked = true,
): Set<string> {
  return new Set(
    collaborators.flatMap((collaborator) =>
      collaborator.id !== excludedId && collaborator.assignment === "instructor"
        ? getVisibleForms(collaborator.instructorForms, courseXUnlocked)
        : []
    ),
  );
}

function compareInstructorSuitability(
  left: Collaborator,
  right: Collaborator,
  coveredForms: ReadonlySet<string>,
  courseXUnlocked: boolean,
): number {
  const leftScore = getInstructorSuitabilityScore(left, coveredForms, courseXUnlocked);
  const rightScore = getInstructorSuitabilityScore(right, coveredForms, courseXUnlocked);
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
  courseXUnlocked: boolean,
): readonly number[] {
  const instructorForms = getVisibleForms(collaborator.instructorForms, courseXUnlocked);
  const forms = getVisibleForms(collaborator.forms, courseXUnlocked);
  const newCoverage = instructorForms.filter(
    (formId) => !coveredForms.has(formId),
  ).length;
  const certified = new Set(instructorForms);
  const certifiableForms = forms.filter(
    (formId) => !certified.has(formId),
  ).length;
  return [
    newCoverage,
    certifiableForms,
    forms.length,
    collaborator.mastery?.instructor ?? 0,
    getCollaboratorProductivity(collaborator, "instructor"),
  ];
}

function compareRoleSuitability(
  left: Collaborator,
  right: Collaborator,
  role: CollaboratorMasteryRole,
  collaborators: GameState["collaborators"],
  courseXUnlocked: boolean,
): number {
  if (role === "instructor") {
    return compareInstructorSuitability(
      left,
      right,
      getInstructorCoverage(collaborators, undefined, courseXUnlocked),
      courseXUnlocked,
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

function selectLeastEffectiveCollaborator(
  collaborators: GameState["collaborators"],
  role: CollaboratorMasteryRole,
  courseXUnlocked: boolean,
  eligibleIds?: ReadonlySet<string>,
): Collaborator | undefined {
  const candidates = collaborators.filter(
    (collaborator) =>
      collaborator.assignment === role &&
      (!eligibleIds || eligibleIds.has(collaborator.id)),
  );
  if (role === "instructor") {
    return candidates.sort((left, right) => {
      const leftScore = getInstructorSuitabilityScore(
        left,
        getInstructorCoverage(collaborators, left.id, courseXUnlocked),
        courseXUnlocked,
      );
      const rightScore = getInstructorSuitabilityScore(
        right,
        getInstructorCoverage(collaborators, right.id, courseXUnlocked),
        courseXUnlocked,
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
    compareRoleSuitability(right, left, role, collaborators, courseXUnlocked)
  )[0];
}

export function getInstructorPendingReleaseIds(
  state: GameState,
): ReadonlySet<string> {
  if (!state.collaboratorManagement.aggregateViewUnlocked) return new Set();

  const instructorTarget = sanitizeTarget(
    state.collaboratorManagement.targets.instructor,
  );
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const pendingIds = new Set<string>();
  let collaborators = state.collaborators;
  let assignedCount = collaborators.filter(
    (collaborator) => collaborator.assignment === "instructor",
  ).length;
  while (assignedCount > instructorTarget) {
    const removable = selectLeastEffectiveCollaborator(
      collaborators,
      "instructor",
      courseXUnlocked,
    );
    if (!removable) break;
    pendingIds.add(removable.id);
    collaborators = collaborators.map((collaborator) =>
      collaborator.id === removable.id
        ? { ...collaborator, assignment: null }
        : collaborator
    );
    assignedCount -= 1;
  }

  return pendingIds;
}

function cancelPendingWaitingTrainings(
  state: GameState,
  pendingReleaseIds: ReadonlySet<string>,
): GameState {
  if (pendingReleaseIds.size === 0) return state;
  const shouldCancel = (
    personId: string,
    training: GameState["contacts"][number]["training"],
  ) =>
    training?.status === "waitingForEquipment" &&
    (
      pendingReleaseIds.has(personId) ||
      pendingReleaseIds.has(
        training.instructorId ?? training.requestedInstructorId ?? "",
      )
    );
  const contacts = state.contacts.map((contact) =>
    shouldCancel(contact.id, contact.training)
      ? { ...contact, training: undefined }
      : contact
  );
  const collaborators = state.collaborators.map((collaborator) =>
    shouldCancel(collaborator.id, collaborator.training)
      ? { ...collaborator, training: undefined }
      : collaborator
  );
  const changed = contacts.some(
    (contact, index) => contact !== state.contacts[index],
  ) || collaborators.some(
    (collaborator, index) => collaborator !== state.collaborators[index],
  );
  return changed ? { ...state, contacts, collaborators } : state;
}

function selectBestUnassignedCollaborator(
  collaborators: GameState["collaborators"],
  role: CollaboratorMasteryRole,
  courseXUnlocked: boolean,
): Collaborator | undefined {
  return collaborators
    .filter((collaborator) => collaborator.assignment === null)
    .sort((left, right) =>
      compareRoleSuitability(left, right, role, collaborators, courseXUnlocked)
    )[0];
}

function rebalanceTargets(state: GameState): GameState {
  if (!state.collaboratorManagement.aggregateViewUnlocked) return state;

  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const targets = sanitizeCollaboratorTargets(state.collaboratorManagement.targets);
  const targetsChanged = COLLABORATOR_MASTERY_ROLES.some(
    (role) => targets[role] !== state.collaboratorManagement.targets[role],
  );
  const stateWithSanitizedTargets = targetsChanged
    ? {
        ...state,
        collaboratorManagement: {
          ...state.collaboratorManagement,
          targets,
        },
      }
    : state;
  const pendingReleaseIds = getInstructorPendingReleaseIds(
    stateWithSanitizedTargets,
  );
  const preparedState = cancelPendingWaitingTrainings(
    stateWithSanitizedTargets,
    pendingReleaseIds,
  );
  const busyIds = getBusyCollaboratorIds(preparedState);
  let collaborators = preparedState.collaborators;
  let changed = preparedState !== state;

  // Negli altri settori resta valida la selezione tra le persone già libere.
  // Per gli Istruttori, invece, il check-out viene deciso subito: chi sta
  // insegnando termina le lezioni correnti senza riceverne di nuove.
  for (const role of COLLABORATOR_MASTERY_ROLES) {
    if (role !== "instructor") {
      let assignedCount = collaborators.filter(
        (collaborator) => collaborator.assignment === role,
      ).length;
      const freeCollaboratorIds = new Set(
        collaborators.flatMap((collaborator) =>
          busyIds.has(collaborator.id) ? [] : [collaborator.id]
        ),
      );
      while (assignedCount > targets[role]) {
        const removable = selectLeastEffectiveCollaborator(
          collaborators,
          role,
          courseXUnlocked,
          freeCollaboratorIds,
        );
        if (!removable) break;
        collaborators = collaborators.map((collaborator) =>
          collaborator.id === removable.id
            ? { ...collaborator, assignment: null }
            : collaborator
        );
        freeCollaboratorIds.delete(removable.id);
        assignedCount -= 1;
        changed = true;
      }
      continue;
    }
    for (const collaboratorId of pendingReleaseIds) {
      const removable = collaborators.find(
        (collaborator) =>
          collaborator.id === collaboratorId &&
          collaborator.assignment === role,
      );
      if (!removable || busyIds.has(removable.id)) continue;
      collaborators = collaborators.map((collaborator) =>
        collaborator.id === removable.id
          ? { ...collaborator, assignment: null }
          : collaborator
      );
      changed = true;
    }
  }

  // Poi riempie i buchi usando esclusivamente collaboratori non assegnati.
  for (const role of COLLABORATOR_MASTERY_ROLES) {
    let assignedCount = collaborators.filter(
      (collaborator) => collaborator.assignment === role,
    ).length;
    while (assignedCount < targets[role]) {
      const selected = selectBestUnassignedCollaborator(
        collaborators,
        role,
        courseXUnlocked,
      );
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

  return changed
    ? {
        ...preparedState,
        collaborators,
        collaboratorManagement: {
          ...preparedState.collaboratorManagement,
          targets,
        },
      }
    : state;
}

export function incrementCollaboratorAssignment(
  state: GameState,
  assignment: CollaboratorMasteryRole,
): GameState {
  const assignedCount = getCollaboratorAssignmentCounts(state)[assignment];
  const currentTarget = state.collaboratorManagement.targets[assignment] ?? 0;
  if (
    !state.collaboratorManagement.aggregateViewUnlocked ||
    (assignment === "gadget" && !state.unlocks.gadget) ||
    (
      assignedCount <= currentTarget &&
      !state.collaborators.some((collaborator) => collaborator.assignment === null)
    )
  ) return state;
  return rebalanceTargets({
    ...state,
    collaboratorManagement: {
      ...state.collaboratorManagement,
      targets: {
        ...state.collaboratorManagement.targets,
        [assignment]: currentTarget + 1,
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
    (assignment === "gadget" && !state.unlocks.gadget) ||
    (state.collaboratorManagement.targets[assignment] ?? 0) <= 0
  ) return state;
  return rebalanceTargets({
    ...state,
    collaboratorManagement: {
      ...state.collaboratorManagement,
      targets: {
        ...state.collaboratorManagement.targets,
        [assignment]: (state.collaboratorManagement.targets[assignment] ?? 0) - 1,
      },
    },
  });
}

export function setCollaboratorFallback(
  state: GameState,
  assignment: CollaboratorMasteryRole,
  fallback: CollaboratorMasteryRole | null,
): GameState {
  if (
    getUpgradeEffectTotal(state.upgrades, "collaboratorFallbackTier") <= 0 ||
    fallback === assignment ||
    fallback === "instructor" ||
    (fallback === "gadget" && !state.unlocks.gadget)
  ) return state;
  const fallbackAssignments = { ...(state.collaboratorManagement.fallbackAssignments ?? {}) };
  if (fallback === null) delete fallbackAssignments[assignment];
  else fallbackAssignments[assignment] = fallback;
  return {
    ...state,
    collaboratorManagement: {
      ...state.collaboratorManagement,
      fallbackAssignments,
    },
  };
}

export function moveOperationalPriority(
  state: GameState,
  assignment: CollaboratorMasteryRole,
  direction: "up" | "down",
): GameState {
  if (!isOperationalPrioritiesUnlocked(state.upgrades)) return state;
  const priorities = [...state.collaboratorManagement.operationalPriorities];
  const index = priorities.indexOf(assignment);
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= priorities.length) return state;
  [priorities[index], priorities[nextIndex]] = [priorities[nextIndex], priorities[index]];
  return {
    ...state,
    collaboratorManagement: {
      ...state.collaboratorManagement,
      operationalPriorities: priorities,
    },
  };
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
