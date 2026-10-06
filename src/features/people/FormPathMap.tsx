import { getFormLogo } from "../../content/formLogos";
import { BRANCH_FORM_IDS, FORM_BRANCHES, getFormDefinition } from "../../content/forms";
import { isCourseXUnlocked } from "../../content/upgrades";
import { useOptionalGameState } from "../../game/GameStateContext";
import type { FormBranch, FormId } from "../../game/types";
import { useOutlookTheme } from "../../shared/useOutlookTheme";
import { FormLogoStrip } from "./PersonPresentation";

const BRANCH_MARKS: Record<FormBranch, { letter: string; className: string }> = {
  "Spada Lunga": { letter: "L", className: "is-long" },
  Staffa: { letter: "S", className: "is-staff" },
  "Doppia spada corta": { letter: "D", className: "is-double" },
};

/**
 * Percorso delle Forme in Modalità Onde (concept G2, 06/10): the whole
 * curriculum is always drawn, the trunk, one lane per weapon, then F6 and F7.
 * Learned Forms light up, the rest stay in shadow. A Form the person may
 * teach gets a notch underneath (concept B2, 06/10): gold for the instructor
 * certificate, lilac for the Technician qualification, no crowns.
 */
export function FormPathMap({
  forms,
  instructorForms = [],
  technicianForms = [],
}: {
  forms: readonly FormId[];
  instructorForms?: readonly FormId[];
  technicianForms?: readonly FormId[];
}) {
  const state = useOptionalGameState();
  const courseX = state ? isCourseXUnlocked(state.upgrades) : true;
  const learned = new Set(forms);
  const trunk: FormId[] = courseX
    ? ["form-1", "course-x", "form-2", "course-y"]
    : ["form-1", "form-2", "course-y"];
  const node = (formId: FormId) => {
    const definition = getFormDefinition(formId);
    const name = definition?.longName ?? formId;
    const lit = learned.has(formId);
    const technician = technicianForms.includes(formId);
    const instructor = instructorForms.includes(formId);
    return (
      <span
        key={formId}
        className={`form-path-node${lit ? " is-learned" : ""}${formId === "course-y" ? " is-course-y" : ""}${
          lit && technician ? " is-technician" : lit && instructor ? " is-instructor" : ""}`}
        title={`${name}${lit ? "" : " · da fare"}${technician ? " · Qualifica da Tecnico" : instructor ? " · Attestato da istruttore" : ""}`}
      >
        <img src={getFormLogo(formId).assetPath} alt="" />
      </span>
    );
  };
  const tail: FormId[] = ["form-6", "form-7"];
  const learnedNames = [...trunk, ...FORM_BRANCHES.flatMap((branch) => BRANCH_FORM_IDS[branch]), ...tail]
    .filter((formId) => learned.has(formId))
    .map((formId) => getFormDefinition(formId)?.longName ?? formId);

  return (
    <div
      className="form-path-map"
      aria-label={learnedNames.length > 0
        ? `Forme conosciute: ${learnedNames.join(", ")}`
        : "Forme conosciute: nessuna"}
    >
      <span className="form-path-segment">{trunk.map(node)}</span>
      <span className="form-path-lanes">
        {FORM_BRANCHES.map((branch) => {
          const ids = BRANCH_FORM_IDS[branch];
          const mark = BRANCH_MARKS[branch];
          const active = ids.some((formId) => learned.has(formId));
          return (
            <span key={branch} className={`form-path-lane ${mark.className}${active ? " is-active" : ""}`}>
              <span className="form-path-lane-mark" title={branch} aria-hidden="true">{mark.letter}</span>
              {ids.map(node)}
            </span>
          );
        })}
      </span>
      <span className="form-path-segment">{tail.map(node)}</span>
    </div>
  );
}

/** Staff rows: the map in Onde, the logos Outlook already had. */
export function StaffForms({
  forms,
  instructorForms,
  technicianForms,
  stripClassName,
  showLabels,
}: {
  forms: FormId[];
  instructorForms?: readonly FormId[];
  technicianForms?: readonly FormId[];
  stripClassName?: string;
  showLabels?: boolean;
}) {
  const outlook = useOutlookTheme();
  return outlook ? (
    <FormLogoStrip
      className={stripClassName}
      forms={forms}
      instructorForms={instructorForms}
      technicianForms={technicianForms}
      showLabels={showLabels}
    />
  ) : (
    <FormPathMap forms={forms} instructorForms={instructorForms} technicianForms={technicianForms} />
  );
}
