import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const app=fs.readFileSync(new URL('../worker/app.js',import.meta.url),'utf8').replace(/init\(\);\s*$/,''),layout=fs.readFileSync(new URL('../worker/poster-layout.mjs',import.meta.url),'utf8').replaceAll('export ','');
function setup(path='/dashboard-demo'){
 const nodes=new Map(),node=s=>{if(!nodes.has(s))nodes.set(s,{value:'',innerHTML:'',hidden:false,style:{},addEventListener(){},showModal(){},close(){}});return nodes.get(s)};
 const draws=[],text=[],images=[],qrLinks=[],ctx={save(){},restore(){},fillRect(){},drawImage(...args){draws.push(args)},beginPath(){},moveTo(){},arcTo(){},closePath(){},fill(){}},canvas={getContext:()=>ctx,toBlob:cb=>cb(new Blob(['mock png'],{type:'image/png'}))};
 const c=vm.createContext({document:{querySelector:node,createElement:()=>canvas,fonts:{load:async()=>[]}},window:{},location:{pathname:path,origin:'https://test.site'},localStorage:{getItem:()=>null},FormData,crypto,Blob,console,text,images,qrLinks,qrcode:()=>({addData:v=>qrLinks.push(v),make(){},createDataURL:()=> 'data:image/png;base64,qr'})});
 vm.runInContext(layout+'\n'+app,c);vm.runInContext("posterImage=async src=>{images.push(src);return {src,width:1086,height:1448}};posterText=(c,value,y,options)=>text.push({value,y,options,direction:c.direction});event={id:'test-event',plan:'seindah-kenangan',name:'Aina & Amir',date:'2027-03-12',eventTime:'12 tengah hari',venue:'Dewan Bahagia',coverVersion:'gallery-cover',invitation:{template:'ivory',title:'Majlis Kami',hosts:'Keluarga Aina & Amir',message:'Jemput hadir'}}",c);
 return{c,node,canvas,draws,text,images,qrLinks};
}
test('IG poster uses the saved invitation artwork, palette and details, with no unrelated gallery cover',async()=>{
 const{c,canvas,draws,text,images,qrLinks}=setup();await vm.runInContext("buildIGPoster(event,true,'Keluarga Ridzuan')",c);
 assert.equal(canvas.width,1080);assert.equal(canvas.height,1920);assert.equal(images[0],'/assets/ecard-ivory.webp');assert.ok(!images.some(s=>s.includes('/api/cover/')));assert.equal(draws.filter(args=>args[0].src==='/assets/ecard-ivory.webp').length,3);
 for(const value of ['Majlis Kami','Keluarga Aina & Amir','Keluarga Ridzuan','Aina\n&\nAmir','12 tengah hari','Dewan Bahagia'])assert.ok(text.some(t=>t.value===value),value);
 assert.ok(text.every(t=>t.options.color==='#725c32'));assert.ok(text.some(t=>t.direction==='rtl'&&t.value.includes('بِسْمِ')));assert.ok(qrLinks[0].endsWith('/invitation-demo?template=ivory'));
 images.length=0;vm.runInContext("event.invitation.template='pearl'",c);await vm.runInContext("buildIGPoster(event,false,'Ridzuan')",c);assert.equal(images[0],'/assets/ecard-pearl.webp');assert.ok(qrLinks.at(-1).endsWith('/invitation-demo?template=pearl'));const real=setup('/dashboard');await vm.runInContext("buildIGPoster(event,false,'Ridzuan')",real.c);assert.ok(real.qrLinks[0].endsWith('/i/test-event'));
});
test('Gallery styling has a distinct gallery preview and cannot overwrite invitation details',()=>{
 const{c,node}=setup();vm.runInContext("user={name:'Owner'};events=[event];actualGalleryPreview=updateDesignPreview;updateDesignPreview=()=>{};active='settings';personalizeEditor()",c);const html=node('#root').innerHTML;
 assert.ok(html.includes('Reka bentuk Galeri Tetamu.'));assert.ok(html.includes('PREVIEW GALERI TETAMU'));for(const id of ['sname','sdate','stime','svenue','ititle','imessage','itemplate'])assert.ok(!html.includes('id="'+id+'"'),id);
 const draft=vm.runInContext('designDraft()',c);for(const key of ['name','date','venue','eventTime','invitation'])assert.ok(!Object.hasOwn(draft,key));
 for(const[k,v]of Object.entries({sprimaryColor:'#456653',sbackgroundColor:'#f7f8f2',saccentColor:'#ba8d94',sfont:'elegant'}))node('#'+k).value=v;
 vm.runInContext('actualGalleryPreview()',c);assert.ok(node('#designpreview').innerHTML.includes('gallery-preview-photos'));assert.ok(node('#designpreview').innerHTML.includes('UCAPAN CONTOH'));assert.ok(!node('#designpreview').innerHTML.includes('WALIMATULURUS'));
});
test('Owner must save an E-Kad before generating its synchronized poster',async()=>{
 const{c,node}=setup();vm.runInContext("active='invitation';invitationDirty=true",c);await vm.runInContext("openIGPoster(false,'Ridzuan')",c);assert.ok(node('#modal').innerHTML.includes('Simpan E-Kad dahulu.'));vm.runInContext("invitationDirty=false;delete event.invitation.template",c);await vm.runInContext("openIGPoster(false,'Ridzuan')",c);assert.ok(node('#modal').innerHTML.includes('Jana E-Kad dahulu.'));
});
