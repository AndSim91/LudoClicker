import { useEffect, useState } from "react";
import { Icon } from "../../components/common/Icon";
import {
  getAvailableForms,
  getCollaboratorBonusSummary,
  getFormDefinition,
  getInstructorFormCost,
  getInstructorQualificationCost,
  isInstructorForm,
  type FormStudent,
} from "../../content/forms";
import { PERSON_RARITIES } from "../../content/rarities";
import { getSchoolYear, isSummerBreak } from "../../game/calendar";
import { getEnrollmentChance, getMemberAnnualDepartureChance } from "../../game/formulas";
import {
  selectInstructorCapacity,
  selectInstructorTeachingCount,
} from "../../game/selectors";
import type {
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

  return (
    <main className="overview-view people-view">
      <header><Icon name="people" /><div><h1>Iscritti</h1><p>Iscritti e Collaboratori delle Onde</p></div></header>
      <div className="people-tabs" role="tablist" aria-label="Categorie iscritti">
        <TabButton active={tab === "members"} onClick={() => setTab("members")} label={`Iscritti (${members.length})`} />
        <TabButton active={tab === "collaborators"} onClick={() => setTab("collaborators")} label={`Collaboratori (${state.collaborators.length})`} />
      </div>
      <RarityOverview state={state} />

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
                  <small className="form-bonus-summary">{bonusSummary || "Nessun bonus d'arma attivo"}</small>
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
                  : <AutomaticTrainingStatus displayName={collaborator.displayName} student={collaborator} state={state} />}
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
                <PersonName displayName={`${contact.firstName} ${contact.lastName}`} rarity={contact.rarity} />
                <span><span className={`rarity-address rarity-${contact.rarity}`}>{contact.email}</span></span>
                <span>{formatFormPath(contact.forms)}</span>
                <span className="member-status">
                  <span>{isCollaborator ? "Collaboratore" : statusLabels[contact.status]}</span>
                  <small>{isCollaborator || contact.rarity === "legendary"
                    ? "Non soggetto ad abbandono"
                    : contact.lastFormTrainingYear === getSchoolYear(state.school.currentMonth)
                      ? "Seguito quest'anno · nessun rischio"
                      : `Rischio annuo se ignorato: ${percent.format(getMemberAnnualDepartureChance(contact.forms))}`}</small>
                </span>
                <div className="member-training-cell">
                  {isCollaborator
                    ? <small>Gestisci dal pannello Collaboratori</small>
                    : <AutomaticTrainingStatus displayName={`${contact.firstName} ${contact.lastName}`} student={contact} state={state} />}
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

function PersonName({ displayName, rarity }: { displayName: string; rarity: PersonRarity }) {
  return <strong className={`rarity-name rarity-${rarity}`}>{displayName}{rarity === "legendary" ? <span className="special-collaborator-badge">VIP</span> : null}</strong>;
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" role="tab" aria-selected={active} className={active ? "active" : ""} onClick={onClick}>{label}</button>;
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
  const collaborator = state.collaborators.find((candidate) => candidate.id === personId);
  const busyInstructorIds = selectBusyInstructorIds(state);
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
  if (student.lastFormTrainingYear === currentYear) {
    return <div className="training-locked"><span>Limite annuale raggiunto</span><strong>Prossima evoluzione a settembre · anno scolastico {currentYear + 1}</strong></div>;
  }

  const academicallyAvailable = getAvailableForms(student, currentYear);
  const available = academicallyAvailable.filter((definition) => {
    if (!isInstructorForm(definition.id)) return true;
    if (collaborator?.assignment === "instructor") {
      return !busyInstructorIds.has(collaborator.id);
    }
    return Boolean(selectAvailableInstructor(state, definition.id, personId));
  });
  const selected = selectedFormId ? getFormDefinition(selectedFormId) : undefined;
  if (academicallyAvailable.length === 0) {
    return <div className="training-locked"><span>Formazione</span><strong>Percorso completato alla Forma 7</strong></div>;
  }
  if (available.length === 0) {
    return <div className="training-locked"><span>Istruttore non disponibile</span><strong>Serve un Istruttore libero e attestato per questa Forma</strong></div>;
  }
  const selectedCost = selected && collaborator?.assignment === "instructor" && isInstructorForm(selected.id)
    ? getInstructorFormCost(selected.cost)
    : selected?.cost ?? 0;
  return <div className="training-control"><label><span>Prossima formazione · anno scolastico {currentYear}</span><select aria-label={`Formazione per ${displayName}`} value={selectedFormId} onChange={(event) => setSelectedFormId(event.target.value as FormId)}><option value="">Seleziona</option>{available.map((definition) => {
    const cost = collaborator?.assignment === "instructor" && isInstructorForm(definition.id)
      ? getInstructorFormCost(definition.cost)
      : definition.cost;
    return <option key={definition.id} value={definition.id}>{definition.title}{definition.branch ? ` — ${definition.branch}` : ""}{definition.bonusLabel ? ` · ${definition.bonusLabel}` : ""} · {euro.format(cost)}{cost > definition.cost ? " · attestato incluso" : ""}</option>;
  })}</select></label><button type="button" disabled={!selected || state.school.euros < selectedCost} onClick={() => selected && onStartTraining(personId, selected.id)}>{selected && state.school.euros < selectedCost ? `Servono ${euro.format(selectedCost)}` : "Avvia"}</button></div>;
}
