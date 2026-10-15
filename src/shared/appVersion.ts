declare const __APP_VERSION__: string;

// Ora italiana, qualunque sia il fuso della macchina che compila (Vercel è in UTC): AAAA.MM.GG.hhmm
const ROME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatApplicationVersion(date: Date): string {
  const part = Object.fromEntries(ROME.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${part.year}.${part.month}.${part.day}.${part.hour}${part.minute}`;
}

export const APP_VERSION =
  typeof __APP_VERSION__ === "string"
    ? __APP_VERSION__
    : formatApplicationVersion(new Date());
