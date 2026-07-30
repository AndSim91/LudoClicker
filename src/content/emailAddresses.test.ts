import { describe, expect, it } from "vitest";
import { createLegendaryEmailAddress } from "./emailAddresses";

describe("Legendary email addresses", () => {
  it.each([
    ["Andrea", "Simonazzi", "andrea.simonazzi@ludosport.net"],
    ["Niccolò", "Efrati", "niccolo.efrati@ludosport.net"],
    ["Francesco", "D'Addosio", "francesco.daddosio@ludosport.net"],
    ["Carlos", "Jiménez Moyano", "carlos.jimenez.moyano@ludosport.net"],
  ])("formats %s %s with the LudoSport domain", (firstName, lastName, expected) => {
    expect(createLegendaryEmailAddress(firstName, lastName)).toBe(expected);
  });
});
