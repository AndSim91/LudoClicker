export const MIN_GAME_SPEED = 1;
export const MAX_GAME_SPEED = 10;

export interface GameClockAnchor {
  gameNow: number;
  wallNow: number;
  speed: number;
}

export function normalizeGameSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return MIN_GAME_SPEED;
  return Math.min(
    MAX_GAME_SPEED,
    Math.max(MIN_GAME_SPEED, Math.round(speed)),
  );
}

export function createGameClockAnchor(
  gameNow: number,
  wallNow: number,
  speed = MIN_GAME_SPEED,
): GameClockAnchor {
  return {
    gameNow,
    wallNow,
    speed: normalizeGameSpeed(speed),
  };
}

export function readGameClock(
  anchor: GameClockAnchor,
  wallNow: number,
): number {
  return anchor.gameNow + Math.max(0, wallNow - anchor.wallNow) * anchor.speed;
}

export function changeGameClockSpeed(
  anchor: GameClockAnchor,
  wallNow: number,
  speed: number,
): GameClockAnchor {
  return createGameClockAnchor(
    readGameClock(anchor, wallNow),
    wallNow,
    speed,
  );
}

export function gameDelayToWallDelay(gameDelayMs: number, speed: number): number {
  if (!Number.isFinite(gameDelayMs)) return gameDelayMs;
  return Math.max(0, Math.ceil(gameDelayMs / normalizeGameSpeed(speed)));
}
