/** La pagina HTML del motore: si apre nel browser, nessuna dipendenza esterna. */
import type { Analisi, Distribuzione } from "./analisi";
import { MATERIE, NOMI_MATERIE, SCUOLE_MOSTRATE, VOTI } from "./analisi";

const LIVELLI: Record<string, string> = {
  school: "Scolastico",
  academy: "Accademico",
  national: "Nazionale",
  champions: "Champion's Arena",
  chronicles: "Chronicles",
  reptile: "Reptile",
};

function esc(text: string): string {
  return text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!);
}

/** Minuti effettivi in forma leggibile. */
export function tempo(minuti?: number): string {
  if (minuti === undefined) return "—";
  if (minuti < 60) return `${Math.round(minuti)} min`;
  const ore = Math.floor(minuti / 60);
  const resto = Math.round(minuti - ore * 60);
  return resto === 0 ? `${ore} h` : `${ore} h ${resto} min`;
}

function cellaTempo(d: Distribuzione): string {
  if (d.partite === 0) return `<td class="vuota">—</td>`;
  if (d.raggiunte === 0) return `<td class="vuota" title="mai in ${d.partite} partite">mai</td>`;
  const quota = d.raggiunte < d.partite ? `<small class="quota">${d.raggiunte}/${d.partite}</small>` : "";
  return `<td title="10%: ${tempo(d.p10)} · mediana: ${tempo(d.p50)} · 90%: ${tempo(d.p90)}"><strong>${tempo(d.p50)}</strong><small>${tempo(d.p10)} – ${tempo(d.p90)}</small>${quota}</td>`;
}

function cellaNumero(d: Distribuzione, decimali = 0): string {
  if (d.raggiunte === 0) return `<td class="vuota">—</td>`;
  const f = (value?: number) => value === undefined ? "—" : value.toLocaleString("it-IT", { maximumFractionDigits: decimali });
  return `<td><strong>${f(d.p50)}</strong><small>${f(d.p10)} – ${f(d.p90)}</small></td>`;
}

function barraVoti(conteggio: Record<string, number>): string {
  const totale = VOTI.reduce((sum, voto) => sum + (conteggio[voto] ?? 0), 0);
  if (totale === 0) return `<span class="vuota">—</span>`;
  let x = 0;
  const pezzi = VOTI.map((voto) => {
    const w = ((conteggio[voto] ?? 0) / totale) * 100;
    const rect = w > 0
      ? `<rect x="${x}" y="0" width="${w}" height="14" class="voto-${voto}"><title>${voto}: ${conteggio[voto]} (${Math.round(w)}%)</title></rect>`
      : "";
    x += w;
    return rect;
  }).join("");
  return `<svg class="barra" viewBox="0 0 100 14" preserveAspectRatio="none" role="img" aria-label="Voti">${pezzi}</svg>`;
}

function sezione(id: string, titolo: string, domanda: string, corpo: string): string {
  return `<section id="${id}"><h2>${esc(titolo)}</h2><p class="domanda">${domanda}</p>${corpo}</section>`;
}

export function creaReport(analisi: Analisi, meta: { creato: string; partite: number; scuole: number; secondi: number; versione: string }): string {
  const tappe = sezione("tappe", "Tappe della storia, scuola per scuola",
    "Domande A1–A8, B10, D22: quanto tempo effettivo dall'inizio di ogni scuola. In grassetto la mediana, sotto il 10% più veloce e il 10% più lento; «3/50» = partite che ci sono arrivate.",
    `<table><thead><tr><th>Tappa</th>${SCUOLE_MOSTRATE.map((n) => `<th>Scuola ${n}</th>`).join("")}</tr></thead><tbody>${
      analisi.tappe.map((tappa) => `<tr><th>${esc(tappa.etichetta)}</th>${SCUOLE_MOSTRATE.map((n) => cellaTempo(tappa.scuole[n])).join("")}</tr>`).join("")
    }</tbody></table>`);

  const scuole = sezione("scuole", "Scuole fondate",
    "Domande A6–A7: quando si arriva alla scuola n (tempo totale dall'inizio), quanto dura ogni scuola e quanti anni scolastici.",
    `<table><thead><tr><th>Scuola</th><th>Arrivo</th><th>Durata</th><th>Anni scolastici</th></tr></thead><tbody>${
      analisi.scuole.map((scuola) => `<tr><th>${scuola.numero}</th>${cellaTempo(scuola.arrivo)}${cellaTempo(scuola.durata)}${cellaNumero(scuola.anni)}</tr>`).join("")
    }</tbody></table>`);

  const segreti = sezione("segreti", "Leggendari Segreti",
    "Domande C18–C20: prima sconfitta in torneo e iscrizione alla scuola di ogni Leggendario Segreto; in fondo a ogni torneo, quando sono tutti iscritti.",
    analisi.segreti.map((gruppo) => `<h3>${LIVELLI[gruppo.livello] ?? gruppo.livello}</h3><table><thead><tr><th>Leggendario</th><th>Prima sconfitta</th><th>Iscritto</th></tr></thead><tbody>${
      gruppo.persone.map((p) => `<tr><th>${esc(p.nome)}</th>${cellaTempo(p.sconfitto)}${cellaTempo(p.iscritto)}</tr>`).join("")
    }<tr class="totale"><th>Tutti iscritti</th><td></td>${cellaTempo(gruppo.tuttiIscritti)}</tr></tbody></table>`).join(""));

  const leggendari = sezione("leggendari", "Leggendari",
    "Domanda C15: quando arriva ogni Leggendario (prima volta nella partita).",
    `<table><thead><tr><th>Leggendario</th><th>Arrivo</th></tr></thead><tbody>${
      analisi.leggendari.map((l) => `<tr><th>${esc(l.id)}</th>${cellaTempo(l.arrivo)}</tr>`).join("")
    }</tbody></table>`);

  const mai = analisi.upgrade.filter((u) => u.primoAcquisto.raggiunte === 0);
  const upgrade = sezione("upgrade", "Upgrade",
    "Domande H42–H45: primo acquisto e livello massimo di ogni Upgrade (tempo totale dall'inizio della partita), in ordine di acquisto. In fondo quelli mai comprati.",
    `<table><thead><tr><th>Upgrade</th><th>Ramo</th><th>Livello 1</th><th>Livello massimo</th></tr></thead><tbody>${
      analisi.upgrade.filter((u) => u.primoAcquisto.raggiunte > 0).map((u) => `<tr><th>${esc(u.titolo)}</th><td>${esc(u.ramo)}</td>${cellaTempo(u.primoAcquisto)}${cellaTempo(u.massimo)}</tr>`).join("")
    }</tbody></table>${mai.length ? `<p><strong>Mai comprati (${mai.length}):</strong> ${mai.map((u) => esc(u.titolo)).join(", ")}</p>` : ""}
    <h3>«Il tempo è denaro»</h3><table><thead><tr><th>Velocità</th><th>Disponibile da</th></tr></thead><tbody>${
      analisi.velocita.map((v) => `<tr><th>${v.velocita}×</th>${cellaTempo(v.quando)}</tr>`).join("")
    }</tbody></table>`);

  const legenda = `<p class="legenda">${VOTI.map((voto) => `<span class="chip voto-${voto}">${voto}</span>`).join(" ")}</p>`;
  const tabellaVoti = (righe: { nome: string; voti: Record<string, Record<string, number>> }[]) =>
    `<table class="voti"><thead><tr><th></th>${MATERIE.map((m) => `<th>${NOMI_MATERIE[m]}</th>`).join("")}</tr></thead><tbody>${
      righe.map((riga) => `<tr><th>${esc(riga.nome)}</th>${MATERIE.map((m) => `<td>${barraVoti(riga.voti[m] ?? {})}</td>`).join("")}</tr>`).join("")
    }</tbody></table>`;
  const pagelle = sezione("pagelle", "Pagelle",
    "Domande K54–K58: distribuzione dei voti per materia, per anno della scuola e per dimensione della scuola. Una materia sempre rossa o sempre verde è un segnale di bilanciamento o di soglie da tarare.",
    `${legenda}<h3>Tutte le pagelle</h3>${tabellaVoti([{ nome: "Totale", voti: analisi.pagelle.totale }])}
    <h3>Per anno della scuola</h3>${tabellaVoti(analisi.pagelle.perAnno.map(([anno, voti]) => ({ nome: `Anno ${anno}`, voti })))}
    <h3>Per dimensione della scuola</h3>${tabellaVoti(analisi.pagelle.perFascia.map((f) => ({ nome: f.fascia, voti: f.voti })))}
    <h3>Anni critici (3 o più materie in D/E)</h3><p>${
      analisi.pagelle.crolli.length ? analisi.pagelle.crolli.map(([anno, volte]) => `anno ${anno}: ${volte} volte`).join(" · ") : "nessuno"
    }</p>`);

  const reputazione = sezione("reputazione", "Reputazione alla fondazione",
    "Domanda I47: punti guadagnati lasciando la scuola n, voce per voce, e quanti Upgrade diversi erano stati comprati.",
    `<table><thead><tr><th>Lasciando la scuola</th><th>Punti</th><th>Fama</th><th>Lettere</th><th>Upgrade comprati</th></tr></thead><tbody>${
      analisi.reputazione.map((r) => `<tr><th>${r.scuola}</th>${cellaNumero(r.punti)}${cellaNumero(r.voci.famePoints ?? { partite: 0, raggiunte: 0 })}${cellaNumero(r.voci.letterPoints ?? { partite: 0, raggiunte: 0 })}${cellaNumero(r.upgradeComprati)}</tr>`).join("")
    }</tbody></table>`);

  const tornei = sezione("tornei", "Tornei",
    "Domande F32–F34: per ogni torneo, miglior piazzamento della scuola in Arena e in Stile e quota di edizioni vinte.",
    `<table><thead><tr><th>Torneo</th><th>Edizioni per partita</th><th>Posto Arena</th><th>Posto Stile</th><th>Vinte Arena</th><th>Vinte Stile</th></tr></thead><tbody>${
      analisi.tornei.map((t) => `<tr><th>${LIVELLI[t.livello] ?? t.livello}</th><td>${t.edizioniPerPartita.toFixed(1)}</td>${cellaNumero(t.arena)}${cellaNumero(t.stile)}<td>${Math.round(t.vinteArena * 100)}%</td><td>${Math.round(t.vinteStile * 100)}%</td></tr>`).join("")
    }</tbody></table>`);

  const s = analisi.salute;
  const salute = sezione("salute", "Salute della partita e del motore",
    "Domande L56–L58: numeri rotti, finestre che non si chiudono, costo del motore.",
    `<table><tbody>
      <tr><th>Durata delle partite (tempo effettivo)</th>${cellaTempo(s.minutiPerPartita)}</tr>
      <tr><th>Scuole raggiunte</th>${cellaNumero(s.scuoleRaggiunte)}</tr>
      <tr><th>Millisecondi per tick del motore</th>${cellaNumero(s.msPerTick, 2)}</tr>
    </tbody></table>${s.errori.length
      ? `<h3>Problemi (${s.errori.length})</h3><ul>${s.errori.slice(0, 50).map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`
      : `<p>Nessun problema trovato.</p>`}`);

  const indice = [["tappe", "Tappe"], ["scuole", "Scuole"], ["segreti", "Leggendari Segreti"], ["leggendari", "Leggendari"], ["upgrade", "Upgrade"], ["pagelle", "Pagelle"], ["reputazione", "Reputazione"], ["tornei", "Tornei"], ["salute", "Salute"]]
    .map(([id, nome]) => `<a href="#${id}">${nome}</a>`).join("");

  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Motore di test LudoClicker</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--text:#1d2330;--muted:#647089;--line:#dfe3ea;--accent:#1f5fa8;
--A:#2e9e5b;--B:#8cc152;--C:#e6b93c;--D:#e3833a;--E:#d0453c}
@media (prefers-color-scheme:dark){:root{--bg:#10151f;--card:#18202d;--text:#e6ebf3;--muted:#93a0b8;--line:#2a3445;--accent:#7fb2f0}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
header{padding:28px 20px 12px;max-width:1200px;margin:0 auto}h1{margin:0 0 4px;font-size:26px}
.meta{color:var(--muted)}nav{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--line);padding:8px 20px;display:flex;gap:14px;flex-wrap:wrap;z-index:2}
nav a{color:var(--accent);text-decoration:none;font-weight:600}main{max-width:1200px;margin:0 auto;padding:12px 20px 60px}
section{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:18px 20px;margin:18px 0;overflow-x:auto}
h2{margin:0 0 6px;font-size:20px}h3{margin:18px 0 6px;font-size:16px}.domanda{color:var(--muted);margin:0 0 12px}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th,td{padding:6px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
thead th{font-size:13px;color:var(--muted);font-weight:600}tbody th{font-weight:500}
td strong{display:block}td small{display:block;color:var(--muted);font-size:12px}.quota{color:var(--accent)!important}
.vuota{color:var(--muted)}tr.totale th,tr.totale td{font-weight:700;border-top:2px solid var(--line)}
.barra{width:100%;min-width:110px;height:14px;border-radius:3px;overflow:hidden;display:block}
.voto-A{fill:var(--A);background:var(--A)}.voto-B{fill:var(--B);background:var(--B)}.voto-C{fill:var(--C);background:var(--C)}.voto-D{fill:var(--D);background:var(--D)}.voto-E{fill:var(--E);background:var(--E)}
.chip{display:inline-block;color:#fff;font-weight:700;border-radius:4px;padding:0 8px}
</style></head><body>
<header><h1>Motore di test LudoClicker</h1>
<p class="meta">${meta.partite} partite del giocatore medio fino alla scuola ${meta.scuole} · versione del gioco ${esc(meta.versione)} · ${esc(meta.creato)} · calcolo ${tempo(meta.secondi / 60)}</p>
<p class="meta">Tempi in tempo di gioco effettivo (il gioco avanza solo mentre è aperto). Regole del giocatore medio: Project, <code>claude/motore-giocatore-medio.md</code>.</p></header>
<nav>${indice}</nav>
<main>${tappe}${scuole}${segreti}${leggendari}${upgrade}${pagelle}${reputazione}${tornei}${salute}</main>
</body></html>`;
}
