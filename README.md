# Progetto Missile

Scheda di allenamento per terzino (1,85 m · 85 kg): 3 sedute in palestra, 2 in campo, attivazione il giorno prima della partita e mobilità ogni giorno. Dal 23 novembre 2026 al 14 febbraio 2027.

Funziona come app sull'iPhone: si installa sulla schermata Home e si apre anche offline.

## Cosa contiene

- 38 esercizi con video YouTube, animazione, passi ed errori da evitare
- contatore delle serie con timer di recupero automatico
- timer di recupero rapido (30″–3′) e cronometro con giri
- calendario di 12 settimane con settimane di scarico e test
- registro dei test, alimentazione e regole

Serie fatte, test e preferenze restano salvati solo sul telefono.

## Struttura

```
public/          il sito: è l'unica cartella pubblicata
  index.html     pagina e stile
  app.js         interfaccia
  data.js        esercizi e settimana
  videos.js      video YouTube per esercizio
  anim.js        animazioni degli esercizi
  timer.js       timer di recupero e cronometro
  sw.js          funzionamento offline
netlify.toml     configurazione di Netlify
server.js        server per provarlo sul PC
```

## Pubblicare su Netlify

1. Su [app.netlify.com](https://app.netlify.com) scegli **Add new site → Import an existing project → GitHub** e seleziona questo repository.
2. Netlify legge da solo `netlify.toml`: cartella da pubblicare `public`, nessun comando di build. Premi **Deploy**.
3. Apri l'indirizzo `https://….netlify.app` su Safari dall'iPhone, tocca **Condividi → Aggiungi alla schermata Home**.

Ogni `git push` su `main` aggiorna il sito da solo. Le modifiche arrivano sull'app installata alla riapertura successiva.

## Provarlo sul PC

```
node server.js
```

Poi apri `http://localhost:8080`. Il server stampa anche l'indirizzo da usare sul telefono collegato alla stessa rete Wi-Fi.
