/** Opt-in, ONE-TIME setup of a fresh, disposable localhost installation.
 * Start the server yourself with a new BAZINO_DATA_DIR outside the repository.
 * Never point this at a real club, even through localhost/tunnelling.
 */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const base=new URL(process.env.MANUAL_BASE||'http://127.0.0.1:3000').origin;
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local training server only');
if(process.env.MANUAL_TRAINING_SETUP!=='YES_CREATE_TRAINING_DATA')throw Error('Explicit MANUAL_TRAINING_SETUP=YES_CREATE_TRAINING_DATA required');
if(!process.env.MANUAL_RUNTIME)throw Error('MANUAL_RUNTIME must be an external disposable directory');
const runtime=path.resolve(process.env.MANUAL_RUNTIME),repo=process.cwd();
if(runtime===repo||runtime.startsWith(repo+path.sep))throw Error('Do not save training credentials/database inside the repository');
fs.mkdirSync(runtime,{recursive:true,mode:0o700});
if(fs.existsSync(runtime+'/session.json'))throw Error('Session already exists; refusing to repeat setup');
const status=await fetch(base+'/api/install/status').then(r=>r.json());
if(status.isInstalled)throw Error('Target is already installed. Refusing to modify it.');
let token;
async function api(url,body){const r=await fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Error(`${url}: HTTP ${r.status}`);return j;}
const password=crypto.randomBytes(24).toString('hex');
const installed=await api('/api/install/setup',{storeName:'بازینو — محیط آموزشی',adminEmail:'training@example.test',adminUsername:'guide_admin',adminPassword:password,dbType:'sqlite',dbConfig:{},installSampleData:true});
token=installed.token;if(!token)throw Error('Setup did not return a session');
fs.writeFileSync(runtime+'/session.json',JSON.stringify({token,password}),{mode:0o600,flag:'wx'});
for(const [key,value] of Object.entries({club_phone:'+1 202 555 0142',club_address:'خیابان نمونه، پلاک ۱۲ — نشانی آموزشی',company_legal_name:'باشگاه آموزشی بازینو',company_email:'training@example.test',company_country:'نمونه',data_source:'database'}))await api('/api/admin/settings',{key,value});
await api('/api/management/customers',{displayName:'مشتری آموزشی',phone:'+12025550148',idempotencyKey:crypto.randomUUID()});
await api('/api/me/tickets',{subject:'درخواست آموزشی درباره رزرو',message:'این یک تیکت آزمایشی است. برای رزرو سیستم در روز مسابقه چه مراحلی را انجام دهم؟',category:'reservation',priority:'normal'});
console.log('Training seed ready. Session is stored locally with mode 0600; no credentials printed.');
