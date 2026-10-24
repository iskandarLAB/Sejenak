import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {api,packageQuotas,packageFeatures} from '../worker/api.mjs';import {seedEvent,tinyJpeg,tinyPng} from './fixtures.mjs';
const source=fs.readFileSync(new URL('../worker/app.js',import.meta.url),'utf8').replace(/init\(\);\s*$/,'');
function ui(path='/'){const nodes=new Map(),node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',value:'',style:{},addEventListener(){},showModal(){},classList:{add(){},remove(){}}});return nodes.get(s)};const c=vm.createContext({document:{querySelector:node},location:{pathname:path,origin:'https://test.site'},window:{},localStorage:{getItem:()=>null},crypto,FormData,console});vm.runInContext(source,c);return{c,node}}
class Bucket{constructor(){this.m=new Map()}async get(k){const x=this.m.get(k);return x?{json:async()=>JSON.parse(x.v),body:x.v,httpMetadata:x.meta?.httpMetadata}:null}async put(k,v,meta){this.m.set(k,{v,meta})}async delete(k){this.m.delete(k)}async list({prefix}){return {objects:[...this.m].filter(([k])=>k.startsWith(prefix)).map(([key,x])=>({key,size:x.meta?.size??(typeof x.v==='string'?x.v.length:x.v.byteLength)})),truncated:false}}}
function request(path,{method='GET',body,user}={}){return new Request('https://test.site'+path,{method,headers:{...(user?{'oai-authenticated-user-id':user}:{}),...(body instanceof FormData?{}:body?{'Content-Type':'application/json'}:{})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})})}
test('Three paid prices, matching quotas and recommendation replace every free acquisition path',()=>{
 const{c,node}=ui();vm.runInContext('landing()',c);const html=node('#root').innerHTML;
 for(const amount of [79,149,249])assert.ok(html.includes('RM'+amount));
 assert.equal([...html.matchAll(/class="price paid-package/g)].length,3);
 assert.equal([...html.matchAll(/class="price paid-package featured"/g)].length,1);
 assert.ok(html.includes('PALING BERBALOI · DISYORKAN'));assert.ok(html.includes('Tambah RM70'));
 for(const old of ['RM0','Cuba Dulu','Mula percuma','Cipta galeri percuma','trial percuma','Trial:'])assert.ok(!html.includes(old),old);
 for(const fn of ['pricing()','onboardingGuide()'])for(const m of vm.runInContext(fn,c).matchAll(/onclick="([^"]*)"/g))assert.doesNotThrow(()=>new Function(m[1]));
 const packages=vm.runInContext('weddingPackages',c);assert.equal(packages.length,3);
 for(const p of packages){assert.deepEqual(Array.from(p.features),packageFeatures[p.id]);const server=packageQuotas[p.id];assert.deepEqual({...server},{photos:p.photos,wishes:p.wishes,storageBytes:p.storageGB*1024**3});c.p=p.id;vm.runInContext('paymentInfo(p)',c);assert.ok(node('#modal').innerHTML.includes('RM'+p.price));assert.ok(node('#modal').innerHTML.includes('Cuba demo Basic'))}
});
test('Real create actions expose purchase availability without opening a trial form',()=>{
 const{c,node}=ui('/dashboard');vm.runInContext("createEvent('invitation')",c);assert.ok(!node('#modal').innerHTML.includes('createform'));assert.ok(node('#modal').innerHTML.includes('Bayaran belum dibuka'));
 vm.runInContext('createInvitation()',c);assert.ok(!node('#modal').innerHTML.includes('createform'));assert.ok(node('#modal').innerHTML.includes('Cuba demo Basic'));
});
test('Backend rejects new free events and client-supplied paid plans without writing objects',async()=>{
 const b=new Bucket();for(const plan of [undefined,'trial',...Object.keys(packageQuotas)]){const r=await api(request('/api/events',{method:'POST',user:'new-owner',body:{name:'Couple',date:'2027-02-22',plan,requestId:crypto.randomUUID()}}),{BUCKET:b});assert.equal(r.status,402);assert.match((await r.json()).error,/demo/)}assert.equal(b.m.size,0);
});
test('Each paid package enforces its feature permissions and its own photo, wish and byte quota',async()=>{
 const{c}=ui();
 for(const [plan,cap] of Object.entries(packageQuotas)){
  const b=new Bucket(),env={BUCKET:b},e=await(await seedEvent(b,{user:'owner'})).json();e.plan=plan;await b.put('events/'+e.id+'/event.json',JSON.stringify(e));
  const run=(path,opts)=>api(request(path,opts),env),path='/api/events/'+e.id;
  const own=await(await run(path,{user:'owner'})).json();assert.deepEqual(own.limits,cap);
  c.testEvent=e;assert.equal(vm.runInContext('hasPremium(testEvent)',c),plan!=='detik');assert.equal(vm.runInContext('eventLimits(testEvent).photos',c),cap.photos);
  assert.equal((await run(path,{method:'PATCH',user:'owner',body:{primaryColor:'#345678',invitation:{template:'minimal',open:true}}})).status,plan==='detik'?402:200);
  assert.equal((await run('/api/invitation/'+e.id)).status,plan==='detik'?402:200);
  assert.equal((await run('/api/rsvp/'+e.id,{method:'POST',body:{name:'Guest',status:'yes',adults:1,children:0,token:crypto.randomUUID()}})).status,plan==='detik'?402:201);
  const qr=new FormData();qr.set('qr',new Blob([tinyPng],{type:'image/png'}),'qr.png');
  assert.equal((await run(path+'/payment-qr',{method:'POST',user:'owner',body:qr})).status,plan==='detik'?402:200);
  assert.equal((await run('/api/salam/'+e.id,{method:'POST',body:{name:'Guest',amountSen:1000,requestId:crypto.randomUUID()}})).status,plan==='detik'?402:201);
  assert.equal((await run(path+'/rsvps/export',{user:'owner'})).status,plan==='seindah-kenangan'?200:402);
  assert.equal((await run(path+'/rsvps/export',{user:'other'})).status,403);
  const cover=new FormData();cover.set('cover',new Blob([tinyJpeg],{type:'image/jpeg'}),'cover.jpg');
  assert.equal((await run(path+'/cover',{method:'POST',user:'owner',body:cover})).status,plan==='seindah-kenangan'?200:402);
  e.coverVersion='stale-cover';await b.put('events/'+e.id+'/event.json',JSON.stringify(e));await b.put('events/'+e.id+'/cover',new Uint8Array([255,216,255,224]),{httpMetadata:{contentType:'image/jpeg'}});
  assert.equal((await run('/api/cover/'+e.id)).status,plan==='seindah-kenangan'?200:404);
  const guest=await(await run('/api/guest/'+e.id)).json();assert.equal(guest.coverVersion,plan==='seindah-kenangan'?'stale-cover':undefined);
  await run(path,{method:'PATCH',user:'owner',body:{plan:'seindah-kenangan'}});assert.equal((await(await run(path,{user:'owner'})).json()).plan,plan);
  const photo=()=>{const f=new FormData();f.set('photo',new Blob([tinyJpeg],{type:'image/jpeg'}),'x.jpg');return f};
  for(let n=0;n<cap.photos;n++)await b.put('events/'+e.id+'/posts/photo-'+n+'.json',JSON.stringify({id:'p'+n,type:'photo',created:'2027-01-01'}));
  assert.equal((await run('/api/guest/'+e.id+'/posts',{method:'POST',body:photo()})).status,400);
  for(const key of [...b.m.keys()])if(key.includes('/posts/'))b.m.delete(key);
  await b.put('events/'+e.id+'/files/existing','x',{size:cap.storageBytes});
  assert.equal((await run('/api/guest/'+e.id+'/posts',{method:'POST',body:photo()})).status,400);
  b.m.delete('events/'+e.id+'/files/existing');
  assert.equal((await run('/api/guest/'+e.id+'/posts',{method:'POST',body:photo()})).status,201);
  for(let n=0;n<cap.wishes;n++)await b.put('events/'+e.id+'/posts/wish-'+n+'.json',JSON.stringify({id:'w'+n,type:'wish',created:'2027-01-01'}));
  assert.equal((await run('/api/guest/'+e.id+'/posts',{method:'POST',body:{name:'Guest',text:'Over the limit'}})).status,400);
 }
});
test('Demo can create a full sample package without production requests or trial upsells',async()=>{
 const{c}=ui('/dashboard-demo');vm.runInContext('ownerDemoStore={events:[]}',c);
 c.createBody=JSON.stringify({name:'Demo Couple',date:'2027-02-22'});
 const e=await vm.runInContext("ownerDemoAPI('/api/events',{method:'POST',body:createBody})",c);
 assert.equal(e.plan,'cerita-kita');assert.equal(e.posts.length,0);
});

test('Middle package saves its available design without cover fields, and upper package alone exposes cover editing',()=>{
 const{c,node}=ui('/dashboard-demo');vm.runInContext("resetOwnerDemo(false);updateDesignPreview=()=>{};active='settings';renderOwner()",c);
 let html=node('#root').innerHTML;assert.ok(html.includes('cover-editor-fields" disabled'));assert.ok(html.includes('data-locked-feature="cover"'));assert.ok(!html.includes('Lihat pakej RM249'));assert.equal(vm.runInContext('Object.hasOwn(designDraft(),"coverPosition")',c),false);
 for(const m of html.matchAll(/onclick="([^"]*)"/g))assert.doesNotThrow(()=>new Function(m[1]));
 vm.runInContext("setDemoPackage('seindah-kenangan')",c);html=node('#root').innerHTML;assert.ok(!html.includes('cover-editor-fields" disabled'));assert.equal(vm.runInContext('Object.hasOwn(designDraft(),"coverPosition")',c),true);
 vm.runInContext("setDemoPackage('detik')",c);html=node('#root').innerHTML;assert.ok(html.includes('basicform'));assert.ok(!html.includes('settingsform'));
 assert.equal(vm.runInContext('ownerDemoStore.events[0].plan',c),'detik');vm.runInContext('resetOwnerDemo(false)',c);assert.equal(vm.runInContext('event.plan',c),'cerita-kita');
});
test('CSV export stays locked in lower packages and upper export still neutralizes spreadsheet formulas',async()=>{
 const{c,node}=ui('/dashboard-demo'),saved=[];c.Blob=Blob;c.saved=saved;
 vm.runInContext("resetOwnerDemo(false);saveFile=(blob,name)=>saved.push({blob,name})",c);
 await vm.runInContext('exportRSVP()',c);assert.equal(saved.length,0);assert.equal(vm.runInContext('active',c),'plan');assert.equal(vm.runInContext('lockedFeatureFocus',c),'csv');assert.ok(node('#root').innerHTML.includes('Ciri ini tersedia mulai Max.'));
 vm.runInContext("setDemoPackage('seindah-kenangan');ownerDemoStore.events[0].rsvps=[{name:'=SUM(1,2)',status:'yes',adults:1,children:0,note:'@formula',updated:'2027-01-01'}]",c);
 await vm.runInContext('exportRSVP()',c);assert.equal(saved.length,1);assert.equal(saved[0].name,'sejenak-rsvp.csv');const content=await saved[0].blob.text();assert.ok(content.includes("\"'=SUM(1,2)\""));assert.ok(content.includes("\"'@formula\""));
});

test('Locked actions on public pricing go to packages and highlight the first tier that provides the feature',async()=>{
 const{c,node}=ui('/'),cards=['detik','cerita-kita','seindah-kenangan'].map(id=>({dataset:{packageId:id},marked:false,classList:{toggle(k,v){this.owner.marked=v}},scrollIntoView(options){this.scroll=options}}));for(const card of cards)card.classList.owner=card;
 c.document.querySelectorAll=()=>cards;const original=c.document.querySelector;c.document.querySelector=selector=>selector.startsWith('[data-package-id=')?cards.find(card=>selector.includes('"'+card.dataset.packageId+'"')):original(selector);
 vm.runInContext('landing()',c);await vm.runInContext("openLockedFeature('invitation')",c);assert.equal(c.location.hash,'pakej');assert.equal(cards[1].marked,true);assert.equal(cards[2].marked,false);assert.equal(node('#package-unlock-note').hidden,false);assert.ok(node('#package-unlock-note').innerHTML.includes('Pro'));
 await vm.runInContext("openLockedFeature('cover')",c);assert.equal(cards[1].marked,false);assert.equal(cards[2].marked,true);assert.ok(node('#package-unlock-note').innerHTML.includes('Max'));assert.equal(cards[2].scroll.behavior,'smooth');
 c.window.matchMedia=()=>({matches:true});await vm.runInContext("openLockedFeature('csv')",c);assert.equal(cards[2].scroll.behavior,'auto');
 for(const feature of ['invitation','poster','design','salam','cover','csv']){c.feature=feature;const button=vm.runInContext('lockedFeatureButton(feature)',c);assert.ok(button.includes('>Locked</span>'));assert.ok(button.includes('icon-lock'));assert.ok(!/RM\d+/.test(button))}
});
