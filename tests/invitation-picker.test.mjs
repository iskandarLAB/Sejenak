import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../worker/app.js',import.meta.url),'utf8').replace(/init\(\);\s*$/,'');
function setup(){
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',value:'',textContent:'',style:{},addEventListener(){}});return nodes.get(id)};
 const ids=['ivory','pearl','garden','rosewater','azure','songket'],buttons=ids.map(id=>({dataset:{template:id},attrs:{},classList:{toggle(k,v){this[k]=v}},mark:{textContent:''},setAttribute(k,v){this.attrs[k]=v},querySelector(){return this.mark}})),scrolls=[];
 node('.six-template-options').clientWidth=400;node('.six-template-options').scrollLeft=720;node('.six-template-options').scrollBy=o=>scrolls.push(o);
 const c=vm.createContext({document:{querySelector:node,querySelectorAll:()=>buttons},window:{matchMedia:()=>({matches:false})},location:{pathname:'/dashboard-demo',origin:'https://test.site'},localStorage:{getItem:()=>null},console});
 vm.runInContext(source,c);vm.runInContext("event={id:'sample',plan:'cerita-kita',name:'Aina & Amir',date:'2027-02-22',venue:'Taman Cinta'}",c);
 return{c,node,buttons,scrolls,ids};
}
test('Six artwork-only options have distinct palettes, readable typography and preserve carousel/form state when selected',()=>{
 const{c,node,buttons,ids}=setup(),cards=vm.runInContext("invitationTemplateCards('')",c);assert.equal([...cards.matchAll(/data-template="/g)].length,6);assert.ok(!cards.includes('Aina &amp; Amir'));assert.ok(!cards.includes('template-preview-copy'));assert.ok(!cards.includes('Art Deco'));assert.ok(!cards.includes('Terracotta Modern'));assert.equal([...cards.matchAll(/lang="ar" dir="rtl"/g)].length,6);assert.ok(cards.includes('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'));
 const options=vm.runInContext('invitationTemplateOptions',c);assert.equal(new Set(options.map(t=>t.ink)).size,6);assert.equal(new Set(options.map(t=>t.style)).size,6);
 for(const t of options){assert.ok(fs.existsSync(new URL('../worker'+t.image,import.meta.url)));c.ink=t.ink;c.paper=t.paper;assert.ok(vm.runInContext('contrast(ink,paper)',c)>4.5)}
 node('#invitetemplates').innerHTML=cards;node('#ihosts').value='Nama ibu bapa';const before=node('#invitetemplates').innerHTML;
 vm.runInContext("selectInvitationTemplate('ivory')",c);assert.equal(node('#invitetemplates').innerHTML,before);assert.equal(node('.six-template-options').scrollLeft,720);assert.equal(node('#ihosts').value,'Nama ibu bapa');
 assert.equal(node('#itemplate').value,'ivory');assert.equal(buttons.filter(b=>b.attrs['aria-pressed']==='true').length,1);assert.equal(buttons.find(b=>b.dataset.template==='ivory').mark.textContent,'✓');assert.ok(node('#template-live-preview').innerHTML.includes('Aina &amp; Amir'));assert.ok(node('#template-live-preview').innerHTML.includes('--ecard-ink:#725c32'));
 vm.runInContext("selectInvitationTemplate('not-a-template')",c);assert.equal(node('#itemplate').value,'ivory');
 for(const match of cards.matchAll(/(?:onclick|onkeydown)="([^"]*)"/g))assert.doesNotThrow(()=>new Function(match[1]));
 for(const id of ids){c.template=id;assert.ok(vm.runInContext('ecardStyle(template)',c).includes('--on-primary:'))}
});
test('Template carousel supports arrows, keyboard control and reduced motion, while historic links remain valid',()=>{
 const{c,node,scrolls}=setup();vm.runInContext('scrollInvitationTemplates(1);scrollInvitationTemplates(-1)',c);assert.deepEqual(scrolls.map(x=>x.left),[320,-320]);assert.equal(scrolls[0].behavior,'smooth');
 c.window.matchMedia=()=>({matches:true});vm.runInContext('scrollInvitationTemplates(1)',c);assert.equal(scrolls.at(-1).behavior,'auto');
 c.e={target:node('.six-template-options'),currentTarget:node('.six-template-options'),key:'ArrowLeft',preventDefault(){this.prevented=true}};vm.runInContext('invitationTemplateKey(e)',c);assert.equal(c.e.prevented,true);assert.equal(scrolls.at(-1).left,-320);
 for(const id of ['garden','rosewater','ivory','pearl','azure','songket','botanical','minimal','classic','midnight','terracotta']){c.location.search='?template='+id;assert.equal(vm.runInContext('demoInvitationTemplate()',c),id)}
 c.location.search='?template=unsafe';assert.equal(vm.runInContext('demoInvitationTemplate()',c),'garden');
});
