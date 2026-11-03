# Go-Live-Prüfstand – 2026-11-03

## Entscheidung

**NO-GO für eine Produktivfreigabe.** Diese Bestandsaufnahme ist keine rechtliche Prüfung und keine Release-Ausnahme. Offene Prüfpunkte bleiben offen; es wird kein Release freigegeben.

Bis zur Bestätigung eines anderen Zielbilds gilt als vorsichtige Arbeitsannahme: privates Einzelwerkzeug mit lokaler Speicherung und optional manuell gestartetem Google-Drive-Entwicklungsabgleich. Der Cloud-Abgleich bleibt für echte Belege gesperrt.

## Tatsächlicher Veröffentlichungsstand

- `preview/once` wurde zuletzt mit Commit `b36c1cb` veröffentlicht. Die GitHub-Pages-Adresse `https://franzallek.github.io/Auslagentool/` antwortet öffentlich mit HTTP 200; HTTP wird auf HTTPS umgeleitet und GitHub Pages liefert HSTS.
- Die veröffentlichte Seite enthält weiterhin den Entwicklungs-Sync (`sync.js`) und `noindex` als HTML-Metatag. `noindex` ist weder Zugriffsschutz noch Datenschutz. Die Vorschau ist anonym erreichbar und ausschließlich für fiktive Testdaten freigegeben.
- Die aktuelle lokale Änderung ergänzt im Entwicklungsabgleich ein dauerhaftes Löschen aller Cloud-Versionen der in der unterschriebenen PDF enthaltenen Belege. Es erscheint erst nach Start des PDF-Downloads als separate Aktion mit zusätzlicher Bestätigung. Lokale Kopien bleiben. Ein minimaler Cloud-Löschvermerk (nur Beleg-ID) und eine lokale Sperrmarkierung verhindern automatisches erneutes Hochladen. Diese Änderung ist **noch nicht committed oder veröffentlicht**; sie ändert daher nicht den derzeit erreichbaren Stand.
- Der einmalige Preview-Auftrag und seine schriftliche Ausnahme in `AUSNAHME-PREVIEW-2026-11-03.md` erlauben keine Nutzung mit echten Belegen und keine dauerhafte Produktivfreigabe.

## Prüfmatrix

| Bereich | Status | Nachweis / offener Punkt |
|---|---|---|
| Datenbank, RLS und Admin-Zugänge | Nicht anwendbar unter der Annahme „lokales Einzelwerkzeug“ | Keine Server-Datenbank, Benutzerkonten oder Admin-Routen; Belege liegen in IndexedDB des jeweiligen Browsers. Bei späterem Backend neu prüfen. |
| Formulare, Login, Turnstile und serverseitige Eingabeprüfung | Teilweise nicht anwendbar; Google-OAuth-Prüfung offen | Es gibt keine App-Registrierung, Passwortanmeldung oder Kontaktform. Google OAuth wird ausschließlich beim manuell gestarteten Entwicklungsabgleich geladen; dann werden ausgewählte Daten direkt mit Google Drive ausgetauscht. OAuth-Herkunft, Consent-Screen, Scope und Kontowechsel müssen mit einem separaten Testkonto abgenommen werden. |
| Geheimnisse und Git-Historie | Offen | Die CI durchsucht ausgewählte Arbeitsdateien mit einer begrenzten Mustersuche. Ein unabhängiger Secret-Scan der vollständigen Git-Historie und eine Prüfung der GitHub-Secret-Scanning-Einstellungen sind nicht erfolgt. Die Google OAuth Client-ID ist öffentlich und kein Secret. |
| Transport und Sicherheitsheader | Teilweise geprüft, offen | HTTP→HTTPS und HSTS wurden am öffentlichen GitHub-Pages-Host beobachtet. CSP, `X-Content-Type-Options`, `Referrer-Policy` und `Permissions-Policy` wurden dort nicht nachgewiesen. GitHub Pages verwendet `auslagen/_headers` nicht. Kein unabhängiger Security-Headers- oder SSL-Labs-Bericht liegt vor. |
| Abhängigkeiten | Teilweise / offen | Es gibt kein `package.json` oder Lockfile; `npm audit` ist daher nicht anwendbar. Dependabot ist nur für GitHub-Actions konfiguriert. Vendored OCR-/PDF-Komponenten und Action-Versionen benötigen eine dokumentierte Lieferketten-/Lizenzprüfung. |
| Fehlerbehandlung und Betrieb | Offen | Eine statische 404-Seite ist vorhanden. Es gibt kein Error-Tracking, Uptime-Monitoring oder automatisches, getrenntes Backup. Diese Punkte sind nicht für eine öffentliche Produktfreigabe bestätigt. |
| Datensicherung und Wiederherstellung | Offen / blockierend | JSON-Export und -Import sind vorhanden. Eine Wiederherstellung in einem getrennten Browserprofil wurde nicht tatsächlich abgenommen; automatische Backups gibt es nicht. Nutzende müssten ihre Sicherungen selbst regelmäßig exportieren und geschützt aufbewahren. |
| SEO und Auffindbarkeit | Nicht für Produktion geprüft | Der aktuelle Stand trägt `noindex`, was zur Vorschau passt. `robots.txt` fehlt (öffentliche Anfrage ergab 404); Sitemap und Canonical sind nicht eingerichtet. Vor einem öffentlichen indexierbaren Start muss bewusst über Indexierung, URL und Metadaten entschieden werden. Local-Business-Schema, Autorenangaben und KI-Suchbots sind für ein privates Werkzeug nicht anwendbar. |
| Performance | Offen | Keine Lighthouse-/Mittelklasse-Smartphone-Messung und keine INP-/LCP-/CLS-Abnahme. Die frühere Browserprüfung der Fensterbreiten ersetzt diese Messungen nicht. |
| E-Mail und Conversion-Tracking | Nicht anwendbar unter der Arbeitsannahme | Keine E-Mail-, Newsletter-, Marketing- oder Conversion-Tracking-Funktion vorhanden. Bei späterer Ergänzung neu prüfen. |
| Datenschutz, Einwilligung und Pflichtangaben | Blockierend für einen öffentlichen Dienst | Es gibt keine veröffentlichte Datenschutzerklärung oder Impressumsprüfung. Die Seite verarbeitet beim Abruf technisch notwendige Verbindungsdaten beim Hoster. Die App hat kein Analyse-/Werbetracking; im derzeit veröffentlichten Stand ist ein ausdrücklich gestarteter Google-Drive-Sync vorhanden. Verantwortlichkeit, Zweck, Rechtsgrundlage, Speicherfristen, Anbieterinformationen und etwaige AVV sind nicht rechtlich geprüft. |
| Barrierefreiheit | Teilweise geprüft, offen | Tastaturbedienung, Theme-Umschalter, Fokus, Kontraste und mehrere Viewportbreiten wurden zuvor lokal geprüft. Kein axe-/Lighthouse-Barrierefreiheitsbericht, keine manuelle Screenreader-Prüfung und keine iOS-/Android-/Browsermatrix. BFSG-Anwendbarkeit und etwaige Erklärung sind nicht beurteilt. |
| Professioneller Eindruck und Browsermatrix | Teilweise geprüft, offen | Seitentitel, Beschreibung, Favicon und individuelles Designsystem sind vorhanden. OG-Bild fehlt; aktuelle Version wurde nicht auf aktuellen Chrome, Safari, Firefox und Edge sowie iOS und Android vollständig abgenommen. |

## Tatsächlich ausgeführte Prüfungen für die lokale Änderung

- `node --check` für die App-JavaScriptdateien; beide Inline-Skripte erfolgreich geparst.
- Die sechs vorhandenen Node-Testdateien für Parser, Sync-Planung, Reports, PDF-Erzeugung und PDF-Import bestanden.
- `git diff --check` war erfolgreich.
- Der aktuelle lokale Build enthält wieder den ausdrücklich manuellen Entwicklungsabgleich und die neue PDF-Löschaktion. Ein synthetischer Browserablauf mit Testbeleg prüfte Unterschrift/PDF-Vorschau, die zunächst deaktivierte Löschaktion, Freigabe nach Start des PDF-Downloads, übergebene Beleg-ID und Statusmeldung; die Cloud-API war dabei gemockt.
- Der Preview-Workflow auf dem noch veröffentlichten Commit `b36c1cb` war erfolgreich. Das ist **kein** CI-Ergebnis für die noch nicht veröffentlichten Änderungen.

Nicht durchgeführt: vollständiger Secret-/Abhängigkeitsscan, Restore-Abnahme mit separatem Profil, automatisierte oder manuelle vollständige Barrierefreiheitsprüfung, Mobilgeräte-/Browsermatrix, Performance-Labormessung, echte Google-OAuth-/Drive-Löschung und rechtliche Prüfung.
Die neue Löschfunktion wurde nur mit Unit-Tests gegen einen Fake-Remote geprüft, nicht mit einem echten Google-Konto. Die Google-Drive-API dokumentiert `files.delete` als permanentes Löschen ohne Papierkorb und akzeptiert den verwendeten `drive.appdata` OAuth-Scope. Die Löschmarkierung bleibt als minimale Metadatei im App-Datenordner; sie enthält die Beleg-ID, aber keine Belegdaten oder Bilder.

## Erforderliche Freigabeschritte

1. Betreiber bestätigt Ziel und Nutzerkreis: privates Einzelwerkzeug, internes Team oder öffentlicher Dienst. Das bestimmt Zugriffsschutz und anwendbare Datenschutz-/Rechtspflichten.
2. Den neuen PDF-Checkout-/Cloud-Löschablauf mit einem separaten Testkonto und ausschließlich fiktiven Belegen prüfen: mehrere Versionen eines Belegs, Abbruch, Teilfehler und Wiederholung, lokal verbleibender Beleg und Verhalten eines zweiten synchronisierten Geräts. Erst nach gesonderter Freigabe veröffentlichen.
3. Datenschutzhinweise, Impressumspflicht, Hosting-Verarbeitung und anwendbare Rechtsgrundlagen mit den tatsächlichen Betreiberdaten fachlich prüfen und dokumentieren; keine Platzhalter als Freigabe ausgeben.
4. JSON-Backup in einem getrennten Profil tatsächlich wiederherstellen und Backup-Aufbewahrung sowie Verantwortlichkeit festlegen.
5. Sicherheits-, Browser-, Geräte-, Barrierefreiheits- und Performanceprüfungen für den bestätigten Zielumfang abschließen und Ergebnisse mit Prüfer/Datum dokumentieren.
6. Nicht anwendbare Checklistenpunkte jeweils für den bestätigten Umfang begründen. Es wird keine Ausnahme von der Go-Live-Anweisung angenommen.
7. Erst nach geschlossenen Punkten und ausdrücklicher Freigabe eine Produktionsauslieferung planen. Dieser Prüfstand autorisiert keinen Commit, Push, Merge oder Deployment.
