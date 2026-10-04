import { describe, expect, it } from "vitest";
import { formatApplicationVersion } from "./appVersion";

describe("formatApplicationVersion", () => {
  it("formats the build date and time as AAAA.MM.GG.hhmm", () => {
    expect(formatApplicationVersion(new Date(2026, 9, 4, 14, 54, 59))).toBe("2026.10.04.1454");
  });

  it("pads midnight and single-digit fields with zeros", () => {
    expect(formatApplicationVersion(new Date(2026, 0, 5, 0, 7))).toBe("2026.01.05.0007");
    expect(formatApplicationVersion(new Date(2026, 11, 31, 23, 59))).toBe("2026.12.31.2359");
  });
});
