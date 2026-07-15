import { useEffect, useState } from "react";
import { Icon } from "../../components/common/Icon";
import { ACQUISITION_EVENTS } from "../../content/events";
import { GAME_CONFIG } from "../../game/config";
import {
  getAvailableSwords,
  getEffectiveDamagedSwords,
  getEquipmentMaintenanceCost,
} from "../../game/equipment";
import { selectAvailableEventMembers } from "../../game/selectors";
import type { AcquisitionEvent, GameState } from "../../game/types";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function quantityLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function memberRequirement(count: number) {
  return quantityLabel(count, "iscritto", "iscritti");
}

function equipmentCondition(wear: number, damagedSwords: number) {
  if (damagedSwords > 0) return "Danno da riparare";
  if (wear === 0) return "Ottime condizioni";
  if (wear < 35) return "Usura leggera";
  if (wear < 70) return "Manutenzione consigliata";
  return "Manutenzione urgente";
}

function getEventProgress(event: AcquisitionEvent, now: number) {
  const duration = event.resolvesAt - event.startedAt;
  if (duration <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round(((now - event.startedAt) / duration) * 100)));
}

export function EventsView({
  state,
  onStart,
  onMaintainEquipment = () => undefined,
  onBuyOfficialSword = () => undefined,
}: {
  state: GameState;
  onStart: (definitionId: AcquisitionEvent["definitionId"]) => void;
  onMaintainEquipment?: () => void;
  onBuyOfficialSword?: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const runningEvents = state.acquisitionEvents.filter((event) => event.status === "running");
  const availableMembers = selectAvailableEventMembers(state);
  const availableSwords = getAvailableSwords(state.equipment);
  const damagedSwords = getEffectiveDamagedSwords(state.equipment);
  const maintenanceCost = getEquipmentMaintenanceCost(state.equipment);
  const needsMaintenance = state.equipment.wear > 0 || damagedSwords > 0;
  const canMaintain =
    needsMaintenance &&
    state.school.euros >= maintenanceCost &&
    runningEvents.length === 0;
  let maintenanceLabel = `Esegui manutenzione · ${euro.format(maintenanceCost)}`;
  if (!needsMaintenance) maintenanceLabel = "Manutenzione non necessaria";
  else if (runningEvents.length > 0) maintenanceLabel = "Attendi la fine dell'evento";
  else if (state.school.euros < maintenanceCost) {
    maintenanceLabel = `Servono ${euro.format(maintenanceCost)}`;
  }
  const canBuyOfficialSword = state.school.euros >= GAME_CONFIG.officialSwordCost;
  const swordPurchaseLabel = canBuyOfficialSword
    ? `Ordina 1 Polaris · ${euro.format(GAME_CONFIG.officialSwordCost)}`
    : `Servono ${euro.format(GAME_CONFIG.officialSwordCost)}`;
  const showSupplier =
    state.school.peakActiveMembers >= 15 ||
    state.equipment.totalSwords > GAME_CONFIG.initialSwords;
  const visibleEvents = ACQUISITION_EVENTS.filter((definition) =>
    definition.unlockMembers <= state.school.peakActiveMembers ||
    runningEvents.some((event) => event.definitionId === definition.id)
  );
  const nextLockedEvent = ACQUISITION_EVENTS.find(
    (definition) => definition.unlockMembers > state.school.peakActiveMembers,
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
      <section className="event-capacity-note" aria-label="Risorse disponibili per gli eventi">
        <div><Icon name="people" /><span><strong>{availableMembers}/{state.school.activeMembers} iscritti disponibili</strong><small>Gli iscritti impegnati tornano disponibili a fine evento.</small></span></div>
        <div className="event-equipment-summary">
          <Icon name="settings" />
          <div className="event-equipment-content">
            <div className="event-equipment-heading">
              <strong>{availableSwords}/{state.equipment.totalSwords} spade disponibili</strong>
              <div className="event-equipment-details">
                <small>{equipmentCondition(state.equipment.wear, damagedSwords)}</small>
                <small>Usura {state.equipment.wear}%</small>
                {damagedSwords > 0 ? <small>{quantityLabel(damagedSwords, "spada danneggiata", "spade danneggiate")} · ripara per usarle agli eventi</small> : null}
              </div>
            </div>
            <div className="equipment-wear" role="progressbar" aria-label="Usura attrezzatura" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.equipment.wear}><span style={{ width: `${state.equipment.wear}%` }} /></div>
            <div className="event-equipment-actions">
              <button className="event-equipment-maintenance" type="button" disabled={!canMaintain} onClick={onMaintainEquipment}>{maintenanceLabel}</button>
              {showSupplier ? <div className="event-equipment-supplier">
                <div>
                  <strong>Fornitura ufficiale · LamaDiLuce</strong>
                  <small>Polaris EVO Basic · <a href="https://lamadiluce.it/" target="_blank" rel="noreferrer">lamadiluce.it</a></small>
                </div>
                <button type="button" disabled={!canBuyOfficialSword} onClick={onBuyOfficialSword}>{swordPurchaseLabel}</button>
              </div> : null}
            </div>
          </div>
        </div>
      </section>
      <div className="event-fame-note"><Icon name="flag" /><span><strong>Fama della scuola: {state.school.peakActiveMembers}</strong><small>Equivalente al numero massimo di iscritti storici della scuola</small><small>{nextLockedEvent ? `Prossimo sblocco: ${nextLockedEvent.title} a ${nextLockedEvent.unlockMembers} iscritti massimi.` : "Tutti gli eventi nazionali sono disponibili."}</small></span></div>
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
          const lacksEquipment = availableSwords < definition.requiredSwords;
          const needsRepairForEvent = lacksEquipment &&
            damagedSwords > 0 &&
            availableSwords + damagedSwords >= definition.requiredSwords;
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
          else if (needsRepairForEvent) action = `Ripara ${quantityLabel(damagedSwords, "spada", "spade")}`;
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
