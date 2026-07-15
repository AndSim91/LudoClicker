import { useEffect, useState } from "react";
import { Icon } from "../../components/common/Icon";
import {
  getAvailableForms,
  getCollaboratorBonusSummary,
  getFormDefinition,
  getInstructorFormCost,
  getInstructorQualificationCost,
  getStudentFormCost,
  isInstructorForm,
  type FormDefinition,
  type FormStudent,
} from "../../content/forms";
import {
  COLLABORATOR_MASTERY_ROLES,
  COLLABORATOR_MASTERY_ROLE_LABELS,
  createInitialCollaboratorMastery,
  getCollaboratorMasteryProgress,
} from "../../content/mastery";
import { PERSON_RARITIES } from "../../content/rarities";
import { getFormLogo } from "../../content/formLogos";
import { getSchoolYear, isSummerBreak } from "../../game/calendar";
import { getEnrollmentChance, getMemberAnnualDepartureChance } from "../../game/formulas";
import {
  selectAvailableInstructor,
  selectInstructorCapacity,
  selectInstructorTeachingCount,
} from "../../game/selectors";
import type {
  Collaborator,
  CollaboratorAssignment,
  Contact,
  FormId,
  GameState,
  PersonRarity,
} from "../../game/types";

type PeopleTab = "members" | "collaborators";

const assignmentLabels: Record<Exclude<CollaboratorAssignment, null>, string> = {
  writing: "Redazione",
  events: "Eventi",
  lessons: "Lezioni in palestra",
  social: "Social",
  equipment: "Attrezzatura",
  instructor: "Istruttore",
};

const statusLabels: Record<Contact["status"], string> = {
  available: "Disponibile",
  writing: "In scrittura",
  invited: "Invitato",
  trialScheduled: "Prova prenotata",
  enrolled: "Iscritto",
  departed: "Ha lasciato la scuola",
  lost: "Perso",
};

const percent = new Intl.NumberFormat("it-IT", {
  style: "percent",
  maximumFractionDigits: 1,
});
const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export function PeopleView({
  state,
  onAssign,
  onStartTraining,
  onToggleInstructorAutomation,
}: {
  state: GameState;
  onAssign: (collaboratorId: string, assignment: CollaboratorAssignment) => void;
  onStartTraining: (personId: string, formId: FormId) => void;
  onToggleInstructorAutomation?: (collaboratorId: string, enabled: boolean) => void;
}) {
  const [tab, setTab] = useState<PeopleTab>("members");
  const members = state.contacts.filter((contact) => contact.status === "enrolled");
  const collaboratorContactIds = new Set(
    state.collaborators.map((collaborator) => collaborator.contactId),
  );
  const showCollaborators = state.unlocks.collaborators || state.collaborators.length > 0;
  const showRarityOverview =
    state.statistics.emailsSent >= 10 ||
    members.some((contact) => contact.rarity !== "common") ||
    showCollaborators;

  return (
    <main className="overview-view people-view">
      <header><Icon name="people" /><div><h1>Iscritti</h1><p>Iscritti e Collaboratori delle Onde</p></div></header>
      <div className="people-tabs" role="tablist" aria-label="Categorie iscritti">
        <TabButton active={tab === "members"} onClick={() => setTab("members")} label={`Iscritti (${members.length})`} />
        {showCollaborators ? <TabButton active={tab === "collaborators"} onClick={() => setTab("collaborators")} label={`Collaboratori (${state.collaborators.length})`} /> : null}
      </div>
      {showRarityOverview ? <RarityOverview state={state} /> : null}

      {tab === "collaborators" ? (
        <section className="collaborator-list" aria-label="Collaboratori delle Onde">
          {state.collaborators.length === 0 ? (
            <div className="people-empty"><Icon name="contact" /><strong>Nessun collaboratore disponibile</strong><span>I Rari diventano collaboratori dopo la Forma 7; i Leggendari lo sono dall'iscrizione.</span></div>
          ) : state.collaborators.map((collaborator) => {
            const contact = state.contacts.find((candidate) => candidate.id === collaborator.contactId);
            const bonusSummary = getCollaboratorBonusSummary(collaborator);
            return (
              <article className="collaborator-row" key={collaborator.id}>
                <div className={`person-avatar rarity-${collaborator.rarity}`}>{collaborator.displayName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
                <div className="collaborator-copy">
                  <PersonName displayName={collaborator.displayName} rarity={collaborator.rarity} />
                  <span className={`rarity-address rarity-${collaborator.rarity}`}>{contact?.email}</span>
                  <small>{collaborator.rarity === "legendary" ? "Livello Leggendario · Potere VIP ×2" : "Livello Raro · Forma 7 completata"}</small>
                  <FormLogoStrip forms={collaborator.forms} />
                  <small className="form-bonus-summary">{bonusSummary || "Nessun bonus d'arma attivo"}</small>
                  <CollaboratorMasterySummary collaborator={collaborator} />
                  {collaborator.assignment === "instructor" || collaborator.instructorForms.length > 0
                    ? <small>Attestati da istruttore: {collaborator.instructorForms.length}</small>
                    : null}
                </div>
                <label><span>Assegnazione</span><select aria-label="Assegnazione" value={collaborator.assignment ?? ""} onChange={(event) => onAssign(collaborator.id, (event.target.value || null) as CollaboratorAssignment)}><option value="">Non assegnato</option>{Object.entries(assignmentLabels).map(([value, label]) => {
                  const disabled = value === "social" && !state.unlocks.social;
                  const suffix = value === "social" && !state.unlocks.social
                    ? " — si sblocca con 10 iscritti"
                    : "";
                  return <option value={value} key={value} disabled={disabled}>{label}{suffix}</option>;
                })}</select></label>
                {collaborator.assignment === "instructor"
                  ? <InstructorPanel collaborator={collaborator} state={state} onStartTraining={onStartTraining} onToggle={onToggleInstructorAutomation} />
                  : <TrainingControl personId={collaborator.id} displayName={collaborator.displayName} student={collaborator} state={state} onStartTraining={onStartTraining} />}
              </article>
            );
          })}
        </section>
      ) : (
        <section className="people-table member-development-list" aria-label="Iscritti">
          <div className="people-row people-head member-row"><span>Nome</span><span>Indirizzo</span><span>Percorso</span><span>Stato</span><span>Prossima evoluzione</span></div>
          {members.map((contact) => {
            const isCollaborator = collaboratorContactIds.has(contact.id);
            return (
              <div className="people-row member-row" key={contact.id}>
                <PersonName displayName={`${contact.firstName} ${contact.lastName}`} rarity={contact.rarity} label="Nome" />
                <span data-label="Indirizzo"><span className={`rarity-address rarity-${contact.rarity}`}>{contact.email}</span></span>
                <div className="member-path" data-label="Percorso">
                  <strong>{formatFormPath(contact.forms)}</strong>
                  <FormLogoStrip forms={contact.forms} showLabels={false} />
                </div>
                <span className="member-status" data-label="Stato">
                  <span>{isCollaborator ? "Collaboratore" : statusLabels[contact.status]}</span>
                  <small>{isCollaborator || contact.rarity === "legendary"
                    ? "Non soggetto ad abbandono"
                    : contact.lastFormTrainingYear === getSchoolYear(state.school.currentMonth)
                      ? "Nessun rischio"
                      : getMemberDepartureRiskLabel(contact.forms)}</small>
                </span>
                <div className="member-training-cell" data-label="Prossima evoluzione">
                  {isCollaborator
                    ? <small>Gestisci dal pannello Collaboratori</small>
                    : <TrainingControl
                        personId={contact.id}
                        displayName={`${contact.firstName} ${contact.lastName}`}
                        student={contact}
                        state={state}
                        onStartTraining={onStartTraining}
                      />}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}

function formatFormPath(forms: FormId[]): string {
  if (forms.length === 0) return "Da iniziare · Forma 1";
  const latest = getFormDefinition(forms.at(-1)!);
  return `${latest?.title ?? forms.at(-1)}${latest?.branch ? ` · ${latest.branch}` : ""}`;
}

function getMemberDepartureRiskLabel(forms: FormId[]): string {
  const annualDepartureChance = getMemberAnnualDepartureChance(forms);
  if (annualDepartureChance >= 2 / 3) return "Rischio alto";
  if (annualDepartureChance >= 1 / 3) return "Rischio medio";
  return "Rischio basso";
}

function FormLogoStrip({ forms, showLabels = true }: { forms: FormId[]; showLabels?: boolean }) {
  const entries = forms.map((formId) => {
    const definition = getFormDefinition(formId);
    const logo = getFormLogo(formId);
    const label = [definition?.title ?? formId, definition?.branch].filter(Boolean).join(" / ");
    return { formId, label, logo };
  });

  return (
    <div
      className="form-logo-strip"
      aria-label={entries.length > 0 ? `Forme conosciute: ${entries.map(({ label }) => label).join(", ")}` : "Forme conosciute: nessuna"}
    >
      {entries.length === 0 ? (
        <span className="form-logo-empty">Nessuna forma completata</span>
      ) : entries.map(({ formId, label, logo }) => (
        <span className={`form-logo-item ${showLabels ? "" : "compact"} ${logo.source === "generated" ? "generated" : ""}`} key={formId} title={label}>
          <img src={logo.assetPath} alt={`${label} — emblema ${logo.source === "official" ? "ufficiale" : "generato"}`} />
          {showLabels ? <span>{label}</span> : null}
        </span>
      ))}
    </div>
  );
}

function CollaboratorMasterySummary({ collaborator }: { collaborator: Collaborator }) {
  const mastery = collaborator.mastery ?? createInitialCollaboratorMastery();
  return (
    <div className="collaborator-mastery" aria-label={`Maestrie di ${collaborator.displayName}`}>
      <span>Maestrie operative</span>
      <div className="mastery-grid">
        {COLLABORATOR_MASTERY_ROLES.map((role) => {
          const progress = getCollaboratorMasteryProgress(mastery[role]);
          const active = collaborator.assignment === role;
          const xpLabel = progress.nextXp === undefined
            ? `${progress.currentXp} XP`
            : `${progress.currentXp}/${progress.nextXp} XP`;
          return (
            <div
              className={active ? "mastery-entry active" : "mastery-entry"}
              key={role}
              title={`${COLLABORATOR_MASTERY_ROLE_LABELS[role]}: ${progress.definition.name}, ${xpLabel}`}
            >
              <strong>{progress.definition.name}</strong>
              <small>{COLLABORATOR_MASTERY_ROLE_LABELS[role]} · +{Math.round(progress.definition.multiplier * 100)}% · {xpLabel}</small>
              <div className="mastery-track" aria-hidden="true"><span style={{ width: `${progress.progress}%` }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RarityOverview({ state }: { state: GameState }) {
  const common = PERSON_RARITIES.common;
  const rare = PERSON_RARITIES.rare;
  const legendary = PERSON_RARITIES.legendary;
  const commonEnrollmentChance = getEnrollmentChance(state, "common");
  const rareEnrollmentChance = getEnrollmentChance(state, "rare");
  const legendaryEnrollmentChance = getEnrollmentChance(state, "legendary");
  return (
    <section className="rarity-overview" aria-label="Sistema di rarità">
      <div><strong>Probabilità e rarità</strong><span>Valori base ed efficacia attuale con i tuoi potenziamenti</span></div>
      <article><strong>Comune</strong><span>Email lasciata: {percent.format(common.emailShareChance)}</span><span>Iscrizione: {percent.format(common.baseEnrollmentChance)} base · {percent.format(commonEnrollmentChance)} attuale</span><span>Può arrivare alla Forma 7, ma non diventa collaboratore</span></article>
      <article className="rare"><strong>Raro</strong><span>Comparsa: {percent.format(rare.queueAppearanceChance)} dei contatti non leggendari</span><span>Iscrizione: {percent.format(rare.baseEnrollmentChance)} base · {percent.format(rareEnrollmentChance)} attuale</span><span>Diventa collaboratore completando la Forma 7</span></article>
      <article className="legendary"><strong>Leggendario</strong><span>Comparsa: {percent.format(legendary.queueAppearanceChance)} dalla 10ª email</span><span>Iscrizione: {percent.format(legendary.baseEnrollmentChance)} base · {percent.format(legendaryEnrollmentChance)} attuale · Andrea 100%</span><span>Collaboratore dall'iscrizione · potere VIP ×2 · non abbandona la scuola</span></article>
    </section>
  );
}

function PersonName({ displayName, rarity, label }: { displayName: string; rarity: PersonRarity; label?: string }) {
  return <strong className={`rarity-name rarity-${rarity}`} data-label={label}>{displayName}{rarity === "legendary" ? <span className="special-collaborator-badge">VIP</span> : null}</strong>;
}

function TrainingFormPreview({ definition }: { definition: FormDefinition }) {
  const logo = getFormLogo(definition.id);
  return (
    <div className="training-form-preview">
      <img src={logo.assetPath} alt={`${definition.title} — emblema ${logo.source === "official" ? "ufficiale" : "generato"}`} />
      <span>
        <strong>{definition.title}</strong>
        <small>{definition.branch ?? "Percorso lineare"}</small>
      </span>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" role="tab" aria-selected={active} className={active ? "active" : ""} onClick={onClick}>{label}</button>;
}

function InstructorPanel({
  collaborator,
  state,
  onStartTraining,
  onToggle,
}: {
  collaborator: Collaborator;
  state: GameState;
  onStartTraining: (personId: string, formId: FormId) => void;
  onToggle?: (collaboratorId: string, enabled: boolean) => void;
}) {
  const teachingCount = selectInstructorTeachingCount(state, collaborator.id);
  const capacity = selectInstructorCapacity(state);
  const enabled = collaborator.autoTeachingEnabled !== false;
  const preferences = collaborator.formBranchPreferences?.join(", ") || "non ancora sviluppate";
  return <div className="instructor-panel">
    <div className="instructor-panel-heading">
      <span><strong>Istruttore stile Tiamat</strong><small>{teachingCount}/{capacity} allievi in contemporanea</small></span>
      <label className="instructor-toggle"><input type="checkbox" checked={enabled} onChange={(event) => onToggle?.(collaborator.id, event.target.checked)} /> Insegnamento automatico</label>
    </div>
    <small>Preferenze d'arma: {preferences}</small>
    <small>{enabled ? (teachingCount > 0 ? "Le lezioni in corso termineranno regolarmente." : "In attesa del prossimo allievo compatibile.") : "Pausa: non verranno avviate nuove lezioni."}</small>
    <TrainingControl personId={collaborator.id} displayName={collaborator.displayName} student={collaborator} state={state} onStartTraining={onStartTraining} />
  </div>;
}

function TrainingControl({
  personId,
  displayName,
  student,
  state,
  onStartTraining,
}: {
  personId: string;
  displayName: string;
  student: FormStudent;
  state: GameState;
  onStartTraining: (personId: string, formId: FormId) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [selectedFormId, setSelectedFormId] = useState<FormId | "">("");
  const hasTraining = Boolean(student.training);
  const currentYear = getSchoolYear(state.school.currentMonth);
  const hasTrainedThisYear = student.lastFormTrainingYear === currentYear;
  const collaborator = state.collaborators.find((candidate) => candidate.id === personId);
  useEffect(() => {
    if (!hasTraining) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [hasTraining]);

  if (!state.unlocks.forms) {
    return <div className="training-locked"><span>Formazione</span><strong>Disponibile dal primo iscritto</strong></div>;
  }
  if (student.training) {
    const definition = getFormDefinition(student.training.formId);
    const instructor = student.training.instructorId
      ? state.collaborators.find((candidate) => candidate.id === student.training?.instructorId)
      : undefined;
    const duration = student.training.completesAt - student.training.startedAt;
    const progress = duration <= 0 ? 100 : Math.min(100, Math.max(0, Math.round(((now - student.training.startedAt) / duration) * 100)));
    return <div className="training-progress"><span>{definition?.title}{definition?.branch ? ` — ${definition.branch}` : ""}{instructor ? ` · con ${instructor.displayName}` : ""}{student.training.includesInstructorCertification ? " · attestato incluso" : ""}</span><strong>{progress}%</strong><div role="progressbar" aria-label={`Formazione di ${displayName}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div></div>;
  }
  if (isSummerBreak(state.school.currentMonth)) {
    return <div className="training-locked"><span>Pausa estiva</span><strong>Le Forme riprendono a settembre</strong></div>;
  }
  const qualificationDefinitions = collaborator?.assignment === "instructor"
    ? collaborator.forms.flatMap((formId) => {
        const definition = getFormDefinition(formId);
        return definition && isInstructorForm(formId) &&
            !collaborator.instructorForms.includes(formId)
          ? [definition]
          : [];
      })
    : [];
  const branchCapacity = collaborator?.assignment === "instructor"
    ? Math.min(3, 1 + state.upgrades["instructor-versatility"])
    : undefined;
  const learnedBranches = new Set(collaborator?.forms.flatMap((formId) => {
    const branch = getFormDefinition(formId)?.branch;
    return branch ? [branch] : [];
  }) ?? []);
  const newForms = hasTrainedThisYear
    ? []
    : getAvailableForms(student, currentYear, branchCapacity, collaborator?.assignment !== "instructor")
        .filter((definition) =>
          !definition.branch ||
          learnedBranches.size > 0 ||
          !collaborator?.formBranchPreferences?.length ||
          collaborator.formBranchPreferences.includes(definition.branch)
        );
  const academicallyAvailable = [...qualificationDefinitions, ...newForms];
  const available = academicallyAvailable.filter((definition) => {
    if (qualificationDefinitions.some((candidate) => candidate.id === definition.id)) return true;
    if (collaborator?.assignment === "instructor") {
      return selectInstructorTeachingCount(state, collaborator.id) === 0;
    }
    return true;
  });
  if (academicallyAvailable.length === 0) {
    if (hasTrainedThisYear) {
      return <div className="training-locked"><strong>Hai già completato la formazione quest'anno</strong></div>;
    }
    const latestForm = getFormDefinition(student.forms.at(-1)!);
    return <div className="training-locked"><span>Formazione</span><strong>Percorso completato alla {latestForm?.title ?? "ultima Forma"}</strong></div>;
  }
  if (available.length === 0) {
    return <div className="training-locked"><span>Istruttore non disponibile</span><strong>Serve un Istruttore libero e attestato per questa Forma</strong></div>;
  }
  const needsSelection = qualificationDefinitions.length > 0 ||
    (student.forms.includes("course-y") && available.length > 1);
  const selected = needsSelection
    ? available.find((definition) => definition.id === selectedFormId)
    : available[0];
  const selectedIsQualification = Boolean(
    selected && qualificationDefinitions.some((definition) => definition.id === selected.id),
  );
  const selectedCost = selectedIsQualification && selected
    ? getInstructorQualificationCost(selected.cost)
    : selected && collaborator?.assignment === "instructor" && isInstructorForm(selected.id)
      ? getInstructorFormCost(selected.cost)
      : selected && collaborator?.assignment !== "instructor" && selectAvailableInstructor(state, selected.id, personId)
        ? getStudentFormCost(selected.cost)
      : selected?.cost ?? 0;
  const actionLabel = !selected
    ? "Seleziona una Forma"
    : state.school.euros < selectedCost
      ? `Servono ${euro.format(selectedCost)}`
      : selectedIsQualification
        ? "Ottieni qualifica"
        : `Paga e avvia · ${euro.format(selectedCost)}`;
  return (
    <div className="training-control">
      <div className="training-form-choice">
        {needsSelection ? (
          <label>
            <span>{qualificationDefinitions.length > 0 ? "Scegli la prossima formazione" : "Scegli la specializzazione d'arma"}</span>
            <select aria-label={`Formazione per ${displayName}`} value={selectedFormId} onChange={(event) => setSelectedFormId(event.target.value as FormId)}>
              <option value="">Seleziona</option>
              {available.map((definition) => {
                const qualification = qualificationDefinitions.some((candidate) => candidate.id === definition.id);
                const cost = qualification
                  ? getInstructorQualificationCost(definition.cost)
                  : collaborator?.assignment === "instructor" && isInstructorForm(definition.id)
                    ? getInstructorFormCost(definition.cost)
                    : collaborator?.assignment !== "instructor" && selectAvailableInstructor(state, definition.id, personId)
                      ? getStudentFormCost(definition.cost)
                      : definition.cost;
                const hasInstructorDiscount = !qualification && collaborator?.assignment !== "instructor" && cost < definition.cost;
                return <option key={definition.id} value={definition.id}>{qualification ? "Qualifica · " : ""}{definition.title}{definition.branch ? ` — ${definition.branch}` : ""}{definition.bonusLabel ? ` · ${definition.bonusLabel}` : ""} · {euro.format(cost)}{hasInstructorDiscount ? " · sconto Istruttore" : ""}{!qualification && cost > definition.cost ? " · qualifica inclusa" : ""}</option>;
              })}
            </select>
          </label>
        ) : (
          <span className="training-form-label">Prossima formazione · anno scolastico {currentYear}</span>
        )}
        {selected ? <TrainingFormPreview definition={selected} /> : null}
      </div>
      <button type="button" disabled={!selected || state.school.euros < selectedCost} onClick={() => selected && onStartTraining(personId, selected.id)}>{actionLabel}</button>
    </div>
  );
}
