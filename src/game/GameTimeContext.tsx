import { createContext, useContext, type ReactNode } from "react";

const GameTimeContext = createContext<number | null>(null);

export function GameTimeProvider({
  now,
  children,
}: {
  now: number;
  children: ReactNode;
}) {
  return (
    <GameTimeContext.Provider value={now}>
      {children}
    </GameTimeContext.Provider>
  );
}

export function useProvidedGameTime(): number | null {
  return useContext(GameTimeContext);
}
