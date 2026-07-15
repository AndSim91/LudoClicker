import { useEffect, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { ACQUISITION_EVENTS } from "../../content/events";
import { selectAvailableEventMembers } from "../../game/selectors";
import type { AcquisitionEvent, GameState } from "../../game/types";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function quantityLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function memberRequirement(count: number) {
  return quantityLabel(count, "iscritto", "iscritti");
}

function getEventProgress(event: AcquisitionEvent, now: number) {
  const duration = event.resolvesAt - event.startedAt;
  if (duration <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round(((now - event.startedAt) / duration) * 100)));
}

export function EventsView({
  state,
  onStart,
}: {
  state: GameState;
  onStart: (definitionId: AcquisitionEvent["definitionId"]) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const runningEvents = state.acquisitionEvents.filter((event) => event.status === "running");
  const availableMembers = selectAvailableEventMembers(state);
  const visibleEvents = ACQUISITION_EVENTS.filter((definition) =>
    definition.unlockMembers <= state.school.activeMembers ||
    runningEvents.some((event) => event.definitionId === definition.id)
  );
  const nextLockedEvent = ACQUISITION_EVENTS.find(
    (definition) => definition.unlockMembers > state.school.activeMembers,
  );
  const refreshIntervalMs = runningEvents.length > 0 ? 100 : 1_000;
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), refreshIntervalMs);
    return () => window.clearInterval(timer);
  }, [refreshIntervalMs]);

  return (
    <main className="overview-view events-view">
      <header><Icon name="flag" /><div><h1>Eventi</h1><p>Attività esterne per incontrare persone e raccogliere nuovi contatti</p></div></header>
      <div className="event-notice"><Icon name="contact" /><div><strong>{state.contacts.filter((contact) => contact.status === "available").length} contatti disponibili</strong><span>Ogni nuovo indirizzo può ricevere una sola campagna email.</span></div></div>
      <div className="event-capacity-note" aria-label="Risorse disponibili per gli eventi">
        <div><Icon name="people" /><span><strong>{availableMembers}/{state.school.activeMembers} iscritti disponibili</strong><small>Gli iscritti impegnati tornano disponibili a fine evento.</small></span></div>
        <div><Icon name="settings" /><span><strong>{state.equipment.availableSwords}/{state.equipment.totalSwords} spade disponibili</strong><small>Usura attrezzatura {state.equipment.wear}%</small></span></div>
      </div>
      <div className="event-fame-note"><Icon name="flag" /><span><strong>Fama della scuola: {memberRequirement(state.school.activeMembers)}</strong><small>{nextLockedEvent ? `Prossimo sblocco: ${nextLockedEvent.title} a ${nextLockedEvent.unlockMembers} iscritti.` : "Tutti gli eventi nazionali sono disponibili."}</small></span></div>
      <section className="event-list">
        {visibleEvents.map((definition) => {
          const matching = state.acquisitionEvents.find(
            (event) => event.definitionId === definition.id && event.status === "running",
          );
          const cooldown = Math.max(0, state.activities.nextSparringAt - now);
          const onCooldown = definition.id === "park-sparring" && cooldown > 0;
          const lacksFunds = state.school.euros < definition.cost;
          const lacksMembers = state.school.activeMembers < definition.requiredMembers;
          const lacksAvailableMembers = availableMembers < definition.requiredMembers;
          const lacksEquipment = state.equipment.availableSwords < definition.requiredSwords;
          const progress = matching ? getEventProgress(matching, now) : 0;
          const remainingSeconds = matching
            ? Math.max(0, Math.ceil((matching.resolvesAt - now) / 1_000))
            : 0;
          const disabled = Boolean(matching || onCooldown || lacksFunds || lacksAvailableMembers || lacksEquipment);
          let action = definition.cost === 0 ? "Partecipa gratis" : `Partecipa · ${euro.format(definition.cost)}`;
          if (matching) action = "Attività in corso…";
          else if (onCooldown) action = `Di nuovo tra ${Math.ceil(cooldown / 1_000)} s`;
          else if (lacksMembers) action = `Richiede ${memberRequirement(definition.requiredMembers)}`;
          else if (lacksAvailableMembers) action = `Servono ${memberRequirement(definition.requiredMembers)} liberi`;
          else if (lacksEquipment) action = `Richiede ${definition.requiredSwords} spade`;
          else if (lacksFunds) action = `Servono ${euro.format(definition.cost)}`;

          return (
            <article className="event-row" key={definition.id}>
              <div className="event-copy">
                <div className="event-meta"><span>{Math.round(definition.durationMs / 1_000)} secondi</span><span>Rischio {definition.risk.toLocaleLowerCase("it-IT")}</span><span>{memberRequirement(definition.requiredMembers)}</span><span>{definition.requiredSwords} spade</span></div>
                <h2>{definition.title}</h2>
                <strong>{definition.location}</strong>
                <p>{definition.description}</p>
                <small className="event-potential">Potenzialità: {definition.potential}</small>
                {matching ? (
                  <div className="event-progress-block">
                    <div className="event-progress-label"><span>Attività in corso</span><strong>{remainingSeconds} s rimanenti · {progress}%</strong></div>
                    <div
                      className="event-progress"
                      role="progressbar"
                      aria-label={`Avanzamento ${definition.title}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                    >
                      <span style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                ) : null}
              </div>
              <button type="button" disabled={disabled} onClick={() => onStart(definition.id)}>{action}</button>
            </article>
          );
        })}
      </section>
      {state.acquisitionEvents.some((event) => event.status === "completed") ? (
        <section className="event-history"><h2>Attività completate</h2>{state.acquisitionEvents.filter((event) => event.status === "completed").slice().reverse().map((event) => <div key={event.id}><Icon name="flag" /><span><strong>{event.title}</strong><small>{quantityLabel(event.peopleMet ?? 0, "persona", "persone")} · {quantityLabel(event.demonstrationsGiven ?? 0, "prova", "prove")} · {quantityLabel(event.contactReward ?? 0, "contatto", "contatti")}</small></span><time>{new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(event.resolvesAt)}</time></div>)}</section>
      ) : null}
    </main>
  );
}
