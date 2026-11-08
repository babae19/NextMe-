/* Generic browser reminders only. No offline journal cache or analytics. */
self.addEventListener('push', event => {
 let message;try {message=event.data.json();} catch {message={};}
 event.waitUntil(self.registration.showNotification('A moment for you · NextMe', {
  body:typeof message.body==='string'?message.body:'Your journal is here when you are ready.',
  tag:typeof message.tag==='string'?message.tag:'nextme-reminder',
  data:{url:'/'},
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
  for(const client of clients)if(new URL(client.url).origin===self.location.origin)return client.focus();
  return self.clients.openWindow('/');
 }));
});
