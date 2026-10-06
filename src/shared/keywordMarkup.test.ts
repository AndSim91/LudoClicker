import { describe, expect, it } from "vitest";
import { parseKeywordMarkup, stripKeywordMarkup } from "./keywordMarkup";
import { APP_RAIL_ITEMS } from "../components/outlook-shell/appRailItems";

describe("keywordMarkup", () => {
  it("splits pages, numbers, areas and rarities", () => {
    expect(parseKeywordMarkup("Apri [[Eventi]]: +3 **Contatti**, [[a:Redazione]] e [[r:Ultra Rari]]."))
      .toEqual([
        { kind: "text", text: "Apri " },
        { kind: "page", text: "Eventi" },
        { kind: "text", text: ": +3 " },
        { kind: "number", text: "Contatti" },
        { kind: "text", text: ", " },
        { kind: "area", text: "Redazione" },
        { kind: "text", text: " e " },
        { kind: "rarity", text: "Ultra Rari", rarity: "ultra-rare" },
        { kind: "text", text: "." },
      ]);
  });

  it("leaves plain text alone and strips markup", () => {
    expect(parseKeywordMarkup("Nessuna parola.")).toEqual([{ kind: "text", text: "Nessuna parola." }]);
    expect(stripKeywordMarkup("Gli [[Eventi]] portano **Contatti** e [[r:Leggendari]]."))
      .toBe("Gli Eventi portano Contatti e Leggendari.");
  });

  it("every page and rarity marked in the game texts exists", () => {
    const sources = import.meta.glob("../content/*.ts", { query: "?raw", import: "default", eager: true });
    const labels = APP_RAIL_ITEMS.map((item) => item.label);
    for (const source of Object.values(sources) as string[]) {
      for (const segment of parseKeywordMarkup(source)) {
        if (segment.kind === "page") {
          expect(labels.some((label) => segment.text === label || segment.text.startsWith(`${label} `)), segment.text).toBe(true);
        }
      }
      expect(source, "rarità sconosciuta").not.toMatch(/\[\[r:(?!Comun|Rar|Ultra Rar|Leggendar)/);
    }
  });
});
