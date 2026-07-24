import type { CollaboratorMastery, CollaboratorMasteryRole } from "../game/types";

export const COLLABORATOR_MASTERY_ROLES: readonly CollaboratorMasteryRole[] = [
  "writing",
  "events",
  "equipment",
  "instructor",
];

export const COLLABORATOR_MASTERY_ROLE_LABELS: Record<CollaboratorMasteryRole, string> = {
  writing: "Scrittura",
  events: "Eventi",
  equipment: "Attrezzatura",
  instructor: "Istruttore",
};

export function getCollaboratorMasteryRoleLabel(
  role: CollaboratorMasteryRole,
  socialUnlocked: boolean,
): string {
  return role === "writing" && socialUnlocked
    ? "Social"
    : COLLABORATOR_MASTERY_ROLE_LABELS[role];
}

export const COLLABORATOR_MASTERY_LEVELS = [
  { name: "Novizio", minimumXp: 0, multiplier: 0 },
  { name: "Iniziato", minimumXp: 60, multiplier: 0.2 },
  { name: "Accademico", minimumXp: 360, multiplier: 0.4 },
  { name: "Cavaliere", minimumXp: 2_160, multiplier: 0.65 },
  { name: "Maestro", minimumXp: 5_760, multiplier: 1 },
] as const;

export const COLLABORATOR_MASTERY_XP_PER_SECOND = 1;

export function createInitialCollaboratorMastery(): CollaboratorMastery {
  return {
    writing: 0,
    events: 0,
    equipment: 0,
    instructor: 0,
  };
}

export function getCollaboratorMasteryLevel(xp: number) {
  const safeXp = Math.max(0, Number.isFinite(xp) ? xp : 0);
  let level = 0;
  for (let index = 1; index < COLLABORATOR_MASTERY_LEVELS.length; index += 1) {
    if (safeXp < COLLABORATOR_MASTERY_LEVELS[index].minimumXp) break;
    level = index;
  }
  return level;
}

export function getCollaboratorMasteryDefinition(xp: number) {
  return COLLABORATOR_MASTERY_LEVELS[getCollaboratorMasteryLevel(xp)];
}

export function getCollaboratorMasteryMultiplier(xp: number): number {
  return 1 + getCollaboratorMasteryDefinition(xp).multiplier;
}

export function getCollaboratorMasteryProgress(xp: number) {
  const safeXp = Math.max(0, Number.isFinite(xp) ? xp : 0);
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
