const assert=require('node:assert/strict');
const {reconcile,purgeReceipts,canonical,valid}=require('./sync.js');
const r=n=>({id:'r1',vendor:n,date:'2026-11-02',invoice:'',project:'',purpose:'',currency:'EUR',net:100,tax:19,gross:119,status:'Entwurf',taxes:[]});
const hash=async x=>canonical(x);
(async()=>{let local=[r('A')],state={},versions=[],currentVault='vaultA',currentAccount={sub:'google-user-a',email:'a@example.test'},vaultCreateRequests=[];const io={account:()=>currentAccount,local:{all:async()=>local,put:async r=>{local=[r]}},remote:{vault:async createIfMissing=>{vaultCreateRequests.push(createIfMissing);return currentVault},versions:async()=>versions,purgedIds:async()=>[],append:async v=>versions.push(v)},hash,state:{load:()=>state,save:s=>{state=s}},adopt:async()=>true};
assert(valid(r('A')));assert(!valid({...r('A'),gross:5}));
let s=await reconcile(io);assert.equal(s.uploaded,1);assert.equal(state.vault,'vaultA');
assert.deepEqual(state.account,{sub:'google-user-a',email:'a@example.test'});
local=[];s=await reconcile(io);assert.equal(s.downloaded,1);assert.equal(versions.length,1);
local=[r('B')];s=await reconcile(io);assert.equal(s.uploaded,1);assert.equal(versions.length,2);
const baseline=versions[1].hash;local=[r('C')];versions.push({receipt:r('D'),hash:await hash(r('D')),parent:baseline});s=await reconcile(io);assert.equal(s.conflicts.length,1);assert.equal(local[0].vendor,'C');
currentAccount={sub:'google-user-a',email:'updated-a@example.test'};s=await reconcile(io);assert.equal(state.account.email,'updated-a@example.test');
const count=versions.length,localBeforeSwitch=local.map(x=>({...x})),stateBeforeSwitch=JSON.stringify(state);currentAccount={sub:'google-user-b',email:'b@example.test'};let vaultRequestsBeforeSwitch=vaultCreateRequests.length;await assert.rejects(reconcile(io),/Anderes Google-Konto/);assert.equal(vaultCreateRequests.length,vaultRequestsBeforeSwitch);currentAccount={sub:'google-user-a',email:'a@example.test'};currentVault='vaultB';await assert.rejects(reconcile(io),/Anderes Google Drive/);assert.equal(vaultCreateRequests.at(-1),false);currentVault=null;await assert.rejects(reconcile(io),/Anderes Google Drive/);assert.equal(vaultCreateRequests.at(-1),false);assert.equal(versions.length,count);assert.deepEqual(local,localBeforeSwitch);assert.equal(JSON.stringify(state),stateBeforeSwitch);
state={};io.adopt=async()=>false;await assert.rejects(reconcile(io),/abgebrochen/);
let purgeState={vault:'vaultA',base:{r1:await hash(r('A'))}},remoteMarkers=new Set(),cloud=[
 {fileId:'a1',receipt:r('A'),hash:await hash(r('A')),parent:null},
 {fileId:'a2',receipt:r('A2'),hash:await hash(r('A2')),parent:await hash(r('A'))},
 {fileId:'b1',receipt:{...r('B'),id:'r2'},hash:await hash({...r('B'),id:'r2'}),parent:null},
 {fileId:'b2',receipt:{...r('B2'),id:'r2'},hash:await hash({...r('B2'),id:'r2'}),parent:await hash({...r('B'),id:'r2'})}
],deleted=[],approved=true;
let confirmation;
const purgeIo={state:{load:()=>purgeState,save:s=>{purgeState=s}},confirm:async details=>{confirmation=details;return approved},hash,
 remote:{vault:async()=> 'vaultA',versionFiles:async()=>cloud.filter(v=>!deleted.includes(v.fileId)),versions:async()=>cloud.filter(v=>!deleted.includes(v.fileId)).map(({fileId,...v})=>v),purgedIds:async()=>[...remoteMarkers],markPurged:async ids=>ids.forEach(id=>remoteMarkers.add(id)),deleteFiles:async ids=>{deleted.push(...ids);return ids.length},append:async v=>{cloud.push({fileId:'new',...v})}},
 local:{all:async()=>[r('A')],put:async()=>{}},adopt:async()=>true};
let purged=await purgeReceipts(purgeIo,[r('A')]);assert.equal(purged.deletedReceipts,1);assert.equal(purged.deletedVersions,2);assert.equal(purged.confirmed,true);assert.deepEqual(confirmation.receipts,[r('A')]);assert.deepEqual(confirmation.cloudReceipts,[r('A')]);assert.deepEqual(deleted,['a1','a2']);assert.equal(purgeState.cloudPurged.r1,true);assert.equal(cloud.filter(v=>!deleted.includes(v.fileId)).length,2);
purged=await purgeReceipts(purgeIo,[r('A')]);assert.equal(purged.deletedVersions,0);assert.equal(purged.confirmed,true);assert.equal(remoteMarkers.has('r1'),true);
purgeState={vault:'vaultA',base:{}};let later=await reconcile(purgeIo);assert.equal(later.uploaded,0);assert.equal(later.conflicts.length,0);assert.equal(purgeState.cloudPurged.r1,true);assert.equal(remoteMarkers.has('r1'),true);
approved=false;const beforeCancel=deleted.length;purged=await purgeReceipts(purgeIo,[{...r('B'),id:'r2'}]);assert.equal(purged.cancelled,true);assert.equal(purged.confirmed,undefined);assert.equal(deleted.length,beforeCancel);assert.equal(purgeState.cloudPurged.r2,undefined);
approved=true;purgeIo.remote.vault=async()=> 'vaultB';await assert.rejects(purgeReceipts(purgeIo,[{...r('B'),id:'r2'}]),/nicht durch einen erfolgreichen Abgleich zugeordnet/);assert.equal(deleted.length,beforeCancel);
purgeIo.remote.vault=async()=> 'vaultA';
purgeIo.remote.deleteFiles=async ids=>{const first=ids[0];deleted.push(first);const e=Error('Netzwerkfehler');e.deletedFiles=1;e.totalFiles=ids.length;throw e};
await assert.rejects(purgeReceipts(purgeIo,[{...r('B'),id:'r2'}]),/Netzwerkfehler/);assert.equal(purgeState.cloudPurged.r2,true);
purgeIo.remote.deleteFiles=async ids=>{deleted.push(...ids);return ids.length};purged=await purgeReceipts(purgeIo,[{...r('B'),id:'r2'}]);assert.equal(purged.deletedVersions,1);
const old={...r('Old receipt'),id:'old-receipt'},resurrectionState={vault:'vaultA',base:{}},resurrectionMarkers=new Set(),resurrectionRemote=[];
const resurrectionIo={state:{load:()=>resurrectionState,save:s=>Object.assign(resurrectionState,s)},hash,confirm:async()=>true,local:{all:async()=>[old],put:async()=>{}},remote:{
 vault:async()=> 'vaultA',versionFiles:async()=>[],versions:async()=>resurrectionRemote,purgedIds:async()=>[...resurrectionMarkers],
 markPurged:async ids=>ids.forEach(id=>resurrectionMarkers.add(id)),deleteFiles:async ids=>ids.length,
 append:async v=>resurrectionRemote.push(v)
}};
purged=await purgeReceipts(resurrectionIo,[old]);assert.equal(purged.confirmed,true);assert.equal(purged.deletedVersions,0);assert.equal(resurrectionMarkers.has(old.id),true);
const noResurrection=await reconcile(resurrectionIo);assert.equal(noResurrection.uploaded,0);assert.equal(resurrectionRemote.length,0);
resurrectionState.cloudPurged={ [old.id]:true };resurrectionMarkers.clear();await reconcile(resurrectionIo);assert.equal(resurrectionMarkers.has(old.id),true);
process.stdout.write('PASS validation, initial upload, restore, append-only update, conflict preservation, account guard, adoption refusal, permanent cloud purge, confirmation, no-match tombstones, no resurrection on later sync, local tombstone propagation, retry after partial deletion\n');
})().catch(e=>{process.stderr.write(e.stack);process.exit(1)});
