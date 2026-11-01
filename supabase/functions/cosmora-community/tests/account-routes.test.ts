import assert from 'node:assert/strict';
import test from 'node:test';
import { handleRequest } from '../src/index.ts';
const base = 'https://example.invalid/cosmora-community';
const env = { SUPABASE_URL: 'https://pwdpwgonvnuwmgfiidut.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-server-key' };
const owner = '10000000-0000-4000-8000-000000000001';
const request = (path: string, method='GET', body?: string) => new Request(base+path, {method, headers:{Authorization:'Bearer synthetic-user', 'Content-Type':'application/json'}, ...(body ? {body} : {})});

test('availability reveals only a boolean and treats wildcards literally', async () => {
 const saved=globalThis.fetch;
 try {
  globalThis.fetch=async input=>{const url=new URL(String(input));assert.equal(url.searchParams.get('display_name'),'ilike.Andre\\_100\\%');return Response.json([{id:'private-owner-id'}]);};
  const r=await handleRequest(new Request(base+'/api/account/name-availability?name=Andre_100%25'),env);
  assert.equal(r.status,200);assert.deepEqual(await r.json(),{available:false});
  assert.equal(r.headers.get('Cache-Control'),'private, no-store');
 } finally {globalThis.fetch=saved;}
});

test('account update uses verified owner and maps a concurrent unique conflict to 409', async () => {
 const saved=globalThis.fetch;let writes=0;
 try {
  globalThis.fetch=async (input,init)=>{
   const url=String(input);
   if(url.endsWith('/auth/v1/user'))return Response.json({id:owner,app_metadata:{},identities:[]});
   if(url.includes('user_moderation'))return Response.json(null);
   if(init?.method==='POST') {writes++;const data=JSON.parse(String(init.body));assert.equal(data.id,owner);assert.equal(data.display_name,'Andre');return Response.json({code:'23505',message:'duplicate key violates profiles_public_name_unique'},{status:409});}
   assert.match(url,/id=neq/);return Response.json([]);
  };
  const r=await handleRequest(request('/api/account','PUT',JSON.stringify({id:'attacker-supplied-owner',displayName:'  Andre  ',country:'IT'})),env);
  assert.equal(r.status,409);assert.equal((await r.json() as {code:string}).code,'PUBLIC_NAME_TAKEN');assert.equal(writes,1);
 }finally{globalThis.fetch=saved;}
});

test('account status remains readable during deletion but modifications fail closed',async()=>{
 const saved=globalThis.fetch;
 try{
  globalThis.fetch=async input=>{
   const url=String(input);if(url.endsWith('/auth/v1/user'))return Response.json({id:owner,email:'owner@example.invalid',app_metadata:{deletion_pending:true},identities:[]});
   if(url.includes('user_moderation'))return Response.json({suspended:false});
   if(url.includes('profiles'))return Response.json({display_name:'My public name',country:'IT'});
   throw new Error('Unexpected request');
  };
  const r=await handleRequest(request('/api/account'),env);assert.equal(r.status,200);assert.equal((await r.json() as {deletionPending:boolean}).deletionPending,true);
  assert.equal((await handleRequest(request('/api/account','PUT','{"displayName":"Andre","country":"IT"}'),env)).status,401);
 }finally{globalThis.fetch=saved;}
});

test('new writes require authentication and unsupported methods remain isolated',async()=>{
 for(const [path,method]of [['/api/account','PUT'],['/api/seller/profile','POST'],['/api/community/posts','POST']]){
  const r=await handleRequest(new Request(base+path,{method,headers:{'Content-Type':method==='POST'&&path.includes('posts')?'multipart/form-data; boundary=abc':'application/json'},body:'{}'}),env);
  assert.equal(r.status,401,path);
 }
 for(const [path,method] of [['/api/account','DELETE'],['/api/account/name-availability','POST'],['/api/seller/profile','DELETE']])assert.equal((await handleRequest(request(path,method),env)).status,405);
});

test('shop public rename uses the verified owner and one atomic operation', async () => {
 const saved=globalThis.fetch; const writes: Array<{url:string;body:any}>=[];
 const data={sellerType:'shop',displayName:'  Studio Cosplay  ',updatePublicName:true,country:'IT',email:'shop@example.invalid',businessType:'individual',legalName:'Official Business',vatNumber:'IT123',registeredAddress:'Address',legalRepresentative:'Owner',shippingPolicy:'Shipping',returnsPolicy:'Returns'};
 try {
  globalThis.fetch=async(input,init)=>{
   const url=new URL(String(input));
   if(url.pathname.endsWith('/auth/v1/user'))return Response.json({id:owner,app_metadata:{},identities:[]});
   if(url.pathname.endsWith('/user_moderation'))return Response.json(null);
   if(url.pathname.endsWith('/profiles'))return Response.json(url.searchParams.has('display_name')?[]:{display_name:'Old Name'});
   if(url.pathname.endsWith('/rpc/cosmora_save_shop_public_name')){writes.push({url:url.pathname,body:JSON.parse(String(init?.body))});return new Response(null,{status:204});}
   throw new Error('Unexpected request '+url.pathname);
  };
  const r=await handleRequest(request('/api/seller/profile','POST',JSON.stringify({...data,userId:'attacker'})),env);
  assert.equal(r.status,200);assert.equal((await r.json() as any).displayName,'Studio Cosplay');assert.equal(writes.length,1);
  assert.equal(writes[0].body.p_user_id,owner);assert.equal(writes[0].body.p_public_name,'Studio Cosplay');
  assert.equal(writes[0].body.p_details.legalName,'Official Business');
 } finally {globalThis.fetch=saved;}
});

test('a conflict during atomic shop rename reports name taken', async () => {
 const saved=globalThis.fetch;
 try {
  globalThis.fetch=async(input)=>{
   const url=new URL(String(input));
   if(url.pathname.endsWith('/auth/v1/user'))return Response.json({id:owner,app_metadata:{},identities:[]});
   if(url.pathname.endsWith('/user_moderation'))return Response.json(null);
   if(url.pathname.endsWith('/profiles'))return Response.json(url.searchParams.has('display_name')?[]:{display_name:'Old Name'});
   if(url.pathname.endsWith('/rpc/cosmora_save_shop_public_name'))return Response.json({code:'23505',message:'duplicate key violates profiles_public_name_unique'},{status:409});
   throw new Error('Unexpected request');
  };
  const r=await handleRequest(request('/api/seller/profile','POST',JSON.stringify({sellerType:'shop',displayName:'Taken Name',updatePublicName:true,country:'IT',email:'shop@example.invalid',legalName:'Business',vatNumber:'IT123',registeredAddress:'Address',legalRepresentative:'Owner',shippingPolicy:'Shipping',returnsPolicy:'Returns'})),env);
  assert.equal(r.status,409);assert.equal((await r.json() as any).code,'PUBLIC_NAME_TAKEN');
 } finally {globalThis.fetch=saved;}
});

test('older clients saving shop details do not rename the public account', async () => {
 const saved=globalThis.fetch;const writes:Array<{table:string; data:any}>=[];
 try {
  globalThis.fetch=async(input,init)=>{
   const url=new URL(String(input));const table=url.pathname.split('/').at(-1)!;
   if(url.pathname.endsWith('/auth/v1/user'))return Response.json({id:owner,app_metadata:{},identities:[]});
   if(table==='user_moderation')return Response.json(null);
   if(table==='profiles'&&init?.method!=='POST')return Response.json(url.searchParams.has('display_name')?[]:{display_name:'Existing Name'});
   if(init?.method==='POST'&&(table==='profiles'||table==='seller_details')){writes.push({table,data:JSON.parse(String(init.body))});return new Response(null,{status:204});}
   throw new Error('Unexpected request '+table);
  };
  const r=await handleRequest(request('/api/seller/profile','POST',JSON.stringify({sellerType:'shop',displayName:'Business legal name',country:'IT',email:'shop@example.invalid',legalName:'Business legal name',vatNumber:'IT123',registeredAddress:'Address',legalRepresentative:'Owner',shippingPolicy:'Shipping',returnsPolicy:'Returns'})),env);
  assert.equal(r.status,200);assert.equal((await r.json() as any).displayName,'Existing Name');
  assert.equal(writes.find(x=>x.table==='profiles')?.data.display_name,'Existing Name');
 } finally {globalThis.fetch=saved;}
});
