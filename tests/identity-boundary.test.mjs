import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
import {stripUntrustedIdentity} from '../worker/boundary.mjs';
// Exercise the built Worker entry, because the boundary only protects requests if the runtime applies it first.
assert.equal(spawnSync(process.execPath,['scripts/build.mjs']).status,0);
const worker=(await import(pathToFileURL('dist/server/index.js').href+'?t='+Date.now())).default;
class Bucket{constructor(){this.m=new Map()}async get(k){const x=this.m.get(k);return x?{json:async()=>JSON.parse(x)}:null}async put(k,v){this.m.set(k,typeof v==='string'?v:JSON.stringify(v))}async delete(k){this.m.delete(k)}async list({prefix}){return{objects:[...this.m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key,size:1})),truncated:false}}}
const id='22222222-2222-4222-8222-222222222222',bucket=new Bucket();
await bucket.put('events/'+id+'/event.json',{id,owner:'victim',name:'A & B',date:'2027-01-01',plan:'cerita-kita',collecting:true,created:'2026-01-01T00:00:00Z'});
await bucket.put('owners/victim/'+id+'.json',{id});
const spoof={'oai-authenticated-user-id':'victim','oai-authenticated-user-email':'admin@example.com'};
const call=(path,env,headers=spoof,method='GET',body)=>worker.fetch(new Request('https://sejenak.space'+path,{method,headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),{BUCKET:bucket,SEJENAK_ADMIN_EMAILS:'admin@example.com',...env});
test('Off Sites, forged identity headers cannot read, edit or delete an owner event',async()=>{
 assert.equal((await call('/api/events/'+id,{})).status,401);
 assert.equal((await call('/api/events/'+id,{},spoof,'PATCH',{name:'Hijacked'})).status,401);
 assert.equal((await call('/api/events/'+id,{},spoof,'DELETE')).status,401);
 assert.equal((await bucket.get('events/'+id+'/event.json').then(o=>o.json())).name,'A & B')});
test('Off Sites, forged headers are not a signed-in user',async()=>{assert.deepEqual(await (await call('/api/me',{})).json(),{user:null})});
test('Off Sites, forged admin email cannot open admin, support settings or CHIP admin',async()=>{
 assert.equal((await call('/api/admin/events',{})).status,401);
 assert.equal((await call('/api/admin/support-settings',{},spoof,'POST',{email:'x@evil.test',whatsapp:'',hours:''})).status,401);
 assert.equal(await bucket.get('private/settings/support.json'),null);
 for(const path of ['/api/chip/config','/api/chip/orders'])assert.equal((await call(path,{})).status,401);
 assert.equal((await (await call('/api/chip/availability',{})).json()).canTest,false)});
test('Anything other than the exact opt-in value keeps headers untrusted',async()=>{for(const v of ['1','TRUE','yes',' true',''])assert.equal((await call('/api/events/'+id,{SEJENAK_TRUST_SITES_IDENTITY:v})).status,401)});
test('On Sites, opting in preserves existing owner and admin sign-in',async()=>{
 const env={SEJENAK_TRUST_SITES_IDENTITY:'true'};
 assert.equal((await call('/api/events/'+id,env)).status,200);
 assert.equal((await call('/api/admin/me',env)).status,200);
 assert.equal((await call('/api/events/'+id,env,{'oai-authenticated-user-id':'someone-else'})).status,403)});
test('Boundary helper leaves header-free requests untouched and strips both identity headers',()=>{
 const plain=new Request('https://sejenak.space/');assert.equal(stripUntrustedIdentity(plain,{}),plain);
 const r=stripUntrustedIdentity(new Request('https://sejenak.space/',{headers:{...spoof,'X-Other':'kept'}}),{});
 assert.equal(r.headers.get('oai-authenticated-user-id'),null);assert.equal(r.headers.get('oai-authenticated-user-email'),null);assert.equal(r.headers.get('x-other'),'kept')});
