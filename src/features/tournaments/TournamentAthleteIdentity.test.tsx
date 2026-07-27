import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TournamentParticipant } from "../../game/types";
import { TournamentAthleteIdentity } from "./TournamentAthleteIdentity";

describe("TournamentAthleteIdentity", () => {
  it("keeps every tournament rarity color class on the athlete name", () => {
    const rarities: TournamentParticipant["rarity"][] = [
      "common",
      "rare",
      "ultra-rare",
      "legendary",
      "secret-legendary",
    ];

    render(
      <>
        {rarities.map((rarity) => (
          <TournamentAthleteIdentity
            key={rarity}
            displayName={rarity}
            rarity={rarity}
            schoolName="Scuola esterna"
            schoolCity="Torino"
            owned={false}
          />
        ))}
      </>,
    );

    for (const rarity of rarities) {
      expect(screen.getByText(rarity)).toHaveClass("rarity-name", `rarity-${rarity}`);
    }
  });

  it("uses the application blue variant only for the player's school badge", () => {
    render(
      <>
        <TournamentAthleteIdentity
          displayName="Atleta interno"
          rarity="rare"
          schoolName="Ordine delle Onde — Genova"
          schoolCity="Genova"
          owned
        />
        <TournamentAthleteIdentity
          displayName="Atleta esterno"
          rarity="common"
          schoolName="Ordine della Cripta"
          schoolCity="Milano e Monza"
          owned={false}
        />
      </>,
    );

    const ownedBadge = screen.getByLabelText("Scuola: Ordine delle Onde. Città: Genova");
    expect(ownedBadge).toHaveClass("is-owned");
    expect(ownedBadge).toHaveTextContent("Ordine delle Onde");
    expect(ownedBadge).not.toHaveTextContent("Genova");
    expect(ownedBadge).toHaveAttribute("title", "Città: Genova");

    const externalBadge = screen.getByLabelText(
      "Scuola: Ordine della Cripta. Città: Milano e Monza",
    );
    expect(externalBadge).not.toHaveClass("is-owned");
    expect(externalBadge).toHaveTextContent("Ordine della Cripta");
    expect(externalBadge).toHaveAttribute("title", "Città: Milano e Monza");
  });
});
