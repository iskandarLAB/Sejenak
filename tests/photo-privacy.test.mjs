import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {api} from '../worker/api.mjs';import {stripMetadata} from '../worker/imagemeta.mjs';
class Bucket{constructor(){this.m=new Map()}async put(k,v,meta){this.m.set(k,{bytes:typeof v==='string'?new TextEncoder().encode(v):new Uint8Array(v),meta})}async get(k){const x=this.m.get(k);return x?{json:async()=>JSON.parse(new TextDecoder().decode(x.bytes)),body:x.bytes,httpMetadata:x.meta?.httpMetadata}:null}async delete(k){this.m.delete(k)}async list({prefix}){return{objects:[...this.m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key,size:this.m.get(key).bytes.byteLength})),truncated:false}}}
const b=new Bucket(),env={BUCKET:b},fixture=n=>new Uint8Array(fs.readFileSync('tests/fixtures/'+n));
const secrets=/SecretPhoneMaker|Model X|3,4\.5N|Location|rumah|owner home/;const text=bytes=>new TextDecoder('latin1').decode(bytes);
async function event(extra={}){const id=crypto.randomUUID();await b.put('events/'+id+'/event.json',JSON.stringify({id,owner:'owner',name:'A & B',date:'2027-02-22',plan:'seindah-kenangan',collecting:true,moderation:false,created:new Date().toISOString(),...extra}));return id}
const req=(path,{method='GET',body,user}={})=>api(new Request('https://sejenak.space'+path,{method,headers:user?{'oai-authenticated-user-id':user}:{},...(body?{body}:{})}),env);
const upload=(id,photo,type,thumb)=>{const f=new FormData();f.set('name','Tetamu');f.set('photo',new Blob([photo],{type}),'p');if(thumb)f.set('thumb',new Blob([thumb],{type:'image/jpeg'}),'t');return req('/api/guest/'+id+'/posts',{method:'POST',body:f})};
// Reads EXIF IFD0 tags from a stored JPEG so the test checks real structure, not just strings.
function exifTags(bytes){for(let i=2;i+4<bytes.length;){const m=bytes[i+1],len=bytes[i+2]<<8|bytes[i+3];if(m===0xda)break;if(m===0xe1&&text(bytes.subarray(i+4,i+10))==='Exif\0\0'){const t=bytes.subarray(i+10),le=t[0]===0x49,r16=j=>le?t[j]|t[j+1]<<8:t[j]<<8|t[j+1],r32=j=>le?(t[j]|t[j+1]<<8|t[j+2]<<16|t[j+3]<<24)>>>0:(t[j]<<24|t[j+1]<<16|t[j+2]<<8|t[j+3])>>>0,o=r32(4),out={};for(let k=0;k<r16(o);k++)out[r16(o+2+k*12)]=r16(o+2+k*12+8);return out}i+=2+len}return {}}
test('Fixture really carries GPS, camera details, XMP and comments',()=>{const raw=fixture('gps-rotated.jpg');assert.ok(secrets.test(text(raw)));assert.ok(0x8825 in exifTags(raw))});
test('Guest JPEG uploads lose GPS and camera metadata but keep orientation',async()=>{
 const id=await event(),r=await upload(id,fixture('gps-rotated.jpg'),'image/jpeg');assert.equal(r.status,201);
 const key=[...b.m.keys()].find(k=>k.startsWith('events/'+id+'/files/')),stored=b.m.get(key).bytes;
 assert.ok(!secrets.test(text(stored)));const tags=exifTags(stored);assert.deepEqual(Object.keys(tags).map(Number),[0x0112]);assert.equal(tags[0x0112],6);
 assert.deepEqual([...stored.subarray(stored.length-2)],[0xff,0xd9]);assert.ok(stored.length<fixture('gps-rotated.jpg').length)});
test('PNG and WebP uploads lose text, EXIF and XMP chunks',async()=>{
 for(const [name,type] of [['meta.png','image/png'],['meta.webp','image/webp']]){const id=await event();assert.equal((await upload(id,fixture(name),type)).status,201);
  const stored=b.m.get([...b.m.keys()].find(k=>k.startsWith('events/'+id+'/files/'))).bytes;assert.ok(!secrets.test(text(stored)),name);assert.ok(!/eXIf|tEXt|iTXt|EXIF|XMP /.test(text(stored)),name)}
 const w=stripMetadata(fixture('meta.webp'),'image/webp');assert.equal(new DataView(w.buffer).getUint32(4,true),w.length-8);assert.equal(w[20]&0x0c,0)});
test('Couple cover and Duit Salam QR images are stripped too',async()=>{
 const id=await event();let f=new FormData();f.set('cover',new Blob([fixture('gps-rotated.jpg')],{type:'image/jpeg'}),'c');assert.equal((await req('/api/events/'+id+'/cover',{method:'POST',body:f,user:'owner'})).status,200);
 f=new FormData();f.set('qr',new Blob([fixture('meta.png')],{type:'image/png'}),'q');assert.equal((await req('/api/events/'+id+'/payment-qr',{method:'POST',body:f,user:'owner'})).status,200);
 for(const k of ['events/'+id+'/cover','events/'+id+'/payment-qr'])assert.ok(!secrets.test(text(b.m.get(k).bytes)),k)});
test('Thumbnails are stored, served for the grid, counted in storage and deleted with the photo',async()=>{
 const id=await event(),thumb=fixture('gps-rotated.jpg').slice();assert.equal((await upload(id,fixture('gps-rotated.jpg'),'image/jpeg',thumb)).status,201);
 const post=(await (await req('/api/guest/'+id)).json()).posts[0];assert.ok(post.thumb);
 const small=await req('/api/media/'+id+'/'+post.id+'?size=thumb'),full=await req('/api/media/'+id+'/'+post.id);
 assert.equal(small.status,200);assert.ok(!secrets.test(text(new Uint8Array(await small.arrayBuffer()))));assert.equal(full.status,200);
 const owner=await (await req('/api/events/'+id,{user:'owner'})).json();assert.equal(owner.usage.storageBytes,b.m.get(post.file).bytes.length+b.m.get(post.thumb).bytes.length);
 assert.equal((await req('/api/events/'+id+'/posts/'+post.id,{method:'DELETE',user:'owner'})).status,200);assert.equal([...b.m.keys()].filter(k=>k.includes('/thumbs/')||k.includes('/files/')).filter(k=>k.includes(id)).length,0)});
test('A broken or oversized thumbnail never blocks the photo itself',async()=>{
 for(const thumb of [new TextEncoder().encode('not an image'),new Uint8Array(600*1024)]){const id=await event();assert.equal((await upload(id,fixture('gps-rotated.jpg'),'image/jpeg',thumb)).status,201);
  const post=(await (await req('/api/guest/'+id)).json()).posts[0];assert.equal(post.thumb,undefined);assert.equal((await req('/api/media/'+id+'/'+post.id+'?size=thumb')).status,200);assert.equal([...b.m.keys()].filter(k=>k.startsWith('events/'+id+'/thumbs/')).length,0)}});
test('Approved photos revalidate cheaply; pending ones are never cached; downloads use the real extension',async()=>{
 const id=await event({moderation:true});await upload(id,fixture('meta.png'),'image/png');const post=(await (await req('/api/events/'+id,{user:'owner'})).json()).posts[0];
 assert.equal((await req('/api/media/'+id+'/'+post.id)).status,403);assert.equal((await req('/api/media/'+id+'/'+post.id,{user:'owner'})).headers.get('cache-control'),'private, no-store');
 await api(new Request('https://sejenak.space/api/events/'+id+'/posts/'+post.id,{method:'PATCH',headers:{'oai-authenticated-user-id':'owner','Content-Type':'application/json'},body:JSON.stringify({approved:true})}),env);
 const r=await req('/api/media/'+id+'/'+post.id+'?download=1');assert.equal(r.headers.get('cache-control'),'private, no-cache');assert.match(r.headers.get('content-disposition'),/\.png"$/)});
test('Corrupt JPEG structure is rejected instead of stored unsanitised',async()=>{
 const raw=fixture('gps-rotated.jpg'),broken=raw.slice(0,40);broken[4]=0xff;broken[5]=0xff;const id=await event();assert.equal((await upload(id,broken,'image/jpeg')).status,400);assert.equal([...b.m.keys()].filter(k=>k.startsWith('events/'+id+'/files/')).length,0)});
