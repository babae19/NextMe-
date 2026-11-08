// A fixed topic is the only user-derived value sent to Open Library. Never send a diary or goal title.
export const learningTopics:Record<string,{label:string;query:string}>={
 learning:{label:'Learning',query:'learning study skills'},
 habits:{label:'Habits & focus',query:'habits productivity'},
 entrepreneurship:{label:'Entrepreneurship',query:'entrepreneurship small business'},
 creativity:{label:'Creativity',query:'creativity creative thinking'},
 relationships:{label:'Communication',query:'communication interpersonal skills'},
 mindfulness:{label:'Mindfulness',query:'mindfulness'},
 money:{label:'Money basics',query:'personal finance basics'}
};
const cache=new Map<string,{until:number;books:Book[]}>();
const pending=new Map<string,Promise<Book[]>>();
let nextRequestAt=0;
type Book={title:string;authors:string[];year:number|null;url:string};
export async function findLearningBooks(topic:string,fetcher=fetch):Promise<Book[]> {
 const chosen=Object.hasOwn(learningTopics,topic)?learningTopics[topic]:null;if(!chosen)throw Error('Choose a supported learning topic.');
 const saved=cache.get(topic);if(saved&&saved.until>Date.now())return saved.books;
 if(pending.has(topic))return pending.get(topic)!;
 const job=(async()=>{
  // Global one-request-per-second throttle plus deduplication and a six-hour topic cache.
  const start=Math.max(Date.now(),nextRequestAt);nextRequestAt=start+1100;
  if(start>Date.now())await new Promise(r=>setTimeout(r,start-Date.now()));
  const query=new URLSearchParams({q:chosen.query,fields:'key,title,author_name,first_publish_year',limit:'3',lang:'en'});
  const r=await fetcher('https://openlibrary.org/search.json?'+query,{headers:{'User-Agent':'NextMe/1.0'+(process.env.API_CONTACT_EMAIL?' ('+process.env.API_CONTACT_EMAIL+')':''),'Accept':'application/json'},signal:AbortSignal.timeout(8000),redirect:'error'});
  if(!r.ok)throw Error('Book discovery is temporarily unavailable.');
  const result:any=await r.json();if(!Array.isArray(result.docs))throw Error('Unexpected book response.');
  const books:Book[]=result.docs.slice(0,3).filter((b:any)=>typeof b.title==='string'&&/^\/works\/OL\d+W$/.test(b.key)).map((b:any)=>({title:b.title.slice(0,200),authors:Array.isArray(b.author_name)?b.author_name.filter((a:unknown)=>typeof a==='string').slice(0,3).map((a:string)=>a.slice(0,100)):[],year:Number.isInteger(b.first_publish_year)?b.first_publish_year:null,url:'https://openlibrary.org'+b.key}));
  cache.set(topic,{until:Date.now()+21600000,books});return books;
 })();pending.set(topic,job);
 try{return await job;}finally{pending.delete(topic);}
}
