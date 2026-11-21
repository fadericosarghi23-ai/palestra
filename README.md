# starfit+

Scheda di allenamento per terzino (1,85 m · 85 kg): 3 sedute in palestra, 2 in campo, attivazione il giorno prima della partita e mobilità ogni giorno. Dal 23 novembre 2026 al 14 febbraio 2027.

Funziona come app sull'iPhone: si installa sulla schermata Home e si apre anche offline.

## Cosa contiene

- account personali: si accede una volta e il telefono resta collegato
- 38 esercizi con video YouTube, animazione, passi ed errori da evitare
- modifica degli esercizi per ogni giorno: serie, recupero, note, ordine, aggiunta e rimozione
- contatore delle serie con timer di recupero automatico
- timer di recupero rapido (30″–3′) e cronometro con giri
- calendario di 12 settimane con settimane di scarico e test
- registro dei test, alimentazione e regole

Scheda modificata, serie fatte, test e preferenze sono salvati nell'account. Senza rete si salvano sul telefono e partono appena torna la connessione.

Tutto gira sul piano gratuito di Netlify (Functions e Blobs): non serve nessun acquisto.

## Struttura

```
public/                 il sito: è l'unica cartella pubblicata
  index.html            pagina e stile
  app.js                interfaccia e modifica esercizi
  account.js            accesso e salvataggio nell'account
  data.js               esercizi e settimana di base
  videos.js             video YouTube per esercizio
  anim.js               animazioni degli esercizi
  timer.js              timer di recupero e cronometro
  sw.js                 funzionamento offline
lib/api-core.mjs        logica degli account (usata online e sul PC)
netlify/functions/      funzione /api/* di Netlify
admin.mjs               creare e gestire gli account dal PC
netlify.toml            configurazione di Netlify
server.js               server per provarlo sul PC
```

## Pubblicare su Netlify

1. Su [app.netlify.com](https://app.netlify.com) scegli **Add new site → Import an existing project → GitHub** e seleziona questo repository.
2. Netlify legge da solo `netlify.toml`: cartella `public`, nessun comando di build, funzioni in `netlify/functions`. Premi **Deploy**.
3. Apri l'indirizzo `https://….netlify.app` su Safari dall'iPhone, tocca **Condividi → Aggiungi alla schermata Home**.

Ogni `git push` su `main` aggiorna il sito da solo.

## Account

Dal sito si può solo **accedere**: gli account si creano dal PC con `admin.mjs`.

### Da fare una volta: la chiave segreta

Il file `admin.key` (solo sul PC, mai su GitHub) contiene la chiave di amministrazione. La stessa chiave va messa su Netlify:

1. **Project configuration → Environment variables → Add a variable**
2. Key: `STARFIT_ADMIN_KEY` · Value: il contenuto di `admin.key`
3. **Deploys → Trigger deploy → Deploy site**, così la funzione legge la chiave.

Se `admin.key` manca, creane una nuova con:

```
node -e "require('fs').writeFileSync('admin.key', require('crypto').randomBytes(32).toString('base64url'))"
```

e aggiornala anche su Netlify.

### Comandi

```
node admin.mjs elenco --sito https://tuosito.netlify.app
node admin.mjs crea federico --sito https://tuosito.netlify.app
node admin.mjs password federico --sito https://tuosito.netlify.app
node admin.mjs elimina federico --sito https://tuosito.netlify.app
```

La password viene chiesta nel terminale e non si vede mentre la scrivi. Ogni nuovo account parte con la scheda completa. Senza `--sito` i comandi lavorano sul server locale.

## Provarlo sul PC

```
node server.js
```

Poi apri `http://localhost:8080`. Il server stampa anche l'indirizzo da usare sul telefono collegato alla stessa rete Wi-Fi. Gli account del PC sono salvati in `data/` e sono separati da quelli online.
