declare const __APP_VERSION__: string;

export function formatApplicationVersion(date: Date): string {
  const secondsSinceMidnight =
    date.getHours() * 60 * 60 +
    date.getMinutes() * 60 +
    date.getSeconds() +
    date.getMilliseconds() / 1000;
  const sequence = Math.floor((secondsSinceMidnight / 86_400) * 1_000);

  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(sequence).padStart(3, "0"),
  ].join(".");
}

export const APP_VERSION =
  typeof __APP_VERSION__ === "string"
    ? __APP_VERSION__
    : formatApplicationVersion(new Date());
