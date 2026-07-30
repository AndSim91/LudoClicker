import { act, renderHook, waitFor } from "@testing-library/react";
import { useCallback, useState } from "react";
import { describe, expect, it } from "vitest";
import {
  COLLABORATOR_TEACHING_TUTORIAL_SCENE_ID,
  LEGACY_TUTORIAL_SCENE_IDS,
} from "../../content/tutorialScenes";
import { gameReducer } from "../../game/engine";
import { createInitialState } from "../../game/initialState";
import type { Collaborator, GameAction, GameState } from "../../game/types";
import { useTutorialController } from "./useTutorialController";

function useTutorialHarness() {
  const [state, setState] = useState(() => createInitialState(1_000, "Andrea Ungaro"));
  const [activeView, setActiveView] = useState("mail");
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const dispatch = useCallback((action: GameAction) => {
    setState((current) => gameReducer(current, action));
  }, []);
  const onNavigate = useCallback((targetView: string) => {
    setActiveView(targetView);
    setNavigationHistory((current) => [...current, targetView]);
  }, []);
  const tutorial = useTutorialController({ state, activeView, dispatch, onNavigate });

  return {
    state,
    tutorial,
    activeView,
    navigationHistory,
    setActiveView,
    replaceGame: (now: number) => dispatch({
      type: "REPLACE_STATE",
      state: createInitialState(now, "Andrea Ungaro"),
    }),
    setStatistics: (statistics: Partial<GameState["statistics"]>) =>
      setState((current) => ({
        ...current,
        statistics: { ...current.statistics, ...statistics },
      })),
    setFirstEmailSending: () => setState((current) => ({
      ...current,
      emails: current.emails.map((email, index) => index === 0
        ? { ...email, status: "sending" as const, sendCompletesAt: 1_350 }
        : email),
    })),
    unlockEvents: () => setState((current) => ({
      ...current,
      tutorial: {
        ...current.tutorial,
        completedSceneIds: ["first-invitation"],
      },
      shortGoal: {
        definitionId: "book-trials",
        baseline: 0,
        target: 2,
        startedAt: 1_500,
        completedCount: 1,
        isActive: true,
      },
    })),
    startFreeSparring: () => setState((current) => gameReducer(current, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "park-sparring",
      now: 2_000,
    })),
    tick: (now: number) => setState((current) => gameReducer(current, {
      type: "TICK",
      now,
    })),
    showTutorialTrial: () => setState((current) => ({
      ...current,
      statistics: {
        ...current.statistics,
        trialsBooked: current.statistics.trialsBooked + 1,
      },
      scheduledTrials: [...current.scheduledTrials, {
        id: "trial-tutorial",
        contactId: current.contacts[0].id,
        startsAt: 30_000,
        resolvesAt: 40_000,
        resultSeed: 1,
        status: "scheduled" as const,
        tutorialSceneId: "first-event" as const,
      }],
    })),
    showAndreaDraft: () => setState((current) => {
      const ordinaryContacts = [
        ...current.contacts,
        ...current.contacts.slice(0, 3).map((contact, index) => ({
          ...contact,
          id: `legendary-padding-${index}`,
          status: "invited" as const,
          rarity: "common" as const,
        })),
      ].map((contact) => ({ ...contact, status: "invited" as const }));
      const andrea = {
        ...current.contacts[0],
        id: "andrea-ninth-contact",
        firstName: "Andrea",
        lastName: "Simonazzi",
        email: "andrea.simonazzi@ludosport.net",
        status: "writing" as const,
        rarity: "legendary" as const,
        specialProfileId: "andrea-simonazzi" as const,
      };
      return {
        ...current,
        contacts: [...ordinaryContacts, andrea],
        emails: [{
          ...current.emails[0],
          id: "andrea-draft",
          contactId: andrea.id,
          status: "writing" as const,
          revealedCharacters: 0,
        }],
        tutorial: {
          completedSceneIds: ["first-invitation", "first-event", "first-trial"],
          skippedSceneIds: [],
        },
        legendaryCollaborators: {
          ...current.legendaryCollaborators,
          encounteredProfileIds: ["andrea-simonazzi"],
        },
      };
    }),
    showFirstCollaborator: (
      firstEnrollmentFinished = true,
      assignment: Collaborator["assignment"] = null,
    ) => setState((current) => ({
      ...current,
      contacts: current.contacts.map((contact, index) => index === 0
        ? { ...contact, status: "enrolled" as const }
        : contact),
      school: { ...current.school, activeMembers: 1 },
      collaborators: [{
        id: "first-tutorial-collaborator",
        contactId: current.contacts[0].id,
        displayName: "Primo Collaboratore",
        joinedAt: 2_000,
        forms: [],
        instructorForms: [],
        assignment,
        rarity: "legendary" as const,
      }],
      statistics: {
        ...current.statistics,
        membersEnrolled: 1,
        collaboratorsRecruited: 1,
      },
      unlocks: { ...current.unlocks, collaborators: true },
      tutorial: {
        completedSceneIds: [
          "first-invitation",
          "first-event",
          "first-trial",
          "first-legendary",
          ...(firstEnrollmentFinished ? ["first-enrollment"] : []),
        ],
        skippedSceneIds: [],
      },
    })),
    assignFirstCollaborator: (assignment: Exclude<Collaborator["assignment"], null>) =>
      setState((current) => gameReducer(current, {
        type: "ASSIGN_COLLABORATOR",
        collaboratorId: current.collaborators[0].id,
        assignment,
        now: 2_500,
      })),
    unlockGadgets: () => setState((current) => ({
      ...current,
      tutorial: {
        completedSceneIds: [...LEGACY_TUTORIAL_SCENE_IDS],
        skippedSceneIds: [],
      },
      unlocks: {
        ...current.unlocks,
        gadget: true,
      },
    })),
    triggerCollaboratorTeachingTutorial: () => setState((current) => ({
      ...current,
      tutorial: {
        completedSceneIds: [
          ...LEGACY_TUTORIAL_SCENE_IDS,
          "first-collaborator",
        ],
        skippedSceneIds: [],
        triggeredSceneIds: [COLLABORATOR_TEACHING_TUTORIAL_SCENE_ID],
      },
    })),
  };
}

describe("useTutorialController", () => {
  it("alternates paused dialogue and interactive objectives, then persists completion", async () => {
    const { result } = renderHook(() => useTutorialHarness());

    await waitFor(() => expect(result.current.tutorial.activeScene?.id).toBe("first-invitation"));
    expect(result.current.tutorial.activeStep?.kind).toBe("dialog");
    expect(result.current.tutorial.isBlockingInput).toBe(true);
    expect(result.current.tutorial.shouldPauseGame).toBe(true);

    act(() => result.current.tutorial.continueScene());
    act(() => result.current.tutorial.continueScene());

    expect(result.current.tutorial.activeStep?.kind).toBe("objective");
    expect(result.current.tutorial.isBlockingInput).toBe(false);
    expect(result.current.tutorial.shouldPauseGame).toBe(true);

    act(() => result.current.setFirstEmailSending());

    await waitFor(() => {
      expect(result.current.state.tutorial.completedSceneIds).toContain("first-invitation");
    });
    expect(result.current.state.statistics.emailsSent).toBe(0);
    expect(result.current.state.shortGoal.baseline).toBe(1);
    expect(result.current.tutorial.activeScene).toBeNull();
    expect(result.current.tutorial.shouldPauseGame).toBe(false);
  });

  it("records Salta for the current scene without marking it completed", async () => {
    const { result } = renderHook(() => useTutorialHarness());
    await waitFor(() => expect(result.current.tutorial.activeScene?.id).toBe("first-invitation"));

    act(() => result.current.tutorial.skipScene());

    await waitFor(() => {
      expect(result.current.state.tutorial.skippedSceneIds).toContain("first-invitation");
    });
    expect(result.current.state.tutorial.completedSceneIds).not.toContain("first-invitation");
  });

  it("returns to the first dialogue after replacing the current game", async () => {
    const { result } = renderHook(() => useTutorialHarness());

    act(() => result.current.tutorial.continueScene());
    act(() => result.current.tutorial.continueScene());
    expect(result.current.tutorial.activeStep?.id).toBe("write-first-email");

    act(() => result.current.replaceGame(2_000));

    await waitFor(() => expect(result.current.state.createdAt).toBe(2_000));
    expect(result.current.tutorial.activeScene?.id).toBe("first-invitation");
    expect(result.current.tutorial.activeStep?.id).toBe("empty-school");
    expect(result.current.tutorial.activeStep?.kind).toBe("dialog");
  });

  it("returns to Mail and closes the first tutorial round after presenting the trial", async () => {
    const { result } = renderHook(() => useTutorialHarness());

    act(() => result.current.unlockEvents());

    await waitFor(() => expect(result.current.tutorial.activeScene?.id).toBe("first-event"));
    expect(result.current.tutorial.activeStep?.id).toBe("open-events");
    expect(result.current.tutorial.isBlockingInput).toBe(false);
    expect(result.current.tutorial.shouldPauseGame).toBe(false);

    act(() => result.current.setActiveView("events"));

    expect(result.current.tutorial.activeStep?.id).toBe("events-and-equipment");
    expect(result.current.tutorial.isBlockingInput).toBe(true);
    expect(result.current.tutorial.shouldPauseGame).toBe(true);

    act(() => result.current.tutorial.continueScene());

    expect(result.current.tutorial.activeStep?.id).toBe("start-free-sparring");
    expect(result.current.tutorial.isBlockingInput).toBe(false);
    expect(result.current.tutorial.shouldPauseGame).toBe(false);

    act(() => result.current.startFreeSparring());

    expect(result.current.state.acquisitionEvents).toContainEqual(
      expect.objectContaining({
        definitionId: "park-sparring",
        status: "running",
        resolvesAt: 7_000,
        tutorialSceneId: "first-event",
      }),
    );
    expect(result.current.tutorial.activeStep?.id).toBe("wait-free-sparring");
    expect(result.current.tutorial.shouldPauseGame).toBe(false);

    act(() => result.current.tick(7_000));

    expect(result.current.tutorial.activeStep?.id).toBe("contacts-increased");
    expect(result.current.tutorial.activeStep?.kind).toBe("dialog");
    expect(result.current.tutorial.shouldPauseGame).toBe(true);

    act(() => result.current.tutorial.continueScene());

    expect(result.current.tutorial.activeStep?.id).toBe("watch-first-trial");
    expect(result.current.tutorial.shouldPauseGame).toBe(false);
    expect(result.current.activeView).toBe("mail");
    expect(result.current.navigationHistory).toEqual(["mail"]);

    act(() => result.current.showTutorialTrial());

    await waitFor(() => {
      expect(result.current.state.tutorial.completedSceneIds).toContain("first-event");
    });
    expect(result.current.state.tutorial.completedSceneIds).not.toContain("first-trial");
    expect(result.current.tutorial.activeScene?.id).toBe("first-trial");
    expect(result.current.tutorial.activeStep?.id).toBe("trial-booked");
    expect(result.current.tutorial.activeStep?.kind).toBe("dialog");
    expect(result.current.tutorial.shouldPauseGame).toBe(true);

    act(() => result.current.tutorial.continueScene());

    await waitFor(() => {
      expect(result.current.state.tutorial.completedSceneIds).toContain("first-trial");
    });
    expect(result.current.tutorial.activeScene).toBeNull();
    expect(result.current.tutorial.shouldPauseGame).toBe(false);
  });

  it("keeps the Events tutorial ahead of later scenes once the mission unlocks it", async () => {
    const { result } = renderHook(() => useTutorialHarness());

    act(() => result.current.setStatistics({ trialsBooked: 1, membersEnrolled: 1 }));
    act(() => result.current.unlockEvents());

    await waitFor(() => expect(result.current.tutorial.activeScene?.id).toBe("first-event"));
    expect(result.current.tutorial.activeStep?.id).toBe("open-events");
  });

  it("returns to Mail and explains rarities when Andrea becomes the ninth draft", async () => {
    const { result } = renderHook(() => useTutorialHarness());

    act(() => result.current.setActiveView("events"));
    act(() => result.current.showAndreaDraft());

    await waitFor(() => {
      expect(result.current.tutorial.activeScene?.id).toBe("first-legendary");
      expect(result.current.activeView).toBe("mail");
    });
    expect(result.current.state.contacts).toHaveLength(9);
    expect(result.current.state.contacts[8]).toMatchObject({
      specialProfileId: "andrea-simonazzi",
      rarity: "legendary",
      status: "writing",
    });
    expect(result.current.navigationHistory).toEqual(["mail"]);
    expect(result.current.tutorial.activeStep?.id).toBe("legendary-rarities");
    expect(result.current.tutorial.activeStep?.kind).toBe("dialog");
    expect(result.current.tutorial.shouldPauseGame).toBe(true);

    act(() => result.current.tutorial.continueScene());

    await waitFor(() => {
      expect(result.current.state.tutorial.completedSceneIds).toContain("first-legendary");
    });
    expect(result.current.tutorial.activeScene).toBeNull();
    expect(result.current.tutorial.shouldPauseGame).toBe(false);
  });

  it("queues the first collaborator after the first enrollment and waits for its assignment", async () => {
    const { result } = renderHook(() => useTutorialHarness());

    act(() => result.current.showFirstCollaborator(false));

    await waitFor(() => {
      expect(result.current.tutorial.activeScene?.id).toBe("first-enrollment");
    });
    expect(result.current.tutorial.activeStep?.id).toBe("first-fee");

    act(() => result.current.tutorial.continueScene());
    expect(result.current.tutorial.activeStep?.id).toBe("open-upgrades");

    act(() => result.current.setActiveView("upgrades"));
    await waitFor(() => {
      expect(result.current.tutorial.activeStep?.id).toBe("upgrade-tree");
    });

    act(() => result.current.tutorial.continueScene());
    await waitFor(() => {
      expect(result.current.tutorial.activeScene?.id).toBe("first-collaborator");
    });
    expect(result.current.tutorial.activeStep?.id).toBe("collaborator-introduction");
    expect(result.current.tutorial.shouldPauseGame).toBe(true);

    act(() => result.current.tutorial.continueScene());
    expect(result.current.tutorial.activeStep?.id).toBe("open-first-collaborator");

    act(() => result.current.setActiveView("contacts"));
    await waitFor(() => {
      expect(result.current.tutorial.activeStep?.id).toBe("collaborator-areas");
    });

    act(() => result.current.tutorial.continueScene());
    expect(result.current.tutorial.activeStep?.id).toBe("assign-first-collaborator");
    expect(result.current.tutorial.shouldPauseGame).toBe(true);

    act(() => result.current.assignFirstCollaborator("events"));
    await waitFor(() => {
      expect(result.current.state.tutorial.completedSceneIds).toContain("first-collaborator");
    });
    expect(result.current.state.collaborators[0].assignment).toBe("events");
    expect(result.current.tutorial.activeScene).toBeNull();
    expect(result.current.tutorial.shouldPauseGame).toBe(false);
  });

  it("skips navigation when Scuola is already open and accepts an existing assignment", async () => {
    const { result } = renderHook(() => useTutorialHarness());

    act(() => result.current.setActiveView("contacts"));
    act(() => result.current.showFirstCollaborator(true, "writing"));

    await waitFor(() => {
      expect(result.current.tutorial.activeScene?.id).toBe("first-collaborator");
    });
    act(() => result.current.tutorial.continueScene());
    expect(result.current.tutorial.activeStep?.id).toBe("collaborator-areas");

    act(() => result.current.tutorial.continueScene());
    await waitFor(() => {
      expect(result.current.state.tutorial.completedSceneIds).toContain("first-collaborator");
    });
    expect(result.current.tutorial.activeScene).toBeNull();
  });

  it("shows the one-message teaching tutorial only after its situational trigger", async () => {
    const { result } = renderHook(() => useTutorialHarness());

    act(() => result.current.triggerCollaboratorTeachingTutorial());

    await waitFor(() => {
      expect(result.current.tutorial.activeScene?.id).toBe(
        COLLABORATOR_TEACHING_TUTORIAL_SCENE_ID,
      );
    });
    expect(result.current.tutorial.activeScene?.steps).toHaveLength(1);
    expect(result.current.tutorial.activeStep).toMatchObject({
      id: "collaborator-teaching-discount",
      kind: "dialog",
      speaker: "A.N.D.E.R.",
      body: [
        "Ora che abbiamo i Collaboratori delle Onde, potremmo impiegarli nell'insegnamento. Questo non è solo utile per automatizzare i processi ripetitivi della scuola, ma porta anche un considerevole sconto sui corsi! (Siamo genovesi dopotutto)",
      ],
    });
    expect(result.current.tutorial.isBlockingInput).toBe(true);

    act(() => result.current.tutorial.continueScene());

    await waitFor(() => {
      expect(result.current.state.tutorial.completedSceneIds).toContain(
        COLLABORATOR_TEACHING_TUTORIAL_SCENE_ID,
      );
    });
    expect(result.current.state.tutorial.triggeredSceneIds).not.toContain(
      COLLABORATOR_TEACHING_TUTORIAL_SCENE_ID,
    );
    expect(result.current.tutorial.activeScene).toBeNull();
  });

  it("explains the Gadget laboratory and persists completion", async () => {
    const { result } = renderHook(() => useTutorialHarness());

    act(() => result.current.unlockGadgets());

    await waitFor(() => {
      expect(result.current.tutorial.activeScene?.id).toBe("gadget-laboratory");
    });
    expect(result.current.tutorial.activeStep?.id).toBe("gadget-unlocked");
    expect(result.current.tutorial.shouldPauseGame).toBe(true);

    act(() => result.current.tutorial.continueScene());
    expect(result.current.tutorial.activeStep?.id).toBe("open-gadgets");
    expect(result.current.tutorial.activeStep?.kind).toBe("objective");

    act(() => result.current.setActiveView("gadget"));
    await waitFor(() => {
      expect(result.current.tutorial.activeStep?.id).toBe("gadget-workshop");
    });

    act(() => result.current.tutorial.continueScene());
    expect(result.current.tutorial.activeStep?.id).toBe("gadget-catalog-flow");

    act(() => result.current.tutorial.continueScene());
    await waitFor(() => {
      expect(result.current.state.tutorial.completedSceneIds).toContain("gadget-laboratory");
    });
    expect(result.current.tutorial.activeScene).toBeNull();
    expect(result.current.tutorial.shouldPauseGame).toBe(false);
  });
});
