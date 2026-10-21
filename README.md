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
| `tests/suite.js` | Testsuite, der kører i browseren oven på appen |
| `tests/run.mjs` | Kører suiten i Chrome i mobil- og desktopbredde |
| `scripts/build.mjs` | Minificerer til `dist/` og sætter cache-versionen |

Nye øvelser tilføjes i `exercises.js` (og en linje i `SEASON`-tabellen). Nye programmer tilføjes i `programs.js`.

## Udgivelse

Ved hvert push til `main` bygger og tester GitHub appen. Udgivelsen sker kun, hvis alle tests består.

Første gang: Settings › Pages › Build and deployment › Source: **GitHub Actions**.

## Lokalt (kræver Node.js 20)

```
npm install
npx playwright install chromium
npm test          # byg til dist/ og kør alle tests
```

Uden Node kan appen åbnes direkte fra en lokal webserver. Testsuiten kan også køres ved at indsætte `tests/suite.js` i browserens konsol på en åben app. Den nulstiller alle data, så brug den ikke på din egen telefon.

## Garmin-ur

Appen kan hente søvn, Body Battery, hvilepuls, stress, skridt og aktiviteter fra dit Garmin-ur. En GitHub Action (`.github/workflows/garmin.yml`) logger ind på Garmin Connect to gange i døgnet, henter de sidste 14 dage med `scripts/garmin_sync.py` og gemmer dem **krypteret** i `garmin/data.json`. Appen henter filen og låser den op med din egen adgangskode.

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

Derefter henter GitHub data automatisk ca. kl. 06.30 og 21.30, og appen henter dem, når du åbner den.

### Hvad det bruges til

- **Dagligt tjek:** Søvn og Energi bliver foreslået ud fra søvnscoren og Body Battery om morgenen.
- **Belastning:** Løb og anden træning fra uret bliver lagt i belastningen (minutter × RPE ud fra pulsen). Kampe, gåture og pas, du allerede har registreret, springes over.
- **Hvilepuls:** Ligger den 5 slag eller mere over dit normale de sidste tre dage, foreslår appen en let dag.
- **Min form:** 7 dages søjler for søvnscore, hvilepuls, skridt og Body Battery.

### Prøve-træning til uret

Kør **Actions › Garmin › Run workflow** med `test-workout`. Så lægges tre prøve-træninger (`M8 test cardio`, `M8 test hiit` og `M8 test running`) i Garmin-kalenderen i dag. Synkronisér uret, og se under **Træning › Træninger** og i kalenderen, hvilke der vises, og om teksten for hvert trin (fx "Frontsquat 4x8 60 kg") står på skærmen. Slet dem bagefter i Garmin Connect-appen.

### Sikkerhed

- Repoet og Action-loggen er offentlige. Data er krypteret med AES-GCM, og scriptet skriver aldrig helbredstal i loggen.
- Garmin-login ligger kun som hemmeligheder i GitHub og kan ikke læses af andre.
- Adgangskoden til dataene gemmes kun på din telefon og kommer ikke med i backup-filen.
- GitHub slår planlagte workflows fra efter 60 dage uden aktivitet i repoet. Sker det, så tryk **Enable workflow** under Actions › Garmin.
