import { useEffect, useState } from "react";

/** The Style judge starts writing a moment after the «OH!» and looks up again after a few seconds. */
export const JUDGE_READ_DELAY_MS = 400;
export const JUDGE_READ_MS = 2_500;

/**
 * True for `durationMs`, starting `delayMs` after `trigger` changes; nothing
 * while `trigger` is 0. Any counter works: points scored, cards raised.
 */
export function useBriefFlag(trigger: number, delayMs: number, durationMs: number): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (trigger <= 0) return undefined;
    const start = window.setTimeout(() => setOn(true), delayMs);
    const stop = window.setTimeout(() => setOn(false), delayMs + durationMs);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
      setOn(false);
    };
  }, [trigger, delayMs, durationMs]);
  return on;
}

/** True while the Style judge writes on Servizio after the latest point. */
export const useJudgeReading = (points: number) => useBriefFlag(points, JUDGE_READ_DELAY_MS, JUDGE_READ_MS);
