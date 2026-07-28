# Oggetto: Nuovi Iscritti

## Game Design Document

**Titolo di lavorazione:** Oggetto: Nuovi Iscritti\
**Sottotitolo:** Un incremental game dell'Ordine delle Onde\
**Versione documento:** 1.1\
**Stato:** concept avanzato, economia e progressione definite, pronto per la
prototipazione\
**Piattaforma:** browser desktop\
**Lingua:** italiano\
**Salvataggio:** locale nel browser

---

## 1. Sintesi

Oggetto: Nuovi Iscritti è un browser game clicker incrementale ambientato dentro
una simulazione quasi perfetta di Outlook per Windows 11.

Il giocatore collabora inizialmente con **LudoSport Genova – Ordine delle Onde**
e deve trovare nuovi potenziali interessati, ottenere i loro indirizzi email,
scrivere inviti e trasformare i contatti in iscritti. Ogni pressione della
tastiera inserisce il carattere successivo di un'email prestabilita,
indipendentemente dal tasto premuto. Anche un click nel corpo della mail
inserisce un carattere. All'inizio ogni input produce un solo carattere; i
potenziamenti aumentano progressivamente la velocità.

Le email completate vengono inviate automaticamente per impostazione predefinita
e invitano il destinatario a partecipare a una singola lezione di prova in
palestra. Il giocatore può disattivare l'invio automatico per rileggere la mail
completa e confermarla con un ulteriore input. Dopo un intervallo compresso, il
contatto può prenotare oppure sparire definitivamente. Chi partecipa alla
lezione ha un'alta probabilità, ma non la certezza, di iscriversi.

I contatti non sono infiniti. Per continuare a inviare email bisogna organizzare
eventi reali in luoghi di Genova. Ogni evento attira un certo numero di persone;
una porzione prova la disciplina sul posto, una porzione lascia il proprio
indirizzo email, una porzione accetta l'invito alla prova in palestra e infine
una porzione si iscrive. Carisma, Scrittura, Social, organizzazione,
collaboratori e attrezzatura migliorano fasi diverse del funnel.

Gli iscritti generano periodicamente **Euro** tramite le quote associative. Gli
Euro sono l'unica risorsa spendibile. Gli iscritti **Ultra Rari** diventano
Collaboratori delle Onde dopo il Corso Y e possono essere assegnati liberamente
alla scrittura, agli eventi, ai social o alla manutenzione. Possono apprendere
le Forme LudoSport seguendo il percorso `1 → X → 2 → Y → 3/4/5 → 6 → 7` e i tre
rami Spada Lunga, Staffa e Doppia spada corta.

Raggiunta una dimensione significativa, al giocatore viene proposto di
trasferirsi e fondare una nuova scuola, scegliendone nome e sede. Questa è la
meccanica di prestigio: una parte dei progressi locali riparte, mentre
l'esperienza accumulata e la rete delle scuole fondate forniscono bonus
permanenti. Il gioco non ha un finale e può continuare indefinitamente.

---

## 2. Visione del gioco

### 2.1 Fantasia principale

Il giocatore deve sentirsi contemporaneamente:

- una persona che sta rispondendo alle email in ufficio;
- un reclutatore instancabile dell'Ordine delle Onde;
- il coordinatore di una piccola organizzazione che cresce fino a diventare una
  rete di scuole;
- il protagonista di una commedia amministrativa sempre più assurda, raccontata
  esclusivamente attraverso email, calendari, contatti e documenti
  apparentemente professionali.

### 2.2 Pilastri di design

1. **Camuffamento credibile**\
   A colpo d'occhio il gioco deve sembrare Outlook per Windows 11. Le
   informazioni ludiche devono essere presentate come normali elementi di posta,
   calendario, contatti e attività.

2. **Input immediato e soddisfacente**\
   Qualunque tasto utile fa avanzare il testo. Non si può sbagliare a scrivere.
   Il giocatore deve poter martellare la tastiera come in Hacker Typer.

3. **Una catena produttiva leggibile**\
   Eventi generano pubblico; il pubblico genera prove dimostrative; le prove
   generano contatti; le email generano prenotazioni; le lezioni in palestra
   generano iscritti; le quote generano Euro; gli Ultra Rari e i Leggendari
   generano automazione.

4. **Umorismo crescente**\
   Il gioco parte con messaggi realistici e professionali. Con il progresso, le
   email, gli oggetti e le iniziative diventano più stravaganti, pur restando
   leggibili e funzionali.

5. **Crescita senza fine**\
   Il giocatore passa dalla singola email alla gestione automatizzata di più
   scuole, mantenendo sempre utile l'interazione manuale.

6. **Rispetto dell'identità LudoSport**\
   Il gioco può citare Forme, spade, Ordini, scuole, lezioni, eventi e
   terminologia LudoSport. I riferimenti a franchise cinematografici esterni
   restano indiretti e comici.

7. **Svelamento progressivo**\
   Il gioco comincia quasi vuoto. Nuove cartelle, funzioni e sistemi di Outlook
   compaiono soltanto quando il giocatore raggiunge traguardi comprensibili o
   completa speciali comunicazioni interne manuali.

### 2.3 Tono

Il tono combina:

- comunicazione sportiva autentica;
- vita amministrativa da scuola o associazione;
- satira leggera del lavoro d'ufficio;
- entusiasmo genuino per LudoSport;
- escalation surreale ma mai aggressiva o denigratoria.

Esempio di escalation:

1. «Vieni a provare una disciplina sportiva originale a Genova.»
2. «Scopri quanto può essere elegante un lunedì sera con una spada luminosa.»
3. «Il tuo divano sostiene che non sei pronto. Dimostragli che si sbaglia.»
4. «Partecipa alla prova prima che quel famoso grande topo venga a chiederci
   perché le nostre spade fanno luce.»

---

## 3. Pubblico e sessioni

### 3.1 Pubblico principale

- membri e amici della comunità LudoSport;
- appassionati di incremental e idle game;
- giocatori che apprezzano interfacce diegetiche;
- utenti desktop che vogliono sessioni brevi durante la giornata.

### 3.2 Durata delle sessioni

- **Micro-sessione:** 30–90 secondi per completare una mail o controllare
  prenotazioni e quote.
- **Sessione normale:** 5–15 minuti per scrivere, acquistare potenziamenti e
  organizzare attività.
- **Sessione di gestione:** 15–30 minuti per assegnare collaboratori,
  pianificare eventi e preparare un prestigio.
- **Ritorno idle:** riepilogo dei progressi maturati mentre il gioco era chiuso.

---

## 4. Struttura dell'esperienza

```mermaid
flowchart LR
    A["Evento esterno"] --> B["Persone presenti"]
    B -->|Carisma| C["Prove dimostrative"]
    C -->|Carisma| D["Contatti email"]
    D --> E["Email da scrivere"]
    E -->|Scrittura| F["Lezioni prenotate"]
    F -->|Qualità della prova| G["Iscritti"]
    G --> H["Quote in Euro"]
    G -->|Ultra Raro o Leggendario| I["Collaboratori delle Onde"]
    I --> A
    I --> E
    I --> J["Social e attrezzatura"]
    J --> A
```

### 4.1 Loop attivo

1. Il giocatore apre una bozza già indirizzata a un contatto disponibile.
2. Preme tasti o clicca nel corpo della mail.
3. Ogni input rivela il prossimo carattere del testo prestabilito.
4. Quando il corpo è completo, la mail viene inviata automaticamente se il
   relativo toggle è attivo; altrimenti resta pronta fino al successivo input.
5. Il contatto viene consumato e viene programmato l'esito ritardato dell'invito
   alla prova in palestra.
6. Se esiste un altro contatto, si apre immediatamente una nuova mail.
7. Il giocatore può continuare a premere tasti senza interrompersi: il sistema
   passa da una mail alla successiva in modo trasparente.
8. Se i contatti sono terminati, Outlook mostra una comunicazione plausibile che
   invita a pianificare un evento o a partecipare a uno sparring esterno.

### 4.2 Loop gestionale

1. Controllare prenotazioni, prove in palestra, iscritti, Euro e contatti
   rimasti.
2. Assegnare collaboratori alle attività.
3. Sbloccare o migliorare gli otto rami: Scrittura, Creatività, Carisma,
   Accoglienza, Attrezzatura, Gadget, Insegnamento e Organizzazione.
4. Pianificare eventi nel Calendario.
5. Mantenere le spade disponibili e in buono stato.
6. Preparare nuove campagne email.

### 4.3 Loop di lungo periodo

1. Far crescere l'Ordine delle Onde.
2. Costruire una squadra di collaboratori specializzati.
3. Automatizzare raccolta contatti, scrittura e manutenzione.
4. Raggiungere la soglia per ricevere l'offerta di fondare una nuova scuola.
5. Scegliere città e nome della scuola.
6. Trasferire l'esperienza permanente alla nuova sede.
7. Ripetere con costi, numeri e moltiplicatori crescenti.

---

## 5. Risorse

### 5.1 Iscritti

Gli **Iscritti** sono il punteggio principale, la dimensione della scuola e una
sorgente di entrate ricorrenti. Non sono spendibili.

- **Iscritti attivi:** membri attuali della scuola; possono aumentare o
  diminuire tramite eventi narrativi.
- **Fama della scuola:** punteggio cumulativo ottenuto da iscrizioni, Follower e
  ricompense esplicite. Attraversa i cicli di prestigio e non diminuisce quando
  un iscritto lascia o viene rimosso dalla scuola.
- **Ultra Rari:** contatti rossi che diventano Collaboratori delle Onde dopo il
  Corso Y.

Ogni nuovo iscritto accredita immediatamente un bonus di iscrizione di **€20**.
In seguito, ogni iscritto attivo genera una quota base di **€40 per mese di
gioco**, aumentata di **€5 per ogni Forma o corso permanente registrato sul
singolo allievo**. Corso Y concorre sempre al conteggio; Corso X vi concorre
soltanto dopo l'acquisto del relativo Percorso Segreto. Il Corso Agonisti è escluso perché
potenzia Arena e Stile ma non assegna un badge permanente. Ogni badge permanente
può essere registrato una sola volta sullo stesso allievo: un duplicato
rappresenta uno stato non valido e non viene corretto nel calcolo economico. Un
mese dura **60 secondi reali** e segue il normale ciclo da Gennaio a Dicembre;
dopo Dicembre torna Gennaio. L'anno scolastico, sempre visibile nella barra
superiore, va da Settembre ad Agosto; la formazione si ferma a Luglio e Agosto e
gli eventuali abbandoni vengono verificati nel passaggio tra Giugno e Luglio. Un
evento positivo di passaparola può produrre più potenziali iscritti; un litigio
o un mancato rinnovo può ridurre il totale.

### 5.2 Euro

Gli **Euro (€)** sono l'unica risorsa spendibile. Provengono principalmente
dalle quote periodiche degli iscritti e vengono usati per:

- potenziamenti delle otto Aree di Attività;
- campagne social;
- manutenzione e miglioramento delle spade;
- organizzazione di eventi;
- strumenti amministrativi e organizzativi.

Gli iscritti possono fungere da requisito di sblocco, ma non vengono mai
consumati per acquistare qualcosa.

### 5.3 Contatti

I Contatti sono indirizzi email inventati ottenuti attraverso eventi, lezioni di
prova, social e collaboratori.

Nella scuola iniziale i primi otto contatti sono sempre Comuni. Il nono contatto
è sempre Andrea Simonazzi, il primo Leggendario della partita; dal decimo
contatto si sbloccano le estrazioni Rare, Ultra Rare e Leggendarie. Nelle scuole
successive tutte le rarità sono disponibili fin dal primo contatto e Andrea
torna nel normale pool Leggendario.

Ogni contatto riceve una rarità al momento dell'acquisizione. La rarità
determina la probabilità di prenotare una prova dopo la mail e quella di
iscriversi dopo la prova:

| Rarità      | Comparsa | Prova dopo la mail | Iscrizione base | Effettiva base mail → iscritto | Massimo ordinario | Collaboratore            |
| ----------- | -------: | -----------------: | --------------: | -----------------------------: | ----------------: | ------------------------ |
| Comune      |      80% |                40% |           62,5% |                            25% |              100% | Mai                      |
| Raro        |    12,5% |                50% |             40% |                            20% |               90% | Mai                      |
| Ultra Raro  |     5,5% |                75% |          23,33% |                          17,5% |               50% | Dopo il Corso Y          |
| Leggendario |       2% |               100% |             15% |                            15% |               35% | Subito dopo l'iscrizione |

I potenziamenti di Creatività fanno avanzare linearmente la prenotazione della
prova dalla probabilità base fino a 85% per i Comuni, 90% per i Rari, 95% per
gli Ultra Rari e 100% per i Leggendari. I potenziamenti di Accoglienza fanno
avanzare ogni rarità dalla propria probabilità base d'iscrizione al proprio
massimo specifico.

Il **Pity** è un contatore globale interno e non viene mostrato
nell'interfaccia. Ogni prova in palestra che non produce un'iscrizione, comprese
quelle annullate per mancanza di spade, aggiunge 1 al contatore. Nelle prove dei
Leggendari ordinari e Segreti, ogni punto Pity aggiunge un punto percentuale
alla probabilità già calcolata, fino al 100%. L'iscrizione di un Leggendario
ordinario o Segreto riporta Pity a zero; l'iscrizione di qualunque altra rarità
lo lascia invariato. Il bonus personale dei Leggendari resta separato: ogni loro
precedente tentativo fallito aggiunge 3 punti percentuali entro il massimo
ordinario del 35%, poi si applica Pity oltre quel limite.

Ogni contatto contiene:

- nome e cognome generati;
- indirizzo email fittizio;
- fonte del contatto;
- data di acquisizione;
- eventuali tag tecnici o narrativi;
- stato: disponibile, in scrittura, invitato, prova prenotata, convertito o
  perso.

I contatti sono una risorsa limitante. Se finiscono, la produzione di email si
ferma.

### 5.4 Follower

I **Follower** misurano il pubblico raggiunto dall'automazione Social. Quando si
sblocca Social, partono dalla Fama già raggiunta e diventano visibili nella
barra superiore. Non sono spendibili. Ogni nuovo Follower aggiunge anche un
punto Fama, aumenta l'affluenza agli Eventi e produce una rendita mensile da
sponsorizzazioni. I Follower non modificano direttamente le prove o le
iscrizioni.

### 5.5 Email

Stati possibili:

- bozza;
- in scrittura;
- completata;
- inviata;
- in attesa dell'esito;
- prova prenotata;
- contatto perso.

Non esistono follow-up né conversazioni di risposta: ogni contatto riceve una
sola mail e viene poi convertito o eliminato.

### 5.5 Collaboratori

I Collaboratori delle Onde sono iscritti che decidono di aiutare attivamente la
scuola. Sono una sottocategoria degli Iscritti e non una valuta separata.

### 5.6 Attrezzatura

Le spade della scuola sono gestite come inventario operativo:

- disponibili;
- riservate da corsi, lezioni di prova o eventi;
- cariche di usura;
- in manutenzione;
- rotte e temporaneamente inutilizzabili.

Le spade impongono una capienza operativa: quelle riservate non sono disponibili
fino alla conclusione dell'attività. Corsi e Corso Agonisti restano in attesa se
non possono riservare tutte le spade richieste, senza consumare denaro, tempo o
capienza dell'Istruttore. Una lezione di prova viene invece annullata allo
scadere dell'attesa, tranne quando l'iscrizione è garantita al 100%: in quel
caso si conclude senza usare né caricare una spada. Un evento non può essere
avviato.

Il carico viene applicato alla conclusione riuscita dell'attività ed è
aggregato. Se un evento in corso viene annullato, si applica metà del carico
previsto e non si ottengono contatti. Ogni 100 punti rompe una spada; più soglie
superate rompono più spade e tutto il carico eccedente viene conservato. La
manutenzione preventiva costa €2 per punto, mentre una spada già rotta costa
€250 e torna da 100 a 0.

I collaboratori assegnati all'Attrezzatura riducono prima il carico delle spade
sane non riservate e poi riparano le spade rotte. Pagano il 75% dei costi
manuali, ottenendo uno sconto del 25%: €187,50 per spada e €1,50 per punto.
Producono un punto-lavoro ogni 1,5 secondi base; una spada completa richiede 150
punti-lavoro, pur ripristinando 100 punti di condizione.

La manutenzione può procedere mentre corsi, prove o eventi sono attivi, ma
interviene soltanto sulle spade non riservate. Le spade rotte sono sempre
riparabili perché non possono essere in uso. Se tutte le spade sane sono
impegnate, il carico residuo resta in attesa; le riparazioni parziali già
possibili non modificano il numero di spade prenotate. In questo caso il
collaboratore può riparare una spada rotta e torna subito al carico residuo non
appena la spada riparata diventa disponibile.

L'interfaccia rappresenta la capacità complessiva come una barra divisa in un
blocco da 100 punti per ogni spada della scuola. Il rosso indica una spada
rotta, il grigio una spada riservata e temporaneamente non riparabile, l'oro il
carico normale ancora rimovibile e lo spazio vuoto la condizione sana residua.
Il riepilogo numerico mostra l'usura totale includendo 100 punti per ogni spada
rotta. Fino a 20 spade i blocchi restano individuali; da 21 spade in poi la
barra diventa continua e aggrega proporzionalmente le quattro condizioni. Nella
scheda dei Collaboratori assegnati all'Attrezzatura viene usata sempre la stessa
barra aggregata in formato compatto.

Gli imprevisti narrativi dell'Attrezzatura sostituiscono quelli precedenti:

| Evento                             | Descrizione breve                                          |                       Effetto |
| ---------------------------------- | ---------------------------------------------------------- | ----------------------------: |
| Un piccolo disastro                | Non so cosa sia successo, non sono stato io!               |    +30 carico e 1 spada rotta |
| Spada caduta: Fanne 5              | Capita a tutti prima o poi...                              |                    +10 carico |
| Il portaspade di legno perfetto    | Direttamente dall'Ordine del Vento di Trieste, è stupendo! |                    -20 carico |
| Un nuovo Sabersmith all’orizzonte? | Sembra proprio che uno dei nostri sappia saldare...        | -30 carico e 1 spada riparata |
| Si può avere nera?                 | Certe domande dovrebbero non essere mai fatte.             |                    +30 carico |
| Un Pini al lavoro                  | Darth Modificus alla riscossa!                             |                    -30 carico |

### 5.7 Reputazione di rete

La **Reputazione di rete** è la risorsa permanente ottenuta fondando e facendo
crescere nuove scuole. Aumenta i moltiplicatori globali dopo il prestigio.

---

## 6. Scrittura delle email

### 6.1 Regole di input

- Il gioco ascolta gli eventi `keydown` quando la vista di composizione è attiva
  e nessun controllo dell'interfaccia richiede l'input.
- Ogni tasto, inclusi modificatori e tasti di navigazione, produce una sola
  unità di input; `event.repeat` viene ignorato.
- Un click nel corpo produce lo stesso avanzamento.
- I click su cartelle, menu, Calendario, Contatti e altre opzioni eseguono la
  loro funzione e non scrivono.
- Le combinazioni di sistema e del browser non devono essere bloccate, anche
  quando il relativo `keydown` fa avanzare il testo.
- Tenere premuto un tasto conta come una singola pressione.
- Incollare testo non completa la mail.
- Il testo rivelato è sempre quello del modello corrente; ciò che il giocatore
  preme non viene registrato.
- L'input manuale rimane utile nelle fasi avanzate perché la stessa potenza di
  scrittura moltiplica anche il lavoro dei collaboratori.

### 6.2 Caratteri per input

Formula iniziale:

```text
potenzaScrittura = 1 + bonusTastieraComoda + bonusFrasiRapide

caratteriPerInput = floor(
  potenzaScrittura
  × moltiplicatoreScrittura
  × moltiplicatoreForme
  × moltiplicatorePrestigio
)
```

Valori consigliati per la prima curva:

| Fase                | Caratteri per input |
| ------------------- | ------------------: |
| Inizio              |                   1 |
| Primo potenziamento |                   2 |
| Inizio automazione  |                 3–5 |
| Metà ciclo          |                8–15 |
| Fine ciclo          |               25–50 |

### 6.3 Rapporto tra scrittura manuale e automatica

La velocità non dipende da combo o precisione, ma esclusivamente dai
potenziamenti e dai moltiplicatori permanenti. I bonus generali alla scrittura
migliorano contemporaneamente:

- caratteri prodotti da ogni input manuale;
- caratteri prodotti dai Collaboratori delle Onde;
- efficacia di eventuali strumenti automatici futuri.

Questo collegamento impedisce che la potenza manuale diventi un ramo morto dopo
lo sblocco dell'automazione.

### 6.4 Completamento e invio

Il toggle **Invio automatico** è attivo di default e la sua scelta viene salvata
nella partita. Al completamento:

1. il cursore si ferma alla fine del testo;
2. con l'invio automatico attivo la mail parte subito; con l'opzione disattivata
   resta completamente visibile finché il giocatore non preme un tasto o fa
   clic;
3. compare per 250–400 ms lo stato Outlook “Invio in corso…”;
4. la mail passa in Posta inviata;
5. viene determinato e salvato l'esito ritardato
   `prenota la prova / contatto perso`;
6. si apre la mail successiva entro 300–600 ms;
7. non viene riprodotto alcun suono.

Decidere l'esito al momento dell'invio impedisce di cambiare il risultato
ricaricando la pagina. L'esito della successiva lezione in palestra viene invece
determinato quando la lezione viene risolta.

### 6.5 Lunghezza delle email

La progressione dei testi delle email segue otto livelli:

| Livello | Potenziamento         | Formato e lunghezza                                                   |
| ------: | --------------------- | --------------------------------------------------------------------- |
|       0 | Nessun potenziamento  | Testo breve con piccoli refusi, 150–200 caratteri                     |
|       1 | Controllo ortografico | Stesso testo senza errori                                             |
|       2 | Email professionale   | Firma completa, struttura e spaziatura coerenti, ancora in plain text |
|       3 | Invito personalizzato | Nuovo set di testi, 250–450 caratteri                                 |
|       4 | Call to action        | Link e pulsanti, massimo 500 caratteri                                |
|       5 | Impaginazione         | Struttura CSS, massimo 600 caratteri                                  |
|       6 | Pubblicità vincente   | Volantino completo con immagini, massimo 800 caratteri                |
|       7 | Corso di Marketing    | Presentazione approfondita, massimo 2.000 caratteri                   |

Il corpo iniziale usa il formato `Ciao {nome},` seguito dal testo e dal solo
nome del giocatore. Il primo controllo ortografico rimuove gli errori senza
cambiare il messaggio; i livelli successivi aggiungono struttura, contenuto e
strumenti di conversione in modo progressivo.

Ai livelli 0, 1 e 2 ogni input rivela subito il testo della mail in plain text.
Dal livello 3, **Invito personalizzato**, gli input scrivono invece il sorgente
HTML: la composizione mostra il codice in un riquadro secondario e l'anteprima
reale della mail in un riquadro più grande e preponderante.

---

## 7. Conversione delle email

### 7.1 Flusso

Ogni email inviata crea un esito futuro con due possibili risultati:

- il contatto prenota una singola lezione di prova in palestra;
- il contatto non converte e sparisce definitivamente.

Non vengono mostrate risposte personali e non esistono follow-up. Se la prova
viene prenotata, il sistema crea una presenza nel Calendario. Quando la lezione
si conclude, viene risolto un secondo esito:

- la persona si iscrive;
- la persona non si iscrive e sparisce definitivamente.

Gli Ultra Rari diventano Collaboratori delle Onde dopo il Corso Y; i Leggendari
lo diventano immediatamente dopo l'iscrizione.

### 7.2 Tempi compressi

Per il primo prototipo:

| Passaggio                        |                                                                  Tempo suggerito |
| -------------------------------- | -------------------------------------------------------------------------------: |
| Esito dell'email                 |                                                                       10 secondi |
| Attesa della lezione in palestra |                                                                       1–5 minuti |
| Esito della lezione              |                                                             immediato al termine |
| Bonus di iscrizione              |                                                                  immediato (€20) |
| Accredito della quota mensile    | al cambio mese (€40 base + €5 per Forma o corso permanente del singolo iscritto) |

Il mese di gioco dura 60 secondi e il calendario scorre da Gennaio a Dicembre.
La formazione segue invece l'anno scolastico Settembre–Agosto: le lezioni sono
attive da Settembre a Giugno, Luglio e Agosto sono pausa estiva e gli abbandoni
vengono elaborati nel passaggio da Giugno a Luglio. L'anno scolastico indicato
accanto al mese corrente nella barra superiore riparte a Settembre. Gli altri
tempi devono essere configurabili dai dati e non scritti direttamente nella
logica.

### 7.3 Formule di conversione

```text
probabilitàPrenotazione = clamp(
  prenotazioneBase
  × moltiplicatoreScrittura
  × moltiplicatoreReputazione
  × bonusPrestigio,
  minimo,
  massimo
)

probabilitàIscrizioneDopoProva = clamp(
  iscrizioneBaseDopoProva
  × qualitàLezione
  × bonusAccoglienza
  × efficaciaCollaboratori
  × statoAttrezzatura
  × bonusPrestigio,
  minimo,
  massimo
)

probabilitàIscrizioneLeggendario = clamp(
  probabilitàIscrizioneDopoProva
  + bonusTentativiPersonali
  + Pity / 100,
  0,
  1
)
```

I valori di prenotazione e iscrizione dipendono dalla rarità e sono definiti
nella tabella dei Contatti. La prima email e la quinta dopo quattro fallimenti
consecutivi conservano la protezione tutorial/anti-sfortuna.

### 7.4 Comunicazione degli esiti

Gli esiti positivi vengono comunicati come messaggi automatici interni, non come
risposte dei destinatari:

- “Nuovo iscritto registrato”;
- “Quota associativa accreditata”;
- “Nuovo collaboratore disponibile”.

Le prenotazioni delle lezioni di prova non generano messaggi in Posta in arrivo:
sono visibili nel Calendario e nello stato dell'email inviata.

Nel prototipo l'attesa è fissata a 30 secondi. La prova ordinaria dura 15
secondi, riserva una spada e aggiunge 2 punti di carico alla conclusione. La
prova di un Leggendario Segreto dura 30 secondi e aggiunge 40 punti. Se al
termine dell'attesa manca una spada, la prova è annullata come una mancata
iscrizione; se l'iscrizione è garantita al 100%, la prova si svolge invece senza
spada e senza aggiungere carico.

Gli esiti negativi dei singoli contatti non producono messaggi: sono visibili
soltanto nelle statistiche aggregate del funnel.

---

## 8. Acquisizione dei contatti

### 8.1 Eventi

Gli eventi sono programmati attraverso il Calendario di Outlook e si svolgono in
tempo compresso. Esistono eventi fissi ed eventi che compaiono casualmente.
Nella prima versione gli esiti sono automatici: il sistema decisionale verrà
valutato successivamente.

Ogni evento richiede:

- un numero di iscritti da impiegare;
- un numero di spade da impiegare;
- una durata base di 10 secondi, riducibile dalla Maestria del collaboratore;
- un costo in Euro;
- eventuali requisiti di Carisma, Social o Attrezzatura.

Non esiste un limite numerico separato agli eventi contemporanei. Il giocatore
può avviarne più di uno finché restano disponibili sia gli iscritti sia le spade
richieste; entrambe le risorse tornano disponibili al termine dell'attività. Al
completamento parte un conto alla rovescia specifico prima che lo stesso evento
possa essere selezionato di nuovo. I tempi brevi usano secondi reali; fiere e
manifestazioni usano mesi o anni del calendario di gioco. Durante questo
intervallo iscritti e spade restano disponibili. Se l'evento viene annullato, il
costo e le risorse sono ripristinati, non parte alcun conto alla rovescia e
viene applicato soltanto il 25% del carico previsto.

Quando l'evento viene avviato automaticamente da un collaboratore, la sua
Maestria Eventi riduce il prezzo base. Le percentuali pagate sono: Novizio 100%,
Iniziato 90%, Accademico 80%, Cavaliere 70% e Maestro 50%. La riduzione del
tempo usa invece il normale bonus di produttività della Maestria.

Le nuove spade possono essere acquistate dall'area Attività tramite **LamaDiLuce
(Abridge S.r.l.)**, partner tecnico e fornitore ufficiale LudoSport. Il
riferimento di gioco è la **Polaris EVO Basic combat-ready** a €330: costruzione
modulare, lama autorizzata per pratica ed eventi ufficiali e marcatura dell'anno
di produzione. L'acquisto è immediato per non introdurre microgestione
logistica; la presentazione conserva un tono goliardico senza alterare i
riferimenti reali del produttore.

La **Fama della scuola** è il punteggio cumulativo permanente ottenuto da
iscrizioni, Follower e ricompense esplicite. Sblocca progressivamente cinque
tier di potenzialità: **Molto bassa**, **Bassa**, **Media**, **Alta** e
**Altissima**. Non diminuisce quando alcuni iscritti lasciano la scuola.
All'inizio sono visibili soltanto Volantinaggio e Sparring al parco;
l'interfaccia anticipa esclusivamente il prossimo sblocco e non mostra
previsioni numeriche sui contatti.

| Evento                        | Sblocco |      Costo | Media | Impiegati | Spade | Carico | Cooldown   | Potenzialità |
| ----------------------------- | ------: | ---------: | ----: | --------: | ----: | -----: | ---------- | -----------: |
| Volantinaggio                 |       0 |         €0 |  0,33 |         0 |     0 |      0 | 5 secondi  |  molto bassa |
| Kata contro le onde del mare  |       5 |       €500 |  0,50 |         1 |     1 |     10 | 15 secondi |  molto bassa |
| Sparring al parco             |       0 |     €1.000 |  1,00 |         2 |     2 |     20 | 10 secondi |  molto bassa |
| Lezioni all'aperto            |       5 |     €1.500 |  1,50 |         2 |     4 |     30 | 30 secondi |        bassa |
| Oktoberfest                   |      15 |     €1.500 |  1,50 |         4 |     4 |     40 | 1 mese     |        bassa |
| Evento sportivo               |      10 |     €2.000 |  2,00 |         4 |     6 |     50 | 1 mese     |        bassa |
| Mele Comics                   |      20 |     €2.500 |  2,50 |         6 |     8 |     75 | 3 mesi     |        media |
| CairoMix                      |      35 |     €3.000 |  3,00 |         8 |    10 |    100 | 4 mesi     |        media |
| CogoComix                     |      60 |     €5.000 |  5,00 |        10 |    12 |    150 | 6 mesi     |         alta |
| Burtomics                     |      90 |     €7.500 |  7,50 |        15 |    20 |    200 | 12 mesi    |         alta |
| Genova Comics & Games         |     120 |    €10.000 | 10,00 |        20 |    20 |    250 | 18 mesi    |         alta |
| Megacon Genova                |     180 |    €13.000 | 13,00 |        25 |    30 |    500 | 24 mesi    |    altissima |
| Lucca Comics & Games          |     250 |    €15.000 | 15,00 |        40 |    50 |    750 | 30 mesi    |    altissima |
| Milan Games Week & Cartoomics |     350 |    €20.000 | 20,00 |        50 |   100 |  1.000 | 36 mesi    |    altissima |
| Sfida a Cthulhu               |     500 | €1.000.000 | 50,00 |     1.000 | 1.000 | 10.000 | 120 mesi   |    altissima |

Un cooldown basato sul calendario scade all'inizio del mese di destinazione,
anche quando il calendario viene avanzato dagli strumenti Admin.

### 8.2 Persone incontrate e contatti ottenuti

Un evento determina separatamente l'affluenza e il numero di contatti. Le
persone incontrate e le prove dimostrative conservano il funnel dell'evento; i
contatti sono invece estratti da una distribuzione pesata specifica, scelta
all'avvio e mostrata soltanto alla conclusione. L'usura delle spade non riduce
più il risultato.

```text
personeIncontrate = capienzaBase
  × variabilitàCasuale
  × bonusAffluenza
  × efficaciaCollaboratori

proveDimostrative = personeIncontrate
  × probabilitàProvaSulPosto
  × moltiplicatoreCarisma

mediaContatti = mediaDistribuzioneEvento
  × 25/27
  × disponibilitàBacino
  × efficaciaCollaboratori
  × (1 + bonusAffluenza + bonusCarisma)

efficaciaCollaboratori = max(1, sommaProduttivitàCollaboratoriEventi)^0,30103
disponibilitàBacino = 1000 / (1000 + max(0, iscrittiAttivi - 10))
```

Le distribuzioni base sono:

| Evento                        | Distribuzione base dei contatti        |
| ----------------------------- | -------------------------------------- |
| Volantinaggio                 | 67%: 0; 33%: 1                         |
| Kata contro le onde del mare  | 50%: 0; 50%: 1                         |
| Sparring al parco             | 20%: 0; 60%: 1; 20%: 2                 |
| Lezioni all'aperto            | 50%: 1; 50%: 2                         |
| Oktoberfest                   | 50%: 1; 50%: 2                         |
| Evento sportivo               | 25%: 1; 50%: 2; 25%: 3                 |
| Mele Comics                   | 25%: 1–2; 50%: 2–3; 25%: 3–4           |
| CairoMix                      | 10%: 1; 20%: 2; 40%: 3; 20%: 4; 10%: 5 |
| CogoComix                     | 25%: 3–4; 50%: 5; 25%: 6–7             |
| Burtomics                     | 25%: 5–6; 50%: 7–8; 25%: 9–10          |
| Genova Comics & Games         | 25%: 7–8; 50%: 9–11; 25%: 12–13        |
| Megacon Genova                | 25%: 9–11; 50%: 12–14; 25%: 15–17      |
| Lucca Comics & Games          | 25%: 10–12; 50%: 14–16; 25%: 18–20     |
| Milan Games Week & Cartoomics | 25%: 15–17; 50%: 18–22; 25%: 23–25     |
| Sfida a Cthulhu               | 25%: 40–44; 50%: 48–52; 25%: 56–60     |

Gli intervalli sono uniformi: per esempio, una fascia 2–3 sceglie 2 o 3 con la
stessa probabilità. La ricompensa estratta viene normalizzata stocasticamente
con il fattore 25/27; prima della protezione iniziale contro gli esiti nulli,
questo porta il ciclo automatico di un collaboratore Novizio a 3 contatti medi
al minuto senza eliminare i risultati interi. I bonus positivi di affluenza,
Carisma e collaboratori generano poi un'aggiunta indipendente calcolata sul
valore medio normalizzato. Possono quindi trasformare uno zero in un contatto o
superare il massimo della distribuzione base, senza essere applicati due volte.
Finché la scuola ha meno di quattro collaboratori, ogni eventuale risultato
finale di zero viene sostituito da un contatto. L'interfaccia mostra solo
indicazioni generiche di rischio e potenzialità, mai queste percentuali.

Il bacino dei contatti usa esclusivamente gli iscritti attivi. I primi dieci non
applicano penalità; oltre quella soglia, ogni iscritto riduce progressivamente
la capacità di trovare persone nuove. Se qualcuno lascia la scuola, la
disponibilità risale perché quella persona, o una persona equivalente nella
rappresentazione delle rarità non nominali, può tornare nel bacino futuro. La
curva non raggiunge mai zero: con 5.000 iscritti conserva circa il 16,69% della
produzione. Il bonus Follower resta nel moltiplicatore e può compensare la
saturazione nel tempo. Questa regola è intenzionalmente interna e non viene
mostrata nell'interfaccia.

### 8.3 Lezioni in palestra, Social e volantinaggio

La **lezione di prova in palestra** non genera nuovi indirizzi: consuma una
prenotazione ottenuta tramite email e produce il possibile iscritto finale. Per
lo scopo del gioco, ogni persona partecipa a una sola lezione.

I **Social** sviluppano la presenza online della scuola. La Redazione si evolve
in Social al raggiungimento di 35 iscritti attivi: non nasce un nuovo ruolo e i
collaboratori già assegnati conservano incarico e Maestria. I contenuti Social
avanzano sempre. Quando una email richiede scrittura, la ripartizione interna è
95% alla mail e 5% ai contenuti; questo rapporto non viene mostrato al
giocatore. Senza email, tutta la potenza produce contenuti. Un contenuto
richiede 100.000 caratteri e ha il 50% di probabilità base di ottenere un
Follower. Social non crea mai Contatti: ogni 1.000 Follower aumenta invece del
5% l'affluenza agli Eventi, senza alcun limite massimo. Social non genera prove
dirette, non migliora la qualità dei contatti e non accredita denaro per ciclo.
Le sponsorizzazioni vengono riscosse con le rette mensili, a partire da 0,10 €
per Follower. Le campagne manuali del vecchio sistema non esistono più.

Il **Volantinaggio** è sempre disponibile come attività gratuita di sicurezza
quando mancano contatti o denaro. Non richiede iscritti o spade, ma produce
soltanto pochi indirizzi.

### 8.4 Esaurimento dei contatti

Quando non esistono contatti disponibili:

- la bozza corrente non viene creata;
- compare una normale email interna con oggetto “Elenco contatti esaurito”;
- il testo suggerisce di aprire il Calendario;
- la produzione automatica di email si mette in pausa;
- la riga email del settore Social resta vuota e grigia, mentre i contenuti
  continuano ad avanzare;
- nessun progresso viene perso.

Questa situazione è intenzionale e rappresenta il principale collo di bottiglia
strategico.

---

## 9. Collaboratori delle Onde

### 9.1 Reclutamento

Comuni e Rari non diventano Collaboratori delle Onde. Gli Ultra Rari diventano
collaboratori dopo aver completato il **Corso Y**. I Leggendari diventano
collaboratori fin dall'iscrizione.

La probabilità può aumentare con:

- qualità dell'accoglienza;
- dimensione della scuola;
- reputazione;
- progetti interni;
- potenziamenti organizzativi.

### 9.2 Dati e regole

Ogni collaboratore possiede:

- nome inventato;
- data di ingresso;
- Forme sbloccate;
- stato e assegnazione attuale.

Ogni collaboratore accumula inoltre una **Maestria** separata per ciascun ruolo
operativo: Redazione/Social, Eventi, Attrezzatura e Istruttore. La Preparazione
atletica usa la Maestria Istruttore. I cinque gradi condividono la stessa curva
di esperienza in tutti i ruoli:

| Grado      | Tempo dal grado precedente | Tempo cumulativo | XP cumulativi | Bonus |
| ---------- | -------------------------: | ---------------: | ------------: | ----: |
| Novizio    |                          — |                0 |             0 |    0% |
| Iniziato   |                   1 minuto |         1 minuto |            60 |   20% |
| Accademico |                   5 minuti |         6 minuti |           360 |   40% |
| Cavaliere  |                  30 minuti |        36 minuti |         2.160 |   65% |
| Maestro    |                      1 ora |     1 ora e 36 m |         5.760 |  100% |

Durante il gioco attivo, ogni collaboratore assegnato riceve **1 XP al secondo**
esclusivamente nella Maestria del proprio ruolo corrente, indipendentemente
dall'attività svolta. Un collaboratore non assegnato non riceve XP; cambiando
ruolo, inizia ad avanzare nel nuovo percorso e conserva gli XP già guadagnati
negli altri. Il progresso non avanza mentre il gioco è chiuso. Il passaggio di
grado viene comunicato tramite un messaggio automatico nella Posta.

Regole:

- alcuni personaggi reali potranno essere aggiunti in seguito;
- nella prima versione non esistono livelli, ritratti o personalità individuali;
- non esiste un limite massimo di collaboratori;
- ogni collaboratore svolge un solo incarico alla volta;
- fino a otto collaboratori la riassegnazione individuale è libera e immediata;
- al raggiungimento del nono collaboratore si sblocca definitivamente la vista
  aggregata per settori, accompagnata da un tutorial che mette il gioco in
  pausa; la vista individuale non torna disponibile anche se l'organico scende;
- la vista aggregata mostra il rapporto **Non assegnati/Totali** e permette di
  aumentare o ridurre direttamente il numero desiderato di persone per ogni
  settore, senza legarsi alle identità dei singoli collaboratori;
- quando cambia l'organico desiderato, i collaboratori liberi vengono riallocati
  subito e quelli in eccesso restano non assegnati;
- un collaboratore impegnato in un evento o in una formazione conserva
  temporaneamente il proprio incarico, conclude l'attività e viene riallocato
  prima che possa avviarne un'altra automaticamente; i lavori continui e
  condivisi sono invece riassegnabili subito;
- se un settore richiede più persone di quelle presenti, i posti mancanti
  restano memorizzati e vengono occupati automaticamente dai nuovi collaboratori
  liberi;
- un collaboratore non leggendario può lasciare la scuola soltanto tramite
  eventi narrativi casuali;
- i Leggendari non possono lasciare la scuola per inattività, mancato rinnovo o
  altri eventi generici.

Regole interne dei Leggendari, mai esplicitate nell'interfaccia:

- Andrea Simonazzi è garantito come 9° contatto nella scuola iniziale; nelle
  scuole successive la sua comparsa torna casuale come per ogni altro
  Leggendario, senza garanzie di prenotazione o iscrizione;
- la probabilità annuale di abbandono di tutti i Leggendari è sempre 0%,
  indipendentemente dalla formazione e dal numero di scuole fondate;
- l'unico modo previsto per perdere un Leggendario sarà un evento narrativo
  dedicato, non ancora implementato; finché l'evento non esiste, un Leggendario
  iscritto resta nella scuola per sempre;
- la probabilità di comparsa del pool Leggendario è 2% per ogni nuovo contatto
  idoneo: dal decimo nella scuola iniziale e fin dal primo nelle scuole
  successive;
- Pity modifica allo stesso modo le prove dei Leggendari ordinari e Segreti;
  raggiunto il 100%, la prova è garantita e può concludersi anche senza spade;
- ogni profilo Leggendario è unico: finché esiste già come contatto attivo,
  prova in palestra, iscritto o collaboratore non può essere generato una
  seconda volta;
- dopo una prova non convertita, il profilo resta occupato finché l'esito **Non
  iscritto** è visibile in **La mia giornata**; quando la notifica scade, torna
  disponibile per nuovi contatti, prove e strumenti Admin;
- se nessun profilo del pool è disponibile, qualsiasi nuova assegnazione
  Leggendaria genera invece un Ultra Raro dello stesso tipo di premio;
- con il prestigio tutti i profili Leggendari tornano disponibili nel pool della
  nuova scuola;
- dopo l'eventuale abbandono causato dall'evento dedicato tornano disponibili
  per incontri futuri;
- una nuova iscrizione successiva all'evento dedicato ripristina integralmente
  Forme, attestati da Istruttore, anzianità e storico formativo; l'incarico
  operativo torna invece non assegnato.

La pagina **Admin**, disponibile soltanto in sviluppo, può avviare direttamente
la prova in palestra di un profilo Leggendario scelto casualmente tra quelli
ancora disponibili. Il comando non iscrive il personaggio: crea una prova della
durata ordinaria, che usa le stesse probabilità di conversione, le stesse regole
di unicità e lo stesso reclutamento automatico dei Leggendari del flusso
normale.

La stessa pagina può forzare il passaggio al mese successivo. Il comando porta
la scadenza mensile all'istante corrente ed esegue la normale pipeline di gioco:
entrate, tornei, rinnovi annuali, cambio del calendario e automazioni. Le
attività che hanno una propria scadenza futura non vengono completate in
anticipo.

### 9.3 Ruoli

| Ruolo                | Funzione                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Redazione → Social   | produce sempre contenuti Social; durante la scrittura assegna internamente il 95% alle email e il 5% ai contenuti  |
| Eventi               | aumenta persone incontrate e contatti ottenuti                                                                     |
| Preparatore Atletico | migliora Arena o Stile degli iscritti evitando ripetizioni consecutive                                             |
| Attrezzatura         | controlla e ripristina le spade                                                                                    |
| Istruttore           | insegna le Forme già attestate agli iscritti, una persona alla volta, e migliora la conversione prova → iscrizione |
| Gadget               | sviluppa e revisiona i prototipi e gestisce le vendite automatiche del catalogo                                    |
| Coordinamento        | funzione futura, non inclusa nell'MVP                                                                              |

Il Preparatore Atletico opera solo durante il gioco online. La selezione è
casuale senza priorità legata alla debolezza dell'atleta e impedisce di
scegliere lo stesso iscritto nel potenziamento immediatamente successivo, salvo
il caso in cui sia l'unico iscritto disponibile. Nel 97,5% dei casi il tiro usa
tutti gli iscritti disponibili; nel restante 2,5% usa soltanto gli iscritti nei
preferiti ancora disponibili.

### 9.4 Scrittura automatica

```text
caratteriAutomaticiAlSecondo = velocitàBaseCollaboratore
  × collaboratoriAssegnati
  × potenzaScrittura
  × bonusForma
  × bonusScritturaScuola
  × moltiplicatorePrestigio
```

I caratteri automatici avanzano la stessa mail visibile al giocatore. L'input
manuale si somma senza conflitti. Con **Invio automatico** attivo, la Redazione
invia la mail appena raggiunge la lunghezza richiesta. Se è disattivato, anche i
collaboratori si fermano sulla mail completa finché il giocatore non conferma
l'invio. Dopo lo sblocco Social, i collaboratori producono sempre contenuti
online; durante la scrittura di una mail le danno priorità, assegnandole
internamente il 95% della potenza e conservando il 5% per i contenuti. Le
percentuali non sono esposte nell'interfaccia.

### 9.5 Raccolta automatica dei contatti

I collaboratori assegnati agli Eventi possono:

- aumentare il rendimento di un evento pianificato;
- organizzare piccole attività ricorrenti;
- produrre nuovi contatti tramite le attività automatiche previste.

La forza complessiva del settore applica rendimenti decrescenti. Si somma la
produttività base dei collaboratori assegnati e si eleva il risultato a
`log10(2)`, cioè circa `0,30103`. Un collaboratore ordinario vale ×1, dieci
valgono ×2 e cento valgono ×4. Ogni aggiunta resta positiva, ma il suo
incremento, a parità di produttività individuale, è inferiore al precedente. Una
squadra con forza inferiore a 1 usa comunque ×1, così gli eventi manuali non
vengono penalizzati.

Per ogni collaboratore libero, l'automazione prova gli eventi dal prezzo base
più basso al più alto; a parità di prezzo sceglie quello con la media contatti
più alta. Il Volantinaggio partecipa alla graduatoria ed è quindi normalmente la
prima scelta. Eventi già in corso, in cooldown o non sostenibili per sblocchi,
Euro, iscritti o spade vengono saltati.

La raccolta automatica deve essere più lenta degli eventi gestiti attivamente,
ma sufficiente a impedire un blocco totale nelle fasi avanzate.

### 9.6 Percorso delle Forme

Le Forme non simulano il combattimento: rappresentano formazione e
moltiplicatori del collaboratore. Il percorso è:

```text
Forma 1
  → Corso X [soltanto con il relativo Percorso Segreto]
  → Forma 2
  → Corso Y
  → Forme 3, 4 e 5 in uno o più rami:
      - Spada Lunga
      - Staffa
      - Doppia spada corta
  → Forma 6
  → Forma 7
```

Corso X è un anno formativo sperimentale della scuola di Genova, dedicato
all'approfondimento della Forma 1 e all'introduzione dei rudimenti della Forma 2
applicati al combattimento in arena. Offre agli allievi, spesso ancora
inesperti, il tempo necessario per consolidare e affinare la tecnica.

All'inizio della partita questo passaggio non fa parte del percorso: il gioco si
comporta come se tra Forma 1 e Forma 2 non esistesse alcun corso. Corso X, i
suoi badge, i controlli, i filtri e le qualifiche restano completamente nascosti
finché non viene scoperto e acquistato il Percorso Segreto **Corso X**.

Ogni Forma ha un nome lungo, usato nei testi descrittivi, e un nome corto per le
interfacce compatte:

| Percorso           | Nome lungo                     | Nome corto      |
| ------------------ | ------------------------------ | --------------- |
| Iniziale           | Forma 1                        | F1              |
| Iniziale           | Corso X                        | CX              |
| Iniziale           | Forma 2                        | F2              |
| Iniziale           | Corso Y                        | CY              |
| Spada Lunga        | Forma 3/4/5 Spada Lunga        | F3L / F4L / F5L |
| Doppie Spade Corte | Forma 3/4/5 Doppie Spade Corte | F3D / F4D / F5D |
| Staffa             | Forma 3/4/5 Staffa             | F3S / F4S / F5S |
| Finale             | Forma 6                        | F6              |
| Finale             | Forma 7                        | F7              |

Gli effetti ludici non devono riprodurre fedelmente le caratteristiche tecniche
reali delle Forme.

Regole:

- ogni iscritto può conoscere più Forme;
- prima del Percorso Segreto Corso X la progressione lineare è **Forma 1 → Forma 2**;
- dopo il suo acquisto Corso X diventa obbligatorio e la progressione è **Forma 1 →
  Corso X → Forma 2**;
- i dati di Corso X già presenti in un salvataggio restano conservati ma
  invisibili fino allo sblocco;
- dopo lo sblocco, iscritti e collaboratori che possiedono Forma 2 o una Forma
  successiva senza Corso X devono recuperarlo prima di iniziare qualsiasi altra
  Forma, Arena Tecnica, Corso Agonisti, Corso Istruttori o Corso Tecnico;
- il recupero rispetta costo, spade, slot annuali e condizioni didattiche
  ordinarie; se una formazione è già attiva, attende la sua conclusione;
- le statistiche ufficiali Arena e Stile diventano visibili soltanto dopo il
  completamento di **Corso Y**;
- ogni iscritto o collaboratore può iniziare al massimo una Forma per anno
  formativo; il livello 6 di **Didattica di gruppo** porta questo limite a due
  e il livello 1 di **PagoSport** lo porta a tre;
- gli slot annuali delle Forme si rinnovano a luglio e coprono il periodo
  luglio–giugno: una Forma iniziata a luglio consuma quindi uno slot valido
  anche nel settembre immediatamente successivo;
- Luglio e Agosto sono pausa estiva per tutte le Forme degli atleti, che pur
  avendo ricevuto i nuovi slot non possono usarli fino a settembre; i Corsi
  Istruttori e i Corsi Tecnici possono invece iniziare o proseguire e in questi
  due mesi avanzano al **200% della velocità normale**;
- l'anno scolastico ordinario resta da Settembre ad Agosto;
- completare un solo ramo fino alla Forma 5 è sufficiente per accedere alla
  Forma 6;
- durante Corso Y ogni allievo sviluppa automaticamente da una a tre preferenze
  fra Spada Lunga, Staffa e Doppia spada corta;
- gli altri rami preferiti restano percorsi facoltativi che l'automazione può
  completare dopo la Forma 7;
- la formazione richiede Euro e/o tempo, ma non livelli personali;
- ogni corso riserva le spade per tutta la sua durata e applica il carico solo
  al completamento;
- le descrizioni definitive dovranno usare terminologia LudoSport approvata.

| Corso o Forma                     |               Spade per atleta | Carico per spada |
| --------------------------------- | -----------------------------: | ---------------: |
| Forma 1, Corso X, Forma 2         |                              1 |               10 |
| Corso Y                           |                              2 |               10 |
| Forme 3 e 4 Spada Lunga           |                              1 |               10 |
| Forme 3 e 4 Staffa o Doppie Spade |                              2 |               10 |
| Forma 5 Spada Lunga               |                              1 |               32 |
| Forma 5 Staffa o Doppie Spade     |                              2 |               32 |
| Forma 6                           |                              2 |               20 |
| Forma 7                           |                              3 |               20 |
| Arena Tecnica / Corso Agonisti    | da 1 a 3 secondo le Forme note |               20 |

Forma 5 ha intenzionalmente il carico per spada più alto del gioco. Forma 6 e
Forma 7 possono produrre più carico totale perché impiegano rispettivamente due
e tre spade, ma non superano Forma 5 nell'aggressività della singola arma.

Costi base: Forma 1 €50, Corso X €100, Forma 2 €250, Corso Y €500, Forma 3
€1.000, Forma 4 €1.500, Forma 5 €2.000, Forma 6 €3.000, Forma 7 €5.000. Lo
scoglio economico principale inizia dopo Corso Y.

### 9.7 Istruttori e attestati

Un Collaboratore delle Onde può essere assegnato al ruolo di **Istruttore**.
L'incarico operativo e gli attestati sono distinti: ogni Forma o Corso che
assegna un badge richiede una propria formazione da Istruttore.

Regole:

- l'assegnazione al ruolo è gratuita e non converte automaticamente le Forme
  pregresse;
- un Istruttore può insegnare soltanto le Forme già completate e qualificate;
  ogni Forma, inclusi Corso X e Corso Y, richiede la relativa qualifica;
- chi conosce già una Forma completa un Corso Istruttori pari al **50% della
  durata base della Forma** e paga il **250% del costo base**;
- chi non conosce ancora la Forma segue un percorso combinato composto dalla
  Forma da atleta e dal modulo da Istruttore: dura complessivamente il **150%**
  della Forma, paga il **350% del costo base** e consuma un solo slot annuale;
- un Collaboratore assegnato come Istruttore resta eleggibile come allievo
  dell'automazione: durante l'anno didattico, se un altro Istruttore possiede la
  qualifica per la sua prossima Forma, completa prima la normale fase da atleta
  con il costo ridotto al **75%**; se un Tecnico possiede la qualifica per la
  stessa Forma, il successivo Corso Istruttori interno parte automaticamente al
  **187,5%** del costo base. Le due fasi consumano complessivamente un solo slot
  annuale; senza un Tecnico compatibile resta in attesa della qualifica;
- le due parti del percorso combinato restano fasi separate: la Forma viene
  acquisita prima dell'attestato e ciascuna fase ha la propria verifica finale;
- un Istruttore può iniziare o continuare una nuova formazione anche mentre
  insegna; in questo caso la durata è tripla rispetto alla velocità normale e
  torna normale quando non ha più allievi attivi o l'insegnamento automatico
  viene disabilitato;
- gli esami finali sono un sistema interno e non vengono comunicati
  nell'interfaccia: il rischio di non superarli è **50%** per Forme e Corsi da
  atleta, **45%** per i Corsi Istruttori e **40%** per i Corsi Tecnici;
- ogni verifica non superata prolunga soltanto la fase interessata del **10%**
  della sua durata originaria; la verifica viene ripetuta al nuovo termine senza
  mostrare probabilità, fallimenti o messaggi al giocatore;
- le verifiche da atleta valgono per tutte le Forme e i Corsi che assegnano un
  badge, inclusi Corso X, Corso Y e le varianti di ramo. Arena Tecnica e Corso
  Agonisti sono esclusi;
- se nessun Collaboratore è assegnato al ruolo di Istruttore, il singolo allievo
  può iniziare manualmente la prossima Forma pagando il costo base;
- se almeno un Collaboratore è assegnato al ruolo di Istruttore, il comando
  manuale scompare e la pagina Iscritti mostra al suo posto tutte le prossime
  Forme che l'atleta può apprendere; le lezioni vengono avviate soltanto
  dall'automazione e, con un Istruttore compatibile, ricevono una riduzione del
  **25%** e costano quindi il **75% del costo base**;
- **Percorso Tecnico** è il primo potenziamento del ramo Insegnamento, è disponibile
  appena si sbloccano gli upgrade e non richiede Fama della scuola. Descrizione:
  “Sblocca i corsi per atleti agonisti: protegge la scuola dal rischio di
  perdere atleti alla fine dell'anno e, con la giusta attenzione, li renderà
  sempre più competitivi.”;
- al livello 1 Percorso Tecnico costa **€1.000** e sblocca Arena Tecnica come formazione
  automatica, sempre attiva e non disabilitabile separatamente. La formazione
  costa **€300 per atleta**, dura 120 secondi, non migliora le statistiche ma
  protegge subito l'allievo dal controllo annuale degli abbandoni;
- il livello 2 costa **€2.000** e porta la durata base di Arena Tecnica a **60
  secondi**;
- il livello 3 costa **€5.000**, trasforma la formazione in **Corso Agonisti**,
  ne porta il costo base a **€1.000** e attiva integralmente i miglioramenti
  permanenti di Arena e Stile; la durata base resta di 60 secondi e il logo
  della formazione riceve una stella gialla nello stile delle qualifiche da
  Istruttore;
- il livello 4 costa **€7.500** e porta la durata base del Corso Agonisti a **30
  secondi**;
- l'automazione propone Arena Tecnica o il Corso Agonisti a un atleta o a un
  collaboratore inserito nella coda automatica quando ha ancora uno slot
  formativo libero e ha completato il proprio percorso oppure nessun Istruttore
  automatico possiede le qualifiche per le sue prossime Forme;
- iniziare Arena Tecnica o il Corso Agonisti consuma **tutti gli slot formativi
  annuali ancora disponibili** e protegge subito l'atleta dal controllo degli
  abbandoni. Lo stesso atleta non può iniziarlo più di una volta nello stesso
  periodo luglio–giugno, anche quando i potenziamenti gli concedono altri slot;
- Arena Tecnica ai livelli 1 e 2 non modifica Arena, Stile o il totale storico
  dei Corsi Agonisti. Dal livello 3, completare il Corso Agonisti aumenta
  permanentemente Arena e Stile. Senza potenziamenti assegna **+1 Arena** e **+1
  Stile**; **Intensità agonistica** ha quattro livelli e aumenta il massimo
  casuale di entrambe le caratteristiche fino a **+5**, mantenendo +1 come
  minimo. Il risultato casuale di ciascuna caratteristica viene moltiplicato per
  il numero di slot residui consumati dal corso. I bonus effettivi e il numero
  di completamenti si accumulano senza limite negli anni successivi e sono
  registrati nella riga dell'atleta, senza creare notifiche o messaggi
  nell'inbox;
- i costi di Arena Tecnica e Corso Agonisti sono importi diretti per atleta e
  non ricevono la riduzione applicata alle Forme insegnate;
- l'automazione ordina gli allievi privilegiando, nell'ordine: gli atleti
  preferiti, il rischio effettivo di abbandono annuale più alto, la rarità
  (**Leggendario Segreto → Leggendario → Ultra Raro → Raro → Comune**), la
  prossima formazione meno avanzata, i collaboratori e infine gli iscritti con
  `acquiredAt` meno recente. A parità completa conserva l'ordine originale;
- quando il Percorso Segreto Corso X è stato scoperto e acquistato, Corso X
  precede ogni formazione successiva a
  Forma 1: chi ha completato Forma 1 ma non Corso X può ricevere soltanto Corso
  X finché non lo completa;
- l'ordine operativo degli Istruttori è: riprendere le formazioni in attesa,
  tenere un Corso Istruttori interno se qualificati come Tecnici, avviare un
  Corso Tecnico SIS già prenotato e idoneo, assegnare tutte le Forme automatiche,
  usare la capienza residua per Arena Tecnica o Corso Agonisti e infine
  contribuire alla Preparazione agonistica. Le attività formative personali
  restano compatibili con l'insegnamento secondo le regole di rallentamento;
- tra gli Istruttori disponibili e compatibili, l'automazione privilegia chi ha
  meno Forme insegnabili, così da conservare la disponibilità degli Istruttori
  più avanzati per gli allievi che ne hanno bisogno; a parità distribuisce prima
  il carico corrente, poi sceglie l'Istruttore più produttivo e infine quello
  entrato prima nella scuola;
- la Preparazione agonistica è attiva da settembre a giugno ed è sospesa sia a
  luglio sia ad agosto; durante la sospensione la schermata aggregata dei
  Collaboratori mostra **Pausa estiva**;
- nell'elenco individuale dei Collaboratori, un Istruttore che sta contribuendo
  alla Preparazione agonistica mostra la relativa barra attiva ed è considerato
  **In corso**, non **In attesa di un allievo**;
- disattivare l'automazione del singolo Istruttore o riassegnarlo lascia
  terminare le lezioni già iniziate, ma non ne avvia altre;
- annullare manualmente un'iscrizione è disponibile fin dall'inizio. La X nella
  riga di ogni persona nella schermata Iscritti richiede una conferma esplicita
  e annulla definitivamente l'iscrizione senza rimborso e senza ridurre la Fama
  della scuola. La formazione personale e le lezioni tenute dal collaboratore
  rimosso vengono interrotte;
- gli iscritti non leggendari rimossi non possono tornare. La loro scheda viene
  eliminata appena nessuna email, prova o attività ancora conservata la
  referenzia; statistiche aggregate, email ed eventi narrativi già avvenuti
  restano nello storico. I Leggendari conservano Forme,
  attestati, Maestria, Arena, Stile, esperienza nei tornei, Corsi Agonisti e
  anzianità; perdono soltanto incarico e automazione. I Leggendari ordinari
  tornano nel normale bacino di acquisizione, mentre i Leggendari Segreti devono
  essere nuovamente sconfitti nel rispettivo torneo;
- acquistare il livello 1 di Percorso Tecnico sblocca **Master of none**. I suoi
  due livelli permettono agli Istruttori di accedere a uno e poi due rami d'arma
  oltre le preferenze iniziali;
- **Tu conosci la SIS?** segue Master of none: il livello 1 sblocca le
  candidature ai Corsi Tecnici; i livelli 2, 3 e 4 aumentano la loro velocità
  rispettivamente del 10%, 20% e 30%;
- **Il costo del Servizio** ha cinque livelli e riduce del 5% per livello,
  fino al 25%, soltanto i costi dei percorsi che assegnano un attestato da
  Istruttore o una qualifica da Tecnico. Forme da atleta, Arena Tecnica e Corso
  Agonisti non ricevono lo sconto;
- **Didattica di gruppo** porta con i primi cinque livelli la capacità di ogni
  Istruttore da due a sei allievi contemporanei; il sesto livello concede a
  tutti un secondo slot di formazione nel periodo luglio–giugno;
- **Preparazione agonistica** è successiva a Didattica di gruppo e richiede
  anche Percorso Tecnico al livello 3. Il primo livello la sblocca; ogni livello
  fornisce il 25% di efficacia;
- **PagoSport** segue Preparazione agonistica: il livello 1 concede uno slot di
  formazione annuale aggiuntivo; il livello 2 aumenta del **50%** la velocità
  dei Corsi Tecnici; il livello 3 aumenta inoltre del **50%** la velocità di
  tutte le formazioni, comprese Forme, Corsi Istruttori, Corsi Tecnici, Arena
  Tecnica e Corso Agonisti. I bonus sono cumulativi e si sommano al raddoppio
  estivo;
- completare PagoSport sblocca **Intensità agonistica**, estensione in quattro
  livelli che porta il massimo casuale del Corso Agonisti da +1 a +5 per
  caratteristica, senza alterare il minimo +1;
- **Corso X** e **ToccoDiGilo** non appartengono alla sequenza lineare: sono due
  Percorsi Segreti indipendenti, inizialmente mostrati come `???`, e vengono
  rivelati soltanto dalle rispettive condizioni narrative;
- i completamenti automatici confluiscono in una notifica riepilogativa
  impilata.

### 9.7.1 Tecnici e formazione interna

Il **Tecnico** è una qualifica per singola Forma o Corso, non un nuovo incarico
operativo. Il percorso è disponibile per ogni formazione che assegna un badge,
inclusi Corso X e Corso Y, ma esclude il Corso Agonisti. I percorsi da
Istruttore e Tecnico di Corso X sono disponibili soltanto dopo l'acquisto del
Percorso Segreto Corso X; il Corso Tecnico continua a richiedere anche il primo
livello di **Tu conosci la SIS?**.

Regole:

- la scuola deve avere acquistato il livello 1 di **Tu conosci la SIS?** prima di poter
  prenotare o avviare un Corso Tecnico esterno;
- può candidarsi soltanto un Collaboratore assegnato come Istruttore che abbia
  già completato la formazione come atleta e possieda il relativo attestato da
  Istruttore;
- lo stesso Collaboratore può ottenere più qualifiche da Tecnico;
- il Corso Tecnico è esterno, si svolge alla **SIS — Scuola Internazionale
  Superiore** ed è tenuto dai Maestri Fondatori di LudoSport;
- il corso costa il **1000% del costo base** e ha una durata base pari al **1000%
  della durata della Forma**;
- la prenotazione è disponibile tutto l'anno e viene pagata subito. In luglio o
  agosto il corso parte immediatamente se il Collaboratore è libero; negli altri
  mesi viene programmato per il luglio successivo. Se a luglio il Collaboratore
  è impegnato, parte appena si libera, anche dopo l'estate;
- un corso già iniziato continua senza limiti di calendario;
- un Tecnico forma automaticamente un solo aspirante Istruttore alla volta per
  una Forma compatibile. L'aspirante deve essere assegnato come Istruttore,
  conoscere già la Forma come atleta e non possedere l'attestato;
- il Corso Istruttori interno costa il **75% del normale Corso Istruttori**,
  cioè il **187,5% del costo base**, e mantiene durata ed esame del modulo da
  Istruttore;
- **Il costo del Servizio** riduce fino al 25% sia questi Corsi Istruttori sia
  i Corsi Tecnici SIS; non si applica ai percorsi da atleta;
- i livelli 2–4 di **Tu conosci la SIS?** aumentano la velocità dei soli Corsi
  Tecnici rispettivamente del 10%, 20% e 30%;
- la scelta automatica privilegia, nell'ordine, la Forma più bassa nella
  progressione, l'attestato più utile agli allievi in attesa e il Collaboratore
  entrato prima nella scuola;
- Istruttori e Tecnici possono continuare a insegnare agli allievi mentre sono
  coinvolti in queste formazioni. Se il partecipante o, nel corso interno, il
  Tecnico sta anche insegnando, la durata residua diventa tripla; la penalità
  non si cumula se entrambi insegnano;
- sulla singola Forma la corona dorata identifica l'attestato da Istruttore; la
  qualifica da Tecnico la sostituisce con una corona glicine;
- nella schermata aggregata, **Forme insegnabili** usa la corona glicine quando
  è presente almeno un Tecnico compatibile e mostra i Corsi Istruttori interni
  attivi con logo della Forma, corona dorata e barra di avanzamento. Non viene
  mostrato alcun candidato successivo.

### 9.8 Abbandono degli iscritti ignorati

Nel passaggio tra Giugno e Luglio, un iscritto vulnerabile che non ha iniziato
alcuna formazione durante l'anno scolastico appena concluso può lasciare la
scuola. Le immunità degli atleti sono centralizzate e distinguono il controllo
annuale dai futuri eventi imprevisti:

| Motivo                                                              | Controllo annuale Giugno → Luglio | Eventi imprevisti | Scadenza                                                                             |
| ------------------------------------------------------------------- | --------------------------------: | ----------------: | ------------------------------------------------------------------------------------ |
| Iscrizione effettuata da Gennaio ad Agosto                          |                            Immune |            Immune | Inizio di Settembre                                                                  |
| Qualificazione al prossimo torneo                                   |                            Immune |            Immune | Conclusione del torneo: resta protetto soltanto chi si qualifica a quello successivo |
| Forma, Corso X/Y, Arena Tecnica o Corso Agonisti iniziato nell'anno |                            Immune |       Vulnerabile | Successivo controllo annuale                                                         |

Le iscrizioni effettuate da Settembre a Dicembre non ricevono l'immunità da
nuova iscrizione. Dopo la Champion's Arena la qualificazione viene azzerata: non
essendoci un torneo successivo prima di Dicembre, gli atleti tornano vulnerabili
salvo altre immunità attive. Sono inoltre sempre esclusi dal controllo annuale:

- tutti i Leggendari, anche se ignorati per più anni;
- i Collaboratori delle Onde non leggendari;
- chi ha iniziato una formazione durante l'anno, anche se non l'ha ancora
  completata.

La probabilità annuale dipende dalla Forma numerata più alta completata. I Corsi
X e Y non riducono da soli il rischio. Comuni, Rari e Ultra Rari seguono la
curva ordinaria fino alla Forma 6; a Forma 7 si applicano valori specifici per
rarità. I Leggendari hanno sempre probabilità 0%. Normalmente un Ultra Raro è
già collaboratore dal Corso Y ed è quindi escluso da questo controllo.

| Forma più alta        | Comuni | Rari | Ultra Rari | Leggendari |
| --------------------- | -----: | ---: | ---------: | ---------: |
| Nessuna Forma         |    80% |  80% |        80% |         0% |
| Forma 1               |    65% |  65% |        65% |         0% |
| Forma 2               |    50% |  50% |        50% |         0% |
| Forma 3               |    35% |  35% |        35% |         0% |
| Forma 4               |    25% |  25% |        25% |         0% |
| Forma 5               |    15% |  15% |        15% |         0% |
| Forma 6               |    10% |  10% |        10% |         0% |
| Forma 7, prima scuola |   2,5% | 0,5% |      0,25% |         0% |

Per ogni nuova scuola già fondata, i valori di **Forma 7** di Comuni, Rari e
Ultra Rari aumentano di **0,5 punti percentuali**. Per esempio, nella seconda
scuola diventano rispettivamente 3%, 1% e 0,75%. I Leggendari restano sempre
allo 0%.

---

## 10. Potenziamenti

La schermata presenta otto rami pubblici, sempre nello stesso ordine:
**Scrittura, Creatività, Carisma, Accoglienza, Attrezzatura, Gadget,
Insegnamento e Organizzazione**. Ogni ramo contiene esattamente sette
potenziamenti principali. Social non ha più un ramo separato: i suoi effetti
sono distribuiti tra Scrittura e Creatività.

I prezzi riportati nelle tabelle sono quelli locali della prima scuola. Ogni
scuola già fondata aggiunge il 15% ai prezzi di Scrittura, Creatività, Carisma,
Accoglienza, Attrezzatura e Organizzazione. Gadget, Insegnamento, estensioni e
Percorsi Segreti non ricevono questa maggiorazione. I prerequisiti tra nodi
sono mostrati direttamente dall'interfaccia.

### 10.1 Scrittura

Accelera la produzione manuale e automatica delle email e dei contenuti Social.

| Potenziamento | Effetto completo | Costi per livello |
| --- | --- | --- |
| Tastiera comoda | +0,2 caratteri per input per livello; massimo +1 | 50 / 100 / 200 / 400 / 800 € |
| Frasi rapide | +0,4 caratteri per input per livello; massimo +2 | 150 / 300 / 600 / 1.200 / 2.400 € |
| Firma automatica | +10% velocità Redazione/Social per livello; massimo +50% | 300 / 600 / 1.200 / 2.400 / 4.800 € |
| Campi intelligenti | ogni nuova email nasce già completata del 5% per livello; massimo 25%. Non modifica email già create | 600 / 1.200 / 2.400 / 4.800 / 9.600 € |
| Sintesi dei contenuti | lavoro per contenuto Social: 100.000 → 90.000 → 80.000 → 70.000 → 60.000 → 50.000 caratteri | 2.500 / 5.000 / 10.000 / 20.000 / 40.000 € |
| Revisione istantanea | +15% velocità Redazione/Social per livello; massimo +75% | 2.500 / 5.000 / 10.000 / 20.000 / 40.000 € |
| Fusione documenti | copia nei Social il 5% per livello del lavoro svolto sull'email, senza rallentarla; massimo 25% | 25.000 / 50.000 / 100.000 / 200.000 / 400.000 € |

### 10.2 Creatività

Ogni livello concede un punto Creatività e fa avanzare linearmente la
probabilità che una email ottenga una prova. I massimi sono 85% per i Comuni,
90% per i Rari, 95% per gli Ultra Rari e 100% per i Leggendari.

| Potenziamento | Effetto aggiuntivo | Costi per livello |
| --- | --- | --- |
| Controllo ortografico | nuovo catalogo email dal livello 1 | 50 / 100 / 200 / 400 / 800 € |
| Email professionale | firma completa e struttura ordinata, ancora senza HTML | 100 / 200 / 400 / 800 / 1.600 € |
| Invito personalizzato | nuovo catalogo e sblocco delle email HTML | 150 / 300 / 600 / 1.200 / 2.400 € |
| Call to action | link e pulsanti nei cataloghi successivi | 300 / 600 / 1.200 / 2.400 / 4.800 € |
| Impaginazione | struttura visiva completa | 600 / 1.200 / 2.400 / 4.800 / 9.600 € |
| Pubblicità vincente | probabilità Follower Social 60% → 70% → 80% → 90% → 95%; al livello 5, 5% di ottenere due Follower | 5.000 / 10.000 / 20.000 / 40.000 / 80.000 € |
| Corso di Marketing | valore mensile del Follower 0,15 → 0,20 → 0,30 → 0,40 → 0,50 € | 10.000 / 25.000 / 50.000 / 100.000 / 200.000 € |

### 10.3 Carisma

Migliora il pubblico raggiunto dagli eventi e la quota che lascia un contatto.

| Potenziamento | Effetto per livello | Costi per livello |
| --- | --- | --- |
| Presentazione preparata | +4% contatti dagli eventi | 50 / 100 / 200 / 400 / 800 € |
| Biglietti con QR code | +4% contatti dagli eventi | 100 / 200 / 400 / 800 / 1.600 € |
| Dimostrazione coordinata | +5% pubblico agli eventi | 150 / 300 / 600 / 1.200 / 2.400 € |
| Stand riconoscibile | +7% pubblico agli eventi | 300 / 600 / 1.200 / 2.400 / 4.800 € |
| Set da dimostrazione | +6% pubblico agli eventi | 600 / 1.200 / 2.400 / 4.800 / 9.600 € |
| Risposte alle domande difficili | +6% contatti dagli eventi | 5.000 / 10.000 / 20.000 / 40.000 / 80.000 € |
| No, non è esattamente quella cosa | +8% contatti dagli eventi | 10.000 / 25.000 / 50.000 / 100.000 / 200.000 € |

### 10.4 Accoglienza

Fa avanzare ogni rarità dalla propria probabilità base di iscrizione fino al
massimo specifico. I progressi indicati sono quote del percorso base→massimo,
non punti percentuali aggiunti direttamente al risultato finale.

| Potenziamento | Effetto per livello | Costi per livello |
| --- | --- | --- |
| Procedura di benvenuto | +1% del percorso | 50 / 100 / 200 / 400 / 800 € |
| Materiale informativo chiaro | +1,5% del percorso | 150 / 300 / 600 / 1.200 / 2.400 € |
| Lezione introduttiva collaudata | +2% del percorso | 300 / 600 / 1.200 / 2.400 / 4.800 € |
| Sala preparata | +2,5% del percorso e −1 secondo alla prova; durata minima 10 secondi | 600 / 1.200 / 2.400 / 4.800 / 9.600 € |
| Collaboratore dedicato | +3% del percorso e +10% efficacia del contributo Istruttori | 2.500 / 5.000 / 10.000 / 20.000 / 40.000 € |
| Accoglienza dell'Ordine | +4% del percorso | 5.000 / 10.000 / 20.000 / 40.000 / 80.000 € |
| Esperienza memorabile | +6% del percorso e 5% di recuperare una prova fallita; massimo 25% | 10.000 / 25.000 / 50.000 / 100.000 / 200.000 € |

Il recupero di Esperienza memorabile vale una sola volta per contatto, esclude i
Leggendari Segreti e rimette il contatto tra i disponibili: serve quindi
scrivere e inviare una nuova email prima della seconda prova.

### 10.5 Attrezzatura

Riduce l'usura prodotta dalle attività programmate e accelera la manutenzione
dei Collaboratori. Nessun potenziamento crea spade gratuite: le spade continuano
a essere acquistate dal giocatore.

| Potenziamento | Effetto per livello | Costi per livello |
| --- | --- | --- |
| Controllo prima dell'uso | −2% usura programmata | 100 / 200 / 400 / 800 / 1.600 € |
| Kit di manutenzione | +10% velocità manutenzione automatica | 250 / 500 / 1.000 / 2.000 / 4.000 € |
| Banco da lavoro | riserva lavoro pari al 2% dell'usura massima di tutte le spade; massimo 10% | 500 / 750 / 1.000 / 1.500 / 2.500 € |
| Ricambi essenziali | −15 punti lavoro per riparare una spada rotta; da 150 a 75 | 1.000 / 2.000 / 4.000 / 8.000 / 16.000 € |
| Lista di controllo | −4% usura programmata | 2.500 / 5.000 / 10.000 / 20.000 / 40.000 € |
| Registro dell'attrezzatura | +10% velocità manutenzione automatica | 5.000 / 10.000 / 20.000 / 40.000 / 80.000 € |
| Le abbiamo messe a posto tutte | −4% usura programmata | 10.000 / 25.000 / 50.000 / 100.000 / 200.000 € |

Il Banco da lavoro accumula produzione soltanto quando non ci sono guasti e non
si riempie automaticamente all'acquisto. Il tetto segue dinamicamente il numero
di spade e viene ridotto se la capacità cala. Ogni spada rappresenta 100 punti
di usura massima: con sei spade, i cinque livelli conservano rispettivamente
12, 24, 36, 48 e 60 punti lavoro. La riserva viene consumata prima del lavoro
prodotto durante il guasto.

### 10.6 Gadget

Il ramo conserva il bilanciamento economico specifico del Laboratorio Gadget e
diventa visibile soltanto con lo sblocco del settore.

| Potenziamento | Effetto completo | Costi per livello |
| --- | --- | --- |
| Vetrina della scuola | pubblico iscritti 10% → 20% → 35% → 50% → 75% → 100% | 2.500 / 5.000 / 10.000 / 25.000 / 50.000 € |
| Negozio online | pubblico follower 0% → 1% → 3% → 5% → 10% → 20% → 35% → 50% → 75% → 100% | 5.000 / 10.000 / 25.000 / 50.000 / 100.000 / 200.000 / 400.000 / 800.000 / 1.600.000 € |
| Strumenti di progettazione | +20% velocità sviluppo per livello; massimo +100% | 5.000 / 10.000 / 20.000 / 40.000 / 80.000 € |
| Laboratorio revisioni | +20% velocità revisione per livello; massimo +100% | 5.000 / 10.000 / 20.000 / 40.000 / 80.000 € |
| Gestione degli ordini | +20% capacità commerciale per livello; massimo +100% | 10.000 / 20.000 / 40.000 / 80.000 / 160.000 € |
| Formazione commerciale | +2 punti percentuali di conversione per livello; massimo +10 | 15.000 / 30.000 / 60.000 / 120.000 / 240.000 € |
| Vendita abbinata | +5% vendite abbinate per livello; massimo +25% | 25.000 / 50.000 / 100.000 / 200.000 / 400.000 € |

### 10.7 Insegnamento

Il ramo ritarda volutamente la crescita atletica automatica. I primi nodi
aprono l'Arena e sviluppano Istruttori e Tecnici; Preparazione agonistica e i
potenziamenti forti del Corso Agonisti arrivano nella parte finale.

| Potenziamento | Effetto completo | Costi per livello |
| --- | --- | --- |
| Percorso Tecnico | L1 Arena Tecnica; L2 durata 120→60 s; L3 Corso Agonisti con +1 Arena/+1 Stile; L4 durata 60→30 s | 1.000 / 2.000 / 5.000 / 7.500 € |
| Master of none | +1 ramo d'arma accessibile agli Istruttori per livello | 2.000 / 4.000 € |
| Tu conosci la SIS? | L1 candidature SIS; L2/L3/L4 +10%/+20%/+30% velocità Corsi Tecnici | 5.000 / 10.000 / 20.000 / 40.000 € |
| Il costo del Servizio | −5% al costo dei percorsi che assegnano attestati da Istruttore o qualifiche da Tecnico; massimo −25% | 2.500 / 5.000 / 10.000 / 25.000 / 50.000 € |
| Didattica di gruppo | L1–L5 capacità contemporanea 2→6 allievi; L6 +1 corso annuale | 10.000 / 25.000 / 50.000 / 100.000 / 200.000 / 400.000 € |
| Preparazione agonistica | L1 sblocco della preparazione da settembre a giugno; +25% efficacia per livello | 25.000 / 50.000 / 100.000 / 200.000 / 400.000 € |
| PagoSport | L1 +1 corso annuale; L2 +50% velocità Corsi Tecnici; L3 +50% velocità di tutti i corsi | 100.000 / 200.000 / 400.000 € |

Al livello 3 di Percorso Tecnico, quando Arena Tecnica diventa Corso Agonisti,
il logo della formazione riceve una stella gialla nello stesso stile usato per
la qualifica da Istruttore. Il Corso Agonisti base assegna sempre +1/+1 in un
anno. Soltanto dopo PagoSport 3 compare l'estensione **Intensità agonistica**:
quattro livelli da 100.000 / 200.000 / 400.000 / 800.000 € portano il massimo
casuale rispettivamente a +2/+2, +3/+3, +4/+4 e +5/+5.

### 10.8 Organizzazione

Coordina le Aree di Attività (AA), migliora le automazioni generiche e aumenta
le entrate ricorrenti.

| Potenziamento | Effetto completo | Costi per livello |
| --- | --- | --- |
| Manuale operativo | +10% esperienza Maestria per livello; massimo +50% | 500 / 1.000 / 2.000 / 4.000 / 8.000 € |
| Turni dei collaboratori | trasferisce a un settore secondario il 10% della produttività inattiva per livello; massimo 50% | 2.500 / 5.000 / 10.000 / 20.000 / 40.000 € |
| Procedure standard | +5% velocità automazioni generiche per livello; massimo +25% | 5.000 / 10.000 / 20.000 / 40.000 / 80.000 € |
| Modulo di iscrizione | +5% entrate dalle quote per livello; massimo +25% | 5.000 / 10.000 / 20.000 / 40.000 / 80.000 € |
| Priorità operative | sblocca l'ordinamento con cui le AA consumano Euro, spade e risorse scarse | 25.000 € |
| A.N.D.E.R. | +10% a tutte le entrate ricorrenti per livello; massimo +50% | 10.000 / 25.000 / 50.000 / 100.000 / 200.000 € |
| Coordinamento multi-sede | +10% velocità automazioni generiche per livello; massimo +50%; richiede almeno una scuola fondata | 25.000 / 50.000 / 100.000 / 200.000 / 400.000 € |

Un settore principale è inattivo soltanto quando non ha lavoro reale da
svolgere. Eventi è considerato attivo finché esiste un evento in corso, così i
collaboratori non vengono contati contemporaneamente in due settori.
L'Insegnamento può essere il settore principale di un turno, ma non quello
secondario: insegnare richiede un incarico e le qualifiche appropriate.

### 10.9 Percorsi Segreti

La riga è sempre visibile. Prima della scoperta, ciascun nodo mostra `???`, un
lucchetto e soltanto un indizio nel tooltip. Ogni percorso si scopre in modo
indipendente: rivelarne uno non mostra il nome o la descrizione degli altri.
Le condizioni effettive di scoperta sono ancora da definire.

| Percorso dopo la scoperta | Effetto | Prezzo | Indizio prima della scoperta |
| --- | --- | ---: | --- |
| Corso X | sblocca Corso X e i relativi percorsi da Istruttore e Tecnico | 1 € | “Vincere il torneo più superbo dell'anno è solo l'inizio” |
| ToccoDiGilo | +9999% velocità con cui gli Istruttori insegnano le Forme | 1.000.000 € | “Esistono forze più grandi di quanto avresti mai potuto immaginare” |

Un vecchio salvataggio che possiede già uno dei due potenziamenti lo considera
automaticamente scoperto. I due prezzi non ricevono maggiorazioni di rete.

### 10.10 Costi e progressione

Tutti i potenziamenti vengono acquistati esclusivamente in Euro e non sono
rimborsabili. I costi sono elenchi espliciti per livello: non dipendono più da
una formula generale implicita. Oltre agli Euro, un nodo può richiedere livelli
precedenti, lo sblocco di Social o Gadget, un prodotto Gadget o almeno una
scuola nella rete.

### 10.11 Sblocco progressivo

L'interfaccia non mostra tutti i sistemi dall'inizio. Una prima sequenza
consigliata è:

| Traguardo                      | Sblocco diegetico                             |
| ------------------------------ | --------------------------------------------- |
| Avvio                          | sola composizione della mail e primi contatti |
| Prima email                    | Posta inviata e statistiche minime            |
| 3 email                        | comunicazione “Configurazione campagna”       |
| Comunicazione completata       | Potenziamenti di Scrittura e Creatività       |
| Primo esaurimento contatti     | Calendario, eventi e volantinaggio gratuito   |
| Prima prova prenotata          | report aggregato del funnel                   |
| Primo iscritto                 | Euro e quote associative                      |
| Primo Ultra Raro collaboratore | Iscritti, Collaboratori e assegnazioni        |
| 35 iscritti attivi             | Redazione si evolve in Social                 |
| 20 iscritti                    | Attrezzatura e usura narrativa                |
| 50 iscritti                    | Forme dei collaboratori                       |
| 150 iscritti                   | procedura per fondare una nuova scuola        |

Le soglie sono configurabili e andranno calibrate per raggiungere il primo
prestigio dopo circa 3–4 ore.

### 10.12 Comunicazioni di sistema

Alcuni traguardi aprono una breve **comunicazione di sistema**, equivalente ai
file di sistema del gioco di riferimento. Esempi:

- Configurazione modelli di invito;
- Attivazione calendario condiviso;
- Registro quote associative;
- Procedura manutenzione attrezzatura;
- Configurazione account social;
- Richiesta apertura nuova scuola.

Queste comunicazioni:

- vengono completate con la stessa meccanica di tastiera;
- devono essere scritte manualmente e ignorano l'automazione;
- sono brevi e rare;
- sbloccano un'intera funzione al completamento;
- impediscono che il progresso idle faccia saltare l'introduzione di una nuova
  meccanica.

---

## 11. Interfaccia Outlook per Windows 11

### 11.1 Obiettivo di camuffamento

Il gioco deve raggiungere un camuffamento percepito del 99%:

- alla prima occhiata sembra una normale finestra di Outlook;
- non mostra barre di risorse, monete, gemme o pulsanti da videogioco;
- usa il linguaggio dell'email e dell'organizzazione;
- mantiene colori, spaziatura e gerarchia visiva plausibili;
- tutta l'interazione ludica avviene dentro elementi credibili di Outlook.

Il progetto imita l'esperienza visiva, ma deve evitare di presentarsi come
prodotto ufficiale Microsoft. Per una distribuzione pubblica è preferibile usare
icone ricreate o generiche e inserire una nota di non affiliazione nelle
informazioni del progetto.

### 11.2 Struttura dello schermo

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Barra titolo / Ricerca / Controlli finestra                                │
├────┬────────────────┬─────────────────────────┬─────────────────────────────┤
│App │ Cartelle       │ Elenco messaggi         │ Lettura / Composizione      │
│rail│                │                         │                             │
│    │ Posta in arrivo│ Oggetto                 │ A: nome@email.test          │
│    │ Bozze          │ Mittente                │ Oggetto: ...                │
│    │ Inviata        │ Data                    │                             │
│    │ Contatti       │                         │ Corpo della mail            │
│    │                │                         │                             │
├────┴────────────────┴─────────────────────────┴─────────────────────────────┤
│ Stato sincronizzazione / digitazione / elementi                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.3 Mappatura tra Outlook e gioco

| Elemento apparente      | Funzione ludica                                     |
| ----------------------- | --------------------------------------------------- |
| Posta in arrivo         | comunicazioni interne, tutorial, notifiche e storia |
| Bozze                   | email in coda o interrotte                          |
| Posta inviata           | storico delle campagne                              |
| Posta indesiderata      | eventi comici, anomalie e messaggi narrativi        |
| Archivio                | statistiche delle vecchie scuole                    |
| Calendario              | eventi e lezioni di prova                           |
| Iscritti                | iscritti e collaboratori                            |
| Attività / To Do        | manutenzione, social e progetti                     |
| Impostazioni            | opzioni reali, export e reset salvataggio           |
| Ricerca                 | filtri e statistiche avanzate                       |
| Cartelle personalizzate | rami di potenziamento                               |
| Conteggi non letti      | risorse disponibili e notifiche                     |

### 11.4 Presentazione dei valori

I numeri del gioco vengono nascosti in elementi plausibili:

- Contatti disponibili: conteggio accanto alla cartella Contatti;
- Esiti in attesa: conteggio accanto a Posta inviata o Calendario;
- Euro disponibili: saldo in un report amministrativo o nella cartella Quote;
- Iscritti: gruppo contatti “Iscritti attivi”;
- Collaboratori: gruppo contatti “Collaboratori delle Onde”;
- Caratteri al secondo: stato “Sincronizzazione” nella barra inferiore;
- Conversione: pannello “Statistiche campagna”;
- Spade disponibili: calendario risorse o elenco Attività;
- Prestigio: email formale ricevuta dalla rete LudoSport.

### 11.5 Animazioni

- nessuna particella;
- nessun tremolio o flash da gioco;
- cursore e selezione simili a un editor reale;
- transizioni tra pannelli da 120–200 ms;
- indicatori di sincronizzazione discreti;
- notifiche in stile Windows 11, senza audio;
- eventuali accenti acquatici dell'Ordine delle Onde limitati a dettagli quasi
  invisibili.

### 11.6 Risoluzioni target

- primaria: 1920×1080;
- secondaria: 1366×768;
- minima supportata: 1280×720;
- nessuna interfaccia mobile nella prima versione.

---

## 12. Navigazione e schermate

### 12.1 Posta

È la schermata predefinita e contiene il loop di scrittura.

Azioni:

- scrivere la mail;
- consultare prenotazioni, iscrizioni e notifiche interne;
- leggere tutorial diegetici;
- controllare campagne;
- aprire comunicazioni di sblocco.

### 12.2 Calendario

Mostra:

- eventi programmati;
- lezioni di prova;
- attività ricorrenti dei collaboratori;
- disponibilità di persone e spade;
- previsioni non garantite sui risultati.

Creare un evento usa un modulo simile a un vero appuntamento Outlook.

### 12.3 Iscritti

Due viste:

- Iscritti;
- Collaboratori.

La scheda di un collaboratore presenta statistiche e Forme come informazioni di
profilo e formazione.

### 12.4 Attività

Gestisce:

- manutenzione spade;
- preparazione eventi;
- campagne social;
- potenziamenti;
- progetti della scuola.

I costi appaiono come “Persone richieste” o “Collaboratori coinvolti”.

### 12.5 Statistiche

Presentate come report di campagna:

- persone incontrate;
- contatti ottenuti;
- email inviate;
- tempo medio di scrittura;
- prove prenotate;
- prove completate;
- iscritti;
- conversione per fonte;
- conversione aggregata delle email;
- rendimento collaboratori;
- andamento nel tempo.

---

## 13. Tutorial narrativo e interattivo

Il tutorial combina le email ricevute con scene di dialogo attivate da
condizioni di gioco. Le email restano parte del mondo narrativo; le scene
servono a fermare il ritmo, spiegare il passaggio appena raggiunto e guidare
l'azione successiva.

Ogni scena è composta da due tipi di passaggio:

- **dialogo**: mostra testi lineari senza scelte, mette in pausa il tempo di
  gioco e permette soltanto di continuare o usare **Salta** nell'angolo della
  pagina;
- **obiettivo guidato**: lascia interattive solo le aree necessarie e avanza
  automaticamente quando rileva l'azione richiesta. Ogni scena dichiara se il
  tempo debba restare fermo oppure ripartire durante l'obiettivo.

Ogni passaggio dichiara quali aree dell'interfaccia restano a fuoco, quali
vengono oscurate e sfocate e quali possono essere nascoste. Il completamento o
il salto di una scena viene salvato, così la stessa scena non si ripete dopo il
caricamento. Quando un obiettivo richiede di agire su un controllo preciso, quel
controllo deve essere evidenziato direttamente con contrasto e pulsazione:
mantenere visibile la sola sezione che lo contiene non è considerato
sufficiente. Gli obiettivi di attesa evidenziano invece la scheda o il pannello
nel quale osservare l'avanzamento.

### Sequenza iniziale

1. **Benvenuto nell'Ordine delle Onde**\
   Introduce il contesto e assegna i primi 5 contatti fittizi.

2. **Prima campagna inviti**\
   Chiede di scrivere premendo qualunque tasto mentre il tempo resta fermo. La
   scena termina quando la bozza passa a “Invio in corso...”; a quel punto il
   tempo riparte e inizia la missione di tre email ulteriori. Gli Eventi si
   sbloccano soltanto al completamento di questa missione.

3. **Configurazione campagna**\
   È la prima comunicazione di sistema manuale e sblocca Scrittura e Creatività.

4. **Primi Eventi e attrezzatura**\
   Dopo la missione dei tre inviti guida il giocatore ad aprire Eventi, spiega
   che le attività possono usurare o danneggiare le spade e richiede di avviare
   il **Volantinaggio** gratuito. Soltanto in questo passaggio il volantinaggio
   dura 5 secondi e garantisce esattamente un nuovo contatto. La scena attende
   la fine dell'evento e mette in evidenza il contatore **Contatti** nella barra
   superiore mentre spiega l'aumento.

5. **Nuova lezione prenotata** Dopo la spiegazione sull'aumento dei contatti,
   **Continua** riporta automaticamente il giocatore in **Posta**. Una delle
   email della campagna iniziale garantisce una prova soltanto in questo
   momento; quando la prova compare in **La mia giornata** con il conto alla
   rovescia, un dialogo introduce il passaggio email → prova in palestra →
   possibile iscrizione. Il pannello resta leggibile sotto il velo del tutorial,
   mentre l'intera riga della prova viene portata in primo piano ed evidenziata.
   La prima sequenza di tutorial termina premendo **Continua** in questo
   dialogo.

6. **Primo bonus e quota associativa** Introduce il bonus immediato di €20, la
   quota mensile base di €40, il bonus di €5 per ogni Forma o corso permanente e
   il finanziamento dei potenziamenti.

7. **Il primo Leggendario** Quando Andrea Simonazzi diventa il nono contatto e
   la sua email entra in scrittura, il gioco torna in **Posta**, mette in
   evidenza la zona superiore della mail con il destinatario e spiega le quattro
   rarità. Da questo momento possono apparire contatti Rari, Ultra Rari e
   Leggendari. Il dialogo ricorda che i Leggendari sono profili unici e si
   chiude con **“Collezionali tutti!”**.

8. **Una mano in più** Il primo Ultra Raro che completa il Corso Y introduce
   l'automazione.

9. **Le spade non si sistemano da sole** Introduce attrezzatura e manutenzione.
   Più avanti si scopre che, tecnicamente, con abbastanza collaboratori si
   sistemano quasi da sole.

10. **Il Laboratorio Gadget** Alla prima vittoria della scuola nell'Accademico
    Arena, una scena in pausa annuncia lo sblocco e guida il giocatore ad aprire
    **Gadget**. Il riepilogo spiega pubblico raggiungibile, produttività e ruolo
    dei Collaboratori; il catalogo introduce acquisto del progetto, sviluppo,
    prova qualità, vendita automatica, rarità aggiuntive e sblocco del prodotto
    successivo dopo 100 vendite complessive della famiglia. Il tutorial non
    obbliga a spendere fondi o assegnare subito un Collaboratore.

L'evidenziazione deve restare coerente con l'interfaccia ispirata a Windows:
niente frecce luminose o decorazioni estranee, ma contorni di focus, oscuramento
e sfocatura controllata delle aree non necessarie.

---

## 14. Contenuti email

### 14.1 Archivio previsto

La prima versione completa contiene almeno 100 modelli unici, divisi in cinque
fasi da 20:

| Fase | Tono                        |
| ---- | --------------------------- |
| 1    | realistico e professionale  |
| 2    | caloroso e personale        |
| 3    | creativo e pubblicitario    |
| 4    | audace e comico             |
| 5    | surreale ma ancora efficace |

### 14.2 Struttura del modello

Ogni modello contiene:

- identificativo;
- fase minima;
- categoria;
- oggetto;
- corpo;
- intervallo di lunghezza;
- bonus o penalità impliciti;
- tag del destinatario;
- peso di selezione;
- variabili inseribili.

Variabili previste:

```text
{{nome}}
{{cognome}}
{{nomeCompleto}}
{{fonteContatto}}
{{nomeEvento}}
{{dataEvento}}
{{nomeScuola}}
{{città}}
{{nomeCollaboratore}}
```

### 14.3 Esempio provvisorio realistico

**Oggetto:** Ti va di provare LudoSport a Genova?

> Ciao {{nome}},\
> ci siamo conosciuti durante {{nomeEvento}} e mi ha fatto piacere raccontarti
> qualcosa di LudoSport. L'Ordine delle Onde organizza lezioni di prova a Genova
> per chi vuole scoprire una disciplina sportiva originale, dinamica e
> accessibile anche a chi parte da zero.
>
> Se ti va di partecipare, rispondi pure a questa mail: ti invieremo tutte le
> informazioni sulla prossima prova.
>
> A presto,\
> {{nomeScuola}}

Questo testo è un segnaposto. L'email di esempio fornita dal committente
definirà tono, informazioni obbligatorie, firma e call to action della prima
fascia di contenuti.

### 14.4 Regole editoriali

- non promettere benefici falsi;
- mantenere sempre comprensibile l'invito;
- non usare dati personali reali;
- non citare direttamente Star Wars;
- sono ammessi riferimenti indiretti come “quel film famoso”;
- la battuta sul “grande topo e i suoi avvocati” deve essere rara, non un
  tormentone continuo;
- non ridicolizzare LudoSport o i potenziali partecipanti;
- differenziare davvero i 100 testi, evitando semplici sostituzioni di sinonimi;
- ogni mail deve avere una call to action riconoscibile.

### 14.5 Comunicazioni generate

Servono almeno:

- 20 notifiche di prenotazione, iscrizione e pagamento;
- 20 comunicazioni interne;
- 20 eventi narrativi positivi o negativi;
- 20 messaggi comici;
- 10 comunicazioni di sistema che sbloccano funzioni;
- 10 riepiloghi e report diegetici.

---

## 15. Generazione dei destinatari

### 15.1 Dati inventati

Tutti i destinatari vengono generati localmente. Non si utilizzano indirizzi
reali.

Formato consigliato:

```text
nome.cognome@example.test
iniziale.cognome@example.test
nickname@example.test
```

Il dominio `.test` è riservato a scopi di test e rende evidente a livello
tecnico che gli indirizzi non sono reali.

### 15.2 Generatore

Il generatore combina:

- liste italiane di nomi;
- liste italiane di cognomi;
- occasionali nickname plausibili;
- fonte del contatto;
- fascia di interesse;
- qualità;
- data di acquisizione.

I nomi reali pubblicati sui portali LudoSport non vengono usati automaticamente
come personaggi. Potranno essere aggiunti in seguito solo con approvazione
esplicita.

---

## 16. Eventi casuali

Gli eventi casuali arrivano come email o modifiche al Calendario. Nella prima
versione il loro esito è automatico; in seguito potranno offrire scelte. Possono
aumentare o diminuire iscritti, Euro, contatti, collaboratori e stato
dell'attrezzatura.

### Positivi

- un post ottiene più attenzione del previsto;
- un collaboratore porta amici a una prova;
- un gruppo di amici si iscrive grazie al passaparola;
- una spada torna disponibile prima del previsto;
- una dimostrazione viene spostata in una posizione migliore;
- una vecchia email riceve finalmente risposta.

### Negativi leggeri

- pioggia durante un evento;
- sovrapposizione nel Calendario;
- una parte dell'attrezzatura richiede manutenzione;
- un litigio provoca uno o più abbandoni;
- il pubblico dell'evento era interessato soprattutto al buffet;
- un destinatario risponde alla persona sbagliata;

### Assurdi avanzati

- richiesta di una dimostrazione in una sala riunioni troppo piccola;
- dibattito di 37 email sull'esatta dicitura di un volantino;
- il “famoso grande topo” sembra aver visualizzato il profilo social;
- un contatto chiede se la spada è inclusa nell'abbonamento della palestra;
- un evento genera più collaboratori che partecipanti.

Gli eventi negativi non devono cancellare grandi quantità di progresso. Devono
creare variazione, non frustrazione. Una protezione impedisce lunghe serie di
eventi negativi consecutivi.

---

## 17. Prestigio e fondazione di nuove scuole

### 17.1 Primo ciclo

Ogni nuova partita inizia presso **LudoSport Genova – Ordine delle Onde**.

Il primo ciclo racconta la crescita del giocatore da collaboratore operativo a
persona capace di coordinare una scuola e deve durare indicativamente **3–4 ore
di gioco**.

### 17.2 Sblocco

L'offerta di fondare una nuova scuola arriva tramite una comunicazione di
sistema manuale quando sono soddisfatti requisiti come:

- soglia di Iscritti totali;
- numero minimo di collaboratori;
- almeno un certo numero di eventi completati;
- livello minimo di organizzazione;
- disponibilità di attrezzatura;
- reputazione sufficiente.

Soglia del primo ciclo: 150 iscritti, 8 collaboratori, 25 eventi completati e
almeno una vittoria alla Champion's Arena.

Il prestigio è una scelta volontaria. A differenza del gioco di riferimento, il
primo prestigio deve concedere immediatamente un bonus permanente chiaramente
percepibile; non deve richiedere più reset prima di diventare utile.

### 17.3 Creazione della scuola

Il giocatore sceglie:

- nome dell'Ordine;
- città da una lista o campo libero controllato;
- colore di accento discreto;
- motto facoltativo;
- specializzazione iniziale.

Il modulo appare come una procedura amministrativa ricevuta via email.

### 17.4 Cosa si azzera

- contatti locali;
- email in coda;
- potenziamenti operativi locali;
- eventi programmati;
- parte dell'attrezzatura e degli Euro locali;
- collaboratori che rimangono assegnati alla scuola precedente.

Gli iscritti della scuola precedente non vengono conservati come schede
individuali. La scuola fondata registra soltanto il numero di membri al
trasferimento; Fama e statistiche cumulative restano disponibili senza creare
uno storico nominativo.

### 17.5 Cosa rimane

- Fama della scuola;
- scuole fondate;
- Reputazione di rete;
- archivio delle email e statistiche storiche;
- bonus permanenti;
- modelli email sbloccati;
- traguardi;
- un collaboratore mentore selezionato, se sbloccato.

Bonus iniziale consigliato per la prima fondazione: almeno **+25%** alla
velocità complessiva del nuovo ciclo oppure un vantaggio equivalente distribuito
tra Carisma, Scrittura ed entrate. Il valore è provvisorio, ma l'effetto deve
essere immediato.

### 17.6 Progressione infinita

Ogni scuola fondata aumenta:

- costi;
- obiettivi;
- pubblico raggiungibile;
- numero di attività simultanee;
- complessità organizzativa;
- moltiplicatori permanenti.

La rete delle scuole precedenti produce un piccolo contributo passivo e appare
nell'Archivio come struttura organizzativa, non come mappa fantasy.

---

## 18. Progresso offline

### 18.1 Regole

Quando il gioco viene chiuso o messo in pausa, il calendario e tutte le attività
temporizzate restano fermi. Non vengono prodotti caratteri, contenuti Social,
Follower, contatti, rette o sponsorizzazioni e non viene creato alcun riepilogo
offline. Alla ripresa tutte le scadenze vengono spostate in avanti della durata
dell'interruzione, conservando il tempo residuo.

### 18.2 Limiti

- nessun limite offline, perché non esiste produzione durante la chiusura;
- nessuna produzione di email o Social;
- nessun evento parte o termina;
- nessuna scadenza mensile viene riscossa;
- gli esiti casuali vengono determinati con un seed salvato.

### 18.3 Riepilogo

Non viene mostrato alcun riepilogo offline, perché lo stato operativo non
cambia.

---

## 19. Settore Gadget

### 19.1 Sblocco e catalogo base

Il settore **Gadget** si sblocca quando un atleta della scuola vince per la
prima volta la disciplina Arena del Torneo Accademico Alpha. Lo sblocco apre la
vista Gadget, il relativo incarico dei Collaboratori, il ramo di potenziamenti e
il progetto Polsino. Il progetto deve comunque essere acquistato. Una scena
tutorial salvata e non ripetibile presenta il settore, mantiene il tempo in pausa
e richiede soltanto di aprire la nuova vista prima di illustrare riepilogo e
catalogo.

Il catalogo base segue questo ordine:

| Prodotto  | Costo progetto | Guadagno per pezzo al 100% | Lavoro base con P = 1 | Revisione |
| --------- | --------------: | --------------------------: | ---------------------: | --------: |
| Polsino   |        10.000 € |                        20 € |             60 minuti |   1.000 € |
| Tazza     |        15.000 € |                        30 € |             90 minuti |   1.500 € |
| Mutande   |        20.000 € |                        40 € |            120 minuti |   2.000 € |
| Maglietta |        25.000 € |                        50 € |            150 minuti |   2.500 € |
| Felpa     |        40.000 € |                        80 € |            240 minuti |   4.000 € |

Ogni progetto successivo si sblocca automaticamente dopo 100 vendite della
famiglia precedente, sommando le unità di tutte le sue rarità. Lo sblocco non
ha un costo aggiuntivo, ma
il nuovo progetto deve essere pagato e sviluppato. Spillette, Coppe, Premio
Cu.Li. e Premio Piedozzi appartengono alla futura estensione degli Open e non
fanno parte del catalogo base.

### 19.2 Progettazione, revisione e Collaboratori

Il laboratorio possiede un solo slot. Il costo viene scalato quando parte un
progetto o una revisione, senza annullamento e senza rimborso. La produttività
del settore è:

```text
P = somma della produttività dei Collaboratori assegnati a Gadget
```

Le rarità, la Maestria dell'incarico e i bonus globali di Forma 6 e Forma 7
concorrono a `P`. I bonus specifici dei rami d'arma non modificano Gadget. Un
Collaboratore assegnato guadagna 1 XP di Maestria Gadget al secondo, come negli
altri incarichi.

Il tempo effettivo di progettazione è `lavoroBase / P`; una revisione Comune
richiede un terzo del lavoro iniziale. Costo e lavoro di revisione crescono in
modo additivo del 25% per ogni livello di rarità: Comune ×1, Raro ×1,25, Ultra
Raro ×1,50, Leggendario ×1,75 e Leggendario Segreto ×2. I relativi
potenziamenti moltiplicano la velocità.
Con `P = 0` l'avanzamento si ferma senza perdere il lavoro già completato. Le
vendite dei prodotti accettati continuano mentre il laboratorio sviluppa o
revisiona un altro prodotto.

Il primo tentativo di qualità è compreso nel progetto. Ogni nuovo tentativo
richiede prima una revisione pari al 10% del costo del progetto, moltiplicato
per la rarità attuale. Il prodotto continua a essere venduto alla qualità
precedente durante la revisione. La qualità memorizzata è sempre il massimo
storico della singola rarità: un risultato peggiore non può ridurla. Al 100%
le revisioni restano disponibili quando esiste una rarità successiva
ottenibile; vengono disabilitate al 100% del Leggendario Segreto.

Ogni prodotto possiede cinque varianti, nello stesso ordine delle rarità del
gioco: Comune, Raro, Ultra Raro, Leggendario e Leggendario Segreto. Il primo
prototipo nasce Comune. Ogni rarità sbloccata resta un oggetto vendibile
indipendente e continua a generare vendite anche dopo l'arrivo dei livelli
superiori.

### 19.3 Pubblico, vendite e guadagni

Il pubblico totale raggiungibile è:

```text
pubblico = floor(iscrittiAttivi × coperturaIscritti
  + follower × coperturaFollower)
```

La copertura iniziale è il 10% degli iscritti e lo 0% dei follower. Ogni
persona del pubblico alimenta una vendita ordinaria per ciascuna variante di
rarità sbloccata, quindi la domanda ordinaria residua è calcolata separatamente
come `max(0, pubblico - pezziVendutiDellaVariante)`. Non esiste rigenerazione
della domanda ordinaria: se il pubblico scende sotto le vendite storiche, la
variante passa alle sole vendite marginali finché il pubblico non cresce di
nuovo.

Indicando con `V` la precedente capacità commerciale condivisa dal catalogo,
la nuova capacità ordinaria `N` e quella marginale sono:

```text
V = 5 × P × (1 + bonusGestioneOrdini)
N = V / 5
tentativiMarginaliAlMese = N / 10
```

I tentativi ordinari vengono distribuiti proporzionalmente alla domanda
residua di tutte le varianti accettate e vendibili, usando un'unica capacità
condivisa dal catalogo. In parallelo, la capacità marginale viene distribuita
in parti uguali fra le varianti che hanno già raggiunto il proprio pubblico:
non ha un tetto di domanda e produce quindi vendite
occasionali anche oltre la soglia. La capacità ordinaria che non trova domanda
viene persa; le sole frazioni di vendita già maturate restano memorizzate fino
a formare un pezzo intero. La conversione base dipende dalla qualità e viene
interpolata linearmente tra questi punti:

| Qualità | Conversione base |
| ------: | ---------------: |
|      0% |               0% |
|     25% |              50% |
|     50% |              75% |
|     75% |              90% |
|    100% |             100% |

La Formazione commerciale aggiunge fino a 10 punti percentuali, con limite
finale del 100%; un prodotto allo 0% resta comunque non vendibile. La Vendita
abbinata genera in modo deterministico fino al 25% di pezzi aggiuntivi fra gli
altri prodotti accettati, sempre entro la loro domanda ordinaria residua: non
può aggirare la velocità marginale.

Il guadagno netto per pezzo è:

```text
guadagnoPezzo = costoProgetto / 500 × qualità / 100 × moltiplicatoreRarità
```

Il moltiplicatore è ×1 per Comune, ×1,25 per Raro, ×1,50 per Ultra Raro,
×1,75 per Leggendario e ×2 per Leggendario Segreto. Di conseguenza 500 vendite
Comuni al 100% eguagliano il costo originario del progetto.
I guadagni vengono accreditati continuamente e le vendite passate non vengono
rivalutate quando la qualità aumenta. Nell'interfaccia ogni famiglia usa una
sola card: mostra la foto della rarità più alta e una riga per ogni rarità
sbloccata con qualità, pezzi venduti e guadagno cumulativo. Indicatore e barra
di qualità usano il colore della rarità. Margini, domanda residua, probabilità
di passaggio, recupero dell'investimento e proiezioni restano interni.

### 19.4 Prova qualità

La prova qualità è un minigioco silenzioso a quattro corsie, comune ai cinque
prodotti finché non verranno definite difficoltà specifiche:

- 3 secondi di conto alla rovescia, 20 secondi di prova e 24 note senza note
  simultanee;
- corsie desktop: `←/A`, `↓/S`, `↑/W`, `→/D`;
- input tramite tastiera, click sulla nota oppure pulsanti fissi e ampi per il
  touch;
- Perfect entro ±100 ms vale 100 punti, Good entro ±200 ms vale 70, Almost
  entro ±320 ms vale 40, Miss vale 0;
- ogni input errato o su una corsia vuota sottrae un punto qualità; le
  ripetizioni automatiche della tastiera sono ignorate;
- il risultato è la media dei punti delle 24 note meno gli errori, arrotondata
  e limitata fra 0 e 100.

Durante la prova il resto del gioco è in pausa. Perdita del focus, cambio di
scheda e cambio di orientamento mettono in pausa anche il minigioco. Il seed e
il tentativo pendente sono salvati, così un reload non genera una nuova
sequenza. Abbandonare assegna 0 al tentativo, senza rimborso e senza ridurre la
qualità massima già ottenuta; l'eventuale occasione di rarità viene consumata.
Il primo risultato permette di accettare il
prodotto o revisionarlo; un prodotto accettato resta in vendita per sempre. È
possibile accettare qualità 0%, ma il prodotto non vende finché non migliora.

All'avvio pagato di ogni revisione viene effettuata e salvata un'estrazione
casuale nascosta usando soltanto vendite e qualità già accumulate dalla rarità
attuale:

```text
probabilitàPassaggio = min(100%, floor(venduti / 10) × 1%
  + floor(qualità / 10) × 2,5%)
```

Se l'estrazione riesce, la prova usa lo sfondo della rarità raggiungibile e
mostra l'etichetta testuale `Occasione: <rarità>`, senza mostrare la
percentuale. In assenza di occasione lo sfondo usa la rarità attuale. Un
risultato strettamente superiore al 50% sblocca la nuova variante: la rarità
precedente sale automaticamente al 100%, mentre quella nuova nasce con la
qualità appena ottenuta ed entra subito in vendita se la famiglia è già in
catalogo. Con 50% o meno la nuova rarità non viene sbloccata e un'altra
revisione effettua una nuova estrazione.

Il Leggendario Segreto applica la stessa estrazione soltanto dopo il
superamento di requisiti specifici per prodotto. Tali requisiti sono ancora
`TBD`; fino alla loro definizione il livello resta presente nei salvataggi e
nel modello di gioco, ma non è ottenibile.

### 19.5 Potenziamenti Gadget

| Potenziamento              | Effetto massimo                                      | Costi per livello                                      | Requisito |
| -------------------------- | ---------------------------------------------------- | ------------------------------------------------------ | --------- |
| Vetrina della scuola       | iscritti 10% → 20% → 35% → 50% → 75% → 100%         | 2.500 / 5.000 / 10.000 / 25.000 / 50.000 €             | Gadget |
| Negozio online             | follower 0% → 1% → 3% → 5% → 10% → 20% → 35% → 50% → 75% → 100% | 5.000 / 10.000 / 25.000 / 50.000 / 100.000 / 200.000 / 400.000 / 800.000 / 1.600.000 € | Vetrina 2 e Social |
| Strumenti di progettazione | +100% velocità sviluppo                              | 5.000 / 10.000 / 20.000 / 40.000 / 80.000 €            | Gadget |
| Laboratorio revisioni      | +100% velocità revisione                             | 5.000 / 10.000 / 20.000 / 40.000 / 80.000 €            | Strumenti 2 |
| Gestione degli ordini      | +100% capacità commerciale                           | 10.000 / 20.000 / 40.000 / 80.000 / 160.000 €          | Gadget |
| Formazione commerciale     | +10 punti percentuali di conversione                 | 15.000 / 30.000 / 60.000 / 120.000 / 240.000 €         | Ordini 2 |
| Vendita abbinata           | +25% vendite aggiuntive                              | 25.000 / 50.000 / 100.000 / 200.000 / 400.000 €        | Formazione 3 e Tazza sbloccata |

Il ramo costa complessivamente 5.142.500 €. È visibile nella schermata Upgrade
soltanto dopo lo sblocco del settore.

---

## 20. Bilanciamento iniziale

### 20.1 Obiettivi temporali

| Traguardo                  |           Tempo desiderato |
| -------------------------- | -------------------------: |
| Prima mail                 |           meno di 1 minuto |
| Prima prova prenotata      |                 1–3 minuti |
| Primo iscritto             |                 3–8 minuti |
| Primo potenziamento        |                5–10 minuti |
| Primo esaurimento contatti |               10–20 minuti |
| Primo evento               |            entro 20 minuti |
| Primo collaboratore        |               20–40 minuti |
| Automazione percepibile    |               30–60 minuti |
| Primo prestigio            | 3–4 ore attive distribuite |

### 20.2 Avvio consigliato

- 5 contatti disponibili;
- 1 carattere per input;
- 0 collaboratori;
- 6 spade disponibili;
- prenotazione e iscrizione dipendono dalla rarità secondo la tabella dei
  Contatti;
- bonus immediato per ogni nuova iscrizione: €20;
- quota ricorrente: €40 base per iscritto attivo, più €5 per ogni Forma o corso
  permanente registrato sul singolo allievo, a ogni mese di gioco; il Corso
  Agonisti è escluso;
- durata di un mese di gioco: 60 secondi, ciclo Gennaio–Dicembre e anno
  scolastico Settembre–Agosto sempre visibile;
- il primo iscritto può essere assistito dal tutorial per evitare sfortuna
  estrema;
- il primo Ultra Raro deve comparire abbastanza presto da introdurre
  l'automazione senza spezzare il ritmo;
- il primo volantinaggio è gratuito e guidato.

### 20.3 Protezione dalla sfortuna

- dopo una serie di funnel senza iscritti, aumenta temporaneamente la
  probabilità del passaggio più debole;
- il bonus non viene mostrato esplicitamente;
- viene azzerato alla prima conversione;
- gli eventi tutorial hanno un risultato minimo garantito;
- il giocatore non può rimanere senza contatti e senza alcun modo gratuito di
  ottenerne altri.

---

## 21. Salvataggio locale

### 21.1 Strategia

- `localStorage` per la prima versione;
- salvataggio automatico ogni 10 secondi;
- salvataggio dopo invio email, acquisto, assegnazione, evento e prestigio;
- schema versionato;
- backup precedente mantenuto per recupero;
- export/import JSON nelle Impostazioni;
- reset completo con doppia conferma.

### 21.2 Stato minimo

```ts
interface GameState {
  version: number;
  createdAt: number;
  lastSavedAt: number;
  school: SchoolState;
  network: NetworkState;
  player: PlayerState;
  contacts: Contact[];
  messages: Message[];
  pendingEmailOutcomes: PendingEmailOutcome[];
  scheduledTrials: ScheduledTrial[];
  collaborators: Collaborator[];
  legendaryPity: number;
  equipment: EquipmentItem[];
  gadgets: GadgetState;
  calendar: CalendarEvent[];
  upgrades: UpgradeState[];
  statistics: StatisticsState;
  settings: SettingsState;
  randomSeed: string;
}
```

### 21.3 Sicurezza e privacy

- nessuna connessione a Outlook;
- nessun invio di email reali;
- nessun accesso alla rubrica;
- nessun testo digitato dall'utente viene memorizzato;
- nessun indirizzo email reale viene generato;
- nessun backend nella prima versione;
- tutto il progresso rimane nel browser dell'utente.

---

## 22. Architettura tecnica proposta

### 22.1 Stack

- Vite;
- React;
- TypeScript;
- CSS Modules o CSS organizzato per componenti;
- stato applicativo tramite store leggero o reducer centralizzato;
- Vitest per test unitari;
- Playwright per flussi end-to-end;
- ESLint e Prettier.

Non serve un backend per la prima versione.

### 22.2 Moduli

```text
src/
  app/
    App.tsx
    routes.ts
  game/
    engine.ts
    actions.ts
    selectors.ts
    formulas.ts
    offline.ts
    random.ts
    save.ts
    migrations.ts
  features/
    mail/
    calendar/
    contacts/
    collaborators/
    equipment/
    upgrades/
    prestige/
    statistics/
    tutorial/
  content/
    emailTemplates.ts
    notificationTemplates.ts
    names.ts
    events.ts
    upgrades.ts
  components/
    outlook-shell/
    common/
  styles/
    tokens.css
    global.css
```

### 22.3 Motore di gioco

- tick visivo: `requestAnimationFrame`;
- tick economico: 4 volte al secondo;
- formule pure e testabili;
- azioni timestampate;
- casualità con seed persistente;
- esito `prenotazione / contatto perso` determinato all'invio;
- esito `iscrizione / prova non convertita` determinato alla risoluzione della
  lezione;
- contenuti e bilanciamento separati dal codice;
- nessuna formula dipendente dal frame rate.

### 22.4 Accessibilità e tastiera

Anche se il gioco usa tutta la tastiera:

- Tab deve continuare a navigare l'interfaccia;
- Escape deve chiudere finestre e menu;
- scorciatoie del browser non devono essere intercettate;
- il focus del corpo della mail deve essere evidente ma discreto;
- contrasto e dimensioni devono restare leggibili;
- deve esistere un'opzione per ridurre le animazioni;
- il gioco deve distinguere input di scrittura e navigazione.

---

## 23. Modello dati essenziale

### Contatto

```ts
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  source: "event" | "sparring" | "social" | "collaborator" | "tutorial";
  acquiredAt: number;
  status:
    | "available"
    | "writing"
    | "invited"
    | "trialScheduled"
    | "enrolled"
    | "lost";
  tags: string[];
}
```

### Email

```ts
interface CampaignEmail {
  id: string;
  contactId: string;
  templateId: string;
  subject: string;
  body: string;
  revealedCharacters: number;
  createdAt: number;
  sentAt?: number;
  status: "draft" | "writing" | "sent" | "trialBooked" | "lost";
}
```

### Collaboratore

```ts
interface Collaborator {
  id: string;
  displayName: string;
  joinedAt: number;
  forms: FormQualification[];
  assignment: CollaboratorAssignment | null;
}
```

### Evento

```ts
interface GameEvent {
  id: string;
  definitionId: string;
  title: string;
  startsAt: number;
  endsAt: number;
  assignedCollaboratorIds: string[];
  assignedEquipmentIds: string[];
  status: "planned" | "running" | "completed";
  resolvedOutcome?: EventOutcome;
}
```

### Esiti del funnel

```ts
interface PendingEmailOutcome {
  id: string;
  emailId: string;
  contactId: string;
  resolvesAt: number;
  result: "trialBooked" | "lost";
}

interface ScheduledTrial {
  id: string;
  contactId: string;
  startsAt: number;
  resolvesAt: number;
  resultSeed: string;
  status: "scheduled" | "completed";
}
```

---

## 24. Audio e feedback

- audio completamente assente;
- nessun effetto sonoro al click, alla scrittura o alla conversione;
- feedback solo visivo;
- nessuna richiesta di autorizzazione audio;
- nessun avvio automatico di media;
- eventuale audio futuro deve essere opzionale e disattivato per impostazione
  predefinita.

---

## 25. Traguardi

I traguardi appaiono come email amministrative o riconoscimenti interni.

Esempi:

- Prima email inviata;
- Primo iscritto;
- Dieci inviti senza una prenotazione, ma senza perdere l'ottimismo;
- Primo evento completato;
- Cento contatti raccolti;
- Prima spada rimessa in ordine;
- Primo collaboratore;
- Prima Forma sbloccata da un collaboratore;
- Mille email inviate;
- Prima nuova scuola fondata;
- “Nessun riferimento legalmente riconoscibile”;
- Rete di dieci scuole.

I traguardi possono dare piccoli bonus permanenti, ma non devono diventare il
sistema economico principale.

---

## 26. Roadmap di produzione

### Fase 1 — Prototipo del loop principale

- shell base simile a Outlook;
- composizione email;
- input da tastiera e click;
- testi prestabiliti;
- invio automatico;
- esito ritardato delle email;
- prenotazioni e lezioni in palestra semplificate;
- contatti limitati;
- primi iscritti;
- prime quote in Euro;
- primo sblocco tramite comunicazione di sistema;
- salvataggio locale.

**Criterio di completamento:** il giocatore può scrivere, inviare e convertire
email per almeno 15 minuti senza errori bloccanti.

### Fase 2 — Calendario ed eventi

- calendario navigabile;
- prove dimostrative agli eventi;
- lezioni di prova in palestra;
- eventi;
- Carisma;
- persone incontrate e contatti;
- attrezzatura di base;
- esaurimento e recupero contatti.

**Criterio di completamento:** la catena eventi → prove dimostrative → contatti
→ email → lezioni in palestra → iscritti → Euro è completa.

### Fase 3 — Collaboratori e automazione

- generazione degli Ultra Rari secondo la quota del 5,5%;
- assegnazioni;
- scrittura automatica;
- raccolta contatti;
- social;
- manutenzione;
- prime Forme.

**Criterio di completamento:** il gioco progredisce lentamente anche senza input
manuale.

### Fase 4 — Camuffamento Outlook completo

- layout fedele a Windows 11;
- Posta, Calendario, Iscritti e Attività;
- notifiche e finestre coerenti;
- contenuti ludici interamente diegetici;
- supporto 1366×768 e 1920×1080;
- nessun elemento apertamente arcade.

**Criterio di completamento:** osservando la schermata per alcuni secondi,
sembra un'applicazione di posta reale.

### Fase 5 — Contenuti e bilanciamento

- 100 email;
- notifiche, comunicazioni interne e comunicazioni di sistema;
- eventi casuali;
- tutti i potenziamenti;
- curve economiche;
- protezione dalla sfortuna;
- statistiche.

### Fase 6 — Prestigio e offline

- fondazione nuova scuola;
- scelta nome e città;
- rete permanente;
- progresso offline;
- migrazioni del salvataggio;
- export e import.

### Fase 7 — Rifinitura

- test completi;
- accessibilità;
- ottimizzazione;
- revisione dei testi;
- verifica del camuffamento;
- nota di non affiliazione per marchi esterni;
- preparazione alla pubblicazione.

---

## 27. Test e criteri di accettazione

### Input

- ogni `keydown` non ripetuto avanza il testo quando la composizione è attiva;
- il testo ottenuto è sempre quello previsto;
- anche modificatori e tasti di navigazione possono avanzare il testo senza
  bloccare il loro comportamento normale;
- tenere premuto un tasto conta una sola volta;
- le scorciatoie del browser funzionano;
- un click fuori dal corpo non scrive;
- un click nel corpo scrive;
- l'automazione e l'input manuale non duplicano caratteri.

### Economia

- un contatto può ricevere una sola campagna alla volta;
- nessuna email viene inviata senza contatto;
- ogni esito email e ogni lezione vengono risolti una sola volta;
- ricaricare non cambia l'esito già determinato;
- soltanto gli Euro vengono spesi per acquistare potenziamenti;
- gli iscritti generano quote una sola volta per ogni mese di gioco;
- il contatore dei mesi avanza anche quando non ci sono iscritti attivi;
- i collaboratori non possono svolgere due incarichi incompatibili;
- gli iscritti possono aumentare o diminuire soltanto tramite esiti ed eventi
  validi.

### Offline

- il progresso non supera il limite stabilito;
- non vengono create email senza contatti;
- gli eventi completati vengono risolti una volta sola;
- il riepilogo corrisponde alle variazioni reali;
- orologi anomali non producono valori negativi o infiniti.

### Salvataggio

- una partita può essere ricaricata;
- il backup recupera un salvataggio corrotto;
- le migrazioni mantengono i dati importanti;
- export e import producono lo stesso stato;
- il reset richiede conferma esplicita.

### Interfaccia

- è utilizzabile a 1366×768 senza elementi essenziali nascosti;
- non compare alcun controllo tipico da clicker nella vista principale;
- i valori sono leggibili senza rompere il camuffamento;
- tutte le funzioni principali sono raggiungibili da tastiera;
- non viene riprodotto audio.

---

## 28. Rischi di design

### Camuffamento contro leggibilità

Un Outlook troppo fedele può nascondere eccessivamente il gioco. La soluzione è
usare conteggi, email automatiche e report che sembrino naturali
nell'applicazione.

### Esaurimento dei contatti

È un collo di bottiglia interessante, ma può bloccare il giocatore. Deve sempre
esistere il volantinaggio come attività minima gratuita.

### Casualità della conversione

Una lunga serie negativa può sembrare un malfunzionamento. Servono protezione
dalla sfortuna, report chiari e tempi di risposta contenuti all'inizio.

### Automazione e perdita di interazione

Se i collaboratori fanno tutto, scrivere manualmente perde significato. La
potenza di scrittura deve moltiplicare sia input manuale sia automazione;
comunicazioni di sistema e campagne speciali mantengono inoltre una componente
manuale.

### Prestigio troppo punitivo

Un reset che richiede più cicli prima di produrre un vantaggio concreto crea una
fase morta. La prima nuova scuola deve offrire immediatamente un bonus
significativo e visibile.

### Quantità di testi

Cento email uniche richiedono coerenza editoriale. Vanno prodotte per famiglie,
revisionate e testate per lunghezza, tono e call to action.

### Marchi e somiglianza visiva

L'uso pubblico di un'interfaccia quasi identica a Outlook richiede attenzione a
logo, nome, icone e dichiarazioni di affiliazione. La simulazione deve evitare
qualunque funzione che possa far credere di inviare davvero email.

---

## 29. Decisioni già approvate

- Le email sono completamente simulate.
- L'interfaccia di riferimento è Outlook su Windows 11.
- Il camuffamento richiesto è del 99%.
- Posta, Calendario, Iscritti e altri elementi possono ospitare meccaniche di
  gioco.
- Ogni input parte da un carattere e viene migliorato con i potenziamenti.
- Solo i click nel corpo della mail producono caratteri.
- Ogni tasto conta una volta; tenere premuto non genera ripetizioni.
- L'invio è automatico e apre subito la mail successiva.
- Le email e i relativi modelli sono scelti automaticamente e possono ripetersi.
- Oggetto, destinatario, saluto, corpo, firma e allegati fanno parte del testo
  da generare.
- Ogni contatto riceve una sola mail; non esistono follow-up né risposte
  personali.
- Il funnel è: evento → persone → prove dimostrative → contatti → email → prova
  in palestra → iscritti.
- Ogni persona partecipa a una sola lezione di prova in palestra.
- Gli iscritti non sono spendibili e generano periodicamente quote in Euro.
- Gli Euro sono l'unica valuta spendibile.
- Gli iscritti possono aumentare o diminuire tramite eventi narrativi casuali.
- Gli eventi possono essere fissi o casuali e usano tempo compresso.
- Gli eventi iniziali hanno esito automatico; un sistema decisionale potrà
  essere aggiunto in futuro.
- Gli eventi usano luoghi reali; meteo e giorno della settimana non influenzano
  i risultati.
- I contatti possono esaurirsi.
- Il volantinaggio rimane una fonte gratuita di pochi contatti e non richiede
  iscritti o spade.
- A 35 iscritti attivi Redazione si evolve definitivamente in Social. I
  contenuti avanzano sempre, ma molto più lentamente mentre viene scritta una
  email. Ogni contenuto richiede inizialmente 100.000 caratteri e può generare
  Follower; Social non crea Contatti. I Follower aumentano Fama,
  sponsorizzazioni mensili e affluenza agli Eventi, che restano la fonte
  ripetibile di nuovi Contatti.
- Gli Ultra Rari diventano Collaboratori delle Onde dopo il Corso Y; i
  Leggendari dall'iscrizione.
- I collaboratori possono scrivere email e contenuti Social, partecipare agli
  eventi, gestire lezioni e spade.
- I collaboratori assegnati alle spade riducono prima il carico sulle spade sane
  e poi riparano quelle rotte; una spada richiede 150 punti-lavoro da 1,5
  secondi ciascuno.
- Ogni collaboratore svolge un incarico alla volta, può essere riassegnato
  liberamente e non ha livelli.
- Non esiste un limite massimo di collaboratori.
- Gadget si sblocca con la prima vittoria della scuola all'Accademico Arena;
  il Polsino resta un progetto a pagamento e ogni prodotto successivo richiede
  100 vendite del precedente.
- La qualità Gadget non può diminuire; revisioni, pubblico, produttività dei
  Collaboratori, domanda ordinaria e vendite marginali governano il catalogo.
- I collaboratori scrivono sulla stessa mail visibile e la loro automazione non
  può essere messa in pausa.
- Scrittura, Creatività, Carisma, Accoglienza, Attrezzatura, Gadget,
  Insegnamento e Organizzazione sono gli otto rami pubblici; Social usa gli
  effetti integrati nei primi due.
- Il carico delle spade aumenta tramite corsi, prove, eventi e imprevisti
  narrativi; ogni soglia di 100 rompe una spada.
- Una prova con iscrizione garantita al 100% si conclude anche senza spade
  disponibili e in quel caso non aggiunge carico.
- Ogni prova fallita aumenta Pity di 1; Pity aggiunge altrettanti punti
  percentuali alle prove Leggendarie e si azzera soltanto quando si iscrive un
  Leggendario ordinario o Segreto.
- I potenziamenti non sono rimborsabili, ma nel tempo si può acquistare tutto.
- Le Forme seguono `1 → X → 2 → Y → 3/4/5 → 6 → 7`, con rami Spada Lunga, Staffa
  e Doppia spada corta.
- Le Forme sono potenziamenti narrativi dei collaboratori e non simulazioni
  tecniche del combattimento.
- Le funzioni vengono introdotte progressivamente tramite comunicazioni di
  sistema manuali.
- Il prestigio consiste nel trasferirsi e fondare una nuova scuola con nome
  scelto dal giocatore.
- Ogni nuova partita parte dall'Ordine delle Onde di Genova.
- Il primo prestigio deve arrivare dopo circa 3–4 ore e offrire subito un bonus
  significativo.
- Il gioco è infinito.
- Il progresso offline è attivo.
- Sono previsti almeno 100 testi email.
- I destinatari sono inventati.
- La lingua è soltanto italiana.
- I riferimenti diretti a Star Wars devono essere evitati.
- Il gioco non ha audio.
- Non esiste una modalità di emergenza.
- Il target è desktop.
- Il salvataggio resta nel browser.
- Lo stack tecnico può essere scelto liberamente.

---

## 30. Elementi ancora da fornire o validare

Questi elementi non bloccano il prototipo, ma servono prima della versione
completa:

1. email reale di esempio per definire il tono della prima fascia;
2. firma esatta da usare nelle email simulate;
3. informazioni pratiche che devono sempre comparire negli inviti;
4. eventuali logo e materiali grafici autorizzati;
5. terminologia ufficiale desiderata per le sette Forme;
6. lista di battute o riferimenti interni all'Ordine delle Onde;
7. conferma sull'eventuale uso di persone reali come personaggi;
8. revisione dei valori di bilanciamento dopo il primo prototipo;
9. importo e frequenza compressa delle quote associative;
10. ritmo con cui il 5,5% di Ultra Rari introduce i primi collaboratori;
11. regole di accesso multiplo ai tre rami delle Forme 3/4/5;
12. elenco iniziale degli eventi e dei luoghi reali di Genova;
13. nomi e comportamento definitivo delle spade reali;
14. elementi esatti mantenuti o azzerati dal prestigio;
15. durata massima definitiva del progresso offline.

---

## 31. Fonti di riferimento

- Profilo ufficiale di LudoSport Genova – Ordine delle Onde:\
  https://ludosportplus.com/school-profile/ludosport-genova-ordine-delle-onde
- LudoSport Alpha e sedi italiane:\
  https://www.italia.ludosport.net/accademia/alpha/
- Presentazione e struttura generale LudoSport:\
  https://www.ludosport.net/sommario.html
- Learning Path e sette Forme:\
  https://ludosport.net/Learning-Path.html
- Riferimento di interazione Hacker Typer:\
  https://hackertyper.net/
- Riferimento incrementale interattivo YAIG:\
  https://yetanotherincrementalgamebutthistimeaboutcoding.com/
- Descrizione completa dei sistemi YAIG:\
  https://poptocrack.itch.io/yet-another-incremental-game-but-this-time-about-coding
- Pagina ufficiale Steam di YAIG:\
  https://store.steampowered.com/app/3729810/Yet_Another_Incremental_Game_but_this_time_about_coding/

---

## 32. Definizione dell'MVP

L'MVP è pronto quando il giocatore può:

1. aprire il gioco e credere di trovarsi davanti a Outlook;
2. ricevere i primi contatti tramite il tutorial;
3. scrivere email premendo tasti o cliccando nel corpo;
4. inviare automaticamente almeno dieci modelli diversi;
5. aspettare l'esito delle email senza ricevere risposte personali;
6. vedere una prova prenotata nel Calendario;
7. risolvere la lezione in palestra e ottenere o perdere il potenziale iscritto;
8. ottenere iscritti e incassare quote in Euro;
9. terminare i contatti e utilizzare il volantinaggio gratuito;
10. organizzare un evento e attraversare il funnel completo;
11. ottenere nuovi contatti tramite Carisma;
12. acquistare potenziamenti in Euro;
13. completare una comunicazione di sistema e sbloccare una funzione;
14. ottenere un Ultra Raro, completare il Corso Y e assegnarlo;
15. osservare un collaboratore scrivere sulla stessa mail;
16. chiudere e riaprire il browser senza perdere i progressi.

Il prestigio, i 100 testi, tutte le Forme, i social avanzati e la rete infinita
appartengono alla versione completa successiva all'MVP.
