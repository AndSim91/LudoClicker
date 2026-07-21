import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../../game/config";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("shows a determinate value for progress at least as long as a visual update", () => {
    render(
      <ProgressBar
        className="test-progress"
        label="Progresso test"
        value={35}
        durationMs={GAME_CONFIG.progressUpdateIntervalMs}
        valueText="35 punti completati"
      />,
    );

    const progress = screen.getByRole("progressbar", { name: "Progresso test" });
    expect(progress).toHaveAttribute("aria-valuenow", "35");
    expect(progress).toHaveAttribute("aria-valuetext", "35 punti completati");
    expect(progress).not.toHaveClass("is-indeterminate");
    expect(progress.firstElementChild).toHaveStyle({
      width: "35%",
      "--progress-transition-duration": `${GAME_CONFIG.progressUpdateIntervalMs}ms`,
    });
  });

  it("interpolates engine-driven progress over the whole game tick", () => {
    render(<ProgressBar label="Progresso automazione" value={25} />);

    const progress = screen.getByRole("progressbar", { name: "Progresso automazione" });
    expect(progress.firstElementChild).toHaveStyle({
      width: "25%",
      "--progress-transition-duration": `${GAME_CONFIG.gameTickMs}ms`,
    });
  });

  it("uses the striped indeterminate state below one visual update", () => {
    render(
      <ProgressBar
        label="Progresso rapido"
        value={70}
        durationMs={GAME_CONFIG.progressUpdateIntervalMs - 1}
      />,
    );

    const progress = screen.getByRole("progressbar", { name: "Progresso rapido" });
    expect(progress).toHaveClass("progress-bar-linear", "is-indeterminate");
    expect(progress).not.toHaveAttribute("aria-valuenow");
    expect(progress).toHaveAttribute("aria-valuetext", "Avanzamento in corso");
  });

  it("renders circular progress through the same component", () => {
    render(<ProgressBar variant="circular" label="Verso Iniziato" value={25} />);

    const progress = screen.getByRole("progressbar", { name: "Verso Iniziato" });
    expect(progress).toHaveClass("progress-bar-circular");
    expect(progress.style.getPropertyValue("--progress-value")).toBe("25%");
  });
});
