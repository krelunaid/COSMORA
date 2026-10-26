import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import type { Session } from '@supabase/supabase-js';
const callbacks = new Map<string,(value: unknown) => void>();
let permission='prompt',prompts=0,registers=0;
const sent: {action:string;token?:string;installationSecret:string}[]=[];
const storage = new Map<string,string>();
const mock = {
 Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'android'},
 App:{addListener:async()=>({remove:async()=>{}})},
 PushNotifications:{
  addListener:async(name:string,callback:(value:unknown)=>void)=>{callbacks.set(name,callback);return {remove:async()=>callbacks.delete(name)};},
  checkPermissions:async()=>({receive:permission}),
  requestPermissions:async()=>{prompts++;permission='granted';return {receive:permission};},
  register:async()=>{registers++;queueMicrotask(()=>callbacks.get('registration')?.({value:'test-token-'.repeat(5)}));},
  unregister:async()=>{},createChannel:async()=>{},
 },
};
Object.assign(globalThis,{__cosmoraPushMock:mock,localStorage:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)},window:new EventTarget()});
registerHooks({resolve(specifier,context,next){
 if(['@capacitor/core','@capacitor/app','@capacitor/push-notifications'].includes(specifier))return {url:'data:text/javascript,export const {Capacitor,App,PushNotifications}=globalThis.__cosmoraPushMock;',shortCircuit:true};
 if(specifier==='./push-policy')return next('./push-policy.ts',context);
 return next(specifier,context);
}});
process.env.NEXT_PUBLIC_SUPABASE_URL='https://test.invalid';
let delayRequest: Promise<void>|null=null;
globalThis.fetch=async(_url,init)=>{const body=JSON.parse(init!.body as string);sent.push(body);if(body.action==='register'&&delayRequest)await delayRequest;return new Response('{}',{status:200});};
const push=await import('../lib/native-push.ts');
const user=(id:string)=>({access_token:`token-${id}`,user:{id,is_anonymous:false}} as Session);
test('push requires explicit consent, revokes on account switch, and rejects a late registration after logout',async()=>{
 await push.updatePushSession(user('a'),'it');assert.equal(prompts,0);assert.equal(registers,0);assert.equal(sent.length,0);
 await push.enablePush();assert.equal(prompts,1);assert.equal(push.getPushState(),'enabled');assert.equal(sent.at(-1)?.action,'register');
 await push.updatePushSession(user('b'),'en');assert.equal(sent.at(-1)?.action,'disable');assert.equal(push.getPushState(),'off');assert.equal(prompts,1);
 await push.enablePush();assert.equal(push.getPushState(),'enabled');
 await push.disablePush();assert.equal(push.getPushState(),'off');
 let release!:()=>void;delayRequest=new Promise(resolve=>{release=resolve;});
 const pending=push.enablePush();await new Promise(resolve=>setTimeout(resolve,20));
 await push.updatePushSession(null,'it');release();await pending;delayRequest=null;
 assert.equal(sent.at(-1)?.action,'disable');
 const stored=JSON.parse(storage.get('cosmora-push-v1')!);assert.equal(stored.enabled,false);assert.equal(push.getPushState(),'off');
});
test('notification clicks use only the fixed thank-you route',()=>{
 const paths:string[]=[];const cleanup=push.setPushNavigator(path=>paths.push(path));
 callbacks.get('pushNotificationActionPerformed')?.({notification:{data:{campaign:'community-thanks-v1',url:'https://evil.example'}}});
 callbacks.get('pushNotificationActionPerformed')?.({notification:{data:{url:'/account/delete'}}});
 assert.deepEqual(paths,['/thanks']);cleanup();
});
