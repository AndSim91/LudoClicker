import { useMemo, type ReactNode } from "react";
import { GameTimeContext, type GameTimeSource } from "./GameTimeContext";

export function GameTimeProvider({
  getNow,
  isPaused,
  children,
}: {
  getNow: () => number;
  isPaused: boolean;
  children: ReactNode;
}) {
  const source = useMemo<GameTimeSource>(
    () => ({ getNow, isPaused }),
    [getNow, isPaused],
  );
  return (
    <GameTimeContext.Provider value={source}>
      {children}
    </GameTimeContext.Provider>
  );
}
