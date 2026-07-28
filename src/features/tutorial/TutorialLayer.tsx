import { useEffect, useRef } from "react";
import {
  resolveTutorialBody,
  resolveTutorialRegions,
  type TutorialRuntimeContext,
  type TutorialRegionId,
  type TutorialSceneDefinition,
  type TutorialStep,
} from "../../content/tutorialScenes";
import { applyTutorialTreatments } from "./tutorialRegions";

export function TutorialLayer({
  scene,
  step,
  stepIndex,
  context,
  onContinue,
  onSkip,
}: {
  scene: TutorialSceneDefinition;
  step: TutorialStep;
  stepIndex: number;
  context: TutorialRuntimeContext;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const focusRegions = resolveTutorialRegions(step.focusRegions, context);
  const hiddenRegions = resolveTutorialRegions(step.hiddenRegions, context);
  const body = resolveTutorialBody(step.body, context);
  const focusRegionKey = focusRegions.join(",");
  const hiddenRegionKey = hiddenRegions.join(",");

  useEffect(() => applyTutorialTreatments(
    focusRegionKey ? focusRegionKey.split(",") as TutorialRegionId[] : [],
    hiddenRegionKey ? hiddenRegionKey.split(",") as TutorialRegionId[] : [],
  ), [focusRegionKey, hiddenRegionKey]);

  useEffect(() => {
    if (!step.scrollToRegion) return;
    const target = document.querySelector<HTMLElement>(
      `[data-tutorial-region="${step.scrollToRegion}"]`,
    );
    const scrollContainer = target?.closest<HTMLElement>("main");
    if (target && scrollContainer?.scrollTo) {
      const targetRect = target.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      scrollContainer.scrollTo({
        top: scrollContainer.scrollTop + targetRect.top - containerRect.top,
        left: scrollContainer.scrollLeft,
        behavior: "auto",
      });
      return;
    }
    target?.scrollIntoView?.({ block: "start", inline: "nearest" });
  }, [step.scrollToRegion]);

  useEffect(() => {
    if (step.kind === "dialog") continueButtonRef.current?.focus();
  }, [step]);

  return (
    <div className={[
      "tutorial-layer",
      `is-${step.kind}`,
      step.cardPlacement ? `is-card-${step.cardPlacement}` : "",
    ].filter(Boolean).join(" ")}>
      <button
        className="tutorial-skip"
        type="button"
        aria-label="Salta questa scena"
        onClick={onSkip}
      >
        Salta
      </button>
      <section
        className="tutorial-card"
        role={step.kind === "dialog" ? "dialog" : "status"}
        aria-modal={step.kind === "dialog" ? "true" : undefined}
        aria-labelledby="tutorial-step-title"
        aria-describedby="tutorial-step-copy"
      >
        <header>
          {step.kind === "dialog" ? <span>{step.speaker}</span> : <span>Obiettivo guidato</span>}
          <small>{stepIndex + 1} / {scene.steps.length}</small>
        </header>
        <h2 id="tutorial-step-title">{step.title}</h2>
        <div id="tutorial-step-copy" className="tutorial-copy">
          {body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        {step.kind === "dialog" ? (
          <button
            ref={continueButtonRef}
            className="tutorial-continue"
            type="button"
            onClick={onContinue}
          >
            Continua
          </button>
        ) : (
          <div className="tutorial-waiting" aria-live="polite">
            <i aria-hidden="true" />
            In attesa della tua azione
          </div>
        )}
      </section>
    </div>
  );
}
