import type { StylePenaltyReason } from "../../game/types";
import { STYLE_PENALTY_LABEL } from "./stylePresentation";

/** Cartellino di Stile: a scacchi gialli e neri, diverso da quelli dell'Arena. */
export function StyleCardMark({ reason, large = false }: { reason: StylePenaltyReason; large?: boolean }) {
  const label = `Cartellino di Stile: ${STYLE_PENALTY_LABEL[reason]}, −0,5`;
  return (
    <span
      className={`style-card-mark${large ? " is-large" : ""}`}
      role="img"
      aria-label={label}
      title={label}
    />
  );
}
