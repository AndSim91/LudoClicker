import type { CollaboratorMastery, CollaboratorMasteryRole } from "../game/types";

export const COLLABORATOR_MASTERY_ROLES: readonly CollaboratorMasteryRole[] = [
  "writing",
  "events",
  "equipment",
  "instructor",
  "gadget",
];

export const COLLABORATOR_MASTERY_ROLE_LABELS: Record<CollaboratorMasteryRole, string> = {
  writing: "Scrittura",
  events: "Eventi",
  equipment: "Attrezzatura",
  instructor: "Istruttore",
  gadget: "Gadget",
};

export function getCollaboratorMasteryRoleLabel(
  role: CollaboratorMasteryRole,
  socialUnlocked: boolean,
): string {
  return role === "writing" && socialUnlocked
    ? "Social"
    : COLLABORATOR_MASTERY_ROLE_LABELS[role];
}

// Decision of 06/10: the Forms no longer give bonuses to collaborators, the
// Mastery of the sector does. 1 XP per second of game time in the sector:
// Iniziato at 5 minutes, Accademico at 10, Cavaliere at 30, Maestro at one hour,
// Leggenda (+500%) at two hours. In the Eventi the Mastery does not add contacts:
// eventMultiplier scales duration, cost and wear of the events the collaborator
// starts on their own (Andrea, 06/10).
export const COLLABORATOR_MASTERY_LEVELS = [
  { name: "Novizio", minimumXp: 0, multiplier: 0, eventMultiplier: 1 },
  { name: "Iniziato", minimumXp: 300, multiplier: 0.25, eventMultiplier: 0.9 },
  { name: "Accademico", minimumXp: 600, multiplier: 0.5, eventMultiplier: 0.75 },
  { name: "Cavaliere", minimumXp: 1_800, multiplier: 1, eventMultiplier: 0.6 },
  { name: "Maestro", minimumXp: 3_600, multiplier: 2, eventMultiplier: 0.4 },
  { name: "Leggenda", minimumXp: 7_200, multiplier: 5, eventMultiplier: 0.25 },
] as const;

export const COLLABORATOR_MASTERY_XP_PER_SECOND = 1;

export function createInitialCollaboratorMastery(): CollaboratorMastery {
  return {
    writing: 0,
    events: 0,
    equipment: 0,
    instructor: 0,
    gadget: 0,
  };
}

export function getCollaboratorMasteryLevel(xp: number | undefined) {
  const safeXp = Math.max(0, typeof xp === "number" && Number.isFinite(xp) ? xp : 0);
  let level = 0;
  for (let index = 1; index < COLLABORATOR_MASTERY_LEVELS.length; index += 1) {
    if (safeXp < COLLABORATOR_MASTERY_LEVELS[index].minimumXp) break;
    level = index;
  }
  return level;
}

export function getCollaboratorMasteryDefinition(xp: number | undefined) {
  return COLLABORATOR_MASTERY_LEVELS[getCollaboratorMasteryLevel(xp)];
}

export function getCollaboratorMasteryMultiplier(xp: number | undefined): number {
  return 1 + getCollaboratorMasteryDefinition(xp).multiplier;
}

export function getCollaboratorMasteryProgress(xp: number | undefined) {
  const safeXp = Math.max(0, typeof xp === "number" && Number.isFinite(xp) ? xp : 0);
  const level = getCollaboratorMasteryLevel(safeXp);
  const current = COLLABORATOR_MASTERY_LEVELS[level];
  const next = COLLABORATOR_MASTERY_LEVELS[level + 1];
  const span = next ? next.minimumXp - current.minimumXp : 1;
  const progress = next
    ? Math.min(100, Math.round(((safeXp - current.minimumXp) / span) * 100))
    : 100;
  return {
    level,
    definition: current,
    currentXp: Math.round(safeXp),
    nextXp: next?.minimumXp,
    progress,
  };
}
