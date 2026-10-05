import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { TournamentMatch, TournamentParticipant } from "../../game/types";
import { StyleJudgeSheet } from "./StyleJudgeSheet";

afterEach(cleanup);

const athlete = (id: string, firstName: string, owned: boolean): TournamentParticipant => ({
  id,
  ...(owned ? { ownedContactId: `contact-${id}` } : {}),
  firstName,
  lastName: "Prova",
  schoolName: "Ordine delle Onde",
  city: "Genova",
  rarity: "rare",
  numericForms: 3,
  experience: 0,
  arenaBase: 100,
  styleBase: 100,
  arenaPreparation: 130,
  stylePreparation: 130,
  condition: 1,
});

const match: TournamentMatch = {
  id: "match-semifinal-0-1",
  stage: "semifinal",
  participantAId: "a",
  participantBId: "b",
  arenaScoreA: 2,
  arenaScoreB: 0,
  styleScoreA: 7.75,
  styleScoreB: 7.1,
  styleDetailA: {
    sheets: [
      [2, 3, 2.5, 1, 0, 2.5, 0, 1, 0],
      [2, 3, 2, 1, 0, 2, 0, 2, 0],
    ],
    technique: "Quarta Armonica",
  },
  stylePenaltyB: "cura",
  winnerId: "a",
};

it("shows our athlete's sheet, judges and codes, and only the vote for the opponent", () => {
  render(<StyleJudgeSheet match={match} a={athlete("a", "Giulia", true)} b={athlete("b", "Simone", false)} />);

  expect(screen.getByText("7,75")).toBeVisible();
  expect(screen.getByText(/Quarta Armonica/)).toBeVisible();
  expect(screen.getByText("cn22w1")).toBeVisible();
  expect(screen.getByText("Giudice 1")).toBeVisible();
  expect(screen.getByText(/Simone Prova · Cura · −0,5/)).toBeVisible();
  expect(screen.getAllByRole("img", { name: "Cartellino di Stile: Cura, −0,5" })).toHaveLength(2);
});

it("stays hidden for matches recorded before the judges", () => {
  const { container } = render(
    <StyleJudgeSheet
      match={{ ...match, styleDetailA: undefined, stylePenaltyB: undefined }}
      a={athlete("a", "Giulia", true)}
      b={athlete("b", "Simone", false)}
    />,
  );
  expect(container).toBeEmptyDOMElement();
});
