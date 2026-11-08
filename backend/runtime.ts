export { db, database } from './database.ts';
export { notifications } from './push.ts';
export { ai } from './ai.ts';
type Response={statusCode:number;headers:Record<string,string>;body:string};
type Event={userId?:string;method:string;url:string;body:any};
type Context={body:any;query:Record<string,string>;params:Record<string,string>;user?:{userId:string};event:Event};
type Middleware=(c:Context)=>Promise<Response|void>|Response|void;
export const json=(data:unknown,statusCode=200):Response=>({statusCode,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
export const error=(message:string,status=400)=>json({message},status);
export const requireAuth=():Middleware=>c=>{if(!c.event.userId)return error('Sign in to continue.',401);c.user={userId:c.event.userId};};
export function router(routes:Record<string,Middleware[]>){return async(event:Event)=>{const url=new URL(event.url,'http://localhost');for(const [key,chain] of Object.entries(routes)){const [method,path]=key.split(' ');if(method!==event.method)continue;const names:string[]=[];const pattern=path.replace(/:([\w]+)/g,(_m,name)=>{names.push(name);return '([^/]+)';});const match=url.pathname.match(new RegExp('^'+pattern+'$'));if(!match)continue;const c:Context={event,body:event.body,query:Object.fromEntries(url.searchParams),params:Object.fromEntries(names.map((name,i)=>[name,decodeURIComponent(match[i+1])]))};for(const middleware of chain){const result=await middleware(c);if(result)return result;}}return error('Route not found',404);};}
