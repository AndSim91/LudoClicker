import { useState, type ReactNode } from "react";
import { LUDODEX_LEGENDARIES } from "../../content/ludowiki";
import { LIGHT_INFLATION_MOMENT } from "../../game/lightInflation";
import { FOUNDATION_MOMENT, SUPERBA_MOMENT, getEverEnrolledLegendaryIds } from "../../game/moments";
import type { GameState, MomentKey } from "../../game/types";
import {
  describeFoundation,
  describeGenericMoment,
  describeMoment,
  getFoundationSceneNumbers,
  type MomentContent,
} from "../moments/momentContent";

/*
 * LudoWiki › Scene: the animated moments already seen, generic, replayable.
 * Leggendari and Rete can show the data of one unlocked Leggendario or sede.
 */

type Thumb = "council" | "legendary" | "trophy" | "superba" | "foundation" | "inflation";

const SCENES: readonly { key: MomentKey; thumb: Thumb }[] = [
  { key: "council", thumb: "council" },
  { key: "legendary", thumb: "legendary" },
  { key: "victory:national", thumb: "trophy" },
  { key: "victory:champions", thumb: "trophy" },
  { key: "victory:reptile", thumb: "trophy" },
  { key: SUPERBA_MOMENT, thumb: "superba" },
  { key: "victory:chronicles", thumb: "trophy" },
  { key: FOUNDATION_MOMENT, thumb: "foundation" },
  { key: LIGHT_INFLATION_MOMENT, thumb: "inflation" },
];

/** Foundation and Inflazione di Luce play every time, so they are never in `seen`. */
function isSceneUnlocked(state: GameState, key: MomentKey): boolean {
  if (key === "legendary") return getEverEnrolledLegendaryIds(state).length > 0;
  if (key === FOUNDATION_MOMENT) return state.network.schoolCount > 0;
  if (key === LIGHT_INFLATION_MOMENT) return state.lightInflation.increases > 0;
  return state.moments.seen.includes(key);
}

type Choice = { value: string; label: string };

function getChoices(state: GameState, key: MomentKey): Choice[] {
  if (key === "legendary") {
    const ids = new Set<string>(getEverEnrolledLegendaryIds(state));
    return [
      { value: "", label: "Scena generica" },
      ...LUDODEX_LEGENDARIES.filter((legendary) => ids.has(legendary.id))
        .map((legendary) => ({ value: legendary.id, label: `${legendary.firstName} ${legendary.lastName}` })),
    ];
  }
  if (key === FOUNDATION_MOMENT) {
    return [
      { value: "", label: "Scena generica" },
      ...getFoundationSceneNumbers(state).map((number) => ({ value: String(number), label: `Sede n° ${number}` })),
    ];
  }
  return [];
}

function describeScene(state: GameState, key: MomentKey, choice: string): MomentContent {
  if (!choice) return describeGenericMoment(state, key);
  return key === "legendary" ? describeMoment(state, `legendary:${choice}`) : describeFoundation(state, Number(choice));
}

const THUMBS: Record<Thumb, ReactNode> = {
  council: (
    <>
      <circle className="scene-fill" cx="100" cy="60" r="32" />
      {Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2 - Math.PI / 2;
        return <circle key={index} className="scene-wave" cx={100 + Math.cos(angle) * 46} cy={60 + Math.sin(angle) * 46} r="5" />;
      })}
      <path className="scene-foam" d="M100 46 l8 14 -8 14 -8 -14z" />
    </>
  ),
  legendary: (
    <>
      <circle className="scene-gold-line" cx="100" cy="60" r="40" strokeDasharray="4 5" />
      <circle className="scene-fill scene-wave-line" cx="100" cy="60" r="29" />
      <text className="scene-foam" x="100" y="69" textAnchor="middle">?</text>
    </>
  ),
  trophy: (
    <>
      <path className="scene-gold" d="M76 22h48v20a24 24 0 0 1-48 0z" />
      <path className="scene-gold-line" strokeWidth="4" d="M76 28h-12a12 12 0 0 0 12 18M124 28h12a12 12 0 0 1-12 18" />
      <rect className="scene-gold" x="94" y="66" width="12" height="18" />
      <rect className="scene-gold" x="78" y="84" width="44" height="10" rx="2" />
      {[[40, 30], [160, 40], [150, 96], [48, 90]].map(([x, y]) => <circle key={x} className="scene-wave" cx={x} cy={y} r="2" />)}
    </>
  ),
  superba: (
    <>
      <circle className="scene-halo" cx="100" cy="46" r="34" />
      <path className="scene-tower" d="M90 112V60h20v52zM86 60h28v-6H86zM93 54V40h14v14zM96 40l4-8 4 8z" />
      <rect className="scene-gold" x="95" y="42" width="10" height="10" />
      <path className="scene-fill" d="M0 112q50-10 100 0t100 0v8H0z" />
    </>
  ),
  foundation: (
    <>
      <path className="scene-wave-line" strokeWidth="1" d="M100 12L116 46 100 104 84 46z" />
      {[[100, 12, 3.5], [116, 46, 2.5], [84, 46, 2.5], [108, 74, 2], [92, 74, 2]].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} className="scene-foam" cx={x} cy={y} r={r} />
      ))}
      <path className="scene-gold" d="M140 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
    </>
  ),
  inflation: (
    <>
      <rect className="scene-paper" x="52" y="16" width="96" height="88" rx="3" transform="rotate(-3 100 60)" />
      <g className="scene-ink" transform="rotate(-3 100 60)">
        <rect x="62" y="30" width="60" height="5" /><rect x="62" y="42" width="76" height="3" />
        <rect x="62" y="50" width="70" height="3" /><rect x="62" y="58" width="74" height="3" />
      </g>
      <g className="scene-stamp" transform="rotate(14 128 82)">
        <rect x="104" y="70" width="48" height="24" rx="3" />
        <text x="128" y="88" textAnchor="middle">+10%</text>
      </g>
    </>
  ),
};

function SceneCard({ state, sceneKey, thumb, onReplay }: {
  state: GameState;
  sceneKey: MomentKey;
  thumb: Thumb;
  onReplay?: (content: MomentContent) => void;
}) {
  const [choice, setChoice] = useState("");
  const content = describeScene(state, sceneKey, choice);
  const choices = getChoices(state, sceneKey);
  const selectId = `scene-choice-${sceneKey.replace(/\W/g, "-")}`;
  return (
    <article className="scene-card">
      <div className="scene-art" aria-hidden="true">
        <svg viewBox="0 0 200 120">{THUMBS[thumb]}</svg>
        <span className="scene-play">▶</span>
      </div>
      <div className="scene-copy">
        <small>{content.kicker}</small>
        <strong>{content.title}</strong>
        {choices.length > 1 ? (
          <>
            <label className="sr-only" htmlFor={selectId}>Dati da mostrare</label>
            <select id={selectId} value={choice} onChange={(event) => setChoice(event.target.value)}>
              {choices.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </>
        ) : null}
        <button type="button" className="scene-replay" onClick={() => onReplay?.(content)} disabled={!onReplay}>
          ▶ Rivedi
        </button>
      </div>
    </article>
  );
}

export function ScenesSection({ state, onReplay }: { state: GameState; onReplay?: (content: MomentContent) => void }) {
  const unlocked = SCENES.filter((scene) => isSceneUnlocked(state, scene.key)).length;
  return (
    <section className="scenes-section" aria-labelledby="scenes-title">
      <header className="scenes-summary">
        <strong id="scenes-title">{unlocked === 1 ? "1 scena vista" : `${unlocked} scene viste`}</strong>
        <small>{unlocked < SCENES.length ? "Le altre si scoprono giocando." : "Le hai viste tutte."}</small>
      </header>
      <div className="scenes-grid">
        {SCENES.map((scene) => isSceneUnlocked(state, scene.key) ? (
          <SceneCard key={scene.key} state={state} sceneKey={scene.key} thumb={scene.thumb} onReplay={onReplay} />
        ) : (
          <article key={scene.key} className="scene-card is-locked" aria-label="Scena da scoprire">
            <div className="scene-art" aria-hidden="true"><span>???</span></div>
            <div className="scene-copy"><small>Da scoprire</small><strong>???</strong></div>
          </article>
        ))}
      </div>
    </section>
  );
}
