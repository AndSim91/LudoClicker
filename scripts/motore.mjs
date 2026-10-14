#!/usr/bin/env node
/**
 * Motore di test di LudoClicker (Andrea, 14/10/2026).
 *
 *   npm run motore -- --partite 50 --scuole 20
 *
 * Opzioni: --partite N (50) · --scuole N (20) · --ore N (tetto per partita, 400)
 *          --thread N (core del PC meno uno) · --seme N (primo seme, 1)
 *          --uscita cartella (motore-risultati/<data>)
 * Il giocatore medio è in src/motore/giocatoreMedio.ts; le domande in src/motore/analisi.ts.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE = join(ROOT, ".motore", "motore.mjs");

function opzioni(argv) {
  const get = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 && argv[index + 1] !== undefined ? argv[index + 1] : fallback;
  };
  const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "");
  return {
    partite: Number(get("partite", 50)),
    scuole: Number(get("scuole", 20)),
    ore: Number(get("ore", 400)),
    thread: Number(get("thread", Math.max(1, availableParallelism() - 1))),
    seme: Number(get("seme", 1)),
    uscita: resolve(ROOT, get("uscita", join("motore-risultati", stamp))),
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

async function lavoratore() {
  const motore = await import(pathToFileURL(BUNDLE).href);
  const { semi, scuole, ore } = workerData;
  for (const seed of semi) {
    const registro = motore.giocaPartita({
      seed,
      maxScuole: scuole,
      maxOre: ore,
      onAvanzamento: (parziale) => parentPort.postMessage({ tipo: "avanzamento", seed, minuti: parziale.minutiTotali, scuola: parziale.scuoleRaggiunte }),
    });
    parentPort.postMessage({ tipo: "fatta", registro });
  }
}

async function principale() {
  const o = opzioni(process.argv.slice(2));
  console.log(`Motore di test: ${o.partite} partite fino alla scuola ${o.scuole}, ${o.thread} thread.`);
  await impacchetta();
  const motore = await import(pathToFileURL(BUNDLE).href);
  const semi = Array.from({ length: o.partite }, (_, index) => o.seme + index);
  const gruppi = Array.from({ length: Math.min(o.thread, semi.length) }, (_, index) =>
    semi.filter((_, position) => position % o.thread === index));
  const t0 = Date.now();
  const registri = [];
  const stato = new Map();
  let ultimaStampa = 0;
  const stampa = (forza = false) => {
    if (!forza && Date.now() - ultimaStampa < 15_000) return;
    ultimaStampa = Date.now();
    const inCorso = [...stato.entries()].map(([seed, s]) => `#${seed} scuola ${s.scuola} (${Math.round(s.minuti / 60)} h)`).join(", ");
    console.log(`[${Math.round((Date.now() - t0) / 60_000)} min] finite ${registri.length}/${o.partite}${inCorso ? ` · in corso: ${inCorso}` : ""}`);
  };
  await Promise.all(gruppi.map((gruppo) => new Promise((resolveWorker, reject) => {
    const worker = new Worker(fileURLToPath(import.meta.url), { workerData: { semi: gruppo, scuole: o.scuole, ore: o.ore } });
    worker.on("message", (message) => {
      if (message.tipo === "avanzamento") {
        stato.set(message.seed, message);
        stampa();
      } else {
        stato.delete(message.registro.seed);
        registri.push(message.registro);
        stampa(true);
      }
    });
    worker.on("error", reject);
    worker.on("exit", (code) => code === 0 ? resolveWorker() : reject(new Error(`thread uscito con codice ${code}`)));
  })));
  registri.sort((left, right) => left.seed - right.seed);
  const analisi = motore.analizza(registri);
  let commit = "";
  try { commit = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { /* fuori da git */ }
  const versione = `salvataggio v${motore.GAME_CONFIG.version}${commit ? ` · commit ${commit}` : ""}`;
  const secondi = (Date.now() - t0) / 1000;
  mkdirSync(o.uscita, { recursive: true });
  writeFileSync(join(o.uscita, "dati.json"), JSON.stringify({ opzioni: o, versione, secondi, analisi, registri }));
  writeFileSync(join(o.uscita, "report.html"), motore.creaReport(analisi, {
    creato: new Date().toLocaleString("it-IT"),
    partite: registri.length,
    scuole: o.scuole,
    secondi,
    versione,
  }));
  console.log(`Fatto in ${Math.round(secondi / 60)} min. Report: ${join(o.uscita, "report.html")}`);
}

if (isMainThread) {
  principale().catch((error) => { console.error(error); process.exit(1); });
} else {
  lavoratore().catch((error) => { console.error(error); process.exit(1); });
}
