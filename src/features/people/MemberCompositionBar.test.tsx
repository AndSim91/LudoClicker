import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemberCompositionBar } from "./MemberCompositionBar";

describe("MemberCompositionBar", () => {
  it("counts people and archive per rarity (A4, 13/10)", () => {
    render(
      <MemberCompositionBar
        members={[{ rarity: "common" }, { rarity: "common" }, { rarity: "rare" }]}
        groups={[{ rarity: "common", source: "event", forms: [], count: 1_929 }]}
      />,
    );

    expect(screen.getByText(/Comuni/).textContent).toMatch(/^Comuni 2 \+ 1\.?929 in archivio$/);
    expect(screen.getByText(/Rari/).textContent).toBe("Rari 1");
    expect(screen.queryByText(/Ultra Rari/)).toBeNull();
  });
});
