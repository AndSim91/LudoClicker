import { describe, expect, it } from "vitest";
import { LED_SPONSORS, getSignedSponsors, ledStrip, ledStripImage, sponsorPanels, LED_ROWS } from "./ledSponsors";
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

  it("builds the strip: one slot per sponsor, the Order only in empty slots", () => {
    const panels = Object.values(sponsorPanels());
    expect(panels.every((p) => p.h === LED_ROWS)).toBe(true);
    const full = ledStrip(LED_SPONSORS);
    expect(full.w).toBe(152 + 28 + panels.reduce((sum, p) => sum + p.w + 28, 0));
    // No contract: every slot is the Order's 152-LED panel.
    expect(ledStrip(getSignedSponsors(0)).w).toBe(4 * (152 + 28));
    expect(getSignedSponsors(1)).toEqual(["sartoria"]);
    expect(getSignedSponsors(4)).toContain("lama-di-luce");
    expect(ledStripImage(LED_SPONSORS).href.startsWith("data:image/svg+xml,")).toBe(true);
  });
});
