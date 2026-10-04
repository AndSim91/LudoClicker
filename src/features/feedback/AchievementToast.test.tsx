import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { describeAchievementGoal } from "../../content/achievements";
import { createInitialState } from "../../game/engine";
import { AchievementToast } from "./AchievementToast";

afterEach(cleanup);

describe("AchievementToast", () => {
  it("describes what the achievement asked for", () => {
    expect(describeAchievementGoal("people-met:silver")).toBe("100.000 Persone incontrate agli eventi");
    expect(describeAchievementGoal("euros:bronze")).toMatch(/^Euro guadagnati: 10\.000/);
    expect(describeAchievementGoal("exodus")).toBe("Cento iscritti persi in un solo fine anno.");
  });

  it("shows the goal and opens the achievements page on click", () => {
    const initial = createInitialState(1_000);
    const onOpen = vi.fn();
    const { rerender } = render(<AchievementToast state={initial} onOpen={onOpen} />);
    rerender(<AchievementToast state={{ ...initial, achievements: ["people-met:silver"] }} onOpen={onOpen} />);
    expect(screen.getByText("100.000 Persone incontrate agli eventi")).toBeTruthy();
    fireEvent.click(screen.getByText("Strette di mano"));
    expect(onOpen).toHaveBeenCalledOnce();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
