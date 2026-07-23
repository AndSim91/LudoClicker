import { useMemo } from "react";
import { Icon } from "../../components/common/Icon";
import { ProgressBar } from "../../components/common/ProgressBar";
import { ACHIEVEMENTS } from "../../content/achievements";
import {
  AUTOMATION_ASSIGNMENTS,
  getCollaboratorAssignmentLabel,
} from "../../content/collaboratorRoles";
import { GAME_CONFIG } from "../../game/config";
import { getAverageWritingSeconds, getSourceSummaries } from "../../game/historyArchive";
import {
  getMonthlySocialIncome,
  getSocialContactChanceCap,
  getSocialContactChance,
  getSocialContentCharacters,
  getSocialFollowerChance,
  getSocialFollowerValue,
} from "../../game/social";
import type { GameState } from "../../game/types";
import { formatCurrency, formatPercent, formatTime } from "../../shared/formatters";
import { getRarityClassName } from "../../shared/rarityPresentation";

function percentage(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function formatFollowerValue(value: number) {
  return `${value.toLocaleString("it-IT", { maximumFractionDigits: 3 })} €`;
}

const CONTACT_SOURCES: Array<[GameState["contacts"][number]["source"], string]> = [
  ["tutorial", "Lista iniziale"],
  ["sparring", "Sparring"],
  ["event", "Eventi"],
  ["social", "Social"],
  ["collaborator", "Collaboratori"],
];

export function ActivitiesView({ state }: { state: GameState }) {
  const assignedCounts = useMemo(() => {
    const counts = new Map<NonNullable<GameState["collaborators"][number]["assignment"]>, number>();
    for (const collaborator of state.collaborators) {
      if (!collaborator.assignment) continue;
      counts.set(collaborator.assignment, (counts.get(collaborator.assignment) ?? 0) + 1);
    }
    return counts;
  }, [state.collaborators]);
  const socialContentCharacters = getSocialContentCharacters(state.upgrades);
  const socialProgress = Math.min(
    100,
    Math.floor(state.automation.socialContentBuffer / socialContentCharacters * 100),
  );
  const socialFollowerChance = getSocialFollowerChance(state.upgrades);
  const socialContactChance = getSocialContactChance(
    state.school.followers,
    state.upgrades,
  );
  const socialContactCap = getSocialContactChanceCap(state.upgrades);
  const socialMonthlyIncome = getMonthlySocialIncome(state);
  const socialFollowerValue = getSocialFollowerValue(state.upgrades);
  const socialCollaborators = assignedCounts.get("writing") ?? 0;
  const averageWritingSeconds = useMemo(
    () => getAverageWritingSeconds(state.emails, state.historyArchive.emails),
    [state.emails, state.historyArchive.emails],
  );
  const campaignHours = Math.max(1 / 60, (state.automation.lastProcessedAt - state.createdAt) / 3_600_000);
  const sourceSummaries = useMemo(
    () => getSourceSummaries(state.contacts, state.historyArchive.contactsBySource),
    [state.contacts, state.historyArchive.contactsBySource],
  );
  const showCollaborators = state.unlocks.collaborators || state.collaborators.length > 0;
  const earnedAchievements = ACHIEVEMENTS.filter((achievement) =>
    state.achievements.includes(achievement.id),
  );
  const narrativeHistory = state.narrative.history
    .slice(-GAME_CONFIG.narrativeHistoryLimit)
    .reverse();

  return (
    <main className="overview-view activities-view">
      <header><Icon name="tasks" /><div><h1>Attività</h1><p>Riepilogo operativo e manutenzione dell'Ordine delle Onde</p></div></header>

      {showCollaborators ? <section className="automation-panel" aria-label="Assegnazioni collaboratori">
        <div className="automation-heading"><div><Icon name="people" /><span><strong>Collaboratori delle Onde</strong><small>{state.collaborators.length} disponibili · una assegnazione per persona</small></span></div><b>{state.statistics.automatedCharacters} caratteri automatici</b></div>
        <div className="assignment-grid">
          {AUTOMATION_ASSIGNMENTS.map((assignment) => (
            <Assignment
              key={assignment}
              label={getCollaboratorAssignmentLabel(assignment, state.unlocks.social)}
              value={assignedCounts.get(assignment) ?? 0}
            />
          ))}
        </div>
      </section> : null}

      {state.unlocks.social ? <section className="social-panel" aria-label="Produzione Social">
        <div><Icon name="contact" /><span><strong>Social</strong><small>{socialCollaborators} collaboratori · email prioritarie · nessun progresso offline</small></span></div>
        <div className="social-metrics">
          <span><small>Follower</small><strong>{state.school.followers}</strong></span>
          <span><small>Nuovo follower</small><strong>{formatPercent(socialFollowerChance)}</strong></span>
          <span><small>Nuovo contatto</small><strong>{formatPercent(socialContactChance)} <small>cap {formatPercent(socialContactCap)}</small></strong></span>
          <span><small>Sponsorizzazioni</small><strong>{formatCurrency(socialMonthlyIncome)} <small>al mese · {formatFollowerValue(socialFollowerValue)}/follower</small></strong></span>
        </div>
        <div className="social-progress-label"><span>Contenuto online · {Math.floor(state.automation.socialContentBuffer).toLocaleString("it-IT")}/{socialContentCharacters.toLocaleString("it-IT")} caratteri</span><strong>{socialProgress}%</strong></div>
        <ProgressBar className="social-progress" label="Progresso contenuto Social" value={socialProgress} />
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
        {CONTACT_SOURCES.map(([source, label]) => {
          const summary = sourceSummaries[source];
          return <ReportRow key={source} label={`Conversione · ${label}`} value={summary.enrolled} conversion={percentage(summary.enrolled, summary.total)} />;
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
                <b>{formatCurrency(achievement.euroReward)}</b>
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
            {narrativeHistory.map((event) => (
              <article key={event.id}>
                <div>
                  <strong>{event.title}</strong>
                  {event.person ? <strong className={`narrative-person rarity-name ${getRarityClassName(event.person.rarity)}`}>{event.person.displayName}</strong> : null}
                  <small>{event.summary}</small>
                </div>
                <time>{formatTime(event.occurredAt)}</time>
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
