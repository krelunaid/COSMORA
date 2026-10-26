// Operator-only sender. Provider keys never enter the mobile bundle or repository.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createPrivateKey, sign, randomUUID } from 'node:crypto';
import { connect } from 'node:http2';
import { createClient } from '@supabase/supabase-js';

const campaign = 'community-thanks-v1';
const directory = join(homedir(), '.config/kreluna/cosmora-push');
const config = JSON.parse(await readFile(join(directory, 'sender.json'), 'utf8'));
const keys = JSON.parse(await readFile(join(directory, 'supabase-keys.json'), 'utf8'));
const key = keys.find((entry) => entry.name === 'service_role')?.api_key;
if (!key || config.supabaseUrl !== 'https://pwdpwgonvnuwmgfiidut.supabase.co' || config.apnsTopic !== 'it.kreluna.cosmora' || config.fcmProject !== 'kreluna') throw new Error('Invalid COSMORA configuration');
const admin = createClient(config.supabaseUrl, key, { auth: { persistSession:false,autoRefreshToken:false }, global: { fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)}) } });
const send = process.argv.includes('--send');
if (send && !process.argv.includes('--confirm-community-thanks-v1')) throw new Error('Explicit campaign confirmation is required');
const requestedId = process.argv.find((arg) => arg.startsWith('--installation='))?.split('=')[1];
const copy = {
 it:['Grazie di cuore 💜','Grazie per far crescere la nostra community. Tocca per leggere il messaggio di Andrea e del team.'],
 en:['Thank you from the heart 💜','Thank you for helping our community grow. Tap to read the message from Andrea and the team.'],
 de:['Danke von Herzen 💜','Danke, dass du unsere Community wachsen lässt. Tippe, um die Nachricht von Andrea und dem Team zu lesen.'],
 fr:['Merci du fond du cœur 💜','Merci de faire grandir notre communauté. Appuie pour lire le message d’Andrea et de l’équipe.'],
 es:['Gracias de corazón 💜','Gracias por hacer crecer nuestra comunidad. Toca para leer el mensaje de Andrea y del equipo.'],
};
const devices=[];
for(let from=0;;from+=500){
 let query=admin.from('push_devices').select('installation_id,user_id,platform,token,locale,updated_at').gte('updated_at',new Date(Date.now()-90*86400000).toISOString()).order('installation_id').range(from,from+499);
 if(requestedId) query=query.eq('installation_id',requestedId);
 const result=await query;if(result.error)throw new Error('Could not read device register');devices.push(...result.data);if(result.data.length<500)break;
}
const candidates=[];
for(const device of devices){
 const sent=await admin.from('push_deliveries').select('status').eq('campaign',campaign).eq('installation_id',device.installation_id).maybeSingle();
 if(sent.error)throw new Error('Could not read delivery audit');if(sent.data)continue;
 const account=await admin.auth.admin.getUserById(device.user_id);
 const moderation=await admin.from('user_moderation').select('user_id').eq('user_id',device.user_id).eq('suspended',true).maybeSingle();
 if(account.error||!account.data.user||account.data.user.is_anonymous||account.data.user.app_metadata?.deletion_pending||moderation.error||moderation.data)continue;
 candidates.push(device);
}
console.log(JSON.stringify({campaign,mode:send?'send':'preview',eligible:candidates.length,ios:candidates.filter(d=>d.platform==='ios').length,android:candidates.filter(d=>d.platform==='android').length,message:copy.it},null,2));
if(!send||!candidates.length)process.exit(0);
const b64=(value)=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
let googleAccess;
async function googleToken(){
 if(googleAccess)return googleAccess;
 const credentials=JSON.parse(await readFile(config.fcmCredential,'utf8'));
 if(credentials.project_id!==config.fcmProject)throw new Error('Wrong Firebase project');
 const now=Math.floor(Date.now()/1000);
 const head=b64({alg:'RS256',typ:'JWT'});const payload=b64({iss:credentials.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const unsigned=`${head}.${payload}`;const jwt=`${unsigned}.${sign('RSA-SHA256',Buffer.from(unsigned),credentials.private_key).toString('base64url')}`;
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(15000),body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})});
 const result=await response.json();if(!response.ok||!result.access_token)throw new Error('Google authentication failed');
 return googleAccess=result.access_token;
}
let appleJwt;
async function appleToken(){
 if(appleJwt)return appleJwt;
 const unsigned=`${b64({alg:'ES256',kid:config.apnsKeyId})}.${b64({iss:config.apnsTeam,iat:Math.floor(Date.now()/1000)})}`;
 const privateKey=createPrivateKey(await readFile(config.apnsPrivateKey));
 return appleJwt=`${unsigned}.${sign('sha256',Buffer.from(unsigned),{key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url')}`;
}
async function apns(device,title,body){
 const authorization=await appleToken();
 return new Promise((resolve,reject)=>{
  const client=connect('https://api.push.apple.com');
  const timeout=setTimeout(()=>{client.destroy();reject(new Error('APNs result unknown'));},15000);
  client.on('error',()=>{clearTimeout(timeout);client.destroy();reject(new Error('APNs connection failed'));});
  const request=client.request({':method':'POST',':path':`/3/device/${device.token}`,authorization:`bearer ${authorization}`,'apns-topic':config.apnsTopic,'apns-push-type':'alert','apns-priority':'10','apns-collapse-id':campaign,'apns-expiration':String(Math.floor(Date.now()/1000)+86400)});
  let status;let providerId;let result='';
  request.on('response',headers=>{status=headers[':status'];providerId=headers['apns-id'];});
  request.on('data',chunk=>result+=chunk);
  request.on('error',()=>{clearTimeout(timeout);client.destroy();reject(new Error('APNs result unknown'));});
  request.on('end',()=>{clearTimeout(timeout);client.close();let reason;try{reason=JSON.parse(result).reason;}catch{}resolve({ok:status===200,invalid:status===410||reason==='BadDeviceToken',providerId});});
  request.end(JSON.stringify({aps:{alert:{title,body},sound:'default'},campaign}));
 });
}
async function fcm(device,title,body){
 const response=await fetch(`https://fcm.googleapis.com/v1/projects/${config.fcmProject}/messages:send`,{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${await googleToken()}`,'Content-Type':'application/json'},body:JSON.stringify({message:{token:device.token,notification:{title,body},data:{campaign},android:{priority:'normal',ttl:'86400s',collapse_key:campaign,notification:{channel_id:'community',icon:'ic_stat_cosmora',tag:campaign}}}})});
 const result=await response.json();return {ok:response.ok,providerId:result.name,invalid:result.error?.details?.some(item=>item.errorCode==='UNREGISTERED')};
}
const summary={accepted:0,failed:0,unknown:0,skipped:0};
for(const device of candidates){
 // Claim once before contacting a provider. An uncertain response is never retried automatically.
 const claim=await admin.from('push_deliveries').insert({campaign,installation_id:device.installation_id,status:'sending'});
 if(claim.error){summary.skipped++;continue;}
 const current=await admin.from('push_devices').select('user_id,token').eq('installation_id',device.installation_id).maybeSingle();
 if(current.error||!current.data||current.data.user_id!==device.user_id||current.data.token!==device.token){summary.skipped++;continue;}
 const [title,body]=copy[device.locale]??copy.en;
 let status='unknown';let providerId;
 try{
  const result=device.platform==='ios'?await apns(device,title,body):await fcm(device,title,body);
  status=result.ok?'accepted':'failed';providerId=result.providerId;
  if(result.invalid)await admin.from('push_devices').delete().eq('installation_id',device.installation_id).eq('token',device.token);
 }catch{status='unknown';}
 summary[status]++;
 const update=await admin.from('push_deliveries').update({status,provider_id:providerId,updated_at:new Date().toISOString()}).eq('campaign',campaign).eq('installation_id',device.installation_id);
 if(update.error)throw new Error('Delivery audit update failed; do not retry this campaign automatically');
}
await mkdir('outputs/native-push',{recursive:true});await writeFile(`outputs/native-push/send-${randomUUID()}.json`,JSON.stringify({campaign,date:new Date().toISOString(),...summary},null,2));
console.log(JSON.stringify(summary));
