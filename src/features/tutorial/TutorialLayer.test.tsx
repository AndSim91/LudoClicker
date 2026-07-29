import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  resolveTutorialRegions,
  TUTORIAL_SCENES,
  type TutorialRegionId,
} from "../../content/tutorialScenes";
import { AppRail } from "../../components/outlook-shell/AppRail";
import { Composer } from "../../components/outlook-shell/Composer";
import { createInitialState } from "../../game/initialState";
import { TutorialLayer } from "./TutorialLayer";

describe("TutorialLayer", () => {
  it("assigns a precise target to every guided objective", () => {
    const state = createInitialState(1_000, "Andrea Ungaro");
    const expectations: Array<{
      sceneId: string;
      stepId: string;
      activeView: string;
      target: TutorialRegionId;
    }> = [
      { sceneId: "first-invitation", stepId: "write-first-email", activeView: "mail", target: "composer-body" },
      { sceneId: "first-event", stepId: "open-events", activeView: "mail", target: "events-navigation" },
      { sceneId: "first-event", stepId: "start-free-sparring", activeView: "events", target: "park-sparring-action" },
      { sceneId: "first-event", stepId: "wait-free-sparring", activeView: "events", target: "park-sparring-event" },
      { sceneId: "first-event", stepId: "watch-first-trial", activeView: "events", target: "day-panel" },
      { sceneId: "first-trial", stepId: "trial-booked", activeView: "mail", target: "first-trial-row" },
      { sceneId: "first-legendary", stepId: "legendary-rarities", activeView: "mail", target: "composer-header" },
      { sceneId: "first-enrollment", stepId: "open-upgrades", activeView: "events", target: "upgrades-navigation" },
      { sceneId: "first-collaborator", stepId: "open-first-collaborator", activeView: "mail", target: "contacts-navigation" },
      { sceneId: "first-collaborator", stepId: "assign-first-collaborator", activeView: "contacts", target: "collaborator-section" },
      { sceneId: "collaborator-sectors", stepId: "open-collaborator-sectors", activeView: "mail", target: "contacts-navigation" },
      { sceneId: "social-evolution", stepId: "open-collaborators", activeView: "mail", target: "contacts-navigation" },
      { sceneId: "social-evolution", stepId: "assign-social-collaborator", activeView: "contacts", target: "collaborator-social-assignment" },
      { sceneId: "gadget-laboratory", stepId: "open-gadgets", activeView: "mail", target: "gadget-navigation" },
    ];

    for (const expectation of expectations) {
      const scene = TUTORIAL_SCENES.find(({ id }) => id === expectation.sceneId)!;
      const step = scene.steps.find(({ id }) => id === expectation.stepId)!;
      expect(resolveTutorialRegions(step.focusRegions, {
        state,
        activeView: expectation.activeView,
      })).toContain(expectation.target);
    }
  });

  it("presents the first collaborator and completes only after assigning that person", () => {
    const scene = TUTORIAL_SCENES.find(({ id }) => id === "first-collaborator")!;
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const firstCollaborator = {
      id: "first-collaborator",
      contactId: initial.contacts[0].id,
      displayName: "Primo Collaboratore",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: null,
      rarity: "legendary" as const,
    };
    const secondCollaborator = {
      ...firstCollaborator,
      id: "second-collaborator",
      displayName: "Secondo Collaboratore",
      joinedAt: 2_000,
      assignment: "events" as const,
    };
    const available = {
      ...initial,
      collaborators: [firstCollaborator, secondCollaborator],
    };
    const introduction = scene.steps.find(({ id }) => id === "collaborator-introduction")!;
    const assignment = scene.steps.find(({ id }) => id === "assign-first-collaborator")!;

    expect(scene.pauseWhileActive).toBe(true);
    expect(scene.canStart({ state: initial, activeView: "mail" })).toBe(false);
    expect(scene.canStart({ state: available, activeView: "mail" })).toBe(true);
    expect(introduction.body).toEqual([
      "Abbiamo il nostro primo Collaboratore delle Onde! Ogni collaboratore può occuparsi di una sola delle Aree di Attività disponibili alla volta e, a suon di lavorare alacremente per la scuola di Genova, accumulerà punti Maestria che lo renderanno sempre più bravo ed efficace!",
    ]);
    expect(assignment.kind).toBe("objective");
    if (assignment.kind !== "objective") return;
    expect(assignment.isComplete({ state: available, activeView: "contacts" })).toBe(false);
    expect(assignment.isComplete({
      state: {
        ...available,
        collaborators: [{ ...firstCollaborator, assignment: "writing" }, secondCollaborator],
      },
      activeView: "contacts",
    })).toBe(true);
  });

  it("starts the paused aggregate tutorial only after the permanent unlock", () => {
    const scene = TUTORIAL_SCENES.find(({ id }) => id === "collaborator-sectors")!;
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const unlocked = {
      ...initial,
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        aggregateViewUnlocked: true,
      },
    };

    expect(scene.pauseWhileActive).toBe(true);
    expect(scene.canStart({ state: initial, activeView: "contacts" })).toBe(false);
    expect(scene.canStart({ state: unlocked, activeView: "contacts" })).toBe(true);
  });

  it("starts the paused Social tutorial only after the permanent unlock", () => {
    const scene = TUTORIAL_SCENES.find(({ id }) => id === "social-evolution")!;
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const unlocked = {
      ...initial,
      unlocks: { ...initial.unlocks, social: true },
    };
    const assignmentStep = scene.steps.find(
      ({ id }) => id === "assign-social-collaborator",
    )!;

    expect(scene.pauseWhileActive).toBe(true);
    expect(scene.canStart({ state: initial, activeView: "contacts" })).toBe(false);
    expect(scene.canStart({ state: unlocked, activeView: "contacts" })).toBe(true);
    expect(assignmentStep.kind).toBe("objective");
    if (assignmentStep.kind !== "objective") return;
    expect(assignmentStep.isComplete({ state: unlocked, activeView: "contacts" })).toBe(false);
    expect(resolveTutorialRegions(assignmentStep.focusRegions, {
      state: {
        ...unlocked,
        collaboratorManagement: {
          ...unlocked.collaboratorManagement,
          aggregateViewUnlocked: true,
        },
      },
      activeView: "contacts",
    })).toContain("collaborator-sectors");
    expect(assignmentStep.isComplete({
      state: {
        ...unlocked,
        collaborators: [{
          id: "social-tutorial-collaborator",
          contactId: initial.contacts[0].id,
          displayName: "Collaboratore Social",
          joinedAt: 1_000,
          forms: [],
          instructorForms: [],
          assignment: "writing",
          rarity: "ultra-rare",
        }],
      },
      activeView: "contacts",
    })).toBe(true);
  });

  it("starts the paused Gadget tutorial only after the permanent unlock", () => {
    const scene = TUTORIAL_SCENES.find(({ id }) => id === "gadget-laboratory")!;
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const unlocked = {
      ...initial,
      unlocks: { ...initial.unlocks, gadget: true },
    };
    const workshopStep = scene.steps.find(({ id }) => id === "gadget-workshop")!;
    const catalogStep = scene.steps.find(({ id }) => id === "gadget-catalog-flow")!;

    expect(scene.pauseWhileActive).toBe(true);
    expect(scene.canStart({ state: initial, activeView: "mail" })).toBe(false);
    expect(scene.canStart({ state: unlocked, activeView: "mail" })).toBe(true);
    expect(resolveTutorialRegions(workshopStep.focusRegions, {
      state: unlocked,
      activeView: "gadget",
    })).toContain("gadget-overview");
    expect(resolveTutorialRegions(catalogStep.focusRegions, {
      state: unlocked,
      activeView: "gadget",
    })).toContain("gadget-catalog");
  });

  it("keeps the selected region in focus and disables the others", () => {
    const scene = TUTORIAL_SCENES[0];
    const step = scene.steps[0];
    const onSkip = vi.fn();
    const { container } = render(
      <>
        <header className="title-bar">
          Titolo
          <span data-tutorial-region="contacts-counter">Contatti 2</span>
        </header>
        <div className="command-bar">Comandi</div>
        <div className="workspace"><main>Contenuto</main></div>
        <TutorialLayer
          scene={scene}
          step={step}
          stepIndex={0}
          context={{ state: createInitialState(1_000, "Andrea Ungaro"), activeView: "mail" }}
          onContinue={vi.fn()}
          onSkip={onSkip}
        />
      </>,
    );

    const title = container.querySelector<HTMLElement>(".title-bar")!;
    const contacts = container.querySelector<HTMLElement>(
      '[data-tutorial-region="contacts-counter"]',
    )!;
    const commands = container.querySelector<HTMLElement>(".command-bar")!;
    const main = container.querySelector<HTMLElement>("main")!;
    expect(title.dataset.tutorialTreatment).toBe("focus");
    expect(title.inert).toBe(false);
    expect(contacts.dataset.tutorialTreatment).toBeUndefined();
    expect(contacts.inert).not.toBe(true);
    expect(commands.dataset.tutorialTreatment).toBe("muted");
    expect(commands.inert).toBe(true);
    expect(main.dataset.tutorialTreatment).toBe("muted");

    fireEvent.click(screen.getByRole("button", { name: "Salta questa scena" }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("focuses the exact contacts counter during the contact explanation", () => {
    const scene = TUTORIAL_SCENES.find(({ id }) => id === "first-event")!;
    const step = scene.steps.find(({ id }) => id === "contacts-increased")!;
    const { container } = render(
      <>
        <header className="title-bar">
          <span data-tutorial-region="contacts-counter">Contatti 2</span>
          <span>Iscritti attivi 0</span>
        </header>
        <div className="workspace"><main>Contenuto</main></div>
        <TutorialLayer
          scene={scene}
          step={step}
          stepIndex={4}
          context={{ state: createInitialState(1_000, "Andrea Ungaro"), activeView: "events" }}
          onContinue={vi.fn()}
          onSkip={vi.fn()}
        />
      </>,
    );

    const title = container.querySelector<HTMLElement>(".title-bar")!;
    const contacts = container.querySelector<HTMLElement>(
      '[data-tutorial-region="contacts-counter"]',
    )!;
    expect(title.dataset.tutorialTreatment).toBe("focus");
    expect(contacts.dataset.tutorialTreatment).toBe("focus");
    expect(contacts.inert).toBe(false);
  });

  it("highlights only the Events navigation target while asking to open it", () => {
    const scene = TUTORIAL_SCENES.find(({ id }) => id === "first-event")!;
    const step = scene.steps.find(({ id }) => id === "open-events")!;
    const state = createInitialState(1_000, "Andrea Ungaro");
    state.shortGoal.completedCount = 1;
    const { container } = render(
      <>
        <AppRail view="mail" state={state} onChange={vi.fn()} />
        <div className="workspace"><main>Contenuto</main></div>
        <TutorialLayer
          scene={scene}
          step={step}
          stepIndex={0}
          context={{ state, activeView: "mail" }}
          onContinue={vi.fn()}
          onSkip={vi.fn()}
        />
      </>,
    );

    const navigation = screen.getByRole("navigation", { name: "Applicazioni" });
    const events = screen.getByRole("button", { name: "Eventi" });
    const mail = screen.getByRole("button", { name: "Posta" });
    expect(navigation).toHaveAttribute("data-tutorial-treatment", "focus");
    expect(events).toHaveAttribute("data-tutorial-region", "events-navigation");
    expect(events).toHaveAttribute("data-tutorial-target", "true");
    expect(events).toHaveAttribute("data-tutorial-treatment", "focus");
    expect(events.inert).toBe(false);
    expect(mail).not.toHaveAttribute("data-tutorial-treatment");
    expect(container.querySelector("main")).toHaveAttribute(
      "data-tutorial-treatment",
      "muted",
    );
  });

  it("highlights the Upgrade navigation target while asking to open it", () => {
    const scene = TUTORIAL_SCENES.find(({ id }) => id === "first-enrollment")!;
    const step = scene.steps.find(({ id }) => id === "open-upgrades")!;
    const state = createInitialState(1_000, "Andrea Ungaro");
    state.unlocks.upgrades = true;
    render(
      <>
        <AppRail view="events" state={state} onChange={vi.fn()} />
        <div className="workspace"><main>Contenuto</main></div>
        <TutorialLayer
          scene={scene}
          step={step}
          stepIndex={1}
          context={{ state, activeView: "events" }}
          onContinue={vi.fn()}
          onSkip={vi.fn()}
        />
      </>,
    );

    const upgrades = screen.getByRole("button", { name: "Upgrade" });
    expect(upgrades).toHaveAttribute("data-tutorial-region", "upgrades-navigation");
    expect(upgrades).toHaveAttribute("data-tutorial-treatment", "focus");
    expect(upgrades.inert).toBe(false);
  });

  it("highlights the Gadget navigation target while asking to open it", () => {
    const scene = TUTORIAL_SCENES.find(({ id }) => id === "gadget-laboratory")!;
    const step = scene.steps.find(({ id }) => id === "open-gadgets")!;
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const state = {
      ...initial,
      unlocks: { ...initial.unlocks, gadget: true },
    };
    render(
      <>
        <AppRail view="mail" state={state} onChange={vi.fn()} />
        <div className="workspace"><main>Contenuto</main></div>
        <TutorialLayer
          scene={scene}
          step={step}
          stepIndex={1}
          context={{ state, activeView: "mail" }}
          onContinue={vi.fn()}
          onSkip={vi.fn()}
        />
      </>,
    );

    const gadget = screen.getByRole("button", { name: "Gadget" });
    expect(gadget).toHaveAttribute("data-tutorial-region", "gadget-navigation");
    expect(gadget).toHaveAttribute("data-tutorial-target", "true");
    expect(gadget).toHaveAttribute("data-tutorial-treatment", "focus");
    expect(gadget.inert).toBe(false);
  });

  it("focuses the mail header containing Andrea during the rarity explanation", () => {
    const scene = TUTORIAL_SCENES.find(({ id }) => id === "first-legendary")!;
    const step = scene.steps[0];
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const activeContact = initial.contacts[0];
    const state = {
      ...initial,
      contacts: initial.contacts.map((contact) =>
        contact.id === activeContact.id
          ? {
              ...contact,
              firstName: "Andrea",
              lastName: "Simonazzi",
              rarity: "legendary" as const,
              specialProfileId: "andrea-simonazzi" as const,
            }
          : contact,
      ),
    };
    const { container } = render(
      <>
        <div className="workspace">
          <Composer
            state={state}
            onWrite={vi.fn()}
            onAutomaticSendingChange={vi.fn()}
          />
        </div>
        <TutorialLayer
          scene={scene}
          step={step}
          stepIndex={0}
          context={{ state, activeView: "mail" }}
          onContinue={vi.fn()}
          onSkip={vi.fn()}
        />
      </>,
    );

    const composer = container.querySelector<HTMLElement>("main.composer")!;
    const mailHeader = container.querySelector<HTMLElement>(
      '[data-tutorial-region="composer-header"]',
    )!;
    const recipient = container.querySelector<HTMLElement>(
      '[data-tutorial-region="composer-recipient"]',
    )!;
    expect(composer.dataset.tutorialTreatment).toBe("focus");
    expect(mailHeader.dataset.tutorialTreatment).toBe("focus");
    expect(mailHeader.dataset.tutorialTarget).toBe("true");
    expect(mailHeader.inert).toBe(false);
    expect(recipient).toHaveTextContent("Andrea Simonazzi");
    expect(recipient.dataset.tutorialTarget).toBe("true");
    expect(recipient.dataset.tutorialTreatment).toBeUndefined();
    expect(recipient.inert).not.toBe(true);
    const tutorialCard = container.querySelector<HTMLElement>(".tutorial-card")!;
    expect(container.querySelector(".tutorial-layer")).toHaveClass("is-card-left");
    expect(tutorialCard).toHaveTextContent("Un Leggendario è per sempre");
    expect(tutorialCard).toHaveTextContent("Collezionali tutti!");
  });

  it("scrolls the Gadget catalog into view for its explanation", () => {
    const scene = TUTORIAL_SCENES.find(({ id }) => id === "gadget-laboratory")!;
    const step = scene.steps.find(({ id }) => id === "gadget-catalog-flow")!;
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const state = {
      ...initial,
      unlocks: { ...initial.unlocks, gadget: true },
    };
    const scrollTo = vi.fn();
    const scrollIntoView = vi.fn();
    const previousScrollTo = HTMLElement.prototype.scrollTo;
    const previousScrollIntoView = HTMLElement.prototype.scrollIntoView;
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      render(
        <>
          <div className="workspace">
            <main>
              <section data-tutorial-region="gadget-catalog">Catalogo</section>
            </main>
          </div>
          <TutorialLayer
            scene={scene}
            step={step}
            stepIndex={3}
            context={{ state, activeView: "gadget" }}
            onContinue={vi.fn()}
            onSkip={vi.fn()}
          />
        </>,
      );

      expect(scrollTo).toHaveBeenCalledWith({
        top: 0,
        left: 0,
        behavior: "auto",
      });
      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      if (previousScrollTo) {
        Object.defineProperty(HTMLElement.prototype, "scrollTo", {
          configurable: true,
          value: previousScrollTo,
        });
      } else {
        delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo;
      }
      if (previousScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
          configurable: true,
          value: previousScrollIntoView,
        });
      } else {
        delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
      }
    }
  });
});
