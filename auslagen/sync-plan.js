(function(root){
'use strict';
function same(a,b){return a===b;}
function plan(input){
 const {account, boundAccount, local, remote, base, adoptLocal=false}=input;
 if(!account||typeof account!=='string')throw Error('Verified account required');
 if(boundAccount&&boundAccount!==account)throw Error('Account mismatch; separate local storage required');
 if(!boundAccount&&local.length&&!adoptLocal)throw Error('Explicit adoption of local receipts required');
 const L=new Map(),R=new Map(),B=new Map();
 for(const [items,map] of [[local,L],[remote,R],[base||[],B]])for(const item of items){
  if(!item||typeof item.id!=='string'||typeof item.hash!=='string'||!item.hash)throw Error('Invalid receipt revision');
  if(map.has(item.id))throw Error('Duplicate receipt ID');
  map.set(item.id,item);
 }
 const actions=[];
 for(const id of new Set([...L.keys(),...R.keys(),...B.keys()])){
  const l=L.get(id),r=R.get(id),b=B.get(id);
  if(!l&&!r)continue;
  if(!l){actions.push({type:'download',id,remote:r});continue;}
  if(!r){
   if(b){actions.push({type:'conflict',id,reason:'Remote revision missing; no automatic recreation',local:l,remote:null});}
   else actions.push({type:'create',id,local:l});
   continue;
  }
  if(same(l.hash,r.hash)){actions.push({type:'unchanged',id});continue;}
  if(!b){actions.push({type:'conflict',id,reason:'Different versions without a common baseline',local:l,remote:r});continue;}
  const lc=!same(l.hash,b.hash),rc=!same(r.hash,b.hash);
  if(lc&&rc)actions.push({type:'conflict',id,reason:'Both versions changed',local:l,remote:r});
  else if(lc)actions.push({type:'update',id,local:l,expectedRemoteRevision:r.revision});
  else if(rc)actions.push({type:'download',id,remote:r});
  else actions.push({type:'conflict',id,reason:'Inconsistent baseline',local:l,remote:r});
 }
 return actions;
}
const api={plan};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.AuslagenSyncPlan=api;
})(typeof self!=='undefined'?self:this);
