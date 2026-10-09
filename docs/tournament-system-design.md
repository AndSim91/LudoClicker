# Sistema Tornei, Arena e Stile

Stato: specifica di progetto approvata, precedente all'implementazione.

Questo documento raccoglie le decisioni confermate per il sistema competitivo e prevale, per questa feature, sulle indicazioni incompatibili presenti nel `GAME_DESIGN_DOCUMENT.md`. In particolare, il progresso offline viene disabilitato completamente.

Le indicazioni sono classificate come:

- **Confermato**: requisito da implementare;
- **Da calibrare**: struttura approvata, numero finale determinato tramite simulazioni;
- **Aperto**: decisione deliberatamente rinviata.

## 1. Obiettivi

Il sistema deve:

- dare un valore competitivo alle Forme apprese dagli iscritti;
- premiare lo sviluppo di più atleti, non di un solo campione;
- produrre storie emergenti senza usare eccezioni narrative che falsino i risultati;
- rendere Arena e Stile due percorsi distinti e ugualmente importanti;
- permettere risultati sorprendenti, mantenendo la preparazione prevalente sulla fortuna;
- offrire premi abbastanza importanti da motivare il giocatore a seguire i tornei;
- integrare in futuro persone uniche reclutabili, chiamate Leggendari Segreti.

I tornei sono automatici e obbligatori. Il giocatore gestisce la scuola e prepara gli atleti, ma non sceglie manualmente chi partecipa né controlla gli incontri.

## 2. Statistiche personali

### 2.1 Arena e Stile base

Ogni persona riceve al momento della sua generazione due statistiche intere indipendenti:

- Arena;
- Stile.

Le due statistiche:

- non hanno correlazione;
- sono immutabili;
- vengono generate al momento dell'iscrizione per gli atleti del giocatore;
- rimangono nascoste fino al completamento del Corso X;
- possono essere usate dal sistema anche quando sono ancora nascoste.

Il modello dati deve accettare valori superiori a 100 per permettere future rarità con massimo 150.

### 2.2 Distribuzione per rarità

La rarità modifica soltanto il minimo del tiro uniforme:

| Rarità | Arena base | Stile base |
|---|---:|---:|
| Comune | 1–100 | 1–100 |
| Raro | 25–100 | 25–100 |
| Ultra Raro | 50–100 | 50–100 |
| Leggendario | valori fissi | valori fissi |
| Leggendario Segreto | valori fissi | valori fissi |

Un Comune può quindi ottenere 100/100, ma la probabilità è 1 su 10.000. La rarità non assegna bonus successivi e non impone un valore massimo differente nella versione iniziale.

### 2.3 Bonus delle Forme

Decisione di Andrea del 06/10. Ogni Forma conosciuta vale 10 punti tra Arena e
Stile, in qualunque ramo, applicati sempre alla statistica base
(`FORM_STAT_BONUSES` e `getFormStatBonuses` in `src/game/athleteStats.ts`):

| Forma | Arena | Stile |
| --- | ---: | ---: |
| F1, F2, F6, F7 | +10% | +10% |
| Corso X (solo con il Percorso Segreto) | +10% | +10% |
| Corso Y | +5% | +5% |
| F3–F5 Spada Lunga | +5% | +5% |
| F3–F5 Staffa | +7,5% | +2,5% |
| F3–F5 Doppie Spade Corte | +2,5% | +7,5% |

```text
Arena = base × (1 + somma Arena delle Forme) × esperienza
Stile = base × (1 + somma Stile delle Forme) × esperienza
```

Con tutte le Forme +90% su entrambe, +100% con il Corso X. I Leggendari Segreti
tengono i valori fissati dal design (+10% per numero di Forma, come prima).

**Arma.** Ogni atleta combatte con l'arma del ramo in cui è andato più avanti
(F3–F5); a parità, il ramo preferito, poi Lunga, Staffa, Doppie; con solo F1–F2
la Spada Lunga (`getAthleteWeapon`). Gli esterni hanno un'arma stabile per persona.

### 2.4 Esperienza torneistica

Ogni torneo al quale una persona partecipa assegna `+1` esperienza al termine del torneo.

```text
moltiplicatoreEsperienza = 1 + 0,03 × min(esperienza, 20)
```

Il bonus massimo è `+60%`. Il contatore può continuare oltre 20, ma non produce ulteriore potenza.

L'esperienza ottenuta in un torneo vale dal torneo successivo.

### 2.5 Preparazione

Per ciascuna statistica:

```text
preparazione = base × moltiplicatoreForme × moltiplicatoreEsperienza
```

Esempio di riferimento:

```text
base 100 × Forma 4 (1,40) × esperienza 20 (1,60) = 224
```

## 3. Fortuna e prestazione

La fortuna pesa 30 su 100. I tiri casuali non moltiplicano integralmente la preparazione.

### 3.1 Condizione generale

La condizione grezza è la media di due tiri uniformi tra 70% e 130%. La media produce una distribuzione triangolare, con risultati estremi rari.

```text
condizioneGrezza = media(tiro70_130, tiro70_130)
modificatoreCondizione = 0,70 + 0,30 × condizioneGrezza
```

Il modificatore effettivo è compreso tra 91% e 109%.

La condizione:

- viene generata una volta per atleta e torneo;
- è condivisa tra Arena e Stile;
- rimane uguale per tutto il torneo;
- viene mostrata al giocatore come valore grezzo 70–130%.

Etichette previste:

| Condizione grezza | Etichetta |
|---:|---|
| 70–79,999% | Giornata disastrosa |
| 80–89,999% | In difficoltà |
| 90–109,999% | Prestazione regolare |
| 110–119,999% | In grande forma |
| 120–130% | Giornata eccezionale |

### 3.2 Variazione del singolo incontro

Per ogni incontro e per ogni atleta viene generato un tiro uniforme tra 95% e 105%.

```text
modificatoreIncontro = 0,70 + 0,30 × tiro95_105
```

L'impatto effettivo è compreso tra 98,5% e 101,5%.

### 3.3 Valore effettivo

```text
valoreEffettivo = preparazione × modificatoreCondizione × modificatoreIncontro
```

## 4. Incontri Arena

Ogni incontro è al meglio dei tre assalti: vince chi raggiunge per primo due assalti, con risultato 2–0 oppure 2–1. Fa eccezione la finale per il 1° e 2° posto, al meglio dei cinque (3–0, 3–1 o 3–2); la finale per il bronzo resta al meglio dei tre.

La probabilità del singolo assalto deriva dal rapporto tra preparazione e fortuna. Il coefficiente di decisione viene applicato soltanto alla preparazione: applicarlo anche ai modificatori casuali renderebbe la fortuna molto più importante del 30% concordato.

```text
potenzaA = preparazioneA^K × modificatoreCondizioneA × modificatoreIncontroA
potenzaB = preparazioneB^K × modificatoreCondizioneB × modificatoreIncontroB
p(A) = potenzaA / (potenzaA + potenzaB)
```

**Da calibrare:** il valore iniziale di `K` è 18, con probabilità del singolo assalto limitata tra 0,1% e 99,9%. Il valore definitivo deve essere verificato tramite Monte Carlo insieme alle distribuzioni NPC.

Principi vincolanti:

- valori uguali producono il 50%;
- nessun incontro è matematicamente garantito;
- un piccolo vantaggio lascia l'incontro aperto;
- un grande vantaggio rende la vittoria molto probabile;
- ogni assalto viene risolto separatamente.

## 5. Valutazione Stile

Decisione del 04/10 (concept «Giudizio di Stile»): il voto nasce come lo dà un
Giudice di Stile con l'app **Servizio** di INCOM, sulle voci delle *Guidelines
for Style Judges* 2.6.5. Codice in `src/game/styleJudging.ts`.

Ogni giudice compila una scheda: sette voci tecniche (BAS, MOV, DIN, COM, SAPD,
GCC, DIF) da 0 a 3 a **mezzi punti**, SOG da 0 a 3 a punti interi e PEN.

```text
voto = 5,5 + 0,2 × punti tecnici + 0,1 × SOG − 0,5 × PEN
```

**Modello C** (decisione del 07/10, analisi in `claude/stile-panoramica.md` del
progetto, tarata sul Nazionale italiano RA Alpha 2026 e sull'Accademico Roma
2026): il voto è **assoluto**. Dipende dallo Stile dell'atleta, non dalla media
del campo: lo Scolastico cresce con la qualità della scuola e un torneo più
forte dà voti più alti. Via di mezzo tra la scala reale (Nazionale vero:
mediana 6,1, il migliore 6,5) e una curva più generosa: un atleta vero cade
più o meno a 110 di Stile da Iniziato (F1), 145 da Accademico (F1, F2, Y) e
205 da Cavaliere (F3–F5 con un'arma). Sopra comincia la parte leggendaria.

- **Stile = qualità.** `getStyleQuality`: Q = 3 / (1 + (250 / Stile del
  giorno)^1,4), con Stile del giorno = preparazione × condizione × incontro.
  ~0,5 a 75, ~1,2 a 200, 1,5 a 250, ~2,6 a 1.000.
- **BAS, GCC**: Q + occhio del giudice (±0,25, cioè mezzo punto: così
  l'arrotondamento al mezzo punto resta giusto in media).
- **MOV**: Q + 1,5 × (quota di assalti vinti − probabilità attesa di
  vincerne uno): l'iniziativa sull'Orizzonte degli Eventi.
- **DIN**: Q + giornata (±0,3, metà con 20 tornei di esperienza).
- **Spazio per esprimersi** (`getExpressionSpace`, 0–1): dal rapporto di Stile
  con l'avversario più 0,1 per ogni Forma di differenza. Pieno se l'avversario
  ha tra ~0,75 e 3 volte il nostro potenziale; cala se ci sovrasta o se è così
  debole da restare fermo.
- **COM** (le Forme sono il repertorio): a ogni **assalto vinto**, probabilità
  0,9 × (Q/3)^3,5 × repertorio × spazio; repertorio = Forme con COM per
  **l'arma usata nell'incontro** (`getComplexTechniqueForms`; F1 e F2 solo con
  la Spada Lunga, F6 e F7 senza COM) su 3. F1–F2 0,5–1, F3–F5 1–1,5; tetto 3.
- **SAPD** (la differenza di potenziale le rende più facili): a ogni assalto
  vinto, 0,5 × (Q/3)^3,5 × facilità × spazio, con facilità = 1 + 0,6 ×
  ln(Stile / Stile avversario) tra 0,5 e 2. Disarmo (1), Presa con F2 (1),
  Sync e Armonica con F3 Lunga; tetto 3.
- **Armoniche e Sync** valgono 1 in COM e 1 in SAPD insieme: sono rarissime
  nello sport.
- **Disarmato**: chi subisce un Disarmo può rispondere solo con un'Armonica
  della Forma 1 (Prima–Quarta Armonica), che si fa senza spada; probabilità
  delle SAPD, 1 in COM e 1 in SAPD (`rollDisarmedArmonica`).
- **DIF** = «non ha potuto esprimersi» quanto avrebbe potuto: 3 × (Q/3)^1,5 ×
  (1 − spazio), a mezzi punti. Sovrastato (meno Stile o meno Forme) oppure
  davanti a chi resta fermo; pesa solo per chi avrebbe la qualità per farlo.
  All'Accademico Roma 2026 la DIF compare proprio negli incontri tra gradi
  lontani, da tutti e due i lati.
- **SOG**: gusto di ciascun giudice, più facile negli incontri decisi
  all'ultimo assalto (2–1, 3–2) e con più qualità.
- **PEN**: il **cartellino di Stile**, separato da quelli dell'Arena e a scacchi
  gialli e neri. **Uno solo per atleta, a fine incontro**, ma con una o più
  sanzioni (−0,5 ciascuna); possono prenderlo entrambi. A ogni assalto la prima
  sanzione ha probabilità 0,3 / (1 + (Stile / 20)^2,5) (30% a 0 di Stile, ~15% a
  20, ~4% a 45, ~1% a 75), × pressione dell'avversario (0,7–1,6),
  inesperienza e brutta giornata; ogni sanzione in più nello stesso assalto ×0,4,
  massimo 3 per assalto e **11** in tutto (voto 0). Motivo Dichiarazione, Cura o
  Rispetto. `stylePenaltyCountA/B` salva il numero solo se è più di una.

**Giudici:** uno nei gironi e nel tabellone; dalle semifinali (semifinali,
finale per il bronzo, finale) due, quattro al Nazionale, in Champion's Arena e
nelle Chronicles. Il voto dell'incontro è la media dei giudici; la classifica
Stile usa la media di tutti gli incontri. Al Chronicles gli esterni conoscono
tutte le Forme (7).

Si salvano le schede (`styleDetailA/B`, Giudice 1, 2…) per gli atleti della
scuola e, nella finale con un nostro atleta, anche per l'avversario esterno;
il cartellino (`stylePenaltyA/B`, `stylePenaltyCountA/B`) per tutti. Quella
finale salva anche l'ordine degli assalti (`assaults`, es. «abaa»). Il codice
Servizio v2 di ogni scheda si calcola alla lettura (`src/game/styleCode.ts`,
porting dell'algoritmo pubblico `anfive/style-codes`).

Voto tipico contro un pari (prototipo): 10 → 5,5 · 62 → 5,8 · 125 → 6,2 ·
225 → 6,7 · 500 → 7,6 · 1.000 → 8,2 · 3.000 → 8,6 (giornata ottima 9,1).
Misure sui tornei del gioco (60 per livello, standard prima del 07/10): Accademico (90)
mediana 6,0, vincitore 6,4, cartellini 6% degli incontri; Nazionale (110) 6,1,
vincitore 6,6, cartellini 3%; Champion's (300) 7,0, vincitore 7,6, cartellini
1%; Chronicles (~1.000) 7,9, vincitore 8,4, massimo 9,3. Con il Nazionale a 200
(in vigore dal 07/10) la mediana sale a ~6,55.

### 5.1 «Guarda la finale»

La finale con un nostro atleta si guarda da Tornei › Risultati o dalla notifica
del torneo (`FinalDuelLayer.tsx`), in non più di 30 secondi.

- **Modalità Onde**: combattimento in Arena con gli atleti della palestra
  (`Fighter` di `GymPair.tsx`). Ogni punto è un taglio, mai un affondo
  (fendente, tondo, montante, diagonale, taglio alla gamba): lampo sul corpo,
  chi è toccato alza la mano e chiama «OH!». Una COM o un SAPD compare sopra
  l'atleta con la Forma ed è sempre il colpo decisivo di un assalto vinto da
  chi la esegue. Il telefono di Servizio si compila mentre si combatte, come
  media di tutti i giudici e per entrambi gli atleti: mezzo punto alla volta,
  a volte mezzo punto oltre e poi giù; COM e SAPD si contano al tocco; alla
  fine i valori veri e i codici dei giudici.
- **Disarmo** (SAPD rarissimo): la lama avvolge quella dell'avversario, la
  spada vola girando e cade a terra dietro di lui; a mani vuote prende il
  taglio e chiama «OH!», poi va a raccoglierla e si torna in guardia.
- **Fine**: chi vince esulta (spada al cielo, braccia a V o pugno al cielo) e
  chi perde è giù di morale con la spada spenta (testa bassa, in ginocchio o
  mano sulla testa); una delle tre a caso, fissata dall'id dell'incontro
  (`fighterBodies.ts`).
- **Sala per livello** (`FinalArenaBackdrop.tsx`), con il nome del torneo in
  alto: Scolastico, palestra con lo stendardo delle Onde (senza motto); Accademico, stendardi
  degli Ordini (fondo nero, logo bianco, `public/assets/orders/`; mancano
  Shardana, Loggia e Ronin); Nazionale, tricolore; Champion's, bandiere delle
  nazioni del circuito; Chronicles, la sala dei Leggendari.
- **Outlook**: nessuna animazione. Resoconto assalto per assalto («Montante al
  busto di X · «OH!» su Y»), cartellini di Stile e Servizio già compilato con
  i codici. Lo stesso vale con «Riduci animazioni».
- Il cartellino di Stile si alza **a fine incontro**, uno per atleta, con il
  numero di sanzioni; il telefono di Servizio mostra quel numero in PEN.
- Il copione (colpi, assalto di COM/SAPD e cartellini) deriva dall'id
  dell'incontro (`finalDuel.ts`), la regia da `finalDuelTimeline.ts`. Le finali
  salvate prima non hanno l'ordine degli assalti né la scheda dell'esterno: il
  punto dello sconfitto cade nel primo o nel secondo assalto e il telefono
  mostra dell'esterno solo il voto finale.

## 6. Calendario e progresso offline

### 6.1 Nessun progresso offline

Il progresso offline viene disabilitato per l'intero gioco.

Quando il gioco non è in esecuzione:

- il calendario si ferma;
- non maturano quote;
- non avanzano allenamenti, prove, email, eventi o automazioni;
- non avvengono disiscrizioni;
- non vengono simulati tornei.

Alla riapertura tutti i timestamp pendenti vengono traslati del tempo reale trascorso e ripartono dal tempo residuo precedente.

### 6.2 Stagione competitiva

I tornei si disputano alla fine del mese indicato:

| Mese | Torneo |
|---|---|
| Dicembre | Scolastico |
| Aprile | Accademico |
| Giugno | Nazionale |
| Novembre | Champion's Arena |

La stagione inizia con lo Scolastico di dicembre dell'anno N e termina con la Champion's di novembre dell'anno N+1.

Al confine temporale:

1. terminano allenamenti e prove già scaduti;
2. vengono registrate le nuove iscrizioni;
3. viene verificata l'idoneità;
4. viene disputato il torneo;
5. vengono assegnate qualificazioni e immunità;
6. vengono elaborati gli altri eventi periodici.

Una Forma 1 completata esattamente sul confine rende l'atleta idoneo.

## 7. Torneo Scolastico

L'area Tornei si sblocca al raggiungimento di sei iscritti. Lo Scolastico si attiva con almeno otto iscritti attivi che abbiano completato Forma 1 (sei fino al 07/10/2026).

Se il requisito non è soddisfatto:

- lo Scolastico viene saltato;
- l'intera stagione competitiva viene persa;
- Accademico, Nazionale e Champion's non vengono disputati;
- nessuno ottiene immunità o esperienza.

Quando gli idonei sono al massimo 64 partecipano tutti. Oltre questa soglia si
disputano preliminari aggregate che selezionano i 64 partecipanti effettivi
usando i valori Arena e Stile comprensivi di tutti i modificatori acquisiti.

### 7.1 Preliminari aggregate

- i migliori 32 atleti per Arena entrano nel torneo;
- la graduatoria Stile aggiunge i migliori atleti non già selezionati fino a 64;
- a parità prevale l'altra statistica e poi l'ordine stabile del roster;
- non viene aggiunta casualità: condizione e variazioni degli incontri vengono
  generate soltanto per il torneo effettivo;
- il risultato conserva il numero totale di idonei e le due selezioni.

Le preliminari usano la stessa funzione autorevole di composizione delle
statistiche usata dal torneo. Preparazione atletica e Corso Agonisti sono già
registrati nei valori base; Forme ed esperienza applicano i rispettivi
moltiplicatori.

### 7.2 Gironi variabili

- vengono creati al massimo otto gironi;
- ogni girone contiene al massimo otto persone;
- i partecipanti vengono distribuiti nel modo più uniforme possibile;
- i gironi differiscono al massimo di una persona;
- passano i primi quattro di ogni girone;
- se un girone contiene meno di quattro persone passano tutti.

Alla fase eliminatoria accedono al massimo 32 atleti. Il tabellone usa il successivo numero potenza di due e i migliori qualificati ricevono eventuali bye.

Esempi:

- 6 partecipanti: un girone da 6, 4 qualificati al tabellone Arena;
- 10 partecipanti: due gironi da 5, 8 qualificati;
- 17 partecipanti: gironi 6/6/5, 12 qualificati, tabellone da 16 con 4 bye;
- 64 partecipanti: 8 gironi da 8, 32 qualificati;
- 100 idonei: preliminari aggregate, poi 8 gironi da 8 con i 64 selezionati.

## 8. Tornei superiori

Accademico, Nazionale e Champion's hanno un campo nominale di 64 posti:

- da 0 a 12 qualificati distinti della scuola del giocatore;
- avversari generati fino a occupare i posti non riservati ai qualificati;
- ogni qualificato che nel frattempo lascia la scuola conserva uno slot vuoto
  nel campo, gestito come bye e non sostituito da un avversario;
- 8 gironi nominali; gli slot vacanti riducono la dimensione dei gironi
  interessati senza creare partecipanti sostitutivi;
- 4 qualificati per girone;
- fase eliminatoria da 32.

Ambito delle scuole avversarie:

- Accademico: un record per ogni Ordine dell'Accademia Alpha, con le sedi dello
  stesso Ordine consolidate;
- Nazionale: un record per ogni altra Accademia italiana;
- Champion's: un record per ogni nazione estera della rete LudoSport+.

All'Accademico la scuola arriva con il sottoinsieme dei 6 o 12 qualificati
complessivi appartenente alla scuola del giocatore. Dal Nazionale in avanti la
rappresentanza dipende dai risultati ottenuti contro gli NPC. Se nessun atleta
della scuola entra nelle posizioni complessive disponibili, la scuola non
prende parte ai tornei successivi della stagione.

I nomi delle scuole vengono inclusi in una fotografia locale dei dati pubblici.
Ogni record possiede un ID stabile e appartiene a un solo livello del circuito.
Il gioco non usa Internet a runtime.

## 9. Classifiche e qualificazioni

### 9.1 Gironi Arena

Criteri di ordinamento:

1. incontri vinti;
2. assalti segnati;
3. media Stile;
4. sorteggio.

### 9.2 Podi

Arena e Stile producono due classifiche pubbliche indipendenti. La stessa persona può apparire in entrambi i podi.

### 9.3 Sei o dodici qualificati distinti

Il numero di posizioni disponibili dipende dagli iscritti attivi quando termina
il torneo che assegna la qualificazione:

| Iscritti attivi | Accademico | Nazionale | Champion's |
|---:|---:|---:|---:|
| 0–99 | 6 | 6 | 6 |
| 100–299 | 12 | 6 | 6 |
| 300–500 | 12 | 12 | 6 |
| 501+ | 12 | 12 | 12 |

Il valore viene salvato insieme al risultato. Variazioni successive degli
iscritti non modificano una qualificazione già assegnata e vengono considerate
soltanto alla conclusione del torneo successivo.

Con sei posizioni:

1. entrano i primi tre Arena;
2. si scorre la classifica Stile dal primo posto;
3. entrano le prime tre persone non già qualificate tramite Arena.

Con dodici posizioni lo stesso procedimento usa i primi sei Arena e le prime
sei persone distinte ricavate dalla classifica Stile.

Il podio Stile pubblico non viene modificato. Le persone aggiuntive sono indicate come ripescate per la delegazione.

Soltanto il sottoinsieme appartenente alla scuola del giocatore costituisce la
sua delegazione. Può quindi contenere da zero al numero massimo di posizioni
disponibili; gli NPC possono occupare le altre posizioni della classifica.

## 10. Immunità

Chi si qualifica al torneo successivo è protetto dagli abbandoni automatici
fino a quel torneo. La cancellazione manuale rimane possibile.

La protezione deve avere precedenza su:

- abbandono annuale;
- eventi narrativi;
- future disiscrizioni improvvise;
- rimozioni automatiche.

Se un qualificato lascia comunque la scuola, il suo identificativo resta nella
qualificazione ma perde l'immunità operativa. Il torneo successivo viene
disputato con il relativo posto vacante: non viene effettuato alcun ripescaggio
e non viene generato un NPC sostitutivo.

Ciclo:

```text
qualificato → immune → torneo successivo
  → qualificato: immunità continua
  → non qualificato: immunità termina immediatamente
  → uscito dalla scuola: posto vacante (bye)
```

Dopo la Champion's l'immunità termina per tutti.

## 11. Premi

La partecipazione non ha costi. Un torneo automatico non può essere bloccato dalla mancanza di denaro.

Arena e Stile assegnano premi identici. Per ciascuna disciplina la scuola riceve
un solo premio, corrispondente al miglior piazzamento raggiunto da uno dei suoi
atleti. Il premio Arena e il premio Stile restano indipendenti: un torneo può
quindi assegnare alla scuola al massimo due premi.

| Torneo | 1° posto | 2° posto | 3° posto |
|---|---:|---:|---:|
| Scolastico | titolo e qualificazione | titolo e qualificazione | titolo e qualificazione |
| Accademico | €500 + 5 follower | €250 + 2 follower | €250 + 1 follower |
| Nazionale | €2.500 + 10 follower | €1.250 + 5 follower | €700 + 3 follower |
| Champion's | €10.000 + 15 follower | €5.000 + 10 follower | €2.500 + 5 follower |

I follower ottenuti come premio aumentano dello stesso valore anche la Fama della scuola e contribuiscono normalmente alle sponsorizzazioni mensili.

Un ripescato che non appartiene al vero podio riceve qualificazione e immunità, ma non il premio da podio.

## 12. Standard di difficoltà

Lo standard è la media aritmetica obiettivo della preparazione degli avversari
ordinari, calcolata separatamente per Arena e Stile dopo Forme ed esperienza.
Non comprende gli atleti della scuola, i posti vacanti o i Leggendari Segreti.

| Torneo | Media Arena | Media Stile |
|---|---:|---:|
| Accademico | 100 | 100 |
| Nazionale | 200 | 200 |
| Champion's | 400 | 400 |
| Reptile (coppie esterne) | 500 × 1,1 per vittoria | 500 × 1,1 per vittoria |

Dal 07/10 (decisione di Andrea, con il voto di Stile assoluto): Accademico 100,
Nazionale 200, Champion's 400 e Reptile 500 di base (`GAME_CONFIG.reptileStandard`,
×1,1 per ogni vittoria precedente e ×1,25 con la Superba). Il prestigio si apre
con il primo titolo all'Accademico. Prima: Accademico 90, Nazionale 110,
Champion's 300 (e prima ancora 150 e 225), con il prestigio al Nazionale. I
Leggendari Segreti dell'Accademico e del Nazionale sono stati alzati in
proporzione (×100/90 e ×200/110: Palena 156/172, Todaro 168, Panizza 172/156,
Magnifico 144/183, Maggi 156; Scarica 400/418, Dipalo 364/382, Pedrazzi
364/409), così restano in cima al loro campo.

Ogni campo viene normalizzato direttamente sul proprio standard, sia con sei
sia con dodici qualificati della scuola. Lo standard non è una soglia rigida
di vittoria: il torneo contiene comunque fasce inferiori e superiori alla media.

Le probabilità di vittoria dipendono dalla distribuzione completa, dalla
condizione e dal tabellone. La baseline seguente è diagnostica e non modifica
direttamente il risultato degli incontri.

### 12.1 Baseline Monte Carlo dell'implementazione

Prima calibrazione con 500 Champion's indipendenti per valore, un atleta della scuola e il campo NPC completo:

| Preparazione | Vittoria Arena | Podio Arena |
|---:|---:|---:|
| 425 | 1,0% | 18,0% |
| 448 | 9,2% | 35,8% |
| 469 | 20,6% | 58,0% |
| 478 | 34,4% | 67,6% |
| 490 | 45,6% | 74,6% |
| 512 | 75,2% | 93,8% |
| 533 | 90,0% | 98,0% |

Con una media del campo pari a 300, la baseline colloca circa il 33% di
vittoria a preparazione 478 e circa il 90% a preparazione 533. Il probe deve
rimanere eseguibile separatamente dai test rapidi.

## 13. Generazione degli avversari

Gli avversari ordinari sono nuovi a ogni torneo e non persistono nelle stagioni successive. Il risultato storico conserva una fotografia dei loro dati.

Ogni NPC possiede:

- nome e cognome;
- scuola;
- rarità;
- Forma;
- esperienza;
- Arena e Stile base;
- preparazione;
- condizione e risultati.

Non vengono generati Leggendari ordinari nelle altre scuole.

### 13.1 Fasce del campo avversario

All'Accademico gli NPC occupano i posti non riservati alla delegazione e agli
eventuali bye. Con sei qualificati presenti vengono generati 58 NPC; con dodici
qualificati presenti ne vengono generati 52.

| Fascia | Posti base |
|---|---:|
| Qualificati ordinari | 30 |
| Contendenti | 18 |
| Favoriti | 8 |
| Élite | 2 |

Intervalli usati per selezionare la statistica principale prima della
normalizzazione del campo:

| Torneo | Ordinari | Contendenti | Favoriti | Élite |
|---|---:|---:|---:|---:|
| Accademico | 55–94 | 95–119 | 120–139 | 140–155 |
| Nazionale | 75–114 | 115–144 | 145–169 | 170–185 |
| Champion's | 100–154 | 155–189 | 190–214 | 215–230 |

I posti vengono divisi in modo uniforme tra qualificati principalmente Arena e principalmente Stile. La statistica secondaria viene generata liberamente; i profili bilanciati emergono senza una categoria artificiale.

Dopo la selezione, Arena e Stile vengono normalizzati con due fattori
indipendenti affinché la media degli NPC ordinari coincida esattamente con lo
standard del torneo. La normalizzazione conserva i rapporti interni del campo.
L'eventuale Leggendario Segreto viene inserito soltanto dopo questa operazione
e non partecipa al calcolo della media; gli NPC ordinari rimasti vengono
normalizzati nuovamente dopo la sostituzione.

Nei tornei successivi gli NPC aggiuntivi necessari a sostituire i posti non conquistati dalla scuola vengono distribuiti proporzionalmente tra le quattro fasce, mantenendo almeno due profili Élite.

### 13.2 Popolazioni candidate

| Torneo | Comune | Raro | Ultra Raro | Forme | Esperienza |
|---|---:|---:|---:|---|---:|
| Accademico | 65% | 30% | 5% | F1, F2, Y, F3–F4 Lunga | 1–6 |
| Nazionale | 35% | 50% | 15% | + F5 Lunga, F3–F4 seconda arma | 5–14 |
| Champion's | 40% | 52% | 8% | + F5 seconda arma, F3 terza arma, F6 | 7–17 |

Le percentuali descrivono i candidati. La selezione per fascia può far emergere più rarità elevate nei posti superiori senza modificare direttamente il tiro base.

Le Forme dipendono solo dal livello del torneo e sono le stesse dei Leggendari
Segreti (`src/game/levelForms.ts`); la seconda arma (Staffa o Doppia spada corta)
è scelta dall'ID. Nelle Chronicles tutti hanno tutte le Forme. Base e
preparazione vengono normalizzate insieme, quindi la media del torneo è davvero
base × Forme × esperienza.

La composizione finale e le code della distribuzione restano monitorate con una
simulazione ripetibile che produce un report delle probabilità.

## 14. Leggendari Segreti

I Leggendari Segreti sono persone uniche e persistenti, normalmente reclutabili.
Il colore semantico della rarità è marrone; la tonalità esatta deve rispettare
il contrasto dell'interfaccia.

Ogni profilo ha un livello (Accademico, Nazionale, Champion's, Chronicles) e
compare solo in quel torneo. La sua scuola vera (es. LudoSport Alpha · Torino) è
solo da mostrare. Prima che la scuola vinca per la prima volta Arena o Stile in
un torneo ordinario, il primo Leggendario Segreto ha il 5% di probabilità di
apparire (10% fino al 09/10), moltiplicato per lo stesso fattore dei contatti:
−25% per ogni Leggendario in squadra oltre il primo, attenuato dalla
Reputazione di carriera fino a sparire a 25 punti, poi fino al doppio a 50
(`getLegendaryEncounterMultiplier`, GDD § 5.3). Dai tornei successivi alla
prima vittoria, la sua presenza è garantita, senza malus. Soltanto dopo
l'apparizione del primo viene effettuato un secondo tiro indipendente: nel 20%
dei casi, fisso e senza malus, entra anche un secondo Leggendario Segreto,
se esiste un altro profilo esterno di quel livello. La prima vittoria è uno
sblocco permanente della partita e resta valida anche dopo la fondazione di
nuove scuole.

Revisione del 07/10. Ogni profilo ha tre cose distinte:

- **valore da torneo**: Arena e Stile da avversario, fissi e scelti dal
  designer, senza normalizzazione né moltiplicatori;
- **Forme del suo livello**, le stesse degli avversari generati: Accademico F1,
  F2, Y, F3 e F4 Lunga; Nazionale + F5 Lunga, F3 e F4 sulla seconda arma;
  Champion's + F5 sulla seconda arma, F3 sulla terza, F6; Chronicles tutte. La
  seconda arma è la Doppia spada corta per gli specialisti Stile, la Staffa per
  gli altri. Da avversario ha l'esperienza del livello (5/10/15/20), che conta
  solo nel voto di Stile;
- **valore base**: Arena e Stile con cui entra a scuola, con le sue Forme ed
  esperienza 0 (un Leggendario normale entra con 75/75). Poi cresce come tutti.

Valore a scuola = base × (1 + bonus Forme) × (1 + 0,03 × esperienza).
Gli specialisti hanno la statistica principale circa il 10% sopra l'altra; i
completi sono entro il 3%.

Condizione di sconfitta:

- specialista Arena: battuto direttamente da un atleta della scuola;
- specialista Stile: superato nella classifica Stile da un atleta della scuola;
- profilo completo: è sufficiente una delle due condizioni.

Non conta una sconfitta inflitta da un'altra scuola.

### 14.1 Prova automatica

Alla fine del torneo, un Leggendario Segreto sconfitto avvia automaticamente una prova di 30 secondi nella scuola:

Un profilo può disabilitare la prova con la regola `recruitment: "never"`.
Adriano Panico (Accademico) e Daniele Maggi (Nazionale) usano questa eccezione:
restano sempre esterni e ogni sconfitta dona alla scuola 500 Euro (Panico) o
3.000 Euro (Maggi), senza creare contatti o prove. Non hanno una scena: ogni
sconfitta è un Evento in La mia giornata («La tana del Rancor» per Panico,
«Trenta denari milanesi» per Maggi). Entrano nel Ludodex e la loro scheda, con
i valori da torneo e il numero di sconfitte, si apre alla prima sconfitta.

Una nuova prova dello stesso Leggendario Segreto riutilizza il contatto esistente, senza crearne un doppione.

```text
sconfitta → fine torneo → prova automatica 30 s → iscrizione o rifiuto
```

Non passa da contatto disponibile, email o prenotazione manuale.

Usa le probabilità dei Leggendari normali:

- 15% base;
- migliorabile fino al 35%;
- +3 punti percentuali per ogni precedente fallimento;
- massimo complessivo 35%.

Se la prova fallisce, torna esterno, può ricomparire e deve essere sconfitto nuovamente. Il numero di tentativi falliti rimane.

Se la prova riesce:

- si iscrive;
- diventa immediatamente collaboratore;
- non può più apparire per la scuola d'origine.

Una prova segreta in corso impedisce temporaneamente di fondare una nuova scuola.

### 14.2 Catalogo (07/10)

La fonte è `src/content/secretLegendaries.ts`. Medie degli avversari generati:
Accademico 100, Nazionale 200, Champion's 400, Chronicles 1.000.

| N. | Profilo | Torneo | Specialità | Scuola | Torneo A/S | Base A/S |
|---:|---|---|---|---|---:|---:|
| 1. | Marco Palena | Accademico | Stile | LudoSport Alpha · Torino | 156 / 172 | 85 / 95 |
| 2. | Lorenzo Todaro | Accademico | Completo | LudoSport Alpha · Milano | 168 / 168 | 90 / 90 |
| 3. | Elisa Brondolo | Accademico | Stile | LudoSport Alpha · Torino | 158 / 174 | 86 / 96 |
| 4. | Ruggero Pini | Accademico | Arena | Ordine delle Onde · Genova | 150 / 136 | 82 / 74 |
| 5. | Adriano Panico | Accademico | Arena | Ordine delle Onde · Chiavari | 174 / 158 | non reclutabile, 500 € |
| 6. | Pietro Scarica | Nazionale | Completo | LudoSport Roma | 405 / 415 | 112 / 115 |
| 7. | Piero Dipalo | Nazionale | Completo | LudoSport Adriatica · Ferrara | 372 / 378 | 102 / 104 |
| 8. | Sara Magnifico | Nazionale | Stile | LudoSport Alpha · Milano | 358 / 402 | 97 / 108 |
| 9. | Daniele Panizza | Nazionale | Arena | LudoSport Alpha · Torino | 400 / 362 | 108 / 98 |
| 10. | Marco Brondolo | Nazionale | Completo | LudoSport Alpha · Torino | 390 / 385 | 106 / 105 |
| 11. | Daniele Maggi | Nazionale | Completo | LudoSport Alpha · Milano | 385 / 385 | non reclutabile, 3.000 € |
| 12. | Enrico Giovanetti | Champion's | Arena | Ordine delle Onde · Genova | 810 / 730 | 128 / 116 |
| 13. | Francesco D'Addosio | Champion's | Completo | LudoSport Roma | 820 / 820 | 125 / 125 |
| 14. | Jacopo Viola | Champion's | Stile | LudoSport Roma | 755 / 835 | 115 / 127 |
| 15. | Pierluigi Chimienti | Champion's | Arena | LudoSport Aemilia · Modena | 790 / 715 | 124 / 112 |
| 16. | Marcello Lovo | Champion's | Stile | LudoSport Aemilia · Bologna | 740 / 820 | 112 / 124 |
| 17. | Simone Pedrazzi | Champion's | Stile | LudoSport Aemilia · Modena | 760 / 840 | 116 / 128 |
| 18. | Debora Girelli | Chronicles | Stile | LudoSport Alpha · Milano | 995 / 1.105 | 126 / 140 |
| 19. | Andrea Pini | Chronicles | Arena | Ordine delle Onde · Genova | 1.160 / 1.040 | 143 / 129 |
| 20. | Antonio Rocchitelli | Chronicles | Arena | LudoSport Alpha · Milano | 1.210 / 1.090 | 146 / 132 |
| 21. | Ugo Cesare Tonelli | Chronicles | Completo | LudoSport Alpha · Milano | 1.195 / 1.205 | 142 / 142 |
| 22. | Paolo Scalzulli | Chronicles | Completo | LudoSport Alpha · Milano | 1.250 / 1.250 | 145 / 145 |
| 23. | Carlos Jiménez Moyano | Chronicles | Completo | LudoSport Spain (Spagna) | 1.305 / 1.295 | 148 / 148 |
| 24. | Lorenzo Ferrario | Chronicles | Completo | LudoSport Alpha · Milano | 1.500 / 1.500 | 160 / 160 |

Come avversari esterni mantengono sempre valore da torneo, Forme ed esperienza
del livello. Se si disiscrivono e tornano, ripartono da quanto conservato.

## 15. Interfaccia

Viene aggiunta l'area `Tornei`, composta da:

- Stagione;
- Partecipanti;
- Torneo;
- Albo d'Oro.

### 15.1 Stagione

Mostra calendario, stato dei quattro tornei e avanzamento verso i sei idonei allo Scolastico.

Stati previsti:

- in attesa;
- qualificato;
- non qualificato;
- sospeso per idonei insufficienti;
- completato.

### 15.2 Partecipanti

Per gli atleti della scuola mostra:

- Forma;
- esperienza;
- Arena e Stile base, oppure `???` prima del Corso X;
- preparazione visibile dopo Corso X;
- origine della qualificazione;
- immunità;
- podi precedenti.

### 15.3 Risultati

Il torneo viene simulato e salvato automaticamente. I dettagli completi restano
consultabili soltanto per l'ultima stagione competitiva. Un nuovo risultato
dello stesso livello e della stessa stagione sovrascrive il precedente; delle
Chronicles viene conservato soltanto il risultato più recente. Il giocatore può
consultare:

- riepilogo;
- gironi;
- tabellone Arena;
- classifica Stile;
- dettaglio incontri;
- condizione generale;
- qualificati e ripescaggi;
- premi.

In tutte le viste dei tornei, il nome di ogni atleta conserva il colore della
propria rarità ed è accompagnato dal badge della scuola di appartenenza. Il
badge della scuola del giocatore usa il blu principale dell'applicazione; le
scuole esterne usano un badge neutro. Il badge mostra soltanto il nome
dell'Ordine, senza aggiungere la città; passando il mouse sul badge, un tooltip
indica la città o le città della scuola.

Prima dell'incontro le probabilità vengono espresse qualitativamente:

- nettamente sfavorito;
- sfavorito;
- equilibrato;
- favorito;
- nettamente favorito.

### 15.4 Albo d'Oro

L'Albo d'Oro è uno storico permanente ma volutamente minimale. Registra una
voce soltanto quando la scuola del giocatore vince Arena o Stile e conserva:

- stagione;
- torneo;
- nome del vincitore Arena, se appartiene alla scuola;
- nome del vincitore Stile, se appartiene alla scuola.

Non conserva partecipanti, podi completi, scuole avversarie, punteggi, Forme o
esperienza. L'appartenenza alla scuola viene determinata dall'ID dell'iscritto,
non dal nome testuale della scuola.

## 16. Ordine di risoluzione

Alla fine di ogni torneo:

1. vengono salvati incontri e classifiche;
2. vengono determinati i due podi;
3. in base agli iscritti attivi vengono assegnate 6 o 12 posizioni;
4. le posizioni vengono divise equamente tra Arena e Stile, senza duplicati;
5. vengono aggiornate le immunità;
6. i partecipanti ricevono +1 esperienza;
7. vengono assegnati premi e trofei;
8. vengono create eventuali prove segrete;
9. viene inviata la notifica.

Roster, tiri e risultati usano il seed persistente del gioco. Ricaricare lo stesso salvataggio non deve permettere di cambiare il risultato.

## 17. Prestigio

### Confermato

Vincere la Champion's Arena in Arena oppure in Stile con la scuola attuale è un requisito aggiuntivo per poter fondare una nuova scuola. Gli altri requisiti esistenti rimangono.

Una vittoria ottenuta da una scuola precedente non soddisfa il requisito della scuola attuale.

### Aperto

Il comportamento complessivo del prestigio deve rimanere aperto. Non implementare ancora decisioni definitive riguardo a:

- quali dettagli dei tornei persistono dopo la fondazione;
- destino degli atleti e dei Leggendari Segreti iscritti;
- trasferimento o archiviazione delle qualificazioni;
- reset o mantenimento del calendario;
- compressione dello storico;
- eventuali trasferimenti tra scuole della rete.

L'implementazione deve isolare lo stato competitivo della scuola dallo stato globale in modo che queste politiche possano essere aggiunte senza riscrivere il simulatore.

## 18. Strategia d'implementazione

Moduli previsti:

- configurazione e cataloghi tornei;
- formule pure per statistiche e voti;
- generazione deterministica di NPC;
- simulazione gironi e tabellone;
- classifiche e qualificazioni;
- calendario e orchestrazione;
- premi e immunità;
- profili Leggendari Segreti;
- selettori UI;
- componenti dell'area Tornei;
- migrazione e validazione salvataggio;
- simulatore Monte Carlo separato dai flussi runtime.

I log completi degli incontri devono restare separati dai riepiloghi permanenti, così una futura politica di archiviazione del prestigio potrà essere scelta senza modificare il formato dei risultati.

## 19. Criteri di accettazione iniziali

- ogni nuovo iscritto riceve statistiche deterministiche rispetto al seed;
- Corso X ne controlla soltanto la visibilità;
- Forme ed esperienza producono i moltiplicatori approvati;
- nessun progresso avviene mentre il gioco è chiuso;
- l'area Tornei si sblocca al raggiungimento di sei iscritti;
- lo Scolastico parte con almeno sei idonei e include tutti;
- i tornei superiori contengono fino a dodici atleti della scuola, NPC e
  eventuali posti vacanti fino a un campo nominale di 64;
- Arena usa incontri al meglio dei tre, la finale per il 1° e 2° posto al meglio dei cinque;
- Stile mostra medie a tre decimali;
- vengono prodotti 6 o 12 qualificati distinti, divisi equamente tra Arena e
  Stile con i consueti ripescaggi;
- i qualificati possono essere rimossi manualmente, ma il loro posto rimane
  vacante fino al torneo di destinazione;
- premi e +1 esperienza vengono assegnati una sola volta;
- i risultati sono stabili dopo ricaricamento;
- Palena e Todaro usano i profili canonici;
- la prova segreta dura 30 secondi di gioco attivo;
- i parametri Monte Carlo rispettano gli obiettivi entro una tolleranza dichiarata;
- le scelte ancora aperte sul prestigio non vengono anticipate nel codice.

## 20. Chronicles of Ludosport

Le Chronicles sono un torneo segreto fuori calendario e avviato manualmente.

- una chiave viene assegnata soltanto quando la stessa edizione della Champion's Arena viene vinta dalla scuola sia in Arena sia in Stile;
- le chiavi persistono e possono essere usate in qualsiasi momento;
- ogni chiave avvia una singola edizione e richiede la selezione manuale di esattamente sei atleti idonei;
- non si puÃ² avviare un'altra edizione mentre esiste una sfida leggendaria attiva;
- il tabellone contiene 64 partecipanti, inclusi tutti i Leggendari Segreti di livello Chronicles ancora esterni;
- gli avversari generati hanno preparazione media 1.000, mentre i Leggendari Segreti vanno da circa 1.050 (Girelli) a 1.500 (Ferrario);
- i Leggendari gareggiano con il loro valore da torneo; vinti, entrano con il valore base, tutte le Forme ed esperienza 0. Ordine di forza: Girelli, Pini, Rocchitelli, Tonelli, Scalzulli, Jiménez Moyano, Ferrario;
- un Leggendario giÃ  iscritto Ã¨ un'istanza unica: non puÃ² ricomparire tra gli avversari.

Ogni titolo Chronicles conquistato dalla scuola, Arena o Stile, assegna un tentativo completo contro il Leggendario disponibile piÃ¹ debole. A paritÃ  di forza la scelta Ã¨ casuale e deterministica rispetto al seed.

La sfida usa carta, forbice e sasso al meglio delle tre mani decisive. I pareggi vengono rigiocati. Se sono disponibili due tentativi e il primo viene perso, il secondo usa lo stesso Leggendario; se il primo viene vinto, il secondo passa al prossimo Leggendario disponibile. Una sconfitta senza altri tentativi lascia il Leggendario esterno per una futura edizione.

La vittoria iscrive immediatamente il Leggendario come atleta e collaboratore permanente, senza email o prova in palestra. Oltre alla normale iscrizione, assegna 500 punti Fama alla scuola.
