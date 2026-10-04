import { COLLABORATOR_MASTERY_ROLES } from "../content/mastery";
import {
  getCollaboratorProductivity,
  getVisibleForms,
} from "../content/forms";
import {
  isCourseXUnlocked,
  isOperationalPrioritiesUnlocked,
} from "../content/upgrades";
import {
  createAdvantageTable,
  getAutomaticTargets,
  planAutomaticAssignment,
} from "./automaticAssignmentPlan";
import { GAME_CONFIG } from "./config";
import { isReptilePreparationWorkActive } from "./reptilePreparation";
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
  state: Pick<GameState, "collaborators">,
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
  const automaticPending = state.collaboratorManagement.automaticPendingMoves;
  if (automaticPending) return new Set(Object.keys(automaticPending));
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
    state.collaboratorManagement.automaticShares ||
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
    state.collaboratorManagement.automaticShares ||
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

/** Moves a sector of «Turni e precedenza» to a place of the row (index in the full list). */
export function moveOperationalPriority(
  state: GameState,
  assignment: CollaboratorMasteryRole,
  toIndex: number,
): GameState {
  if (!isOperationalPrioritiesUnlocked(state.upgrades)) return state;
  const priorities = [...state.collaboratorManagement.operationalPriorities];
  const index = priorities.indexOf(assignment);
  if (index < 0 || index === toIndex || toIndex < 0 || toIndex >= priorities.length) return state;
  priorities.splice(index, 1);
  priorities.splice(toIndex, 0, assignment);
  return {
    ...state,
    collaboratorManagement: {
      ...state.collaboratorManagement,
      operationalPriorities: priorities,
    },
  };
}

/* ---- «Assegnazione automatica» (4.7) ---- */

/** Each notch of an effort bar is worth 20: five notches, 0–100. */
export const AUTOMATIC_SHARE_PER_LEVEL = 20;
export const AUTOMATIC_MAX_LEVEL = 5;
const AUTOMATIC_SHARE_MAX = AUTOMATIC_SHARE_PER_LEVEL * AUTOMATIC_MAX_LEVEL;

export function getAutomaticAssignmentRoles(state: Pick<GameState, "unlocks">): CollaboratorMasteryRole[] {
  return COLLABORATOR_MASTERY_ROLES.filter((role) => role !== "gadget" || state.unlocks.gadget);
}

export function getAutomaticShareLevel(share: number | undefined): number {
  return Math.max(0, Math.min(AUTOMATIC_MAX_LEVEL, Math.round((share ?? 0) / AUTOMATIC_SHARE_PER_LEVEL)));
}

function getAutomaticPendingMoves(state: GameState): Record<string, CollaboratorMasteryRole> {
  return state.collaboratorManagement.automaticPendingMoves ?? {};
}

/** Sector each collaborator counts for: an Istruttore finishing lessons already counts for the next one. */
export function getAutomaticSectorCounts(state: GameState): Record<CollaboratorMasteryRole, number> {
  const pending = getAutomaticPendingMoves(state);
  const counts = createEmptyCollaboratorTargets();
  for (const collaborator of state.collaborators) {
    const role = pending[collaborator.id] ?? collaborator.assignment;
    if (role) counts[role] += 1;
  }
  return counts;
}

function withTargetsFromAssignments(state: GameState): GameState {
  return {
    ...state,
    collaboratorManagement: {
      ...state.collaboratorManagement,
      targets: getCollaboratorAssignmentCounts(state),
    },
  };
}

/**
 * Puts everyone in the sector given by `nextRole`. An Istruttore who is still
 * teaching keeps the post until the lessons end (no new students, the ones
 * waiting for swords are cancelled) and then moves; everyone else moves now:
 * a running event ends anyway, a training goes on.
 */
function applyAutomaticSectors(
  state: GameState,
  nextRole: (collaborator: Collaborator) => CollaboratorMasteryRole | null,
): GameState {
  const leavingInstructorIds = new Set(state.collaborators.flatMap((collaborator) =>
    collaborator.assignment === "instructor" && nextRole(collaborator) !== "instructor"
      ? [collaborator.id]
      : []
  ));
  const prepared = cancelPendingWaitingTrainings(state, leavingInstructorIds);
  const teaching = getInstructorTeachingCounts(prepared.contacts, prepared.collaborators);
  const pending: Record<string, CollaboratorMasteryRole> = {};
  const collaborators = prepared.collaborators.map((collaborator) => {
    const role = nextRole(collaborator);
    if (!role || role === collaborator.assignment) return collaborator;
    if (leavingInstructorIds.has(collaborator.id) && (teaching.get(collaborator.id) ?? 0) > 0) {
      pending[collaborator.id] = role;
      return collaborator;
    }
    return { ...collaborator, assignment: role };
  });
  const management = { ...prepared.collaboratorManagement };
  delete management.automaticPendingMoves;
  return withTargetsFromAssignments({
    ...prepared,
    collaborators,
    collaboratorManagement: Object.keys(pending).length > 0
      ? { ...management, automaticPendingMoves: pending }
      : management,
  });
}

/** Istruttori who finished their lessons take the sector they were moved to. */
function settleAutomaticPendingMoves(state: GameState): GameState {
  const pending = state.collaboratorManagement.automaticPendingMoves;
  if (!pending) return state;
  const teaching = getInstructorTeachingCounts(state.contacts, state.collaborators);
  const stillTeaching = (id: string) => (teaching.get(id) ?? 0) > 0;
  if (Object.keys(pending).every(stillTeaching)) return state;
  return applyAutomaticSectors(state, (collaborator) =>
    pending[collaborator.id] ?? collaborator.assignment
  );
}

/**
 * Gives every free collaborator a sector: the one furthest below its share,
 * with the free person relatively best suited for it. Assigned collaborators
 * never move here; only changing the bars moves them.
 */
function assignFreeCollaboratorsAutomatically(state: GameState): GameState {
  const shares = state.collaboratorManagement.automaticShares;
  if (!shares || isReptilePreparationWorkActive(state)) return state;
  if (!state.collaborators.some((collaborator) => collaborator.assignment === null)) return state;
  const roles = getAutomaticAssignmentRoles(state).filter((role) => (shares[role] ?? 0) > 0);
  const totalShare = roles.reduce((total, role) => total + (shares[role] ?? 0), 0);
  if (totalShare === 0) return state;
  const pending = getAutomaticPendingMoves(state);
  const roleOf = (collaborator: Collaborator) => pending[collaborator.id] ?? collaborator.assignment;
  const advantage = createAdvantageTable(
    state.collaborators,
    roles,
    roleOf,
    isCourseXUnlocked(state.upgrades),
  );
  const counts = getAutomaticSectorCounts(state);
  let assigned = Object.values(counts).reduce((total, count) => total + count, 0);
  const free = state.collaborators.filter((collaborator) => roleOf(collaborator) === null);
  const placed = new Map<string, CollaboratorMasteryRole>();
  while (free.length > 0) {
    assigned += 1;
    const role = roles.reduce((best, candidate) =>
      (shares[candidate] ?? 0) / totalShare * assigned - counts[candidate] >
        (shares[best] ?? 0) / totalShare * assigned - counts[best]
        ? candidate
        : best,
    );
    let bestIndex = 0;
    free.forEach((collaborator, index) => {
      const value = advantage.get(collaborator.id)?.[role] ?? 0;
      if (value > (advantage.get(free[bestIndex].id)?.[role] ?? 0)) bestIndex = index;
    });
    const [selected] = free.splice(bestIndex, 1);
    placed.set(selected.id, role);
    counts[role] += 1;
  }
  return withTargetsFromAssignments({
    ...state,
    collaborators: state.collaborators.map((collaborator) => {
      const role = placed.get(collaborator.id);
      return role ? { ...collaborator, assignment: role } : collaborator;
    }),
  });
}

/** On: the bars start from the proportions the player left (all at 3 if nobody is assigned). Off: hands back control. */
export function setAutomaticAssignment(state: GameState, enabled: boolean): GameState {
  const { automaticShares, ...management } = state.collaboratorManagement;
  delete management.automaticPendingMoves;
  if (enabled === Boolean(automaticShares)) return state;
  if (!enabled) return withTargetsFromAssignments({ ...state, collaboratorManagement: management });
  const roles = getAutomaticAssignmentRoles(state);
  const counts = getCollaboratorAssignmentCounts(state);
  const largest = Math.max(...roles.map((role) => counts[role]));
  const shares = Object.fromEntries(roles.map((role) => [
    role,
    largest > 0
      ? Math.round(counts[role] / largest * AUTOMATIC_SHARE_MAX)
      : 3 * AUTOMATIC_SHARE_PER_LEVEL,
  ]));
  return assignFreeCollaboratorsAutomatically({
    ...state,
    collaboratorManagement: { ...management, automaticShares: shares },
  });
}

/**
 * Sets one effort bar and moves people right away: the fewest needed, each
 * where they yield relatively most (see `planAutomaticAssignment`).
 */
export function changeAutomaticShare(
  state: GameState,
  role: CollaboratorMasteryRole,
  level: number,
): GameState {
  const shares = state.collaboratorManagement.automaticShares;
  const roles = getAutomaticAssignmentRoles(state);
  if (!shares || !roles.includes(role) || !Number.isFinite(level)) return state;
  const share = Math.max(0, Math.min(AUTOMATIC_MAX_LEVEL, Math.round(level))) * AUTOMATIC_SHARE_PER_LEVEL;
  if (share === (shares[role] ?? 0)) return state;
  const nextShares = { ...shares, [role]: share };
  const targets = getAutomaticTargets(nextShares, roles, state.collaborators.length);
  if (!targets) return state;
  const withShares = {
    ...state,
    collaboratorManagement: { ...state.collaboratorManagement, automaticShares: nextShares },
  };
  const pending = getAutomaticPendingMoves(state);
  const roleOf = (collaborator: Collaborator) => pending[collaborator.id] ?? collaborator.assignment;
  const moves = planAutomaticAssignment({
    collaborators: state.collaborators,
    roles,
    targets,
    roleOf,
    busyIds: getBusyCollaboratorIds(state),
    courseXUnlocked: isCourseXUnlocked(state.upgrades),
  });
  return applyAutomaticSectors(withShares, (collaborator) =>
    moves.get(collaborator.id) ?? roleOf(collaborator)
  );
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
  return unlockedState.collaboratorManagement.automaticShares
    ? assignFreeCollaboratorsAutomatically(settleAutomaticPendingMoves(unlockedState))
    : rebalanceTargets(unlockedState);
}
