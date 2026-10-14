import { describe, expect, it } from "vitest";
import { migrateClosingPauseState } from "./closingPause";
import type { MigratableState } from "./types";

describe("migrateClosingPauseState", () => {
  it("renames the contact buffer and drops the old closing summaries", () => {
    const migrated = migrateClosingPauseState({
      version: 113,
      automation: { offlineContactBuffer: 0.4, lessonBuffer: 1 },
      messages: [
        { id: "a", subject: "Riepilogo attività offline", threadKey: "offline" },
        { id: "b", subject: "Riepilogo attività offline" },
        { id: "c", subject: "Benvenuto" },
      ],
    } as unknown as MigratableState) as unknown as {
      version: number; automation: Record<string, number>; messages: { id: string }[];
    };
    expect(migrated.version).toBe(114);
    expect(migrated.automation).toEqual({ contactGainBuffer: 0.4, lessonBuffer: 1 });
    expect(migrated.messages.map((message) => message.id)).toEqual(["c"]);
  });
});
