import { useEffect, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { useProvidedGameTime } from "../../game/GameTimeContext";
import type { GameState, ScheduledTrial } from "../../game/types";

const dateTime = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function getTrialProgress(trial: ScheduledTrial, now: number) {
  if (trial.status === "completed") return 100;
  const duration = trial.resolvesAt - trial.startsAt;
  if (duration <= 0 || now <= trial.startsAt) return 0;
  return Math.min(100, Math.max(0, Math.round(((now - trial.startsAt) / duration) * 100)));
}

function getTrialStatus(
  trial: ScheduledTrial,
  contactStatus: GameState["contacts"][number]["status"] | undefined,
  now: number,
) {
  if (trial.status === "completed") {
    return contactStatus === "enrolled" ? "Iscritto" : "Perso";
  }
  return now < trial.startsAt ? "Pianificata" : "In corso";
}

export function CalendarView({
  state,
  onOpenSentEmail,
}: {
  state: GameState;
  onOpenSentEmail: (emailId: string) => void;
}) {
  const providedNow = useProvidedGameTime();
  const [localNow, setLocalNow] = useState(() => Date.now());
  const now = providedNow ?? localNow;
  const hasPendingTrials = state.scheduledTrials.some((trial) => trial.status === "scheduled");

  useEffect(() => {
    if (providedNow !== null) return;
    const timer = window.setInterval(
      () => setLocalNow(Date.now()),
      hasPendingTrials ? 100 : 1_000,
    );
    return () => window.clearInterval(timer);
  }, [hasPendingTrials, providedNow]);

  return (
    <main className="overview-view calendar-view">
      <header>
        <Icon name="calendar" />
        <div>
          <h1>Calendario</h1>
          <p>Lezioni di prova e appuntamenti della scuola</p>
        </div>
      </header>

      <section className="calendar-summary" aria-label="Riepilogo lezioni di prova">
        <div>
          <span>Lezioni pianificate</span>
          <strong>{state.scheduledTrials.filter((trial) => trial.status === "scheduled").length}</strong>
        </div>
        <div>
          <span>Lezioni completate</span>
          <strong>{state.scheduledTrials.filter((trial) => trial.status === "completed").length}</strong>
        </div>
      </section>

      <section className="trial-list" aria-label="Lezioni di prova">
        {state.scheduledTrials.length === 0 ? (
          <div className="calendar-empty">
            <Icon name="calendar" />
            <strong>Nessuna lezione in programma</strong>
            <span>Le prenotazioni generate dalle email appariranno qui.</span>
          </div>
        ) : (
          state.scheduledTrials
            .slice()
            .sort((a, b) => b.startsAt - a.startsAt)
            .map((trial) => {
              const contact = state.contacts.find((candidate) => candidate.id === trial.contactId);
              const email = state.emails.find((candidate) => candidate.contactId === trial.contactId);
              const status = getTrialStatus(trial, contact?.status, now);
              const progress = getTrialProgress(trial, now);
              const startsInSeconds = Math.max(0, Math.ceil((trial.startsAt - now) / 1_000));
              const remainingSeconds = Math.max(0, Math.ceil((trial.resolvesAt - now) / 1_000));
              const contactName = contact
                ? `${contact.firstName} ${contact.lastName}`
                : "Contatto non disponibile";
              const timing = status === "Pianificata"
                ? `Inizia tra ${startsInSeconds} s`
                : status === "In corso"
                  ? `${remainingSeconds} s rimanenti`
                  : "Lezione conclusa";

              return (
                <article className="trial-card" key={trial.id}>
                  <div className="trial-time">
                    <span>{dateTime.format(trial.startsAt)}</span>
                    <small>{Math.round((trial.resolvesAt - trial.startsAt) / 1_000)} secondi</small>
                  </div>
                  <div className="trial-details">
                    <div className="trial-heading">
                      <div>
                        <h2>Lezione di prova</h2>
                        <strong className={contact ? `rarity-name rarity-${contact.rarity}` : undefined}>{contactName}</strong>
                        <span className={contact ? `rarity-address rarity-${contact.rarity}` : undefined}>{contact?.email}</span>
                      </div>
                      <span className={`trial-status ${status.toLocaleLowerCase("it-IT").replaceAll(" ", "-")}`}>
                        {status}
                      </span>
                    </div>
                    <div className="trial-progress-label">
                      <span>{timing}</span>
                      <strong>{progress}%</strong>
                    </div>
                    <div
                      className="trial-progress"
                      role="progressbar"
                      aria-label={`Avanzamento lezione di prova di ${contactName}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                    >
                      <span style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!email}
                    onClick={() => email && onOpenSentEmail(email.id)}
                  >
                    <Icon name="mail" /> Apri mail inviata
                  </button>
                </article>
              );
            })
        )}
      </section>
    </main>
  );
}
