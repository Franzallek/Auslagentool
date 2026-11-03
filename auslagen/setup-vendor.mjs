// Einmalig ausführen: node setup-vendor.mjs   (Node.js 18 oder neuer, Internet nötig)
import { mkdir, writeFile } from 'node:fs/promises';
const V = '5.1.1';
const P = '4.10.38'; // PDF.js (Apache-2.0), Legacy-Build für ältere Browser
const files = [
  [`https://cdn.jsdelivr.net/npm/tesseract.js@${V}/dist/tesseract.min.js`, 'vendor/tesseract.min.js'],
  [`https://cdn.jsdelivr.net/npm/tesseract.js@${V}/dist/worker.min.js`, 'vendor/worker.min.js'],
  ...['tesseract-core.wasm.js','tesseract-core-simd.wasm.js','tesseract-core-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js']
    .map(f => [`https://cdn.jsdelivr.net/npm/tesseract.js-core@${V}/${f}`, `vendor/core/${f}`]),
  ['https://tessdata.projectnaptha.com/4.0.0/deu.traineddata.gz', 'vendor/lang/deu.traineddata.gz'],
  [`https://cdn.jsdelivr.net/npm/pdfjs-dist@${P}/legacy/build/pdf.min.mjs`, 'vendor/pdf.min.mjs'],
  [`https://cdn.jsdelivr.net/npm/pdfjs-dist@${P}/legacy/build/pdf.worker.min.mjs`, 'vendor/pdf.worker.min.mjs'],
];
await mkdir('vendor/core', { recursive: true });
await mkdir('vendor/lang', { recursive: true });
for (const [url, out] of files) {
  const r = await fetch(url);
  if (!r.ok) { console.error('FEHLER', r.status, url); process.exit(1); }
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(out, buf);
  console.log('OK', out, (buf.length / 1024).toFixed(0) + ' KB');
}
console.log('Fertig. Ordner vendor/ jetzt mit hochladen.');
