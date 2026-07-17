import { getFormLogo } from "../../content/formLogos";
import { getFormDefinition, type FormDefinition } from "../../content/forms";
import type { FormId, PersonRarity } from "../../game/types";

export function FormLogoStrip({
  forms,
  showLabels = true,
}: {
  forms: FormId[];
  showLabels?: boolean;
}) {
  const entries = forms.map((formId) => {
    const definition = getFormDefinition(formId);
    const logo = getFormLogo(formId);
    const label = [definition?.title ?? formId, definition?.branch].filter(Boolean).join(" / ");
    return { formId, label, logo };
  });

  return (
    <div
      className="form-logo-strip"
      aria-label={entries.length > 0
        ? `Forme conosciute: ${entries.map(({ label }) => label).join(", ")}`
        : "Forme conosciute: nessuna"}
    >
      {entries.length === 0 ? (
        <span className="form-logo-empty">Nessuna forma completata</span>
      ) : entries.map(({ formId, label, logo }) => (
        <span
          className={`form-logo-item ${showLabels ? "" : "compact"} ${logo.source === "generated" ? "generated" : ""}`}
          key={formId}
          title={label}
        >
          <img
            src={logo.assetPath}
            alt={`${label} — emblema ${logo.source === "official" ? "ufficiale" : "generato"}`}
          />
          {showLabels ? <span>{label}</span> : null}
        </span>
      ))}
    </div>
  );
}

export function PersonName({
  displayName,
  rarity,
  label,
}: {
  displayName: string;
  rarity: PersonRarity;
  label?: string;
}) {
  return (
    <strong className={`rarity-name rarity-${rarity}`} data-label={label}>
      {displayName}
      {rarity === "legendary" ? <span className="special-collaborator-badge">VIP</span> : null}
    </strong>
  );
}

export function TrainingFormPreview({ definition }: { definition: FormDefinition }) {
  const logo = getFormLogo(definition.id);
  return (
    <div className="training-form-preview">
      <img
        src={logo.assetPath}
        alt={`${definition.title} — emblema ${logo.source === "official" ? "ufficiale" : "generato"}`}
      />
      <span>
        <strong>{definition.title}</strong>
        <small>{definition.branch ?? "Percorso lineare"}</small>
      </span>
    </div>
  );
}
