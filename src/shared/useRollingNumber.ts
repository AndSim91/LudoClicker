import { useEffect, useRef, useState } from "react";
import { motionReduced } from "./motion";

const ROLL_MS = 700;
const POP_COOLDOWN_MS = 2_500;

/**
 * The number on screen runs towards `value` instead of jumping. `pops` grows when
 * the value rises (at most once every 2,5 s), so a caller can key an animation on it.
 */
export function useRollingNumber(value: number): { shown: number; pops: number } {
  const [shown, setShown] = useState(value);
  const [pops, setPops] = useState(0);
  const shownRef = useRef(value);
  const lastPopRef = useRef(0);

  useEffect(() => {
    const from = shownRef.current;
    if (from === value) return;
    const now = performance.now();
    if (value > from && now - lastPopRef.current >= POP_COOLDOWN_MS) {
      lastPopRef.current = now;
      setPops((count) => count + 1);
    }
    const apply = (next: number) => {
      shownRef.current = next;
      setShown(next);
    };
    if (motionReduced() || typeof requestAnimationFrame !== "function") {
      apply(value);
      return;
    }
    let frame = requestAnimationFrame(function step() {
      // performance.now(), not the frame timestamp: that one can sit before `now`.
      const t = Math.min(1, Math.max(0, (performance.now() - now) / ROLL_MS));
      apply(t >= 1 ? value : from + (value - from) * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(step);
    });
    // A new value mid-roll starts from wherever the figure is now.
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return { shown, pops };
}
