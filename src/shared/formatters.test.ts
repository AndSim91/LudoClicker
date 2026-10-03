import { describe, expect, it } from "vitest";
import { formatTournamentCountdown } from "../features/tournaments/tournamentPresentation";
import { formatCurrency, formatStat, formatVote } from "./formatters";

const plain = (text: string) => text.replace(/\s/g, " ");

describe("number formatting (Fase 8)", () => {
  it("drops cents from 10.000 € up", () => {
    expect(plain(formatCurrency(20))).toBe("20,00 €");
    expect(plain(formatCurrency(9_999.5))).toBe("9.999,50 €");
    expect(plain(formatCurrency(2_710_163.55))).toBe("2.710.164 €");
  });

  it("shows Arena and Stile as whole numbers and votes with two decimals", () => {
    expect(formatStat(1822.4)).toBe("1.822");
    expect(formatVote(7.349)).toBe("7,35");
  });

  it("counts down like a clock", () => {
    expect(formatTournamentCountdown(96_000)).toBe("1:36");
    expect(formatTournamentCountdown(7_509_000)).toBe("2:05:09");
    expect(formatTournamentCountdown(3 * 86_400_000 + 4 * 3_600_000)).toBe("3 g 4 h");
  });
});
