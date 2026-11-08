import * as webpush from 'web-push';
import { appOrigin } from './config.ts';
import { database } from './database.ts';
import { createHash } from 'node:crypto';
database.exec(`CREATE TABLE IF NOT EXISTS push_config (id INTEGER PRIMARY KEY, public_key TEXT NOT NULL, private_key TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS push_devices (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,subscription TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS push_topics (user_id TEXT NOT NULL,topic TEXT NOT NULL,next_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,topic));`);
let keys=database.prepare('SELECT * FROM push_config WHERE id=1').get();
if(!keys){const generated=webpush.generateVAPIDKeys();database.prepare('INSERT OR IGNORE INTO push_config VALUES(1,?,?)').run(generated.publicKey,generated.privateKey);keys=database.prepare('SELECT * FROM push_config WHERE id=1').get();}
export const publicPushKey=String(keys!.public_key);
const privatePushKey=String(keys!.private_key);
const topics=['nextme-daily-journal','nextme-weekly','nextme-monthly'];
export function nextPushTime(topic:string,now=Date.now()) {
 const date=new Date(now);let next=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),18));
 if(topic==='nextme-monthly'){next=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1,18));if(+next<=now)next.setUTCMonth(next.getUTCMonth()+1);}
 else if(topic==='nextme-weekly'){next.setUTCDate(next.getUTCDate()+(7-next.getUTCDay())%7);if(+next<=now)next.setUTCDate(next.getUTCDate()+7);}
 else if(topic==='nextme-daily-journal'){if(+next<=now)next.setUTCDate(next.getUTCDate()+1);}
 else throw Error('Unsupported reminder schedule');
 return +next;
}
export function validPushSubscription(value:any) {
 if(!value||typeof value.endpoint!=='string'||value.endpoint.length>2048)return false;
 try {const url=new URL(value.endpoint);const host=url.hostname;const allowed=host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com'||host.endsWith('.push.services.mozilla.com')||host==='web.push.apple.com'||host.endsWith('.notify.windows.com');if(!allowed||url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443'))return false;}catch{return false;}
 return typeof value.keys?.p256dh==='string'&&/^[A-Za-z0-9_-]+$/.test(value.keys.p256dh)&&Buffer.from(value.keys.p256dh,'base64url').length===65&&typeof value.keys?.auth==='string'&&/^[A-Za-z0-9_-]+$/.test(value.keys.auth)&&Buffer.from(value.keys.auth,'base64url').length===16;
}
const deviceId=(endpoint:string)=>createHash('sha256').update(endpoint).digest('hex');
export function savePushDevice(userId:string,subscription:any) {
 if(!validPushSubscription(subscription))throw Error('This browser returned an unsupported push subscription.');
 const existing=database.prepare('SELECT id FROM push_devices WHERE id=? AND user_id=?').get(deviceId(subscription.endpoint),userId);
 if(!existing&&pushDeviceCount(userId)>=10)throw Error('Up to ten devices can receive reminders.');
 const value={endpoint:subscription.endpoint,keys:{p256dh:subscription.keys.p256dh,auth:subscription.keys.auth}};
 database.prepare('INSERT INTO push_devices VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,subscription=excluded.subscription').run(deviceId(subscription.endpoint),userId,JSON.stringify(value));
}
export function removePushDevice(userId:string,endpoint:string){database.prepare('DELETE FROM push_devices WHERE user_id=? AND id=?').run(userId,deviceId(endpoint));}
export function pushDeviceCount(userId:string){return Number(database.prepare('SELECT COUNT(*) AS n FROM push_devices WHERE user_id=?').get(userId)!.n);}
export const notifications={
 async subscribeTopic({userIds,topic}:{userIds:string[];topic:string}){if(!topics.includes(topic))throw Error('Invalid reminder topic');for(const id of userIds)database.prepare('INSERT OR IGNORE INTO push_topics(user_id,topic,next_at) VALUES(?,?,?)').run(id,topic,nextPushTime(topic));},
 async unsubscribeTopic({userIds,topic}:{userIds:string[];topic:string}){for(const id of userIds)database.prepare('DELETE FROM push_topics WHERE user_id=? AND topic=?').run(id,topic);}
};
let running=false;
export async function deliverDueReminders(now=Date.now(),send=webpush.sendNotification.bind(webpush)) {
 if(running)return;running=true;
 try {
  const rows=database.prepare('SELECT * FROM push_topics WHERE next_at<=? LIMIT 100').all(now);
  for(const row of rows){
   const devices=database.prepare('SELECT * FROM push_devices WHERE user_id=? LIMIT 20').all(row.user_id);
   let failed=false;
   for(const device of devices){
    try {const subscription=JSON.parse(String(device.subscription));if(!validPushSubscription(subscription)){database.prepare('DELETE FROM push_devices WHERE id=?').run(device.id);continue;}
     // Content is generic, including for monthly advice; journals are never placed in push payloads.
     const body=row.topic==='nextme-monthly'?'Your monthly reflection and goal plan are ready to create. Open NextMe when you have a moment.':row.topic==='nextme-weekly'?'Take a moment to reflect on your week.':'One small reflection counts. Your journal is here when you are ready.';
     await send(subscription,JSON.stringify({title:'A moment for you · NextMe',body,url:'/',tag:String(row.topic)}),{TTL:3600,timeout:10000,urgency:'normal',vapidDetails:{subject:process.env.VAPID_SUBJECT||(appOrigin().startsWith('https:')?appOrigin():'https://localhost'),publicKey:publicPushKey,privateKey:privatePushKey}});
    }catch(e:any){if(e?.statusCode===404||e?.statusCode===410)database.prepare('DELETE FROM push_devices WHERE id=?').run(device.id);else failed=true;}
   }
   // User may opt out while a request is in flight. UPDATE cannot recreate an opted-out schedule.
   const retry=failed&&Number(row.attempts)<2;
   database.prepare('UPDATE push_topics SET next_at=?,attempts=? WHERE user_id=? AND topic=?').run(retry?now+300000:nextPushTime(String(row.topic),now),retry?Number(row.attempts)+1:0,row.user_id,row.topic);
  }
 }finally{running=false;}
}
export function startReminderScheduler(){const timer=setInterval(()=>{deliverDueReminders().catch(()=>console.warn('Reminder scheduler failed; will retry on the next tick.'));},60000);timer.unref();void deliverDueReminders().catch(()=>{});return ()=>clearInterval(timer);}
