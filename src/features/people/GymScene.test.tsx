import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getGymFighterCount, getGymSaberRarities, getGymStageIndex, GYM_STAGES } from "../../content/gymStages";
import { createInitialState } from "../../game/engine";
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
