import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { handleRequest } from '../src/index.ts';
import { sanitizePhotoBytes } from '../src/lib/photo-privacy.ts';

test('authenticated multipart post sanitizes photos, ignores links and remains pending moderation', async () => {
 const originalFetch=globalThis.fetch;
 const owner='10000000-0000-4000-8000-000000000001';
 const photo=new Uint8Array(readFileSync(new URL('./fixtures/metadata.jpg',import.meta.url)));
 const writes: Array<{table:string,data:any}>=[];
 let uploaded=false;
 try {
  globalThis.fetch=async (input,init)=>{
   const url=new URL(String(input));
   if(url.pathname==='/auth/v1/user')return Response.json({id:owner,app_metadata:{},user_metadata:{},identities:[]});
   if(url.pathname.endsWith('/user_moderation'))return Response.json(null);
   if(init?.method==='HEAD')return new Response(null,{headers:{'Content-Range':'*/0'}});
   if(url.pathname.includes('/storage/v1/object/')) {
    assert.equal(init?.method,'POST');
    const body=init?.body as FormData;
    const file=[...body.values()].find(value=>value instanceof File) as File;
    assert.ok(file);
    assert.deepEqual(new Uint8Array(await file.arrayBuffer()),sanitizePhotoBytes(photo,'image/jpeg'));
    uploaded=true;return Response.json({Key:'synthetic-photo'});
   }
   const table=url.pathname.split('/').at(-1)!;
   const data=JSON.parse(String(init?.body));writes.push({table,data});
   if(table==='post_categories')return Response.json({id:'category-id'});
   if(table==='community_posts'&&init?.method==='POST'){
    assert.equal(data.author_id,owner);assert.equal(data.status,'DRAFT');
    assert.equal(data.link_type,null);assert.equal(data.link_url,null);
    return Response.json({id:data.id,status:data.status});
   }
   if(table==='post_media')return Response.json(null);
   if(table==='community_posts'&&init?.method==='PATCH')return Response.json(null);
   throw new Error('Unexpected request '+url);
  };
  const form=new FormData();form.set('caption','My photo #cosplay');form.set('category','Cosplay');
  form.set('link_type','PROFILE');form.set('link_url','https://untrusted.invalid/');
  form.set('media',new File([photo],'metadata.jpg',{type:'image/jpeg'}));
  const response=await handleRequest(new Request('https://example.invalid/cosmora-community/api/community/posts',{method:'POST',headers:{Authorization:'Bearer synthetic-user'},body:form}),{SUPABASE_URL:'https://pwdpwgonvnuwmgfiidut.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-server-key'});
  assert.equal(response.status,201);assert.equal((await response.json() as any).post.status,'PENDING_REVIEW');
  assert.equal(uploaded,true);assert.deepEqual(writes.at(-1),{table:'community_posts',data:{status:'PENDING_REVIEW'}});
 }finally{globalThis.fetch=originalFetch;}
});
