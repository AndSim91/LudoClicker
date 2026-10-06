import type { CSSProperties } from "react";
import { GAME_CONFIG } from "../../game/config";
import { useGameTimeSource } from "../../game/GameTimeContext";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  label?: string;
  ariaHidden?: boolean;
  durationMs?: number;
  variant?: "linear" | "circular";
  title?: string;
  valueText?: string;
  indeterminate?: boolean;
  paused?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  className = "",
  label,
  ariaHidden = false,
  durationMs,
  variant = "linear",
  title,
  valueText,
  indeterminate: forceIndeterminate = false,
  paused = false,
}: ProgressBarProps) {
  const time = useGameTimeSource();
  const safeMax = Math.max(1, max);
  const boundedValue = Math.min(safeMax, Math.max(0, value));
  const accessibleValue = Math.round(boundedValue * 1_000) / 1_000;
  const percent = (boundedValue / safeMax) * 100;
  // Game ms that pass between two UI updates.
  const updateGameMs = time?.updateIntervalMs
    ? time.updateIntervalMs * time.speed
    : GAME_CONFIG.progressUpdateIntervalMs;
  const indeterminate = forceIndeterminate || (
    durationMs !== undefined && durationMs < updateGameMs
  );
  // The UI updates once per game step and the fill glides there in one step (the
  // duration comes from the shell). A timed bar aims one update ahead, so the glide
  // arrives when the game does, instead of trailing one step behind.
  const shownPercent = durationMs !== undefined && durationMs > 0 && time && !time.isPaused
    ? Math.min(100, percent + (updateGameMs / durationMs) * 100)
    : percent;
  // Linear bars move a full-width fill with a transform instead of changing its
  // width: the compositor animates it, so a running bar needs no main-thread frames.
  const progressStyle = variant === "circular"
    ? ({ "--progress-value": `${percent}%` } as CSSProperties)
    : !indeterminate
      ? ({
          "--progress": shownPercent / 100,
          "--progress-shift": `${shownPercent - 100}%`,
        } as CSSProperties)
      : undefined;
  const classes = [
    "progress-bar",
    `progress-bar-${variant}`,
    indeterminate ? "is-indeterminate" : "",
    indeterminate && paused ? "is-paused" : "",
    className,
  ].filter(Boolean).join(" ");
  return (
    <span
      className={classes}
      role={ariaHidden ? undefined : "progressbar"}
      aria-label={ariaHidden ? undefined : label}
      aria-hidden={ariaHidden || undefined}
      aria-valuemin={ariaHidden ? undefined : 0}
      aria-valuemax={ariaHidden ? undefined : safeMax}
      aria-valuenow={ariaHidden || indeterminate ? undefined : accessibleValue}
      aria-valuetext={ariaHidden
        ? undefined
        : indeterminate ? valueText ?? "Avanzamento in corso" : valueText}
      title={title}
      style={progressStyle}
    >
      <span />
    </span>
  );
}
