import { useMemo } from "react";
import { Icon } from "../../components/common/Icon";
import { ProgressBar } from "../../components/common/ProgressBar";
import { useGameStateSlices } from "../../game/GameStateContext";
import { useGameTime } from "../../game/GameTimeContext";
import { GAME_CONFIG } from "../../game/config";
import { getContactsById } from "../../game/runtimeIndexes";
import type { GameState, ScheduledTrial } from "../../game/types";
import { getRarityClassName } from "../../shared/rarityPresentation";

const dateTime = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function getTrialProgress(trial: ScheduledTrial, now: number) {
  if (trial.status === "completed") return 100;
  if (trial.status === "cancelled") return 0;
  const duration = trial.resolvesAt - trial.startsAt;
  if (duration <= 0 || now <= trial.startsAt) return 0;
  return Math.min(100, Math.max(0, ((now - trial.startsAt) / duration) * 100));
}

function getTrialStatus(
  trial: ScheduledTrial,
  contactStatus: GameState["contacts"][number]["status"] | undefined,
  now: number,
) {
  if (trial.status === "completed") {
    return contactStatus === "enrolled" ? "Iscritto" : "Perso";
  }
  if (trial.status === "cancelled") return "Annullata";
  return now < trial.startsAt ? "Pianificata" : "In corso";
}

export function CalendarView({
  state: stateOverride,
  onOpenSentEmail,
}: {
  state?: GameState;
  onOpenSentEmail: (emailId: string) => void;
}) {
  const state = useGameStateSlices(
    ["contacts", "emails", "scheduledTrials"],
    stateOverride,
  );
  const trialPresentation = useMemo(() => {
    let scheduledCount = 0;
    let completedCount = 0;
    for (const trial of state.scheduledTrials) {
      if (trial.status === "scheduled") scheduledCount += 1;
      else if (trial.status === "completed") completedCount += 1;
    }
    return {
      scheduledCount,
      completedCount,
      sortedTrials: [...state.scheduledTrials].sort((left, right) =>
        right.startsAt - left.startsAt
      ),
    };
  }, [state.scheduledTrials]);
  const contactsById = getContactsById(state.contacts);
  const emailsByContactId = useMemo(() => {
    const emails = new Map<string, GameState["emails"][number]>();
    for (const email of state.emails) {
      if (!emails.has(email.contactId)) emails.set(email.contactId, email);
    }
    return emails;
  }, [state.emails]);
  const hasPendingTrials = trialPresentation.scheduledCount > 0;
  const now = useGameTime(
    true,
    hasPendingTrials ? GAME_CONFIG.progressUpdateIntervalMs : 60_000,
  );

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
          <strong>{trialPresentation.scheduledCount}</strong>
        </div>
        <div>
          <span>Lezioni completate</span>
          <strong>{trialPresentation.completedCount}</strong>
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
          trialPresentation.sortedTrials
            .map((trial) => {
              const contact = contactsById.get(trial.contactId);
              const email = emailsByContactId.get(trial.contactId);
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
                  : status === "Annullata"
                    ? "Nessuna spada disponibile"
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
                        <strong className={contact ? `rarity-name ${getRarityClassName(contact.rarity, Boolean(contact.secretLegendaryId))}` : undefined}>{contactName}</strong>
                        <span className={contact ? `rarity-address ${getRarityClassName(contact.rarity, Boolean(contact.secretLegendaryId))}` : undefined}>{contact?.email}</span>
                      </div>
                      <span className={`trial-status ${status.toLocaleLowerCase("it-IT").replaceAll(" ", "-")}`}>
                        {status}
                      </span>
                    </div>
                    <div className="trial-progress-label">
                      <span>{timing}</span>
                      <strong>{Math.round(progress)}%</strong>
                    </div>
                    <ProgressBar
                      className="trial-progress"
                      label={`Avanzamento lezione di prova di ${contactName}`}
                      value={progress}
                      durationMs={trial.resolvesAt - trial.startsAt}
                    />
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
