import type { EmailPresentationLevel } from "../game/types";

export interface EmailTemplate {
  id: string;
  subject: string;
  body: (
    firstName: string,
    senderName: string,
    presentationLevel?: EmailPresentationLevel,
  ) => string;
}

interface TemplateCopy {
  id: string;
  subject: string;
  opening: string;
  invitation: string;
}

const signature = (senderName: string) => `

Un saluto,
${senderName} - Ordine delle Onde
LudoSport Genova`;

const realistic: TemplateCopy[] = [
  { id: "prima-prova", subject: "Una lezione di prova con l'Ordine delle Onde", opening: "grazie per l'interesse dimostrato durante il nostro incontro. La nostra disciplina unisce tecnica, controllo e collaborazione in un ambiente accessibile anche a chi parte da zero.", invitation: "Ti invitiamo a una lezione gratuita: servono soltanto abiti comodi e curiosità." },
  { id: "disciplina-originale", subject: "Scopri una disciplina sportiva originale a Genova", opening: "all'Ordine delle Onde alleniamo coordinazione, precisione e rispetto dell'avversario attraverso un'attività sportiva fuori dall'ordinario.", invitation: "La prima lezione è gratuita e tutto il materiale necessario viene fornito dalla scuola." },
  { id: "sicurezza-prima", subject: "Sicurezza e tecnica nella tua prima lezione", opening: "ogni nuovo partecipante comincia dalle regole di sicurezza e dai movimenti fondamentali, seguito passo dopo passo da chi conduce la lezione.", invitation: "Se vuoi vedere come lavoriamo, possiamo riservarti un posto alla prossima prova." },
  { id: "gruppo-genova", subject: "Conosci il nostro gruppo di Genova", opening: "siamo un gruppo di persone con esperienze diverse, unite dal piacere di allenarsi e imparare insieme con continuità.", invitation: "Vieni a conoscere la scuola durante una lezione introduttiva senza impegno." },
  { id: "coordinazione", subject: "Tecnica, coordinazione e una prova gratuita", opening: "la lezione alterna esercizi individuali, lavoro in coppia e momenti dedicati alla comprensione della tecnica.", invitation: "Non è richiesta alcuna esperienza precedente: la prova è pensata proprio per cominciare." },
  { id: "dopo-evento", subject: "Grazie per essere passato a trovarci", opening: "è stato un piacere incontrarti e raccontarti qualcosa della nostra scuola. Vedere una dimostrazione è utile, ma provare in prima persona chiarisce davvero l'attività.", invitation: "Ti aspettiamo volentieri per una lezione introduttiva gratuita." },
  { id: "materiale-fornito", subject: "Per la prima prova pensiamo noi all'attrezzatura", opening: "per partecipare non occorre acquistare o portare attrezzatura: la scuola mette a disposizione tutto ciò che serve per iniziare in sicurezza.", invitation: "Porta abiti comodi e ti guideremo attraverso i primi esercizi." },
  { id: "allenamento-completo", subject: "Un allenamento per corpo e concentrazione", opening: "questa disciplina richiede presenza, coordinazione e capacità di osservare chi si ha di fronte, con un lavoro fisico graduale e completo.", invitation: "Puoi sperimentarlo direttamente con una prova gratuita in palestra." },
  { id: "prima-volta", subject: "La prima volta si comincia dalle basi", opening: "la lezione introduttiva è costruita per chi non ha mai impugnato una spada: sicurezza, postura e movimenti fondamentali vengono spiegati con calma.", invitation: "Possiamo tenerti un posto al prossimo appuntamento." },
  { id: "orari-gruppo", subject: "Vieni a conoscere gli allenamenti dell'Ordine", opening: "gli allenamenti seguono un percorso progressivo e il gruppo accoglie regolarmente persone interessate a provare per la prima volta.", invitation: "Con una tua conferma ti comunicheremo il prossimo orario disponibile." },
  { id: "ambiente-accogliente", subject: "Una palestra in cui imparare insieme", opening: "la qualità dell'allenamento dipende anche dall'ambiente: attenzione reciproca, rispetto e disponibilità ad aiutarsi fanno parte di ogni incontro.", invitation: "La lezione di prova è il modo migliore per conoscere direttamente il gruppo." },
  { id: "controllo-movimento", subject: "Allena controllo, precisione e movimento", opening: "il percorso tecnico sviluppa controllo del gesto, gestione della distanza e capacità di prendere decisioni in movimento.", invitation: "Ti proponiamo una prima lezione guidata e completamente gratuita." },
  { id: "nessuna-esperienza", subject: "Non serve esperienza per iniziare", opening: "molte persone arrivano da noi senza alcuna esperienza in discipline simili. Il programma iniziale è costruito per accompagnarle in modo graduale.", invitation: "Se sei curioso, prenota una prova e pensa soltanto a divertirti imparando." },
  { id: "attivita-settimanale", subject: "Una nuova attività per la tua settimana", opening: "inserire un allenamento diverso nella propria settimana può essere un buon modo per ritrovare energia e concentrazione.", invitation: "Vieni a verificare di persona se l'Ordine delle Onde fa per te." },
  { id: "domande-prima", subject: "Tutte le domande sono benvenute", opening: "prima di cominciare è normale avere domande su sicurezza, preparazione fisica e svolgimento della lezione. Dedichiamo sempre tempo a rispondere.", invitation: "Puoi venire a una prova gratuita e valutare con calma l'esperienza." },
  { id: "percorso-progressivo", subject: "Un percorso tecnico costruito un passo alla volta", opening: "ogni lezione aggiunge competenze nuove a una base chiara, senza richiedere di imparare tutto immediatamente.", invitation: "La prova introduttiva ti mostrerà il primo tratto del percorso." },
  { id: "prova-senza-impegno", subject: "Prova gratuita e senza impegno a Genova", opening: "la prima partecipazione serve a conoscere persone, spazi e metodo di allenamento prima di prendere qualunque decisione.", invitation: "Rispondi con la tua disponibilità e organizzeremo la visita." },
  { id: "movimento-strategia", subject: "Movimento e strategia nello stesso allenamento", opening: "gli esercizi combinano gesto atletico, lettura della situazione e collaborazione con compagni sempre diversi.", invitation: "Ti invitiamo a sperimentare questa combinazione durante una lezione gratuita." },
  { id: "scuola-aperta", subject: "La scuola è aperta a nuovi partecipanti", opening: "in questo periodo stiamo accogliendo persone interessate a iniziare un percorso regolare insieme al gruppo di Genova.", invitation: "Saremmo felici di presentarti l'attività durante la prossima prova." },
  { id: "invito-aperto", subject: "Il tuo invito all'Ordine delle Onde", opening: "la porta della palestra è aperta a chi vuole allenare presenza, controllo e coordinazione in un contesto accogliente.", invitation: "Il percorso può iniziare con una singola lezione gratuita." },
];

const confident: TemplateCopy[] = [
  { id: "lunedi-luminoso", subject: "Un modo diverso di vivere il lunedì sera", opening: "ci sono lunedì che terminano sul divano e lunedì in cui si impara qualcosa di completamente nuovo insieme a un gruppo motivato.", invitation: "Noi preferiamo i secondi: vieni a provarne uno gratuitamente." },
  { id: "curiosita-inizio", subject: "La curiosità è già un ottimo inizio", opening: "non occorre sapere esattamente cosa aspettarsi. La curiosità basta per entrare in palestra; alle spiegazioni, alla sicurezza e alle spade pensiamo noi.", invitation: "Prenota la tua prima lezione e lascia che il resto diventi esperienza." },
  { id: "routine-nuova", subject: "La tua routine potrebbe usare una spada in più", opening: "una settimana ben organizzata ha spazio per lavoro, riposo e almeno un'attività capace di sorprendere davvero.", invitation: "Aggiungi una prova gratuita e osserva l'effetto sulla routine." },
  { id: "precisione-divertente", subject: "La precisione può essere molto divertente", opening: "ripetere un movimento finché diventa naturale è soddisfacente; farlo con un gruppo e una spada rende il processo decisamente più interessante.", invitation: "Vieni a scoprire quanto durante la prossima lezione introduttiva." },
  { id: "serata-diversa", subject: "Una serata diversa, senza cambiare città", opening: "Genova offre molti modi di passare una serata. Pochi includono tecnica, movimento e una sala piena di persone con spade luminose.", invitation: "La prima visita è gratuita e non richiede preparazione." },
  { id: "sfida-accessibile", subject: "Una sfida nuova, ma accessibile", opening: "imparare una disciplina nuova mette alla prova coordinazione e attenzione, ma un buon metodo rende ogni passaggio comprensibile.", invitation: "Comincia dalle basi con una lezione pensata per principianti." },
  { id: "energia-gruppo", subject: "Porta energia, al resto pensa il gruppo", opening: "il gruppo fornisce spiegazioni, materiali e compagni di allenamento. Da parte tua serve soltanto la disponibilità a metterti in gioco.", invitation: "Ti teniamo volentieri un posto per la prossima prova." },
  { id: "imparare-muovendosi", subject: "Impara qualcosa di nuovo mentre ti muovi", opening: "alcune competenze si studiano seduti; altre richiedono spazio, attenzione e la soddisfazione di vedere subito un movimento migliorare.", invitation: "Vieni a provare la seconda categoria con noi." },
  { id: "tempo-ben-speso", subject: "Novanta minuti molto diversi dal solito", opening: "una lezione passa tra spiegazioni, esercizi e confronto con il gruppo, lasciando la sensazione concreta di avere imparato qualcosa.", invitation: "Scopri se è il modo giusto di usare una delle tue prossime serate." },
  { id: "concentrazione-attiva", subject: "Concentrazione, ma senza stare fermi", opening: "la disciplina richiede attenzione continua, perché distanza, ritmo e intenzione cambiano mentre ci si muove.", invitation: "Una prova gratuita vale più di qualunque descrizione." },
  { id: "gruppo-che-cresce", subject: "Il gruppo di Genova sta crescendo", opening: "nuove persone portano domande, stili di apprendimento e occasioni di allenamento diverse per tutti.", invitation: "Se vuoi farne parte, il primo passo è una lezione introduttiva." },
  { id: "eleganza-movimento", subject: "Quando il movimento diventa preciso", opening: "all'inizio ogni gesto richiede attenzione; poi coordinazione e controllo iniziano a trasformarlo in qualcosa di sorprendentemente elegante.", invitation: "Vieni a vedere questo percorso cominciare dalla prima lezione." },
  { id: "prova-pratica", subject: "Meno teoria, più prova pratica", opening: "potremmo continuare a descrivere l'attività per molte righe, ma nessun testo sostituisce la sensazione del primo esercizio riuscito.", invitation: "Per questo preferiamo invitarti direttamente in palestra." },
  { id: "posto-riservato", subject: "C'è un posto disponibile alla prossima prova", opening: "abbiamo preparato una lezione introduttiva con il tempo necessario per seguire chi arriva per la prima volta.", invitation: "Se l'orario è compatibile, quel posto può essere tuo." },
  { id: "allenare-decisioni", subject: "Allena il corpo e la capacità di decidere", opening: "ogni esercizio richiede di osservare, scegliere e muoversi con controllo, mantenendo sempre attenzione alla persona di fronte.", invitation: "Prova gratuitamente questo tipo di allenamento." },
  { id: "settimana-memorabile", subject: "Rendi questa settimana un po' più memorabile", opening: "non tutte le settimane devono assomigliarsi. A volte basta inserire un'esperienza nuova nel punto giusto.", invitation: "Noi proponiamo una lezione, un gruppo accogliente e diverse spade pronte." },
  { id: "inizio-semplice", subject: "Cominciare è più semplice di quanto sembri", opening: "non servono acquisti, conoscenze speciali o preparazione anticipata. Si arriva, si ascoltano le regole e si comincia dalle basi.", invitation: "Conferma la tua presenza e penseremo all'organizzazione." },
  { id: "disciplina-condivisa", subject: "Una disciplina che si impara insieme", opening: "i progressi individuali crescono grazie al lavoro con il gruppo, al confronto e alla disponibilità reciproca.", invitation: "Vieni a conoscere le persone che rendono possibile questo percorso." },
  { id: "invito-concreto", subject: "Un invito concreto per la prossima lezione", opening: "abbiamo spazio, attrezzatura e una sequenza introduttiva pronta per chi vuole capire davvero come funziona l'attività.", invitation: "Manca soltanto la tua conferma." },
  { id: "buona-storia", subject: "Potrebbe diventare una buona storia da raccontare", opening: "molte passioni iniziano con una decisione piccola: accettare un invito, entrare in una sala e provare qualcosa che non era previsto.", invitation: "Questa può iniziare con una lezione gratuita." },
];

const playful: TemplateCopy[] = [
  { id: "divano", subject: "Una proposta che il tuo divano non approverà", opening: "il tuo divano sostiene che questa settimana non sia il momento giusto per provare qualcosa di nuovo. Abbiamo esaminato la sua posizione e non siamo d'accordo.", invitation: "Vieni a conoscere l'Ordine delle Onde con una prova gratuita." },
  { id: "agenda-spada", subject: "Abbiamo trovato uno spazio libero nella tua agenda", opening: "tra impegni, notifiche e cose rimandate esiste probabilmente un'ora in cui potresti imparare a usare una spada in sicurezza.", invitation: "Ti proponiamo di occuparla con una lezione introduttiva." },
  { id: "scarpe-comode", subject: "Abiti comodi, scarpe pulite, ottime intenzioni", opening: "la lista per iniziare è sorprendentemente breve. Non comprende talenti segreti, mantelli o dichiarazioni solenni.", invitation: "Porta questi tre elementi e al resto penserà il gruppo." },
  { id: "riunione-movimento", subject: "Una riunione in cui è consentito muoversi", opening: "abbiamo tavoli solo quando servono, nessuna presentazione di quarantadue diapositive e parecchio spazio per allenarsi.", invitation: "Partecipa alla prossima riunione non amministrativa dell'Ordine." },
  { id: "mercoledi-epico", subject: "Il mercoledì può ancora migliorare", opening: "le probabilità che una normale serata migliori dopo aver impugnato una spada luminosa sono oggetto di uno studio interno molto ottimista.", invitation: "Contribuisci ai dati partecipando a una prova gratuita." },
  { id: "coordinazione-caffe", subject: "La coordinazione non si ottiene soltanto col caffè", opening: "il caffè aiuta molte attività, ma distanza, precisione e controllo richiedono un metodo leggermente più strutturato.", invitation: "Abbiamo preparato quel metodo per la tua prima lezione." },
  { id: "nessun-prescelto", subject: "Non cerchiamo prescelti, accettiamo principianti", opening: "la selezione ufficiale richiede soltanto curiosità, rispetto delle regole e disponibilità a imparare con gli altri.", invitation: "Se soddisfi questi severissimi requisiti, la prova è gratuita." },
  { id: "manuale-non-incluso", subject: "Il manuale è incluso nelle spiegazioni", opening: "non riceverai un volume di istruzioni da studiare la sera prima. Le regole arrivano in palestra, nel momento in cui servono.", invitation: "Tu occupati di arrivare; noi ci occupiamo della sequenza." },
  { id: "spazio-personale", subject: "Impara a gestire lo spazio personale con precisione", opening: "la distanza è una cosa seria, soprattutto quando entrambe le persone stanno cercando di capire un esercizio con una spada.", invitation: "La prima lezione parte proprio da questo principio." },
  { id: "progetto-segreto", subject: "Un progetto non particolarmente segreto", opening: "stiamo costruendo un gruppo sempre più preparato e accogliente. Il progetto è visibile ogni settimana in palestra e non richiede autorizzazioni speciali.", invitation: "Puoi osservarlo da vicino durante una prova gratuita." },
  { id: "notifica-utile", subject: "Questa notifica potrebbe essere utile davvero", opening: "in mezzo a promemoria e messaggi automatici, eccone uno con un risultato concreto: una nuova esperienza sportiva a Genova.", invitation: "Apri metaforicamente l'allegato e vieni alla prima lezione." },
  { id: "postura-eroica", subject: "La postura eroica arriva dopo quella corretta", opening: "prima si impara a stare in equilibrio, poi a muoversi con controllo. L'aspetto spettacolare è una conseguenza, non un requisito.", invitation: "Comincia dalla versione corretta durante la prova introduttiva." },
  { id: "palestra-senza-draghi", subject: "Palestra verificata: nessun drago presente", opening: "abbiamo controllato lo spazio, preparato le spade e confermato che gli unici ostacoli saranno esercizi graduali e qualche movimento nuovo.", invitation: "La situazione è quindi adatta a una prima lezione." },
  { id: "livello-curiosita", subject: "Il tuo livello di curiosità sembra sufficiente", opening: "il sistema non richiede test d'ingresso. Una domanda sincera sull'attività è già un indicatore più che adeguato.", invitation: "Converti la curiosità in esperienza con una prova gratuita." },
  { id: "impegno-ragionevole", subject: "Una quantità ragionevole di avventura", opening: "non chiediamo viaggi lontani né equipaggiamento raro. La palestra è a Genova e tutte le spade tornano nell'armadio a fine lezione.", invitation: "Accetta l'avventura logisticamente sostenibile." },
  { id: "modulo-entusiasmo", subject: "Il modulo entusiasmo può essere compilato sul posto", opening: "non serve preparare un discorso. È consentito arrivare prudentemente curiosi e diventare entusiasti soltanto dopo aver provato.", invitation: "Abbiamo riservato questa opzione alla prossima lezione." },
  { id: "piano-b", subject: "Un ottimo piano B per la solita serata", opening: "se il piano A consiste nel ripetere esattamente la settimana precedente, proponiamo un'alternativa con movimento, tecnica e persone nuove.", invitation: "Il piano B comincia con una prova senza impegno." },
  { id: "statistica-sorrisi", subject: "Le nostre statistiche indicano molti sorrisi", opening: "il report non è stato sottoposto a revisione accademica, ma il gruppo sembra uscire dagli allenamenti con energia e parecchi argomenti da raccontare.", invitation: "Puoi verificare personalmente il campione." },
  { id: "spada-assegnata", subject: "Una spada potrebbe essere temporaneamente assegnata a te", opening: "l'ufficio attrezzatura conferma la disponibilità di materiale per una nuova persona, previa normale spiegazione delle regole di sicurezza.", invitation: "Conferma la prova e completeremo l'assegnazione." },
  { id: "decisione-semplice", subject: "La decisione più semplice della settimana", opening: "non devi scegliere un percorso completo oggi. Devi soltanto decidere se una singola lezione gratuita merita una serata.", invitation: "Noi pensiamo di sì e siamo pronti a dimostrarlo." },
];

const administrative: TemplateCopy[] = [
  { id: "protocollo-curiosita", subject: "Protocollo interno per la gestione della curiosità", opening: "la tua richiesta informale è stata classificata come interesse potenzialmente trasformabile in allenamento concreto.", invitation: "La procedura raccomandata prevede una lezione gratuita e nessun ulteriore modulo." },
  { id: "verbale-spade", subject: "Verbale sintetico sulla disponibilità delle spade", opening: "il controllo inventario si è concluso positivamente: esiste attrezzatura sufficiente per accogliere almeno una nuova persona motivata.", invitation: "Ti proponiamo di associare il tuo nome a una delle disponibilità." },
  { id: "foglio-calcolo", subject: "Il foglio di calcolo suggerisce una prova", opening: "dopo un numero non necessario di formule, la colonna conclusioni restituisce un risultato sorprendentemente leggibile: dovresti venire in palestra.", invitation: "Possiamo trasformare la cella in un appuntamento reale." },
  { id: "comitato-lunedi", subject: "Delibera del comitato per il miglioramento del lunedì", opening: "il comitato ha stabilito che movimento, concentrazione e spade luminose costituiscono un aggiornamento accettabile alla normale routine.", invitation: "La delibera entra in vigore con la tua prima lezione." },
  { id: "ticket-esperienza", subject: "Ticket aperto: nuova esperienza da configurare", opening: "la richiesta è stata presa in carico. Mancano soltanto una data, abiti comodi e la presenza dell'utente interessato.", invitation: "Conferma la disponibilità per permetterci di chiudere il ticket con successo." },
  { id: "audit-divano", subject: "Audit indipendente sulle prestazioni del divano", opening: "l'analisi ha rilevato un'eccessiva specializzazione nel riposo e nessun contributo alla coordinazione dinamica.", invitation: "Si raccomanda una compensazione tramite lezione di prova." },
  { id: "circolare-movimento", subject: "Circolare n. 12: introduzione al movimento controllato", opening: "la circolare stabilisce che tutti i nuovi partecipanti inizino da esercizi chiari, sicuri e progressivi sotto supervisione.", invitation: "Puoi partecipare alla prossima applicazione pratica della circolare." },
  { id: "budget-zero", subject: "Preventivo approvato: costo della prima prova € 0", opening: "la voce di spesa relativa alla lezione introduttiva è stata verificata e rimane ostinatamente pari a zero.", invitation: "Il budget non sembra quindi un motivo valido per rimandare." },
  { id: "riunione-operativa", subject: "Convocazione a riunione operativa senza sedie", opening: "l'ordine del giorno comprende sicurezza, postura, distanza e primi esercizi. La riunione si svolgerà quasi interamente in movimento.", invitation: "La tua partecipazione è facoltativa ma fortemente incoraggiata." },
  { id: "allegato-invisibile", subject: "Allegato: una serata diversa dal solito", opening: "l'allegato non compare perché è composto da spazio, persone e attività fisica. Per aprirlo è necessario presentarsi in palestra.", invitation: "Possiamo programmare l'accesso gratuito." },
  { id: "kpi-coordinazione", subject: "Aggiornamento KPI: coordinazione migliorabile", opening: "gli indicatori disponibili suggeriscono margini di crescita interessanti nella gestione di distanza, equilibrio e precisione.", invitation: "È disponibile un intervento formativo introduttivo senza costi." },
  { id: "approvazione-unanime", subject: "Invito approvato all'unanimità", opening: "tutti i membri presenti, incluse alcune spade correttamente riposte, hanno espresso parere favorevole alla tua visita.", invitation: "Resta da individuare soltanto la data della prova." },
  { id: "procedura-abiti", subject: "Procedura semplificata per gli abiti comodi", opening: "la documentazione richiesta è stata ridotta a una sola indicazione: indossa qualcosa che permetta di muoverti liberamente.", invitation: "Ogni altro elemento necessario sarà fornito sul posto." },
  { id: "registro-presenze", subject: "Uno spazio vuoto nel registro presenze", opening: "il registro della prossima lezione contiene una riga ancora disponibile e il reparto pianificazione vorrebbe usarla in modo produttivo.", invitation: "Possiamo inserire il tuo nome senza alcun impegno successivo." },
  { id: "conformita-sicurezza", subject: "Verifica di conformità completata", opening: "regole, attrezzatura e sequenza introduttiva sono state controllate. Il sistema è pronto ad accogliere una persona alla prima esperienza.", invitation: "Occorre soltanto confermare chi sarà quella persona." },
  { id: "memo-precisione", subject: "Memo: la precisione richiede pratica", opening: "la teoria sostiene che i movimenti migliorino ripetendoli con attenzione. La palestra dispone degli strumenti per verificare questa ipotesi.", invitation: "Sei invitato a partecipare alla sperimentazione gratuita." },
  { id: "istanza-novita", subject: "Istanza di novità settimanale accettata", opening: "la richiesta implicita di rendere la settimana meno prevedibile è stata valutata e approvata senza osservazioni.", invitation: "L'azione correttiva prevista è una lezione dell'Ordine delle Onde." },
  { id: "piano-formazione", subject: "Piano formativo individuale: prima voce disponibile", opening: "il piano può iniziare con sicurezza, fondamentali e semplici esercizi in coppia, senza prerequisiti nascosti.", invitation: "La prima voce del piano è offerta gratuitamente." },
  { id: "notifica-sistema", subject: "Notifica di sistema: curiosità ancora attiva", opening: "il sistema ha rilevato che l'interesse mostrato non è ancora stato convertito in esperienza diretta.", invitation: "Premi metaforicamente Conferma partecipando a una prova." },
  { id: "chiusura-pratica", subject: "Azione richiesta per chiudere la pratica", opening: "la pratica resta aperta finché non scopri se questa disciplina ti piace davvero. Ulteriori email non possono sostituire il test sul campo.", invitation: "Completa il processo con una singola lezione gratuita." },
];

const network: TemplateCopy[] = [
  { id: "rete-onde", subject: "La rete cresce una persona curiosa alla volta", opening: "ogni scuola, gruppo e percorso tecnico comincia dall'arrivo di persone disposte a provare seriamente qualcosa di nuovo.", invitation: "La tua prima lezione può essere il prossimo punto della rete." },
  { id: "cento-inviti", subject: "Questo invito ha superato numerosi controlli qualità", opening: "dopo molte campagne abbiamo imparato che chiarezza, accoglienza e una prova concreta funzionano meglio di qualunque promessa esagerata.", invitation: "Per questo ti proponiamo semplicemente di venire in palestra." },
  { id: "ordine-espansione", subject: "L'Ordine delle Onde continua ad espandersi", opening: "più persone significano più compagni di allenamento, più occasioni di confronto e una comunità capace di sostenere nuovi progetti.", invitation: "Puoi conoscere questa fase di crescita con una lezione gratuita." },
  { id: "esperienza-consolidata", subject: "Un metodo consolidato per chi comincia oggi", opening: "abbiamo accolto molti principianti e migliorato nel tempo spiegazioni, materiali e progressione della prima lezione.", invitation: "Ora quel metodo è pronto anche per te." },
  { id: "nuova-sede-futuro", subject: "Le prossime scuole iniziano dalle lezioni di oggi", opening: "una rete non nasce dai documenti strategici, ma dalle persone che entrano, imparano e decidono di costruire qualcosa insieme.", invitation: "Vieni a vedere da vicino come comincia il processo." },
  { id: "collaborazione-reale", subject: "Collaborazione reale, non soltanto una parola", opening: "il gruppo cresce perché le persone si allenano, si aiutano e a volte scelgono di contribuire anche all'organizzazione della scuola.", invitation: "La prima tappa rimane una semplice prova gratuita." },
  { id: "forme-percorso", subject: "Un percorso che continua oltre la prima Forma", opening: "le competenze si costruiscono in sequenza e aprono nel tempo possibilità diverse, senza saltare le basi che rendono tutto il resto utile.", invitation: "Scopri l'inizio del percorso durante la lezione introduttiva." },
  { id: "qualita-crescita", subject: "Crescere mantenendo la qualità della prima lezione", opening: "anche mentre il gruppo aumenta, ogni nuova persona deve ricevere tempo, spiegazioni chiare e un'esperienza sicura.", invitation: "Abbiamo preparato tutto questo per la tua visita." },
  { id: "reputazione-costruita", subject: "La reputazione si costruisce in palestra", opening: "eventi e messaggi possono farci conoscere, ma sono le lezioni ben condotte e le persone soddisfatte a far crescere davvero la scuola.", invitation: "Ti invitiamo a valutare personalmente il nostro lavoro." },
  { id: "generazione-contatti", subject: "Da contatto a compagno di allenamento", opening: "un indirizzo in elenco è soltanto l'inizio. Il passaggio importante avviene quando ci si incontra, si prova e si condivide una lezione.", invitation: "Trasforma questo messaggio in un incontro reale." },
  { id: "automazione-umana", subject: "Anche l'automazione ha bisogno di persone", opening: "procedure e strumenti accelerano l'organizzazione, ma il valore della scuola continua a dipendere da chi si presenta e partecipa con attenzione.", invitation: "Per questo il tuo posto alla prova conta ancora." },
  { id: "evento-prossimo", subject: "Dall'evento alla palestra, il passo successivo", opening: "ci siamo incontrati fuori dalla scuola; ora puoi conoscere il contesto in cui tecnica e gruppo crescono settimana dopo settimana.", invitation: "Completa il percorso con una lezione introduttiva." },
  { id: "attrezzatura-pronta", subject: "Attrezzatura controllata, gruppo pronto", opening: "il registro segnala spade disponibili, usura sotto controllo e persone pronte a seguire chi comincia.", invitation: "È un buon momento per programmare la tua prova." },
  { id: "social-realta", subject: "Hai visto il post, ora prova la realtà", opening: "immagini e video mostrano soltanto una parte dell'attività. Distanza, ritmo e collaborazione si comprendono davvero solo muovendosi.", invitation: "Passa dalla schermata alla palestra con una prova gratuita." },
  { id: "scuola-organizzata", subject: "Una scuola organizzata per accoglierti", opening: "calendario, materiale e sequenza introduttiva sono coordinati per rendere semplice l'arrivo di una nuova persona.", invitation: "Scegli di presentarti; al resto penserà la procedura." },
  { id: "dati-positivi", subject: "I dati sono positivi, ma preferiamo le persone", opening: "conversioni e report indicano che molti partecipanti apprezzano la prova. Nessuna percentuale, però, può decidere al posto tuo.", invitation: "Vieni a raccogliere il dato più importante: la tua esperienza." },
  { id: "onda-successiva", subject: "Ogni gruppo prepara l'onda successiva", opening: "chi ha iniziato ieri oggi aiuta i nuovi arrivati, e questa continuità rende possibile una crescita che non perde il senso del gruppo.", invitation: "La prossima onda può cominciare dalla tua prima lezione." },
  { id: "programma-maturo", subject: "Un programma maturo che accoglie ancora principianti", opening: "il percorso tecnico può diventare avanzato, ma conserva sempre un ingresso chiaro per chi entra per la prima volta.", invitation: "Quel punto di ingresso è disponibile gratuitamente." },
  { id: "invito-rete", subject: "Invito ufficiale dalla rete dell'Ordine", opening: "la scuola di Genova continua a essere il punto di partenza per nuovi allenamenti, collaborazioni e progetti futuri.", invitation: "Conosci il punto di partenza durante la prossima prova." },
  { id: "ultima-mail-prima-prova", subject: "L'ultima cosa da fare è venire a provare", opening: "abbiamo scritto, organizzato, controllato l'attrezzatura e preparato il gruppo. Tutto ciò che poteva essere completato a distanza è completo.", invitation: "Resta soltanto una lezione gratuita con il tuo nome." },
];

const copies = [...realistic, ...confident, ...playful, ...administrative, ...network];

const MEDIUM_APPENDIXES = [
  "La prova è gratuita e aperta anche a chi parte da zero.",
  "Puoi venire senza attrezzatura e decidere con calma dopo aver provato.",
  "Ti spiegheremo tutto sul posto, con esercizi graduali e sicuri.",
  "Bastano abiti comodi e la curiosità di fare qualcosa di diverso.",
] as const;

const MARKETING_APPENDIX = `

Il Light Saber Combat è uno sport completo che unisce movimento, tecnica e capacità di lettura. Durante l'allenamento si lavora sulla postura, sulla coordinazione, sulla gestione della distanza e sulla precisione del gesto. Ogni esercizio è costruito per essere comprensibile anche a chi non ha mai praticato discipline simili.

La lezione alterna spiegazioni, pratica individuale, lavoro in coppia e momenti di confronto con il gruppo. La sicurezza viene prima di tutto: si imparano regole, controllo e rispetto dell'avversario prima di aumentare ritmo e complessità. In questo modo il percorso resta impegnativo, ma accessibile.

L'Ordine delle Onde mette a disposizione l'attrezzatura necessaria per iniziare. Non servono acquisti, esperienza precedente o preparazione atletica speciale. La prima lezione serve a conoscere il metodo, gli istruttori, la palestra e le persone con cui potresti allenarti ogni settimana.`;

function firstSentence(value: string) {
  const match = value.trim().match(/^[^.!?]+[.!?]?/u);
  return (match?.[0] ?? value).trim();
}

function fitWords(value: string, maximum: number) {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maximum) return normalized;
  const words = normalized.split(" ");
  let result = "";
  for (const word of words) {
    const candidate = result ? `${result} ${word}` : word;
    if (candidate.length > maximum - 1) break;
    result = candidate;
  }
  return result.replace(/[,:;]$/u, "");
}

function fitSentence(value: string, maximum: number) {
  const normalized = value.replace(/\s+/gu, " ").trim();
  const clause = normalized.split(/[;:]/u)[0].trim();
  if (clause.length <= maximum) {
    return /[.!?]$/u.test(clause) ? clause : `${clause}.`;
  }
  return `${fitWords(clause, maximum - 1).replace(/[,:;]$/u, "")}.`;
}

function capitalize(value: string) {
  return value ? `${value[0].toLocaleUpperCase("it-IT")}${value.slice(1)}` : value;
}

function shortCopy(copy: TemplateCopy) {
  let value = `${fitSentence(firstSentence(copy.opening), 74)} ${fitSentence(firstSentence(copy.invitation), 52)}`;
  const fillers = [
    "La prova è gratuita.",
    "Non serve esperienza.",
  ];
  let fillerIndex = 0;
  while (value.length < 124) {
    value += ` ${fillers[fillerIndex % fillers.length]}`;
    fillerIndex += 1;
  }
  return capitalize(value);
}

function withEditorialErrors(value: string, index: number) {
  if (index % 7 === 0) {
    const error = " Spero che ti interessa.";
    return `${fitWords(value, 170 - error.length)}${error}`;
  }
  const variants = [
    [/\bè\b/gu, "e"],
    [/\bpiù\b/gu, "piu"],
    [/\bperché\b/gu, "perche"],
    [/\bpuò\b/gu, "puo"],
  ] as const;
  const [pattern, replacement] = variants[index % variants.length];
  const replaced = value.replace(pattern, replacement);
  return replaced !== value
    ? replaced
    : `${fitWords(value, 170 - " Spero che ti interessa.".length)} Spero che ti interessa.`;
}

function fullSignature(senderName: string) {
  return `Un saluto,\n${senderName} - Ordine delle Onde\nLudoSport Genova`;
}

function expandedBody(copy: TemplateCopy, index: number, firstName: string, senderName: string) {
  return `Ciao ${firstName},\n\n${capitalize(copy.opening)}\n\n${copy.invitation} ${MEDIUM_APPENDIXES[index % MEDIUM_APPENDIXES.length]}${signature(senderName)}`;
}

function bodyForLevel(
  copy: TemplateCopy,
  index: number,
  firstName: string,
  senderName: string,
  level: EmailPresentationLevel,
) {
  const compact = shortCopy(copy);
  if (level === 0) {
    return `Ciao ${firstName},\n${withEditorialErrors(compact, index)}\n\n${senderName}`;
  }
  if (level === 1) {
    return `Ciao ${firstName},\n${compact}\n\n${senderName}`;
  }
  if (level === 2) {
    return `Ciao ${firstName},\n\n${compact}\n\n${fullSignature(senderName)}`;
  }

  const expanded = expandedBody(copy, index, firstName, senderName);
  if (level === 3) return expanded;
  if (level === 4) {
    return `${expanded}\n\nRispondi a questa email per prenotare la tua prova.`;
  }
  if (level === 5) {
    return `${expanded}\n\nRispondi a questa email per prenotare; ti indicheremo orario, luogo e cosa portare.`;
  }
  if (level === 6) {
    return `${expanded}\n\nQuando: prossima lezione disponibile\nDove: PalaGym Assarotti, Genova\nCosa portare: abiti comodi e scarpe da palestra.`;
  }
  return `${expanded}${MARKETING_APPENDIX}`;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = copies.map((copy, index) => ({
  id: copy.id,
  subject: copy.subject,
  body: (name, senderName, presentationLevel = 0) =>
    bodyForLevel(copy, index, name, senderName, presentationLevel),
}));
