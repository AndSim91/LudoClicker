import { useId } from "react";
import type { MemberPermanence } from "./peoplePresentation";

/** C3 «Frase pulita» (14/10/2026): dot and mood in the row, the reasons on hover or focus. */
export function MemberPermanenceLabel({ permanence }: { permanence: MemberPermanence }) {
  const tipId = useId();
  return (
    <span className="member-permanence" data-level={permanence.level} tabIndex={0} aria-describedby={tipId}>
      <i className="member-permanence-dot" aria-hidden="true" />
      {permanence.label}
      <span className="member-permanence-tip" id={tipId} role="tooltip">
        {permanence.detail}
      </span>
    </span>
  );
}
