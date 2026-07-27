import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrashReporter } from "../game/crashReporting";
import { AppErrorBoundary } from "./AppErrorBoundary";

afterEach(() => cleanup());

function BrokenView(): never {
  throw new Error("render failure");
}

describe("AppErrorBoundary", () => {
  it("shows a recovery screen and records React rendering errors", () => {
    const reporter = new CrashReporter({
      storage: localStorage,
      now: () => 1_000,
      createId: (() => {
        const ids = ["session-1", "report-1"];
        return () => ids.shift() ?? "generated-id";
      })(),
      heartbeatIntervalMs: 0,
    });
    reporter.start();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <AppErrorBoundary reporter={reporter}>
        <BrokenView />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole("heading", { name: "LudoClicker si è arrestato" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scarica crash report" })).toBeEnabled();
    expect(screen.getByText("ID report: report-1")).toBeInTheDocument();
    expect(reporter.getLatestReport()).toMatchObject({
      reason: "react-error",
      error: { message: "render failure" },
    });

    consoleError.mockRestore();
    reporter.stop();
  });
});
