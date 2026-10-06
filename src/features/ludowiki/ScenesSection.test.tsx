import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import type { GameState } from "../../game/types";
import { describeFoundation, getFoundationSceneNumbers } from "../moments/momentContent";
import { ScenesSection } from "./ScenesSection";

afterEach(cleanup);

function withScenes(): GameState {
  const initial = createInitialState(1_000, "Verifica UI");
  return {
    ...initial,
    moments: { ...initial.moments, seen: ["council", "legendary:eva-parodi"] },
    legendaryCollaborators: { ...initial.legendaryCollaborators, enrolledProfileIds: ["eva-parodi"] },
    lightInflation: { ...initial.lightInflation, increases: 2, priceMultiplier: 1.6 },
  };
}

describe("ScenesSection", () => {
  it("hides every scene not seen yet behind «???»", () => {
    render(<ScenesSection state={createInitialState(1_000, "Verifica UI")} onReplay={vi.fn()} />);
    expect(screen.getByText("0 scene viste")).toBeVisible();
    expect(screen.getAllByLabelText("Scena da scoprire")).toHaveLength(12);
    expect(screen.queryByRole("button", { name: /Rivedi/ })).not.toBeInTheDocument();
  });

  it("replays generic scenes, or a chosen Leggendario", () => {
    const onReplay = vi.fn();
    render(<ScenesSection state={withScenes()} onReplay={onReplay} />);
    expect(screen.getByText("3 scene viste")).toBeVisible();
    expect(screen.getAllByLabelText("Scena da scoprire")).toHaveLength(9);

    const buttons = screen.getAllByRole("button", { name: /Rivedi/ });
    fireEvent.click(buttons[2]);
    expect(onReplay).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "inflation", increase: "+10%" }));
    // The cause is drawn again at every replay, as in September.
    const bodies = new Set(Array.from({ length: 20 }, () => {
      fireEvent.click(buttons[2]);
      return onReplay.mock.lastCall?.[0].body;
    }));
    expect(bodies.size).toBeGreaterThan(1);

    fireEvent.click(buttons[1]);
    expect(onReplay).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "legendary", name: "Leggendario" }));
    fireEvent.change(screen.getByLabelText("Dati da mostrare"), { target: { value: "eva-parodi" } });
    fireEvent.click(buttons[1]);
    expect(onReplay).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "legendary", name: "Eva Parodi" }));
  });
});

describe("describeFoundation", () => {
  const initial = createInitialState(1_000, "Verifica UI");
  const state: GameState = {
    ...initial,
    school: { ...initial.school, name: "Quarta", city: "Torino" },
    network: {
      ...initial.network,
      schoolCount: 3,
      schools: [
        { name: "Madre", city: "Genova", fame: 400 },
        { name: "Seconda", city: "Milano", fame: 100 },
        { name: "Terza", city: "Pisa" },
      ],
    },
  };

  it("rebuilds the scene of any sede on the map", () => {
    expect(getFoundationSceneNumbers(state)).toEqual([4, 3, 2]);
    const third = describeFoundation(state, 3);
    expect(third).toMatchObject({ number: 3, newcomerName: "Terza", newcomerCity: "Pisa", previousCity: "Milano", dropped: 0 });
    expect(third.kind === "foundation" && third.stars).toHaveLength(2);
    expect(describeFoundation(state, 4)).toMatchObject({ newcomerName: "Quarta", previousCity: "Pisa" });
  });

  it("keeps the stars but no names in the generic scene", () => {
    const generic = describeFoundation(state, 4, { generic: true });
    expect(generic).toMatchObject({ newcomerName: "Nuova sede", newcomerCity: "", previousCity: "" });
    expect(generic.kind === "foundation" && generic.stars).toHaveLength(3);
  });
});
