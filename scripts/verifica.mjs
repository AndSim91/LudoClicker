#!/usr/bin/env node
/**
 * Rete di verifica del motore (Andrea, 20/10/2026): un'ottimizzazione entra solo
 * se, a parità di seme, il gioco dà esattamente lo stesso risultato.
 *
 *   node scripts/verifica.mjs istantanee     salva le istantanee (una volta, poi solo
 *                                            quando il gioco cambia molto)
 *   node scripts/verifica.mjs                confronta il codice attuale con HEAD
 *
 * Opzioni del confronto:
 *   --rif X       commit di riferimento (HEAD)
 *   --tick N      tick giocati da ogni istantanea (300)
 *   --partite N   partite intere giocate con i due codici, semi 1…N (2; 0 = nessuna)
 *   --scuole N    fino a quale scuola le partite intere (2)
 *   --ripeti N    quante volte misurare i tick di ogni istantanea, alternando i due
 *                 codici; vale il tempo migliore (3: i tempi singoli ballano)
 * Opzioni delle istantanee:
 *   --seme N      la partita da cui prenderle (1)
 *
 * Istantanee: stati veri di una partita del giocatore medio a quattro misure
 * (scuola 1; scuola 5 con 2.000 iscritti; scuola 9 con 800 collaboratori; scuola 12
 * con 15.000 iscritti), in motore-risultati/istantanee. Da ognuna il gioco avanza di
 * --tick secondi col codice di riferimento e con quello attuale: lo stato finale
 * deve avere la stessa impronta (chiavi in ordine, quindi conta il contenuto e non
 * l'ordine dei campi). Le partite intere controllano anche il giocatore, le finestre
 * e le fondazioni: il registro deve essere identico. Esce con codice 1 se qualcosa
 * è diverso. Ogni istantanea gira nel suo thread, quelle dei due codici in parallelo.
 */
import { execSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LAVORO = join(ROOT, "motore-risultati", "verifica");
const ISTANTANEE = join(ROOT, "motore-risultati", "istantanee");
const PUNTI = [
  { nome: "1-scuola-1", ok: (r) => r.scuoleRaggiunte === 1 && r.minutiTotali >= 100 },
  { nome: "2-scuola-5", ok: (r, s) => r.scuoleRaggiunte === 5 && s.school.activeMembers >= 2_000 },
  { nome: "3-scuola-9", ok: (r, s) => r.scuoleRaggiunte === 9 && s.collaborators.length >= 800 },
  { nome: "4-scuola-12", ok: (r, s) => r.scuoleRaggiunte >= 12 && s.school.activeMembers >= 15_000 },
];

/** Impronta del contenuto: chiavi in ordine, così due oggetti uguali con campi in ordine diverso coincidono. */
function impronta(valore) {
  const hash = createHash("sha1");
  const scrivi = (v) => {
    if (v === null || typeof v !== "object") { hash.update(JSON.stringify(v) ?? "null"); return; }
    if (Array.isArray(v)) {
      hash.update("[");
      for (const x of v) { scrivi(x === undefined ? null : x); hash.update(","); }
      hash.update("]");
      return;
    }
    hash.update("{");
    for (const k of Object.keys(v).sort()) {
      if (v[k] === undefined) continue;
      hash.update(JSON.stringify(k));
      hash.update(":");
      scrivi(v[k]);
      hash.update(",");
    }
    hash.update("}");
  };
  scrivi(valore);
  return hash.digest("hex").slice(0, 12);
}

/** Impacchetta il gioco e il motore di un albero di sorgenti (src/) in un modulo per Node. */
async function impacchetta(sorgenti, uscita) {
  const { build } = await import("vite");
  const ingresso = join(uscita, "..", `${uscita.split(/[\\/]/).pop()}-ingresso.ts`);
  const rel = (p) => `./${relative(dirname(ingresso), join(sorgenti, p)).replace(/\\/g, "/")}`;
  writeFileSync(ingresso, `export { gameReducer } from "${rel("src/game/engine")}";\nexport { giocaPartita } from "${rel("src/motore/partita")}";\n`);
  await build({
    configFile: false,
    root: ROOT,
    logLevel: "warn",
    build: {
      ssr: ingresso,
      outDir: uscita,
      emptyOutDir: true,
      copyPublicDir: false,
      target: "node20",
      rollupOptions: { output: { entryFileNames: "gioco.mjs", format: "es" } },
    },
    ssr: { noExternal: true },
  });
  return join(uscita, "gioco.mjs");
}

/** I file di src/ di un commit, scritti in `cartella` (un solo git, va anche su Windows). */
function estrai(commit, cartella) {
  const percorsi = execSync(`git ls-tree -r --name-only ${commit} src`, { cwd: ROOT, maxBuffer: 1 << 26 })
    .toString().trim().split("\n")
    // Niente test: estratti nel repo finirebbero nella suite di vitest.
    .filter((percorso) => !/\.test\.tsx?$/.test(percorso));
  const uscita = spawnSync("git", ["cat-file", "--batch"], {
    cwd: ROOT,
    input: percorsi.map((p) => `${commit}:${p}`).join("\n") + "\n",
    maxBuffer: 1 << 30,
  }).stdout;
  let pos = 0;
  for (const percorso of percorsi) {
    const fine = uscita.indexOf(10, pos);
    const dimensione = Number(uscita.subarray(pos, fine).toString().split(" ")[2]);
    const file = join(cartella, percorso);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, uscita.subarray(fine + 1, fine + 1 + dimensione));
    pos = fine + 1 + dimensione + 1;
  }
}

function opzioni(argv) {
  const get = (nome, valore) => {
    const i = argv.indexOf(`--${nome}`);
    return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : valore;
  };
  return {
    rif: get("rif", "HEAD"),
    tick: Number(get("tick", 300)),
    partite: Number(get("partite", 2)),
    scuole: Number(get("scuole", 2)),
    ripeti: Math.max(1, Number(get("ripeti", 3))),
    seme: Number(get("seme", 1)),
  };
}

/** In un thread: un'istantanea per N tick, oppure una partita intera. */
async function lavoratore() {
  const { modulo, compito } = workerData;
  const gioco = await import(pathToFileURL(modulo).href);
  if (compito.tipo === "istantanea") {
    let state = JSON.parse(readFileSync(compito.file, "utf8"));
    const base = state.automation.lastProcessedAt;
    const t0 = performance.now();
    for (let k = 1; k <= compito.tick; k += 1) {
      state = gioco.gameReducer(state, { type: "TICK", now: base + k * 1_000, minStepMs: 1_000 });
    }
    const ms = (performance.now() - t0) / compito.tick;
    parentPort.postMessage({ ms, impronta: impronta(state) });
    return;
  }
  const t0 = performance.now();
  const registro = gioco.giocaPartita({ seed: compito.seme, maxScuole: compito.scuole, maxOre: 60 });
  parentPort.postMessage({
    ms: performance.now() - t0,
    impronta: impronta({ eventi: registro.eventi, minuti: registro.minutiTotali, finestre: registro.finestre, errori: registro.errori }),
  });
}

function inThread(modulo, compito) {
  return new Promise((ok, ko) => {
    const worker = new Worker(fileURLToPath(import.meta.url), { workerData: { modulo, compito } });
    worker.once("message", ok);
    worker.once("error", ko);
  });
}

/** Esegue i compiti al massimo `posti` alla volta, nell'ordine. */
async function aTurni(compiti, posti) {
  const risultati = new Array(compiti.length);
  let prossimo = 0;
  await Promise.all(Array.from({ length: Math.min(posti, compiti.length) }, async () => {
    while (prossimo < compiti.length) {
      const i = prossimo++;
      risultati[i] = await compiti[i]();
    }
  }));
  return risultati;
}

async function istantanee(o) {
  mkdirSync(ISTANTANEE, { recursive: true });
  const modulo = await impacchetta(ROOT, join(LAVORO, "attuale"));
  const gioco = await import(pathToFileURL(modulo).href);
  const t0 = Date.now();
  console.log(`Gioco la partita del seme ${o.seme} e salvo le istantanee in ${ISTANTANEE} (ci vuole un po', soprattutto per la scuola 12).`);
  const punti = PUNTI.map((p) => ({ ...p, fatto: false }));
  gioco.giocaPartita({
    seed: o.seme,
    maxScuole: 13,
    maxOre: 60,
    onAvanzamento: (r, s) => {
      const punto = punti.find((p) => !p.fatto && p.ok(r, s));
      if (punto) {
        punto.fatto = true;
        writeFileSync(join(ISTANTANEE, `${punto.nome}.json`), JSON.stringify(s));
        console.log(`  ${punto.nome}: ${s.school.activeMembers.toLocaleString("it-IT")} iscritti, ${s.collaborators.length} collaboratori (${Math.round((Date.now() - t0) / 60_000)} min)`);
      }
      // ponytail: esce dalla partita appena ha tutte le istantanee
      if (punti.every((p) => p.fatto)) process.exit(0);
    },
  });
  const mancanti = punti.filter((p) => !p.fatto).map((p) => p.nome);
  if (mancanti.length) console.log(`La partita è finita prima di: ${mancanti.join(", ")}.`);
}

async function confronta(o) {
  const files = existsSync(ISTANTANEE) ? readdirSync(ISTANTANEE).filter((f) => f.endsWith(".json")).sort() : [];
  if (!files.length && o.partite === 0) {
    console.error("Nessuna istantanea: prima `node scripts/verifica.mjs istantanee`.");
    process.exit(1);
  }
  // Il riferimento: i sorgenti del commit, estratti dentro il repo così trovano node_modules.
  const sorgentiRif = join(LAVORO, "rif-sorgenti");
  rmSync(sorgentiRif, { recursive: true, force: true });
  mkdirSync(sorgentiRif, { recursive: true });
  const commit = execSync(`git rev-parse --short ${o.rif}`, { cwd: ROOT }).toString().trim();
  estrai(commit, sorgentiRif);
  console.log(`Confronto: codice attuale contro ${o.rif} (${commit}).`);
  const rif = await impacchetta(sorgentiRif, join(LAVORO, "rif"));
  rmSync(sorgentiRif, { recursive: true, force: true });
  const attuale = await impacchetta(ROOT, join(LAVORO, "attuale"));

  const prove = [
    ...files.map((file) => ({ nome: file.replace(/\.json$/, ""), compito: { tipo: "istantanea", file: join(ISTANTANEE, file), tick: o.tick } })),
    ...Array.from({ length: o.partite }, (_, i) => ({ nome: `partita seme ${i + 1} → scuola ${o.scuole}`, compito: { tipo: "partita", seme: i + 1, scuole: o.scuole } })),
  ];
  // Le istantanee si misurano più volte alternando i codici; le partite intere una volta.
  const volte = (p) => p.compito.tipo === "istantanea" ? o.ripeti : 1;
  const compiti = prove.flatMap((p) => Array.from({ length: volte(p) }, () =>
    [() => inThread(rif, p.compito), () => inThread(attuale, p.compito)]).flat());
  const grezzi = await aTurni(compiti, Math.max(1, availableParallelism() - 1));
  const risultati = [];
  let letti = 0;
  for (const p of prove) {
    const misure = grezzi.slice(letti, letti += 2 * volte(p));
    for (const lato of [0, 1]) {
      const mie = misure.filter((_, i) => i % 2 === lato);
      // Stessa impronta a ogni ripetizione, altrimenti il gioco non è deterministico: si segnala.
      const impronte = new Set(mie.map((m) => m.impronta));
      risultati.push({ ms: Math.min(...mie.map((m) => m.ms)), impronta: impronte.size === 1 ? mie[0].impronta : "non-deterministico" });
    }
  }

  let diverse = 0;
  console.log(`\n  ${"Prova".padEnd(30)}${"Riferimento".padEnd(16)}${"Attuale".padEnd(16)}${"Più veloce".padEnd(12)}Risultato`);
  prove.forEach((p, i) => {
    const [a, b] = [risultati[2 * i], risultati[2 * i + 1]];
    const uguale = a.impronta === b.impronta;
    if (!uguale) diverse += 1;
    const tempo = (r) => p.compito.tipo === "istantanea" ? `${r.ms.toFixed(1)} ms/tick` : `${Math.round(r.ms / 1000)} s`;
    console.log(`  ${p.nome.padEnd(30)}${tempo(a).padEnd(16)}${tempo(b).padEnd(16)}${`${(a.ms / b.ms).toFixed(2)}×`.padEnd(12)}${uguale ? "identico" : `DIVERSO (${a.impronta} ≠ ${b.impronta})`}`);
  });
  console.log(diverse ? `\n✗ ${diverse} prove con risultato diverso: l'ottimizzazione cambia il gioco.` : "\n✓ Tutto identico.");
  process.exit(diverse ? 1 : 0);
}

if (!isMainThread) {
  await lavoratore();
} else {
  const argv = process.argv.slice(2);
  const o = opzioni(argv);
  await (argv[0] === "istantanee" ? istantanee(o) : confronta(o));
}
