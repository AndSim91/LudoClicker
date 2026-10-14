/**
 * Una partita del motore di test: il giocatore medio gioca dalla prima scuola
 * fino alla scuola n. `maxScuole`, e il registro annota tutto ciò che serve
 * alle domande (Project: claude/motore-domande.md). Il tempo è quello effettivo
 * del giocatore: un secondo di gioco vale 1/velocità secondi, le finestre che
 * fermano il gioco costano mezzo minuto a gioco fermo.
 */
import { getMaxGameSpeed, UPGRADE_DEFINITIONS } from "../content/upgrades";
import { getPrestigeReputationPreview } from "../game/reputation";
import { getSchoolYear } from "../game/calendar";
import { createInitialState } from "../game/initialState";
import { canFoundSchool } from "../game/progression";
import type { GameState, TournamentResult } from "../game/types";
import {
  act,
  chiudiFinestra,
  decidi,
  finestraAperta,
  fonda,
  REGOLE,
  vuoleFondare,
  type AnnoScolastico,
} from "./giocatoreMedio";

export interface Evento {
  /** Minuti effettivi dall'inizio della partita. */
  t: number;
  scuola: number;
  anno: number;
  tipo: string;
  chiave?: string;
  valore?: number;
  dati?: Record<string, unknown>;
}

export interface RegistroPartita {
  seed: number;
  minutiTotali: number;
  scuoleRaggiunte: number;
  eventi: Evento[];
  errori: string[];
  msMotore: number;
  tick: number;
}

export interface OpzioniPartita {
  seed: number;
  maxScuole: number;
  /** Tetto di sicurezza in ore effettive. */
  maxOre: number;
  /** Ogni quanti minuti effettivi avvisare il chiamante (avanzamento). */
  onAvanzamento?: (registro: RegistroPartita, state: GameState) => void;
}

const SOGLIE_ISCRITTI = [10, 100, 1_000, 10_000, 100_000];
const SOGLIE_COLLABORATORI = [1, 4, 8, 15, 50, 100];
const STEP_GIOCO_MS = 1_000;
const UPGRADE_VISIBILI = UPGRADE_DEFINITIONS.filter((definition) => !definition.hidden);
const START_MS = 1_700_000_000_000;

function totaleLivelli(state: GameState): number {
  return Object.values(state.upgrades).reduce((total, level) => total + (level ?? 0), 0);
}

function migliorPosto(result: TournamentResult, ranking: string[]): number | undefined {
  const owned = new Set(result.participants.filter((p) => p.ownedContactId).map((p) => p.id));
  const index = ranking.findIndex((id) => owned.has(id));
  return index < 0 ? undefined : index + 1;
}

/** Controlli di salute: numeri rotti nello stato principale. */
function numeriRotti(state: GameState): string[] {
  const values: Record<string, number> = {
    euros: state.school.euros,
    fame: state.school.fame,
    activeMembers: state.school.activeMembers,
    totalSwords: state.equipment.totalSwords,
    reputation: state.network.reputation,
  };
  return Object.entries(values)
    .filter(([, value]) => !Number.isFinite(value) || value < 0)
    .map(([key, value]) => `${key}=${value}`);
}

export function giocaPartita({ seed, maxScuole, maxOre, onAvanzamento }: OpzioniPartita): RegistroPartita {
  const startedAt = START_MS + seed * 100_000;
  let state = createInitialState(startedAt, `Motore ${seed}`);
  let now = startedAt;
  let effettivoMs = 0;
  let prossimaDecisione = 0;
  let inputAccumulati = 0;
  let prossimoAvviso = 0;
  const registro: RegistroPartita = {
    seed, minutiTotali: 0, scuoleRaggiunte: 1, eventi: [], errori: [], msMotore: 0, tick: 0,
  };

  // Ciò che il registro ha già visto, per annotare solo le novità.
  let scuola = 1;
  let visti = new Set<string>();
  let risultatiVisti = new Set<string>();
  let livelli = { ...state.upgrades } as Record<string, number>;
  let annoCorrente = getSchoolYear(state.school.currentMonth);
  let anno: AnnoScolastico = { iscrittiInizio: state.school.activeMembers, upgradeComprati: 0 };
  let livelliInizioAnno = totaleLivelli(state);
  let ultimaPagella: number | undefined;
  const segretiVisti = new Map<string, string>();

  const annota = (tipo: string, chiave?: string, valore?: number, dati?: Record<string, unknown>) => {
    registro.eventi.push({
      t: Math.round(effettivoMs / 600) / 100,
      scuola,
      anno: getSchoolYear(state.school.currentMonth),
      tipo,
      ...(chiave !== undefined ? { chiave } : {}),
      ...(valore !== undefined ? { valore } : {}),
      ...(dati ? { dati } : {}),
    });
  };
  const unaVolta = (tipo: string, chiave: string, condizione: boolean, valore?: number) => {
    const key = `${tipo}:${chiave}`;
    if (condizione && !visti.has(key)) {
      visti.add(key);
      annota(tipo, chiave, valore);
    }
  };

  const osserva = () => {
    const s = state;
    for (const soglia of SOGLIE_ISCRITTI) unaVolta("iscritti", String(soglia), s.school.peakActiveMembers >= soglia);
    for (const soglia of SOGLIE_COLLABORATORI) unaVolta("collaboratori", String(soglia), s.collaborators.length >= soglia);
    unaVolta("sblocco", "forme", s.unlocks.forms);
    unaVolta("sblocco", "tornei", s.unlocks.tournaments);
    unaVolta("sblocco", "consiglio", s.collaboratorManagement.aggregateViewUnlocked);
    unaVolta("sblocco", "gadget", s.unlocks.gadget);
    unaVolta("sblocco", "social", Boolean((s.unlocks as Record<string, unknown>).social));
    unaVolta("sblocco", "chronicles", s.tournaments.chronicles.unlocked);
    unaVolta("tappa", "primo-scolastico", s.tournaments.firstSchoolTournamentMonth !== undefined);
    unaVolta("titolo", "accademico", (s.tournaments.academyTitlesCurrentSchool ?? 0) > 0);
    unaVolta("titolo", "nazionale", (s.tournaments.nationalTitlesCurrentSchool ?? 0) > 0);
    unaVolta("titolo", "champions", s.tournaments.championsVictoryCurrentSchool);
    unaVolta("titolo", "chronicles", Boolean(s.tournaments.chroniclesVictoryCurrentSchool));
    unaVolta("titolo", "reptile", s.tournaments.reptile.hall.some((entry) => entry.schoolName === s.school.name));
    unaVolta("velocita", String(getMaxGameSpeed(s.upgrades)), getMaxGameSpeed(s.upgrades) > 1);
    unaVolta("fondazione", "disponibile", canFoundSchool(s));
    unaVolta("upgrade-completi", "tutti", UPGRADE_VISIBILI.every((definition) =>
      (s.upgrades[definition.id] ?? 0) >= definition.maxLevel));

    for (const result of s.tournaments.results) {
      if (risultatiVisti.has(result.id)) continue;
      risultatiVisti.add(result.id);
      const arena = migliorPosto(result, result.arenaRanking);
      const stile = migliorPosto(result, result.styleRanking);
      annota("torneo", result.level, undefined, { stagione: result.season, arena, stile });
    }
    for (const [id, level] of Object.entries(s.upgrades)) {
      const before = livelli[id] ?? 0;
      for (let reached = before + 1; reached <= (level ?? 0); reached += 1) annota("upgrade", id, reached);
    }
    livelli = { ...s.upgrades } as Record<string, number>;
    for (const id of s.legendaryCollaborators.enrolledProfileIds) unaVolta("leggendario", id, true);
    for (const [id, progress] of Object.entries(s.network.secretLegendaries)) {
      const status = `${progress?.status}:${progress?.defeats ?? 0}`;
      if (segretiVisti.get(id) === status) continue;
      segretiVisti.set(id, status);
      annota("segreto", id, progress?.defeats ?? 0, { stato: progress?.status });
    }
    const report = s.annual?.report;
    if (report && report.schoolYear !== ultimaPagella) {
      ultimaPagella = report.schoolYear;
      annota("pagella", String(report.schoolYear), undefined, {
        voti: Object.fromEntries(report.grades.map((row) => [row.subject, row.grade ?? null])),
        testi: Object.fromEntries(report.grades.map((row) => [row.subject, row.text])),
        iscritti: s.school.activeMembers,
      });
    }
    const rotti = numeriRotti(s);
    if (rotti.length > 0 && registro.errori.length < 20) {
      registro.errori.push(`scuola ${scuola}, mese ${s.school.currentMonth}: ${rotti.join(", ")}`);
    }
  };

  const limiteMs = maxOre * 3_600_000;
  while (effettivoMs < limiteMs) {
    // 1. Finestre che fermano il gioco: mezzo minuto a gioco fermo ciascuna.
    const finestra = finestraAperta(state);
    if (finestra) {
      effettivoMs += REGOLE.reazioneMs;
      const rng = () => ((registro.tick * 2_654_435_761 + seed) % 1_000) / 1_000;
      const closed = chiudiFinestra(state, now, rng);
      if (closed === state) {
        registro.errori.push(`finestra «${finestra}» che non si chiude (scuola ${scuola}, mese ${state.school.currentMonth})`);
        break;
      }
      state = closed;
      continue;
    }

    // 2. Un secondo di gioco.
    const speed = Math.max(1, Math.min(state.automation.gameSpeed ?? 1, getMaxGameSpeed(state.upgrades)));
    now += STEP_GIOCO_MS;
    const t0 = performance.now();
    state = act(state, { type: "TICK", now });
    registro.msMotore += performance.now() - t0;
    registro.tick += 1;
    effettivoMs += STEP_GIOCO_MS / speed;

    // 3. Scrittura a mano: 8 input per secondo reale.
    if (state.emails.some((email) => email.status === "writing")) {
      inputAccumulati += REGOLE.inputPerSecondo / speed;
      while (inputAccumulati >= 1) {
        inputAccumulati -= 1;
        state = act(state, { type: "WRITE", now });
      }
    }
    if (state.emails.some((email) => email.status === "readyToSend")) {
      state = act(state, { type: "SEND_EMAIL", now });
    }

    // 4. Gesti di routine e registro.
    if (effettivoMs >= prossimaDecisione) {
      prossimaDecisione = effettivoMs + REGOLE.routineMs;
      state = decidi(state, now);
      osserva();

      const nuovoAnno = getSchoolYear(state.school.currentMonth);
      if (nuovoAnno !== annoCorrente) {
        anno.upgradeComprati = totaleLivelli(state) - livelliInizioAnno;
        annota("anno", String(annoCorrente), state.school.activeMembers, {
          iscrittiInizio: anno.iscrittiInizio,
          upgradeComprati: anno.upgradeComprati,
          fondi: Math.round(state.school.euros),
          collaboratori: state.collaborators.length,
          fama: state.school.fame,
          formeCompletate: state.statistics.formsCompleted,
        });
        if (scuola < maxScuole && vuoleFondare(state, anno)) {
          const prima = state;
          const preview = getPrestigeReputationPreview(state);
          annota("fondazione", String(scuola + 1), preview.points, {
            iscritti: state.school.activeMembers,
            reputazioneDaSpendere: state.network.reputation + preview.points,
            voci: { ...preview },
            upgradeComprati: UPGRADE_VISIBILI.filter((definition) => (state.upgrades[definition.id] ?? 0) > 0).length,
            upgradeTotali: UPGRADE_VISIBILI.length,
          });
          effettivoMs += REGOLE.reazioneMs;
          state = fonda(state, scuola + 1, now);
          if (state !== prima) {
            scuola += 1;
            registro.scuoleRaggiunte = scuola;
            visti = new Set([...visti].filter((key) => key.startsWith("leggendario:")));
            risultatiVisti = new Set();
            livelli = { ...state.upgrades } as Record<string, number>;
            ultimaPagella = undefined;
          }
        } else if (scuola >= maxScuole && vuoleFondare(state, anno)) {
          annota("fine", "scuola-completa");
          break;
        }
        annoCorrente = getSchoolYear(state.school.currentMonth);
        anno = { iscrittiInizio: state.school.activeMembers, upgradeComprati: 0 };
        livelliInizioAnno = totaleLivelli(state);
      }
      if (onAvanzamento && effettivoMs >= prossimoAvviso) {
        prossimoAvviso = effettivoMs + 10 * 60_000;
        registro.minutiTotali = effettivoMs / 60_000;
        onAvanzamento(registro, state);
      }
    }
  }
  registro.minutiTotali = effettivoMs / 60_000;
  return registro;
}
