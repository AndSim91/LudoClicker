import { useMemo, useState } from "react";
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_TIERS,
  ACHIEVEMENT_TOTAL,
  SECRET_ACHIEVEMENTS,
  TIERED_ACHIEVEMENTS,
  formatAchievementAmount,
  getAchievementTierLabel,
  getTierKey,
  type AchievementCategory,
  type AchievementTier,
} from "../../content/achievements";
import type { GameState } from "../../game/types";

type MedalTier = AchievementTier | "locked";
type Filter = "Tutti" | AchievementCategory;

interface AchievementCard {
  id: string;
  category: AchievementCategory;
  title: string;
  goal: string;
  tier: MedalTier;
  progress: number;
  progressLabel: string;
  flavor: string;
  steps: { label: string; goal: string; state: string; reached: boolean; tier: MedalTier }[];
}

function buildCards(state: GameState): AchievementCard[] {
  const unlocked = new Set(state.achievements);
  const tiered = TIERED_ACHIEVEMENTS.map((definition): AchievementCard => {
    const value = definition.value(state);
    const reachedTiers = ACHIEVEMENT_TIERS.filter((tier) => unlocked.has(getTierKey(definition.id, tier)));
    const tier: MedalTier = reachedTiers.at(-1) ?? "locked";
    const nextIndex = ACHIEVEMENT_TIERS.findIndex((candidate) => !unlocked.has(getTierKey(definition.id, candidate)));
    const next = nextIndex === -1 ? undefined : definition.thresholds[nextIndex];
    return {
      id: definition.id,
      category: definition.category,
      title: definition.title,
      goal: `${definition.measure}: ${definition.thresholds.map((threshold) => formatAchievementAmount(threshold, definition)).join(" · ")}`,
      tier,
      progress: next === undefined ? 1 : Math.min(1, value / next),
      progressLabel: next === undefined
        ? "Completato"
        : `${formatAchievementAmount(Math.min(value, next), definition)} / ${formatAchievementAmount(next, definition)}`,
      flavor: definition.measure,
      steps: ACHIEVEMENT_TIERS.map((stepTier, index) => {
        const reached = unlocked.has(getTierKey(definition.id, stepTier));
        return {
          label: getAchievementTierLabel(stepTier),
          goal: formatAchievementAmount(definition.thresholds[index], definition),
          state: reached
            ? "Ottenuto"
            : index === nextIndex
              ? `${formatAchievementAmount(Math.min(value, definition.thresholds[index]), definition)} / ${formatAchievementAmount(definition.thresholds[index], definition)}`
              : "Bloccato",
          reached,
          tier: stepTier,
        };
      }),
    };
  });
  const secrets = SECRET_ACHIEVEMENTS.map((secret): AchievementCard => {
    const reached = unlocked.has(secret.id);
    return {
      id: secret.id,
      category: "Segreti",
      title: reached ? secret.title : "Traguardo segreto",
      goal: reached ? secret.description : "Continua a giocare per scoprirlo.",
      tier: reached ? "gold" : "locked",
      progress: reached ? 1 : 0,
      progressLabel: reached ? "Svelato" : "???",
      flavor: reached ? secret.description : "Qualcuno, nella sede di Genova, sa di cosa si tratta.",
      steps: [{ label: "Livello unico", goal: reached ? "Svelato" : "???", state: reached ? "Ottenuto" : "Bloccato", reached, tier: "gold" }],
    };
  });
  return [...tiered, ...secrets];
}

function Medal({ tier, glyph, large = false }: { tier: MedalTier; glyph: string; large?: boolean }) {
  const size = large ? 112 : 52;
  return (
    <svg className={`achievement-medal is-${tier}${large ? " is-large" : ""}`} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path className="achievement-medal-ribbon" d="M13 3 L20 13 L27 3" />
      <circle className="achievement-medal-disc" cx="20" cy="24" r="13" />
      <text x="20" y="28.5" textAnchor="middle">{glyph}</text>
    </svg>
  );
}

export function AchievementsSection({ state }: { state: GameState }) {
  const [filter, setFilter] = useState<Filter>("Tutti");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cards = useMemo(() => buildCards(state), [state]);
  const counts = useMemo(() => {
    const keys = new Set(state.achievements);
    return {
      total: [...keys].filter((key) => TIERED_ACHIEVEMENTS.some((definition) => key.startsWith(`${definition.id}:`)) ||
        SECRET_ACHIEVEMENTS.some((secret) => secret.id === key)).length,
      gold: [...keys].filter((key) => key.endsWith(":gold")).length + SECRET_ACHIEVEMENTS.filter((secret) => keys.has(secret.id)).length,
      silver: [...keys].filter((key) => key.endsWith(":silver")).length,
      bronze: [...keys].filter((key) => key.endsWith(":bronze")).length,
    };
  }, [state.achievements]);
  const visible = cards.filter((card) => filter === "Tutti" || card.category === filter);
  const selected = visible.find((card) => card.id === selectedId) ?? visible[0];
  const completion = Math.round(counts.total / ACHIEVEMENT_TOTAL * 100);

  return (
    <div className="achievements-layout">
      <section className="achievements-main" aria-label="Bacheca dei traguardi">
        <div className="achievements-summary">
          <div><span>Traguardi ottenuti</span><strong>{counts.total} <small>/ {ACHIEVEMENT_TOTAL}</small></strong></div>
          <div><Medal tier="gold" glyph="" /><span>Oro</span><strong>{counts.gold}</strong></div>
          <div><Medal tier="silver" glyph="" /><span>Argento</span><strong>{counts.silver}</strong></div>
          <div><Medal tier="bronze" glyph="" /><span>Bronzo</span><strong>{counts.bronze}</strong></div>
          <div><span>Completamento</span><strong className="achievements-completion">{completion}%</strong></div>
        </div>
        <div className="achievements-filters" role="group" aria-label="Categorie">
          {(["Tutti", ...ACHIEVEMENT_CATEGORIES] as Filter[]).map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={filter === category}
              className={filter === category ? "is-active" : ""}
              onClick={() => setFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <ul className="achievements-grid">
          {visible.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                className={`achievement-tile is-${card.tier}${selected?.id === card.id ? " is-selected" : ""}`}
                aria-pressed={selected?.id === card.id}
                onClick={() => setSelectedId(card.id)}
              >
                <Medal tier={card.tier} glyph={card.category === "Segreti" ? "?" : card.title.charAt(0)} />
                <span className="achievement-tile-copy">
                  <small>{card.category} · {card.tier === "locked" ? "Da sbloccare" : getAchievementTierLabel(card.tier)}</small>
                  <strong>{card.title}</strong>
                  <span>{card.goal}</span>
                  <span className="achievement-progress">
                    <span className="achievement-progress-bar"><span style={{ width: `${card.progress * 100}%` }} /></span>
                    <span>{card.progressLabel}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      {selected ? (
        <aside className="achievement-detail" aria-label="Dettaglio del traguardo">
          <div className="achievement-detail-head">
            <Medal tier={selected.tier} glyph={selected.category === "Segreti" ? "?" : selected.title.charAt(0)} large />
            <span>{selected.tier === "locked" ? "Da sbloccare" : `Livello ${getAchievementTierLabel(selected.tier)}`}</span>
            <h2>{selected.title}</h2>
            <p>{selected.flavor}</p>
          </div>
          <ol>
            {selected.steps.map((step) => (
              <li key={step.label} className={step.reached ? "is-reached" : undefined}>
                <span className={`achievement-dot is-${step.tier}`} aria-hidden="true" />
                <span><strong>{step.label} · {step.goal}</strong><small>{step.state}</small></span>
              </li>
            ))}
          </ol>
          <p className="achievement-note">Traguardi permanenti: valgono per tutta la partita, anche dopo il prestigio. Nessun premio, solo la collezione.</p>
        </aside>
      ) : null}
    </div>
  );
}
