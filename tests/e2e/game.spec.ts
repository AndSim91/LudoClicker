import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Come ti chiami?" })).toBeVisible();
  await page.getByRole("textbox", { name: "Nome e cognome" }).fill("Andrea Ungaro");
  await page.getByRole("button", { name: "Inizia" }).click();
});

test("scrive con tastiera e click senza intercettare la navigazione", async ({ page }) => {
  const composer = page.getByRole("button", {
    name: "Corpo del messaggio. Premi un tasto o fai clic per continuare a scrivere.",
  });
  await expect(composer).toBeVisible();
  await page.keyboard.press("A");
  await page.keyboard.press("B");
  await composer.click();
  await expect(page.getByText(/3 \/ \d+ caratteri/)).toBeVisible();

  await expect(page.getByRole("button", { name: "Iscritti", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Impostazioni", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Impostazioni" })).toBeVisible();
  await page.getByRole("button", { name: "Posta", exact: true }).click();
  await expect(composer).toBeVisible();
});

test("richiede un click finale per inviare la mail completa e apre il contatto successivo", async ({ page }) => {
  await page.evaluate(() => {
    for (let index = 0; index < 500; index += 1) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    }
  });

  const completedComposer = page.getByRole("button", {
    name: "Corpo del messaggio. Mail completata. Premi un tasto o fai clic per inviare.",
  });
  await expect(completedComposer).toBeVisible({ timeout: 2_000 });
  await expect(page.getByRole("button", { name: /Posta inviata 0/ })).toBeVisible();
  await completedComposer.click();
  await expect(page.getByText("Bozza per Luca Parodi")).toBeVisible({ timeout: 2_000 });
  const sentFolder = page.getByRole("button", { name: /Posta inviata 1/ });
  await expect(sentFolder).toBeVisible();
  await expect(page.getByRole("button", { name: "Bozze" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Archivio" })).toHaveCount(0);
  await sentFolder.click();
  await expect(page.locator(".campaign-status")).toHaveText("In attesa");
  await expect(page.getByRole("article")).toContainText("Buongiorno Giulia,");
  await expect(page.getByRole("article")).toContainText("Un saluto,");
});

test("legge le notifiche e sblocca progressivamente gli eventi", async ({ page }) => {
  const welcome = page.getByRole("button", { name: /Sistema Oggetto: Nuovi Iscritti/ });
  await welcome.click();
  await expect(welcome).toHaveClass(/read/);
  await expect(page.getByRole("button", { name: /Posta in arrivo 0/ })).toBeVisible();

  await expect(page.getByRole("button", { name: "Eventi", exact: true })).toHaveCount(0);

  for (let sent = 1; sent <= 3; sent += 1) {
    await page.evaluate(() => {
      for (let index = 0; index < 500; index += 1) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
      }
    });
    await expect(page.getByRole("button", { name: new RegExp(`Posta inviata ${sent}`) }))
      .toBeVisible({ timeout: 2_000 });
  }
  await expect(page.getByRole("button", { name: "Eventi", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Eventi", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Eventi" })).toBeVisible();
  await page.getByRole("button", { name: "Partecipa gratis" }).click();
  await expect(page.getByRole("button", { name: "Attività in corso…" })).toBeDisabled();
  const progress = page.getByRole("progressbar", { name: "Avanzamento Sparring al parco" });
  await expect(progress).toBeVisible();
  const initialProgress = Number(await progress.getAttribute("aria-valuenow"));
  await page.waitForTimeout(500);
  expect(Number(await progress.getAttribute("aria-valuenow"))).toBeGreaterThan(initialProgress);
  await expect.poll(async () => {
    const text = await page.locator(".event-notice strong").textContent();
    return Number(text?.match(/\d+/)?.[0] ?? 0);
  }, { timeout: 17_000 }).toBeGreaterThan(4);
  if (process.env.QA_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.QA_SCREENSHOT_DIR}/events-after-sparring.png` });
  }
});

test("cattura le viewport desktop di riferimento", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: "docs/design/implementation-1920x1080.png", fullPage: true });

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({ path: "docs/design/implementation-1366x768.png", fullPage: true });
});
