import { useEffect, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { getAvailableForms, getFormDefinition } from "../../content/forms";
import type { Collaborator, CollaboratorAssignment, FormId, GameState } from "../../game/types";

type PeopleTab = "prospects" | "members" | "collaborators";

const assignmentLabels: Record<Exclude<CollaboratorAssignment, null>, string> = {
  writing: "Redazione",
  events: "Eventi",
  lessons: "Lezioni in palestra",
  social: "Social",
  equipment: "Attrezzatura",
};

const statusLabels: Record<GameState["contacts"][number]["status"], string> = {
  available: "Disponibile",
  writing: "In scrittura",
  invited: "Invitato",
  trialScheduled: "Prova prenotata",
  enrolled: "Iscritto",
  lost: "Perso",
};

export function PeopleView({
  state,
  onAssign,
  onStartTraining,
}: {
  state: GameState;
  onAssign: (collaboratorId: string, assignment: CollaboratorAssignment) => void;
  onStartTraining: (collaboratorId: string, formId: FormId) => void;
}) {
  const [tab, setTab] = useState<PeopleTab>("prospects");
  const prospects = state.contacts.filter(
    (contact) => contact.status !== "enrolled" && contact.status !== "lost",
  );
  const members = state.contacts.filter((contact) => contact.status === "enrolled");

  return (
    <main className="overview-view people-view">
      <header><Icon name="people" /><div><h1>Persone</h1><p>Contatti, iscritti e Collaboratori delle Onde</p></div></header>
      <div className="people-tabs" role="tablist" aria-label="Categorie persone">
        <TabButton active={tab === "prospects"} onClick={() => setTab("prospects")} label={`Potenziali interessati (${prospects.length})`} />
        <TabButton active={tab === "members"} onClick={() => setTab("members")} label={`Iscritti (${members.length})`} />
        <TabButton active={tab === "collaborators"} onClick={() => setTab("collaborators")} label={`Collaboratori (${state.collaborators.length})`} />
      </div>

      {tab === "collaborators" ? (
        <section className="collaborator-list" aria-label="Collaboratori delle Onde">
          {state.collaborators.length === 0 ? (
            <div className="people-empty"><Icon name="contact" /><strong>Nessun collaboratore disponibile</strong><span>Gli Iscritti volenterosi compariranno qui.</span></div>
          ) : state.collaborators.map((collaborator) => {
            const contact = state.contacts.find((candidate) => candidate.id === collaborator.contactId);
            return (
              <article className="collaborator-row" key={collaborator.id}>
                <div className="person-avatar">{collaborator.displayName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
                <div className="collaborator-copy"><strong>{collaborator.displayName}</strong><span>{contact?.email}</span><small>{collaborator.forms.length ? collaborator.forms.map((formId) => getFormDefinition(formId)?.title).join(", ") : "Nessuna Forma completata"}</small></div>
                <label><span>Assegnazione</span><select value={collaborator.assignment ?? ""} onChange={(event) => onAssign(collaborator.id, (event.target.value || null) as CollaboratorAssignment)}><option value="">Non assegnato</option>{Object.entries(assignmentLabels).map(([value, label]) => <option value={value} key={value} disabled={value === "social" && !state.unlocks.social}>{label}{value === "social" && !state.unlocks.social ? " — si sblocca con 10 iscritti" : ""}</option>)}</select></label>
                <TrainingControl collaborator={collaborator} state={state} onStartTraining={onStartTraining} />
              </article>
            );
          })}
        </section>
      ) : (
        <section className="people-table" aria-label={tab === "prospects" ? "Potenziali interessati" : "Iscritti"}>
          <div className="people-row people-head"><span>Nome</span><span>Indirizzo</span><span>Fonte</span><span>Stato</span></div>
          {(tab === "prospects" ? prospects : members).map((contact) => (
            <div className="people-row" key={contact.id}><strong>{contact.firstName} {contact.lastName}</strong><span>{contact.email}</span><span>{contact.source}</span><span>{statusLabels[contact.status]}</span></div>
          ))}
        </section>
      )}
    </main>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" role="tab" aria-selected={active} className={active ? "active" : ""} onClick={onClick}>{label}</button>;
}

function TrainingControl({
  collaborator,
  state,
  onStartTraining,
}: {
  collaborator: Collaborator;
  state: GameState;
  onStartTraining: (collaboratorId: string, formId: FormId) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [selectedFormId, setSelectedFormId] = useState<FormId | "">("");
  const hasTraining = Boolean(collaborator.training);
  useEffect(() => {
    if (!hasTraining) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [hasTraining]);

  if (!state.unlocks.forms) {
    return <div className="training-locked"><span>Formazione</span><strong>Si sblocca con 50 iscritti</strong></div>;
  }
  if (collaborator.training) {
    const definition = getFormDefinition(collaborator.training.formId);
    const duration = collaborator.training.completesAt - collaborator.training.startedAt;
    const progress = duration <= 0 ? 100 : Math.min(100, Math.max(0, Math.round(((now - collaborator.training.startedAt) / duration) * 100)));
    return <div className="training-progress"><span>{definition?.title}{definition?.branch ? ` — ${definition.branch}` : ""}</span><strong>{progress}%</strong><div role="progressbar" aria-label={`Formazione di ${collaborator.displayName}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div></div>;
  }

  const available = getAvailableForms(collaborator);
  const selected = selectedFormId ? getFormDefinition(selectedFormId) : undefined;
  if (available.length === 0) return <div className="training-locked"><span>Formazione</span><strong>Percorso completato</strong></div>;
  return <div className="training-control"><label><span>Prossima formazione</span><select aria-label={`Formazione per ${collaborator.displayName}`} value={selectedFormId} onChange={(event) => setSelectedFormId(event.target.value as FormId)}><option value="">Seleziona</option>{available.map((definition) => <option key={definition.id} value={definition.id}>{definition.title}{definition.branch ? ` — ${definition.branch}` : ""} · € {definition.cost}</option>)}</select></label><button type="button" disabled={!selected || state.school.euros < selected.cost} onClick={() => selected && onStartTraining(collaborator.id, selected.id)}>{selected && state.school.euros < selected.cost ? `Servono € ${selected.cost}` : "Avvia"}</button></div>;
}
