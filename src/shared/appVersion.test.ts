import { describe, expect, it } from "vitest";
import { formatApplicationVersion } from "./appVersion";

describe("formatApplicationVersion", () => {
  it("formats the date and floors the time sequence to three digits", () => {
    const date = new Date(2026, 6, 21, 16, 0, 28, 900);

    expect(formatApplicationVersion(date)).toBe("2026.07.21.667");
  });

  it("starts at 000 at midnight and reaches 999 before the next day", () => {
    expect(formatApplicationVersion(new Date(2026, 6, 21, 0, 0, 0))).toBe("2026.07.21.000");
    expect(formatApplicationVersion(new Date(2026, 6, 21, 23, 59, 59, 999))).toBe("2026.07.21.999");
  });
});
