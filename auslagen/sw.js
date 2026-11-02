const CACHE='auslagen-v2-1';
const SHELL=['./','index.html','parser.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png',
'vendor/tesseract.min.js','vendor/worker.min.js','vendor/core/tesseract-core.wasm.js','vendor/core/tesseract-core-simd.wasm.js','vendor/core/tesseract-core-lstm.wasm.js','vendor/core/tesseract-core-simd-lstm.wasm.js','vendor/lang/deu.traineddata.gz'];
const EXT=['cdn.jsdelivr.net','tessdata.projectnaptha.com'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE);await Promise.all(SHELL.map(async u=>{try{const r=await fetch(u,{cache:'reload'});const ct=r.headers.get('content-type')||'';if(r.ok&&!(u.startsWith('vendor/')&&ct.includes('text/html')))await c.put(u,r)}catch(_){}}));self.skipWaiting()})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url);const same=url.origin===location.origin,ext=EXT.includes(url.hostname);if(!same&&!ext)return;
 e.respondWith((async()=>{const c=await caches.open(CACHE);const hit=await c.match(req,{ignoreSearch:true});
  if(hit&&(ext||url.pathname.includes('/vendor/')))return hit;
  try{const r=await fetch(req);if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r}catch(err){if(hit)return hit;if(req.mode==='navigate'){const idx=await c.match('index.html');if(idx)return idx}throw err}})())});
