/*
 * Banca di frasi che crescono con i potenziamenti Creatività.
 *
 * Ogni email del catalogo tiene la sua idea; da qui arrivano le parti aggiuntive,
 * sempre più curate man mano che sale il livello:
 *   1      righe brevi e scherzose dopo la bozza corretta
 *   2      frasi cortesi e informative
 *   3–4    tono caldo: gancio iniziale, punti elenco, invito all'azione
 *   5–7    copy da campagna: ganci forti, benefici, oggetti accattivanti, P.S.
 * Ogni punto Creatività del livello aggiunge una frase o un punto elenco.
 * `avoid` salta una frase se l'email dice già la stessa cosa.
 * Segnaposto: {{firstName}}, {{city}}, {{orderName}}.
 */

export interface EmailPhrase {
  text: string;
  avoid?: RegExp;
}

const FREE = /gratis|gratuit|non costa|zero/i;
const CLOTHES = /abiti|vestiti|scarpe|tuta/i;
const GEAR = /attrezzatura|materiale|spade le portiamo|ti diamo la spada|diamo la spada/i;
const BEGINNERS = /esperienza|principianti|da zero/i;

/** Livello 1: la bozza corretta resta scherzosa, con una riga in più per punto. */
export const DRAFT_LINES: EmailPhrase[] = [
  { text: "Prova gratis, giuro.", avoid: FREE },
  { text: "Vestiti comodi, grazie.", avoid: CLOTHES },
  { text: "Le spade le portiamo noi.", avoid: GEAR },
  { text: "Rispondi pure!" },
  { text: "Zero esperienza? Perfetto.", avoid: BEGINNERS },
  { text: "Ti aspettiamo!" },
  { text: "Niente da comprare." },
  { text: "Porta un amico." },
  { text: "Dubbi? Scrivici." },
  { text: "Luci accese, spade cariche." },
];

/** Livello 2: frasi ordinate e rassicuranti dopo l'invito. */
export const COURTEOUS_LINES: EmailPhrase[] = [
  { text: "La lezione di prova è gratuita e non comporta alcun impegno.", avoid: /gratis|gratuit|impegno/i },
  { text: "Per iniziare bastano abiti comodi e scarpe da ginnastica pulite.", avoid: CLOTHES },
  { text: "Le spade e tutta l'attrezzatura sono messe a disposizione dalla scuola.", avoid: GEAR },
  { text: "Non è richiesta alcuna esperienza: si comincia dai movimenti fondamentali.", avoid: BEGINNERS },
  { text: "Gli istruttori seguono ogni nuovo partecipante passo dopo passo." },
  { text: "Dopo la prova avrai tutte le informazioni su orari e corsi, e potrai decidere con calma." },
  { text: "Se hai domande, puoi rispondere direttamente a questa email." },
  { text: "Chi comincia trova sempre un compagno di esercizi al proprio livello." },
  { text: "Le regole sulla sicurezza vengono spiegate all'inizio di ogni lezione." },
  { text: "Saremo felici di conoscerti di persona." },
];

/** Livelli 3–4: la prima frase dell'email, calda e personale. */
export const WARM_HOOKS: EmailPhrase[] = [
  { text: "ti scrivo perché credo che questa possa essere la tua prossima passione." },
  { text: "c'è un posto nella nostra palestra che sembra fatto apposta per te." },
  { text: "ogni grande schermidore ha avuto una prima lezione: la tua può essere la prossima." },
  { text: "qualche minuto di lettura, e forse una serata diversa dal solito." },
  { text: "abbiamo pensato a te mentre preparavamo la prossima lezione di prova." },
  { text: "immagina di impugnare una spada luminosa per la prima volta, in mezzo a persone che fanno il tifo per te." },
  { text: "a {{city}} c'è un gruppo che si allena a far scherma con spade luminose, e ti sta aspettando." },
  { text: "la curiosità che ti ha portato fin qui è esattamente quella che serve." },
  { text: "ci sono sport che si guardano e sport che si vivono: questo è il secondo tipo." },
  { text: "abbiamo una proposta semplice per rendere più interessante la tua settimana." },
];

/** Livelli 5–7: ganci da campagna, con un pizzico di ironia. */
export const MARKETING_HOOKS: EmailPhrase[] = [
  { text: "c'è chi sogna di impugnare una spada illuminata. E c'è chi lo fa ogni settimana." },
  { text: "novanta minuti, una spada luminosa e la sensazione di essere dentro il film giusto." },
  { text: "la tua settimana ha bisogno di più luce. Letteralmente." },
  { text: "tre armi, sette Forme, un gruppo che non vede l'ora di conoscerti. Manchi solo tu." },
  { text: "non ti chiediamo di diventare un eroe. Ti chiediamo solo una sera per scoprire se ti piace sembrarlo." },
  { text: "il primo colpo inferto non si scorda mai. Il primo applauso dei compagni di clan nemmeno." },
  { text: "lo sport più luminoso di {{city}} ha una porta aperta, e c'è scritto il tuo nome." },
  { text: "se hai sempre pensato che fosse roba da film, abbiamo una bella sorpresa per te." },
  { text: "tecnica, adrenalina e una comunità che ti accoglie dal primo minuto: {{orderName}} ti aspetta." },
  { text: "spegni il telefono, accendi la spada. Il resto viene da sé." },
];

/** Livelli 3–4: punti elenco chiari e concreti. */
export const INFO_DETAILS: EmailPhrase[] = [
  { text: "Lezione di prova gratuita e senza impegno." },
  { text: "Spade e protezioni fornite dalla scuola." },
  { text: "Istruttori che seguono ogni principiante." },
  { text: "Regole di sicurezza chiare fin dal primo minuto." },
  { text: "Esercizi graduali, pensati per chi parte da zero." },
  { text: "Tre armi da scoprire nel tempo: lama singola, doppia lama e staffa." },
  { text: "Sette Forme di combattimento, ognuna con il suo stile." },
  { text: "Un gruppo accogliente, di tutte le età." },
  { text: "Allenamento completo per corpo e concentrazione." },
  { text: "Tornei e incontri con altre scuole per chi vuole mettersi alla prova." },
];

/** Livelli 5–7: benefici brevi e d'impatto. */
export const PUNCHY_DETAILS: EmailPhrase[] = [
  { text: "Zero euro, zero impegno, tanta luce." },
  { text: "Tu porti la curiosità, al resto pensiamo noi." },
  { text: "Istruttori veri, spade vere, divertimento garantito." },
  { text: "Dalla prima lezione al primo torneo, un passo alla volta." },
  { text: "Tre armi e sette Forme: non ti annoierai mai." },
  { text: "Ti alleni tutto: gambe, riflessi, testa." },
  { text: "Una comunità che festeggia ogni tuo progresso." },
  { text: "Sicurezza prima di tutto, spettacolo subito dopo." },
  { text: "Una sera a settimana che aspetterai tutta la settimana." },
  { text: "Nessuna esperienza richiesta, solo voglia di provare." },
];

/** Livello 4: l'etichetta sopra il blocco principale. */
export const WARM_CALLS: EmailPhrase[] = [
  { text: "UNISCITI A LUDOSPORT!" },
  { text: "LA TUA PRIMA LEZIONE TI ASPETTA" },
  { text: "PROVA GRATIS, DECIDI DOPO" },
  { text: "C'È UNA SPADA CON IL TUO NOME" },
  { text: "INIZIA DA QUI" },
  { text: "VIENI A CONOSCERCI" },
];

/** Livelli 5–7: inviti all'azione da campagna. */
export const MARKETING_CALLS: EmailPhrase[] = [
  { text: "ACCENDI LA TUA SPADA" },
  { text: "IL TUO POSTO IN PALESTRA È PRONTO" },
  { text: "SCRIVI LA TUA PRIMA FORMA" },
  { text: "ENTRA NELL'ORDINE" },
  { text: "LA LUCE È DALLA TUA PARTE" },
  { text: "IL PRIMO PASSO È GRATIS" },
  { text: "DA SPETTATORE A PROTAGONISTA" },
  { text: "TOCCA A TE" },
];

/** Livelli 4: come prenotare, chiaro. */
export const WARM_BOOKINGS: EmailPhrase[] = [
  { text: "COME PRENOTARE\nRispondi a questa email e ti indichiamo la prossima lezione disponibile." },
  { text: "COME PRENOTARE\nScrivici per ricevere le informazioni aggiornate e scegliere il prossimo appuntamento." },
  { text: "COME PRENOTARE\nBasta una risposta con il giorno che preferisci: al resto pensiamo noi." },
  { text: "COME PRENOTARE\nRispondi con un \"ci sono\" e ti mandiamo orario e indirizzo." },
];

/** Livelli 5–7: prenotazione con un po' di urgenza. */
export const MARKETING_BOOKINGS: EmailPhrase[] = [
  { text: "PRENOTA ORA\nI posti per la lezione di prova sono pochi: rispondi oggi e il tuo è garantito." },
  { text: "PRENOTA ORA\nUn clic su Rispondi e sei dentro. Più facile di una parata." },
  { text: "PRENOTA ORA\nScrivici entro questa settimana: la prossima prova si riempie in fretta." },
  { text: "PRENOTA ORA\nRispondi con il tuo nome e ti teniamo da parte una spada." },
];

/** Livelli 6–7: il P.S. in fondo all'email. */
export const POSTSCRIPTS: EmailPhrase[] = [
  { text: "P.S. Porta un amico: le spade sono più belle in coppia." },
  { text: "P.S. Nessuno è mai uscito dalla prima lezione senza sorridere. Controlliamo spesso." },
  { text: "P.S. La spada non è inclusa per sempre, ma la voglia di tornare sì." },
  { text: "P.S. Se hai letto fino a qui, la curiosità ha già fatto il primo allenamento." },
  { text: "P.S. Il divano ti aspetterà. Noi, invece, abbiamo una data." },
  { text: "P.S. Rispondi anche solo con \"forse\": è già un ottimo inizio." },
  { text: "P.S. Ogni campione è stato un principiante. Anche quello che adesso fa le mosse difficili." },
  { text: "P.S. La prima lezione è gratis. La seconda te la vorrai guadagnare." },
];

/** Livelli 6–7: oggetti da campagna. */
export const MARKETING_SUBJECTS: EmailPhrase[] = [
  { text: "{{firstName}}, la tua spada è pronta" },
  { text: "{{firstName}}, una sera di luce a {{city}}?" },
  { text: "Il tuo posto in palestra ti aspetta, {{firstName}}" },
  { text: "{{firstName}}, sei a una lezione dal primo duello" },
  { text: "Accendi la settimana, {{firstName}}" },
  { text: "{{firstName}}, {{orderName}} ti ha scelto" },
  { text: "Prima lezione gratis per te, {{firstName}}" },
  { text: "{{firstName}}, da spettatore a spadaccino in 90 minuti" },
];

/**
 * Takes `count` phrases starting from a position that depends on the email, so
 * two emails of the same level rarely read alike, skipping those whose topic
 * the email already covers.
 */
export function pickPhrases(
  pool: readonly EmailPhrase[],
  index: number,
  count: number,
  existingText = "",
): string[] {
  const picked: string[] = [];
  for (let offset = 0; offset < pool.length && picked.length < count; offset += 1) {
    const phrase = pool[(index * 3 + offset) % pool.length];
    if (phrase.avoid?.test(existingText)) continue;
    picked.push(phrase.text);
  }
  return picked;
}

export function pickPhrase(pool: readonly EmailPhrase[], index: number): string {
  return pool[(index * 3) % pool.length].text;
}
