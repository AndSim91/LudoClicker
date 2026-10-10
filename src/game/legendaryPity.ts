// Pity (10/10): only failed Leggendario trials count, +5% each, no cap.
const CHANCE_PER_PITY_POINT = 0.05;

export function applyLegendaryPityBonus(
  enrollmentChance: number,
  legendaryPity: number,
): number {
  return Math.min(1, enrollmentChance + legendaryPity * CHANCE_PER_PITY_POINT);
}

export function incrementLegendaryPity(legendaryPity: number): number {
  return Math.min(Number.MAX_SAFE_INTEGER, legendaryPity + 1);
}

export function updateLegendaryPityAfterTrial(
  legendaryPity: number,
  enrolled: boolean,
  isLegendaryTrial: boolean,
): number {
  if (!isLegendaryTrial) return legendaryPity;
  return enrolled ? 0 : incrementLegendaryPity(legendaryPity);
}
