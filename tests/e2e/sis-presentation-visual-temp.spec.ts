import { expect, test, type Page } from "@playwright/test";
import { createProgressedGameSave, E2E_PLAYER_NAME, installGameSave } from "./support/gameSave";

const outputDir = "C:/Users/a.simonazzi/.codex/visualizations/2026/07/30/019fb267-12c7-7373-83b7-ce0aedcc61d1";

function createSisState(aggregateViewUnlocked: boolean) {
  const state = createProgressedGameSave();
  state.collaborators = [{
    id: "visual-sis-candidate",
    contactId: state.contacts[0].id,
    displayName: "Lorenzo Todaro",
    joinedAt: state.createdAt,
    forms: [
      "form-1",
      "course-x",
      "form-2",
      "course-y",
      "form-3-long",
      "form-4-long",
      "form-5-long",
    ],
    instructorForms: [
      "form-1",
      "course-x",
      "form-2",
      "course-y",
      "form-3-long",
      "form-4-long",
      "form-5-long",
    ],
    technicianForms: ["form-1", "course-x", "form-2", "course-y"],
    formBranchPreferences: [],
    assignment: "instructor",
    mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
    rarity: "ultra-rare",
  }];
  state.school.euros = 100_000;
  state.unlocks.collaborators = true;
  state.unlocks.forms = true;
  state.upgrades["sis-accreditation"] = 1;
  state.collaboratorManagement.aggregateViewUnlocked = aggregateViewUnlocked;
  state.collaboratorManagement.targets = {
    writing: 0,
    events: 0,
    equipment: 0,
    instructor: 1,
  };
  return state;
}

async function openSchool(page: Page, aggregateViewUnlocked: boolean) {
  await installGameSave(page, createSisState(aggregateViewUnlocked));
  await page.goto("/");
  await expect(page.getByText(`Profilo: ${E2E_PLAYER_NAME}`)).toBeVisible();
  await page.getByRole("button", { name: "Pausa" }).click();
  await page.getByRole("button", { name: "Scuola", exact: true }).click();
}

test("mostra SIS inline nel Centro Didattico", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSchool(page, true);
  await page.getByRole("button", { name: "Apri centro didattico" }).click();

  const panel = page.getByRole("dialog", { name: "Istruttori" });
  const technicianTraining = panel.getByLabel("Formazione Tecnici", { exact: true });
  await expect(panel).toBeVisible();
  await expect(technicianTraining.getByText("Corso Tecnici")).toHaveCount(0);
  await expect(technicianTraining.getByRole("button", { name: /Corso Tecnici/ })).toHaveCount(0);
  await expect(technicianTraining.getByText("Scegli il percorso da Tecnico")).toBeVisible();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${outputDir}/teaching-center-sis-inline-desktop.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel).toBeVisible();
  expect(await panel.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${outputDir}/teaching-center-sis-inline-mobile.png` });
});

test("mantiene SIS richiudibile nella lista collaboratori", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSchool(page, false);

  const collaboratorList = page.getByRole("region", { name: "Collaboratori delle Onde" });
  const sisToggle = collaboratorList.getByRole("button", { name: /Corso Tecnici/ });
  await expect(collaboratorList).toBeVisible();
  await expect(sisToggle).toHaveAttribute("aria-expanded", "false");
  await expect(collaboratorList.getByText("Scegli il percorso da Tecnico")).toHaveCount(0);
  await sisToggle.click();
  await expect(sisToggle).toHaveAttribute("aria-expanded", "true");
  await expect(collaboratorList.getByText("Scegli il percorso da Tecnico")).toBeVisible();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${outputDir}/collaborator-list-sis-collapsible-desktop.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(collaboratorList).toBeVisible();
  expect(await collaboratorList.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${outputDir}/collaborator-list-sis-collapsible-mobile.png` });
});
