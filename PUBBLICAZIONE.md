# Pubblicare Fluke su usefluke.it (tutto gratis, tranne il dominio)

Nomi dei pulsanti e prezzi cambiano ogni tanto: se un menu si chiama diversamente, cerca la parola in grassetto.

## 1 · Registra il dominio (circa 10–15 € l'anno)
`usefluke.it` risultava **libero** il 18 ottobre 2026 (controllo sul registro .it).
- Cloudflare **non** vende i `.it`: registralo da un registrar italiano (Aruba, Register.it, Netsons, ecc.). Scegli quello con il prezzo più chiaro e **senza** rinnovo più caro nascosto.
- Per i `.it` servono codice fiscale e residenza in UE. Per i privati il registro non mostra pubblicamente i dati nel whois.
- Dopo l'acquisto ti arriva una email di conferma del titolare: **rispondi entro 15 giorni** o il dominio si blocca.
- **Non comprare** servizi extra (hosting, email, "sito pronto", certificato): non servono.

## 2 · Account Cloudflare e nameserver (gratis)
1. Crea un account su cloudflare.com (piano **Free**, attiva la verifica in due passaggi).
2. **Add a domain** → `usefluke.it` → piano **Free**.
3. Cloudflare ti dà **due nameserver** (tipo `xxx.ns.cloudflare.com`). Entra nel pannello del registrar → *Nameserver / DNS* → sostituisci quelli attuali con i due di Cloudflare.
4. Aspetta da pochi minuti a 24 ore: Cloudflare ti scrive quando il dominio è attivo.
5. In **SSL/TLS → Edge Certificates** attiva **Always Use HTTPS**.

## 3 · Email del dominio, gratis (`hello@` e `privacy@`)
1. Cloudflare → il tuo dominio → **Email → Email Routing → Enable**.
2. **Routing rules** → crea due indirizzi personalizzati: `hello@usefluke.it` e `privacy@usefluke.it`, entrambi verso `formularium.ita@gmail.com`.
3. Cloudflare ti manda una mail di conferma a quella casella: clicca il link. I record DNS li aggiunge da solo.
4. Così **ricevi**. Per **rispondere dal dominio** si usa "Invia messaggio come" in Gmail: quando sei qui dimmelo e ti guido (serve anche un record SPF).

## 4 · Pubblicazione del sito su Cloudflare Pages (gratis)
Il sito si carica a mano, come preferisci.
1. Sul tuo computer, nella cartella del progetto: `node tools/make-upload.mjs`
   Si ferma se c'è ancora qualcosa da sistemare. Se va bene crea la cartella **`~/Desktop/Progetti/fluke-upload`** e lo zip **`fluke-upload.zip`** (circa 2 MB) con solo ciò che serve al sito.
2. Cloudflare → **Workers & Pages → Create → Pages → Upload assets**.
3. Nome progetto `fluke`, trascina dentro la cartella `fluke-upload` (o lo zip) → **Deploy**.
4. Quando è online (indirizzo `fluke.pages.dev`), apri **Custom domains → Set up a custom domain** e aggiungi `usefluke.it` e `www.usefluke.it`.
5. **Rules → Redirect Rules**: da `www.usefluke.it` a `https://usefluke.it` (redirect permanente 301).
6. **Settings → Web analytics → Enable** (statistiche gratuite, senza cookie, nessun codice da aggiungere).
7. Per ogni modifica futura: rifai il punto 1 e carica di nuovo da **Create deployment**.

## 5 · Lista d'attesa con Tally (gratis)
1. Crea un account su tally.so e un **nuovo modulo**.
2. Campi:
   - **Email** (obbligatorio, tipo email).
   - **Hidden field** chiamato `tool` (compila da solo dal link del sito con `?tool=check`, `?tool=verified` o `?tool=bot`: in Tally aggiungi il campo nascosto e abilita "Pre-fill").
   - **Casella di consenso (obbligatoria)**, con questo testo esatto:
     > I agree that Andrea Celeste Gervasoni uses my email address only to tell me when this Fluke tool opens. I can withdraw at any time by writing to privacy@usefluke.it. Privacy policy: https://usefluke.it/privacy.html
3. Messaggio finale: "Thank you. You will hear from me once, when it opens."
4. In **Settings** attiva la notifica a `hello@usefluke.it` per ogni risposta.
5. Pubblica e **copia l'indirizzo del modulo** (`https://tally.so/r/xxxxxx`). Mandamelo e lo metto nei tre link del sito.
6. Quando un tool si apre, scrivi una sola mail (da `hello@`) a chi aveva scelto quel tool. Chi ti chiede di uscire va cancellato anche da Tally (Submissions → Delete).

Se vuoi pubblicare **prima** di avere il modulo: `node tools/set-legal.mjs --tally none`. I tre link spariscono e il sito dice solo "Registration opens soon".

## 6 · Prima di annunciare il sito
- Apri `https://usefluke.it` dal telefono (iPhone e Android) e scorri tutto.
- Controlla il lucchetto HTTPS e che `https://www.usefluke.it` porti alla versione senza www.
- Cerca "Fluke" su **EUIPO TMview** e sull'archivio **UIBM**: "Fluke" è un marchio noto della Fluke Corporation (strumenti di misura). Settore diverso, quindi non è un blocco, ma controlla prima di investire sul nome.
- **Fai leggere a un avvocato** `privacy.html`, `terms.html`, `legal-notice.html` e chiedi un parere sul Quant Bot (chiavi API, regole sui servizi di investimento) **prima** di promuoverlo o aprire la sua lista d'attesa.
- **Partita IVA**: non serve finché il sito è una vetrina gratuita. Serve **prima di vendere** Fluke Verified in modo continuativo (anche sotto i 5.000 €). In quel momento aggiungi anche un indirizzo nelle pagine legali.

## Dove sono i dati inseriti
Tutto (nome, email, dominio) è già compilato nelle pagine. Per cambiare qualcosa dopo, modifica i file `privacy.html`, `terms.html`, `legal-notice.html`, `index.html` a mano oppure chiedimelo.
