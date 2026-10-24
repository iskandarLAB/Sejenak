// Verified CHIP checkout. Test mode never grants production entitlements; live sales require explicit launch configuration.
export async function chipApi(req,env,identityProvider){
 const reply=(v,s=200)=>Response.json(v,{status:s,headers:{'Cache-Control':'no-store'}}),u=new URL(req.url),path=u.pathname;
 const email=(req.headers.get('oai-authenticated-user-email')||'').trim().toLowerCase(),uid=req.headers.get('oai-authenticated-user-id'),callback=path==='/api/chip/callback';
 const isAdmin=!!(identityProvider!=='supabase'&&uid&&email&&(env.SEJENAK_ADMIN_EMAILS||'').split(',').map(v=>v.trim().toLowerCase()).includes(email));
 const mode=env.CHIP_MODE==='live'?'live':'test',retentionDays=Number(env.SEJENAK_RETENTION_DAYS),salesEnabled=mode==='live'&&env.CHIP_SALES_ENABLED==='true'&&(retentionDays===40);
 const customerRoute=path==='/api/chip/checkout'||/^\/api\/chip\/orders\/[a-f0-9-]{36}(?:\/verify)?$/.test(path);
 if(path==='/api/chip/availability'&&req.method==='GET'){const ready=!!await env.BUCKET.get('private/chip/config-live.json');return reply({mode,canTest:isAdmin&&mode==='test',live:salesEnabled&&ready,retentionDays:retentionDays===40?retentionDays:null})}
 if(!callback&&!isAdmin&&!(customerRoute&&uid))return reply({error:uid?'Akses admin diperlukan.':'Sila log masuk untuk meneruskan checkout.'},uid?403:401);
 const b=env.BUCKET,read=async k=>{const o=await b.get(k);return o?o.json():null},put=(k,v)=>b.put(k,JSON.stringify(v)),fail=(message,status=400)=>{throw {message,status}};
 const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)),encode=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
 async function key(){if(!env.CHIP_CONFIG_KEY)fail('Penyimpanan secret belum tersedia.',503);return crypto.subtle.importKey('raw',decode(env.CHIP_CONFIG_KEY),'AES-GCM',false,['encrypt','decrypt'])}
 async function config(requestedMode=mode){const c=await read('private/chip/config-'+requestedMode+'.json')||(requestedMode==='test'?await read('private/chip/config.json'):null);if(!c)fail('Konfigurasi pembayaran belum tersedia.',503);const value=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(c.iv)},await key(),decode(c.data))));return {...value,secret:value.secret.trim().replace(/^Bearer\s+/i,''),brandId:value.brandId.trim()}}
 async function activate(o){
 if(o.mode!=='live'||!o.wedding)return null;
 const fulfilledKey='private/chip/fulfilled/'+o.id+'.json',done=await read(fulfilledKey);if(done)return done.eventId;
 const eventKey='events/'+o.id+'/event.json',expiry=new Date(o.wedding.date+'T23:59:59.999+08:00');expiry.setUTCDate(expiry.getUTCDate()+o.retentionDays);
 const event={id:o.id,owner:o.owner,name:o.wedding.name,date:o.wedding.date,venue:o.wedding.venue,theme:'sage',plan:o.plan,moderation:true,collecting:true,created:new Date().toISOString(),paymentOrderId:o.id,paidAmountSen:o.amount,storageUntil:expiry.toISOString(),retentionDays:o.retentionDays};
 await b.put(eventKey,JSON.stringify(event),{onlyIf:{etagDoesNotMatch:'*'}});
 const existing=await read(eventKey);if(!existing||existing.owner!==o.owner||existing.paymentOrderId!==o.id)fail('Bayaran diterima tetapi pengaktifan memerlukan semakan admin.',409);
 await put('owners/'+encodeURIComponent(o.owner)+'/'+o.id+'.json',{id:o.id});
 await put(fulfilledKey,{eventId:o.id,activatedAt:new Date().toISOString()});return o.id;
 }

 async function call(c,p,body){
 let r;try{r=await fetch('https://gate.chip-in.asia/api/v1/'+p,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+c.secret,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000),redirect:'manual'})}
 catch{console.error(JSON.stringify({component:'chip',code:'connection_failed'}));throw {message:'Sambungan ke CHIP gagal atau melebihi masa. Semak rekod di portal CHIP sebelum cuba semula.',status:502,code:'connection_failed'}}
 if(r.status>=300&&r.status<400){console.error(JSON.stringify({component:'chip',code:'unexpected_redirect'}));throw {message:'CHIP memberikan redirect yang tidak dijangka. Permintaan dihentikan untuk melindungi API secret.',status:502,code:'unexpected_redirect'}}
 if(!r.ok){
 // Log only allowlisted field names and HTTP status, never provider text, secrets or customer values.
 let payload;try{payload=await r.json()}catch{}
 const allowed=['__all__','brand_id','client','email','purchase','products','currency','price','reference','success_redirect','failure_redirect','cancel_redirect','success_callback'];
 const fields=[];
 function collect(value,path=[]){if(!value||typeof value!=='object'||path.length>5)return;for(const [name,child] of Object.entries(value)){if(!allowed.includes(name))continue;const next=[...path,name];if(!fields.includes(next.join('.')))fields.push(next.join('.'));collect(child,next)}}
 collect(payload);

 const status=r.status,code='chip_http_'+status;
 console.error(JSON.stringify({component:'chip',operation:p.split('?')[0],code,fields}));
 const reason=status===401?'API secret ditolak oleh CHIP. Salin semula test API secret daripada CHIP Collect → Developers.':status===403?'CHIP menolak akses. Semak kebenaran API key dan pastikan Brand ID daripada akaun merchant yang sama.':status===400||status===422?'CHIP menolak data checkout'+(fields.length?' ('+fields.join(', ')+')':'')+'. Semak Brand ID dan konfigurasi merchant.':status===429?'Terlalu banyak permintaan. Tunggu sebentar sebelum cuba lagi.':'Perkhidmatan CHIP belum dapat memproses permintaan.';
 throw {message:reason+' [CHIP HTTP '+status+']',status:502,code,fields,providerStatus:status};
 }
 try{return await r.json()}catch{throw {message:'Respons CHIP tidak dapat dibaca. Semak portal CHIP sebelum cuba lagi.',status:502,code:'invalid_response'}}
 }

 try{
 if(!['test','live'].includes(env.CHIP_MODE))fail('Pembayaran belum tersedia.',503);
 async function checkConfig(c){
 const result=await call(c,'payment_methods/?'+new URLSearchParams({brand_id:c.brandId,currency:'MYR'}));
 if(!Array.isArray(result?.available_payment_methods))fail('Respons kaedah bayaran CHIP tidak sah.',502);
 if(!result.available_payment_methods.length){console.error(JSON.stringify({component:'chip',code:'no_payment_methods'}));throw {message:'CHIP menerima sambungan tetapi tiada kaedah bayaran MYR tersedia untuk Brand ID ini. Semak tetapan CHIP Collect atau hubungi sokongan CHIP.',status:409,code:'no_payment_methods'}}
 return {ok:true,message:'API key, Brand ID dan kaedah bayaran MYR berjaya disemak. Mod '+mode+' disahkan sekali lagi sebelum pautan checkout dibuka.'};
 }
 if(path==='/api/chip/check'&&req.method==='POST')return reply(await checkConfig(await config()));
 if(path==='/api/chip/config'&&req.method==='GET')return reply({configured:!!await read('private/chip/config-'+mode+'.json')||(mode==='test'&&!!await read('private/chip/config.json')),mode,salesEnabled});
 if(path==='/api/chip/config'&&req.method==='POST'){
 const v=await req.json(),secret=typeof v.secret==='string'?v.secret.trim().replace(/^Bearer\s+/i,''):'',brandId=typeof v.brandId==='string'?v.brandId.trim():'';
 if(secret.length<10||secret.length>1000||/\s/.test(secret)||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(brandId))fail('Isi test API secret dan Brand ID UUID daripada CHIP Collect → Developers.');
 const candidate={secret,brandId};const checked=await checkConfig(candidate);
 const iv=crypto.getRandomValues(new Uint8Array(12));await put('private/chip/config-'+mode+'.json',{iv:encode(iv),data:encode(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(),new TextEncoder().encode(JSON.stringify(candidate))))});return reply(checked);
 }
 if(path==='/api/chip/orders'&&req.method==='GET'){const r=await b.list({prefix:'private/chip/orders/',limit:50,cursor:u.searchParams.get('cursor')||undefined});return reply({orders:await Promise.all(r.objects.map(async x=>{const o=await read(x.key);return {...o,status:await read('private/chip/paid/'+o.id+'.json')?(o.mode==='test'?'test_paid':'paid'):(await read('private/chip/status/'+o.id+'.json'))?.status||o.status}})),cursor:r.truncated?r.cursor:null})}
 if(path==='/api/chip/checkout'&&req.method==='POST'){
 if(mode==='test'&&!isAdmin)fail('Checkout ujian dikhaskan untuk admin.',403);if(mode==='live'&&!salesEnabled)fail('Jualan belum dibuka.',503);
 const v=await req.json(),prices={detik:7900,'cerita-kita':14900,'seindah-kenangan':24900};if(!Object.hasOwn(prices,v.plan))fail('Pakej tidak sah.');
 let wedding=null;if(mode==='live'&&v.flow!=='checkout')fail('Gunakan halaman checkout untuk membeli pakej.');if(mode==='live'&&v.acceptTerms!==true)fail('Sila setujui tempoh simpanan sebelum meneruskan.');
 if(v.flow==='checkout'){
 const d=v.wedding;if(!d||typeof d.name!=='string'||!d.name.trim()||d.name.length>80||typeof d.venue!=='string'||d.venue.length>120||!/^\d{4}-\d{2}-\d{2}$/.test(d.date||'')||!Number.isFinite(Date.parse(d.date+'T12:00:00Z'))||new Date(d.date+'T12:00:00Z').toISOString().slice(0,10)!==d.date)fail('Lengkapkan nama pasangan dan tarikh majlis yang sah.');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.requestId||''))fail('Sesi checkout tidak sah. Muat semula halaman.');
 if(mode==='live'&&d.date<new Date(Date.now()+8*60*60*1000).toISOString().slice(0,10))fail('Tarikh majlis mestilah hari ini atau akan datang.');
 wedding={name:d.name.trim(),date:d.date,venue:d.venue.trim()};
 }
 const c=await config(),id=wedding?v.requestId.toLowerCase():crypto.randomUUID(),k='private/chip/orders/'+id+'.json',o={id,plan:v.plan,amount:prices[v.plan],currency:'MYR',owner:uid,created:new Date().toISOString(),status:'creating',brandId:c.brandId,mode,retentionDays:retentionDays===40?retentionDays:null,...(wedding?{wedding}:{})};
 const existing=await read(k);if(existing){if(existing.owner!==uid||existing.mode!==mode||existing.plan!==v.plan||JSON.stringify(existing.wedding)!==JSON.stringify(wedding))fail('Pesanan ini tidak sepadan dengan sesi checkout.',409);if(existing.checkoutUrl)return reply({id,checkoutUrl:existing.checkoutUrl});fail('Pesanan sedang diproses atau belum dapat disahkan. Semak status pesanan sebelum mencuba lagi.',409)}
 if(!await b.put(k,JSON.stringify(o),{onlyIf:{etagDoesNotMatch:'*'}}))fail('Pesanan sedang diproses. Semak status pesanan.',409);
 const returnUrl=u.origin+(wedding?'/checkout/status?order=':'/admin?chip_order=')+id;

 let p;try{p=await call(c,'purchases/',{brand_id:c.brandId,reference:id,client:{email},purchase:{currency:'MYR',products:[{name:'Sejenak '+(mode==='test'?'TEST ':'')+({detik:'Basic','cerita-kita':'Pro','seindah-kenangan':'Max'}[v.plan]),price:o.amount,quantity:'1'}]},success_redirect:returnUrl,failure_redirect:returnUrl,cancel_redirect:returnUrl,success_callback:u.origin+'/api/chip/callback?order='+id})}catch(e){await put(k,{...o,status:e.providerStatus&&e.providerStatus<500?'creation_rejected':'creation_unknown',errorCode:e.code||'unknown',errorMessage:e.status?e.message:'Semakan diperlukan.'});throw e}
 if(p.is_test!==(mode==='test')){await put(k,{...o,status:'blocked_key_mode',purchaseId:p.id});fail('Mod API key tidak sepadan dengan mod '+mode+'. Checkout disekat.',409)}
 const checkout=new URL(p.checkout_url);if(checkout.protocol!=='https:'||checkout.hostname!=='gate.chip-in.asia')fail('Domain checkout tidak dibenarkan.',502);
 await put(k,{...o,status:'pending',purchaseId:p.id,checkoutUrl:checkout.href});return reply({id,checkoutUrl:checkout.href})}
 const orderPath=path.match(/^\/api\/chip\/orders\/([a-f0-9-]{36})$/);
 if(orderPath&&req.method==='GET'){const o=await read('private/chip/orders/'+orderPath[1]+'.json');if(!o||o.owner!==uid)fail('Pesanan tidak dijumpai.',404);const paid=await read('private/chip/paid/'+o.id+'.json'),last=await read('private/chip/status/'+o.id+'.json');return reply({id:o.id,plan:o.plan,amount:o.amount,wedding:o.wedding||null,status:paid?(o.mode==='test'?'test_paid':'paid'):last?.status||o.status,mode:o.mode,retentionDays:o.retentionDays,eventId:(await read('private/chip/fulfilled/'+o.id+'.json'))?.eventId||null,hasPurchase:!!o.purchaseId,checkoutUrl:o.checkoutUrl||null,created:o.created})}
 const match=path.match(/^\/api\/chip\/orders\/([a-f0-9-]{36})\/verify$/);
 if(req.method==='POST'&&(callback||match)){const id=callback?u.searchParams.get('order'):match[1];if(!/^[a-f0-9-]{36}$/.test(id||''))fail('ID tidak sah.');const o=await read('private/chip/orders/'+id+'.json');if(!o?.purchaseId)fail('Transaksi belum tersedia.',404);if(!callback&&!isAdmin&&o.owner!==uid)fail('Pesanan tidak dijumpai.',404);if(!callback&&!isAdmin&&o.mode==='test')fail('Checkout ujian dikhaskan untuk admin.',403);const c=await config(o.mode),p=await call(c,'purchases/'+encodeURIComponent(o.purchaseId)+'/');
 // Callback content is untrusted; authenticated lookup is the sole authority.
 if(p.id!==o.purchaseId||p.brand_id!==o.brandId||p.reference!==id||p.is_test!==(o.mode==='test')||p.purchase?.currency!=='MYR'||p.purchase?.total!==o.amount)fail('Butiran bayaran tidak sepadan. Tiada pakej diaktifkan.',409);
 await put('private/chip/status/'+id+'.json',{status:String(p.status||'pending').slice(0,40),checkedAt:new Date().toISOString()});
 if(p.status==='paid')await put('private/chip/paid/'+id+'.json',{verifiedAt:new Date().toISOString()});const paid=await read('private/chip/paid/'+id+'.json'),eventId=paid?await activate(o):null;return reply({id,status:paid?(o.mode==='test'?'test_paid':'paid'):String(p.status||'pending').slice(0,40),activated:!!eventId,eventId,mode:o.mode})}
 return reply({error:'Tidak dijumpai.'},404);
 }catch(e){return reply({error:e.status?e.message:'Permintaan CHIP tidak dapat diproses.',...(e.code?{code:e.code}:{})},e.status||500)}
}
