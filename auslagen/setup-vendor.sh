#!/bin/sh
# Einmalig ausführen: sh setup-vendor.sh   (curl und Internet nötig)
set -e
V=5.1.1
P=4.10.38
mkdir -p vendor/core vendor/lang
curl -fL -o vendor/tesseract.min.js https://cdn.jsdelivr.net/npm/tesseract.js@$V/dist/tesseract.min.js
curl -fL -o vendor/worker.min.js https://cdn.jsdelivr.net/npm/tesseract.js@$V/dist/worker.min.js
for f in tesseract-core.wasm.js tesseract-core-simd.wasm.js tesseract-core-lstm.wasm.js tesseract-core-simd-lstm.wasm.js; do
  curl -fL -o vendor/core/$f https://cdn.jsdelivr.net/npm/tesseract.js-core@$V/$f
done
curl -fL -o vendor/lang/deu.traineddata.gz https://tessdata.projectnaptha.com/4.0.0/deu.traineddata.gz
curl -fL -o vendor/pdf.min.mjs https://cdn.jsdelivr.net/npm/pdfjs-dist@$P/legacy/build/pdf.min.mjs
curl -fL -o vendor/pdf.worker.min.mjs https://cdn.jsdelivr.net/npm/pdfjs-dist@$P/legacy/build/pdf.worker.min.mjs
echo "Fertig. Ordner vendor/ jetzt mit hochladen."
