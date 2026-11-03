(function(root){
'use strict';
const MAX_SOURCE_BYTES=50*1024*1024,MAX_OUTPUT_BYTES=80*1024*1024,MAX_PAGES=250,MAX_RENDER_DIM=2400;
const A4={portrait:[595.28,841.89],landscape:[841.89,595.28]};
const NL=String.fromCharCode(10);
const n2=v=>(Math.round(v*100)/100).toString();
function ascii(s){return Uint8Array.from(Array.from(s,c=>c.charCodeAt(0)))}
function buildPdf(pages){
 if(!Array.isArray(pages)||!pages.length)throw Error('Keine Belegseiten für das PDF vorhanden.');
 if(pages.length>MAX_PAGES)throw Error('Das Sammel-PDF überschreitet die Grenze von '+MAX_PAGES+' Seiten.');
 const objects=[],offsets=[];let totalImages=0;
 const obj=(id,body)=>objects.push({id,prefix:ascii(id+' 0 obj'+NL),body,suffix:ascii(NL+'endobj'+NL)});
 const header=Uint8Array.from([...ascii('%PDF-1.4'+NL+'%'),0xE2,0xE3,0xCF,0xD3,...ascii(NL)]);
 const kids=pages.map((_,i)=>(5+i*3)+' 0 R');
 obj(1,[ascii('<< /Type /Catalog /Pages 2 0 R >>')]);
 obj(2,[ascii('<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>')]);
 pages.forEach((p,i)=>{
  const imageId=3+i*3,contentId=imageId+1,pageId=imageId+2;
  if(!p||!Number.isFinite(p.width)||!Number.isFinite(p.height)||p.width<=0||p.height<=0||p.width>14400||p.height>14400)throw Error('Ungültiges PDF-Seitenformat.');
  if(!Number.isSafeInteger(p.imageWidth)||!Number.isSafeInteger(p.imageHeight)||p.imageWidth<=0||p.imageHeight<=0||!(p.jpegBytes instanceof Uint8Array)||!p.jpegBytes.length)throw Error('Ungültiges Belegbild im Sammel-PDF.');
  totalImages+=p.jpegBytes.length;
  if(totalImages>MAX_OUTPUT_BYTES)throw Error('Das Sammel-PDF ist zu groß. Bitte weniger Belege auswählen.');
  const fit=Math.min(p.width/p.imageWidth,p.height/p.imageHeight),w=p.imageWidth*fit,h=p.imageHeight*fit,x=(p.width-w)/2,y=(p.height-h)/2;
  const stream=ascii('q '+n2(w)+' 0 0 '+n2(h)+' '+n2(x)+' '+n2(y)+' cm /Im0 Do Q'+NL);
  const header=ascii('<< /Length '+p.jpegBytes.length+' /Type /XObject /Subtype /Image /Width '+p.imageWidth+' /Height '+p.imageHeight+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode >>'+NL+'stream'+NL);
  const imageHeader=ascii('<< /Length '+p.jpegBytes.length+' /Type /XObject /Subtype /Image /Width '+p.imageWidth+' /Height '+p.imageHeight+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode >>'+NL+'stream'+NL);
  const imageEnd=ascii(NL+'endstream');
  obj(imageId,[imageHeader,p.jpegBytes,imageEnd]);
  obj(contentId,[ascii('<< /Length '+stream.length+' >>'+NL+'stream'+NL+Array.from(stream,c=>String.fromCharCode(c)).join('')+'endstream')]);
  obj(pageId,[ascii('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+n2(p.width)+' '+n2(p.height)+'] /Contents '+contentId+' 0 R /Resources << /XObject << /Im0 '+imageId+' 0 R >> >> >>')]);
 });
 let length=header.length;
 for(const object of objects){
  offsets[object.id]=length;length+=object.prefix.length+object.suffix.length;
  for(const part of object.body)length+=part.length;
 }
 const total=objects.length,xref=length;
 let table='xref'+NL+'0 '+(total+1)+NL+'0000000000 65535 f '+NL;
 for(let i=1;i<=total;i++)table+=String(offsets[i]).padStart(10,'0')+' 00000 n '+NL;
 table+='trailer'+NL+'<< /Size '+(total+1)+' /Root 1 0 R >>'+NL+'startxref'+NL+xref+NL+'%%EOF'+NL;
 const xrefTable=ascii(table);length+=xrefTable.length;
 if(length>MAX_OUTPUT_BYTES)throw Error('Das Sammel-PDF ist zu groß. Bitte weniger Belege auswählen.');
 const out=new Uint8Array(length);let at=0;
 const write=part=>{out.set(part,at);at+=part.length};
 write(header);
 for(const object of objects){write(object.prefix);object.body.forEach(write);write(object.suffix)}
 write(xrefTable);
 return out
}
const api={buildPdf};
if(typeof module!=='undefined'&&module.exports){module.exports=api;return}
root.ReceiptPdf=api;
if(typeof document==='undefined')return;
const MAX_IMAGE_DIM=2400;
let pdfjsPromise=null;
function dataBytes(file){
 const match=/^data:([^;,]+);base64,([\s\S]*)$/.exec(file.data||'');
 if(!match||match[1].toLowerCase()!==String(file.type||'').toLowerCase())throw Error('Belegdatei ist beschädigt oder hat ein unerwartetes Format.');
 let raw;try{raw=atob(match[2])}catch(e){throw Error('Belegdatei enthält ungültige Base64-Daten.')}
 const bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 return bytes
}
function jpegBytes(canvas){
 return new Promise((resolve,reject)=>canvas.toBlob(async blob=>{
  if(!blob){reject(Error('Ein Belegbild konnte nicht in das PDF übernommen werden.'));return}
  try{resolve(new Uint8Array(await blob.arrayBuffer()))}catch(e){reject(e)}
 },'image/jpeg',0.92))
}
function pageFromCanvas(canvas,width,height){
 return jpegBytes(canvas).then(jpeg=>({width,height,imageWidth:canvas.width,imageHeight:canvas.height,jpegBytes:jpeg}))
}
async function imageBitmap(blob){
 if(root.createImageBitmap){try{return await root.createImageBitmap(blob,{imageOrientation:'from-image'})}catch(e){}}
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(blob),image=new Image();
  image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};
  image.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Das Belegbild kann nicht gelesen werden.'))};
  image.src=url
 })
}
async function imagePage(file){
 const bitmap=await imageBitmap(new Blob([dataBytes(file)],{type:file.type}));
 try{
  const scale=Math.min(1,MAX_IMAGE_DIM/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext('2d',{alpha:false});if(!context)throw Error('Canvas für die PDF-Erstellung nicht verfügbar.');
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const size=canvas.width>canvas.height?A4.landscape:A4.portrait;
  return[await pageFromCanvas(canvas,size[0],size[1])]
 }finally{if(typeof bitmap.close==='function')bitmap.close()}
}
async function getPdfJs(){
 if(!pdfjsPromise){
  pdfjsPromise=import(new URL('vendor/pdf.min.mjs',document.baseURI).href).then(lib=>{
   lib.GlobalWorkerOptions.workerSrc=new URL('vendor/pdf.worker.min.mjs',document.baseURI).href;
   return lib
  }).catch(error=>{pdfjsPromise=null;throw Error('PDF.js konnte lokal nicht geladen werden: '+(error&&error.message||error))})
 }
 return pdfjsPromise
}
async function pdfPages(file,limit,onPage){
 const lib=await getPdfJs();let doc;
 try{doc=await lib.getDocument({data:dataBytes(file)}).promise}
 catch(e){throw Error('PDF-Anhang kann nicht gelesen werden (beschädigt, passwortgeschützt oder nicht unterstützt).')}
 const pages=[];
 try{
  if(doc.numPages>limit)throw Error('Der Export überschreitet die Grenze von '+MAX_PAGES+' Seiten.');
  for(let n=1;n<=doc.numPages;n++){
   onPage(n,doc.numPages);
   try{
    const page=await doc.getPage(n),base=page.getViewport({scale:1}),scale=Math.min(2,MAX_RENDER_DIM/Math.max(base.width,base.height)),viewport=page.getViewport({scale});
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    const context=canvas.getContext('2d',{alpha:false});if(!context)throw Error('Canvas für die PDF-Erstellung nicht verfügbar.');
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
    await page.render({canvasContext:context,viewport}).promise;
    pages.push(await pageFromCanvas(canvas,base.width,base.height));
    page.cleanup();
   }catch(e){throw Error('PDF-Seite '+n+' kann nicht vollständig übernommen werden: '+(e&&e.message||e))}
  }
  return pages
 }finally{await doc.destroy()}
}
function status(text){const node=document.getElementById('selectionInfo');if(node)node.textContent=text}
function download(bytes){
 const d=new Date(),date=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10),name='Belegkopien_'+date+'.pdf';
 const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');
 a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)
}
async function exportSelection(button){
 const records=db.filter(r=>selected.has(r.id)).sort((a,b)=>a.date.localeCompare(b.date)||String(a.vendor).localeCompare(String(b.vendor)));
 if(!records.length){toast('Bitte zuerst Belege auswählen.');return}
 const missing=records.filter(r=>!r.file);
 if(missing.length)throw Error('Keine Belegdatei hinterlegt für: '+missing.map(r=>r.vendor).join(', ')+'. Bitte Auswahl oder Belege prüfen.');
 let sourceBytes=0;
 for(const r of records){
  if(!r.file||typeof r.file.data!=='string')throw Error('Belegdatei fehlt oder ist beschädigt: '+r.vendor+'.');
  const length=Math.floor((r.file.data.length-r.file.data.indexOf(',')-1)*0.75);
  sourceBytes+=length;
  if(sourceBytes>MAX_SOURCE_BYTES)throw Error('Die ausgewählten Belegdateien überschreiten 50 MB. Bitte weniger Belege auswählen.');
  if(r.file.type!=='application/pdf'&&!/^image\/[a-z0-9.+-]+$/i.test(r.file.type))throw Error('Nicht unterstütztes Belegformat bei '+r.vendor+': '+r.file.type+'.');
 }
 button.disabled=true;status('Belegkopien-PDF wird lokal erstellt …');
 try{
  const pages=[];
  for(let i=0;i<records.length;i++){
   const r=records[i];status('Belegkopien-PDF: '+(i+1)+'/'+records.length+' · '+r.vendor);
   if(r.file.type==='application/pdf'){
    const added=await pdfPages(r.file,MAX_PAGES-pages.length,(n,total)=>status('Belegkopien-PDF: '+r.vendor+' · PDF-Seite '+n+'/'+total));
    pages.push(...added)
   }else pages.push(...await imagePage(r.file));
   if(pages.length>MAX_PAGES)throw Error('Der Export überschreitet die Grenze von '+MAX_PAGES+' Seiten.');
  }
  const pdf=buildPdf(pages);download(pdf);status('Belegkopien-PDF mit '+pages.length+' Seite(n) erstellt. Gespeicherte Daten und Bearbeitungsstände blieben unverändert.')
 }finally{button.disabled=false}
}
const csvButton=document.getElementById('exportSelected');
if(!csvButton)throw Error('Sammel-PDF konnte nicht eingebunden werden: CSV-Auswahl-Schaltfläche fehlt.');
const button=document.createElement('button');button.type='button';button.className='secondary';button.id='exportReceiptCopies';button.textContent='Belegkopien als Sammel-PDF';
csvButton.parentElement.insertBefore(button,csvButton);
button.addEventListener('click',async()=>{
 try{await exportSelection(button)}catch(error){const message='Sammel-PDF fehlgeschlagen: '+(error&&error.message||error);status(message);toast(message)}
});
})(typeof self!=='undefined'?self:this);
