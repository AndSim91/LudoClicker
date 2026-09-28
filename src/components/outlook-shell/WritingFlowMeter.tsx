import type { CSSProperties } from "react";
import { GAME_CONFIG } from "../../game/config";
import { useGameSelector } from "../../game/GameStateContext";
import { useGameTime } from "../../game/GameTimeContext";
import type { GameState } from "../../game/types";
import {
  getFlowCap,
  getFlowMeterAt,
  getFlowMeterLimit,
  getFlowMultiplier,
} from "../../game/writingRhythm";

// Own component so the clock that animates the drain re-renders only this
// meter, never the whole composer.
export function WritingFlowMeter({ state: stateOverride }: { state?: GameState }) {
  const flow = useGameSelector((state) => state.player.flow, stateOverride);
  const cap = useGameSelector((state) => getFlowCap(state.upgrades), stateOverride);
  const clockNow = useGameTime(Boolean(flow) && cap > 1, GAME_CONFIG.progressUpdateIntervalMs);
  // Locked until "Ritmo di battitura" is bought.
  if (cap <= 1) return null;
  const now = flow ? Math.max(clockNow, flow.updatedAt) : clockNow;
  const meter = getFlowMeterAt(flow, now);
  const multiplier = getFlowMultiplier(meter, cap);
  // The bar is full at the current cap and split into one segment per step.
  const percent = Math.min(100, Math.round((meter / getFlowMeterLimit(cap)) * 100));

  return (
    <span
      className="composer-flow"
      data-multiplier={multiplier}
      data-max={multiplier === cap ? "true" : undefined}
      style={{ "--flow-steps": cap - 1 } as CSSProperties}
      role="meter"
      aria-label={`Flusso di scrittura ×${multiplier}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      {/* Light theme: a plausible Outlook status text, shown only above ×1. */}
      <span className="composer-flow-office">Velocità ×{multiplier}</span>
      {/* Onde theme: a glowing meter split in four steps. */}
      <span className="composer-flow-game" aria-hidden="true">
        <b>Flusso ×{multiplier}</b>
        <span className="composer-flow-track">
          <span style={{ width: `${percent}%` }} />
        </span>
      </span>
    </span>
  );
}
