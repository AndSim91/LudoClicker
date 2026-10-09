import { describe, expect, it } from "vitest";
import { TUTORIAL_SCENES } from "../../content/tutorialScenes";
import { getStepVoice, getTutorialVoice } from "./tutorialVoices";

describe("tutorial voices", () => {
  it("maps speakers to voices, with the Ordine for unsigned cards", () => {
    expect(getTutorialVoice("A.N.D.E.R.").id).toBe("ander");
    expect(getTutorialVoice("M.A.K.I.").id).toBe("maki");
    expect(getTutorialVoice("???").id).toBe("mystery");
    expect(getTutorialVoice("").id).toBe("neutral");
  });

  it("signs an objective with the last speaker before it", () => {
    const scene = TUTORIAL_SCENES.find(({ id }) => id === "first-invitation")!;
    const objective = scene.steps.findIndex(({ kind }) => kind === "objective");
    expect(getStepVoice(scene, objective).id).toBe("ander");
  });
});
