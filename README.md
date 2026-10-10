# LudoClicker

*Un incremental game dell'Ordine delle Onde*

Incremental game per browser, basato sul [Game Design Document](./GAME_DESIGN_DOCUMENT.md), che racconta cosa vuol dire far crescere una scuola di LudoSport: dalla prima email d'invito fino a una rete di scuole con i più grandi campioni della storia.

È un omaggio a LudoSport, un gesto d'amore per lo sport e per la sua comunità: lo ha fatto un iscritto che si prende un po' in giro, per far conoscere il mondo LudoSport dentro e fuori le sue mura.

La veste del gioco è la **Modalità Onde**. Con **F9** il gioco si traveste da Outlook per Windows (**Modalità Outlook**), così si può continuare a giocare anche quando qualcuno guarda lo schermo.

## Avvio

```bash
npm install
npm run dev
```

## Verifica

```bash
npm test
```

`npm test` esegue in sequenza lint, test unitari Vitest, build TypeScript/Vite e
test end-to-end Playwright su Chromium. Gli scenari browser usano un
salvataggio di gioco deterministico costruito dagli stessi moduli di produzione,
così coprono caricamento, interazioni e persistenza senza dipendere da dati
personali o da un salvataggio locale esistente.

Al primo utilizzo, se Chromium non è già disponibile per la versione installata
di Playwright:

```bash
npx playwright install chromium
```

Il gioco non invia email e non accede a servizi esterni: destinatari, messaggi e progressi sono simulati e salvati esclusivamente in `localStorage`.

## Funzioni disponibili

- composizione incrementale e invio automatico delle campagne;
- Posta in arrivo con stato letto/non letto;
- Posta inviata cliccabile con stato del funnel;
- shop Upgrade con entrate previste al minuto;
- Eventi con volantinaggio gratuito e dimostrazione programmata;
- conversione contatto → prova → iscritto → quote;
- collaboratori, assegnazioni automatiche, Social e percorso delle Forme;
- maestria dei collaboratori per ruolo, con cinque gradi e notifiche di avanzamento;
- attrezzatura, manutenzione, 52 potenziamenti e 100 modelli email;
- traguardi, eventi narrativi e protezione dalle serie sfortunate;
- pausa completa del gioco durante la chiusura, senza avanzamento offline;
- tornei automatici con classifiche Arena e Stile, qualificazioni e premi;
- fondazione di nuove scuole, reputazione e bonus permanenti di rete;
- salvataggi locali versionati, backup, migrazioni, export/import e reset con doppia conferma.

## Nota sui marchi

Questo progetto è un'opera indipendente e non è affiliato, sponsorizzato o approvato da Microsoft, Outlook, Windows, LudoSport o da altri titolari di marchi eventualmente citati. I riferimenti a LudoSport sono un omaggio allo sport; quelli a Outlook e Windows servono solo al camuffamento della Modalità Outlook; tutti gli indirizzi e i destinatari del gioco sono inventati.
