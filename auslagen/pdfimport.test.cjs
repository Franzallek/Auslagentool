const assert=require('node:assert/strict');
const P=require('./pdfimport.js');
let n=0;const t=(name,fn)=>{fn();n++;console.log('PASS '+name)};
t('one invoice per page',()=>assert.deepEqual(P.makeGroups(4,{mode:'single',joins:[2,3]}),[[1],[2],[3],[4]]));
t('custom joins pages',()=>assert.deepEqual(P.makeGroups(4,{mode:'custom',joins:[3]}),[[1],[2,3],[4]]));
t('custom without joins equals single',()=>assert.deepEqual(P.makeGroups(3,{mode:'custom'}),[[1],[2],[3]]));
t('skipped page leaves group',()=>assert.deepEqual(P.makeGroups(5,{mode:'custom',joins:[3,4],skip:[1,4]}),[[2,3],[5]]));
t('join after skip starts new group',()=>assert.deepEqual(P.makeGroups(3,{mode:'custom',joins:[2],skip:[1]}),[[2],[3]]));
t('first page join ignored',()=>assert.deepEqual(P.makeGroups(2,{mode:'custom',joins:[1]}),[[1],[2]]));
t('all skipped',()=>assert.deepEqual(P.makeGroups(2,{mode:'custom',skip:[1,2]}),[]));
t('labels',()=>{assert.equal(P.labelFor([2]),'Seite 2');assert.equal(P.labelFor([2,3,4]),'Seiten 2'+String.fromCharCode(8211)+'4')});
t('text lines from items',()=>{
 const it=(s,x,y,w)=>({str:s,transform:[10,0,0,10,x,y],width:w});
 const text=P.textFromItems([it('119,00',400,700,30),it('Brutto',50,700,30),it('Rechnung',50,780,40),it('Nr. 42',95,780,30),it('Netto',50,720,25),it('100,00',400,720.5,30),{type:'beginMarkedContent'},it('  ',10,10,2)]);
 assert.equal(text,['Rechnung Nr. 42','Netto'+'   '+'100,00','Brutto'+'   '+'119,00'].join(String.fromCharCode(10)))});
t('needsOcr',()=>{assert.equal(P.needsOcr(''),true);assert.equal(P.needsOcr(' 1 2 '),true);assert.equal(P.needsOcr('Rechnung Nr. 4711 Gesamtbetrag 119,00 EUR'),false)});
console.log(n+' pdfimport tests passed');
