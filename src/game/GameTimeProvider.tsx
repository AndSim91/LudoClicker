import { useMemo, type ReactNode } from "react";
import { GameTimeContext, type GameTimeSource } from "./GameTimeContext";

export function GameTimeProvider({
  getNow,
  isPaused,
  speed = 1,
  children,
}: {
  getNow: () => number;
  isPaused: boolean;
  speed?: number;
  children: ReactNode;
}) {
  const source = useMemo<GameTimeSource>(
    () => ({ getNow, isPaused, speed }),
    [getNow, isPaused, speed],
  );
  return (
    <GameTimeContext.Provider value={source}>
      {children}
    </GameTimeContext.Provider>
  );
}
