import { useState } from "react";
import { Icon } from "../../components/common/Icon";
import { formatCurrency } from "../../shared/formatters";

interface AdminEmailViewProps {
  totalContacts: number;
  availableContacts: number;
  activeMembers: number;
  euros: number;
  onAddContacts: (amount: number) => void;
  onAddMembers: (amount: number) => void;
  onAddEuros: (amount: number) => void;
}

export function AdminEmailView({
  totalContacts,
  availableContacts,
  activeMembers,
  euros,
  onAddContacts,
  onAddMembers,
  onAddEuros,
}: AdminEmailViewProps) {
  const [contactAmount, setContactAmount] = useState("1");
  const [memberAmount, setMemberAmount] = useState("1");
  const [euroAmount, setEuroAmount] = useState("1000");

  const parsedContactAmount = Number(contactAmount);
  const parsedMemberAmount = Number(memberAmount);
  const parsedEuroAmount = Number(euroAmount);
  const canAddContacts = Number.isSafeInteger(parsedContactAmount) && parsedContactAmount !== 0;
  const canAddMembers = Number.isSafeInteger(parsedMemberAmount) && parsedMemberAmount !== 0;
  const canAddEuros = Number.isFinite(parsedEuroAmount) && parsedEuroAmount !== 0;

  return (
    <main className="overview-view admin-view">
      <header>
        <Icon name="admin" />
        <div>
          <h1>Admin</h1>
          <p>Strumenti di sviluppo per modificare la partita corrente</p>
        </div>
        <span className="dev-only-badge">DEV ONLY</span>
      </header>

      <section className="admin-resource-tools" aria-labelledby="admin-resource-title">
        <div className="admin-resource-heading">
          <span>Risorse partita</span>
          <h2 id="admin-resource-title">Modifiche manuali</h2>
          <p>{"Le quantit\u00e0 positive aggiungono risorse; quelle negative le rimuovono."}</p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canAddContacts) onAddContacts(parsedContactAmount);
          }}
        >
          <label htmlFor="admin-contact-amount">
            Contatti email
            <input
              id="admin-contact-amount"
              type="number"
              step="1"
              value={contactAmount}
              onChange={(event) => setContactAmount(event.target.value)}
            />
          </label>
          <button type="submit" disabled={!canAddContacts}>Modifica contatti</button>
          <small>
            Totali: {totalContacts} &middot; disponibili: {availableContacts}. {"Un contatto pu\u00f2 essere usato subito per avviare una nuova mail."}
          </small>
        </form>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canAddMembers) onAddMembers(parsedMemberAmount);
          }}
        >
          <label htmlFor="admin-member-amount">
            Iscritti
            <input
              id="admin-member-amount"
              type="number"
              step="1"
              value={memberAmount}
              onChange={(event) => setMemberAmount(event.target.value)}
            />
          </label>
          <button type="submit" disabled={!canAddMembers}>Modifica iscritti</button>
          <small>Iscritti attivi e presenti nella lista: {activeMembers}</small>
        </form>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canAddEuros) onAddEuros(parsedEuroAmount);
          }}
        >
          <label htmlFor="admin-euro-amount">
            Euro
            <input
              id="admin-euro-amount"
              type="number"
              step="0.01"
              value={euroAmount}
              onChange={(event) => setEuroAmount(event.target.value)}
            />
          </label>
          <button type="submit" disabled={!canAddEuros}>Modifica Euro</button>
          <small>Attuali: {formatCurrency(euros)}</small>
        </form>
      </section>
    </main>
  );
}
