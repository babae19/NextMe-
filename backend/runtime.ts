import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
const filename=process.env.DATABASE_PATH || './data/nextme.sqlite';
mkdirSync(dirname(filename),{recursive:true});
export const database=new DatabaseSync(filename);
database.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records(collection TEXT,id TEXT,value TEXT,PRIMARY KEY(collection,id));');
export const db={
 async get<T>(t:string,ids:string[],_o?:unknown):Promise<(T|null)[]>{return ids.map(id=>{const r=database.prepare('SELECT value FROM records WHERE collection=? AND id=?').get(t,id);return r?JSON.parse(String(r.value)):null;});},
 async list<T>(t:string,o:{limit?:number;nextToken?:string}={}){const n=Math.max(1,Math.min(o.limit||30,250)), offset=Number(o.nextToken||0);if(!Number.isSafeInteger(offset)||offset<0)throw Error('Invalid cursor');const rows=database.prepare('SELECT value FROM records WHERE collection=? ORDER BY id LIMIT ? OFFSET ?').all(t,n+1,offset);return {items:rows.slice(0,n).map(r=>JSON.parse(String(r.value)) as T),nextToken:rows.length>n?String(offset+n):undefined};},
 async delete(t:string,ids:string[]){for(const id of ids)database.prepare('DELETE FROM records WHERE collection=? AND id=?').run(t,id);},
 tx:{
 async add(t:string,records:any[]){return records.map(r=>{const id=r.id||randomUUID();return database.prepare('INSERT OR IGNORE INTO records VALUES(?,?,?)').run(t,id,JSON.stringify({...r,id})).changes?id:null;});},
 async update(t:string,records:{id:string;record:object}[],o?:{patch?:boolean}){return records.map(({id,record})=>{const old=database.prepare('SELECT value FROM records WHERE collection=? AND id=?').get(t,id);if(o?.patch&&!old)return false;const v=o?.patch?{...JSON.parse(String(old!.value)),...record}:record;database.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(collection,id) DO UPDATE SET value=excluded.value').run(t,id,JSON.stringify(v));return true;});}
 }
};
type Response={statusCode:number;headers:Record<string,string>;body:string};
type Event={userId?:string;method:string;url:string;body:any};
type Context={body:any;query:Record<string,string>;params:Record<string,string>;user?:{userId:string};event:Event};
type Middleware=(c:Context)=>Promise<Response|void>|Response|void;
export const json=(data:unknown,statusCode=200):Response=>({statusCode,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
export const error=(message:string,status=400)=>json({message},status);
export const requireAuth=():Middleware=>c=>{if(!c.event.userId)return error('Sign in to continue.',401);c.user={userId:c.event.userId};};
export function router(routes:Record<string,Middleware[]>){return async(event:Event)=>{const url=new URL(event.url,'http://localhost');for(const [key,chain] of Object.entries(routes)){const [method,path]=key.split(' ');if(method!==event.method)continue;const names:string[]=[];const pattern=path.replace(/:([\w]+)/g,(_m,name)=>{names.push(name);return '([^/]+)';});const match=url.pathname.match(new RegExp('^'+pattern+'$'));if(!match)continue;const c:Context={event,body:event.body,query:Object.fromEntries(url.searchParams),params:Object.fromEntries(names.map((name,i)=>[name,decodeURIComponent(match[i+1])]))};for(const middleware of chain){const result=await middleware(c);if(result)return result;}}return error('Route not found',404);};}
async function aiRequest(path:string,body:unknown){if(!process.env.AI_API_KEY)throw Error('Configure AI_API_KEY');const r=await fetch((process.env.AI_BASE_URL||'https://api.openai.com/v1')+path,{method:'POST',headers:{Authorization:'Bearer '+process.env.AI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error('AI service unavailable');return await r.json() as any;}
export const ai={
 async generate(o:any){const r=await aiRequest('/chat/completions',{model:process.env.AI_MODEL||'gpt-4o-mini',messages:[{role:'system',content:o.system||''},...(o.messages||[{role:'user',content:o.prompt}])],max_tokens:o.maxTokens||1000,...(o.schema?{response_format:{type:'json_object'}}:{})});const text=r.choices?.[0]?.message?.content;if(typeof text!=='string')throw Error('Empty AI response');return {text};},
 async imageGen(o:any){const r=await aiRequest('/images/generations',{model:process.env.AI_IMAGE_MODEL||'gpt-image-1',prompt:o.prompt,size:'1024x1024'});if(!r.data?.[0]?.b64_json)throw Error('No image returned');return {image:{data:r.data[0].b64_json,mimeType:'image/png'}};}
};
export const notifications={async subscribeTopic(_o:unknown){throw Error('Scheduled push reminders are not configured. Use calendar downloads.');},async unsubscribeTopic(_o:unknown){}};
