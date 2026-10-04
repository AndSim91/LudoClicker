declare const __APP_VERSION__: string;

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

// Ora locale della macchina che compila: AAAA.MM.GG.hhmm
export function formatApplicationVersion(date: Date): string {
  return [
    pad(date.getFullYear(), 4),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()) + pad(date.getMinutes()),
  ].join(".");
}

export const APP_VERSION =
  typeof __APP_VERSION__ === "string"
    ? __APP_VERSION__
    : formatApplicationVersion(new Date());
