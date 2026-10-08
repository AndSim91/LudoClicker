import type { ReactNode } from "react";

export interface ActiveListFilter {
  key: string;
  label: string;
  className?: string;
  onRemove: () => void;
}

export interface ListSortOption<K extends string> {
  value: K;
  label: string;
}

export interface ListSort<K extends string> {
  key: K;
  direction: "ascending" | "descending";
}

/**
 * Concept F3 «Cassetto dei filtri» (Tavola 12, 08/10): search, Filtri, Ordina
 * and the count on one bar; the filters live in a drawer under it and, when
 * it is closed, the active ones stay visible as removable chips.
 */
export function ListFilterBar<K extends string>({
  id,
  noun,
  search,
  searchLabel,
  onSearch,
  favorites,
  drawerOpen,
  onToggleDrawer,
  activeFilters,
  onResetFilters,
  sortOptions,
  sort,
  onSortChange,
  onReverseSort,
  count,
  extra,
  children,
}: {
  id: string;
  noun: string;
  search: string;
  searchLabel: string;
  onSearch: (value: string) => void;
  favorites?: { active: boolean; onToggle: () => void };
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  activeFilters: ActiveListFilter[];
  onResetFilters: () => void;
  sortOptions: ListSortOption<K>[];
  sort: ListSort<K> | null;
  onSortChange: (key: K | null) => void;
  onReverseSort: () => void;
  count: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const drawerId = `${id}-filters`;
  const activeCount = activeFilters.length;
  return (
    <div className="list-filter-bar">
      <div className="list-filter-toolbar">
        <label className="list-filter-search">
          <span className="sr-only">{searchLabel}</span>
          <input
            type="search"
            aria-label={searchLabel}
            placeholder="Nome o email"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </label>
        <button
          type="button"
          className={`list-filter-toggle${activeCount > 0 ? " has-active" : ""}`}
          aria-expanded={drawerOpen}
          aria-controls={drawerId}
          onClick={onToggleDrawer}
        >
          Filtri{activeCount > 0 ? ` · ${activeCount}` : ""}
          <span className="list-filter-caret" aria-hidden="true">{drawerOpen ? "▲" : "▼"}</span>
        </button>
        {activeCount > 0 || search !== "" ? (
          <button type="button" className="list-filter-reset" onClick={onResetFilters}>Azzera filtri</button>
        ) : null}
        {favorites ? (
          <button
            type="button"
            className="list-filter-favorites"
            aria-pressed={favorites.active}
            onClick={favorites.onToggle}
          >
            <span aria-hidden="true">★</span> Preferiti
          </button>
        ) : null}
        <span className={`list-filter-sort${sort ? " is-active" : ""}`}>
          <label>
            <span>Ordina</span>
            <select
              aria-label={`Ordina ${noun}`}
              value={sort?.key ?? ""}
              onChange={(event) => onSortChange((event.target.value || null) as K | null)}
            >
              <option value="">Ordine iniziale</option>
              {sortOptions.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          {sort ? (
            <button
              type="button"
              aria-label={sort.direction === "ascending" ? "Ordine crescente, inverti" : "Ordine decrescente, inverti"}
              title="Inverti l'ordine"
              onClick={onReverseSort}
            >
              {sort.direction === "ascending" ? "↑" : "↓"}
            </button>
          ) : null}
        </span>
        <span className="list-filter-spacer" />
        <span className="list-filter-count" aria-live="polite">{count}</span>
        {extra}
      </div>
      {drawerOpen ? (
        <div className="list-filter-drawer" id={drawerId} role="group" aria-label={`Filtri ${noun}`}>
          {children}
        </div>
      ) : activeCount > 0 ? (
        <div className="list-filter-active" aria-label={`Filtri attivi ${noun}`}>
          {activeFilters.map((filter) => (
            <button
              type="button"
              key={filter.key}
              className={`list-filter-chip is-on${filter.className ? ` ${filter.className}` : ""}`}
              aria-label={`Togli il filtro ${filter.label}`}
              onClick={filter.onRemove}
            >
              {filter.label} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FilterGroup({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`list-filter-group${wide ? " is-wide" : ""}`} role="group" aria-label={label}>
      <small>{label}</small>
      <div className="list-filter-chips">{children}</div>
    </div>
  );
}

export function FilterChip({
  pressed,
  onToggle,
  className,
  title,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`list-filter-chip${pressed ? " is-on" : ""}${className ? ` ${className}` : ""}`}
      aria-pressed={pressed}
      title={title}
      onClick={onToggle}
    >
      {children}
    </button>
  );
}
