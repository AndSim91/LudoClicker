import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KeywordText } from "./KeywordText";

describe("KeywordText", () => {
  it("puts the resource icon only before resource words in bold", () => {
    const { container } = render(
      <KeywordText text="**Iscritti**, **Spada**, **Contatto**, **Fondi**, **Fama**, **Reputazione**, **follower** e **Forme**" />,
    );
    const resources = [...container.querySelectorAll("strong")].map((bold) => [
      bold.textContent,
      bold.dataset.resource,
      bold.querySelector("svg") !== null,
    ]);
    expect(resources).toEqual([
      ["Iscritti", "people", true],
      ["Spada", "saber", true],
      ["Contatto", "mail", true],
      ["Fondi", "euro", true],
      ["Fama", "star", true],
      ["Reputazione", "crest", true],
      ["follower", "heart", true],
      ["Forme", undefined, false],
    ]);
  });
});
