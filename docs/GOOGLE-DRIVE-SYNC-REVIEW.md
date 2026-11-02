# Google-Drive-Abgleich: technischer Prüfstand

Stand: 2026-11-02. Branch: feature/google-drive-sync. Keine Go-Live-Freigabe. Keine Veröffentlichung und kein Merge nach main durch diesen Commit.

## Tatsächlich geprüft

Statische Durchsicht von auslagen/sync.js, auslagen/sync-config.js und .github/workflows/pages.yml über den GitHub-Connector. Keine Ausführung der bestehenden Tests in diesem Arbeitsschritt. Kein Google-Login, kein iPhone-Test, kein vollständiger Security-Audit.

Die öffentliche OAuth-Client-ID wurde in sync-config.js hinterlegt. Es werden kein Client-Secret, Passwort oder Token eingecheckt.

## Blocker vor Nutzung mit echten Belegen

1. Kontentrennung: sync.js nutzt denselben IndexedDB-Bestand und denselben localStorage-Schlüssel für jedes Google-Konto. Ein Kontowechsel kann vorhandene lokale Belege in das andere Drive übertragen. Verifizierte Kontokennung verwenden; lokale Daten und Sync-Zustand je Konto isolieren. Nicht zugeordnete Altbelege nur nach expliziter Importentscheidung übernehmen.
2. Konflikte: timestamp-basierte Überschreibung ohne Konfliktdialog. Gemeinsame Basisrevision je Beleg speichern; beidseitige Änderungen erkennen und beide Fassungen erhalten oder Entscheidung verlangen. Geräteuhr allein reicht nicht. Gleichzeitige Schreibzugriffe ebenfalls absichern.
3. Löschen: Fehlen eines bekannten lokalen Datensatzes wird als Löschauftrag interpretiert. Lokales Bereinigen darf keine Cloud-Löschung auslösen. Explizite Löschwarteschlange und getrennte Aktionen für lokal entfernen und überall löschen einführen.
4. Löschreihenfolge: Remote-Beleg wird entfernt, bevor die Löschmarke geschrieben ist. Fehler dazwischen können Wiederherstellung bzw. Wiederauftauchen auslösen. Erst dauerhafte Löschmarke, anschließend Bereinigung; Wiederholungen müssen sicher sein.
5. Importvalidierung: Steuerpositionen, reale Kalenderdaten, zulässige Feldlängen, Dateigröße und Payload-Zuordnung müssen zusätzlich geprüft werden.
6. CI-Skriptextraktion: lastIndexOf('</script>') kann nach Ergänzung externer Script-Tags ungültigen JavaScript-Text extrahieren. Inline-Skripte einzeln extrahieren und prüfen.
7. Deployment: workflow_dispatch erlaubt derzeit auch einen Deploy vom Entwicklungsbranch. Deployment vor einem Test ausschließlich auf freigegebenes main beschränken; auf Feature-Branches nur Checks, keine öffentliche Staging-Seite.
8. Accountwechsel und Offline-Start: eingeloggte Identität anzeigen; Token nur im Arbeitsspeicher; nach Ablauf interaktive erneute Autorisierung. Offline keine neue Identität behaupten und keine Uploads automatisch starten.
9. Ausgelieferte Oberfläche, Service-Worker-Cache, Datenschutzhinweise und Google-Skriptladen vor Einwilligung im Browser nachprüfen. Noindex ist kein Zugriffsschutz.

## Abnahmetests (noch auszuführen)

- A und B auf demselben Browser: keinerlei Übertragung oder Anzeige fremder Belege.
- Unzugeordnete Altbelege: Upload ausschließlich nach Auswahl und Bestätigung.
- Handy erfasst Beleg mit Bild; PC lädt, ändert; Handy übernimmt nach Abgleich.
- Beide Geräte ändern denselben Beleg offline: beide Varianten bleiben bis zur Entscheidung erhalten.
- Lokal löschen, Browserspeicher leeren und Verbindung trennen: keine implizite Cloud-Löschung.
- Explizit überall löschen: Löschmarke erreicht zweites Gerät; Fehler und Wiederholung ohne Datenverlust.
- Zwei gleichzeitige Abgleiche und doppelte Remote-Dateinamen: kein unbemerkter Verlust.
- Tokenablauf, Popup-Blockierung, 403 und Netzabbruch: verständlicher Fehler, keine falsche Erfolgsmeldung.
- JSON-Backup exportieren und tatsächlich in getrenntem Testprofil wiederherstellen.
- Chrome, Safari/iPhone, Firefox, Edge; Offline-Erkennung separat vom Online-Abgleich prüfen.

## Korrektur früherer Aussagen

Google Drive ersetzt weder Backup-Konzept noch Datenschutzprüfung. Cloud-Synchronisierung erzeugt Datenverarbeitung beim Anbieter. Es gibt keine pauschale Zusage vollständiger Kostenfreiheit oder Compliance. Ein frei eingetragener Name ist kein verifizierter Nachweis des Erfassers.
