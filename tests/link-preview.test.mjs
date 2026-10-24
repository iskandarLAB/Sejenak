import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
// WhatsApp only reads the raw HTML, so check the built Worker response exactly as a crawler receives it.
assert.equal(spawnSync(process.execPath,['scripts/build.mjs']).status,0);
const worker=(await import(pathToFileURL('dist/server/index.js').href+'?t='+Date.now())).default;
class Bucket{constructor(){this.m=new Map()}async get(k){const x=this.m.get(k);return x?{json:async()=>JSON.parse(x)}:null}async put(k,v){this.m.set(k,JSON.stringify(v))}async list(){return{objects:[],truncated:false}}}
const bucket=new Bucket(),ids={pro:'22222222-2222-4222-8222-222222222222',basic:'11111111-1111-4111-8111-111111111111',expired:'44444444-4444-4444-8444-444444444444',xss:'55555555-5555-4555-8555-555555555555'};
const base={owner:'o',venue:'Dewan Seri Melati, Shah Alam',date:'2026-12-20',collecting:true,created:'2026-01-01T00:00:00Z'};
await bucket.put('events/'+ids.pro+'/event.json',{...base,id:ids.pro,name:'Aisyah & Daniel',plan:'cerita-kita',eventTime:'11:00 pagi',invitation:{template:'songket'}});
await bucket.put('events/'+ids.basic+'/event.json',{...base,id:ids.basic,name:'Basic Pair',plan:'detik'});
await bucket.put('events/'+ids.expired+'/event.json',{...base,id:ids.expired,name:'Old Pair',plan:'cerita-kita',storageUntil:'2026-01-01T00:00:00Z'});
await bucket.put('events/'+ids.xss+'/event.json',{...base,id:ids.xss,name:'"><script>alert(1)</script>',plan:'seindah-kenangan'});
const page=async path=>{const r=await worker.fetch(new Request('https://sejenak.space'+path,{headers:{'User-Agent':'WhatsApp/2.24.1 A'}}),{BUCKET:bucket});assert.equal(r.status,200);return r.text()};
const meta=(html,prop)=>html.match(new RegExp('<meta (?:property|name)="'+prop+'" content="([^"]*)"'))?.[1];
const title=html=>html.match(/<title>([^<]*)<\/title>/)[1];
test('Invitation links preview the couple, Malay date, time, venue and their chosen card',async()=>{
 const h=await page('/i/'+ids.pro);
 assert.equal(title(h),'Walimatulurus Aisyah &amp; Daniel');assert.equal(meta(h,'og:title'),'Walimatulurus Aisyah &amp; Daniel');
 assert.equal(meta(h,'og:description'),'Ahad, 20 Disember 2026 · 11:00 pagi · Dewan Seri Melati, Shah Alam. Anda dijemput hadir. Sila sahkan kehadiran anda.');
 assert.equal(meta(h,'og:image'),'https://sejenak.space/assets/og-songket.jpg');assert.equal(meta(h,'og:url'),'https://sejenak.space/i/'+ids.pro);
 assert.equal(meta(h,'twitter:card'),'summary_large_image');assert.equal(meta(h,'robots'),'noindex, nofollow');assert.equal((h.match(/<title>/g)||[]).length,1)});
test('Gallery links preview the couple without the venue',async()=>{
 const h=await page('/e/'+ids.basic);assert.equal(title(h),'Galeri Kenangan Basic Pair');assert.equal(meta(h,'og:image'),'https://sejenak.space/assets/og-sejenak.jpg');assert.ok(!meta(h,'og:description').includes('Dewan'))});
test('Locked, expired, missing and malformed links fall back to the generic site preview',async()=>{
 for(const path of ['/i/'+ids.basic,'/i/'+ids.expired,'/e/'+ids.expired,'/i/66666666-6666-4666-8666-666666666666','/i/x','/']){const h=await page(path);assert.equal(meta(h,'og:title'),'Sejenak — E-Kad, RSVP &amp; Galeri Tetamu',path);assert.ok(!h.includes('Old Pair')&&!h.includes('Basic Pair'),path)}
 assert.equal(meta(await page('/'),'robots'),undefined)});
test('Couple names cannot inject markup into the page head',async()=>{
 const h=await page('/i/'+ids.xss);assert.ok(!h.includes('"><script>alert(1)'));assert.ok(h.includes('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;'))});
test('Every template has a small JPEG preview image served with the right type',async()=>{
 for(const t of ['garden','rosewater','ivory','pearl','azure','songket','botanical','minimal','classic','midnight','terracotta','sejenak']){
  const r=await worker.fetch(new Request('https://sejenak.space/assets/og-'+t+'.jpg'),{BUCKET:bucket});assert.equal(r.status,200,t);assert.equal(r.headers.get('content-type'),'image/jpeg');
  const bytes=new Uint8Array(await r.arrayBuffer());assert.ok(bytes[0]===0xff&&bytes[1]===0xd8,t);assert.ok(bytes.length<300*1024,t)}
 assert.equal((await worker.fetch(new Request('https://sejenak.space/assets/ecard-ivory.webp'),{BUCKET:bucket})).headers.get('content-type'),'image/webp')});
