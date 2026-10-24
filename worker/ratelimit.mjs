// Per-device throttling for anonymous guest writes (wishes, photos, RSVP, Duit Salam).
// Limits are per event and per client IP, generous enough for families sharing one venue WiFi or mobile CGNAT,
// but far below what a script needs to flood a gallery, inflate RSVP counts or fake gift totals.
// Counts live in R2 under the event (deleted with it) and in isolate memory to catch parallel bursts R2 cannot serialize.
export const guestLimits={wish:{burst:10,day:30},photo:{burst:40,day:150},rsvp:{burst:10,day:30},salam:{burst:5,day:20}};
const BURST_MS=10*60*1000,DAY_MS=24*60*60*1000,memory=new Map();
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,32);
const roll=(w,size,now)=>w&&now-w.start<size?w:{start:now,count:0};
// Returns null when allowed, or seconds to wait. Without Cloudflare's client IP (local tests, unknown hosts) nothing is limited.
export async function guestThrottle(req,bucket,eventId,action,now=Date.now()){
 const ip=req.headers.get('cf-connecting-ip'),limit=guestLimits[action];if(!ip||!limit)return null;
 const client=await hash(eventId+'|'+ip),k='events/'+eventId+'/limits/'+action+'/'+client+'.json';
 if(memory.size>20000)memory.clear();
 // Reserve in memory before awaiting R2 so parallel requests in this isolate see each other; only accepted writes are counted.
 const m=memory.get(k)||{},mem={burst:roll(m.burst,BURST_MS,now),day:roll(m.day,DAY_MS,now)};mem.burst.count++;mem.day.count++;memory.set(k,mem);
 const release=()=>{mem.burst.count--;mem.day.count--};
 let saved={};try{const o=await bucket.get(k);if(o)saved=await o.json()}catch{}
 const burst=roll(saved.burst,BURST_MS,now),day=roll(saved.day,DAY_MS,now);
 burst.count=Math.max(burst.count+1,mem.burst.count);day.count=Math.max(day.count+1,mem.day.count);
 if(burst.count>limit.burst){release();return Math.ceil((burst.start+BURST_MS-now)/1000)}
 if(day.count>limit.day){release();return Math.ceil((day.start+DAY_MS-now)/1000)}
 await bucket.put(k,JSON.stringify({burst,day}),{httpMetadata:{contentType:'application/json'}});
 return null}
