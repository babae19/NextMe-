/** Render supplies the canonical onrender.com URL. APP_ORIGIN overrides it for a custom domain. */
export function appOrigin() {
 const value=process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL;
 if(!value)return '';
 const url=new URL(value);
 if(url.username||url.password||!['http:','https:'].includes(url.protocol)||process.env.NODE_ENV==='production'&&url.protocol!=='https:')throw Error('Configure a valid HTTPS APP_ORIGIN.');
 return url.origin;
}

export const demoOnly = () => process.env.DEMO_ONLY === 'true';
