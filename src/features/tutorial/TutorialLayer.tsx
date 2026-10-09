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
import { getStepVoice } from "./tutorialVoices";
import { TutorialSignal } from "./TutorialSignal";
import { KeywordText } from "../../components/common/KeywordText";

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
  const cardRef = useRef<HTMLElement>(null);
  const focusRegions = resolveTutorialRegions(step.focusRegions, context);
  const hiddenRegions = resolveTutorialRegions(step.hiddenRegions, context);
  const body = resolveTutorialBody(step.body, context);
  const voice = getStepVoice(scene, stepIndex);
  const focusRegionKey = focusRegions.join(",");
  const hiddenRegionKey = hiddenRegions.join(",");

  useEffect(() => {
    const focused = focusRegionKey
      ? focusRegionKey.split(",") as TutorialRegionId[]
      : [];
    const hidden = hiddenRegionKey
      ? hiddenRegionKey.split(",") as TutorialRegionId[]
      : [];
    let isObserving = true;
    let restoreTreatments = applyTutorialTreatments(focused, hidden);
    const observer = new MutationObserver((mutations) => {
      if (!isObserving || typeof document === "undefined") return;
      if (!mutations.some(({ addedNodes, removedNodes }) =>
        addedNodes.length > 0 || removedNodes.length > 0
      )) return;
      restoreTreatments();
      restoreTreatments = applyTutorialTreatments(focused, hidden);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      isObserving = false;
      observer.disconnect();
      restoreTreatments();
    };
  }, [focusRegionKey, hiddenRegionKey]);

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
    <>
    {step.kind === "dialog" ? <div className="tutorial-veil" aria-hidden="true" /> : null}
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
      <TutorialSignal regionIds={focusRegions} cardRef={cardRef} voice={voice.id} />
      <section
        ref={cardRef}
        className="tutorial-card"
        data-voice={voice.id}
        role={step.kind === "dialog" ? "dialog" : "status"}
        aria-modal={step.kind === "dialog" ? "true" : undefined}
        aria-labelledby={step.title ? "tutorial-step-title" : undefined}
        aria-label={!step.title && step.kind === "dialog" ? voice.name : undefined}
        aria-describedby="tutorial-step-copy"
      >
        <header>
          <span className="tutorial-voice">
            <i className="tutorial-monogram" aria-hidden="true">{voice.monogram}</i>
            {step.kind === "dialog" ? (
              <>
                <b>{voice.name}</b>
                <small>{voice.role}</small>
              </>
            ) : (
              <b>Tutorial</b>
            )}
          </span>
          <span className="tutorial-step-meta">
            <small>{stepIndex + 1} / {scene.steps.length}</small>
            {/* S2 (09/10/2026): a second «Salta» inside the card, next to the counter. */}
            <button className="tutorial-skip-inline" type="button" onClick={onSkip}>Salta</button>
          </span>
        </header>
        {step.title ? <h2 id="tutorial-step-title">{step.title}</h2> : null}
        <div id="tutorial-step-copy" className="tutorial-copy">
          {body.map((paragraph) => <p key={paragraph}><KeywordText text={paragraph} /></p>)}
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
    </>
  );
}
