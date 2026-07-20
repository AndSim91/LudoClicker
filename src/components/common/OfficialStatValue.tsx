import { getOfficialStatPresentation } from "../../shared/officialStatColor";

export function OfficialStatValue({ value }: { value: number }) {
  const presentation = getOfficialStatPresentation(value);

  return (
    <strong
      className="official-stat-value"
      style={presentation.style}
      data-outlined={presentation.outlined || undefined}
    >
      {value.toFixed(3)}
    </strong>
  );
}
