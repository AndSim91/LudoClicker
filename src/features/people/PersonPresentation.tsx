import { getFormLogo } from "../../content/formLogos";
import { getFormDefinition, type FormDefinition } from "../../content/forms";
import type { FormId, PersonRarity } from "../../game/types";

export function FormLogoStrip({
  forms,
  instructorForms = [],
  showLabels = true,
}: {
  forms: FormId[];
  instructorForms?: readonly FormId[];
  showLabels?: boolean;
}) {
  const entries = forms.map((formId) => {
    const definition = getFormDefinition(formId);
    const logo = getFormLogo(formId);
    const label = [definition?.title ?? formId, definition?.branch].filter(Boolean).join(" / ");
    return { formId, label, logo, instructorCertified: instructorForms.includes(formId) };
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
      ) : entries.map(({ formId, label, logo, instructorCertified }) => (
        <span
          className={`form-logo-item ${showLabels ? "" : "compact"} ${logo.source === "generated" ? "generated" : ""} ${instructorCertified ? "instructor-certified" : ""}`}
          key={formId}
          title={`${label}${instructorCertified ? " · Attestato da istruttore" : ""}`}
        >
          <span className="form-logo-mark">
            <img
              src={logo.assetPath}
              alt={`${label} — emblema ${logo.source === "official" ? "ufficiale" : "generato"}`}
            />
            {instructorCertified ? (
              <span className="form-instructor-crown" aria-hidden="true">♛</span>
            ) : null}
          </span>
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
  secretLegendary = false,
}: {
  displayName: string;
  rarity: PersonRarity;
  label?: string;
  secretLegendary?: boolean;
}) {
  return (
    <strong className={`rarity-name rarity-${secretLegendary ? "secret-legendary" : rarity}`} data-label={label}>
      {displayName}
      {secretLegendary
        ? <span className="special-collaborator-badge secret">Segreto</span>
        : rarity === "legendary" ? <span className="special-collaborator-badge">VIP</span> : null}
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
