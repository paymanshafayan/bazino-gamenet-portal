/** Isolated production Chromium run. All credentials/files here are disposable test fixtures. */
import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {randomBytes} from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const review=path.join(os.homedir(),'.cache',`bazino-v4-browser-${Date.now()}`);fs.mkdirSync(review,{recursive:true});
const shots=process.env.V4_SHOT_DIR||path.join(root,'tests/e2e-browser/shots/v4');fs.mkdirSync(shots,{recursive:true});
const secret=randomBytes(32).toString('hex'),key=randomBytes(32).toString('hex'),password=randomBytes(20).toString('hex');
fs.writeFileSync(path.join(review,'runtime.env'),`JWT_SECRET=${secret}\nBAZINO_SECRETS_KEY=${key}\nPREVIEW_PASSWORD=${password}\n`,{mode:0o600});
const port=String(process.env.V4_BROWSER_PORT||3460),base=`http://127.0.0.1:${port}`;
const fonts=path.join(review,'fonts');fs.mkdirSync(fonts);const fontSrc=path.join(root,'tests/e2e-browser/node_modules/vazirmatn/fonts/ttf');
for(const name of fs.readdirSync(fontSrc))if(name.endsWith('.ttf'))fs.copyFileSync(path.join(fontSrc,name),path.join(fonts,name));
// Vazirmatn covers Persian/Latin, not Cyrillic. A closed custom fontconfig without
// a system fallback silently made Russian text invisible in otherwise-green DOM tests.
const fallbackDir='/usr/share/fonts/truetype/dejavu';
if(!fs.existsSync(path.join(fallbackDir,'DejaVuSans.ttf')))throw Error('Browser review requires DejaVu Sans for Cyrillic; install fonts-dejavu-core.');
for(const name of fs.readdirSync(fallbackDir))if(name.startsWith('DejaVuSans')&&name.endsWith('.ttf'))fs.copyFileSync(path.join(fallbackDir,name),path.join(fonts,name));
fs.writeFileSync(path.join(fonts,'fonts.conf'),`<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${fonts}</dir><cachedir>${review}/fontcache</cachedir><alias><family>sans-serif</family><prefer><family>Vazirmatn</family><family>DejaVu Sans</family></prefer></alias></fontconfig>`);
const env={...process.env,PORT:port,BASE:base,NODE_ENV:'production',JWT_SECRET:secret,BAZINO_SECRETS_KEY:key,PREVIEW_PASSWORD:password,PUBLISHING_REVIEW_DIR:review,BAZINO_DATA_DIR:review,PUBLISHING_REVIEW_SEED:'1',V4_SHOT_DIR:shots,FONTCONFIG_PATH:fonts,FONTCONFIG_FILE:path.join(fonts,'fonts.conf'),LD_LIBRARY_PATH:'/tmp/al2023/lib',MONGO_URL:'',MONGODB_URI:'',ZERNIO_API_KEY:'',MANUS_API_KEY:'',ZERNIO_ACCOUNT_ID:'',ZERNIO_IG_ACCOUNT_ID:'',ZERNIO_WEBHOOK_SECRET:'',ZERNIO_ANALYTICS_WEBHOOK_SECRET:'',IG_INGEST_TOKEN:'',SMS_PROVIDER:'mock',PAYMENT_ONLINE_ENABLED:'0'};
function run(command,args){const r=spawnSync(command,args,{cwd:root,env,stdio:'inherit'});if(r.status!==0)throw Error(`Test step failed: ${args.join(' ')} (exit ${r.status})`);}
let server,log='';
const stop=()=>{if(server&&server.exitCode===null)server.kill('SIGTERM');};
process.on('exit',stop);process.on('SIGINT',()=>{stop();process.exit(1);});
try{
 run(process.execPath,['scripts/prepare-media-tools.mjs']);run(process.execPath,['tests/e2e-browser/bootstrap.cjs','--ready']);
 run(path.join(root,'node_modules/.bin/tsx'),['scripts/seed-publishing-review.mts']);run(process.execPath,['scripts/create-media-fixtures.mjs']);
 server=spawn(process.execPath,['dist/server.cjs'],{cwd:root,env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',d=>{log+=d;});server.stderr.on('data',d=>{log+=d;});
 const start=Date.now();for(;;){if(server.exitCode!==null)throw Error('Production server exited: '+log.slice(-2000));const r=await fetch(base+'/api/systems').catch(()=>null);if(r?.ok)break;if(Date.now()-start>45000)throw Error('Production boot timed out: '+log.slice(-2000));await new Promise(r=>setTimeout(r,200));}
 env.BATCH='3';
 for(const script of ['v4-progress.mjs','v4-studio.mjs','v4-gate.mjs','v4-profile.mjs','v4-composer.mjs','v4-management.mjs'])run(process.execPath,[`tests/e2e-browser/${script}`]);
 // Actual process restart against the same volume: not just a second in-memory service.
 const exited=new Promise(resolve=>server.once('exit',resolve));stop();await exited;
 server=spawn(process.execPath,['dist/server.cjs'],{cwd:root,env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',d=>{log+=d;});server.stderr.on('data',d=>{log+=d;});
 const restartAt=Date.now();while(true){const r=await fetch(base+'/api/systems').catch(()=>null);if(r?.ok)break;if(Date.now()-restartAt>30000)throw Error('Restart did not become ready');await new Promise(r=>setTimeout(r,200));}
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password})}).then(r=>r.json());
 const h={Authorization:`Bearer ${login.token}`};
 const assetList=await fetch(base+'/api/management/publishing/assets',{headers:h}).then(r=>r.json());const readyAsset=assetList.assets.find(a=>a.data.status==='ready');if(!readyAsset)throw Error('Media metadata lost on restart');
 const preview=await fetch(base+`/api/management/publishing/assets/${readyAsset.id}/preview`,{headers:h}).then(r=>r.json());const file=await fetch(base+preview.url);if(!file.ok||(await file.arrayBuffer()).byteLength<100)throw Error('Media bytes lost on restart');
 const config=await fetch(base+'/api/management/publishing/config',{headers:h}).then(r=>r.json());if(config.config.data.defaultAgentId!=='builtin-manus'||config.config.data.outboundEnabled!==false)throw Error('Configuration changed on restart');
 console.log('Production process restart: media bytes, metadata, default agent and paused delivery preserved.');
 console.log(`Production Chromium suite passed. Screenshots: ${shots}`);
 fs.writeFileSync(path.join(shots,'production-run.json'),JSON.stringify({passed:true,node:process.version,completedAt:new Date().toISOString(),onlinePayments:false,realProviderCalls:false,processRestartVerified:true},null,2));
}catch(e){console.error(String(e));console.error(log.slice(-3000));process.exitCode=1;}finally{stop();await new Promise(r=>setTimeout(r,300));fs.rmSync(review,{recursive:true,force:true});}
