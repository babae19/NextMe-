import { createServer } from 'node:http';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { database, json, error } from './runtime.ts';
import { handler } from './index.ts';
import { startReminderScheduler } from './push.ts';
import { appOrigin } from './config.ts';
const scrypt=promisify(scryptCallback);
database.exec('CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,salt TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires INTEGER NOT NULL);');
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const attempts=new Map<string,{count:number;until:number}>();
const root=resolve('dist');
export const server=createServer(async(req,res)=>{
 const send=(r:ReturnType<typeof json>)=>{res.writeHead(r.statusCode,{...r.headers,'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cache-Control':'no-store'});res.end(r.body);};
 try{
 const url=new URL(req.url||'/','http://localhost');
 if(!url.pathname.startsWith('/api/')){
  if(req.method!=='GET'&&req.method!=='HEAD')return send(error('Method not allowed',405));
  const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(path!==root&&!path.startsWith(root+sep))return send(error('Not found',404));
  let data:Buffer;let file=path;
  try{data=await readFile(file);}catch{if(extname(path))return send(error('Not found',404));file=resolve(root,'index.html');data=await readFile(file);}
  const types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);return;
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){
  const origin=req.headers.origin;const expected=appOrigin();
  if(origin && origin!==(expected||'http://'+req.headers.host))return send(error('Origin rejected',403));
  if(req.headers['content-type']?.split(';')[0]!=='application/json')return send(error('JSON required',415));
 }
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>1024*1024)return send(error('Request too large',413));}
 let body:any={};try{body=raw?JSON.parse(raw):{};}catch{return send(error('Invalid JSON',400));}
 const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('nextme_session='))?.slice(15)||'';
 const session=database.prepare('SELECT user_id FROM sessions WHERE token=? AND expires>?').get(digest(token),Date.now());
 const userId=session?String(session.user_id):undefined;
 if(url.pathname==='/api/health'){database.prepare('SELECT 1').get();return send(json({ok:true}));}
 if(url.pathname==='/api/auth/me'&&req.method==='GET'){
  const user=userId?database.prepare('SELECT id,email FROM users WHERE id=?').get(userId):null;return send(json({user:user?{userId:user.id,email:user.email,name:String(user.email).split('@')[0]}:null}));
 }
 if(['/api/auth/login','/api/auth/register'].includes(url.pathname)&&req.method==='POST'){
  const ip=req.socket.remoteAddress||'unknown';const now=Date.now();for(const [key,value] of attempts)if(value.until<now)attempts.delete(key);
  const rate=attempts.get(ip)||{count:0,until:now+900000};if(++rate.count>20)return send(error('Too many attempts. Try again in 15 minutes.',429));attempts.set(ip,rate);
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';const password=typeof body.password==='string'?body.password:'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<12||password.length>256)return send(error('Use a valid email and a password of 12–256 characters.',400));
  let user=database.prepare('SELECT * FROM users WHERE email=?').get(email);
  if(url.pathname.endsWith('/register')){
   if(user)return send(error('Account unavailable. Try signing in.',409));
   const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,64) as Buffer;const id=randomUUID();
   try{database.prepare('INSERT INTO users VALUES(?,?,?,?)').run(id,email,hash.toString('hex'),salt);}catch{return send(error('Account unavailable. Try signing in.',409));}user={id};
  }else{
   const hash=await scrypt(password,user?String(user.salt):'missing-account',64) as Buffer;
   if(!user||!timingSafeEqual(hash,Buffer.from(String(user.password),'hex')))return send(error('Email or password is incorrect.',401));
  }
  const fresh=randomBytes(32).toString('hex');database.prepare('DELETE FROM sessions WHERE expires<?').run(now);database.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(fresh),user!.id,now+7*86400000);
  res.setHeader('Set-Cookie',`nextme_session=${fresh}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${process.env.NODE_ENV==='production'?'; Secure':''}`);return send(json({ok:true}));
 }
 if(url.pathname==='/api/auth/logout'&&req.method==='POST'){database.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));res.setHeader('Set-Cookie','nextme_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return send(json({ok:true}));}
 send(await handler({method:req.method||'GET',url:req.url||'/',body,userId}));
 }catch(err){console.error('Request failed:',err instanceof Error?err.message:'Unknown error');send(error('The request could not be completed.',500));}
});
server.requestTimeout=150000;
if(process.env.NODE_ENV!=='test'){
 appOrigin(); // Fail startup on invalid production URL configuration.
 const stopReminders=startReminderScheduler();
 server.on('close',stopReminders);
 server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('NextMe server ready'));
 let stopping=false;
 const shutdown=()=>{
  if(stopping)return;stopping=true;stopReminders();
  const timeout=setTimeout(()=>{server.closeAllConnections();process.exit(0);},25000);timeout.unref();
  server.close(()=>{clearTimeout(timeout);database.close();process.exit(0);});
 };
 process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
}
