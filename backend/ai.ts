// Server-only adapters. API keys and journal data never pass through public API directories.
export function aiConfiguration() {
 const provider=process.env.AI_PROVIDER || (process.env.AI_BASE_URL?.includes('openrouter.ai')?'openrouter':'openai');
 if(!['openai','openrouter'].includes(provider))throw Error('AI_PROVIDER must be openai or openrouter');
 const base=process.env.AI_BASE_URL || (provider==='openrouter'?'https://openrouter.ai/api/v1':'https://api.openai.com/v1');
 const imageProvider=process.env.AI_IMAGE_PROVIDER || provider;
 if(!['openai','openrouter'].includes(imageProvider))throw Error('AI_IMAGE_PROVIDER must be openai or openrouter');
 return {provider,base:base.replace(/\/$/,''),key:process.env.AI_API_KEY||'',model:process.env.AI_MODEL||(provider==='openrouter'?'openai/gpt-4o-mini':'gpt-4o-mini'),imageProvider,imageBase:(process.env.AI_IMAGE_BASE_URL||(imageProvider===provider?base:imageProvider==='openrouter'?'https://openrouter.ai/api/v1':'https://api.openai.com/v1')).replace(/\/$/,''),imageKey:process.env.AI_IMAGE_API_KEY||(imageProvider===provider?process.env.AI_API_KEY:'')||'',imageModel:process.env.AI_IMAGE_MODEL||(imageProvider==='openrouter'?'openai/gpt-image-1':'gpt-image-1')};
}
async function request(base:string,key:string,path:string,body:unknown) {
 if(!key)throw Error('Add the AI API key in your server configuration.');
 if(new URL(base).protocol!=='https:' && process.env.NODE_ENV!=='test')throw Error('AI endpoint must use HTTPS.');
 const r=await fetch(base+path,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000),redirect:'error'});
 // Never retry paid generation automatically or log upstream response bodies containing journal data.
 if(!r.ok)throw Error(r.status===401||r.status===403?'AI credentials were rejected.':r.status===429?'AI provider rate limit reached. Try later.':'AI provider is unavailable.');
 const result:any=await r.json();if(result.error)throw Error('AI provider returned an error.');return result;
}
export const ai={
 async generate(o:any){const c=aiConfiguration();const r=await request(c.base,c.key,'/chat/completions',{model:c.model,messages:[{role:'system',content:(o.system||'')+(o.schema?' Return only a JSON object matching this JSON schema: '+JSON.stringify(o.schema):'')},...(o.messages||[{role:'user',content:o.prompt}])],max_tokens:o.maxTokens||1000,...(o.schema?{response_format:{type:'json_object'}}:{})});const text=r.choices?.[0]?.message?.content;if(typeof text!=='string'||!text.trim())throw Error('AI returned no text.');return {text};},
 async imageGen(o:any){const c=aiConfiguration();const r=await request(c.imageBase,c.imageKey,c.imageProvider==='openrouter'?'/images':'/images/generations',{model:c.imageModel,prompt:o.prompt,size:'1024x1024',n:1});const image=r.data?.[0];const data=image?.b64_json;const mimeType=image?.media_type||'image/png';if(typeof data!=='string'||!data.length||data.length>8000000||!/^[A-Za-z0-9+/=\r\n]+$/.test(data)||!['image/png','image/jpeg','image/webp'].includes(mimeType))throw Error('AI returned an unsupported image.');return {image:{data,mimeType}};}
};
