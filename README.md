# Auslagentool

Privates Werkzeug zum Erfassen von Auslagenbelegen. Die Speicherung erfolgt lokal im Browser (IndexedDB); Texterkennung und PDF-Erstellung laufen auf dem Gerät. Der manuell gestartete Google-Drive-Abgleich befindet sich weiterhin in Entwicklung und ist nicht für echte Belege freigegeben.

## Status und Auslieferung

Das Projekt ist nicht als Produktivdienst freigegeben. Die GitHub-Pages-Seite auf `preview/once` ist öffentlich und ohne Zugriffssperre erreichbar; bis zur Abnahme nur fiktive Testdaten verwenden. `noindex` verhindert weder Zugriffe noch ersetzt es Datenschutz- oder Zugriffsschutz. Ein erfolgreicher Vorschau-Deploy ist keine Produktivfreigabe. Der ausführliche Datenschutz- und Demo-Hinweis erscheint als Overlay beim Überfahren oder Fokussieren des Info-Symbols neben „Privates Werkzeug“; auf Touch-Geräten lässt er sich antippen.

Die ausgelieferte Einstiegsseite ist das Root-`index.html`. Der Preview-Workflow kopiert die unterstützenden App-Dateien aus `auslagen/` und überschreibt die kopierte Einstiegsseite anschließend mit Root-`index.html`. Unter „Privates Werkzeug“ zeigt die App den letzten Push-Zeitpunkt und die Commit-Kennung des bereitgestellten Stands; so ist erkennbar, welche Version tatsächlich veröffentlicht wurde. Beim Öffnen erscheint ein kurzer, optionaler Google-Drive-Dialog mit „Jetzt verbinden“ und „Später“. Ohne ausdrückliche Auswahl wird Google nicht geladen. Danach bleibt der Google-Drive-Bereich mit der Verbindungsoption sichtbar. Nach erfolgreichem Abgleich merkt sich die App lokal die bestätigte Google-E-Mail-Adresse und zeigt sie beim nächsten Öffnen an. Das ist nur eine lokale Anzeige, keine aktive Anmeldung; Passwort und OAuth-Token werden nicht gespeichert. Der Abgleich läuft direkt zwischen Browser und dem angemeldeten persönlichen Google-Drive-App-Ordner; es gibt keinen zentralen App-Server oder eine gemeinsame Belegsammlung. Trotzdem ist die Website selbst öffentlich. Belege in IndexedDB sind für alle sichtbar, die dasselbe Browserprofil verwenden. Personen müssen eigene Geräte/Browserprofile und jeweils ihr eigenes Google-Konto verwenden; das ist keine serverseitige Nutzeranmeldung oder Zugangssperre. Der Abgleich bleibt bis zu erfolgreichen Mehrkonten-, Wiederherstellungs- und Geräteprüfungen ein Testverfahren. Sowohl beim Löschen in „Meine Auslagen“ als auch in der finalen unterschriebenen PDF-Vorschau fragt die App ausdrücklich nach, bevor die lokale Kopie und - bei zugeordnetem Google Drive - alle Cloud-Versionen dauerhaft gelöscht werden. Bei Ablehnung oder einem Löschfehler bleiben die lokalen Belege erhalten. Auch wenn keine aktuelle Cloud-Datei gefunden wird, wird eine Löschmarkierung gesetzt; sie verhindert späteres Wiederherstellen oder erneutes Hochladen derselben ID von anderen verbundenen Geräten. Ohne Drive-Zuordnung wird die Löschmarkierung lokal gespeichert und bei einer späteren Verbindung an Drive übertragen. Andere Geräte können noch lokale Kopien besitzen, bis sie sich erneut abgleichen.
Die Rechnungsfelder sind beim Start zunächst verborgen und erscheinen erst nach Auswahl eines Rechnungsbilds oder einer PDF-Datei. Beim Bearbeiten eines vorhandenen Belegs werden sie direkt angezeigt.

## Gestaltung

Die Oberfläche verwendet die Palette „Ocean Precision“ mit Marineblau, Wasserblau und ruhigen hellen Flächen. Das Farbschema folgt zunächst der Geräteeinstellung; über „Dunkles Design“ lässt es sich umschalten. Eine manuelle Auswahl wird ausschließlich als Anzeigepräferenz im lokalen Browser gespeichert, nicht mit Belegdaten synchronisiert.

## Belegkopien als Sammel-PDF

Unter „Meine Auslagen“ die gewünschten Belege markieren und „Belegkopien als Sammel-PDF“ wählen. Das PDF enthält nur die zugehörigen Bildseiten: jedes Bild als eigene Seite und bei Original-PDF-Anhängen jede PDF-Seite. Die Erstellung erfolgt lokal; es werden keine Belege hochgeladen und Bearbeitungsstände oder gespeicherte Dateien nicht verändert. Fehlt bei einem ausgewählten Beleg eine Datei oder ist eine Datei nicht lesbar, wird kein unvollständiges PDF erzeugt. Zum Schutz vor Speicherüberlastung gelten Grenzen von 50 MB ausgewählten Quelldateien, 80 MB PDF-Ausgabe und 250 Seiten; bei Überschreitung wird der Export mit einer Fehlermeldung abgebrochen.

Im unterschriebenen PDF-Checkout kann optional „Gesamt-PDF erstellen und Belege nach Bestätigung dauerhaft löschen“ aktiviert werden. Dann enthält der Download zuerst die unterschriebene Kalkulation und danach die ausgewählten Belegdateien als PDF-Seiten. Nach dem Start des Downloads fragt die App gesondert nach, bevor die lokalen Originale und, falls Google Drive zugeordnet ist, alle Cloud-Versionen dieser Belege dauerhaft gelöscht werden. Wird die Löschung abgelehnt oder schlägt sie fehl, bleiben die lokalen Originale erhalten; bei einem unvollständigen Cloud-Löschvorgang wird der Teilerfolg angezeigt und ein erneuter Versuch ermöglicht. Die heruntergeladene PDF bleibt erhalten.

Der bestehende Export „Erstattung erstellen (PDF + CSV)“ sowie CSV- und JSON-Sicherungen bleiben davon getrennt.

## Struktur

- `index.html`: tatsächlich ausgelieferte App-Einstiegsseite
- `auslagen/`: Parser, lokale PDF-/OCR-Bibliotheken, Service Worker, Entwicklungs-Synchronisierung und Exportlogik
- `vendor/`: lokale OCR-Dateien; der Preview-Build ergänzt die PDF.js-Dateien aus `auslagen/vendor/`
- `.github/workflows/preview.yml`: Prüfungen und Vorschau-Deployment ausschließlich für `preview/once`
- `.github/workflows/pages.yml`: prüft Pull Requests und soll nur nach erfolgreichem Push auf `main` veröffentlichen; dieser vorbereitete Workflow ist noch nicht auf GitHub ausgeführt

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
