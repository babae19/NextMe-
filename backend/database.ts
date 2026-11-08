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
