# Auslagentool

Privates Werkzeug zum Erfassen von Auslagenbelegen. Foto oder Bild wählen, Text lokal auslesen (Tesseract.js, Deutsch), Felder prüfen, als CSV exportieren. Die Daten bleiben im Browser des Geräts (IndexedDB). Keine Cloud, keine Cookies, kein Tracking.

Status: nicht für die Öffentlichkeit freigegeben. Die Seite ist per Meta-Tag auf noindex gesetzt.

## Struktur

- `auslagen/`: App (index.html, parser.js, sw.js, Manifest, Icons, 404.html)
- `vendor/`: lokale Erkennungsdateien (Tesseract.js 5.1.1, deutsche Sprachdaten). Keine Drittanbieter-Aufrufe zur Laufzeit.
- `.github/workflows/pages.yml`: baut aus `auslagen/` und `vendor/` eine Seite und veröffentlicht sie

## Deploy (GitHub Pages)

1. Settings, Pages: Source auf „GitHub Actions“ stellen.
2. Settings, Pages: „Enforce HTTPS“ aktivieren.
3. Push auf `main` startet den Workflow (oder Actions, „Run workflow“).
4. Aufruf: https://franzallek.github.io/Auslagentool/

## Erkennungsdateien erneuern

Im Ordner `vendor/` liegen Tesseract.js, die vier Rechenmodule (tesseract-core*.wasm.js) und `lang/deu.traineddata.gz`. Bezug: npm-Pakete `tesseract.js` und `tesseract.js-core` (Version 5.1.1) sowie die Sprachdaten von tessdata.projectnaptha.com. Nach einem Update die Version im Service Worker (`CACHE` in sw.js) hochzählen.

## Test

- Auswertungslogik: `node auslagen/parser.test.cjs`
- Offline: einmal online öffnen, Beleg auslesen, in der App den Offline-Check ausführen, dann Flugmodus.

## Grenzen

Keine Anmeldung, keine Synchronisierung, keine Einreichung, keine revisionssichere Archivierung. PDFs werden nicht ausgelesen. Sicherung nur manuell per JSON-Export. GitHub Pages kann keine eigenen HTTP-Header senden; die Vorlage `auslagen/_headers` gilt nur bei anderen Hostern.
