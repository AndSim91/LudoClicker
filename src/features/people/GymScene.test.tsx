import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getGymSaberRarities, getGymStageIndex, GYM_STAGES } from "../../content/gymStages";
import { createInitialState } from "../../game/engine";
import { GymScene } from "./GymScene";

describe("GymScene", () => {
  it("picks the highest stage whose threshold is reached", () => {
    expect(GYM_STAGES[getGymStageIndex(0)].name).toBe("Palestra vuota");
    expect(GYM_STAGES[getGymStageIndex(19)].name).toBe("Primo sparring");
    expect(GYM_STAGES[getGymStageIndex(20)].name).toBe("Rastrelliera delle spade");
    expect(GYM_STAGES[getGymStageIndex(10_000)].name).toBe("Tribuna piena");
  });

  it("names the current stage and the next milestone", () => {
    const initial = createInitialState(1_000);
    render(<GymScene state={{ ...initial, school: { ...initial.school, activeMembers: 0 } }} />);

    expect(screen.getByText("Palestra vuota")).toBeInTheDocument();
    expect(screen.getByText("Prossimo traguardo: primo allievo a 1 iscritto attivo")).toBeInTheDocument();
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
