import { describe, expect, it } from "vitest";
import { getRarityClassName } from "./rarityPresentation";

describe("getRarityClassName", () => {
  it("uses the standard rarity class for regular athletes", () => {
    expect(getRarityClassName("common")).toBe("rarity-common");
    expect(getRarityClassName("rare")).toBe("rarity-rare");
    expect(getRarityClassName("ultra-rare")).toBe("rarity-ultra-rare");
    expect(getRarityClassName("legendary")).toBe("rarity-legendary");
  });

  it("uses the dedicated secret Legendary class wherever requested", () => {
    expect(getRarityClassName("legendary", true)).toBe("rarity-secret-legendary");
  });
});
