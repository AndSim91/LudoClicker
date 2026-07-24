import type { CSSProperties } from "react";
import { GAME_CONFIG } from "../../game/config";

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
  const safeMax = Math.max(1, max);
  const boundedValue = Math.min(safeMax, Math.max(0, value));
  const accessibleValue = Math.round(boundedValue * 1_000) / 1_000;
  const percent = (boundedValue / safeMax) * 100;
  const indeterminate = forceIndeterminate || (
    durationMs !== undefined && durationMs < GAME_CONFIG.progressUpdateIntervalMs
  );
  const transitionIntervalMs = durationMs === undefined
    ? GAME_CONFIG.gameTickMs
    : GAME_CONFIG.progressUpdateIntervalMs;
  const progressStyle = variant === "circular"
    ? ({ "--progress-value": `${percent}%` } as CSSProperties)
    : undefined;
  const barStyle = variant === "linear" && !indeterminate
    ? ({
        width: `${percent}%`,
        "--progress-transition-duration": `${transitionIntervalMs}ms`,
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
      <span style={barStyle} />
    </span>
  );
}
