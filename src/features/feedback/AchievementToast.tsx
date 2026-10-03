import { useEffect, useRef, useState } from "react";
import { ACHIEVEMENT_TOTAL, describeAchievementKey } from "../../content/achievements";
import { useGameSelector } from "../../game/GameStateContext";
import type { AchievementKey, GameState } from "../../game/types";

const TOAST_LIFETIME_MS = 5_000;

interface ToastContent {
  id: number;
  label: string;
  title: string;
  detail: string;
  tier: "gold" | "silver" | "bronze";
}

function selectAchievements(state: GameState): readonly AchievementKey[] {
  return state.achievements;
}

function describeBatch(added: readonly AchievementKey[], total: number, id: number): ToastContent {
  const last = added.at(-1)!;
  const tier = last.endsWith(":silver") ? "silver" : last.endsWith(":bronze") ? "bronze" : "gold";
  if (added.length === 1) {
    const [title, level] = describeAchievementKey(last).split(" · ");
    return {
      id,
      label: level ? `Traguardo sbloccato · ${level}` : "Traguardo segreto svelato",
      title,
      detail: `${total} / ${ACHIEVEMENT_TOTAL} traguardi · LudoWiki › Traguardi`,
      tier,
    };
  }
  return {
    id,
    label: "Traguardi sbloccati",
    title: `${added.length} nuovi traguardi`,
    detail: `${total} / ${ACHIEVEMENT_TOTAL} traguardi · LudoWiki › Traguardi`,
    tier,
  };
}

/**
 * Unlock notification (4.4): a console-style pill in Modalità Onde, a sober
 * Windows-style notification in the Outlook theme. The style comes from the
 * theme in CSS; a batch of unlocks (an old save after the update) is one toast.
 */
export function AchievementToast({ state: stateOverride }: { state?: GameState }) {
  const achievements = useGameSelector(selectAchievements, stateOverride);
  const knownRef = useRef(new Set(achievements));
  const nextIdRef = useRef(0);
  const [toast, setToast] = useState<ToastContent | null>(null);

  useEffect(() => {
    const added = achievements.filter((key) => !knownRef.current.has(key));
    knownRef.current = new Set(achievements);
    if (added.length === 0) return;
    nextIdRef.current += 1;
    setToast(describeBatch(added, achievements.length, nextIdRef.current));
  }, [achievements]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_LIFETIME_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  return (
    <div key={toast.id} className={`achievement-toast is-${toast.tier}`} role="status">
      <svg className="achievement-toast-medal" width="48" height="48" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M14 6 L20 13 L26 6" />
        <circle cx="20" cy="23" r="10" />
      </svg>
      <span className="achievement-toast-copy">
        <small>{toast.label}</small>
        <strong>{toast.title}</strong>
        <span>{toast.detail}</span>
      </span>
      <button type="button" aria-label="Chiudi la notifica" onClick={() => setToast(null)}>×</button>
    </div>
  );
}
