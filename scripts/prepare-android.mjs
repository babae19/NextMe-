import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
execFileSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{stdio:'inherit'});
const target='android/app/src/main/assets';
rmSync(target,{recursive:true,force:true});mkdirSync(target,{recursive:true});cpSync('dist',target,{recursive:true});
console.log('Bundled the NextMe sample. Connect a deployed HTTPS website inside the Android app for account and AI features.');
