import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../content/mastery";
import { FORMS_TEACHING_TUTORIAL_SCENE_ID, TUTORIAL_SCENES } from "../content/tutorialScenes";
import { addAdminMembers } from "./adminFlow";
import { createInitialState, gameReducer } from "./engine";
import { isGameAreaUnlocked } from "./progression";
import type { Collaborator, GameState } from "./types";

const andrea: Collaborator = {
  id: "collaborator-andrea",
  contactId: "contact-andrea",
  displayName: "Andrea Simonazzi",
  joinedAt: 1_000,
  forms: [],
  instructorForms: [],
  formBranchPreferences: [],
  assignment: null,
  mastery: createInitialCollaboratorMastery(),
  rarity: "legendary",
  specialProfileId: "andrea-simonazzi",
};

function school(members: number): GameState {
  const withMembers = addAdminMembers(createInitialState(1_000, "Test"), members);
  return { ...withMembers, collaborators: [andrea], school: { ...withMembers.school, euros: 1_000 } };
}

const tick = (state: GameState) => gameReducer(state, { type: "TICK", now: 2_000 });
const scene = TUTORIAL_SCENES.find(({ id }) => id === FORMS_TEACHING_TUTORIAL_SCENE_ID)!;

describe("Forme, Istruttori e Tornei a 10 iscritti (08/10/2026)", () => {
  it("opens the Forme at 10 members and Tornei only with 8 athletes with Forma 1, also in a founded school", () => {
    const nine = tick(school(9));
    expect(nine.unlocks.forms).toBe(false);

    const ten = tick(school(10));
    expect(ten.unlocks.forms).toBe(true);
    expect(isGameAreaUnlocked("tournaments", ten)).toBe(false);
    expect(isGameAreaUnlocked("tournaments", { ...ten, network: { ...ten.network, schoolCount: 1 } })).toBe(false);

    const withAthletes = (count: number) => {
      let trained = 0;
      return gameReducer({
        ...ten,
        contacts: ten.contacts.map((contact) =>
          contact.status === "enrolled" && trained++ < count ? { ...contact, forms: ["form-1"] } : contact),
      }, { type: "TICK", now: 3_000 });
    };
    // One of the ten is a collaborator (a Leggendario) without Forme: 8 trained = 7 athletes.
    expect(withAthletes(8).unlocks.tournaments).toBe(false);
    const eight = withAthletes(9);
    expect(eight.unlocks.tournaments).toBe(true);
    expect(isGameAreaUnlocked("tournaments", eight)).toBe(true);
    expect(eight.messages[0].subject).toBe("Si apre la stagione dei tornei");
  });

  it("keeps the Area Istruttore closed until the Forme open", () => {
    const assign = (state: GameState) => gameReducer(state, {
      type: "ASSIGN_COLLABORATOR",
      collaboratorId: andrea.id,
      assignment: "instructor",
      now: 2_000,
    });
    expect(assign(tick(school(9))).collaborators[0].assignment).toBeNull();
    expect(assign(tick(school(10))).collaborators[0].assignment).toBe("instructor");
  });

  it("gives the first Forma 1 as Istruttore for free during the tutorial, only once", () => {
    const ready = gameReducer(tick(school(10)), {
      type: "ASSIGN_COLLABORATOR",
      collaboratorId: andrea.id,
      assignment: "instructor",
      now: 2_000,
    });
    const start = (state: GameState) => gameReducer(state, {
      type: "START_FORM_TRAINING",
      personId: andrea.id,
      formId: "form-1",
      now: 3_000,
    });

    expect(scene.canStart({ state: ready, activeView: "mail" })).toBe(true);
    const assignStep = scene.steps.find(({ id }) => id === "assign-first-instructor")!;
    const courseStep = scene.steps.find(({ id }) => id === "instructor-form-1")!;
    expect(assignStep.kind === "objective" && assignStep.isComplete({ state: ready, activeView: "contacts" })).toBe(true);

    const free = start(ready);
    expect(free.school.euros).toBe(ready.school.euros);
    expect(free.collaborators[0].training?.includesInstructorCertification).toBe(true);
    expect(courseStep.kind === "objective" && courseStep.isComplete({ state: free, activeView: "contacts" })).toBe(true);

    const afterTutorial = start({
      ...ready,
      tutorial: { ...ready.tutorial, completedSceneIds: [...ready.tutorial.completedSceneIds, FORMS_TEACHING_TUTORIAL_SCENE_ID] },
    });
    expect(afterTutorial.school.euros).toBeLessThan(ready.school.euros);
  });
});
