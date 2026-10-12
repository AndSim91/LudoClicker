import { useLayoutEffect, type RefObject } from "react";

const MIN_SCALE = 0.75;
const MAX_SCALE = 1.25;

/**
 * Sezioni senza scorrimento (Andrea, 12/10): every `[data-fit-cell]` inside the
 * root holds one `.annual-fit` child, and all of them share one scale
 * (`--fit-scale`, 75–125%) so the whole page fits the window. Below 75% the page
 * grows taller instead (`--fit-stretch`) and the root scrolls. Cells marked
 * `data-fit-row="n"` share the height by what they hold (`--fit-row-n`, in fr),
 * so a tall row doesn't shrink the whole page while the other has room to spare.
 * Only CSS variables change here, never React state: measuring can't loop renders.
 */
export function useSharedFit(rootRef: RefObject<HTMLElement | null>, key: unknown) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const cells = () => [...root.querySelectorAll<HTMLElement>("[data-fit-cell]")];
    const set = (name: string, value: number) => {
      const current = Number(root.style.getPropertyValue(name) || 1);
      if (Math.abs(current - value) > 0.002) root.style.setProperty(name, value.toFixed(4));
    };
    /** Largest scale at which every cell holds its content, at the scale now applied. */
    const room = () => Math.min(...cells().map((cell) => {
      const content = cell.firstElementChild as HTMLElement | null;
      if (!content) return MAX_SCALE;
      return Math.min(cell.clientHeight / Math.max(1, content.scrollHeight), cell.clientWidth / Math.max(1, content.scrollWidth));
    }));
    /** Each row as tall as its tallest content, in proportion. */
    const shareRows = () => {
      const rows = new Map<string, number>();
      for (const cell of cells()) {
        const row = cell.dataset.fitRow;
        const content = cell.firstElementChild as HTMLElement | null;
        if (row && content) rows.set(row, Math.max(rows.get(row) ?? 0, content.scrollHeight));
      }
      for (const [row, height] of rows) {
        const value = `${Math.max(1, Math.round(height))}fr`;
        if (root.style.getPropertyValue(`--fit-row-${row}`) !== value) root.style.setProperty(`--fit-row-${row}`, value);
      }
    };
    const fit = () => {
      frame = 0;
      if (cells().length === 0 || window.matchMedia?.("(max-width: 760px)").matches) {
        set("--fit-scale", 1);
        set("--fit-stretch", 1);
        return;
      }
      set("--fit-stretch", 1);
      // The content width follows the scale, so a few rounds settle it.
      let scale = MAX_SCALE;
      for (let round = 0; round < 8; round += 1) {
        set("--fit-scale", scale);
        shareRows();
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, room()));
        if (Math.abs(next - scale) < 0.003) break;
        scale = next;
      }
      for (let round = 0; round < 20 && scale > MIN_SCALE && room() < scale - 0.003; round += 1) {
        scale = Math.max(MIN_SCALE, scale * 0.97);
        set("--fit-scale", scale);
      }
      // Under 75%: the page grows taller and scrolls instead of shrinking further.
      let stretch = 1;
      for (let round = 0; round < 5; round += 1) {
        const short = room();
        if (short >= scale - 0.003 || stretch >= 4) break;
        stretch = Math.min(4, stretch * (scale / short) * 1.01);
        set("--fit-stretch", stretch);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(fit); };
    fit();
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    for (const cell of cells()) if (cell.firstElementChild) observer.observe(cell.firstElementChild);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [rootRef, key]);
}
