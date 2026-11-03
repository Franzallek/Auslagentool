(function(root){
'use strict';
const MONTHS={januar:1,jan:1,februar:2,feb:2,märz:3,maerz:3,mär:3,mrz:3,april:4,apr:4,mai:5,juni:6,jun:6,juli:7,jul:7,august:8,aug:8,september:9,sept:9,sep:9,oktober:10,okt:10,november:11,nov:11,dezember:12,dez:12};
const AMT=/(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2}|\d+\.\d{2})(?!\d)/g;
function toCents(s){s=String(s);s=s.includes(',')?s.replace(/\./g,'').replace(',','.'):s;return Math.round(parseFloat(s)*100)}
function amounts(line){const out=[];let m;AMT.lastIndex=0;while((m=AMT.exec(line))){const prev=line[m.index-1];if(prev&&/[\d,]/.test(prev))continue;const after=line.slice(m.index+m[0].length).trimStart();if(after.startsWith('%'))continue;out.push(toCents(m[1]))}return out}
function rateOf(line){const m=line.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*%/);if(!m)return null;const r=parseFloat(m[1].replace(',','.'));return r>=0&&r<=30?r:null}
const isoOk=(y,m,d)=>{const t=new Date(Date.UTC(y,m-1,d));return t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===d};
const iso=(y,m,d)=>y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
function parseDate(lines,now){const maxY=(now||new Date()).getFullYear()+1,found=[];
 lines.forEach((line,li)=>{const add=(y,m,d,idx)=>{if(y<100)y+=2000;if(y>=2000&&y<=maxY&&isoOk(y,m,d))found.push({iso:iso(y,m,d),line:li,idx})};let m;
  const r1=/(?:^|[^\d])(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4}|\d{2})(?!\d)/g;while((m=r1.exec(line)))add(+m[3],+m[2],+m[1],m.index);
  const r2=/(\d{4})-(\d{2})-(\d{2})/g;while((m=r2.exec(line)))add(+m[1],+m[2],+m[3],m.index);
  const r3=/(\d{1,2})\.?\s*([A-Za-zäÄ]{3,9})\.?\s*(\d{4})/g;while((m=r3.exec(line))){const mo=MONTHS[m[2].toLowerCase()];if(mo)add(+m[3],mo,+m[1],m.index)}});
 if(!found.length)return null;
 found.forEach((f,i)=>{const L=lines[f.line].toLowerCase(),P=f.line>0?lines[f.line-1].toLowerCase():'';let s=0;
  if(/rechnungsdatum|belegdatum|rechnung vom|ausgestellt|invoice date|datum|date/.test(L))s+=3;
  if(/f[äa]llig|zahlungsziel|zahlbar|zahlungsfrist|bis zum|spätestens|lieferdatum|leistungs|lieferung|geburts/.test(L))s-=4;
  if(s===0&&/rechnungsdatum|belegdatum|datum/.test(P)&&!/f[äa]llig|zahlungsziel|leistungs/.test(P))s+=1;
  f.score=s});
 const top=Math.max(...found.map(f=>f.score)),best=found.filter(f=>f.score===top);
 const distinct=[...new Set(best.map(f=>f.iso))];
 return{value:best[0].iso,conf:(top>=3&&distinct.length===1)?'ok':'check'}}
function parseVendor(lines){
 const legal=/\b(GmbH|mbH|AG|KG|UG|OHG|GbR|SE|Ltd|Inc|LLC|e\.\s?K\.|e\.\s?V\.|& Co)\b/i;
 const bad=/(rechnung|invoice|kassenbon|quittung|beleg|datum|kunde|seite|tel\b|telefon|fax|www\.|http|@|iban|bic\b|steuer|ust|öffnungs|vielen dank|bestellung|lieferschein|angebot)/i;
 const addr=/(\b\d{5}\s+[A-ZÄÖÜa-zäöüß]|(stra(ß|ss)e|str\.|weg|platz|allee|gasse|ring|damm|ufer)\s*\d)/i;
 const clean=l=>l.replace(/[|_]+/g,' ').replace(/\s{2,}/g,' ').trim();
 const top=lines.slice(0,15).map(clean);
 const cand=l=>{if(l.length<3||!/[A-Za-zÄÖÜäöüß]{3}/.test(l))return null;if(/^\d/.test(l))return null;let seg=l;
  const sep=l.split(/\s[·•|]\s|\s[-–]\s(?=.*\d{5})/);if(sep.length>1&&addr.test(l))seg=sep[0].trim();else if(addr.test(l))return null;
  if(bad.test(seg)&&!legal.test(seg))return null;return seg.replace(/^[^\wÄÖÜäöü]+|[\s,;:.]+$/g,'')||null};
 for(const l of top){if(legal.test(l)){const c=cand(l);if(c)return{value:c,conf:'ok'}}}
 for(const l of top.slice(0,8)){const c=cand(l);if(c)return{value:c,conf:'check'}}
 return null}
function parsePurpose(lines){
 const excluded=/\b(rechnung|invoice|datum|date|kunde|seite|summe|total|subtotal|zwischensumme|mwst|m\.w\.st|ust|umsatzsteuer|mehrwertsteuer|steuer|vat|tax|zahlbetrag|zahlbar|zahlung|zahlungsziel|überweisung|überweisen|rückgeld|rueckgeld|gegeben|erhalten|fällig|faellig|kundennummer|artikelnummer|bestellnummer)\b|netto|brutto|gesamt|betrag/i;
 const unit=/\b\d+(?:[.,]\d+)?\s*(?:kg|g|l|ml|stk\.?|stück|pcs?|packung|pack|dose|m|cm)\b/i;
 const found=[];
 for(const line of lines){
  if(excluded.test(line)||/%/.test(line)||/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/.test(line)||(!amounts(line).length&&!unit.test(line)))continue;
  let value=line.replace(AMT,' ').replace(/\b(?:EUR|USD|GBP|CHF)\b|[€$£]/gi,' ')
   .replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|l|ml|stk\.?|stück|pcs?|packung|pack|dose|m|cm)\b/gi,' ')
   .replace(/^\s*\d+\s*(?:x|×)?\s+/i,'').replace(/\s+\d+\s*$/,'')
   .replace(/\s+[A-Z]$/,'').replace(/[|•·]+/g,' ').replace(/\s{2,}/g,' ').trim();
  value=value.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,'');
  if(!/[A-Za-zÄÖÜäöüß]{3}/.test(value)||/^(?:kauf|artikel|ware|produkt|leistung|service|sonstiges|diverses)$/i.test(value))continue;
  const key=value.toLocaleLowerCase('de');
  if(!found.some(item=>item.key===key))found.push({key,value});
 }
 return{value:found.length===1?found[0].value:null,items:found.map(item=>item.value)};
}
function parseFuelItems(lines){
 const patterns=[
  {name:'Diesel',pattern:/\bdiesel\b|\bdiesel[-\s]?kraftstoff\b/i},
  {name:'Super E10',pattern:/\bsuper\s*e\s?10\b|\be\s?10\b|\bbenzin\s*e\s?10\b/i},
  {name:'Super E5',pattern:/\bsuper\s*e\s?5\b|\be\s?5\b|\bbenzin\s*e\s?5\b/i},
  {name:'Super',pattern:/\bsuper\b|\bbenzin\b/i}
 ];
 const text=lines.join('\n');
 const found=patterns.filter(item=>item.pattern.test(text)).map(item=>item.name);
 return found.filter((name,index)=>!(name==='Super'&&found.some(other=>other==='Super E5'||other==='Super E10')));
}
function parseInvoiceNo(text){const m=text.match(/(?:rechnungs?\s*-?\s*(?:nr|nummer|no)\.?|re\.?\s*-?\s*nr\.?|beleg\s*-?\s*(?:nr|nummer)\.?|invoice\s*(?:no|number|#)\.?|bon\s*-?\s*nr\.?)\s*[:.#]?\s*([A-Z0-9][A-Z0-9\-\/_.]{2,30})/i);
 if(!m)return null;const v=m[1].replace(/[.\-\/_]+$/,'');return/^(datum|date|kunde|vom)$/i.test(v)?null:{value:v,conf:'check'}}
function parseCurrency(text){const c={EUR:(text.match(/€|\bEUR\b/gi)||[]).length,USD:(text.match(/\$|\bUSD\b/gi)||[]).length,GBP:(text.match(/£|\bGBP\b/gi)||[]).length,CHF:(text.match(/\bCHF\b/gi)||[]).length};
 const k=Object.keys(c).sort((a,b)=>c[b]-c[a])[0];return c[k]>0?{value:k,conf:'check'}:null}
function grossCands(lines){const out=[];const strong=/rechnungsbetrag|gesamtbetrag|endbetrag|bruttobetrag|zu zahlen|zahlbetrag|gesamtsumme|summe brutto|brutto gesamt|gesamt brutto|total|amount due/i,mid=/gesamt|summe|brutto/i,weak=/betrag|\bbar\b|ec-karte|girocard|karte|kreditkarte|visa|mastercard/i;
 const excl=/netto|zwischensumme|ohne\s*(mwst|ust)|exkl|zzgl|mwst|m\.w\.st|ust|umsatzsteuer|mehrwertsteuer|\bvat\b|steuer|gegeben|rückgeld|rueckgeld|erhalten|zurück|skonto|rabatt|pfand/i;
 lines.forEach((l,i)=>{if(excl.test(l)||(/netto/i.test(l)&&/brutto/i.test(l)))return;let w=strong.test(l)?3:mid.test(l)?2:weak.test(l)?1:0;if(!w)return;
  let a=amounts(l);if(!a.length&&w>=2&&lines[i+1]&&!/%/.test(lines[i+1])&&!excl.test(lines[i+1]))a=amounts(lines[i+1]);
  if(a.length)out.push({c:a[a.length-1],w,line:i})});return out}
function netCands(lines){const out=[];lines.forEach((l,i)=>{if(!/netto|zwischensumme|ohne\s*(mwst|ust)|exkl/i.test(l)||(/netto/i.test(l)&&/brutto/i.test(l)&&!amounts(l).length))return;if(rateOf(l)!==null&&amounts(l).length>=2)return;const a=amounts(l);if(a.length)out.push({c:a[a.length-1],line:i})});return out}
function taxGroups(lines){const groups=[],loose=[];const kw=/mwst|m\.w\.st|ust|umsatzsteuer|mehrwertsteuer|\bvat\b|\btax\b|steuer/i,skip=/steuer-?nr|steuernummer|st\.-?nr|ust-?id|ust\.?-?id|identifikation|finanzamt/i;
 lines.forEach(l=>{if(skip.test(l))return;const r=rateOf(l),a=amounts(l);const hasKw=kw.test(l);if(!a.length)return;
  if(r!==null&&(hasKw||a.length>=2)){let g=null;
   if(a.length===1){if(hasKw)g={rate:r,tax:a[0],net:null,gross:null,sure:false}}
   else{const eps=2;let best=null;
    for(let i=0;i<a.length&&!best;i++){const t=a[i];for(let j=0;j<a.length&&!best;j++){if(j===i)continue;const n=a[j];if(Math.abs(Math.round(n*r/100)-t)<=eps&&t>0)best={rate:r,tax:t,net:n,gross:null,sure:true}}}
    if(best){const rest=a.filter(x=>x===best.net+best.tax||Math.abs(x-(best.net+best.tax))<=eps);if(rest.length)best.gross=rest[0]}
    if(!best&&a.length===2){const[t,g2]=[Math.min(...a),Math.max(...a)];if(Math.abs(Math.round(g2*r/(100+r))-t)<=eps)best={rate:r,tax:t,net:g2-t,gross:g2,sure:true}}
    g=best||{rate:r,tax:Math.min(...a),net:null,gross:null,sure:false}}
   if(g)groups.push(g)}
  else if(hasKw&&r===null&&/(gesamt|summe|total|betrag|mwst|ust)/i.test(l)){loose.push(a[a.length-1])}});
 const seen=new Set(),uniq=groups.filter(g=>{const k=g.rate+'|'+g.tax;if(seen.has(k))return false;seen.add(k);return true});
 return{groups:uniq,loose:[...new Set(loose)]}}
function parse(text,now){text=String(text||'').replace(/\r/g,'');const lines=text.split('\n').map(l=>l.replace(/[ \t]+/g,' ').trim()).filter(Boolean);
 const purpose=parsePurpose(lines),fuelItems=parseFuelItems(lines),itemNames=fuelItems.length?fuelItems:purpose.items,res={date:parseDate(lines,now),vendor:parseVendor(lines),invoice:parseInvoiceNo(text),currency:parseCurrency(text),gross:null,net:null,tax:null,taxes:[],purpose:itemNames.length?{value:itemNames.length===1?itemNames[0]:null,items:itemNames,conf:'check'}:null,notes:[]};
 if(itemNames.length===1)res.notes.push('Ein einzelner Artikel wurde als Auslagenzweck vorgeschlagen. Bitte prüfen.');
 else if(itemNames.length>1)res.notes.push('Mehrere mögliche Artikel erkannt. Bitte im Auswahlfeld die passenden Artikel auswählen.');
 else res.notes.push('Auslagenzweck nicht automatisch erkannt. Bitte ergänzen.');
 const G=grossCands(lines).sort((a,b)=>b.w-a.w||b.c-a.c),N=netCands(lines),{groups,loose}=taxGroups(lines);
 const groupSum=groups.length?groups.reduce((s,g)=>s+g.tax,0):null;
 const T=[];if(groupSum!==null)T.push({c:groupSum,src:'groups'});loose.forEach(c=>T.push({c,src:'loose'}));
 const groupNet=groups.length&&groups.every(g=>g.net!==null)?groups.reduce((s,g)=>s+g.net,0):null;
 const Nc=N.map(x=>x.c);if(groupNet!==null)Nc.push(groupNet);
 const gs=[...new Set(G.map(x=>x.c))];
 let done=false;
 for(const g of gs){for(const t of T){for(const n of Nc){if(n+t.c===g){res.gross={c:g,conf:'ok'};res.tax={c:t.c,conf:'ok'};res.net={c:n,conf:'ok'};done=true;break}}if(done)break}if(done)break}
 if(!done)for(const g of gs){for(const t of T){const n=g-t.c;if(n>0){res.gross={c:g,conf:'ok'};res.tax={c:t.c,conf:'ok'};res.net={c:n,conf:'derived'};done=true;break}}if(done)break}
 if(!done)for(const n of Nc){for(const t of T){res.net={c:n,conf:'ok'};res.tax={c:t.c,conf:'ok'};res.gross={c:n+t.c,conf:'derived'};done=true;break}if(done)break}
 if(!done)for(const g of gs){for(const n of Nc){if(g>n){res.gross={c:g,conf:'ok'};res.net={c:n,conf:'ok'};res.tax={c:g-n,conf:'derived'};done=true;break}}if(done)break}
 if(!done){if(gs.length)res.gross={c:gs[0],conf:'check'};if(Nc.length)res.net={c:Nc[0],conf:'check'};if(T.length)res.tax={c:T[0].c,conf:'check'};
  if(!gs.length){const all=lines.flatMap(amounts);if(all.length){res.gross={c:Math.max(...all),conf:'check'};res.notes.push('Brutto: größter erkannter Betrag – bitte prüfen.')}}
  res.notes.push('Netto, Steuer und Brutto passen nicht sicher zusammen.')}
 if(res.tax&&res.tax.conf==='ok'&&groups.length&&res.tax.c===groupSum)res.taxes=groups.map(g=>({rate:g.rate,net:g.net,tax:g.tax}));
 else if(res.tax&&groups.length===1&&res.tax.c===groups[0].tax)res.taxes=[{rate:groups[0].rate,net:groups[0].net,tax:groups[0].tax}];
 if(res.net&&res.taxes.length&&res.taxes.every(t=>t.net!==null)&&res.taxes.reduce((s,t)=>s+t.net,0)!==res.net.c)res.taxes=res.taxes.map(t=>({...t,net:null}));
 return res}
const api={parse,amounts,toCents,parseDate,parseVendor};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ReceiptParser=api;
})(typeof self!=='undefined'?self:this);
