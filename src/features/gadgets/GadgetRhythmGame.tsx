import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  GADGET_DEFINITIONS,
  GADGET_MINIGAME_CONFIG,
  GADGET_MINIGAME_DIFFICULTIES,
} from "../../content/gadgets";
import { GADGET_RARITIES, getGadgetRarityClassName } from "../../content/gadgetRarities";
import {
  calculateGadgetQuality,
  createGadgetRhythmNotes,
  getGadgetTimingResult,
  type GadgetLane,
  type GadgetTimingJudgment,
} from "../../game/gadgetMinigame";
import type { GadgetMinigameState } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";
import { GadgetProcessArtwork, type GadgetProcessStage } from "./GadgetArtwork";

const LANE_CONTROLS = [
  { arrow: "←", key: "A", keyboardKeys: ["ArrowLeft", "a"] },
  { arrow: "↓", key: "S", keyboardKeys: ["ArrowDown", "s"] },
  { arrow: "↑", key: "W", keyboardKeys: ["ArrowUp", "w"] },
  { arrow: "→", key: "D", keyboardKeys: ["ArrowRight", "d"] },
] as const;

const DESIGN_STAGES: readonly {
  id: GadgetProcessStage;
  label: string;
}[] = [
  { id: "sketch", label: "Bozza" },
  { id: "concept", label: "Concept" },
  { id: "render", label: "Render 3D" },
  { id: "prototype", label: "Prototipo" },
];

const TOUCH_FIRST_DEVICE_QUERY = "(hover: none) and (pointer: coarse)";

function shouldPauseOnWindowBlur(): boolean {
  return (
    typeof window.matchMedia !== "function" ||
    !window.matchMedia(TOUCH_FIRST_DEVICE_QUERY).matches
  );
}

interface NoteJudgment {
  judgment: GadgetTimingJudgment;
  points: number;
}

interface HitFeedback {
  noteId: number;
  lane: GadgetLane;
  judgment: Exclude<GadgetTimingJudgment, "miss">;
}

function getDesignStageIndex(progress: number): number {
  return Math.min(
    DESIGN_STAGES.length - 1,
    Math.max(0, Math.floor(Math.max(0, Math.min(0.999, progress)) * DESIGN_STAGES.length)),
  );
}

function LaneArrowIcon({ lane }: { lane: GadgetLane }) {
  const rotation = [180, 90, -90, 0][lane];
  return (
    <svg
      className="gadget-direction-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <g transform={`rotate(${rotation} 12 12)`}>
        <path d="M4 12h16" />
        <path d="m15 7 5 5-5 5" />
      </g>
    </svg>
  );
}

function GadgetStageIcon({ stage }: { stage: GadgetProcessStage }) {
  return (
    <svg
      className="gadget-stage-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {stage === "sketch" ? (
        <>
          <path d="m4 20 4.2-1 10.7-10.7-3.2-3.2L5 15.8 4 20Z" />
          <path d="m14.8 6 3.2 3.2M5 15.8 8.2 19" />
        </>
      ) : stage === "concept" ? (
        <>
          <path d="M5 18 8 6l8 2 3 10-7 3-7-3Z" />
          <circle cx="8" cy="6" r="1.5" />
          <circle cx="16" cy="8" r="1.5" />
          <circle cx="12" cy="21" r="1.5" />
        </>
      ) : stage === "render" ? (
        <>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
        </>
      ) : (
        <>
          <path d="m12 4 8 4-8 4-8-4 8-4Z" />
          <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
        </>
      )}
    </svg>
  );
}

function getLaneFromKey(key: string): GadgetLane | undefined {
  const normalized = key.length === 1 ? key.toLocaleLowerCase("it-IT") : key;
  const lane = LANE_CONTROLS.findIndex((control) =>
    control.keyboardKeys.includes(normalized as never),
  );
  return lane >= 0 ? (lane as GadgetLane) : undefined;
}

export function GadgetRhythmGame({
  minigame,
  quality,
  accepted,
  revisionCost,
  canRevise,
  canAffordRevision,
  onComplete,
  onAccept,
  onRevision,
  onContinue,
}: {
  minigame: GadgetMinigameState;
  quality: number;
  accepted: boolean;
  revisionCost: number;
  canRevise: boolean;
  canAffordRevision: boolean;
  onComplete: (score: number) => void;
  onAccept: () => void;
  onRevision: () => void;
  onContinue: () => void;
}) {
  const playRarity = minigame.opportunityRarity ?? minigame.rarity;
  const travelMs = GADGET_MINIGAME_DIFFICULTIES[playRarity].travelMs;
  const notes = useMemo(
    () =>
      createGadgetRhythmNotes(minigame.seed, playRarity).map((note) => ({
        ...note,
        designStage:
          DESIGN_STAGES[
            getDesignStageIndex((note.targetAtMs - travelMs) / GADGET_MINIGAME_CONFIG.durationMs)
          ],
      })),
    [minigame.seed, playRarity, travelMs],
  );
  const [timelineMs, setTimelineMs] = useState(-GADGET_MINIGAME_CONFIG.countdownMs);
  const timelineRef = useRef(timelineMs);
  const judgmentsRef = useRef(new Map<number, NoteJudgment>());
  const [judgments, setJudgments] = useState<Record<number, NoteJudgment>>({});
  const falseInputsRef = useRef(0);
  const [falseInputs, setFalseInputs] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [lastJudgment, setLastJudgment] = useState<string>("");
  const [hitFeedback, setHitFeedback] = useState<HitFeedback>();
  const [paused, setPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState("Gioco in pausa");
  const startedAtRef = useRef<number | undefined>(undefined);
  const pausedAtRef = useRef<number | undefined>(undefined);
  const totalPausedMsRef = useRef(0);
  const completedRef = useRef(false);

  const publishJudgments = useCallback(() => {
    setJudgments(Object.fromEntries(judgmentsRef.current));
  }, []);

  const finishRun = useCallback(
    (forcedScore?: number) => {
      if (completedRef.current) return;
      completedRef.current = true;
      const score =
        forcedScore ??
        calculateGadgetQuality(
          notes.map((note) => judgmentsRef.current.get(note.id)?.points ?? 0),
          falseInputsRef.current,
          notes.length,
        );
      onComplete(score);
    },
    [notes, onComplete],
  );

  const pauseRun = useCallback(
    (reason: string) => {
      if (
        minigame.status !== "running" ||
        completedRef.current ||
        pausedAtRef.current !== undefined
      )
        return;
      pausedAtRef.current = performance.now();
      setPauseReason(reason);
      setPaused(true);
    },
    [minigame.status],
  );

  const resumeRun = useCallback(() => {
    if (pausedAtRef.current === undefined) return;
    if (startedAtRef.current !== undefined) {
      totalPausedMsRef.current += performance.now() - pausedAtRef.current;
    }
    pausedAtRef.current = undefined;
    setPaused(false);
  }, []);

  const registerMisses = useCallback(
    (currentTimeline: number) => {
      let changed = false;
      for (const note of notes) {
        if (
          !judgmentsRef.current.has(note.id) &&
          currentTimeline > note.targetAtMs + GADGET_MINIGAME_CONFIG.timingWindows.almostMs
        ) {
          judgmentsRef.current.set(note.id, { judgment: "miss", points: 0 });
          changed = true;
        }
      }
      if (changed) {
        setCombo(0);
        setLastJudgment("Miss");
        publishJudgments();
      }
    },
    [notes, publishJudgments],
  );

  useEffect(() => {
    if (minigame.status !== "running" || paused) return;
    let animationFrame = 0;
    const update = (timestamp: number) => {
      if (startedAtRef.current === undefined) startedAtRef.current = timestamp;
      const elapsed = timestamp - startedAtRef.current - totalPausedMsRef.current;
      const currentTimeline = elapsed - GADGET_MINIGAME_CONFIG.countdownMs;
      timelineRef.current = currentTimeline;
      setTimelineMs(currentTimeline);
      registerMisses(currentTimeline);
      if (currentTimeline >= GADGET_MINIGAME_CONFIG.durationMs) {
        finishRun();
        return;
      }
      animationFrame = window.requestAnimationFrame(update);
    };
    animationFrame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [finishRun, minigame.status, paused, registerMisses]);

  useEffect(() => {
    if (minigame.status !== "running") return;
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") pauseRun("Scheda non attiva");
    };
    const handleBlur = () => {
      if (shouldPauseOnWindowBlur()) pauseRun("Finestra non attiva");
    };
    const handleOrientation = () => pauseRun("Orientamento cambiato");
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("orientationchange", handleOrientation);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("orientationchange", handleOrientation);
    };
  }, [minigame.status, pauseRun]);

  const hitLane = useCallback(
    (lane: GadgetLane) => {
      if (minigame.status !== "running" || paused || timelineRef.current < 0) return;
      const currentTimeline = timelineRef.current;
      const candidate = notes
        .filter((note) => note.lane === lane && !judgmentsRef.current.has(note.id))
        .map((note) => ({ note, distance: Math.abs(currentTimeline - note.targetAtMs) }))
        .sort((left, right) => left.distance - right.distance)[0];
      const timing = candidate
        ? getGadgetTimingResult(currentTimeline - candidate.note.targetAtMs)
        : undefined;
      if (!candidate || !timing) {
        falseInputsRef.current += 1;
        setFalseInputs(falseInputsRef.current);
        setCombo(0);
        setLastJudgment("Errore −1");
        return;
      }
      judgmentsRef.current.set(candidate.note.id, timing);
      setHitFeedback({
        noteId: candidate.note.id,
        lane,
        judgment: timing.judgment,
      });
      publishJudgments();
      setCombo((current) => {
        const next = current + 1;
        setBestCombo((best) => Math.max(best, next));
        return next;
      });
      setLastJudgment(
        timing.judgment === "perfect" ? "Perfect" : timing.judgment === "good" ? "Good" : "Almost",
      );
    },
    [minigame.status, notes, paused, publishJudgments],
  );

  useEffect(() => {
    if (minigame.status !== "running") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const lane = getLaneFromKey(event.key);
      if (lane === undefined || event.repeat) return;
      event.preventDefault();
      hitLane(lane);
    };
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hitLane, minigame.status]);

  const product = GADGET_DEFINITIONS[minigame.productId];
  if (minigame.status === "result") {
    const score = minigame.score ?? 0;
    const unlockedRarity = minigame.unlockedRarity;
    const improved = !unlockedRarity && quality > minigame.previousQuality;
    const resultRarity = unlockedRarity ?? minigame.rarity;
    return (
      <div
        className={`gadget-minigame-overlay ${getGadgetRarityClassName(resultRarity)}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gadget-result-title"
      >
        <section className="gadget-minigame-result">
          <span className="gadget-result-kicker">
            {unlockedRarity ? "Rarità sbloccata" : "Prova qualità completata"}
          </span>
          <h2 id="gadget-result-title">{product.name}</h2>
          <div className="gadget-result-score" aria-label={`Risultato ${score} su 100`}>
            <strong>{score}%</strong>
            <span>risultato del tentativo</span>
          </div>
          <p>
            {unlockedRarity
              ? `${GADGET_RARITIES[minigame.rarity].label} sale al 100%. ${GADGET_RARITIES[unlockedRarity].label} entra automaticamente in catalogo con qualità ${score}%.`
              : improved
                ? `Nuovo record: la qualità sale al ${quality}%.`
                : `La qualità massima resta al ${quality}%.`}
          </p>
          {quality === 0 ? (
            <p className="gadget-result-warning">
              Il prodotto può essere accettato, ma non venderà finché la qualità resta allo 0%.
            </p>
          ) : null}
          <div className="gadget-result-actions">
            {accepted ? (
              <button type="button" className="primary" onClick={onContinue}>
                Continua
              </button>
            ) : (
              <>
                <button type="button" className="primary" onClick={onAccept}>
                  Metti in vendita
                </button>
                {canRevise ? (
                  <button type="button" onClick={onRevision} disabled={!canAffordRevision}>
                    Revisiona · {formatCurrency(revisionCost)}
                  </button>
                ) : null}
              </>
            )}
          </div>
          {!accepted && canRevise && !canAffordRevision ? (
            <small>Fondi insufficienti per una revisione.</small>
          ) : null}
        </section>
      </div>
    );
  }

  const countdown = timelineMs < 0 ? Math.max(1, Math.ceil(-timelineMs / 1_000)) : 0;
  const remainingSeconds = Math.max(
    0,
    Math.ceil((GADGET_MINIGAME_CONFIG.durationMs - Math.max(0, timelineMs)) / 1_000),
  );
  const runProgress = Math.max(0, Math.min(0.999, timelineMs / GADGET_MINIGAME_CONFIG.durationMs));
  const activeDesignStage = getDesignStageIndex(runProgress);

  return (
    <div
      className={`gadget-minigame-overlay ${getGadgetRarityClassName(playRarity)}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gadget-minigame-title"
    >
      <section className="gadget-minigame-shell">
        <header>
          <div>
            <span className="gadget-minigame-rarity">
              {minigame.opportunityRarity
                ? `Occasione: ${GADGET_RARITIES[minigame.opportunityRarity].label}`
                : `Rarità: ${GADGET_RARITIES[minigame.rarity].label}`}
            </span>
            <h2 id="gadget-minigame-title">{product.name}</h2>
          </div>
          <div className="gadget-minigame-stats" aria-live="polite">
            <span>
              Combo <strong>{combo}</strong>
            </span>
            <span>
              Record combo <strong>{bestCombo}</strong>
            </span>
            <span>
              Errori <strong>{falseInputs}</strong>
            </span>
            <span>
              Tempo <strong>{remainingSeconds}s</strong>
            </span>
          </div>
        </header>

        <div className="gadget-rhythm-board" aria-label="Quattro corsie della prova qualità">
          <GadgetProcessArtwork productId={minigame.productId} activeStage={activeDesignStage} />
          <div className="gadget-design-stages" aria-hidden="true">
            {DESIGN_STAGES.map((stage, index) => (
              <div
                className={`gadget-design-stage is-${stage.id} ${
                  index < activeDesignStage
                    ? "is-complete"
                    : index === activeDesignStage
                      ? "is-active"
                      : "is-upcoming"
                }`}
                key={stage.id}
              >
                <span className="gadget-design-stage-dot" />
                <span className="gadget-design-stage-label">
                  <GadgetStageIcon stage={stage.id} />
                  {stage.label}
                </span>
              </div>
            ))}
          </div>
          {LANE_CONTROLS.map((control) => (
            <div className="gadget-rhythm-lane" key={control.key} aria-hidden="true" />
          ))}
          <div className="gadget-target-line" aria-hidden="true" />
          {notes.map((note) => {
            if (judgments[note.id]) return null;
            const progress = (timelineMs - (note.targetAtMs - travelMs)) / travelMs;
            if (progress < -0.08 || progress > 1.15) return null;
            const top = Math.max(
              -6,
              Math.min(94, progress * GADGET_MINIGAME_CONFIG.targetPositionPercent),
            );
            return (
              <button
                type="button"
                className={`gadget-falling-note is-${note.designStage.id}`}
                key={note.id}
                tabIndex={-1}
                style={
                  {
                    "--note-left": `${note.lane * 25 + 12.5}%`,
                    "--note-top": `${top}%`,
                  } as CSSProperties
                }
                onPointerDown={(event) => {
                  event.preventDefault();
                  hitLane(note.lane);
                }}
                aria-label={`Nota corsia ${note.lane + 1}`}
              >
                <span className="gadget-note-stage-mark">
                  <GadgetStageIcon stage={note.designStage.id} />
                </span>
                <span className="gadget-note-arrow">
                  <LaneArrowIcon lane={note.lane} />
                </span>
              </button>
            );
          })}
          {hitFeedback ? (
            <span
              className={`gadget-hit-burst is-${hitFeedback.judgment}`}
              key={hitFeedback.noteId}
              style={
                {
                  "--hit-left": `${hitFeedback.lane * 25 + 12.5}%`,
                } as CSSProperties
              }
              aria-hidden="true"
            >
              <i />
              <i />
              <i />
            </span>
          ) : null}
          <div className="gadget-lane-controls">
            {LANE_CONTROLS.map((control, lane) => (
              <button
                type="button"
                key={control.key}
                onPointerDown={(event) => {
                  event.preventDefault();
                  hitLane(lane as GadgetLane);
                }}
                aria-label={`Corsia ${lane + 1}: ${control.arrow} oppure ${control.key}`}
              >
                <strong>
                  <LaneArrowIcon lane={lane as GadgetLane} />
                </strong>
                <span>{control.key}</span>
              </button>
            ))}
          </div>
          {countdown > 0 ? (
            <div className="gadget-countdown" aria-live="assertive">
              {countdown}
            </div>
          ) : null}
          {lastJudgment && countdown === 0 ? (
            <div className="gadget-judgment" aria-live="polite">
              {lastJudgment}
            </div>
          ) : null}
        </div>

        <footer>
          <p>
            Premi la corsia quando la nota raggiunge la linea. Usa frecce o WASD, oppure tocca i
            pulsanti.
          </p>
          <button type="button" onClick={() => finishRun(0)}>
            Abbandona il tentativo
          </button>
        </footer>

        {paused ? (
          <div
            className="gadget-minigame-pause"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="gadget-pause-title"
          >
            <h3 id="gadget-pause-title">{pauseReason}</h3>
            <p>Il conto alla rovescia riprenderà da dove si è fermato.</p>
            <button type="button" className="primary" onClick={resumeRun} autoFocus>
              Riprendi
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
