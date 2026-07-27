import { APP_VERSION } from "../shared/appVersion";
import { STORAGE_KEYS } from "../shared/storageKeys";
import type { GameAction, GameState } from "./types";

export const CRASH_REPORT_UPDATED_EVENT = "ludoclicker:crash-report-updated";

const CRASH_REPORT_SCHEMA_VERSION = 1;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 10_000;
const MAX_ACTION_BREADCRUMBS = 12;
const MAX_MEMORY_SAMPLES = 6;
const MAX_ERROR_NAME_LENGTH = 120;
const MAX_ERROR_MESSAGE_LENGTH = 800;
const MAX_ERROR_STACK_LENGTH = 4_000;
const MAX_COMPONENT_STACK_LENGTH = 2_000;
const MAX_USER_AGENT_LENGTH = 300;

export type CrashReason =
  | "unexpected-termination"
  | "javascript-error"
  | "unhandled-rejection"
  | "react-error";

export type CrashSessionStatus = "running" | "crashed" | "clean";

export interface CrashMemorySample {
  sampledAt: number;
  usedJsHeapBytes: number;
  totalJsHeapBytes: number;
  jsHeapLimitBytes: number;
}

export interface CrashActionBreadcrumb {
  type: GameAction["type"];
  wallAt: number;
  gameAt: number | null;
}

export interface CrashStateSummary {
  saveVersion: number;
  lastSavedAt: number;
  automationLastProcessedAt: number;
  currentMonth: number;
  activeMembers: number;
  historicMembers: number;
  contacts: number;
  collaborators: number;
  emails: number;
  pendingEmailOutcomes: number;
  scheduledTrials: number;
  acquisitionEvents: number;
  messages: number;
  emailsSent: number;
  trialsCompleted: number;
  eventsCompleted: number;
}

export interface CrashRuntimeContext {
  currentView: string | null;
  gameSpeed: number;
  isPaused: boolean;
  state: CrashStateSummary | null;
}

export interface CrashEnvironment {
  appVersion: string;
  userAgent: string;
  language: string;
  viewportWidth: number;
  viewportHeight: number;
}

export interface CrashSessionSnapshot {
  schemaVersion: typeof CRASH_REPORT_SCHEMA_VERSION;
  sessionId: string;
  status: CrashSessionStatus;
  startedAt: number;
  heartbeatAt: number;
  environment: CrashEnvironment;
  runtime: CrashRuntimeContext;
  recentActions: CrashActionBreadcrumb[];
  memorySamples: CrashMemorySample[];
}

export interface CrashErrorDetails {
  name: string;
  message: string;
  stack: string;
  componentStack: string;
}

export interface CrashReport {
  schemaVersion: typeof CRASH_REPORT_SCHEMA_VERSION;
  reportId: string;
  detectedAt: number;
  reason: CrashReason;
  summary: string;
  error: CrashErrorDetails | null;
  session: CrashSessionSnapshot;
}

interface MemoryMetrics {
  usedJsHeapBytes: number;
  totalJsHeapBytes: number;
  jsHeapLimitBytes: number;
}

interface CrashReporterOptions {
  storage?: Storage;
  now?: () => number;
  createId?: () => string;
  heartbeatIntervalMs?: number;
  readMemory?: () => MemoryMetrics | null;
  readEnvironment?: () => CrashEnvironment;
}

function clampText(value: string, maximumLength: number): string {
  return value.slice(0, maximumLength);
}

function createRuntimeContext(): CrashRuntimeContext {
  return {
    currentView: null,
    gameSpeed: 1,
    isPaused: false,
    state: null,
  };
}

function readDefaultEnvironment(): CrashEnvironment {
  return {
    appVersion: APP_VERSION,
    userAgent:
      typeof navigator === "undefined"
        ? ""
        : clampText(navigator.userAgent, MAX_USER_AGENT_LENGTH),
    language: typeof navigator === "undefined" ? "" : navigator.language,
    viewportWidth: typeof window === "undefined" ? 0 : window.innerWidth,
    viewportHeight: typeof window === "undefined" ? 0 : window.innerHeight,
  };
}

function readDefaultMemory(): MemoryMetrics | null {
  if (typeof performance === "undefined") return null;
  const memory = (
    performance as Performance & {
      memory?: {
        usedJSHeapSize?: number;
        totalJSHeapSize?: number;
        jsHeapSizeLimit?: number;
      };
    }
  ).memory;
  if (
    !memory ||
    !Number.isFinite(memory.usedJSHeapSize) ||
    !Number.isFinite(memory.totalJSHeapSize) ||
    !Number.isFinite(memory.jsHeapSizeLimit)
  ) {
    return null;
  }
  return {
    usedJsHeapBytes: Math.max(0, memory.usedJSHeapSize ?? 0),
    totalJsHeapBytes: Math.max(0, memory.totalJSHeapSize ?? 0),
    jsHeapLimitBytes: Math.max(0, memory.jsHeapSizeLimit ?? 0),
  };
}

function createDefaultId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function summarizeGameState(state: GameState): CrashStateSummary {
  return {
    saveVersion: state.version,
    lastSavedAt: state.lastSavedAt,
    automationLastProcessedAt: state.automation.lastProcessedAt,
    currentMonth: state.school.currentMonth,
    activeMembers: state.school.activeMembers,
    historicMembers: state.school.historicMembers,
    contacts: state.contacts.length,
    collaborators: state.collaborators.length,
    emails: state.emails.length,
    pendingEmailOutcomes: state.pendingEmailOutcomes.length,
    scheduledTrials: state.scheduledTrials.length,
    acquisitionEvents: state.acquisitionEvents.length,
    messages: state.messages.length,
    emailsSent: state.statistics.emailsSent,
    trialsCompleted: state.statistics.trialsCompleted,
    eventsCompleted: state.statistics.eventsCompleted,
  };
}

function readErrorText(error: unknown, property: "name" | "message" | "stack"): string {
  if (typeof error !== "object" || error === null || !(property in error)) return "";
  const value = (error as Record<string, unknown>)[property];
  return typeof value === "string" ? value : "";
}

function createErrorDetails(error: unknown, componentStack = ""): CrashErrorDetails {
  const name = readErrorText(error, "name") || typeof error;
  const message = readErrorText(error, "message") || String(error);
  return {
    name: clampText(name, MAX_ERROR_NAME_LENGTH),
    message: clampText(message, MAX_ERROR_MESSAGE_LENGTH),
    stack: clampText(readErrorText(error, "stack"), MAX_ERROR_STACK_LENGTH),
    componentStack: clampText(componentStack, MAX_COMPONENT_STACK_LENGTH),
  };
}

function getCrashSummary(reason: CrashReason): string {
  switch (reason) {
    case "unexpected-termination":
      return "La sessione precedente si è interrotta senza una chiusura regolare.";
    case "unhandled-rejection":
      return "Una operazione asincrona è terminata con un errore non gestito.";
    case "react-error":
      return "React ha intercettato un errore durante il rendering dell'interfaccia.";
    default:
      return "Il browser ha segnalato un errore JavaScript non gestito.";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCrashSession(value: unknown): value is CrashSessionSnapshot {
  return (
    isRecord(value) &&
    value.schemaVersion === CRASH_REPORT_SCHEMA_VERSION &&
    typeof value.sessionId === "string" &&
    (value.status === "running" || value.status === "crashed" || value.status === "clean") &&
    typeof value.startedAt === "number" &&
    typeof value.heartbeatAt === "number"
  );
}

function isCrashReport(value: unknown): value is CrashReport {
  return (
    isRecord(value) &&
    value.schemaVersion === CRASH_REPORT_SCHEMA_VERSION &&
    typeof value.reportId === "string" &&
    typeof value.detectedAt === "number" &&
    isCrashSession(value.session)
  );
}

export class CrashReporter {
  private readonly storageOverride?: Storage;
  private readonly now: () => number;
  private readonly createId: () => string;
  private readonly heartbeatIntervalMs: number;
  private readonly readMemory: () => MemoryMetrics | null;
  private readonly readEnvironment: () => CrashEnvironment;
  private heartbeatId: number | undefined;
  private session: CrashSessionSnapshot | null = null;
  private latestInMemory: CrashReport | null = null;
  private latestGameState: GameState | null = null;
  private runtime = createRuntimeContext();
  private recentActions: CrashActionBreadcrumb[] = [];
  private started = false;

  constructor(options: CrashReporterOptions = {}) {
    this.storageOverride = options.storage;
    this.now = options.now ?? (() => Date.now());
    this.createId = options.createId ?? createDefaultId;
    this.heartbeatIntervalMs =
      options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
    this.readMemory = options.readMemory ?? readDefaultMemory;
    this.readEnvironment = options.readEnvironment ?? readDefaultEnvironment;
  }

  start(): CrashReport | null {
    if (this.started) return this.getLatestReport();
    this.started = true;

    const previousSession = this.readSession();
    if (previousSession?.status === "running") {
      this.persistReport(
        this.createReport("unexpected-termination", previousSession, null),
      );
    }

    const now = this.now();
    this.recentActions = [];
    this.session = {
      schemaVersion: CRASH_REPORT_SCHEMA_VERSION,
      sessionId: this.createId(),
      status: "running",
      startedAt: now,
      heartbeatAt: now,
      environment: this.readEnvironment(),
      runtime: this.runtime,
      recentActions: [],
      memorySamples: [],
    };
    this.captureHeartbeat();
    this.installWindowListeners();
    if (this.heartbeatIntervalMs > 0 && typeof window !== "undefined") {
      this.heartbeatId = window.setInterval(
        () => this.captureHeartbeat(),
        this.heartbeatIntervalMs,
      );
    }
    return this.getLatestReport();
  }

  stop(markClean = true): void {
    if (!this.started) return;
    if (this.heartbeatId !== undefined && typeof window !== "undefined") {
      window.clearInterval(this.heartbeatId);
      this.heartbeatId = undefined;
    }
    this.removeWindowListeners();
    if (markClean) this.markClean();
    this.started = false;
  }

  updateGameState(state: GameState): void {
    this.latestGameState = state;
  }

  updateRuntimeState(gameSpeed: number, isPaused: boolean): void {
    this.runtime = { ...this.runtime, gameSpeed, isPaused };
  }

  updateView(currentView: string): void {
    this.runtime = { ...this.runtime, currentView };
  }

  recordAction(action: GameAction): void {
    const gameAt = "now" in action && typeof action.now === "number" ? action.now : null;
    this.recentActions.push({ type: action.type, wallAt: this.now(), gameAt });
    if (this.recentActions.length > MAX_ACTION_BREADCRUMBS) {
      this.recentActions.splice(
        0,
        this.recentActions.length - MAX_ACTION_BREADCRUMBS,
      );
    }
  }

  recordError(
    reason: Exclude<CrashReason, "unexpected-termination">,
    error: unknown,
    componentStack = "",
  ): CrashReport {
    if (!this.session) this.createAdHocSession();
    const now = this.now();
    this.syncRuntimeContext();
    this.session = {
      ...this.session!,
      status: "crashed",
      heartbeatAt: now,
    };
    this.appendMemorySample(now);
    this.persistSession();
    const report = this.createReport(
      reason,
      this.session,
      createErrorDetails(error, componentStack),
    );
    this.persistReport(report);
    return report;
  }

  recordReactError(error: unknown, componentStack = ""): CrashReport {
    return this.recordError("react-error", error, componentStack);
  }

  captureHeartbeat(): void {
    if (!this.session) return;
    const now = this.now();
    this.syncRuntimeContext();
    this.session = { ...this.session, heartbeatAt: now };
    this.appendMemorySample(now);
    this.persistSession();
  }

  markClean(): void {
    if (!this.session) return;
    this.syncRuntimeContext();
    this.session = {
      ...this.session,
      status: "clean",
      heartbeatAt: this.now(),
    };
    this.persistSession();
  }

  getLatestReport(): CrashReport | null {
    const stored = this.readKey(STORAGE_KEYS.crashReport);
    if (stored === null) return this.latestInMemory;
    if (stored !== undefined) {
      try {
        const parsed: unknown = JSON.parse(stored);
        return isCrashReport(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return this.latestInMemory;
  }

  clearLatestReport(): void {
    this.latestInMemory = null;
    this.removeKey(STORAGE_KEYS.crashReport);
    this.notifyReportUpdated();
  }

  private createAdHocSession(): void {
    const now = this.now();
    this.session = {
      schemaVersion: CRASH_REPORT_SCHEMA_VERSION,
      sessionId: this.createId(),
      status: "running",
      startedAt: now,
      heartbeatAt: now,
      environment: this.readEnvironment(),
      runtime: this.runtime,
      recentActions: this.recentActions,
      memorySamples: [],
    };
  }

  private createReport(
    reason: CrashReason,
    session: CrashSessionSnapshot,
    error: CrashErrorDetails | null,
  ): CrashReport {
    return {
      schemaVersion: CRASH_REPORT_SCHEMA_VERSION,
      reportId: this.createId(),
      detectedAt: this.now(),
      reason,
      summary: getCrashSummary(reason),
      error,
      session,
    };
  }

  private syncRuntimeContext(): void {
    if (!this.session) return;
    if (this.latestGameState) {
      this.runtime = {
        ...this.runtime,
        state: summarizeGameState(this.latestGameState),
      };
    }
    this.session = {
      ...this.session,
      runtime: this.runtime,
      recentActions: [...this.recentActions],
    };
  }

  private appendMemorySample(sampledAt: number): void {
    if (!this.session) return;
    const memory = this.readMemory();
    if (!memory) return;
    this.session = {
      ...this.session,
      memorySamples: [
        ...this.session.memorySamples,
        { sampledAt, ...memory },
      ].slice(-MAX_MEMORY_SAMPLES),
    };
  }

  private readSession(): CrashSessionSnapshot | null {
    const stored = this.readKey(STORAGE_KEYS.crashSession);
    if (!stored) return null;
    try {
      const parsed: unknown = JSON.parse(stored);
      return isCrashSession(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private persistSession(): void {
    if (!this.session) return;
    this.writeKey(STORAGE_KEYS.crashSession, JSON.stringify(this.session));
  }

  private persistReport(report: CrashReport): void {
    this.latestInMemory = report;
    this.writeKey(STORAGE_KEYS.crashReport, JSON.stringify(report));
    this.notifyReportUpdated();
  }

  private getStorage(): Storage | undefined {
    if (this.storageOverride) return this.storageOverride;
    if (typeof window === "undefined") return undefined;
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  }

  private readKey(key: string): string | null | undefined {
    try {
      return this.getStorage()?.getItem(key);
    } catch {
      return undefined;
    }
  }

  private writeKey(key: string, value: string): void {
    try {
      this.getStorage()?.setItem(key, value);
    } catch {
      // Il reporter deve restare innocuo anche se lo storage è pieno o negato.
    }
  }

  private removeKey(key: string): void {
    try {
      this.getStorage()?.removeItem(key);
    } catch {
      // Nessun errore diagnostico deve propagarsi verso il gioco.
    }
  }

  private notifyReportUpdated(): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(CRASH_REPORT_UPDATED_EVENT));
    }
  }

  private readonly handleWindowError = (event: ErrorEvent) => {
    const error = event.error ?? new Error(event.message || "Errore JavaScript sconosciuto");
    this.recordError("javascript-error", error);
  };

  private readonly handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    this.recordError("unhandled-rejection", event.reason);
  };

  private readonly handlePageExit = () => this.markClean();

  private readonly handlePageShow = () => {
    if (!this.session || this.session.status !== "clean") return;
    this.session = { ...this.session, status: "running" };
    this.captureHeartbeat();
  };

  private installWindowListeners(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
    window.addEventListener("beforeunload", this.handlePageExit);
    window.addEventListener("pagehide", this.handlePageExit);
    window.addEventListener("pageshow", this.handlePageShow);
  }

  private removeWindowListeners(): void {
    if (typeof window === "undefined") return;
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
    window.removeEventListener("beforeunload", this.handlePageExit);
    window.removeEventListener("pagehide", this.handlePageExit);
    window.removeEventListener("pageshow", this.handlePageShow);
  }
}

export function downloadCrashReport(report: CrashReport): boolean {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    return false;
  }
  const serialized = JSON.stringify(report, null, 2);
  const blob = new Blob([serialized], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ludoclicker-crash-${new Date(report.detectedAt)
    .toISOString()
    .replace(/[:.]/g, "-")}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

export const crashReporter = new CrashReporter();

export function initializeCrashReporting(): CrashReport | null {
  return crashReporter.start();
}

export function getLatestCrashReport(): CrashReport | null {
  return crashReporter.getLatestReport();
}

export function clearLatestCrashReport(): void {
  crashReporter.clearLatestReport();
}
