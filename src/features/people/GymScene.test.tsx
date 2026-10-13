import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getGymFighterCount, getGymSaberRarities, getGymStageIndex, GYM_STAGES } from "../../content/gymStages";
import { createInitialState } from "../../game/engine";
import { GymRackSwap } from "./GymRackSwap";
import { GymReferees } from "./GymReferees";
import { GymScene } from "./GymScene";

describe("GymScene", () => {
  it("picks the highest stage whose threshold is reached", () => {
    expect(GYM_STAGES[getGymStageIndex(0)].name).toBe("Sala in affitto");
    expect(GYM_STAGES[getGymStageIndex(49)].name).toBe("Prima rastrelliera");
    expect(GYM_STAGES[getGymStageIndex(100)].name).toBe("Allenamento di gruppo");
    expect(GYM_STAGES[getGymStageIndex(10_000)].name).toBe("Palazzetto");
  });

  it("names the current stage and the next milestone", () => {
    const initial = createInitialState(1_000);
    render(<GymScene state={{ ...initial, school: { ...initial.school, activeMembers: 0 } }} />);

    expect(screen.getByText("Sala in affitto")).toBeInTheDocument();
    expect(screen.getByText("Prossimo traguardo: prima rastrelliera, a 25 iscritti")).toBeInTheDocument();
  });

  it("puts three pairs on the mat from 100 members and the scoreboard in the palazzetto", () => {
    const initial = createInitialState(1_000);
    const view = render(<GymScene state={{ ...initial, school: { ...initial.school, activeMembers: 100 } }} />);
    expect(getGymFighterCount(100)).toBe(6);
    expect(view.container.querySelector(".gym-scoreboard")).toBeNull();
    view.rerender(<GymScene state={{ ...initial, school: { ...initial.school, activeMembers: 500 } }} />);
    expect(view.container.querySelector(".gym-stage")).toHaveClass("is-hall");
    expect(screen.getByText("Player 1 0 – 0 Player 2")).toBeInTheDocument();
    expect(view.container.querySelectorAll(".gym-judge")).toHaveLength(2);
    expect(view.container.querySelector(".gym-judge-card")).toBeNull();
  });

  it("raises the chequered card on the phone judge, white and yellow on the one in the blue T-shirt", () => {
    const view = render(<GymReferees card={{ id: 1, card: "style" }} />);
    expect(view.container.querySelector(".gym-judge.is-phone .gym-judge-card rect")).toHaveAttribute("fill", "url(#gym-checker)");
    expect(view.container.querySelector(".gym-judge.is-shirt .gym-judge-card")).toBeNull();
    view.rerender(<GymReferees card={{ id: 2, card: "yellow" }} />);
    expect(view.container.querySelector(".gym-judge.is-shirt .gym-judge-card rect")).toHaveAttribute("fill", "#ffd166");
    expect(view.container.querySelector(".gym-judge.is-phone .gym-judge-card")).toBeNull();
  });

  it("keeps the Style judge on his chair, which stays there when he gets up", () => {
    const view = render(<GymReferees />);
    const head = () => view.container.querySelector(".gym-judge.is-phone .gym-judge-ink")?.getAttribute("cy");
    expect(view.container.querySelectorAll(".gym-judge-chair")).toHaveLength(1);
    expect(head()).toBe("106");
    view.rerender(<GymReferees styleJudgeUp />);
    expect(view.container.querySelectorAll(".gym-judge-chair")).toHaveLength(1);
    expect(head()).toBe("100");
  });

  it("lets the Style judge write on Servizio with both hands, but not while his card is up", () => {
    const view = render(<GymReferees reading />);
    expect(view.container.querySelectorAll(".gym-judge.is-phone .gym-judge-tap")).toHaveLength(3);
    view.rerender(<GymReferees reading card={{ id: 1, card: "style" }} />);
    expect(view.container.querySelectorAll(".gym-judge-tap")).toHaveLength(0);
    view.rerender(<GymReferees reading styleJudgeUp />);
    expect(view.container.querySelectorAll(".gym-judge.is-phone .gym-judge-tap")).toHaveLength(3);
  });

  it("walks an athlete to the rack and back with another blade, waiting for the rack", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    let free = false;
    const rack = { claim: () => free, release: vi.fn() };
    const view = render(<GymRackSwap id={7} homeX={170} sabers={["#4aa8ff", "#ffd166"]} rack={rack} onDone={onDone} />);
    // It appears on its own spot, then walks: never drawn straight at the rack.
    const walker = () => view.container.querySelector<HTMLElement>(".gym-walker")!;
    expect(walker().style.getPropertyValue("--dx")).toBe("0");
    act(() => vi.advanceTimersByTime(100));
    expect(walker()).toHaveClass("is-walking");
    // One phase per timer: let React render between them.
    const run = (steps: number) => {
      for (let step = 0; step < steps; step += 1) act(() => vi.advanceTimersByTime(7_000));
    };
    run(4);
    expect(view.container.querySelector(".gym-walker")).not.toHaveClass("is-walking");
    expect(onDone).not.toHaveBeenCalled();
    free = true;
    run(12);
    expect(onDone).toHaveBeenCalledWith(7);
    expect(rack.release).toHaveBeenCalledWith(7);
    expect(view.container.querySelector(".gym-saber-line")).toHaveStyle({ color: "#ffd166" });
    vi.useRealTimers();
  });

  it("shows every rarity the school has before filling the mat by member share", () => {
    expect(getGymSaberRarities({ common: 40 }, 2)).toEqual(["common", "common"]);
    expect(getGymSaberRarities({ common: 40, legendary: 1 }, 1)).toEqual(["legendary"]);
    expect(getGymSaberRarities({ common: 30, "secret-legendary": 1, legendary: 2 }, 2)).toEqual([
      "secret-legendary",
      "legendary",
    ]);
    expect(getGymSaberRarities({ common: 150, rare: 30, "ultra-rare": 10, legendary: 3 }, 6)).toEqual([
      "legendary",
      "ultra-rare",
      "rare",
      "rare",
      "common",
      "common",
    ]);
    expect(getGymSaberRarities({ rare: 10, common: 10 }, 6)).toEqual([
      "rare",
      "rare",
      "rare",
      "common",
      "common",
      "common",
    ]);
  });
});
