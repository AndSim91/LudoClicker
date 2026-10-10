import { describe, expect, it } from "vitest";
import { normalizeLegacySave } from "./normalize";
import type { MigratableState } from "./types";

describe("normalizeLegacySave", () => {
  it("rinomina il vecchio mittente di sistema in LudoClicker", () => {
    const state = {
      messages: [
        { id: "a", sender: "Sistema Oggetto: Nuovi Iscritti" },
        { id: "b", sender: "A.N.D.E.R." },
      ],
    } as unknown as MigratableState;
    const senders = normalizeLegacySave(state).messages?.map((message) => message.sender);
    expect(senders).toEqual(["Sistema LudoClicker", "A.N.D.E.R."]);
  });
});
