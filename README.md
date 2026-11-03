# Auslagentool

Privates Werkzeug zum Erfassen von Auslagenbelegen. Die Speicherung erfolgt lokal im Browser (IndexedDB); Texterkennung und PDF-Erstellung laufen auf dem Gerät. Der manuell gestartete Google-Drive-Abgleich befindet sich weiterhin in Entwicklung und ist nicht für echte Belege freigegeben.

## Status und Auslieferung

Das Projekt ist nicht als öffentlicher Dienst freigegeben. Die GitHub-Pages-Vorschau auf `preview/once` ist öffentlich und ohne Zugriffssperre erreichbar; nur fiktive Testdaten verwenden. `noindex` verhindert weder Zugriffe noch ersetzt es Datenschutz- oder Zugriffsschutz. Ein erfolgreicher Vorschau-Deploy ist keine Produktivfreigabe.

Die ausgelieferte Einstiegsseite ist das Root-`index.html`. Der Preview-Workflow kopiert die unterstützenden App-Dateien aus `auslagen/` und überschreibt die kopierte Einstiegsseite anschließend mit Root-`index.html`. Der Entwicklungsabgleich wird nur manuell nach Bestätigung gestartet. In der finalen unterschriebenen PDF-Vorschau kann die PDF zuerst heruntergeladen und danach optional mit einer separaten Bestätigung jede Cloud-Version der darin enthaltenen Belege dauerhaft aus dem verbundenen Google-Drive-App-Ordner gelöscht werden. Lokale Belege und die heruntergeladene PDF bleiben erhalten. Ein minimaler Cloud-Löschvermerk mit Beleg-ID verhindert, dass andere Geräte die entfernten Belege erneut hochladen; andere Geräte können weiterhin lokale Kopien besitzen.

## Gestaltung

Die Oberfläche verwendet die Palette „Ocean Precision“ mit Marineblau, Wasserblau und ruhigen hellen Flächen. Das Farbschema folgt zunächst der Geräteeinstellung; über „Dunkles Design“ lässt es sich umschalten. Eine manuelle Auswahl wird ausschließlich als Anzeigepräferenz im lokalen Browser gespeichert, nicht mit Belegdaten synchronisiert.

## Belegkopien als Sammel-PDF

Unter „Meine Auslagen“ die gewünschten Belege markieren und „Belegkopien als Sammel-PDF“ wählen. Das PDF enthält nur die zugehörigen Bildseiten: jedes Bild als eigene Seite und bei Original-PDF-Anhängen jede PDF-Seite. Die Erstellung erfolgt lokal; es werden keine Belege hochgeladen und Bearbeitungsstände oder gespeicherte Dateien nicht verändert. Fehlt bei einem ausgewählten Beleg eine Datei oder ist eine Datei nicht lesbar, wird kein unvollständiges PDF erzeugt. Zum Schutz vor Speicherüberlastung gelten Grenzen von 50 MB ausgewählten Quelldateien, 80 MB PDF-Ausgabe und 250 Seiten; bei Überschreitung wird der Export mit einer Fehlermeldung abgebrochen.

Der bestehende Export „Erstattung erstellen (PDF + CSV)“ sowie CSV- und JSON-Sicherungen bleiben davon getrennt.

## Struktur

- `index.html`: tatsächlich ausgelieferte App-Einstiegsseite
- `auslagen/`: Parser, lokale PDF-/OCR-Bibliotheken, Service Worker, Entwicklungs-Synchronisierung und Exportlogik
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

Die Browseroberfläche und die Wiederherstellung im Offline-/Flugmodus müssen zusätzlich auf den Zielgeräten geprüft werden. Die Nutzenden sind für den manuellen Export und die sichere Aufbewahrung ihrer JSON-Sicherungen verantwortlich; es gibt keinen automatischen Backup-Dienst. Die Cloud-Löschfunktion ist nicht atomar: Bei einem Verbindungsfehler kann ein Teil der Cloud-Versionen bereits gelöscht sein. Die App schreibt zuerst einen minimalen Cloud-Löschvermerk, behält eine lokale Sperrmarkierung bei, zeigt den Teilerfolg an und erlaubt einen erneuten Löschversuch. Diese lokale Reparatur ersetzt keine Go-Live-Freigabe.

## Grenzen

Keine revisionssichere Archivierung und keine tatsächliche Einreichung. Gespeicherte Fotos können verkleinerte JPEG-Kopien sein; eine JSON-Sicherung enthält Rechnungsdaten und hinterlegte Dateien. PDF.js und Tesseract werden lokal aus den mitgelieferten Dateien geladen. GitHub Pages kann keine eigenen HTTP-Header senden; `auslagen/_headers` gilt nur bei Hostern, die solche Dateien unterstützen.
