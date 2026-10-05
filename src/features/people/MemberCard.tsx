import type { ReactNode } from "react";
import { OfficialStatValue } from "../../components/common/OfficialStatValue";
import type { Collaborator, Contact, FormId } from "../../game/types";
import { getPresentedRarityLabel, getRarityClassName } from "../../shared/rarityPresentation";
import { FormLogoStrip, PersonName } from "./PersonPresentation";

/**
 * One member in the «Schede» view of the roster (4.7): the same facts as a
 * table row, laid out as a card. The row's controls arrive as children.
 */
export function MemberCard({
  contact,
  forms,
  collaborator,
  path,
  status,
  preparation,
  hiddenStatsHint,
  favoriteButton,
  cancelButton,
  training,
}: {
  contact: Contact;
  forms: FormId[];
  collaborator?: Collaborator;
  path: string;
  status: string;
  preparation?: { arena: number; style: number };
  hiddenStatsHint: string;
  favoriteButton: ReactNode;
  cancelButton: ReactNode;
  training: ReactNode;
}) {
  const secret = Boolean(contact.secretLegendaryId);
  const rarityClass = getRarityClassName(contact.rarity, secret);
  const name = `${contact.firstName} ${contact.lastName}`;
  return (
    <article className={`member-card ${rarityClass}`} aria-label={name}>
      <header>
        <span className="member-card-avatar" aria-hidden="true">
          {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
        </span>
        <span className="member-card-identity">
          <PersonName displayName={name} rarity={contact.rarity} secretLegendary={secret} />
          <span className={`member-email rarity-address ${rarityClass}`}>{contact.email}</span>
        </span>
        {favoriteButton}
        {cancelButton}
      </header>
      <div className="member-card-path">
        <strong className={`member-rarity rarity-name ${rarityClass}`}>
          {getPresentedRarityLabel(contact.rarity, secret)}
        </strong>
        <span>{path}</span>
      </div>
      <FormLogoStrip
        forms={forms}
        instructorForms={collaborator?.instructorForms}
        technicianForms={collaborator?.technicianForms}
        showLabels={false}
      />
      <dl className="member-card-stats">
        <div>
          <dt>Arena</dt>
          <dd>{preparation ? <OfficialStatValue value={preparation.arena} /> : <span title={hiddenStatsHint}>???</span>}</dd>
        </div>
        <div>
          <dt>Stile</dt>
          <dd>{preparation ? <OfficialStatValue value={preparation.style} /> : <span title={hiddenStatsHint}>???</span>}</dd>
        </div>
      </dl>
      <p className="member-card-status">{status}</p>
      <div className="member-card-training">{training}</div>
    </article>
  );
}
