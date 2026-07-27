import { beforeEach, describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import { CrashReporter } from "./crashReporting";

function createReporter(
  now: () => number,
  ids: string[],
  readMemory = () => ({
    usedJsHeapBytes: 100,
    totalJsHeapBytes: 200,
    jsHeapLimitBytes: 1_000,
  }),
) {
  let nextId = 0;
  return new CrashReporter({
    storage: localStorage,
    now,
    createId: () => ids[nextId++] ?? `generated-${nextId}`,
    heartbeatIntervalMs: 0,
    readMemory,
    readEnvironment: () => ({
      appVersion: "test-version",
      userAgent: "test-browser",
      language: "it-IT",
      viewportWidth: 1280,
      viewportHeight: 720,
    }),
  });
}

describe("CrashReporter", () => {
  beforeEach(() => localStorage.clear());

  it("creates a report on the next launch when the previous session never closed", () => {
    let now = 1_000;
    const first = createReporter(() => now, ["session-1"]);
    first.start();
    const state = createInitialState(now, "Nome che non deve finire nel report");
    first.updateGameState(state);
    first.updateRuntimeState(50, false);
    first.updateView("events");
    first.recordAction({ type: "MARK_MESSAGE_READ", messageId: "private-message-id" });
    now = 1_500;
    first.captureHeartbeat();
    first.stop(false);

    now = 2_000;
    const second = createReporter(() => now, ["report-1", "session-2"]);
    const report = second.start();

    expect(report).toMatchObject({
      reportId: "report-1",
      reason: "unexpected-termination",
      session: {
        sessionId: "session-1",
        runtime: { currentView: "events", gameSpeed: 50 },
      },
    });
    expect(report?.session.runtime.state?.contacts).toBe(state.contacts.length);
    expect(report?.session.recentActions).toEqual([
      { type: "MARK_MESSAGE_READ", wallAt: 1_000, gameAt: null },
    ]);
    expect(JSON.stringify(report)).not.toContain("Nome che non deve finire nel report");
    expect(JSON.stringify(report)).not.toContain("private-message-id");
    second.stop();
  });

  it("does not report a session that closed normally", () => {
    let now = 1_000;
    const first = createReporter(() => now, ["session-1"]);
    first.start();
    now = 1_500;
    first.stop();

    now = 2_000;
    const second = createReporter(() => now, ["session-2"]);
    expect(second.start()).toBeNull();
    second.stop();
  });

  it("keeps bounded actions, memory samples and error text", () => {
    let now = 1_000;
    const reporter = createReporter(() => now, ["session-1", "report-1"]);
    reporter.start();
    for (let index = 0; index < 15; index += 1) {
      reporter.recordAction({
        type: "MARK_MESSAGE_READ",
        messageId: `private-${index}`,
      });
      now += 10;
      reporter.captureHeartbeat();
    }

    const report = reporter.recordError(
      "javascript-error",
      new Error("x".repeat(1_000)),
    );

    expect(report.session.recentActions).toHaveLength(12);
    expect(report.session.memorySamples).toHaveLength(6);
    expect(report.error?.message).toHaveLength(800);
    expect(JSON.stringify(report)).not.toContain("private-14");
    reporter.stop();
  });

  it("captures global browser errors and allows deleting the report", () => {
    const reporter = createReporter(() => 1_000, ["session-1", "report-1"]);
    reporter.start();

    window.dispatchEvent(new ErrorEvent("error", {
      error: new Error("browser boom"),
      message: "browser boom",
    }));

    expect(reporter.getLatestReport()).toMatchObject({
      reason: "javascript-error",
      error: { message: "browser boom" },
    });
    reporter.clearLatestReport();
    expect(reporter.getLatestReport()).toBeNull();
    reporter.stop();
  });
});
