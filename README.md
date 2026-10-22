# Målmand 8

Fodboldstyrke og kondition med fokus på målmænd. En PWA uden server: alt kører og gemmes på telefonen.

## Filer

| Fil | Indhold |
|---|---|
| `index.html` | Sidernes opbygning |
| `app.js` | Al logik: program-motor, træningstilstand, status, belastning, byg selv |
| `exercises.js` | Øvelsesbiblioteket med "godt til" og sæson-data |
| `programs.js` | De færdige programmer |
| `app.css` | Design. Faste mål for knapper og kort ligger i sektionen "ENSRETNING" |
| `sw.js` | Service worker, så appen virker offline |
| `.github/workflows/garmin.yml` | Henter data fra Garmin-uret og sender pas til uret |
| `scripts/garmin_sync.py` | Scriptet, som workflowet kører |

Nye øvelser tilføjes i `exercises.js` (og en linje i `SEASON`-tabellen). Nye programmer tilføjes i `programs.js`.

## Udgivelse

Siden udgives med GitHub Pages direkte fra `main` (Settings › Pages › Deploy from a branch). Der er intet build-trin: filerne bruges, som de ligger.

Når du ændrer `app.js`, `app.css` eller andre filer, så hæv `CACHE`-versionen øverst i `sw.js` (fx `gk8-v28` → `gk8-v29`). Så henter installerede apps de nye filer.

## Lokalt

Åbn appen fra en lokal webserver, fx `npx serve .` eller `python -m http.server`. Service workeren virker kun over `http://localhost` eller HTTPS.

## Garmin-ur

Appen kan hente søvn, Body Battery, hvilepuls, HRV, Training Readiness, stress, skridt, aktiviteter, VO2max og vægt fra dit Garmin-ur, og den kan sende dine pas til uret. En GitHub Action (`.github/workflows/garmin.yml`) logger ind på Garmin Connect tre gange i døgnet, henter de sidste 14 dage med `scripts/garmin_sync.py` og gemmer dem **krypteret** i `garmin/data.json`. Appen henter filen og låser den op med din egen adgangskode.

Garmin har ingen officiel adgang for privatpersoner. Løsningen bruger det uofficielle bibliotek [python-garminconnect](https://github.com/cyberjunky/python-garminconnect), som kan holde op med at virke, hvis Garmin ændrer deres login.

### Opsætning (kun i browseren, intet skal installeres)

1. Upload `.github/workflows/garmin.yml` og `scripts/garmin_sync.py` til repoet.
2. Gå til **Settings › Secrets and variables › Actions › New repository secret**, og opret tre hemmeligheder:
   - `GARMIN_EMAIL`: din e-mail til Garmin Connect
   - `GARMIN_PASSWORD`: din adgangskode til Garmin Connect
   - `GARMIN_PASSPHRASE`: en ny, lang adgangskode, som du selv finder på (fx fire tilfældige ord). Den låser dataene op i appen.
3. Gå til **Settings › Actions › General › Workflow permissions**, og vælg **Read and write permissions**.
4. Gå til **Actions › Garmin › Run workflow**, og kør med `hent-data`. Efter et minut skal der ligge en fil i `garmin/data.json`.
5. Åbn appen, gå til **Mere › Garmin-ur**, skriv din `GARMIN_PASSPHRASE` og repoet (`bruger/repo`), og tryk **Forbind**.

Derefter henter GitHub data automatisk kl. 08, 12 og 21 dansk tid, og appen henter dem, når du åbner den.

**Hent nu:** Uden GitHub-token henter knappen det, GitHub sidst har hentet fra Garmin. Har du lagt en token ind (se "Send pas til uret"), hedder knappen **Hent nye data fra uret**: så henter GitHub helt nye data fra Garmin med det samme (1–3 minutter), og appen venter på dem. Husk at synkronisere uret med Garmin Connect-appen først.

### Hvad det bruges til

- **Dagligt tjek:** Søvn og Energi bliver foreslået ud fra søvnscoren og Body Battery om morgenen.
- **Dagens pas:** Har du ikke udfyldt dagens tjek, og viser uret lav restitution (Training Readiness under 25, lav HRV, hvilepuls 5 slag over normalt eller Body Battery under 20), bliver dagens pas lettere: 1 sæt færre og 10 % mindre vægt. Dit eget tjek går altid forud.
- **Status:** Høj hvilepuls og lav HRV flere dage i træk giver en markering i statussen, og programmet bliver lidt lettere. Kort søvn og højt stress vises som information.
- **Belastning:** Træning fra uret bliver lagt i belastningen som minutter × RPE. RPE skønnes ud fra Garmins Training Effect (ellers pulsen, og RPE 6 for styrketræning). Har du selv registreret det samme (en kamp, et pas eller fodbold med omtrent samme varighed), tæller urets version ikke, uanset hvilken der kom først. Under Min form › Belastning › Seneste registreringer kan du se alt og slette det, der er forkert.
- **Kondition:** Har du ikke taget konditionstesten, bruges urets VO2max til din konditionsscore.
- **Vægt:** Bruger du en Garmin-vægt, bliver vægten udfyldt på de dage, hvor du ikke selv har skrevet den.
- **Min form:** 7 dages søjler for søvnscore, hvilepuls, HRV, Training Readiness, skridt og Body Battery.

HRV og Training Readiness kræver et nyere ur (fx Forerunner 255/265/955/965, Fenix 7, Venu 3). Har dit ur dem ikke, bliver de bare ikke vist.

### Send pas til uret

Under **Mere › Garmin-ur › Send pas til uret** kan appen lægge dine næste pas (resten af denne uge og næste uge) i Garmin-kalenderen. Styrkeøvelser bliver til sæt med gentagelser, foreslået vægt og pause. Kondition, intervaller og circuits bliver til trin med tid. Uret kender ikke appens øvelser, så hvert trin får Garmins nærmeste kategori (fx *Squat*), og appens navn og dosis står i trinnets beskrivelse.

Opsætning, kun første gang:

1. Gå til GitHub › dit profilbillede › **Settings › Developer settings › Personal access tokens › Fine-grained tokens › Generate new token**.
2. Giv den et navn (fx "Målmand 8"), vælg en udløbsdato, og vælg **Only select repositories** med kun dette repo.
3. Under **Repository permissions**: sæt **Contents** til **Read and write**. Intet andet.
4. Kopiér tokenen (starter med `github_pat_`), og indsæt den i appen under **Mere › Garmin-ur › GitHub-token**.

Når du trykker **Send pas til uret**, gemmer appen passene krypteret i `garmin/plan.json`. Det starter workflowet (`send-plan`), som sletter de pas, der blev sendt sidst, og lægger de nye i kalenderen. Efter et par minutter kan du trykke **Hent nu** og se svaret. Synkronisér uret, så ligger passene under **Træning › Træninger** og i kalenderen.

**Sæt fra uret:** Laver du et sendt pas på uret, tæller uret dine sæt. Ved næste hentning logger appen dem på de rigtige øvelser i rækkefølge (gentagelser og vægt), så du ikke skal taste dem. Øvelser, du selv har logget den dag, bliver ikke rørt.

Send igen, hvis du har ændret programmet, eller når en ny uge starter, så vægtene følger dine seneste sæt.

### Sikkerhed

- Repoet og Action-loggen er offentlige. Data er krypteret med AES-GCM, og scriptet skriver aldrig helbredstal i loggen.
- Garmin-login ligger kun som hemmeligheder i GitHub og kan ikke læses af andre.
- Adgangskoden til dataene og GitHub-tokenen gemmes kun på din telefon og kommer ikke med i backup-filen. Tokenen kan kun skrive til dette ene repo. Slet den på GitHub, hvis du mister telefonen.
- Passene i `garmin/plan.json` er krypteret med samme adgangskode som dataene. `garmin/sent.json` indeholder kun Garmins id'er og antal sendte pas.
- GitHub slår planlagte workflows fra efter 60 dage uden aktivitet i repoet. Sker det, så tryk **Enable workflow** under Actions › Garmin.
