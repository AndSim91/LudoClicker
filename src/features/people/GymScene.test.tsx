import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getGymFighterCount, getGymSaberRarities, getGymStageIndex, GYM_STAGES } from "../../content/gymStages";
import { createInitialState } from "../../game/engine";
import { GymRackSwap } from "./GymRackSwap";
import { BoutPair } from "../arena/BoutPair";
import { startBoutView } from "../arena/boutChoreography";
import { GymReferees } from "./GymReferees";
import { getGymLayout, getRackSide } from "./gymHall";
import { GymScene } from "./GymScene";

describe("GymScene", () => {
  it("picks the highest stage whose threshold is reached", () => {
    expect(GYM_STAGES[getGymStageIndex(0)].name).toBe("Sala in affitto");
    expect(GYM_STAGES[getGymStageIndex(49)].name).toBe("Prima rastrelliera");
    expect(GYM_STAGES[getGymStageIndex(100)].name).toBe("Allenamento di gruppo");
    expect(GYM_STAGES[getGymStageIndex(999)].name).toBe("Palazzetto");
    expect(GYM_STAGES[getGymStageIndex(10_000)].name).toBe("Stadio delle Onde");
  });

  it("names the current stage and the next milestone", () => {
    const initial = createInitialState(1_000);
    render(<GymScene state={{ ...initial, school: { ...initial.school, activeMembers: 0 } }} />);

    expect(screen.getByText("Sala in affitto")).toBeInTheDocument();
    expect(screen.getByText("Prossimo traguardo: prima rastrelliera, a 25 iscritti")).toBeInTheDocument();
  });

  it("puts three pairs on the mat from 100 members, five and two racks at the championship", () => {
    const initial = createInitialState(1_000);
    const at = (activeMembers: number) => <GymScene state={{ ...initial, school: { ...initial.school, activeMembers } }} />;
    const view = render(at(100));
    expect(getGymFighterCount(100)).toBe(6);
    view.rerender(at(500));
    expect(view.container.querySelector(".gym-stage")).toHaveClass("is-hall");
    expect(view.container.querySelectorAll(".gym-judge")).toHaveLength(2);
    expect(view.container.querySelector(".gym-judge-card")).toBeNull();
    expect(view.container.querySelectorAll(".gym-rack")).toHaveLength(1);
    expect(screen.getByText(/^Prossimo traguardo: arena delle Onde, a 1.?000 iscritti$/)).toBeInTheDocument();
    view.rerender(at(2_000));
    expect(getGymFighterCount(2_000)).toBe(10);
    expect(view.container.querySelectorAll(".gym-rack")).toHaveLength(2);
    expect(view.container.querySelector(".gym-led")).not.toBeNull();
  });

  it("writes only the «OH!» in the Scuola's bouts, the technique names in the tournaments", () => {
    const view = {
      ...startBoutView(),
      effects: [
        { id: 1, kind: "tech" as const, x: 320, y: 60, moment: { kind: "SAPD" as const, name: "Disarmo" } },
        { id: 2, kind: "oh" as const, x: 320, y: 70 },
      ],
    };
    const props = { view, stage: { left: 290, right: 352 }, sabers: { a: "#6fb6ff", b: "#ffd166" } };
    const tournament = render(<svg><BoutPair {...props} /></svg>);
    expect(tournament.container.querySelector(".fd-tech")).not.toBeNull();
    tournament.unmount();
    const school = render(<svg><BoutPair {...props} techniqueNames={false} /></svg>);
    expect(school.container.querySelector(".fd-tech")).toBeNull();
    expect(school.container.querySelector(".fd-oh")).toHaveTextContent("OH!");
  });

  it("sends each pair to the rack on its own side from the championship", () => {
    const onde = getGymLayout(GYM_STAGES.findIndex((stage) => stage.name === "Arena delle Onde"));
    expect(onde.racks).toEqual([1, -1]);
    expect(onde.pairSpots.map((_, pair) => getRackSide(onde, pair))).toEqual([1, 1, 1]);
    const championship = getGymLayout(GYM_STAGES.findIndex((stage) => stage.name === "Arena da Campionato"));
    // Central, inner left, inner right, outer left, outer right.
    expect(championship.pairSpots.map((_, pair) => getRackSide(championship, pair))).toEqual([1, -1, 1, -1, 1]);
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

  it("lets the Style judge write on Servizio and look up (S2), but not while his card is up", () => {
    const view = render(<GymReferees reading />);
    const writing = () => view.container.querySelectorAll(".gym-judge.is-phone .judge-finger, .gym-judge.is-phone .judge-head-up");
    expect(writing()).toHaveLength(2);
    expect(view.container.querySelector(".gym-judge.is-phone text")).toBeNull();
    view.rerender(<GymReferees reading card={{ id: 1, card: "style" }} />);
    expect(writing()).toHaveLength(0);
    view.rerender(<GymReferees reading styleJudgeUp />);
    expect(writing()).toHaveLength(2);
  });

  it("walks a pair to the rack and back with other blades, waiting for the rack", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    let free = false;
    const rack = { claim: () => free, release: vi.fn() };
    const view = render(
      <GymRackSwap id={7} homes={[170, 232]} sabers={[["#4aa8ff", "#ffd166"], ["#6bf0b0", "#d4aeff"]]} rack={rack} onDone={onDone} />,
    );
    expect(view.container.querySelectorAll(".gym-walker")).toHaveLength(2);
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
    const blades = view.container.querySelectorAll(".gym-saber-line");
    expect(blades[0]).toHaveStyle({ color: "#ffd166" });
    expect(blades[1]).toHaveStyle({ color: "#d4aeff" });
    vi.useRealTimers();
  });

  it("walks to the left rack facing left", () => {
    vi.useFakeTimers();
    const rack = { claim: () => true, release: vi.fn() };
    const view = render(
      <GymRackSwap id={8} homes={[-50, 12]} sabers={[["#4aa8ff", "#ffd166"], ["#6bf0b0", "#d4aeff"]]} rack={rack} onDone={vi.fn()} side={-1} />,
    );
    const walkers = () => [...view.container.querySelectorAll<HTMLElement>(".gym-walker")].map((walker) => Number(walker.style.getPropertyValue("--dx")));
    for (let step = 0; step < 5; step += 1) act(() => vi.advanceTimersByTime(7_000));
    // At the left rack (stop at 640 − 742 = −102): the left athlete leads, the other a step behind.
    expect(walkers()).toEqual([-102 - -50, -102 + 36 - 12]);
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
