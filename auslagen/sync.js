(function(root){
'use strict';
const CLIENT='762976540557-o8pemc9paggig25oju13gf5780f9s9m3.apps.googleusercontent.com';
function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v);}
function valid(r){return !!r&&/^[\w-]{1,100}$/.test(r.id)&&['vendor','date','invoice','project','purpose'].every(k=>typeof r[k]==='string')&&['EUR','USD','GBP','CHF'].includes(r.currency)&&['Entwurf','Geprüft','Eingereicht','Erstattet'].includes(r.status)&&[r.net,r.tax,r.gross].every(Number.isSafeInteger)&&r.net+r.tax===r.gross&&Array.isArray(r.taxes)&&r.taxes.every(t=>t&&['rate','net','tax'].every(k=>typeof t[k]==='string'||typeof t[k]==='number'||t[k]===null))&&(!r.file||(typeof r.file.name==='string'&&typeof r.file.type==='string'&&/^image\/[a-z0-9.+-]+$|^application\/pdf$/i.test(r.file.type)&&typeof r.file.data==='string'&&r.file.data.startsWith('data:'+r.file.type+';base64,')));}
async function reconcile(io){
 const local=await io.local.all(),state=io.state.load()||{},vault=await io.remote.vault();
 if(state.vault&&state.vault!==vault)throw Error('Anderes Google Drive erkannt. Abgleich blockiert. Bitte getrenntes Browserprofil verwenden; keine Belege wurden übertragen.');
 if(!state.vault&&local.length&&!await io.adopt(local.length))throw Error('Übernahme der lokalen Belege abgebrochen.');
 const [versions,remotePurged]=await Promise.all([io.remote.versions(),io.remote.purgedIds()]),groups=new Map();
 for(const v of versions){if(!valid(v.receipt)||v.hash!==await io.hash(v.receipt))throw Error('Ungültige Cloud-Version; Abgleich abgebrochen.');const a=groups.get(v.receipt.id)||[];a.push(v);groups.set(v.receipt.id,a);}
 const byLocal=new Map(local.map(r=>[r.id,r])),base=state.base||{},cloudPurged={...(state.cloudPurged||{})};
 for(const id of remotePurged)cloudPurged[id]=true;
 const next={vault,base:{...base},cloudPurged},stats={uploaded:0,downloaded:0,conflicts:[]};
 for(const id of new Set([...byLocal.keys(),...groups.keys()])){
  if(cloudPurged[id])continue;
  const l=byLocal.get(id),vs=groups.get(id)||[],parents=new Set(vs.map(v=>v.parent).filter(Boolean));
  const heads=[...new Map(vs.filter(v=>!parents.has(v.hash)).map(v=>[v.hash,v])).values()];
  if(vs.length&&!heads.length)throw Error('Ungültige Versionskette.');
  if(heads.length>1){stats.conflicts.push(id);continue;}
  const r=heads[0],lh=l?await io.hash(l):null,b=base[id];
  if(l&&!valid(l))throw Error('Ungültiger lokaler Beleg.');
  if(!l&&r){await io.local.put(r.receipt);stats.downloaded++;next.base[id]=r.hash;continue;}
  if(l&&!r){if(b){stats.conflicts.push(id);continue;}await io.remote.append({receipt:l,hash:lh,parent:null});stats.uploaded++;next.base[id]=lh;continue;}
  if(lh===r.hash){next.base[id]=lh;continue;}
  if(!b||(lh!==b&&r.hash!==b)){stats.conflicts.push(id);continue;}
  if(lh===b){await io.local.put(r.receipt);stats.downloaded++;next.base[id]=r.hash;}
  else {await io.remote.append({receipt:l,hash:lh,parent:r.hash});stats.uploaded++;next.base[id]=lh;}
 }
 io.state.save(next);return stats;
}
async function purgeReceipts(io,receipts){
 if(!Array.isArray(receipts)||!receipts.length)throw Error('Keine Belege zum Entfernen ausgewählt.');
 const chosen=new Map();
 for(const receipt of receipts){if(!receipt||typeof receipt.id!=='string'||! /^[\w-]{1,100}$/.test(receipt.id))throw Error('Ungültige Belegauswahl.');chosen.set(receipt.id,receipt);}
 const state=io.state.load()||{},vault=await io.remote.vault(false);
 if(!vault)return{deletedReceipts:0,deletedVersions:0,cancelled:false};
 if(!state.vault||state.vault!==vault)throw Error('Dieses Google Drive ist auf diesem Gerät nicht durch einen erfolgreichen Abgleich zugeordnet. Erst abgleichen; es wurden keine Dateien gelöscht.');
 const versions=await io.remote.versionFiles();
 for(const version of versions)if(!valid(version.receipt)||version.hash!==await io.hash(version.receipt))throw Error('Ungültige Cloud-Version; Löschung abgebrochen.');
 const matches=versions.filter(v=>chosen.has(v.receipt.id));
 if(!matches.length)return{deletedReceipts:0,deletedVersions:0,cancelled:false};
 const matchingIds=[...new Set(matches.map(v=>v.receipt.id))];
 if(!await io.confirm({receipts:matchingIds.map(id=>chosen.get(id)),versions:matches.length}))return{deletedReceipts:0,deletedVersions:0,cancelled:true};
 if(typeof io.remote.markPurged!=='function')throw Error('Cloud-Löschmarkierung wird von diesem Abgleich nicht unterstützt; keine Cloud-Dateien wurden gelöscht.');
 const cloudPurged={...(state.cloudPurged||{})};
 for(const id of matchingIds)cloudPurged[id]=true;
 io.state.save({...state,cloudPurged});
 await io.remote.markPurged(matchingIds);
 const deletedVersions=await io.remote.deleteFiles(matches.map(v=>v.fileId));
 return{deletedReceipts:matchingIds.length,deletedVersions,cancelled:false};
}
if(typeof module!=='undefined'&&module.exports){module.exports={reconcile,purgeReceipts,canonical,valid};return;}
if(typeof document==='undefined')return;
let token='',expiry=0,busy=false,gis;
const KEY='auslagen-safe-sync-v2',API='https://www.googleapis.com/drive/v3',UP='https://www.googleapis.com/upload/drive/v3';
async function hash(r){const bytes=new TextEncoder().encode(canonical(r));const b=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');}
function loadGoogle(){if(root.google?.accounts?.oauth2)return Promise.resolve();if(gis)return gis;gis=new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=res;s.onerror=()=>{gis=null;rej(Error('Google-Skript nicht erreichbar.'));};document.head.append(s);});return gis;}
async function authorize(){await loadGoogle();if(token&&Date.now()<expiry-60000)return;await new Promise((res,rej)=>{const c=google.accounts.oauth2.initTokenClient({client_id:root.AUSLAGEN_GOOGLE_CLIENT_ID||CLIENT,scope:'https://www.googleapis.com/auth/drive.appdata',callback:r=>{if(r.error)return rej(Error(r.error));token=r.access_token;expiry=Date.now()+Number(r.expires_in)*1000;res();},error_callback:()=>rej(Error('Anmeldung abgebrochen oder Popup blockiert. Erneut versuchen.'))});c.requestAccessToken({prompt:'select_account'});});}
async function request(url,opt={}){const r=await fetch(url,{...opt,headers:{...opt.headers,Authorization:'Bearer '+token}});if(r.status===401){token='';throw Error('Anmeldung abgelaufen.');}if(!r.ok)throw Error('Google Drive: HTTP '+r.status);return r;}
async function files(){const list=[];let page='';do{const q=new URLSearchParams({spaces:'appDataFolder',fields:'nextPageToken,files(id,name)',pageSize:'1000'});if(page)q.set('pageToken',page);const j=await(await request(API+'/files?'+q)).json();list.push(...(j.files||[]));page=j.nextPageToken||'';}while(page);return list;}
async function read(id){const r=await request(API+'/files/'+encodeURIComponent(id)+'?alt=media');const text=await r.text();if(text.length>24000000)throw Error('Cloud-Datei zu groß.');return JSON.parse(text);}
async function create(name,data){const boundary='auslagen-'+crypto.randomUUID(),nl='\r\n';const metadata={name,parents:['appDataFolder']};const body='--'+boundary+nl+'Content-Type: application/json'+nl+nl+JSON.stringify(metadata)+nl+'--'+boundary+nl+'Content-Type: application/json'+nl+nl+JSON.stringify(data)+nl+'--'+boundary+'--';await request(UP+'/files?uploadType=multipart',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});}
let listed=[];
const remote={
 async vault(createIfMissing=true){listed=await files();if(listed.some(f=>/^[rt]_/.test(f.name)))throw Error('Älteres Sync-Format erkannt. Erst Sicherung und Migration erforderlich.');let v=listed.filter(f=>f.name==='auslagen-vault-v2.json');if(v.length>1)throw Error('Mehrere Drive-Kennungen gefunden. Abgleich blockiert.');if(!v.length){if(!createIfMissing)return null;await create('auslagen-vault-v2.json',{id:crypto.randomUUID()});listed=await files();v=listed.filter(f=>f.name==='auslagen-vault-v2.json');}if(v.length!==1)throw Error('Drive-Kennung nicht eindeutig.');const j=await read(v[0].id);if(typeof j.id!=='string'||!/^[\w-]{20,100}$/.test(j.id))throw Error('Ungültige Drive-Kennung.');return j.id;},
 async versionFiles(){const a=[];for(const f of listed.filter(f=>f.name.startsWith('v2-'))){a.push({...await read(f.id),fileId:f.id});}return a;},
 async purgedIds(){const ids=[];for(const f of listed.filter(f=>f.name.startsWith('purged-'))){const marker=await read(f.id);if(marker.version!==1||typeof marker.id!=='string'||!/^[\w-]{1,100}$/.test(marker.id)||f.name!=='purged-'+marker.id+'.json')throw Error('Ungültige Cloud-Löschmarkierung; Abgleich abgebrochen.');ids.push(marker.id);}return ids;},
 async markPurged(ids){let changed=false;for(const id of ids){const name='purged-'+id+'.json';if(listed.some(f=>f.name===name))continue;await create(name,{version:1,id});changed=true;}if(changed)listed=await files();},
 async versions(){return(await this.versionFiles()).map(({fileId,...v})=>v);},
 async deleteFiles(ids){let deleted=0;for(const id of ids){try{await request(API+'/files/'+encodeURIComponent(id),{method:'DELETE'});deleted++;}catch(error){error.deletedFiles=deleted;error.totalFiles=ids.length;throw error;}}listed=listed.filter(f=>!ids.includes(f.id));return deleted;},
 async append(v){await create('v2-'+v.receipt.id+'-'+crypto.randomUUID()+'.json',v);}
};
async function removeReceiptCopies(receipts){
 if(busy)throw Error('Ein anderer Google-Drive-Vorgang läuft bereits.');
 busy=true;
 try{
  await authorize();
  const io={remote,hash,state:{load:()=>JSON.parse(localStorage.getItem(KEY)||'null'),save:s=>localStorage.setItem(KEY,JSON.stringify(s))},confirm:({receipts:matches,versions})=>{
   const labels=matches.map(r=>(r.vendor||'Beleg')+' · '+(r.date||'')).join('\n');
   return confirm('Dauerhaft aus dem verbundenen Google Drive löschen?\n\n'+labels+'\n\n'+matches.length+' Beleg(e) und '+versions+' Cloud-Version(en) werden endgültig gelöscht. Ein minimaler Löschvermerk mit der Beleg-ID bleibt, damit andere Geräte diese Belege nicht erneut hochladen. Die lokalen Belege und die heruntergeladene PDF bleiben auf diesem Gerät. Andere Geräte können noch lokale Kopien besitzen.');
  }};
  const result=await purgeReceipts(io,receipts);
  if(result.cancelled)return{...result,message:'Abgebrochen; nichts wurde aus der Cloud gelöscht.'};
  if(!result.deletedVersions)return{...result,message:'Für diese Auswahl wurden keine Cloud-Kopien gefunden.'};
  return{...result,message:result.deletedReceipts+' Beleg(e) und '+result.deletedVersions+' Cloud-Version(en) dauerhaft gelöscht. Lokale Belege bleiben erhalten.'};
 }finally{busy=false}
}
root.AuslagenDrive=Object.freeze({removeReceiptCopies});
function build(){const host=document.getElementById('export');if(!host)return;const card=document.createElement('div');card.className='card';const title=document.createElement('h2');title.textContent='Geräte-Abgleich · Entwicklung';const note=document.createElement('p');note.className='sub';note.textContent='Nur mit Testbelegen verwenden. Beim Verbinden lädt die App ein Google-Skript. Erst nach deiner Bestätigung werden lokale Belege samt Bildern im versteckten App-Ordner deines Google Drive gespeichert. Lokales Löschen löscht keine Cloud-Daten; sie werden beim nächsten Abgleich wieder geladen. Nach dem Herunterladen einer unterschriebenen PDF können die darin enthaltenen Cloud-Versionen separat und dauerhaft gelöscht werden; lokale Kopien bleiben erhalten. Konflikte werden nicht überschrieben. Keine verifizierte Erstellerzuordnung.';const btn=document.createElement('button');btn.type='button';btn.textContent='Mit Google verbinden und abgleichen';const off=document.createElement('button');off.type='button';off.className='secondary';off.textContent='Verbindung trennen';const status=document.createElement('p');status.className='sub';status.setAttribute('role','status');const actions=document.createElement('div');actions.className='actions';actions.append(btn,off);card.append(title,note,actions,status);host.prepend(card);
 btn.onclick=async()=>{if(busy)return;if(!confirm('Google-Anmeldung laden und Testbelege mit deinem Google Drive abgleichen? Auf jedem Gerät dasselbe Konto wählen.'))return;busy=true;btn.disabled=off.disabled=true;try{await authorize();status.textContent='Drive prüfen und Testbelege abgleichen …';const result=await reconcile({local:{all:()=>dbAll(),put:r=>dbPut([r])},remote,hash,state:{load:()=>JSON.parse(localStorage.getItem(KEY)||'null'),save:s=>localStorage.setItem(KEY,JSON.stringify(s))},adopt:async n=>confirm(n+' lokale Belege gehören zu diesem Google Drive und dürfen hochgeladen werden?')});db=await dbAll();render();status.textContent=result.uploaded+' hochgeladen, '+result.downloaded+' geladen. Konflikte: '+result.conflicts.length+(result.conflicts.length?' – nicht überschrieben; Auflösung noch nicht implementiert.':'');}catch(e){status.textContent='Abgleich gestoppt: '+e.message;}finally{busy=false;btn.disabled=off.disabled=false;}};
 off.onclick=()=>{if(busy)return;if(token&&root.google?.accounts?.oauth2)google.accounts.oauth2.revoke(token,()=>{});token='';expiry=0;status.textContent='Getrennt. Die Drive-Bindung bleibt zum Schutz vor Kontovermischung erhalten. Lokale und Cloud-Belege wurden nicht gelöscht.';};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})(typeof self!=='undefined'?self:this);
