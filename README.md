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
