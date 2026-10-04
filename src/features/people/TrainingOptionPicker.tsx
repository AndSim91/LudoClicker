import { useEffect, useId, useRef, useState } from "react";
import { getFormLogo } from "../../content/formLogos";
import type { FormDefinition } from "../../content/forms";
import type { FormId } from "../../game/types";
import { getDefaultTrainingOption } from "./peoplePresentation";

export interface TrainingOption {
  definition: FormDefinition;
  costLabel: string;
  contextLabel?: string;
  coverage?: "covered" | "uncovered";
  /** Forma già imparata a cui manca il Corso Istruttori. */
  qualification?: boolean;
}

const MENU_GAP = 4;
const MENU_MAX_HEIGHT = 360;

function describe(option: TrainingOption, showContext: boolean) {
  const { definition } = option;
  return [
    option.coverage === "uncovered" ? "Nessuno la insegna" : undefined,
    showContext && !option.qualification ? option.contextLabel : undefined,
    definition.bonusLabel ?? (definition.branch ? "Specializzazione d'arma" : "Percorso lineare"),
  ].filter(Boolean).join(" · ");
}

export function TrainingOptionPicker({
  displayName,
  label,
  options,
  selectedFormId,
  onSelect,
}: {
  displayName: string;
  label: string;
  options: readonly TrainingOption[];
  selectedFormId: FormId | "";
  onSelect: (formId: FormId) => void;
}) {
  const fieldRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.definition.id === selectedFormId) ??
    getDefaultTrainingOption(options);
  const qualifications = options.filter((option) => option.qualification);
  const newForms = options.filter((option) => !option.qualification);
  const groups = qualifications.length > 0 && newForms.length > 0
    ? [
        { title: "Da abilitare · Corso Istruttori", items: qualifications },
        { title: "Nuove Forme", items: newForms },
      ]
    : [{ title: undefined, items: options }];
  // Un'etichetta uguale per tutte (es. «Corso Tecnico SIS») non dice niente riga per riga.
  const showContext = new Set(options.map((option) => option.contextLabel)).size > 1;
  const uncoveredCount = options.filter((option) => option.coverage === "uncovered").length;
  const summary = `${options.length} formazioni possibili` + (
    uncoveredCount === 0 ? "" : uncoveredCount === 1 ? ", 1 non coperta" : `, ${uncoveredCount} non coperte`
  );
  // Id unico per istanza: Istruttore e Tecnici della stessa persona non devono condividerlo.
  const menuId = `training-menu-${useId().replace(/\W+/g, "")}`;

  // Il menu sta nel top layer: lo si chiude se la pagina scorre, invece di inseguire il campo.
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      menuRef.current?.hidePopover?.();
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    menuRef.current?.querySelector<HTMLButtonElement>("[aria-selected='true']")?.focus();
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const placeMenu = () => {
    const field = fieldRef.current;
    const menu = menuRef.current;
    if (!field || !menu) return;
    const rect = field.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - MENU_GAP * 2;
    const above = rect.top - MENU_GAP * 2;
    const openUp = below < 240 && above > below;
    menu.style.left = `${Math.max(MENU_GAP, Math.min(rect.left, window.innerWidth - 320 - MENU_GAP))}px`;
    menu.style.minWidth = `${Math.max(rect.width, 300)}px`;
    menu.style.maxHeight = `${Math.min(MENU_MAX_HEIGHT, openUp ? above : below)}px`;
    menu.style.top = openUp ? "" : `${rect.bottom + MENU_GAP}px`;
    menu.style.bottom = openUp ? `${window.innerHeight - rect.top + MENU_GAP}px` : "";
  };

  if (!selected) return null;
  const selectedLogo = getFormLogo(selected.definition.id);

  return (
    <div className="training-option-picker">
      <span className="training-option-picker-label">{label}</span>
      <button
        ref={fieldRef}
        type="button"
        className={`training-option-field${selected.coverage === "uncovered" ? " is-uncovered" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Formazione per ${displayName}: ${selected.definition.longName}, ${selected.costLabel}${selected.coverage === "uncovered" ? ", nessuno la insegna" : ""}`}
        popoverTarget={menuId}
        onClick={placeMenu}
      >
        <img src={selectedLogo.assetPath} alt="" aria-hidden="true" />
        <span className="training-option-copy">
          <strong>{selected.definition.longName}</strong>
          <small>
            {selected.coverage === "uncovered" ? <i className="training-option-dot" aria-hidden="true" /> : null}
            <b>{selected.costLabel}</b>
          </small>
        </span>
        <span className="training-option-chevron" aria-hidden="true">▾</span>
      </button>
      <small className="training-option-summary">{summary}</small>
      <div
        ref={menuRef}
        id={menuId}
        className="training-option-menu"
        popover="auto"
        role="listbox"
        aria-label={`Formazione per ${displayName}`}
        onToggle={(event) => setOpen((event.nativeEvent as ToggleEvent).newState === "open")}
      >
        {groups.map((group) => (
          <div className="training-option-group" role="group" aria-label={group.title} key={group.title ?? "all"}>
            {group.title ? <span className="training-option-group-title">{group.title}</span> : null}
            {group.items.map((option) => {
              const { definition } = option;
              const isSelected = definition.id === selected.definition.id;
              return (
                <button
                  type="button"
                  className={`training-option-row${isSelected ? " is-selected" : ""}${option.coverage === "uncovered" ? " is-uncovered" : ""}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelect(definition.id);
                    menuRef.current?.hidePopover?.();
                  }}
                  key={definition.id}
                >
                  <img src={getFormLogo(definition.id).assetPath} alt="" aria-hidden="true" />
                  <span className="training-option-copy">
                    <strong>{definition.longName}</strong>
                    <small>{describe(option, showContext)}</small>
                  </span>
                  <b className="training-option-cost">{option.costLabel}</b>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
