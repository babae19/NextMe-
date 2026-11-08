import test from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_PATH=':memory:';
const {handler}=await import('../backend/index.ts');
const {db,ai}=await import('../backend/runtime.ts');
const call=async(userId,method,url,body={})=>{const result=await handler({userId,method,url,body});return {status:result.statusCode,data:JSON.parse(result.body)};};
const day=new Date().toISOString().slice(0,10);
const monthDay=day.slice(5);
const profile={name:'Reader',birthday:'1992-'+monthDay,timezone:'UTC',consent:true,goals:['Learning']};
const goal={id:'goal-1',title:'Finish my course',why:'Build a skill',targetDate:'',nextStep:'Study on Saturday',status:'active'};
test('life goals are validated, persisted and isolated by account',async()=>{
 assert.equal((await call(undefined,'GET','/api/life-goals')).status,401);
 assert.equal((await call('reader','PUT','/api/life-goals',{goals:[goal]})).status,200);
 assert.equal((await call('reader','GET','/api/life-goals')).data.goals[0].title,goal.title);
 assert.deepEqual((await call('other','GET','/api/life-goals')).data.goals,[]);
 assert.equal((await call('reader','PUT','/api/life-goals',{goals:[{...goal,targetDate:'2026-02-30'}]})).status,400);
 assert.equal((await call('reader','PUT','/api/life-goals',{goals:[goal,goal]})).status,400);
});
test('future persona, chat, avatar and monthly advice use owned included diaries and real goals',async()=>{
 await db.tx.update('profiles',[{id:'reader',record:profile}]);
 await db.tx.add('journal_reader',[
 {id:'entry-included',text:'I studied two chapters this week.',created:day+'T12:00:00Z',mood:'Good',include:true},
 {id:'entry-excluded',text:'EXCLUDED_SECRET',created:day+'T12:00:00Z',mood:'Low',include:false},
 {id:'entry-old',text:'OLD_MONTH_SECRET',created:'2000-01-01T12:00:00Z',mood:'Okay',include:true}]);
 await db.tx.add('journal_other',[{id:'entry-other',text:'OTHER_ACCOUNT_SECRET',created:day+'T12:00:00Z',include:true}]);
 const original=ai.generate;const originalImage=ai.imageGen;const inputs=[];
 ai.generate=async o=>{inputs.push(o);return {text:o.schema?JSON.stringify({title:'Learner',introduction:'A possibility',strengths:[],patterns:[],focus:'Study',nextSteps:['Study Saturday']}):'A grounded suggestion.'};};
 ai.imageGen=async o=>{inputs.push(o);return {image:{data:'a'.repeat(300000),mimeType:'image/png'}};};
 try{
 const ids=['entry-included','entry-excluded','entry-other'];
 const persona=await call('reader','POST','/api/future-self/persona',{ids});assert.equal(persona.status,200);assert.equal(persona.data.count,1);
 assert.ok(inputs[0].prompt.includes('Finish my course'));assert.ok(inputs[0].prompt.includes('studied two chapters'));assert.ok(!inputs[0].prompt.includes('EXCLUDED_SECRET'));assert.ok(!inputs[0].prompt.includes('OTHER_ACCOUNT_SECRET'));
 const chat=await call('reader','POST','/api/future-self/chat',{ids,messages:[{role:'user',content:'How can I reach my goal?'}]});assert.equal(chat.status,200);assert.ok(inputs.at(-1).system.includes('Study on Saturday'));
 const monthly=await call('reader','POST','/api/journal-summary',{period:'monthly',anchor:day,ids:[...ids,'entry-old']});assert.equal(monthly.status,200);assert.equal(monthly.data.count,1);assert.ok(inputs.at(-1).system.includes('Recommendations for next month'));assert.ok(inputs.at(-1).prompt.includes('Finish my course'));assert.ok(!inputs.at(-1).prompt.includes('OLD_MONTH_SECRET'));
 const avatar=await call('reader','POST','/api/future-self/avatar',{ids,presentation:'gender-neutral',complexion:'medium'});assert.equal(avatar.status,200);assert.equal(avatar.data.avatar.data.length,300000);
 assert.equal((await call('other','GET','/api/future-self/avatar')).data.avatar,null);
 await db.tx.update('journal_reader',[{id:'entry-included',record:{include:false}}],{patch:true});
 assert.equal((await call('reader','POST','/api/future-self/chat',{ids,messages:[{role:'user',content:'Continue'}]})).status,400);
 }finally{ai.generate=original;ai.imageGen=originalImage;}
});
test('birthday access and the 300-second deadline are enforced on the server',async()=>{
 await db.tx.update('profiles',[{id:'birthday',record:profile},{id:'offday',record:{...profile,birthday:'1992-'+(monthDay==='01-01'?'01-02':'01-01')}}]);
 await db.tx.add('journal_birthday',[{id:'birthday-entry',text:'I made time for my goals.',created:day+'T12:00:00Z',mood:'Good',include:true}]);
 assert.equal((await call('offday','POST','/api/reveal')).status,403);
 assert.equal((await call('offday','POST','/api/reveal/chat',{message:'hello'})).status,403);
 await db.tx.add('journal_birthday',Array.from({length:35},(_,i)=>({id:'history-'+i,text:'History detail '+i,created:day+'T12:00:00Z',mood:'Good',include:true})));
 let opening='';const original=ai.generate;ai.generate=async o=>{opening=o.prompt||opening;return {text:'A possible birthday reflection.'};};
 try{
 const start=await call('birthday','POST','/api/reveal');assert.equal(start.status,200);assert.equal(start.data.expiresAt-start.data.startedAt,300000);assert.ok(opening.includes('History detail 34'));assert.ok(opening.includes('\"count\":36')); 
 const again=await call('birthday','POST','/api/reveal');assert.equal(again.data.expiresAt,start.data.expiresAt);
 const chat=await call('birthday','POST','/api/reveal/chat',{message:'What should I work on?'});assert.equal(chat.status,200);assert.equal(chat.data.messages.length,2);
 const year=day.slice(0,4);await db.tx.update('reveals',[{id:'birthday-'+year,record:{expiresAt:Date.now()-1}}],{patch:true});
 assert.equal((await call('birthday','GET','/api/reveal')).data.completed,true);
 assert.equal((await call('birthday','POST','/api/reveal')).status,409);
 assert.equal((await call('birthday','POST','/api/reveal/chat',{message:'Reset the timer'})).status,410);
 await db.tx.update('reveals',[{id:'birthday-'+year,record:{expiresAt:Date.now()+10000}}],{patch:true});
 ai.generate=async()=>{await db.tx.update('reveals',[{id:'birthday-'+year,record:{expiresAt:Date.now()-1}}],{patch:true});return {text:'Late response'};};
 assert.equal((await call('birthday','POST','/api/reveal/chat',{message:'A late question'})).status,410);
 }finally{ai.generate=original;}
});
