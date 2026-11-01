import assert from 'node:assert/strict';
import test from 'node:test';
import { previewSignature, validPreviewToken } from '../src/lib/preview-token.ts';
const id='20000000-0000-4000-8000-000000000001';
test('preview capability rejects tampering, other media, other keys and expiry',async()=>{
 const now=Date.now(); const expiry=Math.floor(now/1000)+3600;
 const sig=await previewSignature('test secret',id,expiry);
 assert.equal(await validPreviewToken('test secret',id,expiry,sig,now),true);
 assert.equal(await validPreviewToken('other',id,expiry,sig,now),false);
 assert.equal(await validPreviewToken('test secret',id.replace(/1$/,'2'),expiry,sig,now),false);
 assert.equal(await validPreviewToken('test secret',id,expiry+1,sig,now),false);
 assert.equal(await validPreviewToken('test secret',id,expiry,sig,now+3601000),false);
 assert.equal(await validPreviewToken('test secret',id,expiry,'',now),false);
});
