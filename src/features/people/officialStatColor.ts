type RgbColor = readonly [red: number, green: number, blue: number];

const RED: RgbColor = [196, 43, 28];
const BLACK: RgbColor = [23, 23, 23];
const GREEN: RgbColor = [0, 128, 64];
const GOLD: RgbColor = [176, 128, 0];

function mixColor(from: RgbColor, to: RgbColor, progress: number): string {
  const channels = from.map((channel, index) =>
    Math.round(channel + (to[index] - channel) * progress),
  );
  return `rgb(${channels.join(", ")})`;
}

export function getOfficialStatColor(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;

  if (safeValue > 100) return mixColor(GOLD, GOLD, 0);
  if (safeValue < 40) return mixColor(RED, BLACK, safeValue / 40);
  if (safeValue <= 60) return mixColor(BLACK, BLACK, 0);
  return mixColor(BLACK, GREEN, (safeValue - 60) / 40);
}
