// Platform administration is separate from wedding-owner permissions.
export async function adminApi(req,env){
 const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 const uid=req.headers.get('oai-authenticated-user-id'),email=(req.headers.get('oai-authenticated-user-email')||'').trim().toLowerCase();
 if(!uid)return reply({error:'Log masuk untuk membuka panel admin.'},401);
 const allowed=(env.SEJENAK_ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!email||!allowed.includes(email))return reply({error:'Akaun ini tidak mempunyai akses admin.'},403);
 const url=new URL(req.url),parts=url.pathname.split('/').filter(Boolean),b=env.BUCKET;
 if(parts[2]==='me'&&req.method==='GET')return reply({email});
 if(parts[2]==='support-settings'&&parts.length===3){
  const key='private/settings/support.json';
  if(req.method==='GET'){const object=await b.get(key);const value=object?await object.json():{};return reply({email:value.email||'',whatsapp:value.whatsapp||'',hours:value.hours||''})}
  if(req.method==='POST'){
   let v;try{v=await req.json()}catch{return reply({error:'Data tidak sah.'},400)}
   if(!v||typeof v.email!=='string'||typeof v.whatsapp!=='string'||typeof v.hours!=='string')return reply({error:'Isi saluran sokongan yang sah.'},400);
   const contactEmail=v.email.trim(),whatsapp=v.whatsapp.replace(/[+ ()-]/g,''),hours=v.hours.trim();
   if(contactEmail&&(!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(contactEmail)||contactEmail.length>254)||whatsapp&&!/^[1-9][0-9]{7,14}$/.test(whatsapp)||hours.length>120)return reply({error:'Semak emel, nombor WhatsApp dengan kod negara dan waktu sokongan (maksimum 120 aksara).'},400);
   if(!contactEmail&&!whatsapp)return reply({error:'Isi sekurang-kurangnya satu saluran sokongan.'},400);
   await b.put(key,JSON.stringify({email:contactEmail,whatsapp,hours,updated:new Date().toISOString(),updatedBy:email}));return reply({ok:true});
  }
  return reply({error:'Kaedah tidak dibenarkan.'},405);
 }
 if(parts[2]!=='events')return reply({error:'Tidak dijumpai.'},404);
 const read=async key=>{const o=await b.get(key);return o?o.json():null};
 const summary=e=>({id:e.id,name:e.name,date:e.date,owner:e.owner,plan:e.plan,collecting:!!e.collecting,moderation:!!e.moderation,revision:e.adminRevision||'',created:e.created,storageUntil:e.storageUntil||null,purgedAt:e.purgedAt||null,storageBonusGB:e.storageBonusGB||0,rsvpOpen:e.invitation?.open!==false,rsvpDeadline:e.invitation?.deadline||''});
 const enrich=async e=>{let objects=[],cursor;do{const page=await b.list({prefix:'events/'+e.id+'/',cursor});objects.push(...page.objects);cursor=page.truncated?page.cursor:undefined}while(cursor);const base=({detik:1,'cerita-kita':5,'seindah-kenangan':15}[e.plan]||160/1024)*1024**3;const photoBytes=objects.filter(o=>o.key.includes('/files/')).reduce((n,o)=>n+(o.size||0),0);const tickets=(await read('support/'+e.id+'.json'))?.tickets||[];return {...summary(e),storage:{photoBytes,totalBytes:objects.reduce((n,o)=>n+(o.size||0),0),limitBytes:base+(e.storageBonusGB||0)*1024**3,photos:objects.filter(o=>o.key.includes('/files/')).length},tickets}};
 if(parts.length===3&&req.method==='GET'){
  const page=await b.list({prefix:'owners/',limit:50,cursor:url.searchParams.get('cursor')||undefined});
  const refs=await Promise.all(page.objects.map(o=>read(o.key)));
  const events=(await Promise.all(refs.filter(Boolean).map(r=>read('events/'+r.id+'/event.json')))).filter(Boolean);
  return reply({events:await Promise.all(events.map(enrich)),cursor:page.truncated?page.cursor:null});
 }
 const id=parts[3];if(!/^[a-zA-Z0-9-]{16,50}$/.test(id||''))return reply({error:'ID majlis tidak sah.'},400);
 const key='events/'+id+'/event.json',e=await read(key);if(!e)return reply({error:'Majlis tidak dijumpai.'},404);
 if(parts[4]==='purge-expired'&&parts.length===5&&req.method==='POST'){
  if(!e.paymentOrderId||e.retentionDays!==40||!Number.isFinite(Date.parse(e.storageUntil))||Date.now()<=Date.parse(e.storageUntil))return reply({error:'Galeri ini belum layak dipadam mengikut polisi 40 hari.'},409);
  let cursor;do{const page=await b.list({prefix:'events/'+id+'/',cursor});for(const o of page.objects)if(o.key!==key)await b.delete(o.key);cursor=page.truncated?page.cursor:undefined}while(cursor);
  e.collecting=false;e.purgedAt=new Date().toISOString();await b.put(key,JSON.stringify(e));return reply({ok:true});
 }
 if(parts[4]==='tickets'&&parts.length===5&&req.method==='POST'){
  let v;try{v=await req.json()}catch{return reply({error:'Data tidak sah.'},400)}
  if(!v||!['new','working','resolved'].includes(v.status)||!['normal','urgent'].includes(v.priority)||typeof v.title!=='string'||!v.title.trim()||v.title.length>160||typeof v.note!=='string'||v.note.trim().length<5||v.note.length>1000)return reply({error:'Isi tajuk, status, keutamaan dan nota (5–1000 aksara).'},400);
  const k='support/'+id+'.json',record=await read(k)||{tickets:[]},existing=v.id&&record.tickets.find(t=>t.id===v.id);
  if(v.id&&!existing)return reply({error:'Tiket tidak dijumpai.'},404);
  if(existing&&v.revision!==existing.revision)return reply({error:'Tiket berubah. Muat semula.'},409);
  if(!existing&&record.tickets.length>=100)return reply({error:'Had 100 tiket setiap majlis.'},400);
  const now=new Date().toISOString(),ticket={id:existing?.id||crypto.randomUUID(),title:v.title.trim(),status:v.status,priority:v.priority,revision:crypto.randomUUID(),created:existing?.created||now,updated:now,notes:[...(existing?.notes||[]),{at:now,actor:email,text:v.note.trim(),status:v.status}].slice(-50)};
  record.tickets=existing?record.tickets.map(t=>t.id===ticket.id?ticket:t):[ticket,...record.tickets];await b.put(k,JSON.stringify(record));return reply({ticket});
 }
 if(parts.length===4&&req.method==='GET'){
  let logs=[],cursor;do{const page=await b.list({prefix:'admin-audit/'+id+'/',cursor});logs.push(...page.objects);cursor=page.truncated?page.cursor:undefined}while(cursor);
  logs.sort((a,b)=>b.key.localeCompare(a.key));const history=await Promise.all(logs.slice(0,20).map(o=>read(o.key)));
  return reply({event:await enrich(e),history:history.filter(Boolean)});
 }
 if(parts.length===4&&req.method==='PATCH'){
  let v;try{v=await req.json()}catch{return reply({error:'Data tidak sah.'},400)}
  if(!v||Array.isArray(v)||Object.keys(v).some(k=>!['plan','collecting','moderation','reason','revision','storageBonusGB','rsvpOpen'].includes(k)))return reply({error:'Medan tidak dibenarkan.'},400);
  if(!['detik','cerita-kita','seindah-kenangan','trial'].includes(v.plan)||typeof v.collecting!=='boolean'||typeof v.moderation!=='boolean')return reply({error:'Pilih pakej dan status yang sah.'},400);
  if(v.plan==='trial'&&e.plan!=='trial')return reply({error:'Pakej percuma baharu telah ditamatkan.'},400);
  if(v.revision!==(e.adminRevision||''))return reply({error:'Rekod berubah. Muat semula sebelum mencuba lagi.'},409);
  const reason=String(v.reason||'').trim();if(reason.length<5||reason.length>300)return reply({error:'Isi sebab perubahan (5–300 aksara).'},400);
  if(v.storageBonusGB!==undefined&&(!Number.isInteger(v.storageBonusGB)||v.storageBonusGB<0||v.storageBonusGB>50))return reply({error:'Tambahan storan mesti 0–50 GB.'},400);
  if(v.rsvpOpen!==undefined&&typeof v.rsvpOpen!=='boolean')return reply({error:'Status RSVP tidak sah.'},400);
  const revision=crypto.randomUUID(),at=new Date().toISOString(),auditKey='admin-audit/'+id+'/'+at+'-'+revision+'.json';
  const before={plan:e.plan,collecting:!!e.collecting,moderation:!!e.moderation,storageBonusGB:e.storageBonusGB||0,invitation:e.invitation||{}},after={plan:v.plan,collecting:v.collecting,moderation:v.moderation,storageBonusGB:v.storageBonusGB??e.storageBonusGB??0,invitation:{...e.invitation,...(v.rsvpOpen!==undefined?{open:v.rsvpOpen,...(v.rsvpOpen?{deadline:''}:{})}:{})}};
  const audit={at,actor:email,reason,before,after,status:'pending'};
  const write=(k,v)=>b.put(k,JSON.stringify(v),{httpMetadata:{contentType:'application/json'}});
  await write(auditKey,audit);await write(key,{...e,...after,adminRevision:revision});await write(auditKey,{...audit,status:'applied'});
  return reply({event:await enrich({...e,...after,adminRevision:revision})});
 }
 return reply({error:'Kaedah tidak dibenarkan.'},405);
}
