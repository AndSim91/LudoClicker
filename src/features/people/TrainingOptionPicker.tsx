import { getFormLogo } from "../../content/formLogos";
import type { FormDefinition } from "../../content/forms";
import type { FormId } from "../../game/types";

export interface TrainingOption {
  definition: FormDefinition;
  costLabel: string;
  contextLabel?: string;
  coverage?: "covered" | "uncovered";
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
  const hasUncoveredOptions = options.some((option) => option.coverage === "uncovered");

  return (
    <div className="training-option-picker">
      <span className="training-option-picker-label">{label}</span>
      {hasUncoveredOptions ? (
        <small className="training-option-picker-hint">
          Evidenziate: Forme non coperte nella scuola
        </small>
      ) : null}
      <div
        className="training-option-list"
        role="radiogroup"
        aria-label={`Formazione per ${displayName}`}
      >
        {options.map(({ definition, costLabel, contextLabel, coverage }) => {
          const selected = definition.id === selectedFormId;
          const uncovered = coverage === "uncovered";
          const logo = getFormLogo(definition.id);
          return (
            <button
              type="button"
              className={`training-option-card${selected ? " is-selected" : ""}${uncovered ? " is-uncovered" : ""}`}
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(definition.id)}
              key={definition.id}
            >
              <img
                src={logo.assetPath}
                alt=""
                aria-hidden="true"
              />
              <span className="training-option-copy">
                <strong>{definition.longName}</strong>
                <small>{definition.bonusLabel ?? (
                  definition.branch ? "Specializzazione d'arma" : "Percorso lineare"
                )}</small>
                <span className="training-option-meta">
                  <strong>{costLabel}</strong>
                  {contextLabel ? <small>{contextLabel}</small> : null}
                  {uncovered ? <small className="training-option-coverage">Forma non coperta</small> : null}
                </span>
              </span>
              <span className="training-option-radio" aria-hidden="true"><i /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
