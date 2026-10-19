# FLUKE — DESIGN.md

## Idea centrale (una frase)
**Fluke è la scrivania di un analista del 1984: un computer compatto mostra il backtest che vince, e una lente (la "f" del logo) rivela tutta la ricerca che c'è dietro.**

Direzione: **A · Scrivania 1984**. Sullo schermo del computer c'è la sua interfaccia del 1984 (1-bit, menu, finestra, icone), disegnata nitida a ×2: è il pezzo che Andrea ama di più. Attraverso la lente la stessa finestra diventa a colori e mostra tutta la ricerca.
Lingua: solo inglese (copy del brand kit). Niente foto di persone: solo oggetti 3D generati in codice.

## Tredicesimo giro (2026-10-18): l'istruzione non imita un pulsante
La pillola blu "Click the three icons…" sembrava premibile e imitava il vero Continue. Ora è una **finestra dell'interfaccia vecchia** (`js/svc-win.js`): 1-bit, barra del titolo a righe con quadratino di chiusura, "HOW TO", ombra dura, testo con lo stesso font a pixel dello schermo, tre quadratini che si riempiono di blu man mano che apri le app e un contatore; a tre aperte dice "ALL THREE OPENED / NOW PRESS CONTINUE" con una freccia in giù verso il vero pulsante. Si muove pochissimo in 3D (±2 px, ±2° in 9 s, `prefers-reduced-motion` la ferma). Regola: ciò che non si preme non deve somigliare a ciò che si preme.

## Dodicesimo giro (2026-10-18): fasce di Safari sempre trasparenti, scorrimento più dolce
- **Fasce sopra e sotto trasparenti**, come sul portfolio: Safari 26 colora le fasce dietro le barre con lo sfondo di ogni elemento fixed/sticky largo ≥90% che tocca il bordo; se è trasparente ne fotografa il colore una volta e lo tiene (la fascia beige sopra il blu). Ora `.nav`, `.winner-pin`, `.services-pin`, `.method-stick`, `.end-pin` sono `visibility:hidden` con figli `visibility:visible` (il contenitore viene saltato); anche il blu di Method (`#wipe`) è un figlio (`<i>`) di un contenitore nascosto. La pagina scorre sotto le barre a tutto schermo.
- **Scorrimento più lento e più dolce** (più respiro per raccontare): Lenis `lerp: .065` (prima durata 1,15 s), rotella ×0,8; ancore e Continue 2,4–2,6 s con easing a S (`lerp: 0` per usare la durata); camera con smorzamento più morbido (3,8 invece di 6) e interpolazione tra le inquadrature `smoother` (velocità e accelerazione zero agli estremi); sezioni più lunghe: idea 130svh, dentro il Mac 500vh, servizi 215vh (200 su telefono), Method 680vh, note 170svh, finale 340vh.

## Undicesimo giro (2026-10-18): iPhone vero (Safari 26)
Screenshot di Andrea su iPhone: (1) pagina Mac a tutto schermo e 3D che finivano prima del bordo basso quando le barre di Safari si ritirano; (2) fascia beige sopra le sezioni blu; (3) servizi su telefono: testo sotto il pulsante Continue, schermo affollato.
- **Altezze**: lo stage 3D e la pagina Mac (`#inside`, `.crt`, `.inside-ui`) sono alti `100lvh` (viewport grande, barre ritirate); l'inquadratura è calcolata sulla viewport piccola `100svh` (sonda `position:fixed;height:100svh` in `world.js`), che non cambia quando le barre vanno e vengono. `camera.setViewOffset(w, svh, …, w, lvh)` estende l'immagine sotto. Il `vh` del director è la stessa altezza piccola (prima era `innerHeight`, che salta con le barre). Il pin della pagina Mac non taglia più in basso (`overflow-y: visible`). Prova: `?svh=700` simula barre da 144 px.
- **Colore sotto la barra**: `html` e `<meta name="theme-color">` prendono lo stesso colore di `body` a ogni sezione (Safari 26 tinge la striscia sotto le barre con lo sfondo di `html`).
- **Servizi su telefono**: la finestra dell'app si apre al centro e le icone si ritirano (`setCompact`); testo più compatto, area di lettura che scorre da sola se serve (`min-height:0; overflow:auto`) e Continue sempre sotto, mai sovrapposto.

## Decimo giro (2026-10-18): il bordo del vetro, disegnato una volta
Il vetro del menu e dei pulsanti scuri importanti ha di nuovo un bordo "rifratto", ma **precalcolato**, senza filtri a ogni frame: frangia rosa a sinistra e blu a destra, bevel chiaro sopra e scuro sotto, banda interna tipo lente, gradienti di riflesso alle estremità (`.lg-nav`, `.btn--liquid`). Il 3D non può piegare ciò che sta dietro il menu perché dietro c'è quasi sempre testo HTML: per questo la rifrazione "vera" resta solo sulla goccia di What. Misurato nel Chrome di Andrea: 16,5 ms (60 fps) in hero, What, Method.

## Nono giro (2026-10-18): fluidità misurata sul Mac di Andrea (Apple M4, retina)
Misurato nel suo Chrome (non in headless): tempo tra due frame in scroll e da fermo, con prove A/B che nascondono un pezzo alla volta. Prima: Method 31 ms, What 33–39 ms, servizi 43–47 ms, hero 25–30 ms. Dopo: **16,5 ms in ogni sezione, qualità piena, 60 fps**.
- **Alone luminoso del titolo di Method** (`text-shadow` con sfocatura enorme su lettere giganti, ridisegnato a ogni frame): tolto. −13 ms.
- **Bordo luminoso del vetro** (`.lg::before`, gradiente conico con maschera): veniva riscritto a ogni frame di scroll (`--rim`). Ora solo se il puntatore si muove e solo se l'angolo cambia di mezzo grado, su un livello a parte. −15 ms in What.
- **Ombre sfocate larghe sui pannelli** (44 px, inset sfocati): ora ombre corte e riflessi a gradiente. −8 ms.
- **Rifrazione SVG dentro `backdrop-filter: url(#…)`**: la cosa più costosa (circa 12 ms per il solo menu, anche con un solo canale). Tolta da menu, pulsanti e pannelli (restano sfocatura e bordo luminoso); tenuta solo sulla goccia di vetro di What. Mentre si scorre, i pannelli grandi perdono anche la sfocatura (`.is-moving`).
- **3D disegnato solo quando cambia qualcosa** (camera, oggetti, schermo, luci) e a 15 al secondo per i micro-movimenti; lo schermo dei servizi segnala `markDirty`.
- Il governatore parte solo a fine apertura.
- Strumento di misura: nel Chrome vero con l'estensione, `requestAnimationFrame` + `scrollBy(0,12)` per 40–70 frame, spegnendo un pezzo per volta con un `<style>` temporaneo. Prima chiudere i Chrome headless dimenticati (`pkill -f headless=new`): un carico di 70 sul Mac falsava tutto.

## Ottavo giro (2026-10-18): fluidità e icone più chiare
- **Fluidità**: ombre VSM da 2048 con 20 campioni ridisegnate ogni frame → 1024 con 10 campioni e ridisegnate solo quando si muove un oggetto che proietta ombra (firma dei valori in `stage.frame`); il 3D non viene disegnato mentre una sezione opaca (What, Check, FAQ) copre lo schermo o il desktop interno è a tutto schermo; strisce delle veneziane senza `filter: blur` (bordi morbidi nel gradiente); luci dei bordi e menu scrivono stili solo se cambiano, e i bordi seguono solo se il puntatore o la pagina si muovono; texture dello schermo dei servizi 960×642 senza mipmap, al massimo 30 invii al secondo.
- **Governatore di qualità** (`main.js`): se la media dei frame supera 22 ms per ~2 s scende a gradini: densità di pixel 1 → vetro semplice (niente rifrazione SVG, niente veneziane) → densità 0,8. Non risale.
- **Icone**: l'intestazione sullo schermo dice "CLICK THE THREE APPS", le app non ancora aperte hanno un contorno tratteggiato che cammina, passando il mouse sull'icona si inverte e il cursore diventa la mano; a sinistra un tasto blu "Click the three icons on the computer" con freccia e il contatore "0 of 3 opened · click the icons on the computer". La dimostrazione col cursore parte dopo 0,7 s.

## Settimo giro (2026-10-18): lo schermo vero, il cursore, Track
- **Niente strato sopra lo schermo.** Le tre app sono disegnate sul vetro del computer 3D (`js/svc-screen.js`, 320×214 pixel logici a ×4, terza texture `tS` nello shader dello schermo, `uSvc` = 1 solo tra i due tagli nascosti). Sopra il vetro c'è solo un livello invisibile che prende i clic e li riporta sullo schermo con la stessa curvatura del tubo.
- **Cursore dimostrativo** al posto delle icone che lampeggiano: quando nessuno tocca, la freccia del 1984 va su un'app non ancora vista, clicca (l'icona si inverte e la riga del testo si accende), torna indietro; con una finestra aperta indica il quadratino di chiusura. Quando il tuo mouse entra nello schermo diventa quella freccia.
- **Cursore Macintosh su tutto il sito**: freccia 1-bit e mano che indica sui pulsanti (bitmap disegnate a ×2, solo con mouse).
- **Uscita dal tutto schermo senza lampo**: il vetro mostra già la ricerca intera a colori da pw 0,9, come l'interno: prima passava colore → bianco e nero → colore.
- **Track**: lo schedario è un Rolodex vero di 24 schede (una per tentativo, con numero, curva e timbro Dropped/Kept). Con lo scroll le schede si alzano una alla volta per essere lette e cadono in avanti; si ferma sulla 17 "Kept · The one you would show.", poi arriva alla 24. Tolte le schede volanti. Metodo allungato a 560vh.

## Sesto giro (2026-10-18): la vetrina scorre come una pagina
- Bocciato il giro prima: il computer era già fermo mentre la sezione entrava (sembrava una pagina appoggiata sopra), 300vh di pin senza niente che cambiasse, velo di carta e poi una pagina vuota prima del blu, Continue tagliato dalla colonna scorrevole, righe a pillola fuori stile.
- Ora: il computer **sale con la sezione** (spostamento di vista `syRaw` = posizione del pin), resta fermo mezzo schermo mentre leggi e **se ne va con la pagina**. Il blu del metodo sale da sotto come il bordo della sua sezione (`#wipe` fisso sotto lo stage) e il 3D è tagliato sullo stesso bordo (`clip-path` sullo stage). Il taglio di camera avviene quando il bordo arriva in cima; gli oggetti del metodo salgono poi da sotto. Nessun velo, nessuno scroll a vuoto.
- Colonna nello stile del sito: righe come la FAQ (numero in Bodoni corsivo, nome in Anton, stato in maiuscoletto, cerchio +), un solo posto di lettura a altezza fissa (niente salti), sotto il contatore "0 of 3 opened" che diventa il Continue blu. Schermo con linee sottili come l'interfaccia dentro il Mac, icone senza cornice che si invertono quando sono selezionate.

## Quinto giro con Andrea (2026-10-18): i servizi come vetrina
- Due tentativi **scartati**: (1) tre card di vetro con puntino arancio (generiche); (2) computer a tutto schermo con programmi funzionanti (troppo, e i servizi si usano dopo la registrazione, non qui).
- Ora è una **vetrina**: dopo "What we do" il computer resta sulla scrivania, visto di fronte, a destra; a sinistra la scritta "Three tools for one question." e tre scelte (Fluke Check · Free, Fluke Verified · Paid, Fluke Quant Bot · Coming soon) che si aprono con tutto il testo che spiega a cosa servono. Nessun modulo e nessun calcolo: la registrazione non è aperta ("Registration opens soon").
- Sullo schermo 3D c'è un DOM allineato al vetro (`stage.screenRect()`): desktop 1984 con tre icone che si illuminano a turno finché non le apri; ogni app mostra un esempio (Check: 34% + barre; Verified: sigillo e profilo; Bot: schema non-custodial). Un segno di spunta per ogni servizio visto; quando sono tutti e tre compare il tasto blu Continue.
- (Sostituito nel sesto giro) velo di carta all'uscita.

## Quarto giro con Andrea (2026-10-18)
- **Tagli nascosti**: What we do (carta), Fluke check (inchiostro) e FAQ (carta) sono opachi. Colore di pagina, camera, visibilità di scrivania / oggetti del metodo / macchina da scrivere cambiano solo a metà di queste sezioni, quando coprono tutto lo schermo (`cuts` nel director, `snapCam` nello stage).
- **Lente mai a scatti**: non si accende né si spegne più. Quando non serve sta sopra la linea di vista della camera ed entra o esce sempre volando dall'alto, anche tornando indietro.
- **What we do**: titolo "We study the whole search, not just the winner."; dietro, le 24 curve si disegnano con lo scroll; davanti, tre lastre di liquid glass (note, check, registro che si scrive da solo) e una goccia di vetro che ingrandisce ciò che ha sotto (segue il mouse, sul telefono legge da sola la curva vincente).
- **Metodo**: le schede volano fuori dallo schedario e rientrano prima che il binario si muova; se una scheda bianca finisce sotto il titolo bianco, il titolo diventa blu.
- **Check**: spiegazione del perché; la prima volta due interruttori si accendono e si spengono da soli; sul telefono il quadrante resta fisso in alto mentre scorri le domande.
- **FAQ**: risposte che si aprono e chiudono con l'altezza vera.
- **Finale**: sezione fissata: si spegne la lampada, poi il tubo, l'ultimo punto di luce salta fuori dallo schermo e atterra come punto del logo (reversibile). Poi un footer vero su fondo pieno.
- Telefono: margini laterali minimo 24px.

## Terzo giro con Andrea (2026-10-18)
- Meno ripetizione: il computer compare solo in apertura, nella macro sul floppy, dentro lo schermo e alla fine.
  - **Dentro il Mac**: la sezione "One winner" diventa il desktop del 1984 a tutto schermo. Un avviso, 23 finestre che si aprono dal disco Research, le finestre che si fondono nel grafico, una finestrella VIEW per cambiare vista (niente più scroll forzato: era il "bug" dell'interruttore).
  - **Macchina da scrivere** nera laccata per le note: lo scroll batte la frase sul foglio.
  - **Lampada da banchiere** e **luce delle veneziane** sulla carta; alla fine la lampada si spegne prima dello schermo.
  - **Schede** che volano fuori dallo schedario nel metodo.
- Un sito vero: "What we do" (note, Fluke check, research log, per chi), **Fluke check** interattivo con quadrante Fluke ↔ Edge, **FAQ**, **footer** a colonne con il logo gigante.
- Liquid glass più liquido: rifrazione cromatica ai bordi (Chromium), bordo di luce che gira verso il puntatore, goccia fatta di due gocce che si fondono, capsula che ondeggia con la velocità dello scroll. Nessun bagliore a macchia.

## Secondo giro con Andrea (2026-10-18)
- Torna l'**interfaccia retro del Mac sullo schermo** (solo lì: l'interfaccia del sito resta moderna).
- Menu e bottoni in **liquid glass**: capsula che rifrange ai bordi (Chromium), riflesso che segue il puntatore, goccia a molla tra le voci, vetro che si allunga nei pannelli. Logo completo nella capsula.
- Titolo più vicino al poster: corsivi **Bodoni Moda 900** crema con bordo cobalto, sopra le lettere giganti; lettere che salgono una a una e si sollevano vicino al puntatore.
- Testo d'apertura in **Bodoni Moda tondo**, testi e bottoni in **General Sans** (al posto di Archivo).
- Bottone principale: capsula d'inchiostro con riflesso, macchia cobalto che si allarga dal puntatore, testo che rotola, freccia che scorre, effetto magnetico.
- La lente non scende più sul floppy e non "buca" più lo sfondo in nero.

## Dopo il primo giro con Andrea (2026-10-18)
- Il vintage sta **negli oggetti e nella luce**, mai nell'interfaccia: via cursori pixel, finestre finte, ombre dure, bottoni a doppio anello, ticker.
- Menu **stile Apple**: barra di vetro sottile, voci al centro, pannelli che scendono; su telefono un foglio cobalto a tutto schermo.
- **Pochi caratteri, pochi pesi, pochi corpi** (sotto). Il riferimento tipografico è il poster rosso: nero condensato a lettere quasi attaccate + corsivo serif contrastato.
- Niente scritte superflue (via "Fig. 01", suggerimenti, numeri di sezione).
- **Loader + grande animazione d'apertura**.

## Test di unicità
1. **Prima vista:** un computer compatto beige, una lente sullo schermo, "An edge. Or a fluke?". Un estraneo capisce: c'è un risultato e qualcuno lo mette in dubbio.
2. **Cosa farebbe un'AI generica** per "startup di AI trading": fondo scuro con grafico luminoso e gradiente blu-viola; hero con tre statistiche; tre card uguali con icone. Nessuna di queste cose è qui.
3. **Distanza dal registro** (portfolio Andrea): font, colori, hero, materia 3D, menu, loader, cursore, sfondo e transizioni diversi. Asse in comune: **1** (scroll con pin e scrub). Limite 2.
4. **Senza logo** si riconosce: computer, lente, punto arancione che rimbalza.

## Principi
1. **Un oggetto vivo per schermata**, fotografato come un prodotto su carta senza fine: luce da studio, ombre morbide, plastica con grana.
2. **Tipografia da poster**: parole giganti in Anton cobalto, legate da piccole parole in corsivo Bodoni. I corsivi sono sempre e solo i connettivi.
3. **Il punto è l'unità di movimento**: nel loader rimbalza, diventa la linea del tubo che si accende, apre la tendina; alla fine lo schermo si spegne in un punto che cade e diventa il punto del logo.

## Token

### Colori (6)
| nome | valore | uso |
|---|---|---|
| `--paper` | `#E5E1D5` | sfondo pagina |
| `--plastic` | `#CDC5AD` | plastica degli oggetti (3D) |
| `--ink` | `#14151F` | testo, bottoni, sezione finale |
| `--cobalt` | `#0A3AE5` | parole giganti, loader, sezione del metodo (colore del logo) |
| `--signal` | `#FC6C3A` | il punto, la curva vincente. Mai testo |
| `--screen` | `#EDEBE0` | testo chiaro su cobalto e inchiostro |

### Tipografia: 3 famiglie, ognuna con un solo compito
| famiglia | compito | pesi |
|---|---|---|
| **Anton** | parole giganti e tutti i titoli, maiuscolo, lettere strette (−0,03em) | 400 |
| **General Sans** | testo, menu, bottoni | 400, 500, 600 |
| **Bodoni Moda** | corsivo per i connettivi ("An", "or a", "the"…); tondo per le frasi d'apertura | 900 corsivo nella hero, 700 altrove; 400 tondo |

**Sei corpi in tutto:** `giant` · `title` · `habit` · `lede` · `body` · `small`.

### Movimento
- Curve: `--ease-out: cubic-bezier(.16,1,.3,1)` · `--ease-io` · scatto `steps()` per le parole giganti (l'accento "ticker").
- Ogni sezione entra a modo suo:
  | sezione | entrata |
  |---|---|
  | Loader | contatore reale 0→100, il punto rimbalza |
  | Apertura | il punto diventa una linea, la tendina si apre come un tubo che si accende, la curva si disegna, la camera arretra, gli oggetti cadono sulla scrivania, le parole salgono a scatti |
  | Idea | le righe salgono legate allo scroll |
  | Una vincitrice | il titolo si svela a scatti da sinistra; la lente percorre la curva e poi si allarga fino a mostrare tutta la ricerca |
  | Metodo | binario orizzontale: lo schedario ruota, il regolo scorre, la lente legge la nota stampata |
  | Note | parole a scatti, una dopo l'altra |
  | Chiusura | lo schermo si spegne, il punto cade e rimbalza nel logo |

## Vietato (qui)
- Tutto ciò che è in `vietato_riusare` del registro.
- Pixel-art nell'interfaccia del sito (menu, bottoni, cursori), ombre dure. La pixel-art vive solo dentro lo schermo del computer.
- Gradienti, neon, grafici luminosi su fondo scuro.
- Statistiche di performance, clienti, promesse. Ogni grafico è **illustrativo** e lo dice.
- La parola "Macintosh" e il logo Apple: il computer è un omaggio alla forma compatta.
- Ottimizzazioni per telefono fuori da `(hover: none) and (pointer: coarse)`.
