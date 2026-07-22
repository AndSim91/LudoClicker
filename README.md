# Oggetto: Nuovi Iscritti

Incremental game browser completo basato sul [Game Design Document](./GAME_DESIGN_DOCUMENT.md), presentato come una sobria applicazione di posta e organizzazione.

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
- Eventi con sparring gratuito e dimostrazione programmata;
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

Questo progetto è un'opera indipendente e non è affiliato, sponsorizzato o approvato da Microsoft, Outlook, Windows, LudoSport o da altri titolari di marchi eventualmente citati. I nomi e i riferimenti sono usati esclusivamente a scopo descrittivo e parodistico; tutti gli indirizzi e i destinatari del gioco sono inventati.
