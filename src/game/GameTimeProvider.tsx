import { useMemo, type ReactNode } from "react";
import { GameTimeContext, type GameTimeSource } from "./GameTimeContext";

const getSystemWallNow = () => Date.now();

export function GameTimeProvider({
  getNow,
  getWallNow = getSystemWallNow,
  isPaused,
  speed = 1,
  updateIntervalMs = 0,
  children,
}: {
  getNow: () => number;
  getWallNow?: () => number;
  isPaused: boolean;
  speed?: number;
  updateIntervalMs?: number;
  children: ReactNode;
}) {
  const source = useMemo<GameTimeSource>(
    () => ({ getNow, getWallNow, isPaused, speed, updateIntervalMs }),
    [getNow, getWallNow, isPaused, speed, updateIntervalMs],
  );
  return (
    <GameTimeContext.Provider value={source}>
      {children}
    </GameTimeContext.Provider>
  );
}
