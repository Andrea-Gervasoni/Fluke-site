# Fluke — sito

Sito statico, senza build. Si apre con qualunque server statico e va bene su GitHub Pages.

## Provarlo in locale
```
node tests/serve.mjs 4181
```
Poi apri http://127.0.0.1:4181/ . Con `?test=1` salti apertura e scroll morbido (utile per gli screenshot).

## File da caricare su GitHub (tutti, con le cartelle)
```
index.html
404.html
manifest.webmanifest
css/style.css
js/main.js  js/ui.js  js/liquid.js  js/inside.js  js/what.js  js/services.js  js/svc-screen.js  js/director.js  js/stage.js  js/world.js  js/data.js  js/screen-art.js
js/scenes/mac.js  js/scenes/props.js  js/scenes/loupe.js  js/scenes/method-objects.js  js/scenes/typewriter.js  js/scenes/lamp.js
vendor/three.module.min.js  vendor/gsap.min.js  vendor/lenis.min.js
vendor/addons/RoundedBoxGeometry.js  vendor/addons/RoomEnvironment.js
fonts/ (tutta la cartella: Anton, General Sans 400/500/600, Bodoni Moda tondo e corsivo; fluke-pixel.woff non serve più)
assets/  (tutta la cartella: logo, favicon, icone, og.jpg)
```
Non servono online: `tests/`, `DESIGN.md`, `README.md`, `.claude/`.

## Come è fatto
- Le sezioni senza 3D (What we do, Fluke check, FAQ) hanno uno sfondo pieno: mentre coprono lo schermo la camera cambia posto e il colore di pagina cambia, così non si vede mai un salto.
- Una sola scena Three.js per tutta la pagina (`js/stage.js`), guidata dallo scroll (`js/director.js`).
- Tutti gli oggetti 3D sono generati in codice (`js/scenes/`), nessun modello scaricato.
- Font e librerie sono in locale (nessuna richiesta a CDN o Google Fonts).
- Il menu e i bottoni sono in liquid glass: la rifrazione ai bordi funziona in Chrome/Edge; Safari e Firefox mostrano un vetro smerigliato pulito.
- Il grafico è illustrativo: 24 curve sintetiche a deriva zero (`js/data.js`), la "vincitrice" è scelta come la sceglierebbe una ricerca sovra-adattata.

## Prima di pubblicare (parte legale e tecnica)
**Guida completa passo passo: `PUBBLICAZIONE.md`** (dominio usefluke.it, Cloudflare gratis, email). Nome, dominio ed email sono già compilati; manca solo l'indirizzo dell'articolo 1 su Medium (`node tools/set-legal.mjs --article1 https://medium.com/...`): finché manca, il controllo di lancio si ferma. Poi `node tools/make-upload.mjs` crea la cartella da caricare.

1. **Dominio ed email** (es. `hello@` e `privacy@`). Poi, una volta sola:
   `node tools/set-legal.mjs --name "Nome Cognome" --address "Via…, CAP Città, Italia" --domain tuodominio.com --hello hello@tuodominio.com --hosting "GitHub Pages (GitHub, Inc.)" --article1 https://medium.com/...`
   Compila nome, indirizzo, dominio e email in tutte le pagine, in sitemap, robots, security.txt e crea `CNAME` per GitHub Pages.
2. `node tests/launch-check.mjs` deve finire con "ready to publish" (nessun segnaposto giallo, pagine legali collegate, nessun cookie, CSP coerente).
3. **Statistiche**: Cloudflare Web Analytics, gratis e senza cookie. Si accende con un clic in Cloudflare Pages → Settings → Web analytics → Enable (non serve codice).
4. **Avvisi**: nessun modulo e nessuna lista d'attesa. "Get notified" (Fluke Index) apre una mail a hello@usefluke.it: si conserva solo l'indirizzo, si scrive una volta quando l'Index apre, poi si cancella (vedi privacy.html).
5. **Hosting**: GitHub Pages va bene per partire ma non applica `_headers`. Per le intestazioni di sicurezza (HSTS, CSP) usa Cloudflare Pages (gratis) con dominio su Cloudflare.
6. **Fai leggere a un avvocato** `privacy.html`, `terms.html`, `legal-notice.html` (30–60 minuti di un avvocato digitale/fintech) prima del lancio, e chiedi un parere su come pubblicare punteggi legati a indirizzi di wallet (mai "insider", solo "suspicious").
7. **Partita IVA**: non serve, il sito è ricerca gratuita: niente abbonamenti, prezzi o vendite.
8. Prova su iPhone e Safari veri.

## Da completare
- **Link all'articolo 1** su Medium: `node tools/set-legal.mjs --article1 <url>` (6 link, compreso il research note). L'articolo 2 è "in progress": quando esce, aggiungere il link nel research note e nella chiusura.
- **Research log** (`js/what.js`, `LOG`): voci vere con data e stato (Planned / Running / Done). Aggiornarlo quando il lavoro avanza; mai risultati che non esistono.
- Gli esempi (34% della Check, wallet A–F dell'Index, i grafici dei quattro passi) sono illustrativi e dichiarati tali. I numeri delle ricerche hanno fonte e stato (Reported / Computed by us).
- I testi di "What we do" ("We study the whole search, not just the winner."), del Fluke check e delle FAQ sono scritti a partire dal brand kit: vanno confermati (soprattutto "Publishing" e "In progress").
- Un link di contatto o ai profili (LinkedIn) quando saranno pubblici: nel footer non c'è ancora.
- Se il dominio sarà diverso dalla radice, aggiornare `og:image` con l'URL assoluto.
