import { describe, expect, it } from "vitest";
import { ledStrip, ledStripImage, sponsorPanels, LED_ROWS } from "./ledSponsors";
import { ledGrid, ledSvg, rect, text, textWidth } from "./ledPixels";

describe("LED band", () => {
  it("writes with the 5-row font and turns runs into one path per colour", () => {
    const g = ledGrid(20, 5);
    expect(text(g, "LA", 0, 0, "#fff")).toBe(textWidth("LA"));
    expect(textWidth("LA")).toBe(11);
    rect(g, 12, 0, 3, 1, "#f00");
    expect(ledSvg(g).match(/<path/g)).toHaveLength(2);
    expect(() => textWidth("ç")).toThrow();
  });

  it("builds the strip: 4 × 3 panels, sponsors as wide as their names", () => {
    const sponsors = sponsorPanels();
    expect(sponsors.every((p) => p.h === LED_ROWS)).toBe(true);
    expect(ledStrip().w).toBe(6 * 152 + 2 * sponsors.reduce((sum, p) => sum + p.w, 0));
    expect(ledStripImage().href.startsWith("data:image/svg+xml,")).toBe(true);
  });
});
