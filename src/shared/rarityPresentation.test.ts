import { describe, expect, it } from "vitest";
import { getPresentedRarityLabel, getRarityClassName } from "./rarityPresentation";

describe("rarity presentation", () => {
  it("uses the standard rarity class for regular athletes", () => {
    expect(getRarityClassName("common")).toBe("rarity-common");
    expect(getRarityClassName("rare")).toBe("rarity-rare");
    expect(getRarityClassName("ultra-rare")).toBe("rarity-ultra-rare");
    expect(getRarityClassName("legendary")).toBe("rarity-legendary");
  });

  it("uses the dedicated secret Legendary class wherever requested", () => {
    expect(getRarityClassName("legendary", true)).toBe("rarity-secret-legendary");
  });

  it("uses the official label for secret Legendaries", () => {
    expect(getPresentedRarityLabel("legendary")).toBe("Leggendario");
    expect(getPresentedRarityLabel("legendary", true)).toBe("Leggendario Segreto");
  });
});
