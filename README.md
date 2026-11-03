# Auslagentool

Privates Werkzeug zum Erfassen von Auslagenbelegen. Die Standard-Speicherung erfolgt lokal im Browser (IndexedDB); Texterkennung und PDF-Erstellung laufen auf dem Gerät. Die App enthält außerdem einen ausdrücklich manuell gestarteten Google-Drive-Abgleich für Testdaten. Dieser Entwicklungsabgleich ist nicht für echte Belege freigegeben.

## Status und Auslieferung

Das Projekt ist nicht für die Öffentlichkeit freigegeben. Der Workflow für `preview/once` veröffentlicht bei jedem Push auf diesen Branch eine GitHub-Pages-Vorschau ohne Zugriffssperre. `noindex` verhindert keine Zugriffe und ist kein Datenschutz- oder Zugriffsschutz. Es wurde in dieser Arbeit nichts gepusht oder veröffentlicht.

Die ausgelieferte Einstiegsseite ist das Root-`index.html`. Der Preview-Workflow kopiert die unterstützenden App-Dateien aus `auslagen/` und überschreibt die kopierte Einstiegsseite anschließend mit Root-`index.html`. `.github/workflows/pages.yml` führt Prüfungen aus, deployt aber nicht. `.github/workflows/preview.yml` deployt ausschließlich `preview/once`.

## Belegkopien als Sammel-PDF

Unter „Meine Auslagen“ die gewünschten Belege markieren und „Belegkopien als Sammel-PDF“ wählen. Das PDF enthält nur die zugehörigen Bildseiten: jedes Bild als eigene Seite und bei Original-PDF-Anhängen jede PDF-Seite. Die Erstellung erfolgt lokal; es werden keine Belege hochgeladen und Bearbeitungsstände oder gespeicherte Dateien nicht verändert. Fehlt bei einem ausgewählten Beleg eine Datei oder ist eine Datei nicht lesbar, wird kein unvollständiges PDF erzeugt. Zum Schutz vor Speicherüberlastung gelten Grenzen von 50 MB ausgewählten Quelldateien, 80 MB PDF-Ausgabe und 250 Seiten; bei Überschreitung wird der Export mit einer Fehlermeldung abgebrochen.

Der bestehende Export „Erstattung erstellen (PDF + CSV)“ sowie CSV- und JSON-Sicherungen bleiben davon getrennt.

## Struktur

- `index.html`: tatsächlich ausgelieferte App-Einstiegsseite
- `auslagen/`: Parser, lokale PDF-/OCR-Bibliotheken, Service Worker, Synchronisierung und Exportlogik
- `vendor/`: lokale OCR-Dateien; der Preview-Build ergänzt die PDF.js-Dateien aus `auslagen/vendor/`
- `.github/workflows/preview.yml`: Prüfungen und Vorschau-Deployment ausschließlich für `preview/once`
- `.github/workflows/pages.yml`: Entwicklungsprüfungen ohne Deployment

## Tests

Mit Node.js aus dem Repository-Root:

- `node scripts/check-inline.cjs index.html`
- `node scripts/check-inline.cjs auslagen/index.html`
- `node auslagen/parser.test.cjs`
- `node auslagen/sync.test.cjs`
- `node auslagen/sync-plan.test.cjs`
- `node auslagen/report.test.cjs`
- `node auslagen/receipt-pdf.test.cjs`
- `node auslagen/pdfimport.test.cjs`

Die Browseroberfläche und die Wiederherstellung im Offline-/Flugmodus müssen zusätzlich auf den Zielgeräten geprüft werden. Diese lokale Reparatur ersetzt keine Go-Live-Freigabe.

## Grenzen

Keine revisionssichere Archivierung und keine tatsächliche Einreichung. Gespeicherte Fotos können verkleinerte JPEG-Kopien sein; eine JSON-Sicherung enthält Rechnungsdaten und hinterlegte Dateien. PDF.js und Tesseract werden lokal aus den mitgelieferten Dateien geladen. GitHub Pages kann keine eigenen HTTP-Header senden; `auslagen/_headers` gilt nur bei Hostern, die solche Dateien unterstützen.
