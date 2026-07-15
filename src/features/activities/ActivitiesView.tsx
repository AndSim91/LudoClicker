import { Icon } from "../../components/common/Icon";
import { ACHIEVEMENTS } from "../../content/achievements";
import { GAME_CONFIG } from "../../game/config";
import type { GameState } from "../../game/types";

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function percentage(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function equipmentCondition(wear: number, damagedSwords: number) {
  if (damagedSwords > 0) return "Danno da riparare";
  if (wear === 0) return "Ottime condizioni";
  if (wear < 35) return "Usura leggera";
  if (wear < 70) return "Manutenzione consigliata";
  return "Manutenzione urgente";
}

export function ActivitiesView({
  state,
  onMaintainEquipment,
  onBuyOfficialSword,
  onRunSocialCampaign,
}: {
  state: GameState;
  onMaintainEquipment: () => void;
  onBuyOfficialSword: () => void;
  onRunSocialCampaign: () => void;
}) {
  const eventRunning = state.acquisitionEvents.some((event) => event.status === "running");
  const needsMaintenance = state.equipment.wear > 0 || state.equipment.damagedSwords > 0;
  const availableSwords = Math.max(
    0,
    Math.min(
      state.equipment.availableSwords,
      state.equipment.totalSwords - state.equipment.damagedSwords,
    ),
  );
  const canMaintain =
    needsMaintenance &&
    state.school.euros >= GAME_CONFIG.equipmentMaintenanceCost &&
    !eventRunning;
  let maintenanceLabel = `Esegui manutenzione · ${euro.format(GAME_CONFIG.equipmentMaintenanceCost)}`;
  if (!needsMaintenance) maintenanceLabel = "Manutenzione non necessaria";
  else if (eventRunning) maintenanceLabel = "Attendi la fine dell'evento";
  else if (state.school.euros < GAME_CONFIG.equipmentMaintenanceCost) {
    maintenanceLabel = `Servono ${euro.format(GAME_CONFIG.equipmentMaintenanceCost)}`;
  }
  const canBuyOfficialSword = state.school.euros >= GAME_CONFIG.officialSwordCost;
  const swordPurchaseLabel = canBuyOfficialSword
    ? `Ordina 1 Polaris · ${euro.format(GAME_CONFIG.officialSwordCost)}`
    : `Servono ${euro.format(GAME_CONFIG.officialSwordCost)}`;
  const assigned = (assignment: NonNullable<GameState["collaborators"][number]["assignment"]>) =>
    state.collaborators.filter((collaborator) => collaborator.assignment === assignment).length;
  const socialProgress = Math.min(100, Math.floor(state.automation.socialBuffer * 100));
  const canRunSocial =
    state.unlocks.social && state.school.euros >= GAME_CONFIG.socialCampaignCost;
  const socialAction = !state.unlocks.social
    ? "Si sblocca con 10 iscritti"
    : state.school.euros < GAME_CONFIG.socialCampaignCost
      ? `Servono ${euro.format(GAME_CONFIG.socialCampaignCost)}`
      : `Avvia campagna · ${euro.format(GAME_CONFIG.socialCampaignCost)}`;
  const sentWithTiming = state.emails.filter((email) => typeof email.sentAt === "number");
  const averageWritingSeconds = sentWithTiming.length === 0
    ? 0
    : Math.round(sentWithTiming.reduce((total, email) => total + ((email.sentAt ?? email.createdAt) - email.createdAt), 0) / sentWithTiming.length / 1_000);
  const campaignHours = Math.max(1 / 60, (state.automation.lastProcessedAt - state.createdAt) / 3_600_000);
  const sources: Array<[GameState["contacts"][number]["source"], string]> = [
    ["tutorial", "Lista iniziale"],
    ["sparring", "Sparring"],
    ["event", "Eventi"],
    ["social", "Social"],
    ["collaborator", "Collaboratori"],
  ];
  const showSupplier =
    state.school.peakActiveMembers >= 15 ||
    state.equipment.totalSwords > GAME_CONFIG.initialSwords;
  const showCollaborators = state.unlocks.collaborators || state.collaborators.length > 0;
  const earnedAchievements = ACHIEVEMENTS.filter((achievement) =>
    state.achievements.includes(achievement.id),
  );

  return (
    <main className="overview-view activities-view">
      <header><Icon name="tasks" /><div><h1>Attività</h1><p>Riepilogo operativo e manutenzione dell'Ordine delle Onde</p></div></header>

      <section className="equipment-panel" aria-label="Attrezzatura della scuola">
        <div className="equipment-heading">
          <div><Icon name="settings" /><span><strong>Attrezzatura</strong><small>{equipmentCondition(state.equipment.wear, state.equipment.damagedSwords)}</small></span></div>
          <strong>{availableSwords}/{state.equipment.totalSwords} spade disponibili</strong>
        </div>
        <div className="equipment-wear-label"><span>Usura complessiva</span><strong>{state.equipment.wear}%</strong></div>
        <div className="equipment-wear" role="progressbar" aria-label="Usura attrezzatura" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.equipment.wear}><span style={{ width: `${state.equipment.wear}%` }} /></div>
        <button className="maintenance-action" type="button" disabled={!canMaintain} onClick={onMaintainEquipment}>{maintenanceLabel}</button>
        {showSupplier ? <div className="official-supplier">
          <div>
            <strong>Fornitura ufficiale · LamaDiLuce</strong>
            <small>Polaris EVO Basic combat-ready · partner tecnico LudoSport</small>
            <p>Modulare, autorizzata per pratica ed eventi ufficiali, con lama marcata per anno. La tesoreria ha già smesso di chiedere se ne bastasse «una da condividere».</p>
            <a href="https://lamadiluce.it/" target="_blank" rel="noreferrer">lamadiluce.it · Abridge S.r.l.</a>
          </div>
          <button type="button" disabled={!canBuyOfficialSword} onClick={onBuyOfficialSword}>{swordPurchaseLabel}</button>
        </div> : null}
      </section>

      {showCollaborators ? <section className="automation-panel" aria-label="Assegnazioni collaboratori">
        <div className="automation-heading"><div><Icon name="people" /><span><strong>Collaboratori delle Onde</strong><small>{state.collaborators.length} disponibili · una assegnazione per persona</small></span></div><b>{state.statistics.automatedCharacters} caratteri automatici</b></div>
        <div className="assignment-grid">
          <Assignment label="Redazione" value={assigned("writing")} />
          <Assignment label="Eventi" value={assigned("events")} />
          <Assignment label="Lezioni" value={assigned("lessons")} />
          <Assignment label="Social" value={assigned("social")} />
          <Assignment label="Attrezzatura" value={assigned("equipment")} />
        </div>
      </section> : null}

      {state.unlocks.social ? <section className="social-panel" aria-label="Campagne Social">
        <div><Icon name="contact" /><span><strong>Social</strong><small>{state.statistics.socialContacts} contatti raccolti online</small></span></div>
        <><div className="social-progress-label"><span>Prossimo contatto passivo</span><strong>{socialProgress}%</strong></div><div className="social-progress" role="progressbar" aria-label="Progresso contatto Social" aria-valuemin={0} aria-valuemax={100} aria-valuenow={socialProgress}><span style={{ width: `${socialProgress}%` }} /></div></>
        <button type="button" disabled={!canRunSocial} onClick={onRunSocialCampaign}>{socialAction}</button>
      </section> : null}

      <section className="operations-report" aria-label="Report operativo">
        <h2>Report della campagna</h2>
        <div className="report-row report-head"><span>Passaggio</span><span>Totale</span><span>Conversione</span></div>
        <ReportRow label="Persone incontrate" value={state.statistics.peopleMet} conversion="—" />
        <ReportRow label="Prove dimostrative" value={state.statistics.demonstrationsGiven} conversion={percentage(state.statistics.demonstrationsGiven, state.statistics.peopleMet)} />
        <ReportRow label="Contatti ottenuti" value={state.statistics.contactsAcquired} conversion={percentage(state.statistics.contactsAcquired, state.statistics.demonstrationsGiven)} />
        <ReportRow label="Email inviate" value={state.statistics.emailsSent} conversion={percentage(state.statistics.emailsSent, state.statistics.contactsAcquired + GAME_CONFIG.initialContacts)} />
        <ReportRow label="Prove prenotate" value={state.statistics.trialsBooked} conversion={percentage(state.statistics.trialsBooked, state.statistics.emailsSent)} />
        <ReportRow label="Nuovi iscritti" value={state.statistics.membersEnrolled} conversion={percentage(state.statistics.membersEnrolled, state.statistics.trialsCompleted)} />
        <ReportRow label="Tempo medio di scrittura" value={`${averageWritingSeconds} s`} conversion={`${state.player.writingPower.toFixed(2)} caratteri/input`} />
        <ReportRow label="Rendimento collaboratori" value={state.statistics.automatedCharacters} conversion={`${state.collaborators.length ? Math.round(state.statistics.automatedCharacters / state.collaborators.length) : 0} caratteri/persona`} />
        <ReportRow label="Andamento iscritti" value={`${(state.statistics.membersEnrolled / campaignHours).toFixed(1)}/h`} conversion={`${Math.round(campaignHours * 10) / 10} h osservate`} />
        {sources.map(([source, label]) => {
          const contacts = state.contacts.filter((contact) => contact.source === source);
          const enrolled = contacts.filter((contact) => contact.status === "enrolled").length;
          return <ReportRow key={source} label={`Conversione · ${label}`} value={enrolled} conversion={percentage(enrolled, contacts.length)} />;
        })}
      </section>

      {earnedAchievements.length > 0 ? <section className="achievement-panel" aria-label="Traguardi">
        <div className="section-heading">
          <div><Icon name="flag" /><span><strong>Traguardi</strong><small>{state.achievements.length}/{ACHIEVEMENTS.length} completati</small></span></div>
        </div>
        <div className="achievement-grid">
          {earnedAchievements.map((achievement) => {
            return (
              <article key={achievement.id} className="earned">
                <span aria-hidden="true">✓</span>
                <div><strong>{achievement.title}</strong><small>{achievement.description}</small></div>
                <b>{euro.format(achievement.euroReward)}</b>
              </article>
            );
          })}
        </div>
      </section> : null}

      {state.narrative.history.length > 0 ? <section className="narrative-panel" aria-label="Cronaca della scuola">
        <div className="section-heading">
          <div><Icon name="mail" /><span><strong>Cronaca della scuola</strong><small>{state.statistics.narrativeEvents} episodi registrati</small></span></div>
        </div>
        <div className="narrative-list">
            {state.narrative.history.slice().reverse().map((event) => (
              <article key={event.id}>
                <div><strong>{event.title}</strong><small>{event.summary}</small></div>
                <time>{new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(event.occurredAt)}</time>
              </article>
            ))}
        </div>
      </section> : null}
    </main>
  );
}

function ReportRow({ label, value, conversion }: { label: string; value: number | string; conversion: string }) {
  return <div className="report-row"><strong>{label}</strong><span>{value}</span><span>{conversion}</span></div>;
}

function Assignment({ label, value }: { label: string; value: number }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
