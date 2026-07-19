import { describe, expect, it } from "vitest";
import { getOfficialStatColor } from "./officialStatColor";

describe("getOfficialStatColor", () => {
  it("moves from red to black, then green, and becomes gold above 100", () => {
    expect(getOfficialStatColor(0)).toBe("rgb(196, 43, 28)");
    expect(getOfficialStatColor(20)).toBe("rgb(110, 33, 26)");
    expect(getOfficialStatColor(40)).toBe("rgb(23, 23, 23)");
    expect(getOfficialStatColor(50)).toBe("rgb(23, 23, 23)");
    expect(getOfficialStatColor(60)).toBe("rgb(23, 23, 23)");
    expect(getOfficialStatColor(80)).toBe("rgb(12, 76, 44)");
    expect(getOfficialStatColor(100)).toBe("rgb(0, 128, 64)");
    expect(getOfficialStatColor(100.001)).toBe("rgb(176, 128, 0)");
  });
});
