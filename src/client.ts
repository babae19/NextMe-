async function request(method:string,url:string,body?:unknown) {
 const response=await fetch(url,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await response.json(); if(!response.ok)throw new Error(data.message||'Request failed');return {data};
}
export const api={get:(u:string)=>request('GET',u),post:(u:string,b?:unknown)=>request('POST',u,b),put:(u:string,b?:unknown)=>request('PUT',u,b),delete:(u:string)=>request('DELETE',u)};
export const auth={
 isSignedIn:()=>true,
 async getUser(){return (await api.get('/api/auth/me')).data.user;},
 async signOut(){await api.post('/api/auth/logout');},
 async signIn(){return new Promise<void>((resolve,reject)=>{
 const dialog=document.createElement('dialog');dialog.className='account-dialog';
 dialog.innerHTML=`<form><h2>Your NextMe account</h2><p>Sign in or create a private journal account.</p><label>Email<input name="email" type="email" required autocomplete="email"></label><label>Password<input name="password" type="password" required minlength="12" autocomplete="current-password"></label><p role="alert" class="account-error"></p><button type="submit" value="login">Sign in</button><button type="submit" value="register">Create account</button><button type="button" class="cancel">Cancel</button></form>`;
 const close=()=>{dialog.close();dialog.remove();};
 dialog.querySelector('.cancel')!.addEventListener('click',()=>{close();reject(Error('Sign-in cancelled'));});
 dialog.addEventListener('cancel',()=>{close();reject(Error('Sign-in cancelled'));});
 dialog.querySelector('form')!.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget as HTMLFormElement;const data=new FormData(form);const action=(e as SubmitEvent).submitter as HTMLButtonElement;const buttons=dialog.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);try{await api.post('/api/auth/'+action.value,{email:data.get('email'),password:data.get('password')});close();resolve();}catch(err){dialog.querySelector('[role=alert]')!.textContent=err instanceof Error?err.message:'Sign-in failed';buttons.forEach(b=>b.disabled=false);}});
 document.body.append(dialog);dialog.showModal();
 });}
};
export const notifications={async getEnableGuidance(){return {message:'Scheduled push reminders are not configured on this server.',steps:['Use the calendar download to set a reminder.']};},async subscribe(){throw Error('Push reminders are not configured. Use the calendar download.');}};
