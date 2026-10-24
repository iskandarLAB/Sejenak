// Seed historical events directly in the in-memory bucket.
// New free events are no longer provisioned by the production API.
export async function seedEvent(bucket,{user='owner',body={}}={}){
 const id=body.requestId||crypto.randomUUID();
 const event={id,owner:user,name:body.name||'A & B',date:body.date||'2027-02-22',venue:body.venue||'',theme:'sage',moderation:!!body.moderation,collecting:true,created:new Date().toISOString(),plan:'trial'};
 await bucket.put('events/'+id+'/event.json',JSON.stringify(event));
 await bucket.put('owners/'+encodeURIComponent(user)+'/'+id+'.json',JSON.stringify({id}));
 return Response.json(event,{status:201});
}
