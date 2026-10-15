#!/usr/bin/env node
/**
 * Motore di test di LudoClicker (Andrea, 14/10/2026).
 *
 *   npm run motore -- --partite 50 --scuole 20
 *   node scripts/motore.mjs --partite 50 --scuole 20   (da PowerShell, che toglie il --)
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
 *   --reputation  confronto tra strategie di Reputazione (anche --reputazione):
 *                 da solo, le partite si dividono in 8 gruppi: tutti i punti in
 *                 Scrittura, Eventi, Iscrizioni, Business Strategy, Formazione,
 *                 Genetica, Rendita del Network, oppure alla pari tra i rami;
 *                 con un ramo (es. --reputation scrittura) metà partite in quel
 *                 ramo e metà alla pari. Report e riepilogo finale per strategia.
 *   --uscita dir  cartella dei risultati (motore-risultati/<data>)
 *   --help, -h    mostra questo aiuto
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
 *
 * Nel terminale un pannello fisso si ridisegna ogni 2 secondi: avanzamento totale,
 * stima della fine e una riga per partita (scuola, ore di gioco, iscritti, cosa sta
 * facendo). Con l'uscita in un file, una riga al minuto.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

/** Strategie di Reputazione (Andrea, 15/10): nome sul comando → modo del giocatore e nome nel report. */
const STRATEGIE = {
  scrittura: { modo: "writing", nome: "Scrittura" },
  eventi: { modo: "events", nome: "Eventi" },
  iscrizioni: { modo: "enrollment", nome: "Iscrizioni" },
  social: { modo: "socialGadgets", nome: "Business Strategy" },
  formazione: { modo: "training", nome: "Formazione" },
  genetica: { modo: "genetics", nome: "Genetica" },
  rendita: { modo: "rendita", nome: "Rendita del Network" },
  pari: { modo: "pari", nome: "Alla pari" },
};
const ALIAS = { gadget: "social", socialgadget: "social", business: "social", bilanciata: "pari", bilanciato: "pari" };
const NOMI_STRATEGIE = Object.fromEntries(Object.values(STRATEGIE).map((s) => [s.modo, s.nome]));

/** Senza --reputation: tutte alla pari. Da solo: le 8 strategie. Con un ramo: quel ramo e alla pari. */
function strategieReputazione(argv) {
  const index = argv.findIndex((arg) => ["--reputation", "--reputazione", "--reputationtest"].includes(arg));
  if (index < 0) return ["pari"];
  const valore = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[index + 1].toLowerCase() : undefined;
  if (argv[index] === "--reputationtest" || !valore || valore === "test" || valore === "tutte") {
    return Object.values(STRATEGIE).map((s) => s.modo);
  }
  const chiave = ALIAS[valore] ?? valore;
  if (!STRATEGIE[chiave]) {
    console.error(`Strategia di Reputazione sconosciuta: ${valore}. Possibili: ${Object.keys(STRATEGIE).join(", ")} (oppure niente, per provarle tutte).`);
    process.exit(1);
  }
  return chiave === "pari" ? ["pari"] : [STRATEGIE[chiave].modo, "pari"];
}

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
    strategie: strategieReputazione(argv),
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
  const { seed, scuole, ore, pausa, reputazione } = workerData;
  const segnale = new Int32Array(pausa);
  let prossimaMemoria = 0;
  const registro = motore.giocaPartita({
    seed,
    maxScuole: scuole,
    maxOre: ore,
    reputazione,
    onAvanzamento: (parziale, state) => parentPort.postMessage({
      tipo: "avanzamento",
      minuti: parziale.minutiTotali,
      scuola: parziale.scuoleRaggiunte,
      iscritti: state.school.activeMembers,
      stato: descriviStato(parziale),
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

const TITOLI = {
  accademico: "titolo all'Accademico",
  nazionale: "Nazionale vinto",
  champions: "Champion's Arena vinta",
  chronicles: "Chronicles vinte",
  reptile: "Reptile vinto",
};

/** Cosa sta facendo la partita, dall'ultimo fatto importante della scuola in corso. */
function descriviStato(registro) {
  const scuola = registro.scuoleRaggiunte;
  for (let index = registro.eventi.length - 1; index >= 0; index -= 1) {
    const evento = registro.eventi[index];
    // «fondazione disponibile» appartiene alla scuola in corso; le altre «fondazione» chiudono la precedente.
    if (evento.tipo === "fondazione" && evento.chiave !== "disponibile") return "scuola appena fondata";
    if (evento.scuola !== scuola) continue;
    if (evento.tipo === "fondazione") return "può fondare, cresce ancora";
    if (evento.tipo === "criterio-fondazione") return `muro raggiunto: fonda tra ${evento.valore} mesi`;
    if (evento.tipo === "titolo" && TITOLI[evento.chiave]) return TITOLI[evento.chiave];
    if (evento.tipo === "sblocco" && evento.chiave === "consiglio") return "nato il Consiglio delle Onde";
    if (evento.tipo === "tappa" && evento.chiave === "primo-scolastico") return "primo Scolastico giocato";
  }
  return scuola === 1 ? "prima scuola" : "gioca";
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
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    // ponytail: l'aiuto è il commento in testa al file, così resta sempre allineato
    const testa = readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0];
    console.log(testa.replace(/^#!.*\n\/\*\*\n/, "").replace(/^ \* ?/gm, "").trimEnd());
    return;
  }
  const argv = process.argv.slice(2);
  // ponytail: PowerShell (npm.ps1) toglie il "--" e npm si tiene i nomi delle opzioni: meglio fermarsi che partire coi predefiniti
  if (argv.length && !argv[0].startsWith("--")) {
    console.error(`Argomenti senza nome (${argv.join(" ")}): da PowerShell usa\n  node scripts/motore.mjs --partite 16 --scuole 10\noppure npm.cmd run motore -- ...  (aiuto: --help)`);
    process.exit(1);
  }
  const o = opzioni(argv);
  try { setPriority(PRIORITA[o.priorita]); } catch { /* non permesso: si va avanti */ }
  // Soglia di sicurezza: sotto questa RAM libera il motore restituisce memoria al sistema.
  const sogliaMb = Math.max(MEMORIA_MINIMA_MB, (totalmem() / MB) * 0.03);
  console.log(`Motore di test: ${o.partite} partite fino alla scuola ${o.scuole}; fino a ${o.thread} in contemporanea su ${o.core} core (CPU fino al ${o.cpu}%), RAM fino al ${o.ram}% di quella libera, priorità ${o.priorita}.`);
  await impacchetta();
  const motore = await import(pathToFileURL(BUNDLE).href);

  // Le strategie a turno: con 24 partite e 8 strategie, 3 partite ciascuna. Ogni
  // strategia gioca gli stessi semi (1, 2, 3…): la prima scuola è identica per tutte
  // e le differenze vengono solo da come si spende la Reputazione.
  const coda = Array.from({ length: o.partite }, (_, index) => ({
    id: index,
    seed: o.seme + Math.floor(index / o.strategie.length),
    tentativi: 0,
    reputazione: o.strategie[index % o.strategie.length],
  }));
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

  // M1 «Pannello fisso» (Andrea, 14/10): in un terminale il pannello si ridisegna al suo
  // posto; con l'uscita in un file, una riga semplice al minuto.
  const tty = Boolean(process.stdout.isTTY);
  const colore = (codice) => (testo) => tty ? `\x1b[${codice}m${testo}\x1b[0m` : testo;
  const [tenue, azzurro, oro, verde, viola, rosso, forte] = [2, 36, 33, 32, 35, 31, 1].map(colore);
  const ora = (data) => data.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const avviato = new Date();
  const finite = new Map(); // seme → { minuti, iscritti }
  /** Minuti reali per scuola, per livello di scuola: servono alla stima della fine. */
  const durate = new Map();
  let righePannello = 0;
  let ultimaRiga = 0;

  const barra = (pieni, totale, larghezza, tinta) => {
    const n = Math.max(0, Math.min(larghezza, Math.round((pieni / totale) * larghezza)));
    return tinta("█".repeat(n)) + tenue("░".repeat(larghezza - n));
  };
  const oreGioco = (minuti) => `${Math.floor(minuti / 60)} h ${String(Math.floor(minuti % 60)).padStart(2, "0")}`;
  const durataMedia = (livello) => {
    const misure = durate.get(livello);
    if (misure?.length) return misure.reduce((a, b) => a + b, 0) / misure.length;
    // Livello non ancora visto: l'ultimo noto, un po' più lungo per ogni scuola in più.
    const noti = [...durate.keys()].filter((k) => k < livello);
    if (!noti.length) return undefined;
    const base = Math.max(...noti);
    return durataMedia(base) * 1.1 ** (livello - base);
  };
  /** Minuti reali che mancano a una partita, dalla scuola in cui è e da quanto ci è dentro. */
  const mancaA = (scuola, dentroMin) => {
    let totale = 0;
    for (let livello = scuola; livello <= o.scuole; livello += 1) {
      const media = durataMedia(livello);
      if (media === undefined) return undefined;
      totale += livello === scuola ? Math.max(media * 0.1, media - dentroMin) : media;
    }
    return totale;
  };
  const stimaFine = () => {
    const adesso = Date.now();
    const lista = [...inCorso.values()];
    const resti = lista.map((p) => mancaA(p.scuola, (adesso - p.inizioScuola) / 60_000));
    const intera = mancaA(1, 0);
    if (resti.some((r) => r === undefined) || (coda.length && intera === undefined)) return undefined;
    const lavoro = resti.reduce((a, b) => a + b, 0) + coda.length * intera;
    const posti = Math.max(1, Math.min(obiettivo, lista.length + coda.length));
    return Math.max(...resti, 0, lavoro / posti);
  };
  const avanzamento = () => {
    let fatte = finite.size * o.scuole;
    for (const p of inCorso.values()) fatte += p.scuola - 1;
    return fatte;
  };

  // Con più strategie di Reputazione, il nome della strategia accanto al numero della partita.
  const larghezzaNome = o.strategie.length > 1 ? 28 : 11;
  const pannello = () => {
    const lista = [...inCorso.values()];
    const fatte = avanzamento();
    const totali = o.partite * o.scuole;
    const stima = stimaFine();
    const fine = stima === undefined
      ? tenue("stima dopo la prima scuola finita")
      : stima < 1
        ? oro("meno di un minuto")
        : `${oro(`tra circa ${Math.round(stima)} min`)} ${tenue(`(verso le ${ora(new Date(Date.now() + stima * 60_000))})`)}`;
    const righe = [
      `${forte("MOTORE DI TEST")} ${tenue(`· ${o.partite} partite fino alla scuola ${o.scuole} · avviato alle ${ora(avviato)}`)}`,
      "",
      `  Avanzamento  ${barra(fatte, totali, 30, azzurro)}  ${forte(`${Math.round((fatte / totali) * 100)}%`)}   ${fatte} scuole su ${totali}`,
      `  Fine stimata ${fine}   finite ${verde(`${finite.size}/${o.partite}`)}`,
      "",
      tenue(`  ${"PARTITA".padEnd(larghezzaNome - 2)}${"SCUOLA".padEnd(o.scuole + 9)}${"GIOCO".padEnd(10)}${"ISCRITTI".padEnd(10)}STATO`),
    ];
    // Le partite in corso si vedono sempre tutte; finite e in coda solo se avanza posto.
    const spazio = Math.max(4, (process.stdout.rows ?? 40) - 16);
    const etichetta = (voce) => o.strategie.length > 1 ? `#${voce.seed} ${NOMI_STRATEGIE[voce.reputazione]}` : `#${voce.seed}`;
    if (lista.length > spazio) {
      // Troppe per una riga ciascuna: griglia compatta «#seme scuola/totale iscritti».
      righe.pop();
      const celle = lista.map((p) => {
        const testo = `${etichetta(p)} ${p.scuola}/${o.scuole} ${p.iscritti.toLocaleString("it-IT")}`;
        return { testo, tinta: p.pausa ? viola : p.stato.startsWith("muro") ? oro : azzurro };
      });
      const larga = Math.max(...celle.map((c) => c.testo.length)) + 3;
      const perRiga = Math.max(1, Math.floor(((process.stdout.columns ?? 100) - 2) / larga));
      righe.push(tenue(`  IN CORSO (${lista.length}) · scuola e iscritti · ${oro("oro")} sta per fondare · ${viola("viola")} in pausa`));
      for (let i = 0; i < celle.length; i += perRiga) {
        righe.push(`  ${celle.slice(i, i + perRiga).map((c) => c.tinta(c.testo.padEnd(larga))).join("")}`);
      }
    }
    const voci = [
      ...(lista.length > spazio ? [] : lista.map((p) => ({ seed: p.seed, reputazione: p.reputazione, p }))),
      ...[...finite.values()].map((finita) => ({ seed: finita.seed, reputazione: finita.reputazione, finita })),
      ...coda.map((voce) => ({ seed: voce.seed, reputazione: voce.reputazione, coda: true })),
    ];
    const mostrate = lista.length > spazio ? [] : voci.slice(0, spazio);
    for (const voce of mostrate) {
      const nome = (o.strategie.length > 1 ? `  #${voce.seed} ${NOMI_STRATEGIE[voce.reputazione]}` : `  #${voce.seed}`).padEnd(larghezzaNome);
      if (voce.p) {
        const p = voce.p;
        const stato = p.pausa ? viola("in pausa (PC occupato)") : p.stato.startsWith("muro") ? oro(p.stato) : tenue(p.stato);
        righe.push(`${nome}${barra(p.scuola - 1, o.scuole, o.scuole, azzurro)} ${`${p.scuola}/${o.scuole}`.padEnd(7)}${oreGioco(p.minuti).padEnd(10)}${p.iscritti.toLocaleString("it-IT").padEnd(10)}${stato}`);
      } else if (voce.finita) {
        righe.push(`${nome}${verde("█".repeat(o.scuole))} ${verde("✓".padEnd(7))}${oreGioco(voce.finita.minuti).padEnd(10)}${voce.finita.iscritti.toLocaleString("it-IT").padEnd(10)}${verde("finita")}`);
      } else {
        righe.push(`${nome}${tenue("░".repeat(o.scuole))} ${"".padEnd(7)}${"".padEnd(20)}${tenue("in coda")}`);
      }
    }
    const nascoste = voci.slice(mostrate.length);
    if (nascoste.length) {
      const finiteNascoste = nascoste.filter((voce) => voce.finita).length;
      righe.push(tenue(`  … e ${[finiteNascoste && `${finiteNascoste} finite`, nascoste.length - finiteNascoste && `${nascoste.length - finiteNascoste} in coda`].filter(Boolean).join(", ")}`));
    }
    righe.push(
      "",
      tenue(`  PC: altri programmi ${Math.round(altri * 100)}% CPU · RAM libera ${(freemem() / MB / 1024).toFixed(1).replace(".", ",")} GB · priorità ${o.priorita}`),
      ...(motivo ? [`  ${oro(`⚠ ${motivo}`)}`] : []),
      ...problemi.slice(-3).map((testo) => `  ${rosso(`✗ ${testo}`)}`),
      tenue("  Ctrl+C per fermare"),
    );
    return righe;
  };

  const stampa = () => {
    if (tty) {
      const righe = pannello();
      // Torna all'inizio del pannello precedente, cancella fino in fondo e ridisegna.
      process.stdout.write(`${righePannello ? `\x1b[${righePannello}F` : ""}\x1b[J${righe.join("\n")}\n`);
      righePannello = righe.length;
      return;
    }
    if (Date.now() - ultimaRiga < 60_000) return;
    ultimaRiga = Date.now();
    const stima = stimaFine();
    console.log(`[${ora(new Date())}] ${Math.round((avanzamento() / (o.partite * o.scuole)) * 100)}% · finite ${finite.size}/${o.partite}` +
      (stima === undefined ? "" : ` · fine tra circa ${Math.max(1, Math.round(stima))} min`) + (motivo ? ` · ${motivo}` : ""));
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
      workerData: { seed: voce.seed, scuole: o.scuole, ore: o.ore, pausa, reputazione: voce.reputazione },
      resourceLimits: {
        maxOldGenerationSizeMb: Math.floor(limiteMb * 0.85),
        // Una generazione giovane più grande = meno pulizie della memoria.
        maxYoungGenerationSizeMb: Math.max(32, Math.min(512, Math.floor(limiteMb * 0.1))),
      },
    });
    const p = { ...voce, worker, segnale: new Int32Array(pausa), pausa: false, minuti: 0, scuola: 1, iscritti: 0, stato: "prima scuola", inizioScuola: Date.now(), usataMb: 0, limiteMb, finita: false, richiamata: false, memoriaFinita: false };
    inCorso.set(voce.id, p);
    worker.on("message", (message) => {
      if (message.tipo === "memoria") p.usataMb = message.mb;
      else if (message.tipo === "avanzamento") {
        if (message.scuola !== p.scuola) {
          // Una scuola finita: la sua durata reale aiuta la stima della fine.
          durate.set(p.scuola, [...(durate.get(p.scuola) ?? []), (Date.now() - p.inizioScuola) / 60_000]);
          p.inizioScuola = Date.now();
        }
        Object.assign(p, { minuti: message.minuti, scuola: message.scuola, iscritti: message.iscritti, stato: message.stato });
      } else {
        p.finita = true;
        durate.set(p.scuola, [...(durate.get(p.scuola) ?? []), (Date.now() - p.inizioScuola) / 60_000]);
        finite.set(voce.id, { minuti: message.registro.minutiTotali, iscritti: p.iscritti, seed: voce.seed, reputazione: voce.reputazione });
        registri.push(message.registro);
      }
    });
    worker.on("error", (error) => {
      if (error.code === "ERR_WORKER_OUT_OF_MEMORY") p.memoriaFinita = true;
      else problemi.push(`partita ${voce.seed} (${NOMI_STRATEGIE[voce.reputazione]}): ${error.message}`);
    });
    worker.on("exit", (code) => {
      inCorso.delete(voce.id);
      if (!p.finita) {
        if (p.richiamata) coda.unshift({ ...voce });
        else if (p.memoriaFinita && voce.tentativi + 1 < TENTATIVI) coda.unshift({ ...voce, tentativi: voce.tentativi + 1 });
        else problemi.push(`partita ${voce.seed} (${NOMI_STRATEGIE[voce.reputazione]}): ${p.memoriaFinita ? `memoria esaurita (${limiteMb} MB)` : `thread uscito con codice ${code}`}`);
      }
      regola(false);
      stampa();
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
    // Solo se ci sono davvero partite che aspettano: con 20 partite su 24 core il tetto a 22 non ferma nessuno.
    motivo = obiettivo < Math.min(o.thread, inCorso.size + coda.length) ? "il PC è occupato: alcune partite aspettano" : "";
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

  registri.sort((left, right) => left.seed - right.seed || o.strategie.indexOf(left.strategia) - o.strategie.indexOf(right.strategia));
  const analisi = motore.analizza(registri);
  let commit = "";
  try { commit = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { /* fuori da git */ }
  const versione = `salvataggio v${motore.GAME_CONFIG.version}${commit ? ` · commit ${commit}` : ""} · Reputazione: ${o.strategie.map((modo) => NOMI_STRATEGIE[modo]).join(", ")}`;
  const confronto = o.strategie.length > 1 ? motore.confrontaStrategie(registri, o.scuole) : undefined;
  const secondi = (Date.now() - t0) / 1000;
  mkdirSync(o.uscita, { recursive: true });
  writeFileSync(join(o.uscita, "dati.json"), JSON.stringify({ opzioni: o, versione, secondi, problemi, analisi, confronto, registri }));
  writeFileSync(join(o.uscita, "report.html"), motore.creaReport(analisi, {
    creato: new Date().toLocaleString("it-IT"),
    partite: registri.length,
    scuole: o.scuole,
    secondi,
    versione,
    ...(confronto ? { confronto: { righe: confronto, nomi: NOMI_STRATEGIE } } : {}),
  }));
  if (confronto) stampaConfronto(confronto, o.scuole);
  if (problemi.length) console.log(`Problemi:\n - ${problemi.join("\n - ")}`);
  console.log(`Fatto in ${Math.round(secondi / 60)} min. Report: ${join(o.uscita, "report.html")}`);
}

/** Il riepilogo finale per strategia di Reputazione: mediane, ordinate dalla più veloce. */
function stampaConfronto(righe, obiettivo) {
  const ore = (minuti) => minuti === undefined ? "—" : `${Math.floor(minuti / 60)} h ${String(Math.round(minuti % 60)).padStart(2, "0")}`;
  const numero = (valore) => valore === undefined ? "—" : Math.round(valore).toLocaleString("it-IT");
  const ordinate = [...righe].sort((a, b) => (a.fine.p50 ?? Infinity) - (b.fine.p50 ?? Infinity));
  const pari = righe.find((riga) => riga.strategia === "pari")?.fine.p50;
  console.log(`\nStrategie di Reputazione (mediane; fine = un anno dopo il muro della scuola ${obiettivo})`);
  console.log(`  ${"Strategia".padEnd(22)}${"Partite".padEnd(9)}${"Fine".padEnd(10)}${"vs pari".padEnd(9)}${"Reputazione".padEnd(13)}${"Iscritti al muro".padEnd(18)}${"Nazionali".padEnd(11)}Upgrade`);
  for (const riga of ordinate) {
    const arrivate = riga.fine.raggiunte < riga.partite ? ` (${riga.fine.raggiunte}/${riga.partite})` : "";
    const confronto = pari && riga.fine.p50 && riga.strategia !== "pari"
      ? `${riga.fine.p50 <= pari ? "−" : "+"}${Math.round(Math.abs(riga.fine.p50 - pari) / pari * 100)}%`
      : "";
    console.log(`  ${(NOMI_STRATEGIE[riga.strategia] ?? riga.strategia).padEnd(22)}${String(riga.partite).padEnd(9)}${(ore(riga.fine.p50) + arrivate).padEnd(10)}${confronto.padEnd(9)}${numero(riga.reputazione.p50).padEnd(13)}${numero(riga.iscrittiAlMuro.p50).padEnd(18)}${numero(riga.nazionali.p50).padEnd(11)}${numero(riga.upgrade.p50)}`);
  }
}

if (isMainThread) {
  principale().catch((error) => { console.error(error); process.exit(1); });
} else {
  lavoratore().catch((error) => { console.error(error); process.exit(1); });
}
