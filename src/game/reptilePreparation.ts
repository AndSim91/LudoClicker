import { getCollaboratorProductivity } from "../content/forms";
import { GAME_CONFIG } from "./config";
import { getSchoolYear } from "./calendar";
import type {
  CollaboratorAssignment,
  GameState,
  ReptileActiveEdition,
  ReptileSector,
  ReptileSectorAssignments,
  ReptileSectorProgress,
} from "./types";

export const REPTILE_SECTORS: readonly ReptileSector[] = [
  "social",
  "equipment",
  "gadget",
  "events",
];

export const REPTILE_SECTOR_LABELS: Record<ReptileSector, string> = {
  social: "Social",
  equipment: "Attrezzature",
  gadget: "Gadget",
  events: "Eventi",
};

const REPTILE_ROLE_BY_SECTOR: Record<ReptileSector, Exclude<CollaboratorAssignment, null>> = {
  social: "writing",
  equipment: "equipment",
  gadget: "gadget",
  events: "events",
};

const BASE_LOAD_BY_SECTOR: Record<ReptileSector, number> = {
  social: 4,
  equipment: 6,
  gadget: 2,
  events: 4,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getReptileFameLevel(fameXp: number): number {
  return Math.min(5, Math.floor(clamp(fameXp, 0, 3_000) / 500));
}

export function getReptileTeamCount(fameXp: number): number {
  return 16 * 2 ** getReptileFameLevel(fameXp);
}

export function getReptileTeamLoadMultiplier(teamCount: number): number {
  return 1 + Math.max(0, Math.log2(Math.max(16, teamCount) / 16)) * 0.5;
}

export function getReptileQualityLabel(quality: number): string {
  if (quality < 20) return "Disastroso";
  if (quality < 40) return "Insufficiente";
  if (quality < 60) return "Adeguato";
  if (quality < 80) return "Buono";
  return "Eccellente";
}

export function calculateReptileMinigameModifier(
  hits: number,
  misses: number,
  outsideClicks: number,
): number {
  const safeHits = clamp(Math.floor(hits), 0, 50);
  const penalty = Math.min(
    50,
    Math.max(0, misses) * 0.5 + Math.max(0, outsideClicks),
  );
  return clamp(safeHits - penalty, -50, 50);
}

export function getReptileAssignedCollaboratorIds(state: GameState): Set<string> {
  const edition = state.tournaments.reptile.activeEdition;
  if (!edition || (edition.status !== "minigame" && edition.status !== "preparing")) {
    return new Set();
  }
  return new Set(REPTILE_SECTORS.flatMap((sector) => edition.assignments[sector]));
}

export function isReptilePreparationWorkActive(state: GameState): boolean {
  const status = state.tournaments.reptile.activeEdition?.status;
  return status === "minigame" || status === "preparing";
}

function hasValidAssignments(
  state: GameState,
  assignments: ReptileSectorAssignments,
): boolean {
  const eligibleIds = state.collaborators
    .filter((collaborator) => collaborator.assignment !== "instructor")
    .map((collaborator) => collaborator.id);
  const assignedIds = REPTILE_SECTORS.flatMap((sector) => assignments[sector] ?? []);
  return REPTILE_SECTORS.every((sector) => (assignments[sector]?.length ?? 0) > 0) &&
    assignedIds.length === eligibleIds.length &&
    new Set(assignedIds).size === assignedIds.length &&
    eligibleIds.every((id) => assignedIds.includes(id));
}

function calculatePowerSnapshot(
  state: GameState,
  assignments: ReptileSectorAssignments,
): Record<ReptileSector, number> {
  const collaboratorsById = new Map(state.collaborators.map((entry) => [entry.id, entry]));
  return Object.fromEntries(REPTILE_SECTORS.map((sector) => {
    const role = REPTILE_ROLE_BY_SECTOR[sector];
    let power = assignments[sector].reduce((total, id) => {
      const collaborator = collaboratorsById.get(id);
      return total + (collaborator ? getCollaboratorProductivity(collaborator, role) : 0);
    }, 0);
    if (sector === "social") {
      power *= 1 + Math.min(1, Math.max(0, state.school.followers) * 0.00005);
    }
    return [sector, power];
  })) as Record<ReptileSector, number>;
}

export function canStartReptilePreparation(state: GameState): boolean {
  const reptile = state.tournaments.reptile;
  return reptile.unlocked &&
    !reptile.activeEdition &&
    getSchoolYear(state.school.currentMonth) >= reptile.nextPreparationSchoolYear &&
    state.collaborators.filter((collaborator) => collaborator.assignment !== "instructor").length >= 4;
}

export function startReptilePreparation(
  state: GameState,
  assignments: ReptileSectorAssignments,
  now: number,
): GameState {
  if (!canStartReptilePreparation(state) || !hasValidAssignments(state, assignments)) return state;
  const sectorByCollaboratorId = new Map<string, ReptileSector>();
  for (const sector of REPTILE_SECTORS) {
    for (const collaboratorId of assignments[sector]) sectorByCollaboratorId.set(collaboratorId, sector);
  }
  const previousAssignments = Object.fromEntries(
    state.collaborators
      .filter((collaborator) => sectorByCollaboratorId.has(collaborator.id))
      .map((collaborator) => [collaborator.id, collaborator.assignment]),
  );
  const schoolYear = getSchoolYear(state.school.currentMonth);
  const activeEdition: ReptileActiveEdition = {
    id: `reptile-${schoolYear}-${now}`,
    schoolYear,
    teamCount: getReptileTeamCount(state.tournaments.reptile.fameXp),
    status: "minigame",
    startedAt: now,
    lastProgressAt: now,
    assignments: Object.fromEntries(
      REPTILE_SECTORS.map((sector) => [sector, [...assignments[sector]]]),
    ) as ReptileSectorAssignments,
    powerSnapshot: calculatePowerSnapshot(state, assignments),
    previousAssignments,
    minigame: {
      status: "ready",
      hits: 0,
      misses: 0,
      outsideClicks: 0,
      modifierPercent: 0,
    },
    presentationStep: 0,
  };
  return {
    ...state,
    collaborators: state.collaborators.map((collaborator) => {
      const sector = sectorByCollaboratorId.get(collaborator.id);
      return sector ? { ...collaborator, assignment: REPTILE_ROLE_BY_SECTOR[sector] } : collaborator;
    }),
    tournaments: {
      ...state.tournaments,
      reptile: {
        ...state.tournaments.reptile,
        activeEdition,
        latestRecap: undefined,
      },
    },
  };
}

export function startReptileMinigame(state: GameState, now: number): GameState {
  const edition = state.tournaments.reptile.activeEdition;
  if (!edition || edition.status !== "minigame" || edition.minigame.status !== "ready") return state;
  return updateActiveEdition(state, {
    ...edition,
    minigame: { ...edition.minigame, status: "running", startedAt: now },
  });
}

function calculateSectorProgress(
  state: GameState,
  edition: ReptileActiveEdition,
  modifierPercent: number,
): Record<ReptileSector, ReptileSectorProgress> {
  const loadMultiplier = getReptileTeamLoadMultiplier(edition.teamCount);
  const powers = edition.powerSnapshot;
  const loads = Object.fromEntries(
    REPTILE_SECTORS.map((sector) => [sector, BASE_LOAD_BY_SECTOR[sector] * loadMultiplier]),
  ) as Record<ReptileSector, number>;
  const ratios = Object.fromEntries(
    REPTILE_SECTORS.map((sector) => [sector, powers[sector] / loads[sector]]),
  ) as Record<ReptileSector, number>;
  const rawQualities = Object.fromEntries(
    REPTILE_SECTORS.map((sector) => [sector, clamp(ratios[sector] * 50, 0, 100)]),
  ) as Record<ReptileSector, number>;
  const coordination = 0.5 + Math.min(...Object.values(rawQualities)) / 200;
  const coordinatedEventsQuality = rawQualities.events * coordination;
  const eventBoost = 1 + coordinatedEventsQuality / 200;
  const minigameMultiplier = 1 + modifierPercent / 100;

  return Object.fromEntries(REPTILE_SECTORS.map((sector) => {
    const sectorEventBoost = sector === "events" ? 1 : eventBoost;
    const quality = clamp(
      rawQualities[sector] * coordination * sectorEventBoost * minigameMultiplier,
      0,
      100,
    );
    const durationMs = GAME_CONFIG.gameMonthMs * GAME_CONFIG.reptileBasePreparationMonths /
      Math.max(0.001, ratios[sector] * coordination * sectorEventBoost * minigameMultiplier);
    return [sector, {
      assignedCollaboratorIds: [...edition.assignments[sector]],
      load: loads[sector],
      effectivePower: powers[sector],
      rawQuality: rawQualities[sector],
      quality,
      durationMs,
      progress: 0,
    }];
  })) as Record<ReptileSector, ReptileSectorProgress>;
}

function beginTimedPreparation(
  state: GameState,
  minigame: ReptileActiveEdition["minigame"],
  now: number,
): GameState {
  const edition = state.tournaments.reptile.activeEdition;
  if (!edition || edition.status !== "minigame") return state;
  const preparedEdition: ReptileActiveEdition = {
    ...edition,
    status: "preparing",
    lastProgressAt: now,
    minigame,
    sectors: calculateSectorProgress(state, edition, minigame.modifierPercent),
  };
  return updateActiveEdition(state, preparedEdition);
}

export function completeReptileMinigame(
  state: GameState,
  hits: number,
  misses: number,
  outsideClicks: number,
  now: number,
): GameState {
  const edition = state.tournaments.reptile.activeEdition;
  if (!edition || edition.status !== "minigame" || edition.minigame.status !== "running") return state;
  const safeHits = clamp(Math.floor(hits), 0, 50);
  const safeMisses = clamp(Math.floor(misses), 0, 50 - safeHits);
  return beginTimedPreparation(state, {
    status: "completed",
    startedAt: edition.minigame.startedAt,
    hits: safeHits,
    misses: safeMisses,
    outsideClicks: Math.max(0, Math.floor(outsideClicks)),
    modifierPercent: calculateReptileMinigameModifier(safeHits, safeMisses, outsideClicks),
  }, now);
}

export function skipReptileMinigame(state: GameState, now: number): GameState {
  const edition = state.tournaments.reptile.activeEdition;
  if (!edition || edition.status !== "minigame" || edition.minigame.status !== "ready") return state;
  return beginTimedPreparation(state, {
    status: "skipped",
    hits: 0,
    misses: 0,
    outsideClicks: 0,
    modifierPercent: 0,
  }, now);
}

function restoreCollaborators(
  state: GameState,
  edition: ReptileActiveEdition,
  now: number,
): GameState["collaborators"] {
  const pausedDuration = Math.max(0, now - edition.startedAt);
  return state.collaborators.map((collaborator) => {
    const previous = edition.previousAssignments[collaborator.id];
    if (previous === undefined && !(collaborator.id in edition.previousAssignments)) return collaborator;
    return {
      ...collaborator,
      assignment: previous,
      training: collaborator.training
        ? {
            ...collaborator.training,
            startedAt: collaborator.training.startedAt + pausedDuration,
            completesAt: collaborator.training.completesAt + pausedDuration,
          }
        : undefined,
    };
  });
}

export function processReptilePreparation(state: GameState, now: number): GameState {
  const edition = state.tournaments.reptile.activeEdition;
  if (!edition || edition.status !== "preparing" || !edition.sectors) return state;
  const elapsed = Math.max(0, now - edition.lastProgressAt);
  if (elapsed <= 0) return state;
  const sectors = Object.fromEntries(REPTILE_SECTORS.map((sector) => {
    const current = edition.sectors![sector];
    return [sector, {
      ...current,
      progress: clamp(current.progress + elapsed / current.durationMs, 0, 1),
    }];
  })) as Record<ReptileSector, ReptileSectorProgress>;
  const complete = REPTILE_SECTORS.every((sector) => sectors[sector].progress >= 1);
  const nextEdition: ReptileActiveEdition = {
    ...edition,
    status: complete ? "ready" : "preparing",
    lastProgressAt: now,
    sectors,
  };
  const updated = updateActiveEdition(state, nextEdition);
  return complete ? { ...updated, collaborators: restoreCollaborators(updated, edition, now) } : updated;
}

export function cancelReptilePreparation(state: GameState, now: number): GameState {
  const edition = state.tournaments.reptile.activeEdition;
  if (!edition || edition.status === "booked" || edition.status === "presenting") return state;
  return {
    ...state,
    collaborators: edition.status === "ready"
      ? state.collaborators
      : restoreCollaborators(state, edition, now),
    tournaments: {
      ...state.tournaments,
      reptile: { ...state.tournaments.reptile, activeEdition: undefined },
    },
  };
}

export function getNextReptileJuly(currentMonth: number): number {
  const calendarMonth = ((Math.max(1, Math.floor(currentMonth)) - 1) % 12) + 1;
  return calendarMonth === 7 ? currentMonth : currentMonth + ((7 - calendarMonth + 12) % 12);
}

export function bookReptileVenue(state: GameState, now: number): GameState {
  const edition = state.tournaments.reptile.activeEdition;
  if (!edition || edition.status !== "ready" || state.school.euros < GAME_CONFIG.reptileVenueCost) {
    return state;
  }
  return {
    ...state,
    school: { ...state.school, euros: state.school.euros - GAME_CONFIG.reptileVenueCost },
    tournaments: {
      ...state.tournaments,
      reptile: {
        ...state.tournaments.reptile,
        activeEdition: {
          ...edition,
          status: "booked",
          bookedAt: now,
          scheduledMonth: getNextReptileJuly(state.school.currentMonth),
        },
      },
    },
  };
}

function updateActiveEdition(state: GameState, activeEdition: ReptileActiveEdition): GameState {
  return {
    ...state,
    tournaments: {
      ...state.tournaments,
      reptile: { ...state.tournaments.reptile, activeEdition },
    },
  };
}
