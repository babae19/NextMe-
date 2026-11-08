import test from 'node:test';
import assert from 'node:assert/strict';
import { createECDH, randomBytes } from 'node:crypto';
process.env.DATABASE_PATH=':memory:';
process.env.NODE_ENV='test';
const {handler}=await import('../backend/index.ts');
const {ai,aiConfiguration}=await import('../backend/ai.ts');
const {database}=await import('../backend/database.ts');
const {findLearningBooks}=await import('../backend/resources.ts');
const {publicPushKey,validPushSubscription,savePushDevice,removePushDevice,pushDeviceCount,notifications,deliverDueReminders,nextPushTime}=await import('../backend/push.ts');
const call=async(userId,method,url,body={})=>{const r=await handler({userId,method,url,body});return {status:r.statusCode,data:JSON.parse(r.body)};};
function subscription(name){const curve=createECDH('prime256v1');curve.generateKeys();return {endpoint:'https://fcm.googleapis.com/fcm/send/'+name,keys:{p256dh:curve.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};}
test('OpenRouter adapter uses documented paths, JSON schema and server-only credentials',async()=>{
 const previous={...process.env};const original=globalThis.fetch;const requests=[];
 process.env.AI_PROVIDER='openrouter';process.env.AI_API_KEY='fake-test-key';
 for(const key of ['AI_BASE_URL','AI_MODEL','AI_IMAGE_PROVIDER','AI_IMAGE_BASE_URL','AI_IMAGE_API_KEY','AI_IMAGE_MODEL'])delete process.env[key];
 globalThis.fetch=async(url,options)=>{requests.push({url,options,body:JSON.parse(options.body)});return new Response(JSON.stringify(String(url).endsWith('/images')?{data:[{b64_json:'aGVsbG8=',media_type:'image/webp'}]}:{choices:[{message:{content:'{"answer":"hello"}'}}]}),{status:200,headers:{'Content-Type':'application/json'}});};
 try{
  assert.equal(aiConfiguration().model,'openai/gpt-4o-mini');
  await ai.generate({system:'Use evidence.',prompt:'Create a portrait',schema:{type:'object',properties:{answer:{type:'string'}}}});
  assert.equal(requests[0].url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(requests[0].options.headers.Authorization,'Bearer fake-test-key');assert.ok(requests[0].body.messages[0].content.includes('JSON schema'));assert.equal(requests[0].body.response_format.type,'json_object');
  const image=await ai.imageGen({prompt:'Symbolic avatar'});assert.equal(requests[1].url,'https://openrouter.ai/api/v1/images');assert.equal(image.image.mimeType,'image/webp');
  const status=await call('one','GET','/api/integrations');assert.ok(!JSON.stringify(status).includes('fake-test-key'));assert.equal(status.data.ai.configured,true);
  globalThis.fetch=async()=>new Response('{}',{status:429});await assert.rejects(ai.generate({prompt:'Retry?'}),/rate limit/);
  delete process.env.AI_API_KEY;await assert.rejects(ai.generate({prompt:'No credential'}),/API key/);
 }finally{globalThis.fetch=original;for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous);}
});
test('Open Library sends only a fixed topic, caches responses, rejects unsafe links and fails gracefully',async()=>{
 let count=0;const fetcher=async(url,options)=>{count++;assert.ok(url.startsWith('https://openlibrary.org/search.json?'));assert.ok(!url.includes('diary'));assert.equal(new URL(url).searchParams.get('limit'),'3');assert.ok(options.signal);return new Response(JSON.stringify({docs:[{key:'/works/OL123W',title:'Learning',author_name:['An author'],first_publish_year:2020},{key:'https://evil.example',title:'Unsafe'}]}));};
 const results=await findLearningBooks('learning',fetcher);assert.equal(results.length,1);assert.equal(results[0].url,'https://openlibrary.org/works/OL123W');await findLearningBooks('learning',fetcher);assert.equal(count,1);
 await assert.rejects(findLearningBooks('__proto__',fetcher),/supported/);
 assert.equal((await call('one','GET','/api/learning-resources?topic=__proto__')).status,400);
 assert.equal((await call(undefined,'GET','/api/learning-resources?topic=learning')).status,401);
 await assert.rejects(findLearningBooks('creativity',async()=>new Response('{}',{status:503})),/unavailable/);
});
test('browser push subscriptions are authenticated, account-scoped and limited to known push hosts',async()=>{
 const device=subscription('private-device');assert.ok(validPushSubscription(device));
 for(const endpoint of ['http://127.0.0.1/admin','https://localhost','https://fcm.googleapis.com.evil.example/send','https://user:pass@fcm.googleapis.com/a'])assert.equal(validPushSubscription({...device,endpoint}),false);
 assert.equal((await call(undefined,'GET','/api/push/key')).status,401);
 assert.equal((await call('one','GET','/api/push/key')).data.publicKey,publicPushKey);
 assert.equal((await call('one','POST','/api/push/subscription',{subscription:device})).status,200);
 removePushDevice('other',device.endpoint);assert.equal(pushDeviceCount('one'),1);
 const keyResponse=await call('one','GET','/api/push/key');assert.ok(!JSON.stringify(keyResponse).includes('private_key'));
 savePushDevice('other',device);assert.equal(pushDeviceCount('one'),0);assert.equal(pushDeviceCount('other'),1);
 removePushDevice('other',device.endpoint);
});
test('daily, weekly and monthly reminders deliver generic content; opt-out and retries work',async()=>{
 const now=Date.now();const device=subscription('reminder-device');savePushDevice('one',device);
 await notifications.subscribeTopic({userIds:['one'],topic:'nextme-daily-journal'});
 database.prepare('UPDATE push_topics SET next_at=0').run();
 const sent=[];await deliverDueReminders(now,async(s,payload,options)=>{sent.push({s,payload,options});});
 assert.equal(sent.length,1);assert.equal(sent[0].s.endpoint,device.endpoint);assert.ok(!sent[0].payload.includes('diary text'));assert.equal(sent[0].options.timeout,10000);
 await deliverDueReminders(now,async()=>{throw Error('Should not send twice');});assert.equal(sent.length,1);
 await notifications.unsubscribeTopic({userIds:['one'],topic:'nextme-daily-journal'});assert.equal(database.prepare('SELECT COUNT(*) AS n FROM push_topics').get().n,0);
 await notifications.subscribeTopic({userIds:['one'],topic:'nextme-monthly'});database.prepare('UPDATE push_topics SET next_at=0').run();
 await deliverDueReminders(now,async()=>{throw {statusCode:503};});assert.equal(database.prepare('SELECT attempts FROM push_topics').get().attempts,1);
 database.prepare('UPDATE push_topics SET next_at=0').run();await deliverDueReminders(now,async()=>{throw {statusCode:410};});assert.equal(pushDeviceCount('one'),0);
 for(const topic of ['nextme-daily-journal','nextme-weekly','nextme-monthly']){const next=new Date(nextPushTime(topic,now));assert.ok(+next>now);assert.equal(next.getUTCHours(),18);if(topic==='nextme-weekly')assert.equal(next.getUTCDay(),0);if(topic==='nextme-monthly')assert.equal(next.getUTCDate(),1);}
});
