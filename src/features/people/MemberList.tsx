import { useState } from "react";
import { getSchoolYear } from "../../game/calendar";
import type { Collaborator, Contact, FormId, GameState } from "../../game/types";
import {
  FormLogoStrip,
  PersonName,
} from "./PersonPresentation";
import { TrainingControl } from "./TrainingControl";
import { formatFormPath, getMemberDepartureRiskLabel } from "./peoplePresentation";

const CONTACT_STATUS_LABELS: Record<Contact["status"], string> = {
  available: "Disponibile",
  writing: "In scrittura",
  invited: "Invitato",
  trialScheduled: "Prova prenotata",
  enrolled: "Iscritto",
  departed: "Ha lasciato la scuola",
  lost: "Perso",
};

const MEMBERS_PER_PAGE = 75;

export function MemberList({
  state,
  members,
  collaboratorsByContactId,
  collaboratorsById,
  onStartTraining,
}: {
  state: GameState;
  members: Contact[];
  collaboratorsByContactId: Map<string, Collaborator>;
  collaboratorsById: Map<string, Collaborator>;
  onStartTraining: (personId: string, formId: FormId) => void;
}) {
  const [requestedPage, setRequestedPage] = useState(0);
  const currentYear = getSchoolYear(state.school.currentMonth);
  const pageCount = Math.max(1, Math.ceil(members.length / MEMBERS_PER_PAGE));
  const page = Math.min(requestedPage, pageCount - 1);
  const firstMember = page * MEMBERS_PER_PAGE;
  const visibleMembers = members.slice(firstMember, firstMember + MEMBERS_PER_PAGE);

  return (
    <section className="people-table member-development-list" aria-label="Iscritti">
      <div className="people-row people-head member-row">
        <span>Nome</span><span>Indirizzo</span><span>Percorso</span><span>Stato</span><span>Prossima evoluzione</span>
      </div>
      {visibleMembers.map((contact) => {
        const collaborator = collaboratorsByContactId.get(contact.id);
        const isCollaborator = Boolean(collaborator);
        const memberForms = collaborator?.forms ?? contact.forms;
        return (
          <div className="people-row member-row" key={contact.id}>
            <PersonName
              displayName={`${contact.firstName} ${contact.lastName}`}
              rarity={contact.rarity}
              label="Nome"
            />
            <span data-label="Indirizzo">
              <span className={`rarity-address rarity-${contact.rarity}`}>{contact.email}</span>
            </span>
            <div className="member-path" data-label="Percorso">
              <strong>{formatFormPath(memberForms)}</strong>
              <FormLogoStrip forms={memberForms} showLabels={false} />
            </div>
            <span className="member-status" data-label="Stato">
              <span>{isCollaborator ? "Collaboratore" : CONTACT_STATUS_LABELS[contact.status]}</span>
              <small>
                {isCollaborator || contact.rarity === "legendary"
                  ? "Non soggetto ad abbandono"
                  : contact.lastFormTrainingYear === currentYear
                    ? "Nessun rischio"
                    : getMemberDepartureRiskLabel(
                        contact.forms,
                        contact.rarity,
                        state.network.schools.length,
                      )}
              </small>
            </span>
            <div className="member-training-cell" data-label="Prossima evoluzione">
              {isCollaborator ? (
                <small>Gestisci dal pannello Collaboratori</small>
              ) : (
                <TrainingControl
                  personId={contact.id}
                  displayName={`${contact.firstName} ${contact.lastName}`}
                  student={contact}
                  state={state}
                  collaboratorsById={collaboratorsById}
                  onStartTraining={onStartTraining}
                />
              )}
            </div>
          </div>
        );
      })}
      {pageCount > 1 ? (
        <nav className="list-pagination" aria-label="Pagine iscritti">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setRequestedPage((current) => Math.max(0, current - 1))}
          >
            Precedente
          </button>
          <span>Pagina {page + 1} di {pageCount}</span>
          <button
            type="button"
            disabled={page === pageCount - 1}
            onClick={() => setRequestedPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            Successiva
          </button>
        </nav>
      ) : null}
    </section>
  );
}
