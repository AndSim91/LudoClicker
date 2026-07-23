import type { CollaboratorMastery, CollaboratorMasteryRole } from "../game/types";

export const COLLABORATOR_MASTERY_ROLES: readonly CollaboratorMasteryRole[] = [
  "writing",
  "events",
  "lessons",
  "equipment",
  "instructor",
];

export const COLLABORATOR_MASTERY_ROLE_LABELS: Record<CollaboratorMasteryRole, string> = {
  writing: "Scrittura",
  events: "Eventi",
  lessons: "Preparatore Atletico",
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
  { name: "Iniziato", minimumXp: 100, multiplier: 0.05 },
  { name: "Accademico", minimumXp: 300, multiplier: 0.1 },
  { name: "Cavaliere", minimumXp: 700, multiplier: 0.15 },
  { name: "Maestro", minimumXp: 1_500, multiplier: 0.25 },
] as const;

export const COLLABORATOR_MASTERY_XP = {
  writingPerSecond: 1.5,
  eventCompleted: 10,
  lessonCompleted: 5,
  equipmentRepairPoint: 5,
  instructorTraining: 10,
} as const;

export function createInitialCollaboratorMastery(): CollaboratorMastery {
  return {
    writing: 0,
    events: 0,
    lessons: 0,
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
