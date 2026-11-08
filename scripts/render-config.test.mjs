import test from 'node:test';
import assert from 'node:assert/strict';
import { appOrigin } from '../backend/config.ts';
test('Render origin auto-configuration and custom domain override are secure',()=>{
 const original={APP_ORIGIN:process.env.APP_ORIGIN,RENDER_EXTERNAL_URL:process.env.RENDER_EXTERNAL_URL,NODE_ENV:process.env.NODE_ENV};
 try{
  process.env.NODE_ENV='production';delete process.env.APP_ORIGIN;
  process.env.RENDER_EXTERNAL_URL='https://nextme-example.onrender.com';
  assert.equal(appOrigin(),'https://nextme-example.onrender.com');
  process.env.APP_ORIGIN='https://journal.example.com/';assert.equal(appOrigin(),'https://journal.example.com');
  process.env.APP_ORIGIN='http://journal.example.com';assert.throws(appOrigin,/HTTPS/);
  process.env.APP_ORIGIN='https://name:password@example.com';assert.throws(appOrigin,/HTTPS/);
  delete process.env.APP_ORIGIN;delete process.env.RENDER_EXTERNAL_URL;assert.equal(appOrigin(),'');
 }finally{for(const [key,value]of Object.entries(original)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
