(function(root){
'use strict';
const NL=String.fromCharCode(10),DASH=String.fromCharCode(8211),MAX_COMBINE=3,MAX_PAGES=60,MAX_BYTES=15*1024*1024,SCAN_MIN=25;
function makeGroups(n,opt){
 const joins=new Set((opt&&opt.joins)||[]),skip=new Set((opt&&opt.skip)||[]),custom=!!opt&&opt.mode==='custom';
 const groups=[];let cur=null;
 for(let p=1;p<=n;p++){
  if(skip.has(p)){cur=null;continue}
  if(custom&&joins.has(p)&&cur)cur.push(p);else{cur=[p];groups.push(cur)}}
 return groups}
function labelFor(g){return g.length===1?'Seite '+g[0]:'Seiten '+g[0]+DASH+g[g.length-1]}
function textFromItems(items){
 const its=(items||[]).filter(i=>i&&typeof i.str==='string'&&i.str.trim()!==''&&i.transform).map(i=>({s:i.str,x:i.transform[4],y:i.transform[5],w:i.width||0,h:Math.abs(i.transform[3])||10}));
 its.sort((a,b)=>b.y-a.y||a.x-b.x);
 const lines=[];
 for(const it of its){const last=lines[lines.length-1];
  if(last&&Math.abs(last.y-it.y)<=Math.max(2,Math.min(last.h,it.h)*0.4))last.items.push(it);else lines.push({y:it.y,h:it.h,items:[it]})}
 return lines.map(l=>{l.items.sort((a,b)=>a.x-b.x);let out='',end=null;
  for(const it of l.items){if(end!==null){const gap=it.x-end;out+=gap>24?'   ':gap>1?' ':''}out+=it.s;end=it.x+it.w}
  return out.trim()}).join(NL)}
function needsOcr(t){return Array.from(String(t||'')).filter(c=>c.trim()!=='').length<SCAN_MIN}
const api={makeGroups,labelFor,textFromItems,needsOcr,MAX_COMBINE};
if(typeof module!=='undefined'&&module.exports){module.exports=api;return}
if(typeof document==='undefined')return;
/* ---------- Oberfläche ---------- */
const $=id=>document.getElementById(id);
const css=document.createElement('style');
css.textContent='.pi-back{position:fixed;inset:0;background:#0009;z-index:60;display:flex;align-items:center;justify-content:center;padding:12px}.pi-box{background:#fff;border-radius:18px;max-width:960px;width:100%;max-height:96vh;overflow:auto;padding:20px}.pi-box h2{margin-top:0}.pi-box fieldset{border:0;margin:10px 0;padding:0}.pi-box legend{font-weight:600;font-size:14px;padding:0}.pi-opt{display:flex;align-items:center;gap:10px;min-height:44px;font-weight:400;margin:0;cursor:pointer}.pi-opt input{flex:none}.pi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin:14px 0}.pi-cell{border:3px solid var(--line);border-radius:12px;padding:8px;background:#fcfdfb}.pi-cell.g0{border-color:#216347}.pi-cell.g1{border-color:#3d5f8f}.pi-cell.skip{opacity:.6;border-style:dashed}.pi-cell canvas{width:100%;height:auto;display:block;border-radius:6px;background:#fff;box-shadow:0 1px 4px #0003}.pi-cap{font-size:13px;font-weight:600;margin:6px 0 2px}#pi-banner b{font-weight:700}#pi-banner .actions{margin-top:10px}';
document.head.append(css);
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
let lib=null,job=null,dlg=null;
async function loadLib(){
 if(lib)return lib;
 const base=new URL('vendor/',location.href).href;
 const m=await import(base+'pdf.min.mjs');
 m.GlobalWorkerOptions.workerSrc=base+'pdf.worker.min.mjs';
 lib=m;return m}
async function renderPage(page,width){
 const v1=page.getViewport({scale:1}),sc=Math.min(3,width/v1.width),vp=page.getViewport({scale:sc});
 const c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);
 const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
 await page.render({canvasContext:x,viewport:vp}).promise;return c}
function stitch(list){
 if(list.length===1)return list[0];
 const w=Math.max(...list.map(c=>c.width)),hs=list.map(c=>Math.round(c.height*w/c.width)),c=document.createElement('canvas');
 c.width=w;c.height=hs.reduce((a,b)=>a+b,0);
 const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
 let y=0;list.forEach((s,i)=>{x.drawImage(s,0,y,w,hs[i]);y+=hs[i]});return c}
function closeDlg(){if(dlg){dlg.remove();dlg=null}}
function pdfBase(name){return name.toLowerCase().endsWith('.pdf')?name.slice(0,-4):name}
async function openDialog(f){
 if(job){if(!confirm('Ein PDF-Import läuft noch. Abbrechen und neues PDF öffnen?'))return;endJob(true)}
 closeDlg();
 const back=el('div','pi-back'),box=el('div','pi-box');back.append(box);
 back.setAttribute('role','dialog');back.setAttribute('aria-modal','true');back.setAttribute('aria-label','PDF importieren');dlg=back;
 box.append(el('h2','','PDF importieren'));
 const status=el('p','sub','PDF wird geöffnet …');status.setAttribute('role','status');box.append(status);
 const closeBtn=el('button','secondary','Schließen');closeBtn.type='button';closeBtn.onclick=closeDlg;
 document.body.append(back);
 back.addEventListener('keydown',e=>{if(e.key==='Escape')closeDlg()});
 let doc;
 try{lib=await loadLib()}catch(e){status.textContent='PDF-Bibliothek nicht gefunden. Einmalig "node setup-vendor.mjs" (oder "sh setup-vendor.sh") ausführen und den Ordner vendor/ mit hochladen.';box.append(closeBtn);closeBtn.focus();return}
 try{const buf=await f.arrayBuffer();doc=await lib.getDocument({data:new Uint8Array(buf)}).promise}
 catch(e){status.textContent='Das PDF konnte nicht gelesen werden (passwortgeschützt oder beschädigt?).';box.append(closeBtn);closeBtn.focus();return}
 const n=doc.numPages;
 if(n>MAX_PAGES){status.textContent='Das PDF hat '+n+' Seiten. Maximal '+MAX_PAGES+' Seiten pro Import.';box.append(closeBtn);closeBtn.focus();return}
 status.textContent=f.name+' · '+n+(n===1?' Seite':' Seiten');
 const fs=el('fieldset'),lg=el('legend','','Aufteilung in Rechnungen');fs.append(lg);
 const mk=(val,text,checked)=>{const l=el('label','pi-opt'),i=document.createElement('input');i.type='radio';i.name='pi-mode';i.value=val;i.checked=checked;l.append(i,document.createTextNode(text));fs.append(l);return i};
 const rSingle=mk('single','Eine Rechnung pro Seite',true),rCustom=mk('custom','Eigene Aufteilung: Seiten zu einer Rechnung zusammenfassen oder auslassen',false);
 const hint=el('p','sub','Setze bei einer Seite den Haken „Gehört zur vorherigen Rechnung", wenn die Rechnung dort weitergeht. „Seite auslassen" überspringt Deckblätter oder Leerseiten.');
 const grid=el('div','pi-grid'),sum=el('p','sub');sum.setAttribute('aria-live','polite');
 const joins=new Set(),skips=new Set(),cells=[];
 for(let p=1;p<=n;p++){
  const cell=el('div','pi-cell'),cv=document.createElement('canvas');cv.width=340;cv.height=480;cv.setAttribute('role','img');cv.setAttribute('aria-label','Vorschau Seite '+p);
  const cap=el('div','pi-cap'),opts=el('div');
  const mkOpt=(text,set,dis)=>{const l=el('label','pi-opt'),i=document.createElement('input');i.type='checkbox';i.disabled=!!dis;i.onchange=()=>{if(i.checked)set.add(p);else set.delete(p);refresh()};l.append(i,document.createTextNode(text));opts.append(l);return i};
  if(p>1)mkOpt('Gehört zur vorherigen Rechnung',joins,false);
  mkOpt('Seite auslassen',skips,false);
  cell.append(cv,cap,opts);grid.append(cell);cells.push({cell,cap,opts})}
 const act=el('div','actions'),cancel=el('button','secondary','Abbrechen'),go=el('button','','Import starten');cancel.type='button';go.type='button';act.append(cancel,go);
 box.append(fs,hint,sum,grid,act);
 function current(){return makeGroups(n,{mode:rCustom.checked?'custom':'single',joins,skip:skips})}
 function refresh(){
  const custom=rCustom.checked,groups=current(),gi=new Map();
  groups.forEach((g,k)=>g.forEach(p=>gi.set(p,k)));
  hint.classList.toggle('hidden',!custom);
  cells.forEach((c,idx)=>{const p=idx+1,k=gi.get(p);
   c.opts.classList.toggle('hidden',!custom);
   c.cell.classList.toggle('skip',k===undefined);
   c.cell.classList.remove('g0','g1');if(k!==undefined)c.cell.classList.add('g'+(k%2));
   c.cap.textContent=k===undefined?'Seite '+p+' · wird ausgelassen':'Seite '+p+' → Rechnung '+(k+1)});
  sum.textContent=groups.length?groups.length+(groups.length===1?' Rechnung: ':' Rechnungen: ')+groups.map(labelFor).join(' · '):'Keine Seite ausgewählt.';
  go.disabled=!groups.length}
 rSingle.onchange=refresh;rCustom.onchange=refresh;refresh();rSingle.focus();
 cancel.onclick=()=>{closeDlg();try{doc.destroy()}catch(e){}};
 go.onclick=()=>{const groups=current();if(!groups.length)return;closeDlg();startJob(doc,pdfBase(f.name),groups)};
 for(let p=1;p<=n&&dlg===back;p++){
  try{const pg=await doc.getPage(p),c=await renderPage(pg,340),cv=cells[p-1].cell.querySelector('canvas');cv.width=c.width;cv.height=c.height;cv.getContext('2d').drawImage(c,0,0)}catch(e){}}
}
/* ---------- Ablauf: eine Rechnung nach der anderen ins Formular laden ---------- */
function banner(){
 let b=$('pi-banner');
 if(!b){b=el('div','notice');b.id='pi-banner';b.setAttribute('role','status');const sec=$('capture');sec.insertBefore(b,sec.firstChild)}
 return b}
function removeBanner(){const b=$('pi-banner');if(b)b.remove()}
function paintBanner(text){
 if(!job)return;
 const b=banner(),msg=el('div');msg.append(text);
 const act=el('div','actions'),next=el('button','secondary smallbtn','Weiter zur nächsten Rechnung'),stop=el('button','secondary smallbtn','Import beenden');
 next.type='button';stop.type='button';next.disabled=job.busy;
 next.onclick=manualNext;stop.onclick=()=>endJob(true);
 act.append(next,stop);b.replaceChildren(msg,act)}
function startJob(doc,base,groups){
 job={doc,base,groups,idx:-1,saved:0,skipped:0,token:0,baseLen:0,busy:false,loaded:false,timer:null};
 job.timer=setInterval(poll,500);
 loadAt(0)}
function poll(){
 if(!job||job.busy||!job.loaded)return;
 if(db.length>job.baseLen&&!file&&!$('vendor').value){job.saved++;loadAt(job.idx+1)}}
function manualNext(){
 if(!job||job.busy)return;
 if(db.length>job.baseLen){job.saved++;loadAt(job.idx+1);return}
 if(($('vendor').value||$('gross').value)&&!confirm('Diese Rechnung wurde noch nicht gespeichert. Trotzdem zur nächsten wechseln?'))return;
 job.skipped++;loadAt(job.idx+1)}
function finish(){
 const j=job;clearInterval(j.timer);removeBanner();job=null;
 try{j.doc.destroy()}catch(e){}
 toast('PDF-Import fertig: '+j.saved+' gespeichert, '+j.skipped+' übersprungen.');tab('list')}
function endJob(user){
 if(!job)return;
 const j=job;clearInterval(j.timer);job.token++;removeBanner();job=null;
 try{j.doc.destroy()}catch(e){}
 if(user)toast('PDF-Import beendet: '+j.saved+' gespeichert, '+j.skipped+' übersprungen.')}
async function loadAt(idx){
 if(!job)return;
 if(idx>=job.groups.length){finish();return}
 const j=job,t=++j.token;j.idx=idx;j.busy=true;j.loaded=false;
 paintBanner('PDF-Import · Rechnung '+(idx+1)+' von '+j.groups.length+' wird geladen …');
 try{await loadInvoice(j,idx,t)}
 catch(e){if(job===j&&j.token===t)toast('Seite konnte nicht gelesen werden: '+(e&&e.message||e))}
 finally{if(job===j&&j.token===t){j.busy=false;j.loaded=true;j.baseLen=db.length;
  const g=j.groups[idx],more=g.length>MAX_COMBINE?' Es werden nur die ersten '+MAX_COMBINE+' Seiten gelesen.':'';
  paintBanner('PDF-Import · Rechnung '+(idx+1)+' von '+j.groups.length+' ('+labelFor(g)+'): Felder prüfen und „Beleg speichern" wählen. Danach lädt die nächste Rechnung automatisch.'+more)}}}
async function loadInvoice(j,idx,t){
 const alive=()=>job===j&&j.token===t,g=j.groups[idx],pages=g.slice(0,MAX_COMBINE);
 reset();tab('capture');
 $('ocrbox').classList.remove('hidden');progress(0.02,'PDF-Seite wird vorbereitet …');
 const canvases=[],texts=[];
 for(const p of pages){
  const pg=await j.doc.getPage(p);if(!alive())return;
  canvases.push(await renderPage(pg,1500));if(!alive())return;
  const tc=await pg.getTextContent();if(!alive())return;
  texts.push(textFromItems(tc.items))}
 const whole=stitch(canvases),store=drawScaled(whole,1800*pages.length,0),ocrC=enhance(drawScaled(whole,2400*pages.length,1600));
 const sb=await toBlob(store,'image/jpeg',0.82),ob=await toBlob(ocrC,'image/png');if(!alive())return;
 file={name:j.base+' - '+labelFor(g)+'.jpg',type:'image/jpeg',data:await blobToData(sb)};if(!alive())return;
 ocrSource={blob:ob};showFile();
 const text=texts.join(NL);
 if(!needsOcr(text)){
  $('rawText').value=text;progress(1,'Text direkt aus dem PDF übernommen (keine Texterkennung nötig).');
  applyParsed(ReceiptParser.parse(text))}
 else{runOcr()}}
/* ---------- Einhängen in den bestehenden Upload ---------- */
function hook(){
 const up=$('upload');if(!up||up.dataset.piHooked)return;
 const orig=up.onchange;up.dataset.piHooked='1';
 up.onchange=function(e){
  const f=e.target.files&&e.target.files[0];
  if(f&&(f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf'))){
   e.target.value='';
   if(f.size>MAX_BYTES){toast('Datei zu groß. Maximal 15 MB.');return}
   openDialog(f);return}
  return orig?orig.call(this,e):undefined}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
})(typeof self!=='undefined'?self:this);
