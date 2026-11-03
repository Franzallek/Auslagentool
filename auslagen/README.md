# Auslagen – Prototyp 02 (lokale Belegerkennung)

## Was neu ist
- Foto/Bild wählen → Texterkennung (Tesseract.js, Deutsch) läuft im Browser auf dem Gerät.
- Regelbasierte Zuordnung: Datum, Verkäufer, Rechnungsnummer, Währung, Netto, Steuer (auch mehrere Sätze), Brutto.
- Jedes Feld ist markiert: ✓ erkannt · ≈ berechnet · ⚠ bitte prüfen.
- Erkannter Text ist sichtbar und editierbar; „Felder neu ermitteln“ wertet ihn erneut aus.
- Speicherung in IndexedDB statt localStorage (deutlich mehr Platz für Belegbilder).
- PDF-Import: Ein PDF mit mehreren Rechnungen wird in „Datei auswählen“ gewählt, aufgeteilt und Rechnung für Rechnung ins Formular geladen.

## PDF-Import
1. In „Datei auswählen“ ein PDF wählen (maximal 15 MB, 60 Seiten).
2. Aufteilung wählen: „Eine Rechnung pro Seite“ oder „Eigene Aufteilung“ (Seiten zu einer Rechnung zusammenfassen oder auslassen). Die Zusammenfassung zeigt die Zuordnung.
3. „Import starten“: Die erste Rechnung erscheint im Formular. Felder prüfen, „Beleg speichern“ wählen, danach lädt die nächste automatisch. Alternativ „Weiter zur nächsten Rechnung“.
4. Bei PDFs mit echtem Text wird der Text direkt übernommen. Bei eingescannten PDFs läuft die Texterkennung wie bei Fotos.

Grenzen: Pro Rechnung werden höchstens die ersten 3 Seiten gelesen. Gespeichert wird ein verkleinertes JPEG der Seiten, nicht das PDF-Original. Die Bibliothek PDF.js (Apache-2.0) muss wie Tesseract einmalig über `setup-vendor` nach `vendor/` geladen werden.

## Wichtig: Ohne Hosting funktioniert es auf dem iPhone nicht
Die Texterkennung nutzt Web Worker und Service Worker. Diese laufen nicht zuverlässig, wenn die Datei lokal aus der Dateien-App geöffnet wird. Nötig: die Ordner als Website über HTTPS bereitstellen (z. B. GitHub Pages, Netlify, Cloudflare Pages). Zum Testen am Computer: im Ordner `python3 -m http.server 8000`, dann http://localhost:8000 öffnen.

## Offline-Betrieb herstellen (einmalig)
1. Im Ordner `node setup-vendor.mjs` (oder `sh setup-vendor.sh`) ausführen. Das lädt Tesseract.js 5.1.1, die Rechenmodule, die deutschen Sprachdaten und PDF.js 4.10.38 nach `vendor/` (ca. 25–40 MB).
2. Gesamten Ordner inklusive `vendor/` hosten.
3. Seite einmal mit Internet öffnen, neu laden, einen Beleg auslesen.
4. Unter „Export & Daten“ den Offline-Check ausführen.
5. Test: Flugmodus an, App öffnen, Beleg auslesen. Erst wenn das klappt, ist es offlinefähig.

Ohne `vendor/` lädt die App die Erkennung aus dem Internet (CDN) und versucht, sie zwischenzuspeichern. Das ist nur ein Notweg und nicht als Offline-Garantie getestet. Der PDF-Import hat keinen solchen Notweg und braucht `vendor/pdf.min.mjs` und `vendor/pdf.worker.min.mjs`.

## Grenzen
- Nicht auf echten Belegen und nicht auf einem iPhone getestet; getestet ist nur die Auswertungslogik auf Beispieltexten (`node parser.test.cjs`, `node pdfimport.test.cjs`).
- Die Oberfläche des PDF-Imports ist noch nicht im Browser getestet.
- Erkennung hängt stark von Foto-Qualität ab: gerade, hell, scharf, formatfüllend.
- Kassenbons mit Spalten und Rechnungen mit Tabellen sind schwierig; „Layout“ umstellen und erneut auslesen.
- Speicher gehört zur Webadresse. Home-Bildschirm-App und Safari-Tab können getrennte Daten haben – vorher JSON-Sicherung machen.
- Keine Cloud, keine Anmeldung, keine Einreichung, keine revisionssichere Archivierung. Das Belegbild wird als verkleinertes JPEG gespeichert.
