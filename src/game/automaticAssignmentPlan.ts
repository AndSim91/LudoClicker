import { getCollaboratorProductivity, getVisibleForms } from "../content/forms";
import type { Collaborator, CollaboratorMasteryRole } from "./types";

/*
 * «Assegnazione automatica» (4.7): who goes where when the effort bars change.
 * Pure: it only reads collaborators and returns the new sector of whoever moves.
 *
 * Suitability is relative: what a person yields in a sector divided by their
 * average over the open sectors, so rarity cancels out and Forms and mastery
 * decide. Istruttori count the Forms they can teach, more so a Form nobody
 * else covers.
 */

type Role = CollaboratorMasteryRole;
type RoleOf = (collaborator: Collaborator) => Role | null;

const EXTRA_MOVE_COST = 0.15;
const BUSY_MOVE_COST = 0.05;
// ponytail: bounded local search; enough for a few changes at a time, a real
// assignment solver (min-cost flow) if huge teams ever reshuffle badly.
const MAX_CHAIN_IMPROVEMENTS = 20;

function getSuitability(
  collaborator: Collaborator,
  role: Role,
  coverage: ReadonlyMap<string, number>,
  isInstructor: boolean,
  courseXUnlocked: boolean,
): number {
  const productivity = getCollaboratorProductivity(collaborator, role);
  if (role !== "instructor") return productivity;
  const taught = getVisibleForms(collaborator.instructorForms, courseXUnlocked);
  if (taught.length === 0) return productivity * 0.8;
  const onlyMine = taught.filter(
    (formId) => (coverage.get(formId) ?? 0) - (isInstructor ? 1 : 0) <= 0,
  ).length;
  const certifiable = getVisibleForms(collaborator.forms, courseXUnlocked)
    .filter((formId) => !taught.includes(formId)).length;
  return productivity * (1 + 0.15 * taught.length + 0.25 * onlyMine + 0.05 * certifiable);
}

/** Relative suitability of every collaborator for every open sector. */
export function createAdvantageTable(
  collaborators: readonly Collaborator[],
  roles: readonly Role[],
  roleOf: RoleOf,
  courseXUnlocked: boolean,
): Map<string, Record<Role, number>> {
  const coverage = new Map<string, number>();
  for (const collaborator of collaborators) {
    if (roleOf(collaborator) !== "instructor") continue;
    for (const formId of getVisibleForms(collaborator.instructorForms, courseXUnlocked)) {
      coverage.set(formId, (coverage.get(formId) ?? 0) + 1);
    }
  }
  return new Map(collaborators.map((collaborator) => {
    const isInstructor = roleOf(collaborator) === "instructor";
    const raw = roles.map((role) =>
      getSuitability(collaborator, role, coverage, isInstructor, courseXUnlocked)
    );
    const mean = raw.reduce((total, value) => total + value, 0) / roles.length || 1;
    return [
      collaborator.id,
      Object.fromEntries(roles.map((role, index) => [role, raw[index] / mean])) as Record<Role, number>,
    ];
  }));
}

/** Splits the team among the open sectors in proportion to the shares (largest remainder). */
export function getAutomaticTargets(
  shares: Partial<Record<Role, number>>,
  roles: readonly Role[],
  teamSize: number,
): Record<Role, number> | undefined {
  const total = roles.reduce((sum, role) => sum + (shares[role] ?? 0), 0);
  if (total <= 0) return undefined;
  const raw = roles.map((role) => (shares[role] ?? 0) / total * teamSize);
  const targets = raw.map(Math.floor);
  let left = teamSize - targets.reduce((sum, value) => sum + value, 0);
  const byRemainder = raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index);
  for (const { index } of byRemainder) {
    if (left <= 0) break;
    targets[index] += 1;
    left -= 1;
  }
  return Object.fromEntries(roles.map((role, index) => [role, targets[index]])) as Record<Role, number>;
}

function byJoining(left: Collaborator, right: Collaborator): number {
  return left.joinedAt - right.joinedAt || left.id.localeCompare(right.id);
}

/**
 * Moves the fewest people that reach the targets: from each crowded sector
 * leaves whoever yields relatively least there, the free and the leavers go
 * where they yield relatively most; then one extra move is accepted when a
 * chain clearly helps (an Istruttore with Forms comes from Attrezzatura and
 * someone takes their place). Busy people move last at equal suitability.
 */
export function planAutomaticAssignment({
  collaborators,
  roles,
  targets,
  roleOf,
  busyIds,
  courseXUnlocked,
}: {
  collaborators: readonly Collaborator[];
  roles: readonly Role[];
  targets: Record<Role, number>;
  roleOf: RoleOf;
  busyIds: ReadonlySet<string>;
  courseXUnlocked: boolean;
}): Map<string, Role> {
  const advantage = createAdvantageTable(collaborators, roles, roleOf, courseXUnlocked);
  const adv = (collaborator: Collaborator, role: Role) => advantage.get(collaborator.id)?.[role] ?? 0;
  const busyCost = (collaborator: Collaborator) => busyIds.has(collaborator.id) ? BUSY_MOVE_COST : 0;
  const counts = Object.fromEntries(roles.map((role) => [role, 0])) as Record<Role, number>;
  const pool: Collaborator[] = [];
  for (const collaborator of collaborators) {
    const role = roleOf(collaborator);
    if (role && role in counts) counts[role] += 1;
    else pool.push(collaborator);
  }
  for (const role of roles) {
    const over = counts[role] - targets[role];
    if (over <= 0) continue;
    pool.push(...collaborators
      .filter((collaborator) => roleOf(collaborator) === role)
      .sort((left, right) =>
        adv(left, role) + busyCost(left) - (adv(right, role) + busyCost(right)) || byJoining(right, left)
      )
      .slice(0, over));
  }

  const need = Object.fromEntries(
    roles.map((role) => [role, Math.max(0, targets[role] - counts[role])]),
  ) as Record<Role, number>;
  const moves = new Map<string, { collaborator: Collaborator; from: Role | null; to: Role }>();
  // ponytail: greedy best pair, O(pool² × sectors); fine for hundreds of collaborators.
  while (pool.length > 0) {
    let best: { index: number; role: Role; value: number } | undefined;
    pool.forEach((collaborator, index) => {
      for (const role of roles) {
        if (need[role] > 0 && (!best || adv(collaborator, role) > best.value)) {
          best = { index, role, value: adv(collaborator, role) };
        }
      }
    });
    if (!best) break;
    const [collaborator] = pool.splice(best.index, 1);
    need[best.role] -= 1;
    const from = roleOf(collaborator);
    if (from !== best.role) moves.set(collaborator.id, { collaborator, from, to: best.role });
  }

  for (let step = 0; step < MAX_CHAIN_IMPROVEMENTS; step += 1) {
    let best: { gain: number; moverId: string; other: Collaborator; swap: boolean } | undefined;
    for (const [moverId, move] of moves) {
      for (const other of collaborators) {
        const otherRole = roleOf(other);
        if (!otherRole || otherRole === move.to || moves.has(other.id)) continue;
        const swap = otherRole === move.from;
        const gain = adv(other, move.to) + adv(move.collaborator, otherRole) -
          adv(move.collaborator, move.to) - adv(other, otherRole) -
          busyCost(other) + (swap ? busyCost(move.collaborator) : -EXTRA_MOVE_COST);
        if (gain > 0.001 && (!best || gain > best.gain)) best = { gain, moverId, other, swap };
      }
    }
    if (!best) break;
    const move = moves.get(best.moverId);
    const otherRole = roleOf(best.other);
    if (!move || !otherRole) break;
    if (best.swap) moves.delete(best.moverId);
    else moves.set(best.moverId, { ...move, to: otherRole });
    moves.set(best.other.id, { collaborator: best.other, from: otherRole, to: move.to });
  }

  return new Map([...moves].map(([id, move]) => [id, move.to]));
}
