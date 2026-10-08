import { useEffect, useRef, useState, type ReactNode } from "react";

export interface AnnualPage {
  title: string;
  render: () => ReactNode;
}

/**
 * The window of the Pianificazione delle Onde and of the Report annuale: a
 * title, tabs, pages to leaf through (arrows, keyboard) and a final button.
 */
export function AnnualWindow({
  title,
  subtitle,
  pages,
  finalLabel,
  onFinal,
  finalDisabled,
  toolbar,
}: {
  title: string;
  subtitle: string;
  pages: AnnualPage[];
  finalLabel: string;
  onFinal: () => void;
  finalDisabled?: boolean;
  toolbar?: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const page = Math.min(index, pages.length - 1);
  const last = page === pages.length - 1;
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => { pageRef.current?.scrollTo?.({ top: 0 }); }, [page]);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if (event.key === "ArrowRight") setIndex((current) => Math.min(pages.length - 1, current + 1));
      if (event.key === "ArrowLeft") setIndex((current) => Math.max(0, current - 1));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pages.length]);

  return (
    <div className="annual-layer" role="dialog" aria-modal="true" aria-labelledby="annual-title">
      <section className="annual-window">
        <header>
          <div className="annual-top">
            <div className="annual-title">
              <h2 id="annual-title">{title}</h2>
              <span>{subtitle}</span>
            </div>
            <span className="annual-pause">Gioco in pausa</span>
          </div>
          {toolbar}
          <div className="annual-tabs" role="tablist">
            {pages.map((entry, position) => (
              <button
                key={entry.title}
                type="button"
                role="tab"
                aria-selected={position === page}
                onClick={() => setIndex(position)}
              >
                <span className="n">{position + 1}</span>{entry.title}
              </button>
            ))}
          </div>
        </header>
        <div ref={pageRef} className="annual-page" role="tabpanel" aria-label={pages[page]?.title}>
          {pages[page]?.render()}
        </div>
        <footer className="annual-nav">
          <button type="button" className="prev" disabled={page === 0} onClick={() => setIndex(page - 1)}>
            ‹ Indietro
          </button>
          <span className="annual-dots" aria-hidden="true">
            {pages.map((entry, position) => <i key={entry.title} className={position === page ? "on" : undefined} />)}
          </span>
          {last ? (
            <button type="button" className="next is-final" disabled={finalDisabled} onClick={onFinal}>
              {finalLabel}
            </button>
          ) : (
            <button type="button" className="next" onClick={() => setIndex(page + 1)}>
              Avanti ›
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
