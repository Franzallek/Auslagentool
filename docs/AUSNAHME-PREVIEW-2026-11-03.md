# Schriftliche Ausnahme: einmalige Vorschau des Google-Drive-Abgleichs

Grundlage: Go-Live-Anweisung für Websites und Apps (Grundregel: kein Release bei offenen Punkten; Ausnahmen nur schriftlich).

## Eckdaten

- Datum: 2026-11-03
- Verantwortlich: Franz Legel
- Frist: 2026-11-03, 23:59 Uhr. Danach Vorschau abschalten (siehe Auflagen).
- Gegenstand: einmalige öffentliche Vorschau der Entwicklungsversion (Branch feature/google-drive-sync) auf GitHub Pages

## Begründung

- Der echte Google-Login lässt sich nur auf der freigegebenen Herkunft https://franzallek.github.io testen.
- Ohne diesen Test bleiben Anmeldung, Drive-Zugriff und iPhone-Verhalten ungeprüft.
- Die Vorschau dient ausschließlich dem Test mit fiktiven Belegen.

## Offene Blocker (Stand des Prüfberichts)

- Konfliktauflösung ist nicht implementiert; Konflikte werden nur gemeldet.
- Keine verifizierte Erstellerzuordnung.
- Keine HTTP-Header (HSTS, CSP) auf GitHub Pages.
- Datenschutzhinweise, Impressum-Frage und Barrierefreiheitsprüfung sind nicht abgeschlossen.
- Echter Google-Login, Drive-API und iPhone-Verhalten sind noch nicht getestet.

## Auflagen

- Nur fiktive Testbelege verwenden. Keine echten Rechnungen oder personenbezogenen Daten Dritter.
- Nur das eigene Google-Konto als Testnutzer verwenden.
- Nach dem Test: Workflow auf main erneut ausführen, damit wieder die freigegebene Version online ist.
- Nach dem Test: Branch preview/once löschen und die Branch-Freigabe in der Umgebung github-pages entfernen.
- Nach dem Test: Testdaten im Drive-App-Ordner entfernen oder den Zugriff der App im Google-Konto widerrufen.
- Ergebnis des Tests im Prüfbericht docs/GOOGLE-DRIVE-SYNC-REVIEW.md nachtragen.

## Ausdrücklich nicht erteilt

- Keine Freigabe für den Betrieb mit echten Belegen.
- Kein Merge nach main.
- Keine Dauerfreigabe.
