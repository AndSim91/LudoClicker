import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createInitialState } from "../../game/engine";
import { GameStateContext } from "../../game/GameStateContext";
import type { TournamentParticipant } from "../../game/types";
import { FinalDuelBoard } from "./FinalDuelBoard";

const athlete = (id: string): TournamentParticipant => ({
  id, firstName: id, lastName: "Prova", schoolName: "Onde", city: "Genova", rarity: "rare",
  numericForms: 1, knownFormIds: ["form-1"], experience: 0, arenaBase: 100, styleBase: 100,
  arenaPreparation: 138, stylePreparation: 120, condition: 1,
});

describe("FinalDuelBoard", () => {
  it("hides Arena and Stile without Occhio del Maestro", () => {
    render(
      <GameStateContext.Provider value={createInitialState(1_000)}>
        <FinalDuelBoard participants={{ a: athlete("a"), b: athlete("b") }} score={{ a: 0, b: 0 }} history={[]} bestOf={5} />
      </GameStateContext.Provider>,
    );
    expect(screen.queryByText("138")).toBeNull();
    expect(screen.getAllByText("???")).toHaveLength(4);
  });
});
