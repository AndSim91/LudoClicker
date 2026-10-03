import { getOfficialStatPresentation } from "../../shared/officialStatColor";
import { formatStat } from "../../shared/formatters";

export function OfficialStatValue({ value }: { value: number }) {
  const presentation = getOfficialStatPresentation(value);

  return (
    <strong
      className="official-stat-value"
      style={presentation.style}
      data-outlined={presentation.outlined || undefined}
    >
      {formatStat(value)}
    </strong>
  );
}
