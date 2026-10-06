import { useMemo, useState } from "react";
import { Icon, type IconName } from "../../components/common/Icon";
import { OfficialStatValue } from "../../components/common/OfficialStatValue";
import { formatStat } from "../../shared/formatters";
import {
  LUDODEX_LEGENDARIES,
  LUDOWIKI_CHAPTER_GROUPS,
  LUDOWIKI_CHAPTERS,
  type LudodexLegendary,
  type LudoWikiChapter,
  type LudoWikiVisualIcon,
} from "../../content/ludowiki";
import { useGameState } from "../../game/GameStateContext";
import { AchievementsSection } from "./AchievementsSection";
import { ScenesSection } from "./ScenesSection";
import { describeMoment, type MomentContent } from "../moments/momentContent";
import type { GameState, SpecialCollaboratorId } from "../../game/types";
import {
  getDiscoveredLegendaryIds,
  getLegendaryDossier,
  getLegendaryEnrollmentCount,
  getLudodexStatus,
  type LudodexStatus,
} from "./ludodexPresentation";
import { KeywordText } from "../../components/common/KeywordText";

export type LudoWikiSection = "ludodex" | "achievements" | "scenes" | "manual";
type LudodexFilter = "all" | "discovered";

const wikiIconNames: Record<LudoWikiVisualIcon, IconName> = {
  contact: "contact",
  mail: "mail",
  send: "send",
  clock: "clock",
  flag: "flag",
  wrench: "wrench",
  people: "people",
  coin: "coin",
  spark: "spark",
  trophy: "trophy",
  gift: "gift",
  trend: "trend",
  book: "book",
};

function getLegendaryName(legendary: LudodexLegendary): string {
  return `${legendary.firstName} ${legendary.lastName}`;
}

const markClass: Record<LudodexStatus, string> = {
  unknown: "is-locked",
  encountered: "is-encountered",
  enrolled: "is-discovered",
};

function LegendaryMark({
  legendary,
  status,
  large = false,
}: {
  legendary: LudodexLegendary;
  status: LudodexStatus;
  large?: boolean;
}) {
  return (
    <span
      className={`ludodex-mark ${markClass[status]}${large ? " is-large" : ""}`}
      aria-hidden="true"
    >
      {status === "unknown"
        ? <Icon name="lock" />
        : <span>{legendary.firstName.charAt(0)}{legendary.lastName.charAt(0)}</span>}
    </span>
  );
}

function LudodexListRow({
  state,
  legendary,
  index,
  status,
  selected,
  onSelect,
}: {
  state: Pick<GameState, "contacts" | "legendaryCollaborators">;
  legendary: LudodexLegendary;
  index: number;
  status: LudodexStatus;
  selected: boolean;
  onSelect: () => void;
}) {
  const dossier = status === "enrolled" ? getLegendaryDossier(state, legendary) : undefined;
  const accessibleName = status === "unknown"
    ? `Apri voce Ludodex sconosciuta ${index + 1}`
    : `Apri dossier di ${getLegendaryName(legendary)}`;
  return (
    <button
      type="button"
      className={`ludodex-row${selected ? " is-selected" : ""} ${markClass[status]}`}
      onClick={onSelect}
      aria-label={accessibleName}
      aria-pressed={selected}
    >
      <LegendaryMark legendary={legendary} status={status} />
      <span className="ludodex-row-copy">
        <small>#{(index + 1).toString().padStart(3, "0")}</small>
        <strong>{status === "unknown" ? "???" : getLegendaryName(legendary)}</strong>
        {dossier ? (
          <span>
            Arena base {formatStat(dossier.arenaBase)} · Stile base {formatStat(dossier.styleBase)}
          </span>
        ) : status === "encountered" ? (
          <span>Incontrato · si apre alla prima iscrizione</span>
        ) : (
          <span>Completa l'iscrizione per sbloccare il dossier</span>
        )}
      </span>
      <Icon name={status === "enrolled" ? "spark" : status === "encountered" ? "search" : "lock"} />
    </button>
  );
}

function LegendaryDossierPanel({
  state,
  legendary,
  index,
  status,
  onReplay,
}: {
  state: Pick<GameState, "contacts" | "legendaryCollaborators">;
  legendary: LudodexLegendary;
  index: number;
  status: LudodexStatus;
  onReplay?: (id: SpecialCollaboratorId) => void;
}) {
  if (status === "encountered") {
    return (
      <section className="ludodex-dossier is-encountered" aria-labelledby="ludodex-dossier-title">
        <div className="ludodex-dossier-identity">
          <LegendaryMark legendary={legendary} status="encountered" large />
          <div>
            <small>#{(index + 1).toString().padStart(3, "0")}</small>
            <h2 id="ludodex-dossier-title">{getLegendaryName(legendary)}</h2>
            <p className={legendary.kind === "secret" ? "rarity-secret-legendary" : "rarity-legendary"}>
              <Icon name="spark" />
              {legendary.kind === "secret" ? "Leggendario Segreto" : "Leggendario"}
            </p>
            <span className="ludodex-discovery-status"><Icon name="search" />Incontrato · mai iscritto</span>
          </div>
        </div>
        <dl className="ludodex-acquisition-info" aria-label="Provenienza">
          <div>
            <dt><Icon name="search" />Luogo d'incontro</dt>
            <dd>{legendary.foundAt}</dd>
          </div>
        </dl>
        <div className="ludodex-permanence-note">
          <Icon name="book" />
          <span><strong>Scheda parziale</strong>Valori, biografia e metodo di acquisizione si aprono quando si iscrive per la prima volta a una delle tue scuole.</span>
        </div>
      </section>
    );
  }
  if (status === "unknown") {
    return (
      <section className="ludodex-dossier is-locked" aria-label="Dossier non ancora scoperto">
        <LegendaryMark legendary={legendary} status="unknown" large />
        <small>#{(index + 1).toString().padStart(3, "0")}</small>
        <h2>Leggendario sconosciuto</h2>
        <p>Questo dossier si aprirà quando il Leggendario si iscriverà per la prima volta a una delle tue scuole.</p>
        <div className="ludodex-permanence-note">
          <Icon name="book" />
          <span><strong>Registrazione permanente</strong>La scoperta resterà nella LudoWiki anche dopo un abbandono o la fondazione di una nuova scuola.</span>
        </div>
      </section>
    );
  }

  const dossier = getLegendaryDossier(state, legendary);
  const enrollments = getLegendaryEnrollmentCount(state, legendary.id);
  const statusCopy = dossier.currentStatus === "enrolled"
    ? "Attualmente nella scuola"
    : dossier.currentStatus === "departed"
      ? "Scoperto · non più nella scuola"
      : "Conservato dalla Rete delle scuole";
  return (
    <section className="ludodex-dossier" aria-labelledby="ludodex-dossier-title">
      <div className="ludodex-dossier-identity">
        <LegendaryMark legendary={legendary} status="enrolled" large />
        <div>
          <small>#{(index + 1).toString().padStart(3, "0")}</small>
          <h2 id="ludodex-dossier-title">{getLegendaryName(legendary)}</h2>
          <p className={legendary.kind === "secret" ? "rarity-secret-legendary" : "rarity-legendary"}>
            <Icon name="spark" />
            {legendary.kind === "secret" ? "Leggendario Segreto" : "Leggendario"}
          </p>
          <span className="ludodex-discovery-status"><Icon name="check" />{statusCopy}</span>
          <span className="ludodex-enrollment-count">
            {enrollments === 1 ? "Iscritto 1 volta" : `Iscritto ${enrollments} volte`}
          </span>
          {onReplay ? (
            <button type="button" className="scene-replay ludodex-scene-replay" onClick={() => onReplay(legendary.id as SpecialCollaboratorId)}>
              ▶ Rivedi la scena
            </button>
          ) : null}
        </div>
      </div>

      <div className="ludodex-stats" aria-label="Valori di base">
        <div><span>Arena base</span><OfficialStatValue value={dossier.arenaBase} /></div>
        <div><span>Stile base</span><OfficialStatValue value={dossier.styleBase} /></div>
      </div>

      <dl className="ludodex-acquisition-info" aria-label="Provenienza e acquisizione">
        <div>
          <dt><Icon name="people" />Scuola iniziale</dt>
          <dd>{legendary.initialSchool}</dd>
        </div>
        <div>
          <dt><Icon name="search" />Luogo d'incontro</dt>
          <dd>{legendary.foundAt}</dd>
        </div>
        <div>
          <dt><Icon name="check" />Metodo di acquisizione</dt>
          <dd>{legendary.acquisition}</dd>
        </div>
      </dl>

      <section className="ludodex-biography" aria-labelledby="ludodex-biography-title">
        <h3 id="ludodex-biography-title">Biografia</h3>
        <p>La biografia di questo atleta sarà aggiunta in un secondo momento.</p>
      </section>
    </section>
  );
}

function LudodexSection({ state, onReplay }: { state: Pick<GameState, "contacts" | "legendaryCollaborators">; onReplay?: (id: SpecialCollaboratorId) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LudodexFilter>("all");
  const [selectedId, setSelectedId] = useState<SpecialCollaboratorId | null>(null);
  const discoveredIds = useMemo(() => getDiscoveredLegendaryIds(state), [state]);
  const normalizedQuery = query.trim().toLocaleLowerCase("it-IT");
  const statusOf = (profileId: SpecialCollaboratorId) => getLudodexStatus(state, discoveredIds, profileId);
  const visibleLegendaries = LUDODEX_LEGENDARIES.filter((legendary) => {
    const status = statusOf(legendary.id);
    if (filter === "discovered" && status !== "enrolled") return false;
    if (!normalizedQuery) return true;
    return status !== "unknown" && getLegendaryName(legendary).toLocaleLowerCase("it-IT").includes(normalizedQuery);
  });
  const selectedLegendary = visibleLegendaries.find((legendary) => legendary.id === selectedId) ??
    visibleLegendaries[0];
  const selectedIndex = selectedLegendary
    ? LUDODEX_LEGENDARIES.findIndex((legendary) => legendary.id === selectedLegendary.id)
    : -1;
  const discoveredCount = LUDODEX_LEGENDARIES.reduce(
    (total, legendary) => total + Number(discoveredIds.has(legendary.id)),
    0,
  );
  const completion = LUDODEX_LEGENDARIES.length === 0
    ? 0
    : discoveredCount / LUDODEX_LEGENDARIES.length;

  return (
    <div className="ludodex-layout">
      <aside className="ludodex-catalog" aria-label="Catalogo Ludodex">
        <div className="ludodex-progress-copy">
          <span>Collezione Ludodex</span>
          <strong>{discoveredCount} / {LUDODEX_LEGENDARIES.length}</strong>
        </div>
        <div
          className="ludodex-progress"
          role="progressbar"
          aria-label="Completamento Ludodex"
          aria-valuemin={0}
          aria-valuemax={LUDODEX_LEGENDARIES.length}
          aria-valuenow={discoveredCount}
        >
          <span style={{ width: `${completion * 100}%` }} />
        </div>
        <label className="ludowiki-search">
          <Icon name="search" />
          <span className="sr-only">Cerca nel Ludodex</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca un Leggendario incontrato"
          />
        </label>
        <div className="ludodex-filters" aria-label="Filtri Ludodex">
          <button type="button" className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")} aria-pressed={filter === "all"}>Tutti</button>
          <button type="button" className={filter === "discovered" ? "is-active" : ""} onClick={() => setFilter("discovered")} aria-pressed={filter === "discovered"}>Scoperti</button>
        </div>
        <div className="ludodex-list">
          {visibleLegendaries.length > 0 ? visibleLegendaries.map((legendary) => {
            const index = LUDODEX_LEGENDARIES.findIndex((candidate) => candidate.id === legendary.id);
            return (
              <LudodexListRow
                key={legendary.id}
                state={state}
                legendary={legendary}
                index={index}
                status={statusOf(legendary.id)}
                selected={selectedLegendary?.id === legendary.id}
                onSelect={() => setSelectedId(legendary.id)}
              />
            );
          }) : (
            <div className="ludowiki-empty"><Icon name="search" /><strong>Nessun dossier trovato</strong><span>Prova a cambiare ricerca o filtro.</span></div>
          )}
        </div>
      </aside>
      {selectedLegendary ? (
        <LegendaryDossierPanel
          onReplay={onReplay}
          state={state}
          legendary={selectedLegendary}
          index={selectedIndex}
          status={statusOf(selectedLegendary.id)}
        />
      ) : (
        <section className="ludodex-dossier is-empty"><Icon name="ludowiki" /><h2>Nessun dossier disponibile</h2><p>Modifica i filtri per tornare al catalogo completo.</p></section>
      )}
    </div>
  );
}

function ChapterDiagram({ chapter }: { chapter: LudoWikiChapter }) {
  return (
    <figure className="ludowiki-diagram" aria-labelledby={`${chapter.id}-diagram-caption`}>
      <div>
        {chapter.steps.map((step, index) => (
          <div className="ludowiki-diagram-part" key={step.label}>
            <div className="ludowiki-step">
              <span><Icon name={wikiIconNames[step.icon]} /></span>
              <strong>{step.label}</strong>
              <small><KeywordText text={step.detail} /></small>
            </div>
            {index < chapter.steps.length - 1 ? <Icon name="arrowRight" /> : null}
          </div>
        ))}
      </div>
      <figcaption id={`${chapter.id}-diagram-caption`}>Schema del flusso: {chapter.title}</figcaption>
    </figure>
  );
}

function ManualArticle({
  chapter,
  onOpenChapter,
}: {
  chapter: LudoWikiChapter;
  onOpenChapter: (chapterId: string) => void;
}) {
  return (
    <article className="ludowiki-article" aria-labelledby="ludowiki-article-title">
      <header>
        <small>{chapter.group}</small>
        <h2 id="ludowiki-article-title">{chapter.title}</h2>
        <p><KeywordText text={chapter.introduction} /></p>
      </header>
      <ChapterDiagram chapter={chapter} />
      <section aria-labelledby={`${chapter.id}-numbers`}>
        <h3 id={`${chapter.id}-numbers`}>Numeri chiave</h3>
        <div className="ludowiki-numbers">
          {chapter.numbers.map((number) => (
            <div key={`${number.label}-${number.value}`}>
              <span>{number.label}</span>
              <strong>{number.value}</strong>
              <small><KeywordText text={number.detail} /></small>
            </div>
          ))}
        </div>
      </section>
      <section className="ludowiki-rules" aria-labelledby={`${chapter.id}-rules`}>
        <h3 id={`${chapter.id}-rules`}>Come funziona</h3>
        <ul>{chapter.rules.map((rule) => <li key={rule}><KeywordText text={rule} /></li>)}</ul>
      </section>
      {chapter.example ? (
        <section className="ludowiki-example" aria-labelledby={`${chapter.id}-example`}>
          <Icon name="flask" />
          <div><h3 id={`${chapter.id}-example`}>{chapter.example.title}</h3>{chapter.example.lines.map((line) => <p key={line}>{line}</p>)}</div>
        </section>
      ) : null}
      {chapter.note ? <p className="ludowiki-note"><Icon name="info" /><span><strong>Nota di gioco</strong>{chapter.note}</span></p> : null}
      <footer>
        <strong>Argomenti correlati</strong>
        <div>{chapter.related.map((chapterId) => {
          const relatedChapter = LUDOWIKI_CHAPTERS.find((candidate) => candidate.id === chapterId);
          return relatedChapter ? <button type="button" key={chapterId} onClick={() => onOpenChapter(chapterId)}>{relatedChapter.title}</button> : null;
        })}</div>
      </footer>
    </article>
  );
}

function ManualSection() {
  const [query, setQuery] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("prove-iscrizioni");
  const normalizedQuery = query.trim().toLocaleLowerCase("it-IT");
  const visibleChapters = useMemo(() => LUDOWIKI_CHAPTERS.filter((chapter) =>
    !normalizedQuery || `${chapter.title} ${chapter.summary}`.toLocaleLowerCase("it-IT").includes(normalizedQuery)
  ), [normalizedQuery]);
  const selectedChapter = visibleChapters.find((chapter) => chapter.id === selectedChapterId) ??
    visibleChapters[0];
  const openChapter = (chapterId: string) => {
    setQuery("");
    setSelectedChapterId(chapterId);
  };

  return (
    <div className="ludowiki-manual-layout">
      <aside className="ludowiki-chapters" aria-label="Capitoli del manuale">
        <label className="ludowiki-search">
          <Icon name="search" />
          <span className="sr-only">Cerca nel manuale</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca nel manuale" />
        </label>
        <nav aria-label="Indice del manuale">
          {LUDOWIKI_CHAPTER_GROUPS.map((group) => {
            const chapters = visibleChapters.filter((chapter) => chapter.group === group);
            return chapters.length > 0 ? (
              <section key={group}>
                <h3>{group}</h3>
                {chapters.map((chapter) => (
                  <button
                    type="button"
                    key={chapter.id}
                    className={selectedChapter?.id === chapter.id ? "is-active" : ""}
                    onClick={() => setSelectedChapterId(chapter.id)}
                    aria-current={selectedChapter?.id === chapter.id ? "page" : undefined}
                  >
                    <span>{chapter.title}</span>
                    <small>{chapter.summary}</small>
                  </button>
                ))}
              </section>
            ) : null;
          })}
        </nav>
        {visibleChapters.length === 0 ? <div className="ludowiki-empty"><Icon name="search" /><strong>Nessun capitolo trovato</strong><span>Prova con un termine più generale.</span></div> : null}
      </aside>
      {selectedChapter ? <ManualArticle chapter={selectedChapter} onOpenChapter={openChapter} /> : <div />}
    </div>
  );
}

export function LudoWikiView({
  state: stateOverride,
  initialSection = "ludodex",
  onReplayMoment,
}: {
  state?: GameState;
  initialSection?: LudoWikiSection;
  onReplayMoment?: (content: MomentContent) => void;
}) {
  const state = useGameState(stateOverride);
  const replayLegendary = onReplayMoment
    ? (id: SpecialCollaboratorId) => onReplayMoment(describeMoment(state, `legendary:${id}`))
    : undefined;
  const [section, setSection] = useState<LudoWikiSection>(initialSection);
  return (
    <main className="overview-view ludowiki-view">
      <header>
        <Icon name="ludowiki" />
        <div><h1>LudoWiki</h1><p>Enciclopedia del gioco, Ludodex dei Leggendari e bacheca dei traguardi della tua partita.</p></div>
      </header>
      <div className="ludowiki-tabs" role="tablist" aria-label="Sezioni LudoWiki">
        <button type="button" role="tab" aria-selected={section === "ludodex"} className={section === "ludodex" ? "is-active" : ""} onClick={() => setSection("ludodex")}>Ludodex</button>
        <button type="button" role="tab" aria-selected={section === "achievements"} className={section === "achievements" ? "is-active" : ""} onClick={() => setSection("achievements")}>Traguardi</button>
        <button type="button" role="tab" aria-selected={section === "scenes"} className={section === "scenes" ? "is-active" : ""} onClick={() => setSection("scenes")}>Scene</button>
        <button type="button" role="tab" aria-selected={section === "manual"} className={section === "manual" ? "is-active" : ""} onClick={() => setSection("manual")}>Manuale di gioco</button>
      </div>
      <div className="ludowiki-content" role="tabpanel">
        {section === "ludodex"
          ? <LudodexSection state={state} onReplay={replayLegendary} />
          : section === "achievements"
            ? <AchievementsSection state={state} />
            : section === "scenes"
              ? <ScenesSection state={state} onReplay={onReplayMoment} />
              : <ManualSection />}
      </div>
    </main>
  );
}
