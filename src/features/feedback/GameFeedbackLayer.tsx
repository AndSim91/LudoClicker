import { useEffect, useRef, useState } from "react";
import { useGameSelector } from "../../game/GameStateContext";
import type { GameState } from "../../game/types";
import {
  diffFeedback,
  takeFeedbackSnapshot,
  type FeedbackEvent,
  type FeedbackKind,
} from "./feedbackEvents";

interface FloatingFeedback extends FeedbackEvent {
  id: number;
  x: number;
  y: number;
  fromTop: boolean;
}

// Where each pop starts. A missing anchor (another page is open) skips the pop.
const ANCHORS: Record<FeedbackKind, string> = {
  member: '[aria-label^="Iscritti attivi"]',
  fees: ".title-balance",
  flow: ".composer-flow",
  perfect: ".mail-body .text-caret",
};

const POP_LIFETIME_MS = 1_600;
const MAX_VISIBLE = 6;

function selectFeedbackSlices(state: GameState) {
  return {
    contacts: state.contacts,
    school: state.school,
    statistics: state.statistics,
    player: state.player,
  };
}

function isSameFeedbackSlices(
  left: ReturnType<typeof selectFeedbackSlices>,
  right: ReturnType<typeof selectFeedbackSlices>,
) {
  return left.contacts === right.contacts &&
    left.school.currentMonth === right.school.currentMonth &&
    left.statistics.eurosEarned === right.statistics.eurosEarned &&
    left.player === right.player;
}

/**
 * Floating numbers for the moments that matter: a new member, the monthly fees,
 * a higher Flusso step and a Frase perfetta. Styling decides how loud they are:
 * full in Modalità Onde, discreet in the light theme, hidden with reduced motion.
 */
export function GameFeedbackLayer({ state: stateOverride }: { state?: GameState }) {
  const slices = useGameSelector(selectFeedbackSlices, stateOverride, isSameFeedbackSlices);
  const snapshotRef = useRef(takeFeedbackSnapshot(slices));
  const nextIdRef = useRef(0);
  const [items, setItems] = useState<FloatingFeedback[]>([]);

  useEffect(() => {
    const next = takeFeedbackSnapshot(slices);
    const events = diffFeedback(snapshotRef.current, next, slices.contacts);
    snapshotRef.current = next;
    if (events.length === 0) return;

    const placed = events.flatMap((event, index) => {
      const anchor = document.querySelector(ANCHORS[event.kind]);
      if (!anchor) return [];
      const box = anchor.getBoundingClientRect();
      const fromTop = box.top < 48;
      nextIdRef.current += 1;
      return [{
        ...event,
        id: nextIdRef.current,
        x: box.left + box.width / 2,
        // Start just above the anchor so the pop never covers the number it explains;
        // title-bar anchors have no room above, so their pops start just below.
        y: fromTop ? box.bottom + 22 + index * 18 : box.top - 6 - index * 18,
        fromTop,
      }];
    });
    if (placed.length === 0) return;
    setItems((current) => [...current, ...placed].slice(-MAX_VISIBLE));
    const ids = new Set(placed.map((item) => item.id));
    window.setTimeout(
      () => setItems((current) => current.filter((item) => !ids.has(item.id))),
      POP_LIFETIME_MS,
    );
  }, [slices]);

  return (
    <div className="feedback-layer" aria-hidden="true">
      {items.map((item) => (
        <span
          key={item.id}
          className={`feedback-pop is-${item.kind}${item.rarity ? ` rarity-${item.rarity}` : ""}${item.fromTop ? " from-top" : ""}`}
          style={{ left: item.x, top: item.y }}
        >
          <b>{item.text}</b>
          {item.detail ? <small>{item.detail}</small> : null}
        </span>
      ))}
    </div>
  );
}
