import test from 'node:test';
import assert from 'node:assert/strict';
import { canRestorePush, isPushIdentity, notificationRoute, PUSH_CAMPAIGN } from '../lib/push-policy.ts';
const device = { id: '12345678-abcd-4abc-9abc-123456789abc', secret: 'a'.repeat(64), userId:'a', enabled:true };
test('only the account that opted in can restore notification registration', () => {
  assert.equal(canRestorePush(device,'a',false,'granted'),true);
  for (const value of [canRestorePush(device,'b',false,'granted'),canRestorePush(device,undefined,false,'granted'),canRestorePush(device,'a',true,'granted'),canRestorePush(device,'a',false,'denied'),canRestorePush({...device,pendingDisable:true},'a',false,'granted'),canRestorePush({...device,enabled:false},'a',false,'granted')]) assert.equal(value,false);
});
test('notification payload cannot navigate to an arbitrary route or external URL', () => {
 assert.equal(notificationRoute({campaign:PUSH_CAMPAIGN,url:'https://evil.example'}),'/thanks');
 for (const value of [null,undefined,{},'/thanks',{url:'/account/delete'},{campaign:'unknown'}]) assert.equal(notificationRoute(value),null);
});
test('installation identities require strong secrets and valid storage shape', () => {
 assert.equal(isPushIdentity(device),true);
 for (const value of [null,{}, {...device,secret:'short'}, {...device,enabled:'true'}, {...device,id:'invalid'}]) assert.equal(isPushIdentity(value),false);
});
