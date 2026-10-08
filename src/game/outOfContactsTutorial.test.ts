import { expect, it } from "vitest";
import { OUT_OF_CONTACTS_TUTORIAL_SCENE_ID, TUTORIAL_SCENES } from "../content/tutorialScenes";
import { createInitialState } from "./engine";
import { migrateOutOfContactsTutorialState } from "./saveMigrations/outOfContactsTutorial";
import type { GameState } from "./types";
import type { MigratableState } from "./saveMigrations/types";

const scene = TUTORIAL_SCENES.find((entry) => entry.id === OUT_OF_CONTACTS_TUTORIAL_SCENE_ID)!;
const canStart = (state: GameState) => scene.canStart({ state, activeView: "admin" });

it("reminds about the Eventi once nobody is left to write to and no event is out", () => {
  const initial = createInitialState(1_000, "Test");
  const afterEvents = { ...initial, tutorial: { ...initial.tutorial, completedSceneIds: ["first-event"] } };
  expect(canStart(afterEvents)).toBe(false);

  const empty = { ...afterEvents, contacts: afterEvents.contacts.map((contact) => ({ ...contact, status: "enrolled" as const })) };
  expect(canStart(empty)).toBe(true);
  expect(canStart({ ...empty, tutorial: initial.tutorial })).toBe(false);
  expect(canStart({
    ...empty,
    acquisitionEvents: [{ status: "running" } as GameState["acquisitionEvents"][number]],
  })).toBe(false);
});

it("counts the reminder as seen in saves past 10 members", () => {
  const save = (peakActiveMembers: number) => ({
    version: 108,
    school: { peakActiveMembers },
    network: { schoolCount: 0 },
    tutorial: { completedSceneIds: [], skippedSceneIds: [] },
  }) as unknown as MigratableState;
  expect(migrateOutOfContactsTutorialState(save(12)).tutorial?.completedSceneIds).toContain("out-of-contacts");
  expect(migrateOutOfContactsTutorialState(save(3)).tutorial?.completedSceneIds).toEqual([]);
});
