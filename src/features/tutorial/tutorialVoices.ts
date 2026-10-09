import type { TutorialSceneDefinition } from "../../content/tutorialScenes";

/**
 * Who talks in a tutorial card (09/10/2026): A.N.D.E.R. red, M.A.K.I. Caribbean
 * blue, «???» slate for the incipit before a voice reveals itself, and the
 * Ordine delle Onde (gold, emblem) for the cards nobody signs.
 */
export type TutorialVoiceId = "ander" | "maki" | "mystery" | "neutral";

export interface TutorialVoice {
  id: TutorialVoiceId;
  name: string;
  /** Letter in the round badge; empty for the Ordine emblem. */
  monogram: string;
  role: string;
}

const VOICES: Record<string, TutorialVoice> = {
  "A.N.D.E.R.": { id: "ander", name: "A.N.D.E.R.", monogram: "A", role: "Assistente della scuola" },
  "M.A.K.I.": { id: "maki", name: "M.A.K.I.", monogram: "M", role: "Assistente dei tornei" },
  "???": { id: "mystery", name: "???", monogram: "?", role: "Mittente sconosciuto" },
};

const NEUTRAL_VOICE: TutorialVoice = {
  id: "neutral",
  name: "Ordine delle Onde",
  monogram: "",
  role: "Guida di gioco",
};

export function getTutorialVoice(speaker: string | undefined): TutorialVoice {
  return (speaker && VOICES[speaker]) || NEUTRAL_VOICE;
}

/** An objective is signed by whoever spoke last before it in the scene. */
export function getStepVoice(scene: TutorialSceneDefinition, stepIndex: number): TutorialVoice {
  for (let index = stepIndex; index >= 0; index -= 1) {
    const step = scene.steps[index];
    if (step?.kind === "dialog") return getTutorialVoice(step.speaker);
  }
  return NEUTRAL_VOICE;
}
