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
    expect(tutorialCard).toHaveTextContent("Il primo Leggendario");
    expect(tutorialCard).toHaveTextContent("Collezionali tutti!");
  });
});
