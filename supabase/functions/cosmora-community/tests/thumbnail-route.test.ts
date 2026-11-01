import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { previewSignature,validPreviewToken } from '../src/lib/preview-token.ts';
import * as visibility from '../src/lib/server/review-fixture-visibility.ts';
const id='20000000-0000-4000-8000-000000000001';
const env={SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture'};
async function fixture(mode:string) {
 const expiry=Math.floor(Date.now()/1000)+3600;
 const signature=await previewSignature(env.SUPABASE_SERVICE_ROLE_KEY,id,expiry);
 const rows:Record<string,unknown>={post_media:{id,post_id:id,storage_path:'author/post/file.jpg',media_type:'IMAGE'},community_posts:{id,author_id:'author'},community_media_previews:{original_path:'author/post/file.jpg',jpeg_base64:'/9j/2Q=='}};
 if(mode==='deleted')rows.post_media=null;
 if(mode==='hidden')rows.community_posts=null;
 if(mode==='stale')rows.community_media_previews={original_path:'old',jpeg_base64:'/9j/2Q=='};
 let reads=0;
 const admin={rpc:(name:string,args:{p_media_id:string})=>{
   reads++; assert.equal(name,'cosmora_read_media_preview'); assert.equal(args.p_media_id,id);
   return {maybeSingle:async()=>({data:['deleted','hidden','stale'].includes(mode)?null:{jpeg_base64:mode==='corrupt'?'bad!':'/9j/2Q==',author_id:mode==='fixture'?'66b0c100-e397-4971-946a-a8e3416b5f5b':'author'},error:null})};
 }};

 const source=readFileSync(new URL('../src/routes/thumbnail.ts',import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports:Record<string,unknown>={};
 const imports:Record<string,unknown>={'../lib/supabase/server.ts':{getSupabaseAdmin:()=>admin},'../lib/preview-token.ts':{validPreviewToken},'../lib/server/review-fixture-visibility.ts':visibility};
 vm.runInNewContext(compiled,{exports,require:(name:string)=>imports[name],URL,Response,Uint8Array,atob});
 const get=exports.GET as (request:Request,env:unknown)=>Promise<Response>;
 const response=await get(new Request(`https://example.invalid/api/community/thumbnail?id=${id}&expires=${expiry}&signature=${mode==='tampered'?'bad':signature}`),env);
 assert.equal(reads,mode==='tampered'?0:1); return response;
}
test('preview is JPEG only while source still exists, is public and matches',async()=>{
 const valid=await fixture('valid');assert.equal(valid.status,200);assert.equal(valid.headers.get('Content-Type'),'image/jpeg');assert.deepEqual([...new Uint8Array(await valid.arrayBuffer())],[255,216,255,217]);
 for(const mode of ['deleted','hidden','stale','tampered','fixture','corrupt'])assert.equal((await fixture(mode)).status,404);
});
