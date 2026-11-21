# starfit+

App di allenamento con account personali: ogni account ha il suo programma. Dal 23 novembre 2026 al 14 febbraio 2027.

| Programma | id | Per chi |
|---|---|---|
| Terzino | `terzino` | 3 palestre + 2 campo + attivazione pre-partita: velocità, forza nei contrasti, meno grasso |
| Glutei, addome e schiena | `glutei` | 3 palestre (lun, mer, ven) + riposo e mobilità: glutei, addome e schiena senza stravolgere il fisico |

Funziona come app sull'iPhone: si installa sulla schermata Home e si apre anche offline.

## Cosa contiene

- account personali: si accede una volta e il telefono resta collegato
- oltre 1.000 esercizi divisi in 19 aree (velocità, agilità, glutei, core, mobilità…), con passi, errori da evitare, attrezzo, livello e video YouTube; ricerca e filtro «Per te»
- «Cambia esercizio»: propone alternative che allenano gli stessi muscoli
- diario facoltativo di ogni allenamento: se scrivi che un esercizio non ti piace, propone come sostituirlo
- modifica degli esercizi per ogni giorno: serie, recupero, note, ordine, aggiunta e rimozione
- contatore delle serie con timer di recupero automatico
- timer di recupero rapido (30″–3′) e cronometro con giri
- calendario di 12 settimane con settimane di scarico e test
- partita la domenica o il sabato (scheda terzino): la settimana si riorganizza da sola
- diario del peso giornaliero con grafico
- diario del cibo: alimenti comuni con stima di calorie e macro, anche dall'etichetta, e consigli su cosa mangiare per completare la giornata
- registro dei test, alimentazione e regole

Scheda modificata, serie fatte, peso, cibo, test e preferenze sono salvati nell'account. Senza rete si salvano sul telefono e partono appena torna la connessione.

Tutto gira sul piano gratuito di Netlify (Functions e Blobs): non serve nessun acquisto.

## Struttura

```
public/                 il sito: è l'unica cartella pubblicata
  index.html            pagina e stile
  app.js                interfaccia e modifica esercizi
  account.js            accesso e salvataggio nell'account
  data.js               esercizi e programmi (terzino, glutei)
  food.js               alimenti con valori per 100 g
  library.js            libreria completa degli esercizi
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
node admin.mjs programmi
node admin.mjs elenco --sito https://starfitplus.netlify.app
node admin.mjs crea elisa --programma glutei --sito https://starfitplus.netlify.app
node admin.mjs programma elisa terzino --sito https://starfitplus.netlify.app
node admin.mjs password elisa --sito https://starfitplus.netlify.app
node admin.mjs elimina elisa --sito https://starfitplus.netlify.app
```

La password viene chiesta nel terminale e non si vede mentre la scrivi. Senza `--programma` l'account parte con il programma `terzino`. Il comando `programma` cambia scheda a un account esistente (serve la sua password) e azzera serie e modifiche della scheda vecchia. Senza `--sito` i comandi lavorano sul server locale.

## Provarlo sul PC

```
node server.js
```

Poi apri `http://localhost:8080`. Il server stampa anche l'indirizzo da usare sul telefono collegato alla stessa rete Wi-Fi. Gli account del PC sono salvati in `data/` e sono separati da quelli online.
