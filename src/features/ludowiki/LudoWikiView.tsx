import { useMemo, useState } from "react";
import { Icon, type IconName } from "../../components/common/Icon";
import { OfficialStatValue } from "../../components/common/OfficialStatValue";
import {
  LUDODEX_LEGENDARIES,
  LUDOWIKI_CHAPTER_GROUPS,
  LUDOWIKI_CHAPTERS,
  type LudodexLegendary,
  type LudoWikiChapter,
  type LudoWikiVisualIcon,
} from "../../content/ludowiki";
import { useGameStateSlices } from "../../game/GameStateContext";
import type { GameState, SpecialCollaboratorId } from "../../game/types";
import {
  getDiscoveredLegendaryIds,
  getLegendaryDossier,
} from "./ludodexPresentation";

type LudoWikiSection = "ludodex" | "manual";
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

function LegendaryMark({
  legendary,
  discovered,
  large = false,
}: {
  legendary: LudodexLegendary;
  discovered: boolean;
  large?: boolean;
}) {
  const initials = discovered
    ? `${legendary.firstName.charAt(0)}${legendary.lastName.charAt(0)}`
    : "?";
  return (
    <span
      className={`ludodex-mark${discovered ? " is-discovered" : " is-locked"}${large ? " is-large" : ""}`}
      aria-hidden="true"
    >
      {discovered ? <span>{initials}</span> : <Icon name="lock" />}
    </span>
  );
}

function LudodexListRow({
  state,
  legendary,
  index,
  discovered,
  selected,
  onSelect,
}: {
  state: Pick<GameState, "contacts" | "legendaryCollaborators">;
  legendary: LudodexLegendary;
  index: number;
  discovered: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const dossier = discovered ? getLegendaryDossier(state, legendary) : undefined;
  const accessibleName = discovered
    ? `Apri dossier di ${getLegendaryName(legendary)}`
    : `Apri voce Ludodex sconosciuta ${index + 1}`;
  return (
    <button
      type="button"
      className={`ludodex-row${selected ? " is-selected" : ""}${discovered ? " is-discovered" : " is-locked"}`}
      onClick={onSelect}
      aria-label={accessibleName}
      aria-pressed={selected}
    >
      <LegendaryMark legendary={legendary} discovered={discovered} />
      <span className="ludodex-row-copy">
        <small>#{(index + 1).toString().padStart(3, "0")}</small>
        <strong>{discovered ? getLegendaryName(legendary) : "???"}</strong>
        {dossier ? (
          <span>
            Arena base {dossier.arenaBase.toFixed(1)} · Stile base {dossier.styleBase.toFixed(1)}
          </span>
        ) : (
          <span>Completa l'iscrizione per sbloccare il dossier</span>
        )}
      </span>
      {discovered ? <Icon name="spark" /> : <Icon name="lock" />}
    </button>
  );
}

function LegendaryDossierPanel({
  state,
  legendary,
  index,
  discovered,
}: {
  state: Pick<GameState, "contacts" | "legendaryCollaborators">;
  legendary: LudodexLegendary;
  index: number;
  discovered: boolean;
}) {
  if (!discovered) {
    return (
      <section className="ludodex-dossier is-locked" aria-label="Dossier non ancora scoperto">
        <LegendaryMark legendary={legendary} discovered={false} large />
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
  const statusCopy = dossier.currentStatus === "enrolled"
    ? "Attualmente nella scuola"
    : dossier.currentStatus === "departed"
      ? "Scoperto · non più nella scuola"
      : "Conservato dalla Rete delle scuole";
  return (
    <section className="ludodex-dossier" aria-labelledby="ludodex-dossier-title">
      <div className="ludodex-dossier-identity">
        <LegendaryMark legendary={legendary} discovered large />
        <div>
          <small>#{(index + 1).toString().padStart(3, "0")}</small>
          <h2 id="ludodex-dossier-title">{getLegendaryName(legendary)}</h2>
          <p className={legendary.kind === "secret" ? "rarity-secret-legendary" : "rarity-legendary"}>
            <Icon name="spark" />
            {legendary.kind === "secret" ? "Leggendario Segreto" : "Leggendario"}
          </p>
          <span className="ludodex-discovery-status"><Icon name="check" />{statusCopy}</span>
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

function LudodexSection({ state }: { state: Pick<GameState, "contacts" | "legendaryCollaborators"> }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LudodexFilter>("all");
  const [selectedId, setSelectedId] = useState<SpecialCollaboratorId | null>(null);
  const discoveredIds = useMemo(() => getDiscoveredLegendaryIds(state), [state]);
  const normalizedQuery = query.trim().toLocaleLowerCase("it-IT");
  const visibleLegendaries = useMemo(() => LUDODEX_LEGENDARIES.filter((legendary) => {
    const discovered = discoveredIds.has(legendary.id);
    if (filter === "discovered" && !discovered) return false;
    if (!normalizedQuery) return true;
    return discovered && getLegendaryName(legendary).toLocaleLowerCase("it-IT").includes(normalizedQuery);
  }), [discoveredIds, filter, normalizedQuery]);
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
            placeholder="Cerca un Leggendario scoperto"
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
                discovered={discoveredIds.has(legendary.id)}
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
          state={state}
          legendary={selectedLegendary}
          index={selectedIndex}
          discovered={discoveredIds.has(selectedLegendary.id)}
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
              <small>{step.detail}</small>
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
        <p>{chapter.introduction}</p>
      </header>
      <ChapterDiagram chapter={chapter} />
      <section aria-labelledby={`${chapter.id}-numbers`}>
        <h3 id={`${chapter.id}-numbers`}>Numeri chiave</h3>
        <div className="ludowiki-numbers">
          {chapter.numbers.map((number) => (
            <div key={`${number.label}-${number.value}`}>
              <span>{number.label}</span>
              <strong>{number.value}</strong>
              <small>{number.detail}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="ludowiki-rules" aria-labelledby={`${chapter.id}-rules`}>
        <h3 id={`${chapter.id}-rules`}>Come funziona</h3>
        <ul>{chapter.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
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

export function LudoWikiView({ state: stateOverride }: { state?: GameState }) {
  const state = useGameStateSlices(["contacts", "legendaryCollaborators"], stateOverride);
  const [section, setSection] = useState<LudoWikiSection>("ludodex");
  return (
    <main className="overview-view ludowiki-view">
      <header>
        <Icon name="ludowiki" />
        <div><h1>LudoWiki</h1><p>Enciclopedia tecnica del gioco e memoria permanente dei Leggendari iscritti.</p></div>
      </header>
      <div className="ludowiki-tabs" role="tablist" aria-label="Sezioni LudoWiki">
        <button type="button" role="tab" aria-selected={section === "ludodex"} className={section === "ludodex" ? "is-active" : ""} onClick={() => setSection("ludodex")}>Ludodex</button>
        <button type="button" role="tab" aria-selected={section === "manual"} className={section === "manual" ? "is-active" : ""} onClick={() => setSection("manual")}>Manuale di gioco</button>
      </div>
      <div className="ludowiki-content" role="tabpanel">
        {section === "ludodex" ? <LudodexSection state={state} /> : <ManualSection />}
      </div>
    </main>
  );
}
