import { useCallback, useEffect, useRef, useState } from "react";
import { GAME_CONFIG } from "../../game/config";
import { calculateReptileMinigameBonus, REPTILE_SECTOR_LABELS } from "../../game/reptilePreparation";
import type { ReptileSector } from "../../game/types";
import { storeIncidentsAttempt as storeAttempt } from "./reptileUi";

/*
 * «La giornata degli imprevisti»: the preside walks the palazzetto from 9 to 19
 * and clears the troubles the collaborators report. 30 seconds, one attempt per
 * tournament; the Tutorial is guided, repeatable and never counts.
 */

const DURATION_MS = 30_000;
const TUTORIAL_FREE_MS = 8_000;

type Kind = "normal" | "big" | "urgent" | "calm";

const ZONES: Record<ReptileSector, { where: string; box: [number, number, number, number] }> = {
  social: { where: "Stand della diretta", box: [1, 31, 2, 40] },
  instructors: { where: "Tavolo arbitri", box: [34, 66, 2, 30] },
  events: { where: "Ingresso e accrediti", box: [69, 99, 2, 40] },
  equipment: { where: "Rastrelliera", box: [1, 31, 60, 98] },
  gadget: { where: "Banchetto e trofei", box: [69, 99, 60, 98] },
};

const TROUBLES: Record<ReptileSector, readonly string[]> = {
  social: ["La diretta si è bloccata", "Hashtag sbagliato sul maxischermo", "Il fotografo è sparito", "Foto del podio sfocata", "Commento acido sotto il post"],
  instructors: ["Arbitro senza fischietto", "Due arbitri sulla stessa arena", "Regolamento stampato vecchio", "Giudice di Stile in ritardo", "Cartellini finiti"],
  events: ["Coda agli accrediti", "Pubblico senza posto", "Il microfono fischia", "Tabellone stampato storto", "Pullman in doppia fila"],
  equipment: ["Spada scarica in arena 2", "Lama crepata", "Arena 3 senza nastro", "Sedie finite in tribuna", "Batterie agli sgoccioli"],
  gadget: ["Fila al banchetto", "Il POS non prende", "Magliette solo in XXL", "Trofeo senza targhetta", "Resto finito"],
};

const BIG_TROUBLES: Record<ReptileSector, string> = {
  social: "Influencer offeso in diretta",
  instructors: "Ricorso sul punteggio",
  events: "Prova dell'allarme antincendio",
  equipment: "Blackout in palazzetto",
  gadget: "Arriva un pullman di tifosi",
};

const CALM = ["Il pubblico applaude", "Foto ricordo con il sindaco", "Un genitore saluta", "Coro della curva", "Tutto in orario"];

const TUTORIAL_STEPS: readonly { kind: Kind; sector: ReptileSector; tip: string }[] = [
  { kind: "normal", sector: "events", tip: "Una segnalazione. Cliccala prima che l'anello si svuoti." },
  { kind: "big", sector: "equipment", tip: "Guaio grosso: servono tre clic." },
  { kind: "urgent", sector: "social", tip: "Urgente: pulsa e dura poco, ma vale doppio." },
  { kind: "calm", sector: "instructors", tip: "Tratteggiato: è tutto a posto. Lascialo stare." },
];

interface Incident {
  id: number;
  sector: ReptileSector;
  kind: Kind;
  label: string;
  who: string;
  x: number;
  y: number;
  born: number;
  life: number;
  hp: number;
  value: number;
}

interface Burst {
  id: number;
  x: number;
  y: number;
  text: string;
  tone: "good" | "bad";
  until: number;
}

interface Run {
  startedAt: number;
  pausedMs: number;
  pausedAt?: number;
  nextSpawnAt: number;
  items: Incident[];
  bursts: Burst[];
  combo: number;
  best: number;
  solved: number;
  missed: number;
  score: number;
  /** The perfect day's points so far: every resolved trouble as if solved in one series. */
  available: number;
  perfectCount: number;
  hurtSector?: ReptileSector;
  hurtUntil: number;
  /** Tutorial: guided step index, then free play from freeFrom. */
  step: number;
  waitFor?: number;
  freeFrom?: number;
  over: boolean;
}

function random(minimum: number, maximum: number): number {
  return minimum + Math.random() * (maximum - minimum);
}

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function multiplier(combo: number): number {
  return Math.min(3, 1 + Math.floor(combo / 5) * 0.5);
}

function settle(run: Run, item: Incident): void {
  run.perfectCount += 1;
  run.available += item.value * multiplier(run.perfectCount);
}

function formatClock(share: number): string {
  const minutes = 9 * 60 + Math.floor(Math.min(1, Math.max(0, share)) * 600);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function ReptileIncidentsLayer({
  mode,
  superba,
  editionId,
  sectors,
  names,
  onFinish,
  onClose,
  onPlay,
}: {
  mode: "play" | "tutorial";
  superba: boolean;
  editionId: string;
  sectors: readonly ReptileSector[];
  /** Real collaborators per sector, for the reports. */
  names: Partial<Record<ReptileSector, string[]>>;
  onFinish: (score: number, available: number) => void;
  onClose: () => void;
  onPlay: () => void;
}) {
  const runRef = useRef<Run | null>(null);
  const uidRef = useRef(0);
  const [view, setView] = useState<(Run & { now: number }) | null>(null);
  const publish = useCallback((now: number) => {
    const current = runRef.current;
    setView(current
      ? { ...current, items: current.items.map((item) => ({ ...item })), bursts: [...current.bursts], now }
      : null);
  }, []);
  const [stage, setStage] = useState<"intro" | "running" | "paused" | "over">(mode === "play" ? "running" : "intro");

  const createRun = useCallback((now: number): Run => {
    if (mode === "play") storeAttempt(editionId, 0, 0);
    return {
      startedAt: now,
      pausedMs: 0,
      nextSpawnAt: now + 600,
      items: [],
      bursts: [],
      combo: 0,
      best: 0,
      solved: 0,
      missed: 0,
      score: 0,
      available: 0,
      perfectCount: 0,
      hurtUntil: 0,
      step: mode === "tutorial" ? 0 : TUTORIAL_STEPS.length + 1,
      over: false,
    };
  }, [editionId, mode]);

  const start = useCallback(() => {
    const now = performance.now();
    runRef.current = createRun(now);
    publish(now);
    setStage("running");
  }, [createRun, publish]);

  const spawn = useCallback((run: Run, now: number, kind: Kind, sector: ReptileSector, endless = false) => {
    const share = Math.min(1, (now - run.startedAt - run.pausedMs) / DURATION_MS);
    const life = endless
      ? Infinity
      : (kind === "urgent" ? 0.6 : kind === "big" ? 1.6 : 1) * (2_600 - 1_100 * share);
    const value = kind === "big" ? 3 : kind === "urgent" ? 2 : 1;
    const [x0, x1, y0, y1] = ZONES[sector].box;
    let x = 50;
    let y = 50;
    for (let attempt = 0; attempt < 14; attempt += 1) {
      x = random(x0 + 9, x1 - 9);
      y = random(y0 + 9, y1 - 7);
      if (run.items.every((item) => Math.hypot(item.x - x, (item.y - y) * 1.6) > 19)) break;
    }
    const people = names[sector] ?? [];
    const incident: Incident = {
      id: ++uidRef.current,
      sector,
      kind,
      label: kind === "calm" ? pick(CALM) : kind === "big" ? BIG_TROUBLES[sector] : pick(TROUBLES[sector]),
      who: kind === "calm"
        ? "Nessun problema"
        : `${people.length > 0 ? pick(people) : "Staff"} · ${REPTILE_SECTOR_LABELS[sector]}`,
      x,
      y,
      born: now,
      life,
      hp: kind === "big" ? 3 : 1,
      value,
    };
    run.items.push(incident);
    return incident;
  }, [names]);

  const burst = (run: Run, item: Incident, text: string, tone: Burst["tone"], now: number) => {
    run.bursts.push({ id: ++uidRef.current, x: item.x, y: item.y, text, tone, until: now + 800 });
  };

  const hit = useCallback((id: number) => {
    const run = runRef.current;
    if (!run || run.over || run.pausedAt !== undefined) return;
    const item = run.items.find((entry) => entry.id === id);
    if (!item) return;
    const now = performance.now();
    if (item.kind === "calm") {
      run.combo = 0;
      run.score = Math.max(0, run.score - 2);
      run.hurtSector = item.sector;
      run.hurtUntil = now + 400;
      burst(run, item, "Era tutto a posto", "bad", now);
    } else {
      item.hp -= 1;
      if (item.hp > 0) {
        publish(now);
        return;
      }
      settle(run, item);
      run.combo += 1;
      run.best = Math.max(run.best, run.combo);
      run.solved += 1;
      const points = item.value * multiplier(run.combo);
      run.score += points;
      burst(run, item, `+${points.toLocaleString("it-IT")}`, "good", now);
    }
    run.items = run.items.filter((entry) => entry.id !== id);
    if (run.waitFor === id) {
      run.waitFor = undefined;
      run.step += 1;
      run.combo = 0;
      run.nextSpawnAt = now + 500;
    }
    if (mode === "play") storeAttempt(editionId, run.score, run.available);
    publish(now);
  }, [editionId, mode, publish]);

  useEffect(() => {
    if (stage !== "running") return;
    let frame = 0;
    const loop = (now: number) => {
      // The real attempt starts on its own as soon as the layer opens.
      runRef.current ??= createRun(now);
      const run = runRef.current;
      if (run.over) return;
      frame = requestAnimationFrame(loop);
      run.bursts = run.bursts.filter((entry) => entry.until > now);
      const guided = mode === "tutorial" && run.step < TUTORIAL_STEPS.length;
      if (guided) {
        if (run.waitFor === undefined && now >= run.nextSpawnAt) {
          const step = TUTORIAL_STEPS[run.step];
          const incident = spawn(run, now, step.kind, step.sector, step.kind !== "calm");
          if (step.kind === "calm") incident.life = 2_600;
          run.waitFor = incident.id;
        }
        for (const item of [...run.items]) {
          if (item.kind === "calm" && now - item.born >= item.life) {
            run.items = run.items.filter((entry) => entry.id !== item.id);
            if (run.waitFor === item.id) {
              run.waitFor = undefined;
              run.step += 1;
              run.nextSpawnAt = now + 500;
            }
          }
        }
        publish(now);
        return;
      }
      if (mode === "tutorial" && run.step === TUTORIAL_STEPS.length) {
        // Free practice starts from the «Gironi», when every kind can appear.
        run.freeFrom = now;
        run.startedAt = now - DURATION_MS * 0.35;
        run.pausedMs = 0;
        run.score = 0;
        run.available = 0;
        run.perfectCount = 0;
        run.step += 1;
      }
      const elapsed = now - run.startedAt - run.pausedMs;
      const share = Math.min(1, elapsed / DURATION_MS);
      const end = mode === "tutorial"
        ? (run.freeFrom ?? now) + TUTORIAL_FREE_MS
        : run.startedAt + run.pausedMs + DURATION_MS;
      const maximumActive = 3 + Math.floor(4 * share);
      if (now >= run.nextSpawnAt && run.items.length < maximumActive && now < end - 1_200) {
        const roll = Math.random();
        const kind: Kind = elapsed > 9_000 && roll < 0.13
          ? "calm"
          : elapsed > 6_000 && roll < 0.25
            ? "big"
            : elapsed > 4_000 && roll < 0.34
              ? "urgent"
              : "normal";
        spawn(run, now, kind, pick(sectors));
        run.nextSpawnAt = now + (900 - 480 * share) * random(0.7, 1.3);
      }
      for (const item of [...run.items]) {
        if (now - item.born < item.life) continue;
        run.items = run.items.filter((entry) => entry.id !== item.id);
        if (item.kind === "calm") continue;
        settle(run, item);
        run.combo = 0;
        run.missed += 1;
        run.hurtSector = item.sector;
        run.hurtUntil = now + 400;
        burst(run, item, "Lamentela", "bad", now);
      }
      if (now >= end && run.items.length === 0) {
        run.over = true;
        if (mode === "play") storeAttempt(editionId, run.score, run.available);
        publish(now);
        setStage("over");
        return;
      }
      publish(now);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [createRun, editionId, mode, publish, sectors, spawn, stage]);

  const pause = useCallback(() => {
    const run = runRef.current;
    if (!run || run.over || run.pausedAt !== undefined) return;
    run.pausedAt = performance.now();
    publish(run.pausedAt);
    setStage("paused");
  }, [publish]);

  const resume = useCallback(() => {
    const run = runRef.current;
    if (!run || run.pausedAt === undefined) return;
    const pausedFor = performance.now() - run.pausedAt;
    run.pausedMs += pausedFor;
    run.nextSpawnAt += pausedFor;
    if (run.freeFrom !== undefined) run.freeFrom += pausedFor;
    run.items.forEach((item) => { item.born += pausedFor; });
    run.pausedAt = undefined;
    setStage("running");
  }, []);

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === "hidden") pause(); };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (mode === "tutorial" && stage !== "running") onClose();
      else pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey);
    };
  }, [mode, onClose, pause, stage]);

  const run = view;
  const now = view?.now ?? 0;
  const elapsed = run ? (run.pausedAt ?? now) - run.startedAt - run.pausedMs : 0;
  const share = run ? Math.min(1, Math.max(0, elapsed / DURATION_MS)) : 0;
  const timeShare = mode === "tutorial"
    ? run?.freeFrom !== undefined ? Math.min(1, ((run.pausedAt ?? now) - run.freeFrom) / TUTORIAL_FREE_MS) : 0
    : share;
  const bonus = run && mode === "play" ? calculateReptileMinigameBonus(run.score, run.available) : 0;
  const tip = run && mode === "tutorial" && run.step < TUTORIAL_STEPS.length
    ? run.items.find((item) => item.id === run.waitFor)
    : undefined;
  const phase = share < 0.2 ? "Accrediti" : share < 0.7 ? "Gironi" : "Fase finale";
  const verdict = bonus >= 22
    ? "Giornata da manuale"
    : bonus >= 15
      ? "Palazzetto in pugno"
      : bonus >= 8
        ? "Qualche lamentela, niente di grave"
        : "Una giornata difficile";

  return (
    <div
      className={`reptile-view reptile-incidents-layer${superba ? " is-superba" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reptile-incidents-title"
    >
      <div className="reptile-incidents-frame">
        <header className="reptile-incidents-hud">
          <div className="reptile-incidents-clock">
            <small id="reptile-incidents-title">{mode === "tutorial" ? "Tutorial" : phase}</small>
            <strong>{formatClock(share)}</strong>
          </div>
          <div className="reptile-incidents-middle">
            <span className="reptile-incidents-time"><i style={{ width: `${timeShare * 100}%` }} /></span>
            <span className="reptile-incidents-combo" aria-hidden="true">
              {Array.from({ length: 15 }, (_, index) => (
                <i
                  key={index}
                  className={run && (run.combo >= 15 || index < run.combo % 15)
                    ? run.combo >= 10 ? "is-on is-hot" : "is-on"
                    : ""}
                />
              ))}
            </span>
            <span className="reptile-incidents-combo-label" aria-live="polite">
              {run && run.combo >= 5
                ? `Serie ${run.combo} · punti ×${multiplier(run.combo).toLocaleString("it-IT")}`
                : run && run.combo > 0 ? `Serie ${run.combo}` : ""}
            </span>
          </div>
          <div className="reptile-incidents-bonus">
            <small>Resa</small>
            <strong>+{bonus}%</strong>
          </div>
        </header>
        <div className={`reptile-incidents-floor${run && run.hurtUntil > now ? " is-shaking" : ""}`}>
          {sectors.map((sector) => {
            const [x0, x1, y0, y1] = ZONES[sector].box;
            const hot = run?.items.some((item) => item.sector === sector);
            const hurt = run?.hurtSector === sector && run.hurtUntil > now;
            return (
              <div
                key={sector}
                className={`reptile-incidents-zone${hot ? " is-hot" : ""}${hurt ? " is-hurt" : ""}`}
                style={{ left: `${x0}%`, width: `${x1 - x0}%`, top: `${y0}%`, height: `${y1 - y0}%` }}
              >
                <span>{REPTILE_SECTOR_LABELS[sector]}</span>
                <em>{ZONES[sector].where}</em>
              </div>
            );
          })}
          {[[38, 66], [50, 54], [62, 66]].map(([x, y]) => (
            <span key={`${x}-${y}`} className="reptile-incidents-arena" style={{ left: `${x - 6.5}%`, top: `${y - 10.4}%` }} aria-hidden="true" />
          ))}
          {run?.items.map((item) => {
            const left = Number.isFinite(item.life) ? 1 - (now - item.born) / item.life : 1;
            return (
              <button
                key={item.id}
                type="button"
                className={`reptile-incident is-${item.kind}${left < 0.3 && item.kind !== "calm" ? " is-low" : ""}`}
                style={{ left: `${item.x}%`, top: `${item.y}%`, ["--left" as string]: Math.max(0, left) }}
                onPointerDown={(event) => { event.preventDefault(); hit(item.id); }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); hit(item.id); }
                }}
              >
                <span className="reptile-incident-ring"><b>{item.kind === "big" ? item.hp : item.kind === "calm" ? "ok" : "!"}</b></span>
                <span>{item.label}<small>{item.who}</small></span>
              </button>
            );
          })}
          {run?.bursts.map((entry) => (
            <span key={entry.id} className={`reptile-incident-burst is-${entry.tone}`} style={{ left: `${entry.x}%`, top: `${entry.y}%` }}>
              {entry.text}
            </span>
          ))}
          {tip ? (
            <span className="reptile-incident-tip" style={{ left: `${tip.x}%`, top: `${tip.y}%` }}>
              {TUTORIAL_STEPS[run!.step].tip}
            </span>
          ) : null}
          {stage === "intro" ? (
            <div className="reptile-incidents-overlay">
              <div>
                <span className="reptile-section-kicker">Tutorial · non conta</span>
                <h3>La giornata degli imprevisti</h3>
                <p>Dalle 9 alle 19 i collaboratori ti segnalano i guai. Ti mostro un tipo alla volta, poi 8 secondi di prova libera.</p>
                <div className="reptile-panel-actions">
                  <button type="button" className="secondary" onClick={onClose}>Chiudi</button>
                  <button type="button" className="primary" onClick={start}>Inizia il tutorial</button>
                </div>
              </div>
            </div>
          ) : null}
          {stage === "paused" ? (
            <div className="reptile-incidents-overlay">
              <div>
                <h3>In pausa</h3>
                <p>La giornata si ferma quando cambi scheda o finestra.</p>
                <div className="reptile-panel-actions">
                  <button type="button" className="primary" onClick={resume}>Riprendi</button>
                </div>
              </div>
            </div>
          ) : null}
          {stage === "over" && run ? (
            <div className="reptile-incidents-overlay">
              {mode === "play" ? (
                <div>
                  <span className="reptile-section-kicker">Palazzetto chiuso · 19:00</span>
                  <h3>{verdict}</h3>
                  <strong className="reptile-incidents-result">+{bonus}%</strong>
                  <p>sulla resa del torneo</p>
                  <dl className="reptile-incidents-stats">
                    <div><dt>risolti</dt><dd>{run.solved}</dd></div>
                    <div><dt>lamentele</dt><dd>{run.missed}</dd></div>
                    <div><dt>serie migliore</dt><dd>{run.best}</dd></div>
                  </dl>
                  <div className="reptile-panel-actions">
                    <button type="button" className="primary" onClick={() => onFinish(run.score, run.available)}>Torna al torneo</button>
                  </div>
                </div>
              ) : (
                <div>
                  <span className="reptile-section-kicker">Tutorial finito</span>
                  <h3>Pronto per la giornata vera?</h3>
                  <p>Dura 30 secondi e si gioca una volta sola per torneo, fino a +{GAME_CONFIG.reptileMinigameMaxBonusPercent}% sulla resa. Il tutorial si rifà quando vuoi.</p>
                  <div className="reptile-panel-actions">
                    <button type="button" className="text-button" onClick={onClose}>Chiudi</button>
                    <button type="button" className="secondary" onClick={start}>Rifai il tutorial</button>
                    <button type="button" className="primary" onClick={onPlay}>Gioca</button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
