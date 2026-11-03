(function(root){
'use strict';
const CLIENT='762976540557-o8pemc9paggig25oju13gf5780f9s9m3.apps.googleusercontent.com';
function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v);}
function valid(r){return !!r&&/^[\w-]{1,100}$/.test(r.id)&&['vendor','date','invoice','project','purpose'].every(k=>typeof r[k]==='string')&&['EUR','USD','GBP','CHF'].includes(r.currency)&&['Entwurf','Geprüft','Eingereicht','Erstattet'].includes(r.status)&&[r.net,r.tax,r.gross].every(Number.isSafeInteger)&&r.net+r.tax===r.gross&&Array.isArray(r.taxes)&&r.taxes.every(t=>t&&['rate','net','tax'].every(k=>typeof t[k]==='string'||typeof t[k]==='number'||t[k]===null))&&(!r.file||(typeof r.file.name==='string'&&typeof r.file.type==='string'&&/^image\/[a-z0-9.+-]+$|^application\/pdf$/i.test(r.file.type)&&typeof r.file.data==='string'&&r.file.data.startsWith('data:'+r.file.type+';base64,')));}
async function reconcile(io){
 const local=await io.local.all(),state=io.state.load()||{},account=io.account?await io.account():null;
 if(state.account&&(!account||state.account.sub!==account.sub))throw Error('Anderes Google-Konto erkannt. Abgleich blockiert. Bitte das zuletzt verwendete Konto oder ein getrenntes Browserprofil verwenden; keine Belege wurden übertragen.');
 const vault=await io.remote.vault(!state.vault);
 if(state.vault&&state.vault!==vault)throw Error('Anderes Google Drive erkannt. Abgleich blockiert. Bitte getrenntes Browserprofil verwenden; keine Belege wurden übertragen.');
 if(!state.vault&&local.length&&!await io.adopt(local.length))throw Error('Übernahme der lokalen Belege abgebrochen.');
 const localPurged=Object.keys(state.cloudPurged||{});
 for(const id of localPurged)if(!/^[\w-]{1,100}$/.test(id))throw Error('Ungültige lokale Löschmarkierung; Abgleich abgebrochen.');
 if(localPurged.length&&typeof io.remote.markPurged==='function')await io.remote.markPurged(localPurged);
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
 if(account)next.account=account;
 io.state.save(next);return stats;
}
async function purgeReceipts(io,receipts){
 if(!Array.isArray(receipts)||!receipts.length)throw Error('Keine Belege zum Entfernen ausgewählt.');
 const chosen=new Map();
 for(const receipt of receipts){if(!receipt||typeof receipt.id!=='string'||! /^[\w-]{1,100}$/.test(receipt.id))throw Error('Ungültige Belegauswahl.');chosen.set(receipt.id,receipt);}
 const state=io.state.load()||{},vault=await io.remote.vault(false);
 if(!vault)throw Error('Das zugeordnete Google-Drive-Vault wurde nicht gefunden. Lokale Belege wurden nicht gelöscht; erst Konto und Verbindung prüfen.');
 if(!state.vault||state.vault!==vault)throw Error('Dieses Google Drive ist auf diesem Gerät nicht durch einen erfolgreichen Abgleich zugeordnet. Erst abgleichen; es wurden keine Dateien gelöscht.');
 const versions=await io.remote.versionFiles();
 for(const version of versions)if(!valid(version.receipt)||version.hash!==await io.hash(version.receipt))throw Error('Ungültige Cloud-Version; Löschung abgebrochen.');
 const matches=versions.filter(v=>chosen.has(v.receipt.id)),matchingIds=[...new Set(matches.map(v=>v.receipt.id))];
 if(!await io.confirm({receipts:[...chosen.values()],cloudReceipts:matchingIds.map(id=>chosen.get(id)),versions:matches.length}))return{deletedReceipts:0,deletedVersions:0,cancelled:true};
 if(typeof io.remote.markPurged!=='function')throw Error('Cloud-Löschmarkierung wird von diesem Abgleich nicht unterstützt; keine Cloud-Dateien wurden gelöscht.');
 const cloudPurged={...(state.cloudPurged||{})};
 for(const id of chosen.keys())cloudPurged[id]=true;
 io.state.save({...state,cloudPurged});
 await io.remote.markPurged([...chosen.keys()]);
 const deletedVersions=await io.remote.deleteFiles(matches.map(v=>v.fileId));
 if(deletedVersions!==matches.length){const error=Error('Cloud-Löschung unvollständig; lokale Belege wurden nicht entfernt.');error.deletedFiles=deletedVersions;error.totalFiles=matches.length;throw error;}
 return{deletedReceipts:matchingIds.length,deletedVersions,tombstonedReceipts:chosen.size,cancelled:false,confirmed:true};
}
if(typeof module!=='undefined'&&module.exports){module.exports={reconcile,purgeReceipts,canonical,valid};return;}
if(typeof document==='undefined')return;
let token='',expiry=0,busy=false,gis;
const KEY='auslagen-safe-sync-v2',API='https://www.googleapis.com/drive/v3',UP='https://www.googleapis.com/upload/drive/v3';
const readSyncState=()=>JSON.parse(localStorage.getItem(KEY)||'null');
async function hash(r){const bytes=new TextEncoder().encode(canonical(r));const b=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');}
function loadGoogle(){if(root.google?.accounts?.oauth2)return Promise.resolve();if(gis)return gis;gis=new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=res;s.onerror=()=>{gis=null;rej(Error('Google-Skript nicht erreichbar.'));};document.head.append(s);});return gis;}
async function authorize(){await loadGoogle();if(token&&Date.now()<expiry-60000)return;await new Promise((res,rej)=>{const c=google.accounts.oauth2.initTokenClient({client_id:root.AUSLAGEN_GOOGLE_CLIENT_ID||CLIENT,scope:'https://www.googleapis.com/auth/drive.appdata openid email',callback:r=>{if(r.error)return rej(Error(r.error));token=r.access_token;expiry=Date.now()+Number(r.expires_in)*1000;res();},error_callback:()=>rej(Error('Anmeldung abgebrochen oder Popup blockiert. Erneut versuchen.'))});c.requestAccessToken({prompt:'select_account'});});}
async function request(url,opt={}){const r=await fetch(url,{...opt,headers:{...opt.headers,Authorization:'Bearer '+token}});if(r.status===401){token='';throw Error('Anmeldung abgelaufen.');}if(!r.ok)throw Error('Google-Dienst: HTTP '+r.status);return r;}
async function googleAccount(){const r=await request('https://openidconnect.googleapis.com/v1/userinfo'),account=await r.json();if(typeof account.sub!=='string'||!account.sub||typeof account.email!=='string'||account.email_verified!==true)throw Error('Google-Konto konnte nicht eindeutig bestätigt werden.');return{sub:account.sub,email:account.email};}
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
  const saved=readSyncState();
  const confirmLocal=message=>confirm('PDF wurde erstellt. Die ausgewählten Belege und Bilder jetzt dauerhaft von diesem Gerät löschen?\n\n'+message+'\n\nDiese lokale Löschung kann nicht rückgängig gemacht werden. Die PDF bleibt erhalten.');
  if(!saved?.vault){const confirmed=confirmLocal('Es ist kein Google Drive zugeordnet. Cloud-Kopien werden nicht gelöscht.');if(confirmed){const cloudPurged={...(saved?.cloudPurged||{})};for(const receipt of receipts)cloudPurged[receipt.id]=true;localStorage.setItem(KEY,JSON.stringify({...saved,cloudPurged}));}return{confirmed,deletedVersions:0,cloudSkipped:true,message:confirmed?'Nur lokale Belege gelöscht; Cloud-Kopien wurden nicht gelöscht.':'Abgebrochen; lokale Belege bleiben erhalten. Keine Drive-Zuordnung.'};}
  await authorize();
  const account=await googleAccount();
  if(saved.account&&saved.account.sub!==account.sub)throw Error('Anderes Google-Konto erkannt. Löschung blockiert; lokale Belege wurden nicht entfernt.');
  const io={remote,hash,state:{load:readSyncState,save:s=>localStorage.setItem(KEY,JSON.stringify(s))},confirm:({receipts:selectedReceipts,cloudReceipts,versions})=>{
   const labels=selectedReceipts.map(r=>(r.vendor||'Beleg')+' · '+(r.date||'')).join('\n');
   const cloudLabels=cloudReceipts.map(r=>(r.vendor||'Beleg')+' · '+(r.date||'')).join('\n');
   return confirm('PDF wurde erstellt. Ausgewählte Belege und Bilder dauerhaft löschen?\n\nAuf diesem Gerät:\n'+labels+'\n\nIm verbundenen Google Drive:\n'+(cloudLabels||'Keine Cloud-Kopien gefunden.')+'\n\n'+selectedReceipts.length+' lokale Beleg(e), '+cloudReceipts.length+' Cloud-Beleg(e) und '+versions+' Cloud-Version(en) werden endgültig gelöscht. Ein minimaler Cloud-Löschvermerk mit Beleg-ID verhindert, dass entfernte Belege erneut synchronisiert werden. Die heruntergeladene PDF bleibt erhalten. Andere Geräte können noch lokale Kopien besitzen.');
  }};
  const result=await purgeReceipts(io,receipts);
  if(result.cancelled)return{...result,message:'Abgebrochen; lokale und Cloud-Belege bleiben erhalten.'};
  return{...result,message:result.deletedVersions?result.deletedReceipts+' Cloud-Beleg(e) und '+result.deletedVersions+' Cloud-Version(en) dauerhaft gelöscht.':'Keine Cloud-Kopien gefunden; Löschmarkierungen für '+result.tombstonedReceipts+' Beleg(e) gesetzt.'};
 }finally{busy=false}
}
root.AuslagenDrive=Object.freeze({removeReceiptCopies});
function build(){
 const host=document.getElementById('capture');if(!host)return;
 const card=document.createElement('div');card.className='card';
 const title=document.createElement('h2');title.textContent='Google Drive';
 const note=document.createElement('p');note.className='sub';note.textContent='Optionaler Abgleich deiner Testbelege zwischen eigenen Geräten.';
 const identity=document.createElement('p');identity.className='sub';identity.setAttribute('role','status');
 try{const saved=readSyncState();identity.textContent=saved?.account?.email?'Zuletzt verbunden: '+saved.account.email+' (nicht angemeldet).':'Kein Konto verbunden.';}catch(error){identity.textContent='Kontoinfo nicht lesbar: '+error.message;}
 const btn=document.createElement('button');btn.type='button';btn.textContent='Mit Google verbinden und abgleichen';
 const off=document.createElement('button');off.type='button';off.className='secondary';off.textContent='Verbindung trennen';
 const status=document.createElement('p');status.className='sub';status.setAttribute('role','status');
 const actions=document.createElement('div');actions.className='actions';actions.append(btn,off);card.append(title,note,identity,actions,status);host.prepend(card);
 const dialog=document.createElement('dialog');dialog.className='sync-dialog';dialog.setAttribute('aria-labelledby','sync-dialog-title');
 const dialogTitle=document.createElement('h2');dialogTitle.id='sync-dialog-title';dialogTitle.textContent='Google Drive verbinden?';
 const dialogNote=document.createElement('p');dialogNote.id='sync-dialog-description';dialogNote.textContent='Optionaler Abgleich zwischen deinen Geräten. Belege werden direkt in dein Google Drive übertragen. Nur fiktive Testdaten – diese Website ist öffentlich.';dialog.setAttribute('aria-describedby',dialogNote.id);
 const dialogActions=document.createElement('div');dialogActions.className='actions';
 const later=document.createElement('button');later.type='button';later.className='secondary';later.textContent='Später';
 const connect=document.createElement('button');connect.type='button';connect.textContent='Jetzt verbinden';
 dialogActions.append(later,connect);dialog.append(dialogTitle,dialogNote,dialogActions);document.body.append(dialog);
 const connectDrive=async requireConfirm=>{
  if(busy)return;
  if(requireConfirm&&!confirm('Google-Anmeldung laden und Testbelege direkt mit deinem Google Drive abgleichen?'))return;
  busy=true;btn.disabled=off.disabled=connect.disabled=later.disabled=true;
  try{
   await authorize();const account=await googleAccount();status.textContent='Drive-Konto '+account.email+' prüfen und Testbelege abgleichen …';
   const result=await reconcile({account:()=>account,local:{all:()=>dbAll(),put:r=>dbPut([r])},remote,hash,state:{load:readSyncState,save:s=>localStorage.setItem(KEY,JSON.stringify(s))},adopt:async n=>confirm(n+' lokale Belege gehören zu diesem Google Drive und dürfen hochgeladen werden?')});
   identity.textContent='Zuletzt verbunden: '+account.email+' (nicht angemeldet).';db=await dbAll();render();
   status.textContent=result.uploaded+' hochgeladen, '+result.downloaded+' geladen. Konflikte: '+result.conflicts.length+(result.conflicts.length?' – nicht überschrieben; Auflösung noch nicht implementiert.':'');
  }catch(e){status.textContent='Abgleich gestoppt: '+e.message;}
  finally{busy=false;btn.disabled=off.disabled=connect.disabled=later.disabled=false;}
 };
 btn.onclick=()=>connectDrive(true);connect.onclick=()=>{dialog.close();connectDrive(false)};later.onclick=()=>dialog.close();
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 off.onclick=()=>{if(busy)return;if(token&&root.google?.accounts?.oauth2)root.google.accounts.oauth2.revoke(token,()=>{});token='';expiry=0;status.textContent='Getrennt. Die Drive-Bindung bleibt zum Schutz vor Kontovermischung erhalten. Lokale und Cloud-Belege wurden nicht gelöscht.';};
 if(typeof dialog.showModal==='function')dialog.showModal();else status.textContent='Dieser Browser unterstützt den Google-Info-Dialog nicht.';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})(typeof self!=='undefined'?self:this);
