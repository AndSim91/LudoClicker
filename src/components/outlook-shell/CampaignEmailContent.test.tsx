import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createInitialState } from "../../game/engine";
import { CampaignEmailContent } from "./CampaignEmailContent";

afterEach(() => cleanup());

describe("CampaignEmailContent", () => {
  it("keeps the initial campaign as plain text", () => {
    const email = createInitialState(1_000, "Andrea Ungaro").emails[0];
    render(<CampaignEmailContent email={email} />);

    expect(screen.getByLabelText("Email in formato Bozza con refusi")).toHaveAttribute(
      "data-email-presentation",
      "0",
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the complete flyer with local imagery and working links", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const email = { ...initial.emails[0], presentationLevel: 6 as const };
    render(<CampaignEmailContent email={email} />);

    expect(screen.getByLabelText("Email in formato Pubblicità vincente")).toHaveAttribute(
      "data-email-presentation",
      "6",
    );
    expect(screen.getByRole("img", { name: "LudoSport Genova" })).toHaveAttribute(
      "src",
      "/email-assets/ludosport-genova.png",
    );
    expect(screen.getByRole("link", { name: "Prenota una prova" })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:genova@ludosport.net"),
    );
    expect(screen.getByText("COME PRENOTARE")).toBeVisible();
    expect(screen.getByText("DA VEDERE")).toBeVisible();
  });
});
