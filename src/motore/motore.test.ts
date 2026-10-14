import { describe, expect, it } from "vitest";
import { createInitialState } from "../game/initialState";
import { distribuzione, analizza } from "./analisi";
import { distribuzioneACascata } from "./giocatoreMedio";
import { giocaPartita } from "./partita";
import { creaReport } from "./report";

describe("motore di test", () => {
  it("calcola mediana e code su 10 valori, contando chi non arriva", () => {
    expect(distribuzione([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, undefined])).toEqual({
      partite: 11, raggiunte: 10, p10: 1, p50: 5, p90: 9,
    });
    expect(distribuzione([undefined])).toEqual({ partite: 1, raggiunte: 0 });
  });

  it("distribuisce i collaboratori a cascata: Istruttori > Scrittura > Eventi > Attrezzatura", () => {
    const initial = createInitialState(1_000, "Test");
    const people = Array.from({ length: 6 }, (_, index) => ({ ...initial.collaborators[0], id: `c${index}` }));
    const state = { ...initial, collaborators: people, unlocks: { ...initial.unlocks, forms: true } };
    expect(distribuzioneACascata(state)).toEqual([
      "instructor", "writing", "events", "equipment", "instructor", "writing",
    ]);
  });

  it("gioca 15 minuti senza errori, registra le tappe e produce il report", () => {
    const registro = giocaPartita({ seed: 3, maxScuole: 1, maxOre: 0.25 });
    expect(registro.errori).toEqual([]);
    expect(registro.eventi.some((evento) => evento.tipo === "iscritti" && evento.chiave === "10")).toBe(true);
    const html = creaReport(analizza([registro]), { creato: "oggi", partite: 1, scuole: 1, secondi: 1, versione: "test" });
    expect(html).toContain("Tappe della storia");
  }, 120_000);
});
