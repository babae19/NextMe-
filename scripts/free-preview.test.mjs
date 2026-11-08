import test from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_PATH=':memory:';process.env.NODE_ENV='test';process.env.DEMO_ONLY='true';
const {server}=await import('../backend/server.ts');const {database}=await import('../backend/database.ts');
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
test('free preview remains healthy and refuses private accounts and diary writes',async()=>{
 const health=await fetch(base+'/api/health');assert.equal(health.status,200);assert.equal((await health.json()).demoOnly,true);
 const me=await fetch(base+'/api/auth/me');assert.deepEqual(await me.json(),{user:null,demoOnly:true});
 for(const path of ['/api/auth/register','/api/auth/login','/api/entries']){const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'test@example.com',password:'a-long-test-password',text:'Do not persist this diary'})});assert.equal(response.status,503);}
 assert.equal(database.prepare('SELECT COUNT(*) AS n FROM users').get().n,0);
 assert.equal(database.prepare('SELECT COUNT(*) AS n FROM records').get().n,0);
});
test.after(()=>new Promise(r=>server.close(r)));
