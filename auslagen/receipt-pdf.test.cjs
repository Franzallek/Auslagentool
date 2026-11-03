const assert=require('node:assert/strict');
const {buildPdf}=require('./receipt-pdf.js');
const jpeg=Uint8Array.from([0xff,0xd8,0xff,0xd9]);
const pages=[
 {width:595.28,height:841.89,imageWidth:100,imageHeight:150,jpegBytes:jpeg},
 {width:841.89,height:595.28,imageWidth:150,imageHeight:100,jpegBytes:jpeg}
];
const copy=pages.map(p=>({...p,jpegBytes:new Uint8Array(p.jpegBytes)}));
const pdf=buildPdf(pages),text=Buffer.from(pdf).toString('latin1');
assert.ok(text.startsWith('%PDF-1.4'));
assert.match(text,/\/Count 2\b/);
assert.match(text,/\/MediaBox \[0 0 595\.28 841\.89\]/);
assert.match(text,/\/MediaBox \[0 0 841\.89 595\.28\]/);
assert.equal((text.match(/\/Subtype \/Image/g)||[]).length,2);
const offset=Number(text.match(/startxref\n(\d+)\n/)[1]);
assert.equal(text.slice(offset,offset+4),'xref');
assert.ok(text.trimEnd().endsWith('%%EOF'));
assert.deepEqual(pages,copy);
assert.throws(()=>buildPdf([]),/Keine Belegseiten/);
assert.throws(()=>buildPdf([{...pages[0],width:0}]),/Ungültiges PDF-Seitenformat/);
assert.throws(()=>buildPdf([{...pages[0],jpegBytes:new Uint8Array()}]),/Ungültiges Belegbild/);
assert.throws(()=>buildPdf(Array.from({length:251},()=>pages[0])),/250 Seiten/);
process.stdout.write('PASS image-only PDF serialization, mixed page sizes, xref and input immutability\n');
