import { expect, test, type Page } from "@playwright/test";
import { createOwnedFinalResult, createProgressedGameSave, installGameSave } from "./support/gameSave";
import { SECRET_LEGENDARY_IDS } from "../../src/content/secretLegendaries";

test.use({ viewport: { width: 1600, height: 900 } });

interface ContrastFailure {
  element: string;
  text: string;
  ratio: number;
}

// Walks every visible text node, resolves the first opaque ancestor background and
// checks the WCAG AA ratio. Text over gradients or images is skipped: no single
// background colour exists there, so those areas stay a visual review item.
function auditContrast(): ContrastFailure[] {
  type Rgba = { r: number; g: number; b: number; a: number };
  const parse = (value: string): Rgba | null => {
    const numbers = value.match(/[\d.]+/g)?.map(Number);
    if (!numbers || numbers.length < 3) return null;
    const scale = value.startsWith("color(srgb") ? 255 : 1;
    return { r: numbers[0] * scale, g: numbers[1] * scale, b: numbers[2] * scale, a: numbers[3] ?? 1 };
  };
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = ({ r, g, b }: Rgba) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const over = (top: Rgba, bottom: Rgba): Rgba => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });

  const failures: ContrastFailure[] = [];
  const seen = new Set<Element>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const element = node.parentElement;
    const text = node.textContent?.trim();
    if (!element || !text || seen.has(element)) continue;
    seen.add(element);
    const box = element.getBoundingClientRect();
    if (!box.width || !box.height || box.bottom < 0 || box.top > innerHeight) continue;
    const style = getComputedStyle(element);
    if (style.visibility === "hidden" || Number(style.opacity) === 0) continue;

    let background: Rgba | null = null;
    let opacity = 1;
    let overImage = false;
    for (let current: Element | null = element; current; current = current.parentElement) {
      const currentStyle = getComputedStyle(current);
      opacity *= Number(currentStyle.opacity);
      if (currentStyle.backgroundImage !== "none") {
        overImage = true;
        break;
      }
      const layer = parse(currentStyle.backgroundColor);
      if (layer && layer.a > 0) {
        background = background ? over(background, layer) : layer;
        if (layer.a >= 0.99) break;
      }
    }
    const foreground = parse(style.color);
    // Text hidden by an ancestor (e.g. a label swapped out on hover) has nothing to read.
    if (overImage || !background || !foreground || opacity === 0) continue;

    const text_ = over({ ...foreground, a: foreground.a * opacity }, background);
    const [light, dark] = [luminance(text_), luminance(background)].sort((a, b) => b - a);
    const ratio = (light + 0.05) / (dark + 0.05);
    const size = parseFloat(style.fontSize);
    const large = size >= 24 || (size >= 18.6 && Number(style.fontWeight) >= 600);
    if (ratio < (large ? 3 : 4.5)) {
      failures.push({
        element: element.className.toString() || element.tagName,
        text: text.slice(0, 40),
        ratio: Math.round(ratio * 100) / 100,
      });
    }
  }
  return failures;
}

// Entry animations start from opacity 0: audit only once the finite ones are done.
async function audit(page: Page) {
  await page.evaluate(() => Promise.race([
    Promise.all(document.getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
      .map((animation) => animation.finished.catch(() => undefined))),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]));
  return page.evaluate(auditContrast);
}

async function openArea(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).first().click();
  await page.waitForTimeout(500);
}

test("la Modalità Onde mantiene il contrasto AA nelle schermate principali", async ({ page }) => {
  test.setTimeout(120_000);
  const state = createProgressedGameSave();
  const moments = ["legendary:eva-parodi", `legendary:${SECRET_LEGENDARY_IDS[0]}`, "victory:national", "council", "foundation", "light-inflation"];
  state.moments = { seen: moments, queue: moments };
  state.tournaments.results = [createOwnedFinalResult(state.lastSavedAt - 60_000)];
  state.school.euros = 50_000;
  // Mix every rarity so each name colour is checked on tables, chips and day-panel cards.
  const rarities = ["common", "rare", "ultra-rare", "legendary"] as const;
  state.contacts = state.contacts.map((contact, index) => ({ ...contact, rarity: rarities[index % 4] }));
  state.unlocks.gadget = true;
  // A network with a school whose Fama was not recorded: the Rete page is in the rail.
  state.network = { ...state.network, schools: [{ name: "Ordine delle Onde", city: "Genova", fame: 2_400 }, { name: "Lame del Faro", city: "Trieste" }], schoolCount: 2, monthlyRent: 900 };
  state.gadgets.products.wristband = {
    ...state.gadgets.products.wristband,
    unlocked: true,
    projectPurchased: true,
  };
  await installGameSave(page, state);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const report: Record<string, ContrastFailure[]> = {};
  // Animated moments (4.2): audit each one after its text has faded in, then skip it.
  for (const moment of moments) {
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(4_300);
    report[`Momento · ${moment}`] = await page.evaluate(auditContrast);
    await page.getByRole("button", { name: /Salta/ }).click();
  }
  for (let input = 0; input < 40; input += 1) await page.keyboard.press("a");

  report.Posta = await audit(page);
  for (const area of ["Eventi", "Scuola", "Tornei", "Upgrade", "Gadget", "Rete", "Impostazioni"]) {
    await openArea(page, area);
    report[area] = await audit(page);
    if (area === "Scuola") {
      await page.getByRole("button", { name: /Schede/ }).click();
      report["Scuola · Schede"] = await audit(page);
      await page.getByRole("button", { name: /Tabella/ }).click();
    }
  }

  // The first achievements unlock on the first ticks: the LudoWiki is in the rail.
  await openArea(page, "LudoWiki");
  await page.getByRole("tab", { name: "Traguardi" }).click();
  await page.waitForTimeout(300);
  report["LudoWiki · Traguardi"] = await audit(page);
  await page.getByRole("tab", { name: "Scene" }).click();
  await page.waitForTimeout(300);
  report["LudoWiki · Scene"] = await audit(page);

  await openArea(page, "Tornei");
  for (const tab of ["Risultati", "Albo d'oro", "Open"]) {
    await page.getByRole("tab", { name: tab }).click();
    await page.waitForTimeout(300);
    report[`Tornei · ${tab}`] = await audit(page);
    if (tab === "Risultati") {
      await page.getByRole("button", { name: "Dettaglio incontro" }).click();
      report["Tornei · Giudizio di Stile"] = await audit(page);
      // «Guarda la finale» (4.3): audit the duel; with reduced motion it opens on the final state.
      await page.getByRole("button", { name: "Guarda la finale" }).click();
      await page.waitForTimeout(500);
      report["Tornei · Finale"] = await page.evaluate(auditContrast);
      await page.getByRole("button", { name: "Chiudi", exact: true }).click();
    }
  }

  await openArea(page, "Scuola");
  await page.getByRole("button", { name: "Dettagli" }).first().click();
  await page.waitForTimeout(500); // let the drawer finish fading in
  report["Scuola · Dettagli"] = await audit(page);
  await page.keyboard.press("Escape");

  await openArea(page, "Eventi");
  await page.getByRole("button", { name: /Partecipa/ }).first().click();
  await page.waitForTimeout(500);
  report["Eventi · in corso"] = await audit(page);

  await openArea(page, "Posta");
  await page.getByRole("button", { name: /Posta inviata/ }).first().click();
  report["Posta inviata"] = await audit(page);

  const failures = Object.entries(report).flatMap(([screen, items]) =>
    items.map((item) => ({ screen, ...item })),
  );
  expect(failures).toEqual([]);
});
