import test from 'node:test';import assert from 'node:assert/strict';import {api} from '../worker/api.mjs';import {guestThrottle,guestLimits} from '../worker/ratelimit.mjs';
class Bucket{constructor(){this.m=new Map()}async get(k){const x=this.m.get(k);return x?{json:async()=>JSON.parse(new TextDecoder().decode(x))}:null}async put(k,v){this.m.set(k,typeof v==='string'?new TextEncoder().encode(v):new Uint8Array(v))}async delete(k){this.m.delete(k)}async list({prefix}){return{objects:[...this.m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key,size:this.m.get(key).byteLength})),truncated:false}}}
const b=new Bucket(),env={BUCKET:b};let n=0;
const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6IYQAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
async function event(plan='seindah-kenangan'){const id=crypto.randomUUID();await b.put('events/'+id+'/event.json',JSON.stringify({id,owner:'owner',name:'A & B',date:'2027-02-22',plan,collecting:true,moderation:false,paymentQrVersion:'v1',created:new Date().toISOString()}));await b.put('owners/owner/'+id+'.json',JSON.stringify({id}));return id}
const send=(path,body,ip,user)=>api(new Request('https://sejenak.space'+path,{method:'POST',headers:{...(ip?{'CF-Connecting-IP':ip}:{}),...(user?{'oai-authenticated-user-id':user}:{}),...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:JSON.stringify(body)}),env);
const flood=async(count,make)=>{const codes={};const rs=await Promise.all(Array.from({length:count},(_,i)=>make(i)));for(const r of rs)codes[r.status]=(codes[r.status]||0)+1;return {codes,rs}};
const wish=(id,ip,extra={})=>send('/api/guest/'+id+'/posts',{name:'Bot',text:'spam '+n++,...extra},ip);
test('A parallel wish flood from one device stops at the burst limit and real guests still get through',async()=>{
 const id=await event(),{codes,rs}=await flood(520,()=>wish(id,'203.0.113.9'));
 assert.equal(codes[201],guestLimits.wish.burst);assert.equal(codes[429],520-guestLimits.wish.burst);
 const blocked=rs.find(r=>r.status===429);assert.ok(+blocked.headers.get('Retry-After')>0);assert.match((await blocked.json()).error,/Terlalu banyak penghantaran/);
 assert.equal((await wish(id,'198.51.100.7',{name:'Mak Cik',text:'Tahniah!'})).status,201)});
test('RSVP bots cannot inflate attendance beyond the per-device limit',async()=>{
 const id=await event(),{codes}=await flood(300,()=>send('/api/rsvp/'+id,{token:crypto.randomUUID(),status:'yes',name:'Bot',adults:10,children:10},'203.0.113.10'));
 assert.equal(codes[201],guestLimits.rsvp.burst);assert.equal([...b.m.keys()].filter(k=>k.startsWith('events/'+id+'/rsvps/')).length,guestLimits.rsvp.burst)});
test('Fake Duit Salam declarations are capped per device',async()=>{
 const id=await event();await b.put('events/'+id+'/payment-qr',png);
 const {codes}=await flood(300,()=>send('/api/salam/'+id,{name:'Bot',amountSen:100000000,requestId:crypto.randomUUID()},'203.0.113.11'));
 assert.equal(codes[201],guestLimits.salam.burst);assert.equal([...b.m.keys()].filter(k=>k.startsWith('events/'+id+'/gifts/')).length,guestLimits.salam.burst)});
test('Photo uploads allow a busy guest but stop a script',async()=>{
 const id=await event(),{codes}=await flood(60,()=>{const f=new FormData();f.set('photo',new Blob([png],{type:'image/png'}),'a.png');f.set('name','Tetamu');return send('/api/guest/'+id+'/posts',f,'203.0.113.12')});
 assert.equal(codes[201],guestLimits.photo.burst);assert.equal(codes[429],60-guestLimits.photo.burst)});
test('Retrying the same submission is not counted as a new one',async()=>{
 const id=await event(),submissionId=crypto.randomUUID();
 for(let i=0;i<guestLimits.wish.burst+5;i++)assert.equal((await wish(id,'203.0.113.13',{submissionId})).status,i?200:201)});
test('Validation failures do not use up a guest allowance',async()=>{
 const id=await event();for(let i=0;i<guestLimits.rsvp.burst+5;i++)assert.equal((await send('/api/rsvp/'+id,{token:'bad',status:'yes',name:'x'},'203.0.113.14')).status,400);
 assert.equal((await send('/api/rsvp/'+id,{token:crypto.randomUUID(),status:'no',name:'Real'},'203.0.113.14')).status,201)});
test('Burst window resets after ten minutes while the daily ceiling still holds',async()=>{
 const id=crypto.randomUUID(),req=new Request('https://sejenak.space/',{headers:{'CF-Connecting-IP':'203.0.113.15'}}),t0=Date.parse('2027-01-01T00:00:00Z');let allowed=0;
 for(let w=0;w<6;w++)for(let i=0;i<guestLimits.wish.burst+2;i++)if(!await guestThrottle(req,b,id,'wish',t0+w*11*60*1000+i))allowed++;
 assert.equal(allowed,guestLimits.wish.day)});
test('Limit records hash the IP and are removed with the event',async()=>{
 const id=await event();await wish(id,'203.0.113.16');const keys=[...b.m.keys()].filter(k=>k.startsWith('events/'+id+'/limits/'));
 assert.equal(keys.length,1);assert.ok(!keys[0].includes('203.0.113.16'));assert.ok(!new TextDecoder().decode(b.m.get(keys[0])).includes('203.0.113'));
 assert.equal((await api(new Request('https://sejenak.space/api/events/'+id,{method:'DELETE',headers:{'oai-authenticated-user-id':'owner'}}),env)).status,200);
 assert.equal([...b.m.keys()].filter(k=>k.startsWith('events/'+id+'/')).length,0)});
