import { expect, test, type Page } from "@playwright/test";
import { GADGET_MINIGAME_DIFFICULTIES } from "../../src/content/gadgets";
import { createGadgetRhythmNotes } from "../../src/game/gadgetMinigame";
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
  await expect(page.locator('[aria-label^="Fondi:"]')).toHaveAttribute(
    "aria-label",
    /5\.000,00/,
  );

  const areas = [
    ["Eventi", "Eventi"],
    ["Scuola", "Scuola"],
    ["Tornei", "Tornei"],
    ["Upgrade", "Upgrade"],
    ["Impostazioni", "Impostazioni"],
    ["Admin", "Admin"],
  ] as const;

  for (const [buttonName, headingName] of areas) {
    await page.getByRole("button", { name: buttonName, exact: true }).click();
    await expect(page.getByRole("heading", { name: headingName, exact: true })).toBeVisible();
  }
});

test("completa il collaudo Gadget con controlli touch accessibili", async ({ page }) => {
  const state = createProgressedGameSave();
  state.school.euros = 50_000;
  state.unlocks.gadget = true;
  state.gadgets.products.wristband = {
    ...state.gadgets.products.wristband,
    unlocked: true,
    projectPurchased: true,
  };
  state.gadgets.minigame = {
    productId: "wristband",
    kind: "development",
    rarity: "common",
    seed: 12_345,
    previousQuality: 0,
    status: "ready",
  };
  await page.setViewportSize({ width: 390, height: 844 });
  await installGameSave(page, state);
  await page.goto("/");
  await expect(page.getByText(`Profilo: ${E2E_PLAYER_NAME}`)).toBeVisible();

  await page.getByRole("button", { name: "Gadget", exact: true }).click();
  await page.getByRole("button", { name: "Avvia collaudo" }).click();

  const minigame = page.getByRole("dialog", { name: "Polsino" });
  await expect(minigame).toBeVisible();
  const laneControls = minigame.getByRole("button", { name: /^Corsia/ });
  await expect(laneControls).toHaveCount(4);
  for (let lane = 0; lane < 4; lane += 1) {
    const box = await laneControls.nth(lane).boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(50);
    expect(box?.height).toBeGreaterThanOrEqual(50);
  }

  const board = minigame.getByLabel("Quattro corsie del collaudo");
  const fallingNote = minigame.getByRole("button", { name: /^Nota corsia/ }).first();
  await expect(fallingNote).toBeVisible({ timeout: 4_000 });
  await expect
    .poll(async () => (await fallingNote.getAttribute("style")) ?? "")
    .not.toContain("--note-top: -6%");
  const spawnClass = await fallingNote.getAttribute("class");
  const spawnPosition = await fallingNote.getAttribute("style");
  const noteArrow = fallingNote.locator(".gadget-note-arrow .gadget-direction-icon");
  await expect(noteArrow).toBeVisible();
  const boardBox = await board.boundingBox();
  const noteBox = await fallingNote.boundingBox();
  const arrowBox = await noteArrow.boundingBox();
  expect(boardBox).not.toBeNull();
  expect(noteBox).not.toBeNull();
  expect(arrowBox?.width).toBeGreaterThanOrEqual(28);
  expect(arrowBox?.height).toBeGreaterThanOrEqual(28);
  expect(noteBox!.x + noteBox!.width / 2).toBeGreaterThan(boardBox!.x);
  expect(noteBox!.x + noteBox!.width / 2).toBeLessThan(boardBox!.x + boardBox!.width);

  await page.waitForTimeout(1_200);
  await expect(fallingNote).toHaveAttribute("class", spawnClass ?? "");
  expect(await fallingNote.getAttribute("style")).not.toBe(spawnPosition);

  await minigame.getByRole("button", { name: "Abbandona il tentativo" }).click();
  await expect(page.getByText("La qualità massima resta al 0%.")).toBeVisible();
  await page.getByRole("button", { name: "Metti in vendita" }).click();

  await expect(page.getByText("Non vendibile")).toBeVisible();
  await expect(page.getByText("Venduti")).toBeVisible();
  await expect(page.getByText("Guadagnato")).toBeVisible();
});

test("mostra accordi su corsie diverse alle rarità Gadget più alte", async ({ page }) => {
  const earlyChordSeed = Array.from({ length: 500 }, (_, index) => index + 1).find((seed) => {
    const targetCounts = new Map<number, number>();
    for (const note of createGadgetRhythmNotes(seed, "secret-legendary")) {
      targetCounts.set(note.targetAtMs, (targetCounts.get(note.targetAtMs) ?? 0) + 1);
    }
    return [...targetCounts].some(
      ([targetAtMs, count]) =>
        count > 1 && targetAtMs <= GADGET_MINIGAME_DIFFICULTIES["secret-legendary"].travelMs + 600,
    );
  });
  expect(earlyChordSeed).toBeDefined();

  const state = createProgressedGameSave();
  state.unlocks.gadget = true;
  state.gadgets.products.wristband = {
    ...state.gadgets.products.wristband,
    unlocked: true,
    projectPurchased: true,
  };
  state.gadgets.minigame = {
    productId: "wristband",
    kind: "revision",
    rarity: "legendary",
    opportunityRarity: "secret-legendary",
    seed: earlyChordSeed!,
    previousQuality: 80,
    status: "ready",
  };
  await page.setViewportSize({ width: 1280, height: 820 });
  await installGameSave(page, state);
  await page.goto("/");

  await page.getByRole("button", { name: "Gadget", exact: true }).click();
  await page.getByRole("button", { name: "Avvia collaudo" }).click();

  const minigame = page.getByRole("dialog", { name: "Polsino" });
  await expect(minigame).toHaveClass(/rarity-secret-legendary/);
  const fallingNotes = minigame.getByRole("button", { name: /^Nota corsia/ });
  await expect
    .poll(
      async () =>
        fallingNotes.evaluateAll((elements) => {
          const groups = new Map<string, Set<string>>();
          for (const element of elements) {
            const htmlElement = element as HTMLElement;
            const top = htmlElement.style.getPropertyValue("--note-top");
            const left = htmlElement.style.getPropertyValue("--note-left");
            if (!top || top === "-6%") continue;
            const lanes = groups.get(top) ?? new Set<string>();
            lanes.add(left);
            groups.set(top, lanes);
          }
          return Math.max(0, ...[...groups.values()].map((lanes) => lanes.size));
        }),
      { timeout: 5_000 },
    )
    .toBe(2);

  await minigame.getByRole("button", { name: "Abbandona il tentativo" }).click();
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
  const completedComposer = page.getByRole("button", {
    name: "Corpo del messaggio. Email completata. Premi un tasto o fai clic per inviare.",
  });
  // Flusso writes more than one character per key: type until the draft is complete.
  for (let typed = 1; typed < totalCharacters && !(await completedComposer.isVisible()); typed += 1) {
    await page.keyboard.press("a");
  }
  await expect(completedComposer).toBeVisible();
  await completedComposer.click();
  await expect(page.getByText(/Bozza per/).first()).toBeVisible();
  await page.getByRole("button", { name: "Posta inviata", exact: true }).click();
  await expect(page.locator(".sent-row")).toHaveCount(1);
});

test("avvia un evento e aggiorna il progresso usando il tempo reale del gioco", async ({
  page,
}) => {
  await openProgressedGame(page, false);
  await page.getByRole("button", { name: "Eventi", exact: true }).click();
  await page.getByRole("button", { name: "Partecipa gratis" }).click();

  const sparring = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Volantinaggio" }),
  });
  await expect(sparring.getByRole("button", { name: "Annulla" })).toBeVisible();
  // The progress fills the Annulla button itself.
  const fill = sparring.locator(".event-action-fill > span");
  const width = async () => fill.evaluate((element) => Number.parseFloat((element as HTMLElement).style.width));
  const initialProgress = await width();
  await expect.poll(width, { timeout: 3_000 }).toBeGreaterThan(initialProgress);
});

test("gestisce direttamente l'organico aggregato dei collaboratori", async ({ page }) => {
  const state = createProgressedGameSave();
  const andrea = state.contacts.find((contact) => contact.specialProfileId === "andrea-simonazzi");
  if (!andrea) throw new Error("La fixture deve contenere Andrea Simonazzi");
  state.collaborators = Array.from({ length: 9 }, (_, index) => ({
    id: `aggregate-${index}`,
    contactId: index === 0 ? andrea.id : `aggregate-contact-${index}`,
    displayName:
      index === 0 ? `${andrea.firstName} ${andrea.lastName}` : `Collaboratore Aggregato ${index}`,
    joinedAt: state.createdAt + index,
    forms: [],
    instructorForms: [],
    formBranchPreferences: [],
    assignment: null,
    mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
    rarity: index === 0 ? ("legendary" as const) : ("ultra-rare" as const),
    specialProfileId: index === 0 ? ("andrea-simonazzi" as const) : undefined,
  }));
  state.unlocks.collaborators = true;
  state.collaboratorManagement.aggregateViewUnlocked = true;
  // The Consiglio scene is already seen: it now waits for «Chiudi» and would cover the page.
  state.moments = { seen: [...state.moments.seen, "council"], queue: [] };
  state.collaboratorManagement.targets = {
    writing: 0,
    events: 0,
    equipment: 0,
    instructor: 0,
  };
  await installGameSave(page, state);
  await page.goto("/");
  await expect(page.getByText(`Profilo: ${E2E_PLAYER_NAME}`)).toBeVisible();
  await page.getByRole("button", { name: "Scuola", exact: true }).click();

  const aggregateView = page.getByRole("region", {
    name: "Gestione aggregata dei collaboratori",
  });
  await expect(aggregateView).toBeVisible();
  await expect(aggregateView.getByText(/Preset/)).toHaveCount(0);
  await aggregateView.getByRole("button", { name: "Aumenta collaboratori in Redazione" }).click();
  await aggregateView.getByRole("button", { name: "Aumenta collaboratori in Redazione" }).click();
  await aggregateView.getByRole("button", { name: "Aumenta collaboratori in Eventi" }).click();
  await aggregateView.getByRole("button", { name: "Aumenta collaboratori in Istruttori" }).click();

  await aggregateView.getByRole("button", { name: "Gestisci Istruttori" }).click();
  const instructorPanel = page.getByRole("dialog", { name: "Istruttori" });
  await expect(instructorPanel).toBeVisible();
  await expect(
    instructorPanel.getByRole("button", {
      name: "Ordina collaboratori per Formazione Istruttore",
    }),
  ).toBeVisible();
  await expect(instructorPanel.getByLabel("Formazione Istruttore", { exact: true })).toBeVisible();
  await expect(
    instructorPanel.getByRole("button", {
      name: "Ordina collaboratori per Formazione Tecnici",
    }),
  ).toHaveCount(0);
  await expect(instructorPanel.getByLabel("Filtra istruttori per rarità")).toBeVisible();
  await instructorPanel.getByRole("button", { name: "Chiudi pannello Istruttori" }).click();

  const collaboratorCount = page.getByText(/\d+\/\d+ liberi/);
  await expect(collaboratorCount).toHaveText(/\d+\/\d+ liberi/);
  const countMatch = (await collaboratorCount.textContent())?.match(/(\d+)\/(\d+)/);
  expect(countMatch).not.toBeNull();
  expect(Number(countMatch?.[2]) - Number(countMatch?.[1])).toBe(4);
  await expect(
    aggregateView.locator(".collaborator-sector-card").filter({ hasText: "Redazione" }),
  ).toContainText("2");
  await expect(
    aggregateView.locator(".collaborator-sector-card").filter({ hasText: "Eventi" }),
  ).toContainText("1");
});

test("acquista un Upgrade, salva e mantiene il livello dopo il reload", async ({ page }) => {
  await openProgressedGame(page);
  await page.getByRole("button", { name: "Upgrade", exact: true }).click();
  await page.getByRole("button", { name: /Apri dettagli Tastiera comoda: livello 0 di 5/ }).click();

  const dialog = page.getByRole("dialog", { name: "Tastiera comoda" });
  await expect(dialog).toContainText("Livello0 di 5");
  await dialog.getByRole("button", { name: /^Compra ·/ }).click();
  await expect(dialog).toContainText("Livello1 di 5");

  await saveNow(page);
  const stored = await readStoredGameSave(page);
  expect(stored.upgrades["comfortable-keyboard"]).toBe(1);
  expect(stored.school.euros).toBe(4_950);

  await page.reload();
  await expect(page.getByText(`Profilo: ${E2E_PLAYER_NAME}`)).toBeVisible();
  await page.getByRole("button", { name: "Pausa" }).click();
  await page.getByRole("button", { name: "Upgrade", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Apri dettagli Tastiera comoda: livello 1 di 5/ }),
  ).toBeVisible();
});

test("gestisce preferiti e cancellazione iscrizione con conferma accessibile", async ({ page }) => {
  const state = await openProgressedGame(page);
  const member = state.contacts.find(
    (contact) => contact.status === "enrolled" && contact.rarity !== "legendary",
  );
  if (!member) throw new Error("La fixture deve contenere almeno un iscritto cancellabile");
  const displayName = `${member.firstName} ${member.lastName}`;

  await page.getByRole("button", { name: "Scuola", exact: true }).click();
  const favorite = page.getByRole("button", {
    name: `Aggiungi ${displayName} ai preferiti`,
  });
  await favorite.click();
  const removeFavorite = page.getByRole("button", {
    name: `Rimuovi ${displayName} dai preferiti`,
  });
  await expect(removeFavorite).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", {
      name: `Iscrizione protetta per ${displayName}: atleta preferito`,
    }),
  ).toBeDisabled();
  await removeFavorite.click();

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

test("fonda una nuova scuola dalla Rete dell'Ordine dopo il titolo nazionale", async ({ page }) => {
  const state = createProgressedGameSave();
  state.tournaments.nationalTitlesCurrentSchool = 1;
  await installGameSave(page, state);
  await page.goto("/");
  await page.getByRole("button", { name: "Pausa" }).click();
  await page.getByRole("button", { name: "Rete", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Rete dell'Ordine" })).toBeVisible();
  await page.getByRole("button", { name: "Fonda una nuova scuola…" }).click();
  await page.getByLabel("Nome della scuola").fill("Onde di Levante");
  await page.getByLabel("Città").fill("La Spezia");
  await page.getByRole("button", { name: "Fonda Onde di Levante" }).click();

  // The new school starts back on the email composer.
  await expect(page.getByRole("heading", { name: "Rete dell'Ordine" })).toHaveCount(0);
  await page.locator(".moment-layer").getByRole("button", { name: /Salta|Chiudi/ }).click();
  await page.getByRole("button", { name: "Rete", exact: true }).click();
  await expect(page.getByText(/Onde di Levante · v/)).toBeVisible();
  await page.getByRole("button", { name: "« Sede madre" }).click();
  await expect(page.getByText(new RegExp(`N° 1 · ${state.school.name} · ${state.school.city}`))).toBeVisible();
  await expect(page.getByRole("button", { name: "Fonda una nuova scuola…" })).toBeDisabled();
});
