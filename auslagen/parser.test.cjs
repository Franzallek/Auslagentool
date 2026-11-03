const P=require('./parser.js');
const assert=require('node:assert/strict');
const now=new Date('2026-11-02');
const S={
rechnung:`Bürobedarf Muster GmbH · Musterstraße 1 · 10115 Berlin

Max Mustermann
Beispielweg 5
12345 Berlin

Rechnung Nr. RE-2026-0815
Rechnungsdatum: 28.10.2026
Leistungsdatum: 27.10.2026
Zahlungsziel: 11.11.2026

1 Druckerpapier 5 20,00 100,00
Zwischensumme (netto) 100,00 €
zzgl. 19 % MwSt. 19,00 €
Gesamtbetrag 119,00 €
Bitte überweisen Sie bis zum 11.11.2026
USt-IdNr. DE123456789`,
kassenbon:`REWE Markt GmbH
Hauptstr. 12
10115 Berlin
Brot 2,49 B
Milch 1,19 B
Wasser 12,00 A
SUMME EUR 15,64
Gegeben Bar 20,00
Rückgeld 4,36
Steuer % Netto Steuer Brutto
A 19,0% 10,08 1,92 12,00
B 7,0% 3,40 0,24 3,64
28.10.2026 14:32`,
tank:`Shell Station Berlin
Am Ring 4
12099 Berlin
Datum: 2. November 2026
Super E10 30,5 l
Betrag 45,00 EUR
Netto 37,82
MwSt 19% 7,18`,
gross1000:`Technik Handel AG
Rechnungsdatum 01.10.2026
Fällig am 15.10.2026
Nettobetrag 1.000,00
Umsatzsteuer 19% 190,00
Summe: 1.190,00 €`,
unsure:`Irgendein Laden
kauf 3,50
12,90`
};
for(const [k,v] of Object.entries(S)){const r=P.parse(v,now);console.log('==',k);console.log(JSON.stringify(r))}
assert.equal(P.parse(S.rechnung,now).purpose.value,'Druckerpapier');
assert.equal(P.parse(S.tank,now).purpose.value,'Super E10');
const several=P.parse(S.kassenbon,now);
assert.deepEqual(several.purpose.items,['Brot','Milch','Wasser']);
assert.ok(several.notes.some(note=>note.includes('Auswahlfeld')));
assert.equal(P.parse(S.gross1000,now).purpose,null);
console.log('PASS single-item purpose suggestions and multiple-item/manual fallback');
