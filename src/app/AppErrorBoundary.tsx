import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  crashReporter,
  downloadCrashReport,
  type CrashReport,
  type CrashReporter,
} from "../game/crashReporting";

interface AppErrorBoundaryProps {
  children: ReactNode;
  reporter?: CrashReporter;
}

interface AppErrorBoundaryState {
  crashed: boolean;
  report: CrashReport | null;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { crashed: false, report: null };

  static getDerivedStateFromError(): Partial<AppErrorBoundaryState> {
    return { crashed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    const report = (this.props.reporter ?? crashReporter).recordReactError(
      error,
      info.componentStack ?? "",
    );
    this.setState({ report });
  }

  render() {
    if (!this.state.crashed) return this.props.children;

    return (
      <main className="app-crash-fallback">
        <section role="alert">
          <span className="app-crash-code">ERRORE APPLICAZIONE</span>
          <h1>LudoClicker si è arrestato</h1>
          <p>
            Il crash è stato registrato localmente. Puoi scaricare il report e
            riavviare il gioco senza includere nomi, email o il salvataggio completo.
          </p>
          {this.state.report ? (
            <code>ID report: {this.state.report.reportId}</code>
          ) : null}
          <div>
            <button
              type="button"
              disabled={!this.state.report}
              onClick={() => {
                if (this.state.report) downloadCrashReport(this.state.report);
              }}
            >
              Scarica crash report
            </button>
            <button type="button" className="secondary" onClick={() => window.location.reload()}>
              Ricarica il gioco
            </button>
          </div>
        </section>
      </main>
    );
  }
}
