import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import { UpgradesView } from "./UpgradesView";

describe("UpgradesView", () => {
  it("renders every data-driven upgrade branch", () => {
    render(<UpgradesView state={createInitialState(1_000)} onBuyUpgrade={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Velocità di scrittura" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Carisma" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Scrittura" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Accoglienza" })).toBeVisible();
    expect(screen.getAllByText("Prezzo")).toHaveLength(4);
    expect(screen.getByText(/15,00/)).toBeVisible();
    expect(screen.getAllByRole("button", { name: /Fondi insufficienti/ })).toHaveLength(4);
  });

  it("allows a funded purchase without a member-gated unlock", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, euros: 50 },
    };
    const onBuyUpgrade = vi.fn();
    render(<UpgradesView state={state} onBuyUpgrade={onBuyUpgrade} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Acquista.*Presentazione preparata/ }),
    );

    expect(onBuyUpgrade).toHaveBeenCalledOnce();
    expect(onBuyUpgrade).toHaveBeenCalledWith("prepared-presentation");
  });
});
