// Link previews (WhatsApp, Telegram, Facebook, iMessage) read meta tags from the raw HTML and never run app.js,
// so invitation and gallery links get their couple-specific tags injected on the server.
const templates=['garden','rosewater','ivory','pearl','azure','songket','botanical','minimal','classic','midnight','terracotta'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const longDate=d=>{try{return new Date(d+'T12:00:00Z').toLocaleDateString('ms-MY',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})}catch{return d}};
export const siteMeta={title:'Sejenak — E-Kad, RSVP & Galeri Tetamu',description:'E-Kad untuk menjemput, RSVP untuk mengira kehadiran, galeri untuk foto dan ucapan tetamu. Semua dalam satu dashboard.',image:'/assets/og-sejenak.jpg'};
async function eventMeta(url,env,hasFeature){
 const m=/^\/(i|e)\/([a-zA-Z0-9-]{16,50})\/?$/.exec(url.pathname);if(!m||!env.BUCKET)return null;
 let e;try{const o=await env.BUCKET.get('events/'+m[2]+'/event.json');e=o&&await o.json()}catch{return null}
 if(!e||e.storageUntil&&Date.now()>Date.parse(e.storageUntil))return null;
 if(m[1]==='i'){if(!hasFeature(e,'invitation'))return null;const t=templates.includes(e.invitation?.template)?e.invitation.template:'garden';
  return {title:'Walimatulurus '+e.name,description:[longDate(e.date),e.eventTime,e.venue].filter(Boolean).join(' · ')+'. Anda dijemput hadir. Sila sahkan kehadiran anda.',image:'/assets/og-'+t+'.jpg',private:true}}
 return {title:'Galeri Kenangan '+e.name,description:'Kongsi foto dan ucapan anda untuk '+e.name+'. Tak perlu akaun.',image:'/assets/og-sejenak.jpg',private:true}}
export async function withPreview(html,url,env,hasFeature){
 const meta=await eventMeta(url,env,hasFeature)||siteMeta,image=url.origin+meta.image,page=url.origin+url.pathname;
 const tags='<title>'+esc(meta.title)+'</title><meta name="description" content="'+esc(meta.description)+'">'+(meta.private?'<meta name="robots" content="noindex, nofollow">':'')+
  '<meta property="og:type" content="website"><meta property="og:site_name" content="Sejenak"><meta property="og:locale" content="ms_MY"><meta property="og:url" content="'+esc(page)+'"><meta property="og:title" content="'+esc(meta.title)+'"><meta property="og:description" content="'+esc(meta.description)+'">'+
  '<meta property="og:image" content="'+esc(image)+'"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="'+esc(meta.title)+'"><meta name="twitter:card" content="summary_large_image">';
 return html.replace(/<title>[\s\S]*?<\/title>/,()=>tags)}
