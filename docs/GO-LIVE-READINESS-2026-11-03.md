# Go-Live-Prüfstand – 2026-11-03

## Entscheidung

**NO-GO für echte Belege bis zum Abschluss der untenstehenden Abnahmen.** Zielbild ist jetzt ein kostenfreies, dezentrales Werkzeug für bis zu 20 Personen: statische öffentliche Website, lokale Daten je Browserprofil und optional je persönliches Google Drive. Diese Website ist ausdrücklich nicht zugriffsgeschützt und daher keine private Website. Es gibt keinen zentralen App-Server oder gemeinsamen Belegbestand; Google erhält Belege nur, wenn die betreffende Person den Drive-Abgleich ausdrücklich startet und bestätigt.

Die App stellt keine Anmeldung pro Person bereit. Der lokale Browser-/Gerätespeicher ist die Nutzergrenze: Wer dasselbe Browserprofil verwenden kann, kann dessen Belege sehen und ändern. Jede Person braucht daher ein eigenes Gerät oder Browserprofil sowie ein eigenes Google-Konto. Die Drive-Bindung blockiert den Abgleich eines anderen Kontos im bereits zugeordneten lokalen Profil, ersetzt aber keine lokale Zugriffskontrolle.

## Tatsächlicher Veröffentlichungsstand

- `preview/once` wurde zuletzt mit Commit `6700972` veröffentlicht. Der Preview-Workflow #9 war erfolgreich. Die GitHub-Pages-Adresse `https://franzallek.github.io/Auslagentool/` ist öffentlich und ohne Zugriffssperre erreichbar; HTTP wird auf HTTPS umgeleitet.
- Die veröffentlichte Seite enthält den ausdrücklich manuell gestarteten Entwicklungs-Sync. `noindex` ist weder Zugriffsschutz noch Datenschutz. Die Website ist frei erreichbar; bis zum Abschluss der Abnahmen ausschließlich fiktive Testdaten verwenden.
- Die PDF-Checkout-Löschfunktion ist nun veröffentlicht: Nach Start des PDF-Downloads kann optional nach separater Bestätigung jede Cloud-Version der in der PDF enthaltenen Belege dauerhaft gelöscht werden. Lokale Kopien bleiben. Ein minimaler Cloud-Löschvermerk (Beleg-ID) und eine lokale Sperrmarkierung verhindern automatisches erneutes Hochladen. Echte Google-Konten und tatsächliche Löschungen wurden nicht getestet.
- Der einmalige Preview-Auftrag und seine schriftliche Ausnahme in `AUSNAHME-PREVIEW-2026-11-03.md` erlauben keine Nutzung mit echten Belegen und keine dauerhafte Produktivfreigabe.
- `main` und `preview/once` sind auseinander gelaufen: `main` enthält fünf nicht in diesem Branch enthaltene Commits; `preview/once` enthält 15 nicht in `main` enthaltene Commits. Eine Promotion darf daher nur als geprüfter Merge erfolgen, nicht durch Branch-Überschreiben oder Force-Push.
- GitHub Pages stellt nur eine gemeinsame öffentliche Adresse bereit. `main` und der Preview-Workflow veröffentlichen beide auf dieselbe Adresse; für den Produktiv-Cutover muss der Preview-Deploy vor bzw. im selben freigegebenen Release deaktiviert und der einmalige Preview-Branch anschließend gemäß Ausnahme entfernt werden. Sonst könnte ein späterer Preview-Push die Produktivseite wieder ersetzen.
- Der aktuelle `main`-Workflow würde durch den Stand auf `preview/once` ohne Anpassung seinen Deploy-Job verlieren. Lokal ist ein neuer Workflow vorbereitet, der Tests auf Pull Requests ausführt und nur nach einem erfolgreichen Push auf `main` veröffentlicht. Er wurde noch nicht von GitHub Actions validiert oder ausgeführt.

## Lokale, noch nicht veröffentlichte Härtung

- Die Sync-Logik fragt bei bereits gebundenem lokalem Konto ein fehlendes Drive-Vault nur lesend ab. Ein Kontowechsel kann dadurch nicht einmal ein leeres Vault im fremden Drive anlegen, bevor er blockiert wird. Regressionstests decken ein anderes vorhandenes und ein noch nicht eingerichtetes Drive ab und prüfen, dass lokale Belege und Sync-Zustand unverändert bleiben.
- Die Oberfläche und README warnen klar, dass Belege im Browserprofil nicht zwischen Personen isoliert sind und die Website öffentlich erreichbar bleibt.
- Die Frage „Google Drive verbinden?“ und der manuelle Abgleich wurden im ersten Erfassungsbereich platziert. Es erfolgt weiterhin keine automatische Anmeldung oder Script-Ladung beim Seitenaufruf; die Google-Anmeldung beginnt erst nach Button-Klick und Bestätigung. Diese UI-Änderung ist lokal und noch nicht veröffentlicht.
- Nach erfolgreichem OAuth werden Google-`sub` und verifizierte E-Mail im lokalen Sync-Zustand gespeichert; die E-Mail wird beim nächsten Seitenaufruf als zuletzt verbundenes Konto angezeigt. Passwort und Token werden nicht gespeichert, die E-Mail wird nicht in Drive-Belegdaten geschrieben. Ein Konto mit anderer `sub` wird vor jedem Drive-Zugriff blockiert. Dafür wurden die minimal nötigen OAuth-Scopes `openid email` zusätzlich zu `drive.appdata` ergänzt; der geänderte Consent muss noch mit Testkonten verifiziert werden.
- Der unterschriebene PDF-Checkout bietet lokal eine Checkbox für ein Gesamt-PDF mit Kalkulation plus ausgewählten Belegdateien. Nach Start des Downloads erfolgt die bestehende separate Sicherheitsabfrage vor einer dauerhaften Cloud-Löschung. Die PDF-Seitenerstellung und Cloud-Löschung wurden nur automatisiert getestet; echte Belege, Google-Konten und die Bedienung auf Mobilgeräten bleiben abzunehmen.
- Ein lokaler heuristischer Muster-Scan über 74 Git-Commits und die aktuellen Textdateien fand keine Treffer für ausgewählte private Schlüssel und verbreitete Tokenformate, wenn die vier Tesseract-Kerndateien ausgeschlossen werden, deren Integrität der Preview-Workflow prüft. Das ist kein spezialisierter Secret-Scan und kein Nachweis über binäre, verschlüsselte oder nicht erkannte Zugangsdaten; GitHub-Secret-Scanning-Einstellungen sind nicht geprüft.
- Diese Änderungen sowie der vorbereitete `main`-Workflow sind uncommitted; noch kein PR, Merge, Push oder Deploy.

## Prüfmatrix

| Bereich | Status | Nachweis / offener Punkt |
|---|---|---|
| Datenbank, RLS und Admin-Zugänge | Kein zentraler App-Server; lokale Nutzertrennung durch Profilregel | Belege liegen in IndexedDB des jeweiligen Browserprofils. Gemeinsame Profile sind nicht für mehrere Personen geeignet. Die Teammitglieder verwalten keine gemeinsamen Belege. |
| Formulare, Login, Turnstile und serverseitige Eingabeprüfung | Kein App-Login; Google-OAuth-Prüfung offen | Google OAuth wird ausschließlich beim manuell gestarteten Entwicklungsabgleich geladen; ausgewählte Daten gehen direkt in das App-Datenverzeichnis des gewählten Google-Kontos. `drive.appdata` ist der verwendete Scope. OAuth-Consent, Kontowechsel und Widerruf müssen mit zwei Testkonten geprüft werden. |
| Geheimnisse und Git-Historie | Teilweise geprüft / offen | Lokaler Heuristikscan über Historie und aktuelle Textdateien ohne Treffer der gewählten Muster; Tesseract-Kerndateien werden separat gegen veröffentlichte Originale geprüft. Kein spezialisierter Scanner und keine Prüfung der GitHub-Secret-Scanning-Einstellungen. Die OAuth-Client-ID ist öffentlich und kein Secret. |
| Transport und Sicherheitsheader | Teilweise geprüft, offen | HTTP→HTTPS und HSTS wurden am öffentlichen GitHub-Pages-Host beobachtet. CSP, `X-Content-Type-Options`, `Referrer-Policy` und `Permissions-Policy` wurden dort nicht nachgewiesen. GitHub Pages verwendet `auslagen/_headers` nicht. Kein unabhängiger Security-Headers- oder SSL-Labs-Bericht liegt vor. |
| Abhängigkeiten | Teilweise / offen | Es gibt kein `package.json` oder Lockfile; `npm audit` ist daher nicht anwendbar. Dependabot ist nur für GitHub-Actions konfiguriert. Vendored OCR-/PDF-Komponenten und Action-Versionen benötigen eine dokumentierte Lieferketten-/Lizenzprüfung. |
| Fehlerbehandlung und Betrieb | Offen | Eine statische 404-Seite ist vorhanden. Es gibt kein Error-Tracking, Uptime-Monitoring oder automatisches, getrenntes Backup. Diese Punkte sind nicht für eine öffentliche Produktfreigabe bestätigt. |
| Datensicherung und Wiederherstellung | Offen / blockierend | JSON-Export mit eingebetteten Belegdateien und ergänzender Import sind vorhanden. Eine Wiederherstellung in einem getrennten Browserprofil wurde nicht tatsächlich abgenommen; automatische Backups gibt es nicht. Jede Person muss selbst regelmäßig sichern und ihre Datei geschützt verwahren. |
| SEO und Auffindbarkeit | Nicht für Produktion geprüft | Der aktuelle Stand trägt `noindex`, was zur Vorschau passt. `robots.txt` fehlt (öffentliche Anfrage ergab 404); Sitemap und Canonical sind nicht eingerichtet. Vor einem öffentlichen indexierbaren Start muss bewusst über Indexierung, URL und Metadaten entschieden werden. Local-Business-Schema, Autorenangaben und KI-Suchbots sind für ein privates Werkzeug nicht anwendbar. |
| Performance | Offen | Keine Lighthouse-/Mittelklasse-Smartphone-Messung und keine INP-/LCP-/CLS-Abnahme. Die frühere Browserprüfung der Fensterbreiten ersetzt diese Messungen nicht. |
| E-Mail und Conversion-Tracking | Nicht anwendbar unter der Arbeitsannahme | Keine E-Mail-, Newsletter-, Marketing- oder Conversion-Tracking-Funktion vorhanden. Bei späterer Ergänzung neu prüfen. |
| Datenschutz, Einwilligung und Pflichtangaben | Offen; Anwendbarkeit fachlich klären | Hosting verarbeitet technische Verbindungsdaten; Google verarbeitet Daten, sobald eine Person den optionalen Sync verwendet. Es gibt kein Analyse-/Werbetracking und keinen zentralen App-Datenspeicher. Verantwortlichkeit, Zweck, Rechtsgrundlage, Speicherfristen, erforderliche Hinweise und Anbieterbedingungen sind dennoch nicht fachlich geprüft. |
| Barrierefreiheit | Teilweise geprüft, offen | Tastaturbedienung, Theme-Umschalter, Fokus, Kontraste und mehrere Viewportbreiten wurden zuvor lokal geprüft. Kein axe-/Lighthouse-Barrierefreiheitsbericht, keine manuelle Screenreader-Prüfung und keine iOS-/Android-/Browsermatrix. BFSG-Anwendbarkeit und etwaige Erklärung sind nicht beurteilt. |
| Professioneller Eindruck und Browsermatrix | Teilweise geprüft, offen | Seitentitel, Beschreibung, Favicon und individuelles Designsystem sind vorhanden. OG-Bild fehlt; aktuelle Version wurde nicht auf aktuellen Chrome, Safari, Firefox und Edge sowie iOS und Android vollständig abgenommen. |

## Tatsächlich ausgeführte Prüfungen

- `node --check` für die App-JavaScriptdateien; beide Inline-Skripte erfolgreich geparst.
- Die sechs vorhandenen Node-Testdateien für Parser, Sync-Planung, Reports, PDF-Erzeugung und PDF-Import bestanden.
- `git diff --check` war erfolgreich.
- Ein synthetischer Browserablauf mit Testbeleg prüfte Unterschrift/PDF-Vorschau, zunächst deaktivierte Löschaktion, Freigabe nach Start des PDF-Downloads, übergebene Beleg-ID und Statusmeldung; die Cloud-API war gemockt.
- Preview-Workflow #9 für Commit `6700972` war erfolgreich; Root-Seite und benötigte Skripte wurden nach Veröffentlichung mit HTTP 200 abgerufen.
- Für die lokalen Änderungen: alle JavaScript-Syntaxprüfungen, beide Inline-Skriptprüfungen, alle sechs Node-Testdateien und `git diff --check` waren erfolgreich.
- Die vorbereitete Workflow-Datei wurde mit Prettier geparst und formatiert. `actionlint` ist in der Umgebung nicht installiert; GitHub Actions hat diese lokale Fassung noch nicht ausgeführt.

Nicht durchgeführt: spezialisierter vollständiger Secret-/Abhängigkeitsscan, Zwei-Konten-Abnahme, Restore-Abnahme mit separatem Profil, automatisierte oder manuelle vollständige Barrierefreiheitsprüfung, Mobilgeräte-/Browsermatrix, Performance-Labormessung, echte Google-OAuth-/Drive-Löschung, Validierung/Ausführung des neuen Produktions-Workflows auf GitHub und fachliche Datenschutz-/Rechtsprüfung.
Die neue Löschfunktion wurde nur mit Unit-Tests gegen einen Fake-Remote geprüft, nicht mit einem echten Google-Konto. Die Google-Drive-API dokumentiert `files.delete` als permanentes Löschen ohne Papierkorb und akzeptiert den verwendeten `drive.appdata` OAuth-Scope. Die Löschmarkierung bleibt als minimale Metadatei im App-Datenordner; sie enthält die Beleg-ID, aber keine Belegdaten oder Bilder.

## Erforderliche Freigabeschritte

1. **Nutzertrennung:** mit zwei separaten Google-Testkonten und zwei getrennten Browserprofilen Belege erfassen und abgleichen. Nach Kontowechsel im bereits zugeordneten Profil muss der Sync blockieren; im getrennten Profil darf nur das eigene Drive geladen werden. Verifizieren, dass kein Nutzer ein gemeinsames Browserprofil verwendet.
2. **Datenverlust und Auth:** Speichern, Bearbeiten, Löschen, Offline-Nutzung sowie fehlgeschlagene/widerrufene OAuth-Berechtigung testen. Konflikt und Netzwerkfehler dürfen keinen Beleg still überschreiben oder automatisch löschen.
3. **Backup/Wiederherstellung:** vollständiges JSON einschließlich eingebetteter Belegdatei exportieren und in einem separaten Browserprofil importieren; Felder, Status und Belegdatei öffnen/prüfen. Backup vorab und regelmäßig für alle Nutzer verbindlich erklären.
4. **Sichere Darstellung und Lieferkette:** HTML-/Script-Payloads in importierten Textfeldern auf sichere Textdarstellung prüfen; vollständigen Secret-Scan einschließlich Git-Historie sowie Komponenten-/Lizenzprüfung dokumentieren.
5. **Alltag und Updates:** auf Betreiber-iPhone und PC den geforderten Ablauf einschließlich Offline und fehlgeschlagener Anmeldung durchführen. Service-Worker-Update und Rollback prüfen, dass IndexedDB erhalten bleibt und die vorige App-Version wiederhergestellt werden kann.
6. **Betriebs-/Datenschutzprüfung:** dokumentieren, dass die Website öffentlich ist, keine Belege an einen App-Server sendet, Google aber beim Sync Belegdaten erhält. Fachlich klären, welche Hinweise/Verantwortlichkeiten für den Betreiber und die Gruppe erforderlich sind.
7. **Freigabe:** offene Prüfpunkte mit Prüfer, Datum und Ergebnis aktualisieren. Erst danach echte Belege erlauben. Die öffentliche GitHub-Pages-Seite bleibt auch dann öffentlich; diese Freigabe macht die Website nicht zugriffsgeschützt.
