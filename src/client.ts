async function request(method:string,url:string,body?:unknown) {
 const response=await fetch(url,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await response.json(); if(!response.ok)throw new Error(data.message||'Request failed');return {data};
}
export const api={get:(u:string)=>request('GET',u),post:(u:string,b?:unknown)=>request('POST',u,b),put:(u:string,b?:unknown)=>request('PUT',u,b),delete:(u:string)=>request('DELETE',u)};
export const runtime={demoOnly:false};
export const auth={
 isSignedIn:()=>true,
 async getUser(){const r=await api.get('/api/auth/me');runtime.demoOnly=r.data.demoOnly===true;return r.data.user;},
 async signOut(){try { await notifications.unregister(); } finally { await api.post('/api/auth/logout'); }},
 async signIn(){await auth.getUser();if(runtime.demoOnly)throw Error('This free preview uses sample data. Private accounts will open after persistent storage is connected.');if(window.location.hostname==='appassets.androidplatform.net')throw Error('Tap Connect in the Android toolbar to use your deployed NextMe website.');return new Promise<void>((resolve,reject)=>{
 const dialog=document.createElement('dialog');dialog.className='account-dialog';
 dialog.innerHTML=`<form><h2>Your NextMe account</h2><p>Sign in or create a private journal account.</p><label>Email<input name="email" type="email" required autocomplete="email"></label><label>Password<input name="password" type="password" required minlength="12" autocomplete="current-password"></label><p role="alert" class="account-error"></p><button type="submit" value="login">Sign in</button><button type="submit" value="register">Create account</button><button type="button" class="cancel">Cancel</button></form>`;
 const close=()=>{dialog.close();dialog.remove();};
 dialog.querySelector('.cancel')!.addEventListener('click',()=>{close();reject(Error('Sign-in cancelled'));});
 dialog.addEventListener('cancel',()=>{close();reject(Error('Sign-in cancelled'));});
 dialog.querySelector('form')!.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget as HTMLFormElement;const data=new FormData(form);const action=(e as SubmitEvent).submitter as HTMLButtonElement;const buttons=dialog.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);try{await api.post('/api/auth/'+action.value,{email:data.get('email'),password:data.get('password')});close();resolve();}catch(err){dialog.querySelector('[role=alert]')!.textContent=err instanceof Error?err.message:'Sign-in failed';buttons.forEach(b=>b.disabled=false);}});
 document.body.append(dialog);dialog.showModal();
 });}
};
export const notifications={
 async getEnableGuidance(){return {message:'Browser reminders are optional and contain no journal text.',steps:['Allow notifications when you choose Enable. HTTPS is required; on iPhone or iPad, add NextMe to your Home Screen first. Delivery depends on your browser, device and the running server.']};},
 async subscribe(){
  if(!window.isSecureContext||!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw Error('This browser does not support push here. Use HTTPS or download a calendar reminder.');
  const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Notification permission was not granted.');
  const {data}=await api.get('/api/push/key');
  await navigator.serviceWorker.register('/sw.js');
  const registration=await navigator.serviceWorker.ready;
  const bytes=Uint8Array.from(atob(data.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
  let subscription=await registration.pushManager.getSubscription();
  if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
  await api.post('/api/push/subscription',{subscription:subscription.toJSON()});
 },
 async unregister(){
  if(!('serviceWorker' in navigator))return;
  const registration=await navigator.serviceWorker.getRegistration('/');
  const subscription=await registration?.pushManager.getSubscription();
  if(subscription)await api.delete('/api/push/subscription?endpoint='+encodeURIComponent(subscription.endpoint));
 }
};
