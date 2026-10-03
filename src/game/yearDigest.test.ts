import { describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import { isValidGameState } from "./saveValidation";
import type { GameState } from "./types";
import { noteNarrativeEvent, syncYearDigest } from "./yearDigest";

function grow(state: GameState, month: number, added: Partial<GameState["statistics"]>): GameState {
  const statistics = { ...state.statistics };
  for (const [key, value] of Object.entries(added)) {
    (statistics as unknown as Record<string, number>)[key] += value as number;
  }
  return { ...state, school: { ...state.school, currentMonth: month }, statistics };
}

describe("Riepilogo dell'anno scolastico (4.1)", () => {
  it("opens silently, appears with the first news and refreshes in place every month", () => {
    const opened = syncYearDigest(createInitialState(1_000), 1_000);
    expect(opened.yearDigest).toMatchObject({ schoolYear: 1, month: 9 });
    expect(opened.messages.some((message) => message.digest)).toBe(false);

    const october = syncYearDigest(grow(opened, 10, { membersEnrolled: 5, contactsAcquired: 40 }), 2_000);
    const digest = october.messages[0];
    expect(digest).toMatchObject({
      subject: "Riepilogo dell'anno scolastico 1",
      preview: "+5 iscritti · 40 contatti",
      category: "focused",
      unread: true,
    });

    const withStory = noteNarrativeEvent(october, "Passaparola inatteso");
    const november = syncYearDigest(
      grow({ ...withStory, messages: [{ ...withStory.messages[0], unread: false }, ...withStory.messages.slice(1)] }, 11, { formsCompleted: 3 }),
      3_000,
    );
    expect(november.messages.filter((message) => message.digest)).toHaveLength(1);
    expect(november.messages[0]).toMatchObject({
      id: digest.id,
      unread: false,
      digest: { members: 5, forms: 3, contacts: 40, narrative: 1, lastNarrative: "Passaparola inatteso" },
    });
    expect(syncYearDigest(november, 3_500)).toBe(november);
    expect(isValidGameState(november)).toBe(true);
  });

  it("closes the year into «Altra», departures included, and starts again", () => {
    const opened = syncYearDigest(createInitialState(1_000), 1_000);
    const spring = syncYearDigest(grow(opened, 12, { membersEnrolled: 2 }), 2_000);
    const nextYear = syncYearDigest(grow(spring, 21, { membersDeparted: 38 }), 3_000);

    const closed = nextYear.messages.find((message) => message.subject === "Riepilogo dell'anno scolastico 1");
    expect(closed).toMatchObject({ category: "other", digest: { members: 2, departures: 38 } });
    expect(nextYear.yearDigest).toMatchObject({ schoolYear: 2 });
    expect(nextYear.messages.some((message) => message.subject === "Riepilogo dell'anno scolastico 2")).toBe(false);
  });
});
