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
 *   --thread N    partite in contemporanea al massimo (core del PC meno uno)
 *   --ram N       percentuale massima della RAM del PC per il motore (50)
 *   --priorita    bassa (predefinita: il PC resta reattivo) | normale
 *   --seme N      primo seme (1)
 *   --uscita dir  cartella dei risultati (motore-risultati/<data>)
 *
 * Una partita usa un core: JavaScript non divide una partita su più core. Il motore
 * ne tiene in corso fino a --thread, prende la prossima appena una finisce e, man
 * mano che le partite in corso diminuiscono, dà a quelle nuove più memoria (meno
 * pulizie della memoria, quindi più veloci). Paletti contro i rallentamenti del PC:
 * priorità bassa, tetto di RAM, e nessuna partita nuova se la RAM libera scende sotto
 * il 15% o se altri programmi stanno usando molta CPU.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { availableParallelism, constants, cpus, freemem, setPriority, totalmem } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE = join(ROOT, ".motore", "motore.mjs");
const MB = 1024 * 1024;

function opzioni(argv) {
  const get = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 && argv[index + 1] !== undefined ? argv[index + 1] : fallback;
  };
  const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "");
  const core = availableParallelism();
  return {
    partite: Number(get("partite", 50)),
    scuole: Number(get("scuole", 20)),
    ore: Number(get("ore", 400)),
    thread: Math.max(1, Math.min(core, Number(get("thread", Math.max(1, core - 1))))),
    ram: Math.max(10, Math.min(90, Number(get("ram", 50)))),
    priorita: get("priorita", "bassa"),
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
  const { seed, scuole, ore } = workerData;
  const registro = motore.giocaPartita({
    seed,
    maxScuole: scuole,
    maxOre: ore,
    onAvanzamento: (parziale) => parentPort.postMessage({
      tipo: "avanzamento", seed, minuti: parziale.minutiTotali, scuola: parziale.scuoleRaggiunte,
    }),
  });
  parentPort.postMessage({ tipo: "fatta", registro });
}

/** Uso della CPU di tutto il PC (0–1) dall'ultima lettura. */
function misuraCpu() {
  let precedente = cpus().map((cpu) => cpu.times);
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
    precedente = attuale;
    return totale > 0 ? occupato / totale : 0;
  };
}

async function principale() {
  const o = opzioni(process.argv.slice(2));
  if (o.priorita !== "normale") {
    try { setPriority(constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* non permesso: si va avanti */ }
  }
  const budgetMb = Math.floor((totalmem() / MB) * (o.ram / 100));
  console.log(`Motore di test: ${o.partite} partite fino alla scuola ${o.scuole}; fino a ${o.thread} in contemporanea su ${o.core} core, RAM fino a ${Math.round(budgetMb / 1024)} GB, priorità ${o.priorita}.`);
  await impacchetta();
  const motore = await import(pathToFileURL(BUNDLE).href);

  const coda = Array.from({ length: o.partite }, (_, index) => o.seme + index);
  const inCorso = new Map();
  const registri = [];
  const problemi = [];
  const cpu = misuraCpu();
  const t0 = Date.now();
  let carico = 0;
  let pausaMotivo = "";
  let ultimaStampa = 0;

  const stampa = (forza = false) => {
    if (!forza && Date.now() - ultimaStampa < 15_000) return;
    ultimaStampa = Date.now();
    const partite = [...inCorso.entries()]
      .map(([seed, info]) => `#${seed} scuola ${info.scuola} (${Math.round(info.minuti / 60)} h, ${info.memoriaMb} MB)`)
      .join(", ");
    console.log(
      `[${Math.round((Date.now() - t0) / 60_000)} min] finite ${registri.length}/${o.partite}` +
      ` · CPU ${Math.round(carico * 100)}% · RAM libera ${Math.round(freemem() / totalmem() * 100)}%` +
      (pausaMotivo ? ` · in attesa: ${pausaMotivo}` : "") +
      (partite ? `\n   in corso: ${partite}` : ""),
    );
  };

  /** Memoria per la prossima partita: il budget diviso per quelle che gireranno insieme. */
  const memoriaPerPartita = () => {
    const insieme = Math.max(1, Math.min(o.thread, inCorso.size + coda.length));
    const quota = Math.floor(budgetMb / insieme);
    return {
      maxOldGenerationSizeMb: Math.max(512, Math.min(16_384, Math.floor(quota * 0.85))),
      // Una generazione giovane più grande = meno pulizie della memoria.
      maxYoungGenerationSizeMb: Math.max(32, Math.min(512, Math.floor(quota * 0.1))),
    };
  };

  /** I paletti: niente partite nuove se il PC è sotto pressione. */
  const possoAvviare = () => {
    const liberaRam = freemem() / totalmem();
    if (liberaRam < 0.15) { pausaMotivo = "RAM libera sotto il 15%"; return false; }
    // CPU usata da altri programmi = totale meno la parte attesa delle nostre partite.
    const nostra = inCorso.size / o.core;
    if (inCorso.size > 0 && carico - nostra > 0.35) { pausaMotivo = "altri programmi usano molta CPU"; return false; }
    pausaMotivo = "";
    return true;
  };

  await new Promise((fine) => {
    const avvia = () => {
      while (coda.length > 0 && inCorso.size < o.thread && possoAvviare()) {
        const seed = coda.shift();
        const limiti = memoriaPerPartita();
        const worker = new Worker(fileURLToPath(import.meta.url), {
          workerData: { seed, scuole: o.scuole, ore: o.ore },
          resourceLimits: limiti,
        });
        inCorso.set(seed, { minuti: 0, scuola: 1, memoriaMb: limiti.maxOldGenerationSizeMb });
        worker.on("message", (message) => {
          if (message.tipo === "avanzamento") {
            Object.assign(inCorso.get(seed) ?? {}, { minuti: message.minuti, scuola: message.scuola });
            stampa();
          } else {
            registri.push(message.registro);
          }
        });
        worker.on("error", (error) => problemi.push(`partita ${seed}: ${error.message}`));
        worker.on("exit", (code) => {
          if (code !== 0 && !registri.some((registro) => registro.seed === seed)) {
            problemi.push(`partita ${seed}: thread uscito con codice ${code}`);
          }
          inCorso.delete(seed);
          stampa(true);
          avvia();
          if (inCorso.size === 0 && coda.length === 0) fine();
        });
      }
    };
    const controllo = setInterval(() => {
      carico = cpu();
      avvia();
      if (inCorso.size === 0 && coda.length === 0) {
        clearInterval(controllo);
        fine();
      }
    }, 2_000);
    avvia();
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
