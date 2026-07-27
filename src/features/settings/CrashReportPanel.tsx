import { useEffect, useState } from "react";
import { Icon } from "../../components/common/Icon";
import {
  clearLatestCrashReport,
  CRASH_REPORT_UPDATED_EVENT,
  downloadCrashReport,
  getLatestCrashReport,
  type CrashReason,
  type CrashReport,
} from "../../game/crashReporting";

const REASON_LABELS: Record<CrashReason, string> = {
  "unexpected-termination": "Sessione interrotta in modo anomalo",
  "javascript-error": "Errore JavaScript non gestito",
  "unhandled-rejection": "Operazione asincrona non gestita",
  "react-error": "Errore di rendering React",
};

function formatReportDate(timestamp: number): string {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(timestamp);
}

function formatMebibytes(bytes: number): string {
  return `${(bytes / 1_048_576).toLocaleString("it-IT", {
    maximumFractionDigits: 1,
  })} MiB`;
}

function getTechnicalSummary(report: CrashReport): string[] {
  const state = report.session.runtime.state;
  const memorySamples = report.session.memorySamples;
  const latestMemory = memorySamples.length > 0
    ? memorySamples[memorySamples.length - 1]
    : undefined;
  const lastAction = report.session.recentActions.length > 0
    ? report.session.recentActions[report.session.recentActions.length - 1]
    : undefined;

  return [
    `id: ${report.reportId}`,
    `versione: ${report.session.environment.appVersion}`,
    `vista: ${report.session.runtime.currentView ?? "non disponibile"}`,
    `velocità: ${report.session.runtime.gameSpeed}x`,
    `pausa: ${report.session.runtime.isPaused ? "sì" : "no"}`,
    `ultima azione: ${lastAction?.type ?? "non disponibile"}`,
    latestMemory
      ? `heap JS: ${formatMebibytes(latestMemory.usedJsHeapBytes)} / ${formatMebibytes(latestMemory.jsHeapLimitBytes)}`
      : "heap JS: non disponibile in questo browser",
    state
      ? `entità: ${state.contacts} contatti, ${state.collaborators} collaboratori, ${state.emails} email, ${state.scheduledTrials} prove, ${state.acquisitionEvents} eventi`
      : "entità: non disponibili",
  ];
}

export function CrashReportPanel() {
  const [report, setReport] = useState<CrashReport | null>(() => getLatestCrashReport());
  const [downloadStatus, setDownloadStatus] = useState("");

  useEffect(() => {
    const refresh = () => setReport(getLatestCrashReport());
    window.addEventListener(CRASH_REPORT_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CRASH_REPORT_UPDATED_EVENT, refresh);
  }, []);

  const clearReport = () => {
    clearLatestCrashReport();
    setReport(null);
    setDownloadStatus("");
  };

  return (
    <section
      className="settings-section crash-report-section"
      aria-labelledby="settings-crash-report-title"
    >
      <h2 id="settings-crash-report-title">Diagnostica crash</h2>
      {report ? (
        <div className="crash-report-card is-detected">
          <span className="crash-report-icon"><Icon name="warning" /></span>
          <div className="crash-report-copy">
            <h3>Crash registrato</h3>
            <p>{REASON_LABELS[report.reason]} · {formatReportDate(report.detectedAt)}</p>
            <small>{report.summary}</small>
            {report.error?.message ? <code>{report.error.message}</code> : null}
            <details>
              <summary>Mostra riepilogo tecnico</summary>
              <code>{getTechnicalSummary(report).join(" | ")}</code>
            </details>
          </div>
          <div className="crash-report-actions">
            <button
              type="button"
              onClick={() => {
                const downloaded = downloadCrashReport(report);
                setDownloadStatus(
                  downloaded
                    ? "Report scaricato."
                    : "Download non disponibile in questo browser.",
                );
              }}
            >
              Scarica report
            </button>
            <button type="button" className="secondary" onClick={clearReport}>
              Elimina report
            </button>
          </div>
        </div>
      ) : (
        <div className="crash-report-card">
          <span className="crash-report-icon"><Icon name="check" /></span>
          <div className="crash-report-copy">
            <h3>Nessun crash registrato</h3>
            <p>Il gioco non ha rilevato arresti anomali nelle sessioni recenti.</p>
          </div>
        </div>
      )}
      <p className="crash-report-note">
        Un Out of Memory può chiudere il browser prima che JavaScript riceva un errore:
        in quel caso il report conserva l'ultimo heartbeat, le azioni recenti e i conteggi
        della partita. Non include nomi, email o il salvataggio completo.
      </p>
      {downloadStatus ? <p role="status" className="settings-status">{downloadStatus}</p> : null}
    </section>
  );
}
