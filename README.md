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
npm run lint
npm run build
npm run test:e2e
```

Per la verifica rapida del bilanciamento a lungo termine:

```bash
npm run test:balance
```

La suite usa il tempo virtuale e lancia un batch configurabile di partite indipendenti per ciascun profilo (attualmente due seed intenso e due tranquillo); il batch è riutilizzabile con un numero arbitrario di seed senza attendere ore reali.

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
- attrezzatura, manutenzione, 47 potenziamenti e 100 modelli email;
- traguardi, eventi narrativi e protezione dalle serie sfortunate;
- pausa completa del gioco durante la chiusura, senza avanzamento offline;
- tornei automatici con classifiche Arena e Stile, qualificazioni e premi;
- fondazione di nuove scuole, reputazione e bonus permanenti di rete;
- salvataggi locali versionati, backup, migrazioni, export/import e reset con doppia conferma.

## Nota sui marchi

Questo progetto è un'opera indipendente e non è affiliato, sponsorizzato o approvato da Microsoft, Outlook, Windows, LudoSport o da altri titolari di marchi eventualmente citati. I nomi e i riferimenti sono usati esclusivamente a scopo descrittivo e parodistico; tutti gli indirizzi e i destinatari del gioco sono inventati.
