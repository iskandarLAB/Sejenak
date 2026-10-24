import {createServerClient} from '@supabase/ssr';

const authCookie='__Host-sejenak-auth', nextCookie='__Host-sejenak-next';
const authHeaders={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export function safeAuthReturn(value){try{if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\r\n]/.test(value))return '/dashboard';const u=new URL(value,'https://sejenak.space');return ['/dashboard','/checkout','/checkout/status'].includes(u.pathname)?u.pathname+u.search+u.hash:'/dashboard'}catch{return '/dashboard'}}
function authCookies(req){return (req.headers.get('cookie')||'').split(';').map(s=>{const i=s.indexOf('=');if(i<0)return null;try{return {name:s.slice(0,i).trim(),value:decodeURIComponent(s.slice(i+1).trim())}}catch{return null}}).filter(x=>x&&(x.name.startsWith(authCookie)||x.name===nextCookie))}
function cookieLine(name,value,options={}){return name+'='+encodeURIComponent(value)+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age='+(options.maxAge===0?0:options.maxAge||604800)}
function socialUser(user){return !!(user?.id&&/^[a-f0-9-]{36}$/i.test(user.id)&&[...(user.app_metadata?.providers||[]),user.app_metadata?.provider].some(p=>['google','apple'].includes(p)))}
function authRedirect(path){return new Response(null,{status:303,headers:{...authHeaders,Location:path}})}
function authJson(value,status=200){return Response.json(value,{status,headers:authHeaders})}
function authConfig(env){try{const url=new URL(env.SUPABASE_URL);if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.pathname!=='/'||url.username||url.password||!env.SUPABASE_PUBLISHABLE_KEY)return null;return {url:url.origin,key:env.SUPABASE_PUBLISHABLE_KEY,origin:'https://sejenak.space'}}catch{return null}}
async function authProviders(c){const r=await fetch(c.url+'/auth/v1/settings',{headers:{apikey:c.key},signal:AbortSignal.timeout(10000),redirect:'manual'});if(!r.ok)throw Error('Auth settings unavailable');const d=await r.json();return {google:d.external?.google===true,apple:d.external?.apple===true}}
export async function authHandle(req,env,next,clientFactory=createServerClient){
 const u=new URL(req.url),path=u.pathname,c=authConfig(env);
 if((path==='/login'||path.startsWith('/auth/'))&&u.origin!=='https://sejenak.space')return authRedirect('https://sejenak.space/login?return_to='+encodeURIComponent(safeAuthReturn(u.searchParams.get('return_to'))));
 if(path==='/api/auth/options'){try{return authJson(c?{...await authProviders(c),configured:true}:{google:false,apple:false,configured:false})}catch{return authJson({google:false,apple:false,configured:false},503)}}
 if(path==='/login'||path==='/auth/logout'&&req.method==='GET')return null;
 // Native admin identity and CHIP callbacks remain under the existing Sites boundary.
 if(path.startsWith('/api/admin/')||path==='/api/chip/callback'||['/api/chip/config','/api/chip/check','/api/chip/orders'].includes(path))return next(null);
 const cookies=authCookies(req),pending=new Map();
 const finish=response=>{if(!pending.size)return response;const h=new Headers(response.headers);for(const [name,item] of pending)h.append('Set-Cookie',cookieLine(name,item.value,item.options));return new Response(response.body,{status:response.status,headers:h})};
 const setCookie=(name,value,options)=>pending.set(name,{value,options});
 if(!c)return path.startsWith('/auth/')?authRedirect('/login?error=unavailable'):next(null);
 const client=clientFactory(c.url,c.key,{cookieOptions:{name:authCookie,path:'/',secure:true,httpOnly:true,sameSite:'lax',maxAge:604800},cookies:{getAll:()=>cookies,setAll:items=>{for(const item of items){setCookie(item.name,item.value,item.name.includes('code-verifier')?{...item.options,maxAge:item.options?.maxAge===0?0:600}:item.options);const old=cookies.find(x=>x.name===item.name);if(old)old.value=item.value;else cookies.push({name:item.name,value:item.value})}}},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(12000),redirect:'manual'})}});
 try{
  if(path==='/auth/start'){
   if(req.method!=='POST'||req.headers.get('origin')!==u.origin)return authJson({error:'Permintaan login tidak dibenarkan.'},403);
   const body=await req.text();if(body.length>2048)return authJson({error:'Permintaan terlalu besar.'},413);const fields=new URLSearchParams(body),provider=fields.get('provider');
   if(!['google','apple'].includes(provider))return authRedirect('/login?error=provider');const enabled=await authProviders(c);if(!enabled[provider])return authRedirect('/login?error=provider');
   const returnTo=safeAuthReturn(fields.get('return_to'));setCookie(nextCookie,returnTo,{maxAge:600});
   const {data,error}=await client.auth.signInWithOAuth({provider,options:{redirectTo:c.origin+'/auth/return',skipBrowserRedirect:true,...(provider==='google'?{queryParams:{prompt:'select_account'}}:{})}});
   if(error||!data.url)return finish(authRedirect('/login?error=unavailable'));const dest=new URL(data.url);if(dest.origin!==c.url||dest.pathname!=='/auth/v1/authorize')return finish(authRedirect('/login?error=unavailable'));
   return finish(authRedirect(dest.href));
  }
  if(path==='/auth/return'){
   if(req.method!=='GET')return authJson({error:'Kaedah tidak dibenarkan.'},405);
   const code=u.searchParams.get('code'),returnTo=safeAuthReturn(cookies.find(x=>x.name===nextCookie)?.value);setCookie(nextCookie,'',{maxAge:0});
   if(u.searchParams.has('error')||!code||code.length>4096)return finish(authRedirect('/login?error=cancelled'));
   if(!cookies.some(x=>x.name.includes('code-verifier')&&x.value))return finish(authRedirect('/login?error=expired'));
   const {error}=await client.auth.exchangeCodeForSession(code);if(error)return finish(authRedirect('/login?error=expired'));
   const {data,error:verifyError}=await client.auth.getUser();if(verifyError||!socialUser(data.user))return finish(authRedirect('/login?error=expired'));
   return finish(authRedirect(returnTo));
  }
  if(path==='/auth/logout'){
   if(req.method!=='POST'||req.headers.get('origin')!==u.origin)return authJson({error:'Permintaan tidak dibenarkan.'},403);
   await client.auth.signOut({scope:'local'});for(const cookie of cookies)setCookie(cookie.name,'',{maxAge:0});return finish(authRedirect('/signout-with-chatgpt?return_to=%2Flogin%3Flogged_out%3D1'));
  }
  if(path.startsWith('/auth/'))return authJson({error:'Tidak dijumpai.'},404);
  if(!cookies.some(x=>x.name.startsWith(authCookie)&&!x.name.includes('code-verifier')&&x.value))return next(null);
  const {data,error}=await client.auth.getUser();
  if(error||!socialUser(data.user)){if(error?.status>=500||error?.name==='AuthRetryableFetchError')return finish(authJson({error:'Sambungan login terganggu. Cuba semula sebentar lagi.'},503));return finish(await next({provider:'supabase',id:null,email:''}))}
  // Never use metadata or unverified cookie contents as identity or admin authorization.
  const verified=data.user;return finish(await next({provider:'supabase',id:'supabase:'+verified.id,email:verified.email_confirmed_at?verified.email||'':''}));
 }catch{return finish(path.startsWith('/auth/')?authRedirect('/login?error=unavailable'):authJson({error:'Sambungan login terganggu. Cuba semula sebentar lagi.'},503))}
}
