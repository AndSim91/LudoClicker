import { useEffect, useState } from "react";
import { Icon } from "../../components/common/Icon";
import {
  getAvailableForms,
  getCollaboratorBonusSummary,
  getFormDefinition,
  type FormStudent,
} from "../../content/forms";
import { PERSON_RARITIES } from "../../content/rarities";
import { getGameYear } from "../../game/calendar";
import { getEnrollmentChance } from "../../game/formulas";
import type {
  CollaboratorAssignment,
  Contact,
  FormId,
  GameState,
  PersonRarity,
} from "../../game/types";

type PeopleTab = "prospects" | "members" | "collaborators";

const assignmentLabels: Record<Exclude<CollaboratorAssignment, null>, string> = {
  writing: "Redazione",
  events: "Eventi",
  lessons: "Lezioni in palestra",
  social: "Social",
  equipment: "Attrezzatura",
};

const statusLabels: Record<Contact["status"], string> = {
  available: "Disponibile",
  writing: "In scrittura",
  invited: "Invitato",
  trialScheduled: "Prova prenotata",
  enrolled: "Iscritto",
  lost: "Perso",
};

const percent = new Intl.NumberFormat("it-IT", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function PeopleView({
  state,
  onAssign,
  onStartTraining,
}: {
  state: GameState;
  onAssign: (collaboratorId: string, assignment: CollaboratorAssignment) => void;
  onStartTraining: (personId: string, formId: FormId) => void;
}) {
  const [tab, setTab] = useState<PeopleTab>("prospects");
  const prospects = state.contacts.filter(
    (contact) => contact.status !== "enrolled" && contact.status !== "lost",
  );
  const members = state.contacts.filter((contact) => contact.status === "enrolled");
  const collaboratorContactIds = new Set(
    state.collaborators.map((collaborator) => collaborator.contactId),
  );

  return (
    <main className="overview-view people-view">
      <header><Icon name="people" /><div><h1>Persone</h1><p>Contatti, iscritti e Collaboratori delle Onde</p></div></header>
      <div className="people-tabs" role="tablist" aria-label="Categorie persone">
        <TabButton active={tab === "prospects"} onClick={() => setTab("prospects")} label={`Potenziali interessati (${prospects.length})`} />
        <TabButton active={tab === "members"} onClick={() => setTab("members")} label={`Iscritti (${members.length})`} />
        <TabButton active={tab === "collaborators"} onClick={() => setTab("collaborators")} label={`Collaboratori (${state.collaborators.length})`} />
      </div>
      <RarityOverview state={state} />

      {tab === "collaborators" ? (
        <section className="collaborator-list" aria-label="Collaboratori delle Onde">
          {state.collaborators.length === 0 ? (
            <div className="people-empty"><Icon name="contact" /><strong>Nessun collaboratore disponibile</strong><span>Rari e Leggendari diventano collaboratori solo dopo il Corso Y.</span></div>
          ) : state.collaborators.map((collaborator) => {
            const contact = state.contacts.find((candidate) => candidate.id === collaborator.contactId);
            const bonusSummary = getCollaboratorBonusSummary(collaborator);
            return (
              <article className="collaborator-row" key={collaborator.id}>
                <div className={`person-avatar rarity-${collaborator.rarity}`}>{collaborator.displayName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
                <div className="collaborator-copy">
                  <PersonName displayName={collaborator.displayName} rarity={collaborator.rarity} />
                  <span className={`rarity-address rarity-${collaborator.rarity}`}>{contact?.email}</span>
                  <small>{collaborator.rarity === "legendary" ? "Livello Leggendario · Qualificato al Corso Y · Potere VIP ×2" : "Livello Raro · Qualificato al Corso Y"}</small>
                  <small className="form-bonus-summary">{bonusSummary || "Nessun bonus d'arma attivo"}</small>
                </div>
                <label><span>Assegnazione</span><select aria-label="Assegnazione" value={collaborator.assignment ?? ""} onChange={(event) => onAssign(collaborator.id, (event.target.value || null) as CollaboratorAssignment)}><option value="">Non assegnato</option>{Object.entries(assignmentLabels).map(([value, label]) => <option value={value} key={value} disabled={value === "social" && !state.unlocks.social}>{label}{value === "social" && !state.unlocks.social ? " — si sblocca con 10 iscritti" : ""}</option>)}</select></label>
                <TrainingControl personId={collaborator.id} displayName={collaborator.displayName} student={collaborator} state={state} onStartTraining={onStartTraining} />
              </article>
            );
          })}
        </section>
      ) : tab === "members" ? (
        <section className="people-table member-development-list" aria-label="Iscritti">
          <div className="people-row people-head member-row"><span>Nome</span><span>Indirizzo</span><span>Percorso</span><span>Stato</span><span>Prossima evoluzione</span></div>
          {members.map((contact) => {
            const isCollaborator = collaboratorContactIds.has(contact.id);
            return (
              <div className="people-row member-row" key={contact.id}>
                <PersonName displayName={`${contact.firstName} ${contact.lastName}`} rarity={contact.rarity} />
                <span><span className={`rarity-address rarity-${contact.rarity}`}>{contact.email}</span></span>
                <span>{formatFormPath(contact.forms)}</span>
                <span>{isCollaborator ? "Collaboratore" : statusLabels[contact.status]}</span>
                <div className="member-training-cell">
                  {isCollaborator
                    ? <small>Gestisci dal pannello Collaboratori</small>
                    : <TrainingControl personId={contact.id} displayName={`${contact.firstName} ${contact.lastName}`} student={contact} state={state} onStartTraining={onStartTraining} />}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="people-table" aria-label="Potenziali interessati">
          <div className="people-row people-head"><span>Nome</span><span>Indirizzo</span><span>Fonte</span><span>Stato</span></div>
          {prospects.map((contact) => (
            <div className="people-row" key={contact.id}><PersonName displayName={`${contact.firstName} ${contact.lastName}`} rarity={contact.rarity} /><span><span className={`rarity-address rarity-${contact.rarity}`}>{contact.email}</span></span><span>{contact.source}</span><span>{statusLabels[contact.status]}</span></div>
          ))}
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
      <article><strong>Comune</strong><span>Email lasciata: {percent.format(common.emailShareChance)}</span><span>Iscrizione: {percent.format(common.baseEnrollmentChance)} base · {percent.format(commonEnrollmentChance)} attuale</span><span>Non diventa mai collaboratore</span></article>
      <article className="rare"><strong>Raro</strong><span>Comparsa: {percent.format(rare.queueAppearanceChance)} dei contatti non leggendari</span><span>Iscrizione: {percent.format(rare.baseEnrollmentChance)} base · {percent.format(rareEnrollmentChance)} attuale</span><span>Diventa collaboratore completando il Corso Y</span></article>
      <article className="legendary"><strong>Leggendario</strong><span>Comparsa: {percent.format(legendary.queueAppearanceChance)} dalla 10ª email</span><span>Iscrizione: {percent.format(legendary.baseEnrollmentChance)} base · {percent.format(legendaryEnrollmentChance)} attuale · Andrea 100%</span><span>Collaboratore dopo il Corso Y · potere VIP ×2 · Forme 6 e 7</span></article>
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
  const currentYear = getGameYear(state.school.currentMonth);
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
    const duration = student.training.completesAt - student.training.startedAt;
    const progress = duration <= 0 ? 100 : Math.min(100, Math.max(0, Math.round(((now - student.training.startedAt) / duration) * 100)));
    return <div className="training-progress"><span>{definition?.title}{definition?.branch ? ` — ${definition.branch}` : ""}</span><strong>{progress}%</strong><div role="progressbar" aria-label={`Formazione di ${displayName}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div></div>;
  }
  if (student.lastFormTrainingYear === currentYear) {
    return <div className="training-locked"><span>Limite annuale raggiunto</span><strong>Prossima evoluzione nell'anno {currentYear + 1}</strong></div>;
  }

  const available = getAvailableForms(student, currentYear);
  const selected = selectedFormId ? getFormDefinition(selectedFormId) : undefined;
  if (available.length === 0) {
    return <div className="training-locked"><span>Formazione</span><strong>{student.rarity === "legendary" ? "Percorso completato" : "Percorso completato alla Forma 5"}</strong></div>;
  }
  return <div className="training-control"><label><span>Prossima formazione · anno {currentYear}</span><select aria-label={`Formazione per ${displayName}`} value={selectedFormId} onChange={(event) => setSelectedFormId(event.target.value as FormId)}><option value="">Seleziona</option>{available.map((definition) => <option key={definition.id} value={definition.id}>{definition.title}{definition.branch ? ` — ${definition.branch}` : ""}{definition.bonusLabel ? ` · ${definition.bonusLabel}` : ""} · € {definition.cost}</option>)}</select></label><button type="button" disabled={!selected || state.school.euros < selected.cost} onClick={() => selected && onStartTraining(personId, selected.id)}>{selected && state.school.euros < selected.cost ? `Servono € ${selected.cost}` : "Avvia"}</button></div>;
}
