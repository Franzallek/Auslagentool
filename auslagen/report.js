(function(root){
'use strict';
const PW=841.89,PH=595.28,M=28,W=PW-2*M;
const COLS=[0.085,0.30,0.17,0.105,0.105,0.10,0.135];
const HEAD=[['Rechnungs-','datum'],['Rechnungsaussteller Firmenname'],['Artikel'],['Betrag exkl.','MwSt.'],['Betrag MwSt.','19%'],['Betrag MwSt.','7%'],['Betrag inkl.','MwSt.']];
const ROW_H=16,HEAD_H=26,FIRST_MAX=25,LAST_MAX=20,BASE=0.62;
const NL=String.fromCharCode(10),CRLF=String.fromCharCode(13,10),BOM=String.fromCharCode(0xFEFF),BS=String.fromCharCode(92);
const nf=new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
const eur=c=>nf.format(c/100)+'€',plain=c=>nf.format(c/100).split('.').join('');
const dmy=iso=>iso.split('-').reverse().join('.');
function rateOf(v){const n=typeof v==='number'?v:parseFloat(String(v).replace(',','.'));return Number.isFinite(n)?n:NaN}
function centsOf(v){if(typeof v==='number')return Math.round(v*100);const s=String(v??'').trim();if(!s)return NaN;const n=parseFloat(s.includes(',')?s.split('.').join('').replace(',','.'):s);return Number.isFinite(n)?Math.round(n*100):NaN}
function splitTax(r){
 const res={v19:0,v7:0,other:0,inferred:false};
 if(!r.tax)return res;
 const groups=(r.taxes||[]).filter(t=>t&&Number.isFinite(centsOf(t.tax)));
 if(groups.length&&groups.reduce((s,t)=>s+centsOf(t.tax),0)===r.tax){
  for(const t of groups){const c=centsOf(t.tax),rt=rateOf(t.rate);
   if(Math.abs(rt-19)<0.01)res.v19+=c;else if(Math.abs(rt-7)<0.01)res.v7+=c;else res.other+=c}
  return res}
 res.inferred=true;
 if(Math.abs(Math.round(r.net*0.19)-r.tax)<=2)res.v19=r.tax;
 else if(Math.abs(Math.round(r.net*0.07)-r.tax)<=2)res.v7=r.tax;
 else res.other=r.tax;
 return res}
function range(a,b){const[ya,ma,da]=a.split('-'),[yb,mb,db]=b.split('-');
 if(a===b)return da+'.'+ma+'.'+ya;
 if(ya===yb)return da+'.'+ma+'.-'+db+'.'+mb+'.'+yb;
 return da+'.'+ma+'.'+ya+'-'+db+'.'+mb+'.'+yb}
function buildReport(receipts,name,createdIso){
 if(!receipts.length)throw Error('Keine Belege ausgewählt.');
 const sorted=[...receipts].sort((x,y)=>x.date.localeCompare(y.date)||String(x.vendor).localeCompare(String(y.vendor)));
 const issues=[],rows=sorted.map(r=>{
  const s=splitTax(r);
  if(r.currency!=='EUR')issues.push(r.vendor+' ('+dmy(r.date)+'): Währung '+r.currency+' wird nicht unterstützt.');
  if(s.other)issues.push(r.vendor+' ('+dmy(r.date)+'): Steuersatz nicht 19 % oder 7 %. Bitte Steuergruppen im Beleg ergänzen.');
  if(r.net+s.v19+s.v7+s.other!==r.gross)issues.push(r.vendor+' ('+dmy(r.date)+'): Netto + Steuer ergibt nicht Brutto.');
  return{date:r.date,vendor:r.vendor,article:r.purpose||'',net:r.net,v19:s.v19,v7:s.v7,gross:r.gross,inferred:s.inferred}});
 const sum=k=>rows.reduce((t,r)=>t+r[k],0);
 const totals={net:sum('net'),v19:sum('v19'),v7:sum('v7'),gross:sum('gross')};
 totals.ust=totals.v19+totals.v7;
 return{name:String(name||'').trim(),from:sorted[0].date,to:sorted[sorted.length-1].date,rangeText:range(sorted[0].date,sorted[sorted.length-1].date),created:createdIso,rows,totals,issues}}
function csvText(v){let s=String(v??'');const f=s.trimStart()[0];if(f&&'=+@-'.includes(f))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function toCsv(rep){
 const L=[];
 L.push([csvText('Auslagenerstattung'),csvText('Name Mitarbeiter: '+rep.name),csvText(rep.rangeText)].join(';'));
 L.push('');
 L.push(['Rechnungsdatum','Rechnungsaussteller Firmenname','Artikel','Betrag exkl. MwSt.','Betrag MwSt. 19%','Betrag MwSt. 7%','Betrag inkl. MwSt.'].map(csvText).join(';'));
 for(const r of rep.rows)L.push([csvText(dmy(r.date)),csvText(r.vendor),csvText(r.article),plain(r.net),r.v19?plain(r.v19):'',r.v7?plain(r.v7):'',plain(r.gross)].join(';'));
 const t=rep.totals;
 L.push(['','',csvText('Erstattungssumme'),plain(t.net),plain(t.v19),plain(t.v7),plain(t.gross)].join(';'));
 L.push(['','','','',csvText('Summe Ust'),plain(t.ust),''].join(';'));
 L.push('');
 L.push([csvText('Erstellt am'),csvText(dmy(rep.created)),csvText('Unterschrift: siehe PDF')].join(';'));
 return BOM+L.join(CRLF)+CRLF}
/* ---------- PDF (ohne Bibliothek) ---------- */
function latin1(s){const o=[];for(const ch of String(s)){const c=ch.codePointAt(0);if(c===0x20AC)o.push(0x80);else if(c===0x2013)o.push(0x96);else if(c===0x2026)o.push(0x85);else if(c<256&&!(c>=0x80&&c<0xA0))o.push(c);else o.push(63)}return o}
function pstr(s){let r='(';for(const c of latin1(s)){if(c===40||c===41||c===92)r+=BS+String.fromCharCode(c);else if(c<32||c>126)r+=BS+c.toString(8).padStart(3,'0');else r+=String.fromCharCode(c)}return r+')'}
const n2=v=>(Math.round(v*100)/100).toString();
function fit(measure,text,size,bold,maxW){let t=String(text);if(measure(t,size,bold)<=maxW)return t;while(t.length>1&&measure(t+'…',size,bold)>maxW)t=t.slice(0,-1);return t+'…'}
function pages(n){const out=[];let left=n;while(left>LAST_MAX){let take=Math.min(FIRST_MAX,left);if(left-take===0)take=left-1;out.push(take);left-=take}out.push(left);return out}
function layoutPages(rep,opt){
 const measure=opt.measure,sig=opt.signature,split=pages(rep.rows.length),xs=[];let acc=M;for(const c of COLS){xs.push(acc);acc+=c*W}xs.push(M+W);
 const out=[];let idx=0;
 split.forEach((count,pi)=>{
  const P=[],last=pi===split.length-1;
  const text=(x,y,s,size,bold,align)=>{const w=measure(s,size,bold);const px=align==='r'?x-w:align==='c'?x-w/2:x;P.push({t:'text',x:px,y,s,size,bold:!!bold})};
  const line=(x1,y1,x2,y2,w,g,dash)=>P.push({t:'line',x1,y1,x2,y2,w,g:g||0,dash:!!dash});
  const top=PH-M;
  text(M,top-10,'Auslagenerstattung',11,false,'l');
  text(PW/2,top-10,'Name Mitarbeiter: '+rep.name,11,false,'c');
  text(PW-M,top-10,rep.rangeText,11,false,'r');
  const ty=top-34;
  line(M,ty,M+W,ty,0.8,0);
  HEAD.forEach((h,i)=>{const right=i>=3,x=right?xs[i+1]-4:xs[i]+3;h.forEach((l,k)=>text(x,ty-10-k*10,l,8.5,true,right?'r':'l'))});
  const y0=ty-HEAD_H;line(M,y0,M+W,y0,0.8,0);
  const rows=rep.rows.slice(idx,idx+count);idx+=count;
  rows.forEach((r,k)=>{const yb=y0-(k+1)*ROW_H,yt=yb+4.5;
   text(xs[0]+3,yt,dmy(r.date),9,false,'l');
   text(xs[1]+3,yt,fit(measure,r.vendor,9,false,xs[2]-xs[1]-8),9,false,'l');
   text(xs[2]+3,yt,fit(measure,r.article,9,false,xs[3]-xs[2]-8),9,false,'l');
   text(xs[4]-4,yt,eur(r.net),9,false,'r');
   if(r.v19)text(xs[5]-4,yt,eur(r.v19),9,false,'r');
   if(r.v7)text(xs[6]-4,yt,eur(r.v7),9,false,'r');
   text(xs[7]-4,yt,eur(r.gross),9,false,'r');
   line(M,yb,M+W,yb,0.25,0.75)});
  const yEnd=y0-count*ROW_H;
  [0,1,2,3,4,5,6,7].forEach(i=>line(xs[i],y0,xs[i],yEnd,0.5,0.35));
  if(split.length>1)text(PW-M,M-8,'Seite '+(pi+1)+'/'+split.length,8,false,'r');
  if(last){
   const t=rep.totals,yT=yEnd-ROW_H;
   line(M,yEnd,M+W,yEnd,0.8,0);
   text(xs[3]-6,yT+4.5,'Erstattungssumme',10,true,'r');
   text(xs[4]-4,yT+4.5,eur(t.net),9.5,false,'r');text(xs[5]-4,yT+4.5,eur(t.v19),9.5,false,'r');text(xs[6]-4,yT+4.5,eur(t.v7),9.5,false,'r');text(xs[7]-4,yT+4.5,eur(t.gross),10,true,'r');
   line(xs[6],yT+1,xs[7],yT+1,0.5,0);line(xs[6],yT-1,xs[7],yT-1,0.5,0);
   const yU=yT-ROW_H;
   text(xs[3]+3,yU+4.5,'Summe Ust',9,false,'l');text(xs[5]-4,yU+4.5,eur(t.ust).replace('€',' €'),10,true,'r');
   const yL=Math.max(M+40,yU-70);
   if(sig){const sc=Math.min(220/sig.width,60/sig.height),h=sig.height*sc,bf=typeof sig.baseline==='number'?sig.baseline:1;P.push({t:'img',x:M+78,y:yL-(1-bf)*h,w:sig.width*sc,h})}
   text(M,yL+4,dmy(rep.created)+' /',10,false,'l');
   line(M+74,yL,M+74+260,yL,0.6,0);
   line(M,yL-28,M+W*0.4,yL-28,0.5,0,true);
   text(M,yL-39,'Datum / Unterschrift Mitarbeiter',9,false,'l')}
  out.push(P)});
 return out}
function serialize(prims,rep,sig){
 const contents=prims.map(P=>P.map(p=>{
  if(p.t==='text')return 'BT /'+(p.bold?'F2':'F1')+' '+n2(p.size)+' Tf '+n2(p.x)+' '+n2(p.y)+' Td '+pstr(p.s)+' Tj ET';
  if(p.t==='line')return 'q '+n2(p.g)+' G '+n2(p.w)+' w '+(p.dash?'[2 2] 0 d ':'')+n2(p.x1)+' '+n2(p.y1)+' m '+n2(p.x2)+' '+n2(p.y2)+' l S Q';
  return 'q '+n2(p.w)+' 0 0 '+n2(p.h)+' '+n2(p.x)+' '+n2(p.y)+' cm /Im1 Do Q'}).join(NL));
 const parts=[],offs=[];let len=0;
 const push=b=>{parts.push(b);len+=b.length};
 const A=s=>Uint8Array.from(Array.from(s,c=>c.charCodeAt(0)));
 const obj=(n,body)=>{offs[n]=len;push(A(n+' 0 obj'+NL));push(body instanceof Uint8Array?body:A(body));push(A(NL+'endobj'+NL))};
 push(A('%PDF-1.4'+NL+'%'));push(Uint8Array.from([0xE2,0xE3,0xCF,0xD3]));push(A(NL));
 const nPages=contents.length,imgId=5,first=sig?6:5,kids=[];
 for(let i=0;i<nPages;i++)kids.push((first+2*i+1)+' 0 R');
 obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
 obj(2,'<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+nPages+' >>');
 obj(3,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
 obj(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 if(sig){const head=A('<< /Type /XObject /Subtype /Image /Width '+sig.width+' /Height '+sig.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+sig.bytes.length+' >>'+NL+'stream'+NL);
  const all=new Uint8Array(head.length+sig.bytes.length+10);all.set(head,0);all.set(sig.bytes,head.length);all.set(A(NL+'endstream'),head.length+sig.bytes.length);obj(imgId,all)}
 contents.forEach((c,i)=>{const cid=first+2*i,pid=cid+1,body=A(c);
  obj(cid,A('<< /Length '+body.length+' >>'+NL+'stream'+NL+c+NL+'endstream'));
  obj(pid,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PW+' '+PH+'] /Contents '+cid+' 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >>'+(sig?' /XObject << /Im1 '+imgId+' 0 R >>':'')+' >> >>')});
 const total=first+2*nPages;
 obj(total,'<< /Title '+pstr('Auslagenerstattung '+rep.name+' '+rep.rangeText)+' /Producer (Auslagen-App) >>');
 const xref=len;let x='xref'+NL+'0 '+(total+1)+NL+'0000000000 65535 f '+NL;
 for(let i=1;i<=total;i++)x+=String(offs[i]).padStart(10,'0')+' 00000 n '+NL;
 x+='trailer'+NL+'<< /Size '+(total+1)+' /Root 1 0 R /Info '+total+' 0 R >>'+NL+'startxref'+NL+xref+NL+'%%EOF'+NL;
 push(A(x));
 const out=new Uint8Array(len);let p=0;for(const b of parts){out.set(b,p);p+=b.length}
 return out}
function buildPdf(rep,opt){return serialize(layoutPages(rep,opt),rep,opt.signature)}
const api={splitTax,buildReport,toCsv,buildPdf,layoutPages,serialize,range,pages,BASE};
if(typeof module!=='undefined'&&module.exports){module.exports=api;return}
if(typeof document==='undefined')return;
/* ---------- Oberfläche ---------- */
const NAME_KEY='auslagen-employee-name';
const css=document.createElement('style');
css.textContent='.rp-back{position:fixed;inset:0;background:#0009;z-index:50;display:flex;align-items:center;justify-content:center;padding:12px}.rp-box{background:#fff;border-radius:18px;max-width:960px;width:100%;max-height:96vh;overflow:auto;padding:20px}.rp-box h2{margin-top:0}.rp-pad{border:2px dashed #9fb3a3;border-radius:12px;background:#fff;touch-action:none;width:100%;height:200px;display:block}.rp-rotate{display:none;background:#fff4dc;color:#735323;border-radius:12px;padding:14px;font-size:14px;margin:10px 0}.rp-issues{color:#8f4f0a;font-size:13px;line-height:1.5;margin:8px 0;padding-left:18px}.rp-pv{overflow-x:auto;border:1px solid #dde4dc;border-radius:10px;background:#e9ece8;padding:8px;margin:10px 0}.rp-pv canvas{display:block;margin:0 0 10px;box-shadow:0 1px 4px #0003}@media (orientation:portrait) and (max-width:700px){.rp-rotate{display:block}.rp-sig{display:none}}';
document.head.append(css);
const dlg={back:null};
function close(){if(dlg.back){dlg.back.remove();dlg.back=null}}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function measureFactory(){const c=document.createElement('canvas').getContext('2d');return(t,size,bold)=>{c.font=(bold?'bold ':'')+size+'px Helvetica, Arial, sans-serif';return c.measureText(t).width}}
function download(bytes,name,type){const blob=new Blob([bytes],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
function todayIso(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function safe(s){return String(s).normalize('NFKD').replace(/[^A-Za-z0-9.-]+/g,'_').replace(/^_+|_+$/g,'')||'Mitarbeiter'}
function renderPreview(box,prims,sigCanvas){
 box.replaceChildren();
 const w=Math.max(box.clientWidth-16,640),k=w/PW,dpr=Math.max(1,window.devicePixelRatio||1);
 prims.forEach((P,pi)=>{
  const cv=document.createElement('canvas');cv.style.width=w+'px';cv.style.height=(PH*k)+'px';cv.width=Math.round(w*dpr);cv.height=Math.round(PH*k*dpr);
  cv.setAttribute('role','img');cv.setAttribute('aria-label','Vorschau Seite '+(pi+1)+' von '+prims.length);
  const c=cv.getContext('2d');c.scale(dpr,dpr);c.fillStyle='#fff';c.fillRect(0,0,w,PH*k);
  for(const p of P){
   if(p.t==='line'){const g=Math.round(p.g*255);c.strokeStyle='rgb('+g+','+g+','+g+')';c.lineWidth=Math.max(0.5,p.w*k);c.setLineDash(p.dash?[2*k,2*k]:[]);c.beginPath();c.moveTo(p.x1*k,(PH-p.y1)*k);c.lineTo(p.x2*k,(PH-p.y2)*k);c.stroke()}
   else if(p.t==='text'){c.fillStyle='#000';c.font=(p.bold?'bold ':'')+(p.size*k)+'px Helvetica, Arial, sans-serif';c.fillText(p.s,p.x*k,(PH-p.y)*k)}
   else if(p.t==='img'&&sigCanvas){c.drawImage(sigCanvas,p.x*k,(PH-p.y-p.h)*k,p.w*k,p.h*k)}}
  box.append(cv)})}
function open(){
 const chosen=db.filter(r=>selected.has(r.id));
 if(!chosen.length){toast('Bitte zuerst Belege auswählen.');return}
 close();
 const mf=measureFactory();
 const back=el('div','rp-back'),box=el('div','rp-box');back.append(box);back.setAttribute('role','dialog');back.setAttribute('aria-modal','true');dlg.back=back;
 box.append(el('h2','','Auslagenerstattung erstellen'));
 const info=el('p','sub');
 const lab=el('label','','Name Mitarbeiter');lab.setAttribute('for','rp_name');
 const inp=el('input');inp.id='rp_name';inp.maxLength=100;inp.autocomplete='name';inp.value=localStorage.getItem(NAME_KEY)||'';
 const issues=el('ul','rp-issues'),pv=el('div','rp-pv');
 const act=el('div','actions'),cancel=el('button','secondary','Abbrechen'),next=el('button','','Weiter zur Unterschrift');cancel.type='button';next.type='button';act.append(cancel,next);
 box.append(info,lab,inp,issues,el('p','sub','Vorschau (ohne Unterschrift):'),pv,act);
 document.body.append(back);
 let rep=null;
 function refresh(){try{rep=buildReport(chosen,inp.value,todayIso());info.textContent=chosen.length+' Beleg(e) · Zeitraum '+rep.rangeText+' · Erstattungssumme '+eur(rep.totals.gross)+'. Zeitraum und Summen ergeben sich aus den ausgewählten Belegen.';issues.replaceChildren(...rep.issues.map(t=>el('li','',t)));renderPreview(pv,layoutPages(rep,{measure:mf,signature:null}),null);next.disabled=rep.issues.length>0||!inp.value.trim()}catch(e){info.textContent=e.message;next.disabled=true}}
 inp.addEventListener('input',refresh);refresh();inp.focus();
 cancel.onclick=close;
 back.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
 next.onclick=()=>{localStorage.setItem(NAME_KEY,inp.value.trim());rep=buildReport(chosen,inp.value,todayIso());sign(box,rep,mf)};
}
function sign(box,rep,mf){
 box.replaceChildren(el('h2','','Unterschrift'));
 box.append(el('p','rp-rotate','Bitte das Handy quer halten, um zu unterschreiben.'));
 const wrap=el('div','rp-sig'),canvas=el('canvas','rp-pad');canvas.setAttribute('aria-label','Unterschriftenfeld mit Unterschriftslinie');wrap.append(canvas);
 const msg=el('p','sub','Schreibe auf der grauen Linie. Sie liegt im PDF genau auf der Unterschriftslinie; Buchstaben wie g, j oder y dürfen darunter reichen. Die Unterschrift wird nur für diese PDF verwendet und nicht gespeichert.');msg.setAttribute('role','status');
 const act=el('div','actions'),back=el('button','secondary','Zurück'),clr=el('button','secondary','Löschen'),go=el('button','','Weiter zur Vorschau');
 [back,clr,go].forEach(b=>{b.type='button';act.append(b)});
 wrap.append(msg,act);box.append(wrap);
 const dpr=Math.max(1,window.devicePixelRatio||1);
 function fitCanvas(){const r=canvas.getBoundingClientRect();canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);strokes=[];redraw()}
 let strokes=[],cur=null;
 function redraw(){const c=canvas.getContext('2d'),r=canvas.getBoundingClientRect();c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,r.width,r.height);
  c.strokeStyle='#7d8a82';c.lineWidth=1.5;c.setLineDash([]);c.beginPath();c.moveTo(12,r.height*BASE);c.lineTo(r.width-12,r.height*BASE);c.stroke();
  c.fillStyle='#7d8a82';c.font='12px sans-serif';c.fillText('Unterschriftslinie',14,r.height*BASE+16);
  c.strokeStyle='#000';c.lineWidth=2.4;c.lineCap='round';c.lineJoin='round';
  for(const s of strokes){c.beginPath();s.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));if(s.length===1)c.lineTo(s[0].x+0.1,s[0].y);c.stroke()}}
 const pt=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);cur=[pt(e)];strokes.push(cur);redraw()});
 canvas.addEventListener('pointermove',e=>{if(!cur)return;cur.push(pt(e));redraw()});
 const end=()=>{cur=null};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
 setTimeout(fitCanvas,0);
 window.addEventListener('resize',function onr(){if(!canvas.isConnected){window.removeEventListener('resize',onr);return}fitCanvas()});
 clr.onclick=()=>{strokes=[];redraw();msg.textContent='Feld geleert.'};
 back.onclick=()=>{close();open()};
 go.onclick=async()=>{
  const len=strokes.reduce((t,s)=>t+s.reduce((a,p,i)=>i?a+Math.hypot(p.x-s[i-1].x,p.y-s[i-1].y):a,0),0);
  if(len<40){msg.textContent='Bitte im Feld unterschreiben.';return}
  go.disabled=true;
  try{
   const r=canvas.getBoundingClientRect(),W2=900,H2=Math.round(W2*r.height/r.width),oc=document.createElement('canvas');oc.width=W2;oc.height=H2;const c=oc.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,W2,H2);c.strokeStyle='#000';c.lineWidth=5;c.lineCap='round';c.lineJoin='round';const k=W2/r.width;
   for(const s of strokes){c.beginPath();s.forEach((p,i)=>i?c.lineTo(p.x*k,p.y*k):c.moveTo(p.x*k,p.y*k));if(s.length===1)c.lineTo(s[0].x*k+0.1,s[0].y*k);c.stroke()}
   const b64=oc.toDataURL('image/jpeg',0.92).split(',')[1],bin=atob(b64),bytes=Uint8Array.from(bin,ch=>ch.charCodeAt(0));
   const sig={bytes,width:W2,height:H2,baseline:BASE},prims=layoutPages(rep,{measure:mf,signature:sig}),pdf=serialize(prims,rep,sig),csv=new TextEncoder().encode(toCsv(rep));
   done(box,rep,pdf,csv,prims,oc,mf)}
  catch(e){msg.textContent='Export fehlgeschlagen: '+(e&&e.message||e);go.disabled=false}};
}
function done(box,rep,pdf,csv,prims,sigCanvas,mf){
 const base='Auslagenerstattung_'+safe(rep.name)+'_'+rep.created;
 box.replaceChildren(el('h2','','Vorschau und Export'));
 box.append(el('p','sub',rep.rows.length+' Beleg(e), Zeitraum '+rep.rangeText+', Erstattungssumme '+eur(rep.totals.gross)+', Summe Ust '+eur(rep.totals.ust)+'. Die Belege wurden nicht als eingereicht markiert. Die Vorschau zeigt den Inhalt der PDF.'));
 const pv=el('div','rp-pv');box.append(pv);renderPreview(pv,prims,sigCanvas);
 const act=el('div','actions'),p=el('button','','PDF herunterladen'),c=el('button','secondary','CSV herunterladen'),re=el('button','secondary','Unterschrift ändern'),x=el('button','secondary','Schließen');
 [p,c,re,x].forEach(b=>{b.type='button'});
 p.onclick=()=>download(pdf,base+'.pdf','application/pdf');c.onclick=()=>download(csv,base+'.csv','text/csv;charset=utf-8');re.onclick=()=>sign(box,rep,mf);x.onclick=close;
 act.append(p,c);
 try{const files=[new File([pdf],base+'.pdf',{type:'application/pdf'}),new File([csv],base+'.csv',{type:'text/csv'})];
  if(navigator.canShare&&navigator.canShare({files})){const s=el('button','secondary','Teilen …');s.type='button';s.onclick=()=>navigator.share({files,title:'Auslagenerstattung'}).catch(()=>{});act.append(s)}}catch(e){}
 act.append(re,x);box.append(act);
}
function loadPdfImport(){if(document.querySelector('script[data-pdfimport]'))return;const s=document.createElement('script');s.src='pdfimport.js';s.dataset.pdfimport='1';document.head.append(s)}
function init(){const b=document.getElementById('makeReport');if(b)b.onclick=open;loadPdfImport()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(typeof self!=='undefined'?self:this);
