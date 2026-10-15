import { describe, expect, it } from "vitest";
import { formatApplicationVersion } from "./appVersion";

describe("formatApplicationVersion", () => {
  it("formats the build time as AAAA.MM.GG.hhmm in Italian time, whatever the machine", () => {
    // 13:27 UTC is 15:27 in Rome in summer time, 14:54 UTC is 15:54 in winter.
    expect(formatApplicationVersion(new Date(Date.UTC(2026, 9, 15, 13, 27)))).toBe("2026.10.15.1527");
    expect(formatApplicationVersion(new Date(Date.UTC(2026, 11, 4, 14, 54, 59)))).toBe("2026.12.04.1554");
  });

  it("pads midnight and moves the day across midnight", () => {
    expect(formatApplicationVersion(new Date(Date.UTC(2026, 0, 4, 23, 7)))).toBe("2026.01.05.0007");
    expect(formatApplicationVersion(new Date(Date.UTC(2026, 11, 31, 22, 59)))).toBe("2026.12.31.2359");
  });
});
