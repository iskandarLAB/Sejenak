// Identity headers are only trustworthy when ChatGPT Sites strips and re-injects them at its edge.
// Every other host must drop them before any handler runs, or anyone can claim any owner/admin identity.
export const identityHeaders=['oai-authenticated-user-id','oai-authenticated-user-email'];
export const trustsSitesIdentity=env=>env?.SEJENAK_TRUST_SITES_IDENTITY==='true';
export function stripUntrustedIdentity(request,env){if(trustsSitesIdentity(env)||!identityHeaders.some(h=>request.headers.has(h)))return request;const h=new Headers(request.headers);for(const name of identityHeaders)h.delete(name);return new Request(request,{headers:h})}
