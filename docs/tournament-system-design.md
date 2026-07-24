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

Contano esclusivamente le Forme numeriche da 1 a 7. Corso X e Corso Y non assegnano bonus.

Ogni numero di Forma completato assegna `+10%`, applicato sempre alla statistica base. Imparare più rami dello stesso numero non assegna più volte il bonus.

```text
moltiplicatoreForme = 1 + 0,10 × numeroFormeNumericheDistinte
```

Il massimo attuale è `+70%`.

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

Ogni incontro è al meglio dei tre assalti. Vince chi raggiunge per primo due assalti, con risultato 2–0 oppure 2–1.

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

Entrambi gli atleti ricevono una valutazione Stile in ogni incontro, indipendentemente dal vincitore Arena.

```text
prestazioneStile = preparazioneStile
  × modificatoreCondizione
  × modificatoreIncontroStile
```

La prestazione viene convertita in un voto assoluto da 0 a 10:

```text
voto = 10 / (1 + e^(-(prestazioneStile - 125) / 50))
```

Il voto viene mostrato con esattamente tre decimali. Il calcolo della media usa il valore interno non arrotondato.

Valori indicativi:

| Prestazione | Voto |
|---:|---:|
| 50 | 1,824 |
| 100 | 3,775 |
| 125 | 5,000 |
| 150 | 6,225 |
| 200 | 8,176 |
| 250 | 9,241 |
| 300 | 9,707 |

La classifica finale Stile usa la media di tutte le valutazioni ottenute. Il numero di incontri non assegna un bonus diretto.

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

L'area Tornei si sblocca al raggiungimento di sei iscritti. Lo Scolastico si attiva con almeno sei iscritti attivi che abbiano completato Forma 1.

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

I valori non sono cancelli rigidi:

| Torneo | Standard competitivo |
|---|---:|
| Accademico | 125 |
| Nazionale | 150 |
| Champion's | 200 |

Curva indicativa desiderata nella statistica rilevante:

| Scarto dallo standard | Probabilità obiettivo |
|---:|---:|
| 0 | circa 3% |
| +10 | circa 9% |
| +20 | circa 24% |
| +24 | circa 33% |
| +30 | circa 50% |
| +40 | circa 75% |
| +50 | circa 90% |

Vincoli specifici:

- preparazione 224 alla Champion's: circa 33% di vittoria;
- preparazione 250 alla Champion's: fascia 88–92%;
- Forma 1 eccezionale può raggiungere il podio Accademico, ma vincere deve essere statisticamente trascurabile;
- Forma 5 inesperto può raggiungere la Champion's, ma il podio deve essere statisticamente trascurabile;
- Forma 4, base 100, esperienza 20 produce 224;
- Forma 7, esperienza 20 e basi alte deve essere il profilo favorito della competizione.

Queste percentuali sono obiettivi della simulazione completa, non formule che impongono il vincitore.

### 12.1 Baseline Monte Carlo dell'implementazione

Prima calibrazione con 500 Champion's indipendenti per valore, un atleta della scuola e il campo NPC completo:

| Preparazione | Vittoria Arena | Podio Arena |
|---:|---:|---:|
| 200 | 0,4% | 11,0% |
| 210 | 7,6% | 36,4% |
| 220 | 24,0% | 66,2% |
| 224 | 32,2% | 68,6% |
| 230 | 52,8% | 84,6% |
| 240 | 76,2% | 93,8% |
| 250 | 90,2% | 97,2% |

La baseline centra i vincoli espliciti 224≈33% e 250≈90%. A quota 200 la vittoria rimane eccezionale, ma la probabilità di podio è tangibile e rispetta l'obiettivo “200 per entrare in classifica”. Il probe deve rimanere eseguibile separatamente dai test rapidi.

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

Intervalli di preparazione nella statistica di qualificazione:

| Torneo | Ordinari | Contendenti | Favoriti | Élite |
|---|---:|---:|---:|---:|
| Accademico | 55–94 | 95–119 | 120–139 | 140–155 |
| Nazionale | 75–114 | 115–144 | 145–169 | 170–185 |
| Champion's | 100–154 | 155–189 | 190–214 | 215–230 |

I posti vengono divisi in modo uniforme tra qualificati principalmente Arena e principalmente Stile. La statistica secondaria viene generata liberamente; i profili bilanciati emergono senza una categoria artificiale.

Nei tornei successivi gli NPC aggiuntivi necessari a sostituire i posti non conquistati dalla scuola vengono distribuiti proporzionalmente tra le quattro fasce, mantenendo almeno due profili Élite.

### 13.2 Popolazioni candidate

| Torneo | Comune | Raro | Ultra Raro | Forme | Esperienza |
|---|---:|---:|---:|---|---:|
| Accademico | 65% | 30% | 5% | F1–F4 | 1–6 |
| Nazionale | 35% | 50% | 15% | F3–F6 | 5–14 |
| Champion's | 40% | 52% | 8% | F4–F7 | 7–17 |

Le percentuali descrivono i candidati. La selezione per fascia può far emergere più rarità elevate nei posti superiori senza modificare direttamente il tiro base.

**Da calibrare:** composizione finale, coefficiente Arena e probabilità di profili oltre 230. La prima implementazione deve includere una simulazione ripetibile che produca un report delle probabilità.

## 14. Leggendari Segreti

I Leggendari Segreti sono persone uniche e persistenti, normalmente reclutabili.
Il colore semantico della rarità è marrone; la tonalità esatta deve rispettare
il contrasto dell'interfaccia.

Un profilo può fare riferimento all'ID di una scuola del catalogo e apparire
soltanto nel livello del circuito assegnato a quella scuola. Un profilo ancora
privo di scuola resta registrato ma non entra in alcun torneo. Al massimo un
Leggendario Segreto appare nello stesso torneo.

Condizione di sconfitta:

- specialista Arena: battuto direttamente da un atleta della scuola;
- specialista Stile: superato nella classifica Stile da un atleta della scuola;
- profilo completo: è sufficiente una delle due condizioni.

Non conta una sconfitta inflitta da un'altra scuola.

### 14.1 Prova automatica

Alla fine del torneo, un Leggendario Segreto sconfitto avvia automaticamente una prova di 150 secondi nella scuola:

Un profilo può disabilitare la prova con la regola `recruitment: "never"`.
Daniele Maggi usa questa eccezione: resta sempre esterno e ogni sconfitta dona
30 Euro alla scuola, senza creare contatti o prove.

Una nuova prova dello stesso Leggendario Segreto riutilizza il contatto esistente, senza crearne un doppione.

```text
sconfitta → fine torneo → prova automatica 150 s → iscrizione o rifiuto
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

### 14.2 Profili iniziali

#### Marco Palena

- rarità: Leggendario Segreto;
- colore: marrone;
- città: Torino;
- Accademia: Alpha;
- Forma NPC: 4;
- esperienza NPC fissa: 5;
- Arena base: 75;
- Stile base: 90;
- preparazione Arena NPC: 120,750;
- preparazione Stile NPC: 144,900;
- specialità: Stile.

#### Lorenzo Todaro

- rarità: Leggendario Segreto;
- colore: marrone;
- città: Milano;
- Accademia: Alpha;
- Forma NPC: 5;
- esperienza NPC fissa: 5;
- Arena base: 80;
- Stile base: 80;
- preparazione Arena NPC: 138,000;
- preparazione Stile NPC: 138,000;
- specialità: completo.

Come NPC esterni mantengono sempre Forma ed esperienza canoniche, indipendentemente dalle apparizioni.

Quando si iscrivono partono da esperienza 5 e la aumentano partecipando ai tornei della scuola. Se si disiscrivono tornano alla Forma canonica e a esperienza 5.

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

Il torneo viene simulato e salvato automaticamente. Il giocatore può consultare:

- riepilogo;
- gironi;
- tabellone Arena;
- classifica Stile;
- dettaglio incontri;
- condizione generale;
- qualificati e ripescaggi;
- premi.

Prima dell'incontro le probabilità vengono espresse qualitativamente:

- nettamente sfavorito;
- sfavorito;
- equilibrato;
- favorito;
- nettamente favorito.

### 15.4 Albo d'Oro

Ogni podio registra:

- atleta;
- scuola;
- stagione;
- torneo;
- posizione;
- Arena o Stile;
- Forma ed esperienza al momento;
- valutazione o risultato finale.

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
- Arena usa incontri al meglio dei tre;
- Stile mostra medie a tre decimali;
- vengono prodotti 6 o 12 qualificati distinti, divisi equamente tra Arena e
  Stile con i consueti ripescaggi;
- i qualificati possono essere rimossi manualmente, ma il loro posto rimane
  vacante fino al torneo di destinazione;
- premi e +1 esperienza vengono assegnati una sola volta;
- i risultati sono stabili dopo ricaricamento;
- Palena e Todaro usano i profili canonici;
- la prova segreta dura 150 secondi di gioco attivo;
- i parametri Monte Carlo rispettano gli obiettivi entro una tolleranza dichiarata;
- le scelte ancora aperte sul prestigio non vengono anticipate nel codice.

## 20. Chronicles of Ludosport

Le Chronicles sono un torneo segreto fuori calendario e avviato manualmente.

- una chiave viene assegnata soltanto quando la stessa edizione della Champion's Arena viene vinta dalla scuola sia in Arena sia in Stile;
- le chiavi persistono e possono essere usate in qualsiasi momento;
- ogni chiave avvia una singola edizione e richiede la selezione manuale di esattamente sei atleti idonei;
- non si puÃ² avviare un'altra edizione mentre esiste una sfida leggendaria attiva;
- il tabellone contiene 64 partecipanti, inclusi tutti i Leggendari Segreti senza scuola ancora esterni;
- gli avversari generati hanno preparazione media 1.000, mentre i Leggendari Segreti hanno media circa 1.200;
- i valori di catalogo dei Leggendari sono valori effettivi nelle Chronicles, senza ulteriori moltiplicatori;
- un Leggendario giÃ  iscritto Ã¨ un'istanza unica: non puÃ² ricomparire tra gli avversari.

Ogni titolo Chronicles conquistato dalla scuola, Arena o Stile, assegna un tentativo completo contro il Leggendario disponibile piÃ¹ debole. A paritÃ  di forza la scelta Ã¨ casuale e deterministica rispetto al seed.

La sfida usa carta, forbice e sasso al meglio delle tre mani decisive. I pareggi vengono rigiocati. Se sono disponibili due tentativi e il primo viene perso, il secondo usa lo stesso Leggendario; se il primo viene vinto, il secondo passa al prossimo Leggendario disponibile. Una sconfitta senza altri tentativi lascia il Leggendario esterno per una futura edizione.

La vittoria iscrive immediatamente il Leggendario come atleta e collaboratore permanente, senza email o prova in palestra. Oltre alla normale iscrizione, assegna 500 punti Fama alla scuola.
