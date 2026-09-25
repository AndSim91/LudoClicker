import { expect, test, type Page } from "@playwright/test";
import { createProgressedGameSave, installGameSave } from "./support/gameSave";

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
    if (overImage || !background || !foreground) continue;

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

async function openArea(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).first().click();
  await page.waitForTimeout(500);
}

test("la Modalità Onde mantiene il contrasto AA nelle schermate principali", async ({ page }) => {
  test.setTimeout(60_000);
  const state = createProgressedGameSave();
  state.school.euros = 50_000;
  // Mix every rarity so each name colour is checked on tables, chips and day-panel cards.
  const rarities = ["common", "rare", "ultra-rare", "legendary"] as const;
  state.contacts = state.contacts.map((contact, index) => ({ ...contact, rarity: rarities[index % 4] }));
  state.unlocks.gadget = true;
  state.gadgets.products.wristband = {
    ...state.gadgets.products.wristband,
    unlocked: true,
    projectPurchased: true,
  };
  await installGameSave(page, state);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  for (let input = 0; input < 40; input += 1) await page.keyboard.press("a");

  const report: Record<string, ContrastFailure[]> = { Posta: await page.evaluate(auditContrast) };
  for (const area of ["Eventi", "Scuola", "Tornei", "Upgrade", "Gadget", "Impostazioni"]) {
    await openArea(page, area);
    report[area] = await page.evaluate(auditContrast);
  }

  await openArea(page, "Tornei");
  for (const tab of ["Risultati", "Albo d'oro", "Open"]) {
    await page.getByRole("tab", { name: tab }).click();
    await page.waitForTimeout(300);
    report[`Tornei · ${tab}`] = await page.evaluate(auditContrast);
  }

  await openArea(page, "Scuola");
  await page.getByRole("button", { name: "Dettagli" }).first().click();
  await page.waitForTimeout(500); // let the drawer finish fading in
  report["Scuola · Dettagli"] = await page.evaluate(auditContrast);
  await page.keyboard.press("Escape");

  await openArea(page, "Eventi");
  await page.getByRole("button", { name: /Partecipa/ }).first().click();
  await page.waitForTimeout(500);
  report["Eventi · in corso"] = await page.evaluate(auditContrast);

  await openArea(page, "Posta");
  await page.getByRole("button", { name: /Posta inviata/ }).first().click();
  report["Posta inviata"] = await page.evaluate(auditContrast);

  const failures = Object.entries(report).flatMap(([screen, items]) =>
    items.map((item) => ({ screen, ...item })),
  );
  expect(failures).toEqual([]);
});
