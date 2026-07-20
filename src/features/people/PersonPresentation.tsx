import { getFormLogo } from "../../content/formLogos";
import { getFormDefinition, type FormDefinition } from "../../content/forms";
import type { FormId, PersonRarity } from "../../game/types";
import { getRarityClassName } from "../../shared/rarityPresentation";

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
    return {
      formId,
      longName: definition?.longName ?? formId,
      shortName: definition?.shortName ?? formId,
      logo,
      instructorCertified: instructorForms.includes(formId),
    };
  });

  return (
    <div
      className="form-logo-strip"
      aria-label={entries.length > 0
        ? `Forme conosciute: ${entries.map(({ longName }) => longName).join(", ")}`
        : "Forme conosciute: nessuna"}
    >
      {entries.length === 0 ? (
        <span className="form-logo-empty">Nessuna forma completata</span>
      ) : entries.map(({ formId, longName, shortName, logo, instructorCertified }) => (
        <span
          className={`form-logo-item ${showLabels ? "" : "compact"} ${logo.source === "generated" ? "generated" : ""} ${instructorCertified ? "instructor-certified" : ""}`}
          key={formId}
          title={`${longName}${instructorCertified ? " · Attestato da istruttore" : ""}`}
        >
          <span className="form-logo-mark">
            <img
              src={logo.assetPath}
              alt={`${longName} — emblema ${logo.source === "official" ? "ufficiale" : "generato"}`}
            />
            {instructorCertified ? (
              <span className="form-instructor-crown" aria-hidden="true">♛</span>
            ) : null}
          </span>
          {showLabels ? <span>{shortName}</span> : null}
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
    <strong className={`rarity-name ${getRarityClassName(rarity, secretLegendary)}`} data-label={label}>
      {displayName}
      {secretLegendary
        ? <span className="special-collaborator-badge secret">Segreto</span>
        : null}
    </strong>
  );
}

export function TrainingFormPreview({ definition }: { definition: FormDefinition }) {
  const logo = getFormLogo(definition.id);
  return (
    <div className="training-form-preview">
      <img
        src={logo.assetPath}
        alt={`${definition.longName} — emblema ${logo.source === "official" ? "ufficiale" : "generato"}`}
      />
      <span>
        <strong>{definition.longName}</strong>
        <small>{definition.branch ? "Specializzazione d'arma" : "Percorso lineare"}</small>
      </span>
    </div>
  );
}
