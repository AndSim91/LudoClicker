#!/usr/bin/env node
/**
 * Motore di test di LudoClicker (Andrea, 14/10/2026).
 *
 *   npm run motore -- --partite 50 --scuole 20
 *
 * Opzioni:
 *   --partite N   partite da giocare (50)
 *   --scuole N    fino a quale scuola (20)
 *   --ore N       tetto di sicurezza per partita, in ore effettive (400)
 *   --thread N    partite in contemporanea al massimo (tutti i core)
 *   --cpu N       % massima della CPU del PC (99)
 *   --ram N       % massima della RAM libera (99)
 *   --priorita    bassa (predefinita: in background) | media | normale
 *   --seme N      primo seme (1)
 *   --uscita dir  cartella dei risultati (motore-risultati/<data>)
 *
 * Gira in background e si adatta da solo, ogni 2 secondi:
 * - CPU: priorità bassa, quindi il sistema e gli altri programmi passano sempre
 *   davanti. Le partite attive sono i core liberi (fino al --cpu%) meno quelli usati
 *   dagli altri programmi: se il PC si carica, le partite in più vanno in pausa e
 *   ripartono quando si libera.
 * - RAM: ogni partita nuova riceve la sua parte della RAM libera (fino al --ram%):
 *   meno partite in corso = più memoria a testa. Se la RAM libera scende sotto la
 *   soglia di sicurezza (3%, almeno 512 MB) l'ultima partita avviata viene fermata e
 *   rimessa in coda (riparte uguale: il seme è lo stesso).
 * Una partita usa un solo core: JavaScript non divide una partita su più core.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { availableParallelism, constants, cpus, freemem, setPriority, totalmem } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getHeapStatistics } from "node:v8";
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE = join(ROOT, ".motore", "motore.mjs");
const MB = 1024 * 1024;
const PRIORITA = {
  bassa: constants.priority.PRIORITY_LOW,
  media: constants.priority.PRIORITY_BELOW_NORMAL,
  normale: constants.priority.PRIORITY_NORMAL,
};
const MEMORIA_MINIMA_MB = 512;
const TENTATIVI = 3;

function opzioni(argv) {
  const get = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 && argv[index + 1] !== undefined ? argv[index + 1] : fallback;
  };
  const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "");
  const core = availableParallelism();
  const priorita = get("priorita", "bassa");
  return {
    partite: Number(get("partite", 50)),
    scuole: Number(get("scuole", 20)),
    ore: Number(get("ore", 400)),
    thread: Math.max(1, Math.min(core, Number(get("thread", core)))),
    cpu: Math.max(10, Math.min(99, Number(get("cpu", 99)))),
    ram: Math.max(10, Math.min(99, Number(get("ram", 99)))),
    priorita: priorita in PRIORITA ? priorita : "bassa",
    seme: Number(get("seme", 1)),
    uscita: resolve(ROOT, get("uscita", join("motore-risultati", stamp))),
    core,
  };
}

async function impacchetta() {
  const { build } = await import("vite");
  await build({
    configFile: false,
    root: ROOT,
    logLevel: "warn",
    build: {
      ssr: join(ROOT, "src/motore/index.ts"),
      outDir: join(ROOT, ".motore"),
      emptyOutDir: true,
      target: "node20",
      rollupOptions: { output: { entryFileNames: "motore.mjs", format: "es" } },
    },
    ssr: { noExternal: true },
  });
}

/** Una partita per thread: il thread finisce con la partita. */
async function lavoratore() {
  const motore = await import(pathToFileURL(BUNDLE).href);
  const { seed, scuole, ore, pausa } = workerData;
  const segnale = new Int32Array(pausa);
  let prossimaMemoria = 0;
  const registro = motore.giocaPartita({
    seed,
    maxScuole: scuole,
    maxOre: ore,
    onAvanzamento: (parziale) => parentPort.postMessage({
      tipo: "avanzamento", minuti: parziale.minutiTotali, scuola: parziale.scuoleRaggiunte,
    }),
    alPasso: () => {
      // In pausa il thread dorme qui finché il lanciatore non lo risveglia: 0% di CPU.
      if (Atomics.load(segnale, 0) === 1) Atomics.wait(segnale, 0, 1);
      const ora = performance.now();
      if (ora >= prossimaMemoria) {
        prossimaMemoria = ora + 2_000;
        parentPort.postMessage({ tipo: "memoria", mb: getHeapStatistics().total_heap_size / MB });
      }
    },
  });
  parentPort.postMessage({ tipo: "fatta", registro });
}

/** Uso della CPU di tutto il PC e del solo motore (0–1) dall'ultima lettura. */
function misuraCpu(core) {
  let precedente = cpus().map((cpu) => cpu.times);
  let nostraPrima = process.cpuUsage();
  let istante = performance.now();
  return () => {
    const attuale = cpus().map((cpu) => cpu.times);
    let occupato = 0;
    let totale = 0;
    attuale.forEach((times, index) => {
      const prima = precedente[index];
      const delta = (key) => times[key] - prima[key];
      const busy = delta("user") + delta("nice") + delta("sys") + delta("irq");
      occupato += busy;
      totale += busy + delta("idle");
    });
    const nostra = process.cpuUsage(nostraPrima); // tutti i thread del processo
    const ora = performance.now();
    const risultato = {
      totale: totale > 0 ? occupato / totale : 0,
      nostra: (nostra.user + nostra.system) / 1000 / ((ora - istante) * core),
    };
    precedente = attuale;
    nostraPrima = process.cpuUsage();
    istante = ora;
    return risultato;
  };
}

async function principale() {
  const o = opzioni(process.argv.slice(2));
  try { setPriority(PRIORITA[o.priorita]); } catch { /* non permesso: si va avanti */ }
  // Soglia di sicurezza: sotto questa RAM libera il motore restituisce memoria al sistema.
  const sogliaMb = Math.max(MEMORIA_MINIMA_MB, (totalmem() / MB) * 0.03);
  console.log(`Motore di test: ${o.partite} partite fino alla scuola ${o.scuole}; fino a ${o.thread} in contemporanea su ${o.core} core (CPU fino al ${o.cpu}%), RAM fino al ${o.ram}% di quella libera, priorità ${o.priorita}.`);
  await impacchetta();
  const motore = await import(pathToFileURL(BUNDLE).href);

  const coda = Array.from({ length: o.partite }, (_, index) => ({ seed: o.seme + index, tentativi: 0 }));
  /** Partite in corso, in ordine di avvio. */
  const inCorso = new Map();
  const registri = [];
  const problemi = [];
  const cpu = misuraCpu(o.core);
  const t0 = Date.now();
  let altri = 0;
  let obiettivo = o.thread;
  let motivo = "";
  let ultimaStampa = 0;

  // Una riga di stato e, sotto, le partite in corso riassunte per scuola (non una per una).
  const stampa = (forza = false) => {
    if (!forza && Date.now() - ultimaStampa < 15_000) return;
    ultimaStampa = Date.now();
    const lista = [...inCorso.values()];
    const inPausa = lista.filter((p) => p.pausa).length;
    const gb = (mb) => `${(mb / 1024).toFixed(1).replace(".", ",")} GB`;
    const intervallo = (valori, unita) => {
      const min = Math.min(...valori);
      const max = Math.max(...valori);
      return min === max ? `${min} ${unita}` : `${min}–${max} ${unita}`;
    };
    const perScuola = new Map();
    for (const p of lista) perScuola.set(p.scuola, (perScuola.get(p.scuola) ?? 0) + 1);
    const scuole = [...perScuola.entries()].sort((a, b) => a[0] - b[0])
      .map(([scuola, quante]) => `scuola ${scuola}: ${quante}`).join(" · ");
    console.log(
      `[${Math.round((Date.now() - t0) / 60_000)} min] finite ${registri.length}/${o.partite}` +
      ` · in corso ${lista.length - inPausa}${inPausa ? ` (+${inPausa} in pausa)` : ""}` +
      ` · in coda ${coda.length}` +
      ` · altri programmi ${Math.round(altri * 100)}% CPU · RAM libera ${gb(freemem() / MB)}` +
      (motivo ? `\n   ⚠ ${motivo}` : "") +
      (lista.length
        ? `\n   ${scuole} (obiettivo: scuola ${o.scuole})` +
          ` · gioco ${intervallo(lista.map((p) => Math.round(p.minuti / 60)), "h")}` +
          ` · memoria ${intervallo(lista.map((p) => Math.round(p.usataMb)), "MB")} a partita`
        : ""),
    );
  };

  const attive = () => [...inCorso.values()].filter((p) => !p.pausa);
  const metti = (p, pausa) => {
    p.pausa = pausa;
    Atomics.store(p.segnale, 0, pausa ? 1 : 0);
    if (!pausa) Atomics.notify(p.segnale, 0);
  };

  /** RAM che si può ancora promettere: la libera meno quella che le partite in corso possono ancora prendere. */
  const memoriaDisponibileMb = () => {
    const promessa = [...inCorso.values()].reduce((somma, p) => somma + Math.max(0, p.limiteMb - p.usataMb), 0);
    return (freemem() / MB) * (o.ram / 100) - promessa;
  };

  const avvia = (voce) => {
    const posti = Math.max(1, Math.min(obiettivo, attive().length + coda.length + 1) - attive().length);
    const quota = memoriaDisponibileMb() / posti;
    if (quota < MEMORIA_MINIMA_MB) { coda.unshift(voce); motivo = "attesa RAM"; return false; }
    const limiteMb = Math.min(16_384, Math.floor(quota));
    const pausa = new SharedArrayBuffer(4);
    const worker = new Worker(fileURLToPath(import.meta.url), {
      workerData: { seed: voce.seed, scuole: o.scuole, ore: o.ore, pausa },
      resourceLimits: {
        maxOldGenerationSizeMb: Math.floor(limiteMb * 0.85),
        // Una generazione giovane più grande = meno pulizie della memoria.
        maxYoungGenerationSizeMb: Math.max(32, Math.min(512, Math.floor(limiteMb * 0.1))),
      },
    });
    const p = { ...voce, worker, segnale: new Int32Array(pausa), pausa: false, minuti: 0, scuola: 1, usataMb: 0, limiteMb, finita: false, richiamata: false, memoriaFinita: false };
    inCorso.set(voce.seed, p);
    worker.on("message", (message) => {
      if (message.tipo === "memoria") p.usataMb = message.mb;
      else if (message.tipo === "avanzamento") { p.minuti = message.minuti; p.scuola = message.scuola; stampa(); }
      else { p.finita = true; registri.push(message.registro); }
    });
    worker.on("error", (error) => {
      if (error.code === "ERR_WORKER_OUT_OF_MEMORY") p.memoriaFinita = true;
      else problemi.push(`partita ${voce.seed}: ${error.message}`);
    });
    worker.on("exit", (code) => {
      inCorso.delete(voce.seed);
      if (!p.finita) {
        if (p.richiamata) coda.unshift({ seed: voce.seed, tentativi: voce.tentativi });
        else if (p.memoriaFinita && voce.tentativi + 1 < TENTATIVI) coda.unshift({ seed: voce.seed, tentativi: voce.tentativi + 1 });
        else problemi.push(`partita ${voce.seed}: ${p.memoriaFinita ? `memoria esaurita (${limiteMb} MB)` : `thread uscito con codice ${code}`}`);
      }
      stampa(true);
      regola(false);
    });
    return true;
  };

  /** Il cuore dell'adattamento: quante partite tenere attive adesso. */
  const regola = (misura = true) => {
    if (misura) {
      const letto = cpu();
      // Media mobile: un picco di un attimo non mette in pausa nulla.
      altri = altri * 0.5 + Math.max(0, letto.totale - letto.nostra) * 0.5;
    }
    const liberaMb = freemem() / MB;
    if (liberaMb < sogliaMb) {
      motivo = "RAM quasi finita: restituisco memoria al sistema";
      const ultime = [...inCorso.values()].reverse();
      if (ultime.length > 1) {
        const p = ultime[0];
        p.richiamata = true;
        metti(p, false);
        void p.worker.terminate();
      } else if (ultime[0]) {
        metti(ultime[0], true);
      }
      return;
    }
    obiettivo = Math.max(1, Math.min(o.thread, Math.round(o.core * (o.cpu / 100 - altri))));
    motivo = obiettivo < o.thread ? "il PC è occupato: alcune partite aspettano" : "";
    // Troppe attive: in pausa le ultime avviate.
    for (const p of attive().reverse().slice(obiettivo)) metti(p, true);
    // Posto libero: prima si risvegliano quelle in pausa (con un margine di RAM), poi si avviano le nuove.
    while (attive().length < obiettivo) {
      const ferma = [...inCorso.values()].find((p) => p.pausa);
      if (ferma) {
        if (liberaMb < sogliaMb * 2) break;
        metti(ferma, false);
      } else if (coda.length === 0 || !avvia(coda.shift())) {
        break;
      }
    }
  };

  await new Promise((fine) => {
    const controllo = setInterval(() => {
      regola();
      stampa();
      if (inCorso.size === 0 && coda.length === 0) {
        clearInterval(controllo);
        fine();
      }
    }, 2_000);
    regola(false);
  });

  registri.sort((left, right) => left.seed - right.seed);
  const analisi = motore.analizza(registri);
  let commit = "";
  try { commit = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { /* fuori da git */ }
  const versione = `salvataggio v${motore.GAME_CONFIG.version}${commit ? ` · commit ${commit}` : ""}`;
  const secondi = (Date.now() - t0) / 1000;
  mkdirSync(o.uscita, { recursive: true });
  writeFileSync(join(o.uscita, "dati.json"), JSON.stringify({ opzioni: o, versione, secondi, problemi, analisi, registri }));
  writeFileSync(join(o.uscita, "report.html"), motore.creaReport(analisi, {
    creato: new Date().toLocaleString("it-IT"),
    partite: registri.length,
    scuole: o.scuole,
    secondi,
    versione,
  }));
  if (problemi.length) console.log(`Problemi:\n - ${problemi.join("\n - ")}`);
  console.log(`Fatto in ${Math.round(secondi / 60)} min. Report: ${join(o.uscita, "report.html")}`);
}

if (isMainThread) {
  principale().catch((error) => { console.error(error); process.exit(1); });
} else {
  lavoratore().catch((error) => { console.error(error); process.exit(1); });
}
