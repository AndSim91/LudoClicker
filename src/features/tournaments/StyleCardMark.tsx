import type { StylePenaltyReason } from "../../game/types";
import { describePenalty, STYLE_PENALTY_LABEL } from "./stylePresentation";

/** Cartellino di Stile: a scacchi gialli e neri, diverso da quelli dell'Arena. */
export function StyleCardMark({
  reason,
  count = 1,
  large = false,
}: {
  reason: StylePenaltyReason;
  /** Sanzioni scritte sul cartellino (una o più). */
  count?: number;
  large?: boolean;
}) {
  const label = `Cartellino di Stile: ${STYLE_PENALTY_LABEL[reason]}, ${describePenalty(count)}`;
  return (
    <span
      className={`style-card-mark${large ? " is-large" : ""}`}
      role="img"
      aria-label={label}
      title={label}
    />
  );
}
