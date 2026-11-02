# Auslagen – Prototyp 02 (lokale Belegerkennung)

## Was neu ist
- Foto/Bild wählen → Texterkennung (Tesseract.js, Deutsch) läuft im Browser auf dem Gerät.
- Regelbasierte Zuordnung: Datum, Verkäufer, Rechnungsnummer, Währung, Netto, Steuer (auch mehrere Sätze), Brutto.
- Jedes Feld ist markiert: ✓ erkannt · ≈ berechnet · ⚠ bitte prüfen.
- Erkannter Text ist sichtbar und editierbar; „Felder neu ermitteln“ wertet ihn erneut aus.
- Speicherung in IndexedDB statt localStorage (deutlich mehr Platz für Belegbilder).

## Wichtig: Ohne Hosting funktioniert es auf dem iPhone nicht
Die Texterkennung nutzt Web Worker und Service Worker. Diese laufen nicht zuverlässig, wenn die Datei lokal aus der Dateien-App geöffnet wird. Nötig: die Ordner als Website über HTTPS bereitstellen (z. B. GitHub Pages, Netlify, Cloudflare Pages). Zum Testen am Computer: im Ordner `python3 -m http.server 8000`, dann http://localhost:8000 öffnen.

## Offline-Betrieb herstellen (einmalig)
1. Im Ordner `node setup-vendor.mjs` (oder `sh setup-vendor.sh`) ausführen. Das lädt Tesseract.js 5.1.1, die Rechenmodule und die deutschen Sprachdaten nach `vendor/` (ca. 25–40 MB).
2. Gesamten Ordner inklusive `vendor/` hosten.
3. Seite einmal mit Internet öffnen, neu laden, einen Beleg auslesen.
4. Unter „Export & Daten“ den Offline-Check ausführen.
5. Test: Flugmodus an, App öffnen, Beleg auslesen. Erst wenn das klappt, ist es offlinefähig.

Ohne `vendor/` lädt die App die Erkennung aus dem Internet (CDN) und versucht, sie zwischenzuspeichern. Das ist nur ein Notweg und nicht als Offline-Garantie getestet.

## Grenzen
- Nicht auf echten Belegen und nicht auf einem iPhone getestet; getestet ist nur die Auswertungslogik auf Beispieltexten (`node parser.test.cjs`).
- PDFs werden nicht ausgelesen (nur Bilder).
- Erkennung hängt stark von Foto-Qualität ab: gerade, hell, scharf, formatfüllend.
- Kassenbons mit Spalten und Rechnungen mit Tabellen sind schwierig; „Layout“ umstellen und erneut auslesen.
- Speicher gehört zur Webadresse. Home-Bildschirm-App und Safari-Tab können getrennte Daten haben – vorher JSON-Sicherung machen.
- Keine Cloud, keine Anmeldung, keine Einreichung, keine revisionssichere Archivierung. Das Belegbild wird als verkleinertes JPEG gespeichert.
