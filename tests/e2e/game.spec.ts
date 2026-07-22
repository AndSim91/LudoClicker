import { expect, test, type Page } from "@playwright/test";
import {
  createProgressedGameSave,
  E2E_PLAYER_NAME,
  installGameSave,
  readStoredGameSave,
} from "./support/gameSave";

const runtimeErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page) ?? [], "Errori runtime nella pagina").toEqual([]);
});

async function openProgressedGame(page: Page, pause = true) {
  const state = createProgressedGameSave();
  await installGameSave(page, state);
  await page.goto("/");
  await expect(page.getByText(`Profilo: ${E2E_PLAYER_NAME}`)).toBeVisible();
  if (pause) {
    await page.getByRole("button", { name: "Pausa" }).click();
    await expect(page.getByRole("button", { name: "Riprendi" })).toBeVisible();
  }
  return state;
}

async function saveNow(page: Page) {
  await page.getByRole("button", { name: "Impostazioni", exact: true }).click();
  await page.getByRole("button", { name: "Salva ora" }).click();
  await expect(page.getByRole("heading", { name: "Partita salvata" })).toBeVisible();
}

test("avvia una nuova partita e rende interattivo il tutorial di scrittura", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: "Come ti chiami?" })).toBeVisible();
  await page.getByRole("textbox", { name: "Nome e cognome" }).fill("Andrea Test");
  await page.getByRole("button", { name: "Inizia" }).click();

  await expect(page.getByRole("dialog", { name: "Il primo giorno da Preside" })).toBeVisible();
  await page.getByRole("button", { name: "Continua", exact: true }).click();
  await page.getByRole("button", { name: "Continua", exact: true }).click();
  await expect(page.getByRole("status", { name: "Invia la tua prima mail" })).toBeVisible();

  const composer = page.getByRole("button", {
    name: "Corpo del messaggio. Premi un tasto o fai clic per continuare a scrivere.",
  });
  await page.keyboard.press("A");
  await composer.click();
  await expect(page.getByText(/2 \/ \d+ caratteri/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Eventi", exact: true })).toHaveCount(0);
});

test("carica il salvataggio predefinito e apre tutte le aree sbloccate", async ({ page }) => {
  await openProgressedGame(page);

  await expect(page.getByLabel("Iscritti attivi: 20")).toBeVisible();
  await expect(page.locator('[aria-label^="Disponibilità economica:"]'))
    .toHaveAttribute("aria-label", /5000,00/);

  const areas = [
    ["Eventi", "Eventi"],
    ["Iscritti", "Iscritti"],
    ["Tornei", "Tornei"],
    ["Upgrade", "Upgrade"],
    ["Attività", "Attività"],
    ["Impostazioni", "Impostazioni"],
    ["Admin", "Admin"],
  ] as const;

  for (const [buttonName, headingName] of areas) {
    await page.getByRole("button", { name: buttonName, exact: true }).click();
    await expect(page.getByRole("heading", { name: headingName, exact: true })).toBeVisible();
  }
});

test("completa e invia una mail senza invio automatico", async ({ page }) => {
  await openProgressedGame(page);
  await page.getByRole("button", { name: "Riprendi" }).click();

  const progressLabel = await page.getByText(/\d+ \/ \d+ caratteri/).textContent();
  const totalCharacters = Number(progressLabel?.match(/\/ (\d+) caratteri/)?.[1]);
  expect(totalCharacters).toBeGreaterThan(0);
  const composer = page.getByRole("button", {
    name: "Corpo del messaggio. Premi un tasto o fai clic per continuare a scrivere.",
  });
  await composer.click();
  await page.keyboard.type("a".repeat(totalCharacters - 1));

  const completedComposer = page.getByRole("button", {
    name: "Corpo del messaggio. Mail completata. Premi un tasto o fai clic per inviare.",
  });
  await expect(completedComposer).toBeVisible();
  await completedComposer.click();
  await expect(page.getByRole("button", { name: /Posta inviata 1/ })).toBeVisible();
  await expect(page.getByText(/Bozza per/).first()).toBeVisible();
});

test("avvia un evento e aggiorna il progresso usando il tempo reale del gioco", async ({ page }) => {
  await openProgressedGame(page, false);
  await page.getByRole("button", { name: "Eventi", exact: true }).click();
  await page.getByRole("button", { name: "Partecipa gratis" }).click();

  await expect(page.getByRole("button", { name: "Attività in corso…" })).toBeDisabled();
  const progress = page.getByRole("progressbar", { name: "Avanzamento Sparring al parco" });
  await expect(progress).toBeVisible();
  const initialProgress = Number(await progress.getAttribute("aria-valuenow"));
  await expect.poll(
    async () => Number(await progress.getAttribute("aria-valuenow")),
    { timeout: 3_000 },
  ).toBeGreaterThan(initialProgress);
});

test("acquista un Upgrade, salva e mantiene il livello dopo il reload", async ({ page }) => {
  await openProgressedGame(page);
  await page.getByRole("button", { name: "Upgrade", exact: true }).click();
  await page.getByRole("button", { name: /Apri dettagli Tastiera comoda: livello 0 di 5/ }).click();

  const dialog = page.getByRole("dialog", { name: "Tastiera comoda" });
  await expect(dialog).toContainText("Livello attuale0/5");
  await dialog.getByRole("button", { name: "Potenzia" }).click();
  await expect(dialog).toContainText("Livello attuale1/5");

  await saveNow(page);
  const stored = await readStoredGameSave(page);
  expect(stored.upgrades["comfortable-keyboard"]).toBe(1);
  expect(stored.school.euros).toBe(4_925);

  await page.reload();
  await expect(page.getByText(`Profilo: ${E2E_PLAYER_NAME}`)).toBeVisible();
  await page.getByRole("button", { name: "Pausa" }).click();
  await page.getByRole("button", { name: "Upgrade", exact: true }).click();
  await expect(page.getByRole("button", { name: /Apri dettagli Tastiera comoda: livello 1 di 5/ })).toBeVisible();
});

test("gestisce preferiti e cancellazione iscrizione con conferma accessibile", async ({ page }) => {
  const state = await openProgressedGame(page);
  const member = state.contacts.find(
    (contact) => contact.status === "enrolled" && contact.rarity !== "legendary",
  );
  if (!member) throw new Error("La fixture deve contenere almeno un iscritto cancellabile");
  const displayName = `${member.firstName} ${member.lastName}`;

  await page.getByRole("button", { name: "Iscritti", exact: true }).click();
  const favorite = page.getByRole("button", {
    name: `Aggiungi ${displayName} ai preferiti`,
  });
  await favorite.click();
  await expect(page.getByRole("button", {
    name: `Rimuovi ${displayName} dai preferiti`,
  })).toHaveAttribute("aria-pressed", "true");

  const cancelEnrollment = page.getByRole("button", {
    name: `Annulla l'iscrizione di ${displayName}`,
  });
  await cancelEnrollment.click();
  const confirmation = page.getByRole("alertdialog", { name: "Annullare l'iscrizione?" });
  await expect(confirmation.getByRole("button", { name: "Mantieni iscrizione" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(confirmation).toBeHidden();
  await expect(cancelEnrollment).toBeFocused();

  await cancelEnrollment.click();
  await confirmation.getByRole("button", { name: "Annulla iscrizione" }).click();
  await expect(page.getByLabel("Iscritti attivi: 19")).toBeVisible();
  await expect(page.getByText(displayName, { exact: true })).toHaveCount(0);
});

test("salva profilo e preferenze e li ripristina dopo il reload", async ({ page }) => {
  await openProgressedGame(page);
  await page.getByRole("button", { name: "Impostazioni", exact: true }).click();

  const displayName = page.getByRole("textbox", { name: "Nome e cognome" });
  await displayName.fill("Profilo Persistente");
  await page.getByRole("button", { name: "Aggiorna nome" }).click();
  await page.getByLabel("Tema scuro").check();
  await page.getByLabel("Riduci animazioni").check();
  await page.getByRole("button", { name: "Salva ora" }).click();
  await expect(page.getByRole("heading", { name: "Partita salvata" })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Profilo: Profilo Persistente")).toBeVisible();
  await page.getByRole("button", { name: "Impostazioni", exact: true }).click();
  await expect(page.getByLabel("Tema scuro")).toBeChecked();
  await expect(page.getByLabel("Riduci animazioni")).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
