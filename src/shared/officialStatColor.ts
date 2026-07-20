import type { CSSProperties } from "react";

type OfficialStatToken = 0 | 50 | 100 | 150 | 200 | 250 | 300;

type OfficialStatStyle = CSSProperties & {
  "--official-stat-from": string;
  "--official-stat-to": string;
  "--official-stat-from-weight": string;
  "--official-stat-to-weight": string;
};

export interface OfficialStatPresentation {
  style: OfficialStatStyle;
  outlined: boolean;
}

function createStyle(
  from: OfficialStatToken,
  to: OfficialStatToken,
  progress: number,
): OfficialStatStyle {
  const toWeight = Math.max(0, Math.min(1, progress));
  return {
    "--official-stat-from": `var(--official-stat-${from})`,
    "--official-stat-to": `var(--official-stat-${to})`,
    "--official-stat-from-weight": `${(1 - toWeight) * 100}%`,
    "--official-stat-to-weight": `${toWeight * 100}%`,
  };
}

export function getOfficialStatPresentation(value: number): OfficialStatPresentation {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;

  if (safeValue < 50) {
    return { style: createStyle(0, 50, safeValue / 50), outlined: false };
  }
  if (safeValue < 100) {
    return { style: createStyle(50, 100, (safeValue - 50) / 50), outlined: false };
  }
  if (safeValue < 150) {
    return { style: createStyle(100, 150, (safeValue - 100) / 50), outlined: false };
  }
  if (safeValue < 200) {
    return { style: createStyle(150, 200, (safeValue - 150) / 50), outlined: false };
  }
  if (safeValue < 250) {
    return { style: createStyle(200, 250, 0), outlined: false };
  }
  if (safeValue < 300) {
    return { style: createStyle(250, 300, (safeValue - 250) / 50), outlined: true };
  }
  return { style: createStyle(300, 300, 0), outlined: true };
}
