import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { ReptileMinigameProgress } from "../../game/types";

const CIRCLE_COUNT = 50;
const GAME_DURATION_MS = 30_000;
const CIRCLE_LIFETIME_MS = 1_500;
const RESUME_COUNTDOWN_MS = 3_000;
const SPAWN_INTERVAL_MS = (GAME_DURATION_MS - CIRCLE_LIFETIME_MS) / (CIRCLE_COUNT - 1);

interface CircleDefinition {
  id: number;
  x: number;
  y: number;
  spawnsAt: number;
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash | 0;
}

function nextVisualRandom(seed: number): [number, number] {
  let value = (seed + 0x6d2b79f5) | 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return [((value ^ (value >>> 14)) >>> 0) / 4_294_967_296, (seed + 0x6d2b79f5) | 0];
}

function createCircles(editionId: string): CircleDefinition[] {
  let seed = hashSeed(editionId);
  const circles: CircleDefinition[] = [];
  for (let index = 0; index < CIRCLE_COUNT; index += 1) {
    let x = 50;
    let y = 50;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      let value: number;
      [value, seed] = nextVisualRandom(seed);
      x = 8 + value * 84;
      [value, seed] = nextVisualRandom(seed);
      y = 12 + value * 76;
      const overlaps = circles.slice(-3).some((circle) =>
        Math.hypot(circle.x - x, circle.y - y) < 18,
      );
      if (!overlaps) break;
    }
    circles.push({ id: index, x, y, spawnsAt: index * SPAWN_INTERVAL_MS });
  }
  return circles;
}

interface StoredAttempt {
  hits: number[];
  misses: number[];
  outsideClicks: number;
}

export function ReptileCircleGame({
  editionId,
  minigame,
  onComplete,
}: {
  editionId: string;
  minigame: ReptileMinigameProgress;
  onComplete: (hits: number, misses: number, outsideClicks: number) => void;
}) {
  const circles = useMemo(() => createCircles(editionId), [editionId]);
  const storageKey = `reptile-minigame-${editionId}`;
  const [elapsedMs, setElapsedMs] = useState(0);
  const [hits, setHits] = useState<Set<number>>(() => new Set());
  const [misses, setMisses] = useState<Set<number>>(() => new Set());
  const [outsideClicks, setOutsideClicks] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resumeCountdown, setResumeCountdown] = useState(0);
  const startedAtRef = useRef<number | undefined>(undefined);
  const pausedAtRef = useRef<number | undefined>(undefined);
  const pausedDurationRef = useRef(0);
  const completedRef = useRef(false);
  const initializedRef = useRef(false);
  const hitsRef = useRef(hits);
  const missesRef = useRef(misses);
  const outsideClicksRef = useRef(outsideClicks);

  const persistAttempt = useCallback((attempt: StoredAttempt) => {
    sessionStorage.setItem(storageKey, JSON.stringify(attempt));
  }, [storageKey]);

  const finish = useCallback((abandoned = false) => {
    if (completedRef.current) return;
    completedRef.current = true;
    const finalMisses = new Set(missesRef.current);
    if (abandoned) {
      circles.forEach((circle) => {
        if (!hitsRef.current.has(circle.id)) finalMisses.add(circle.id);
      });
    }
    sessionStorage.removeItem(storageKey);
    onComplete(hitsRef.current.size, finalMisses.size, outsideClicksRef.current);
  }, [circles, onComplete, storageKey]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) {
      persistAttempt({ hits: [], misses: [], outsideClicks: 0 });
      return;
    }
    try {
      const attempt = JSON.parse(stored) as StoredAttempt;
      hitsRef.current = new Set(attempt.hits);
      missesRef.current = new Set(attempt.misses);
      outsideClicksRef.current = Math.max(0, attempt.outsideClicks);
    } catch {
      // Un tentativo illeggibile viene trattato come abbandonato.
    }
    const timer = window.setTimeout(() => finish(true), 0);
    return () => window.clearTimeout(timer);
  }, [finish, persistAttempt, storageKey]);

  useEffect(() => {
    hitsRef.current = hits;
    missesRef.current = misses;
    outsideClicksRef.current = outsideClicks;
    persistAttempt({ hits: [...hits], misses: [...misses], outsideClicks });
  }, [hits, misses, outsideClicks, persistAttempt]);

  useEffect(() => {
    if (minigame.status !== "running" || paused || resumeCountdown > 0) return;
    let frame = 0;
    const update = (timestamp: number) => {
      if (startedAtRef.current === undefined) startedAtRef.current = timestamp;
      const elapsed = timestamp - startedAtRef.current - pausedDurationRef.current;
      setElapsedMs(elapsed);
      const expired = circles.filter((circle) =>
        elapsed >= circle.spawnsAt + CIRCLE_LIFETIME_MS &&
        !hitsRef.current.has(circle.id) &&
        !missesRef.current.has(circle.id),
      );
      if (expired.length > 0) {
        setMisses((current) => {
          const next = new Set([...current, ...expired.map((circle) => circle.id)]);
          missesRef.current = next;
          return next;
        });
      }
      if (elapsed >= GAME_DURATION_MS) {
        finish(true);
        return;
      }
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [circles, finish, minigame.status, paused, resumeCountdown]);

  const pause = useCallback(() => {
    if (completedRef.current || pausedAtRef.current !== undefined) return;
    pausedAtRef.current = performance.now();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (pausedAtRef.current === undefined) return;
    setPaused(false);
    setResumeCountdown(3);
    const countdownStarted = performance.now();
    const timer = window.setInterval(() => {
      const remaining = Math.ceil(
        (RESUME_COUNTDOWN_MS - (performance.now() - countdownStarted)) / 1_000,
      );
      if (remaining > 0) {
        setResumeCountdown(remaining);
        return;
      }
      window.clearInterval(timer);
      pausedDurationRef.current += performance.now() - pausedAtRef.current!;
      pausedAtRef.current = undefined;
      setResumeCountdown(0);
    }, 100);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [pause]);

  const activeCircles = circles.filter((circle) =>
    elapsedMs >= circle.spawnsAt &&
    elapsedMs < circle.spawnsAt + CIRCLE_LIFETIME_MS &&
    !hits.has(circle.id) &&
    !misses.has(circle.id),
  );
  const remainingSeconds = Math.max(0, Math.ceil((GAME_DURATION_MS - elapsedMs) / 1_000));

  return (
    <div className="reptile-minigame-overlay" role="dialog" aria-modal="true" aria-labelledby="reptile-minigame-title">
      <section className="reptile-minigame-shell">
        <header>
          <div>
            <span>Torneo Reptile · coordinamento</span>
            <h2 id="reptile-minigame-title">Prendi il ritmo dell'organizzazione</h2>
          </div>
          <div className="reptile-minigame-score" aria-live="polite">
            <span>Colpiti <strong>{hits.size}</strong></span>
            <span>Persi <strong>{misses.size}</strong></span>
            <span>Fuori <strong>{outsideClicks}</strong></span>
            <span>Tempo <strong>{remainingSeconds}s</strong></span>
          </div>
        </header>
        <div
          className="reptile-circle-board"
          onPointerDown={(event) => {
            if (paused || resumeCountdown > 0 || event.target !== event.currentTarget) return;
            setOutsideClicks((current) => {
              outsideClicksRef.current = current + 1;
              return current + 1;
            });
          }}
          aria-label="Area di gioco: tocca esclusivamente i cerchi attivi"
        >
          {activeCircles.map((circle) => (
            <button
              type="button"
              className="reptile-target-circle"
              key={circle.id}
              style={{ left: `${circle.x}%`, top: `${circle.y}%` } as CSSProperties}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setHits((current) => {
                  const next = new Set(current).add(circle.id);
                  hitsRef.current = next;
                  return next;
                });
              }}
              aria-label={`Cerchio ${circle.id + 1}`}
            >
              <span>{circle.id + 1}</span>
            </button>
          ))}
          {resumeCountdown > 0 ? <div className="reptile-resume-countdown">{resumeCountdown}</div> : null}
        </div>
        <footer>
          <p>Ogni cerchio vale +1%. Un cerchio perso vale −0,5%; un clic fuori vale −1%.</p>
          <button type="button" onClick={() => finish(true)}>Abbandona il tentativo</button>
        </footer>
        {paused ? (
          <div className="reptile-minigame-pause" role="alertdialog" aria-modal="true">
            <h3>Gioco in pausa</h3>
            <p>Alla ripresa avrai tre secondi prima che i cerchi tornino attivi.</p>
            <button type="button" className="primary" onClick={resume}>Riprendi</button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
