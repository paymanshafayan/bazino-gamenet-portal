import {mkdirSync as ensureShotDir} from 'node:fs';
const REVIEW_DIR=process.env.PUBLISHING_REVIEW_DIR||'/home/user/.cache/bazino-v4';
const SHOTS=process.env.V4_SHOT_DIR||'/home/user/visual-testing/v4';ensureShotDir(SHOTS,{recursive:true});
import {launch} from './lib.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {createHmac} from 'node:crypto';
const env=Object.fromEntries(readFileSync(`${REVIEW_DIR}/runtime.env`,'utf8').trim().split('\n').map(l=>l.split('=')));
const base=process.env.BASE||'http://127.0.0.1:3000',batch=process.env.BATCH||'1';
const auth=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:env.PREVIEW_PASSWORD})}).then(r=>r.json());
if(!auth.token)throw Error('Review login failed');
const {browser,page,errors}=await launch();
await page.addInitScript(({token})=>{localStorage.setItem('bazino.authToken',token);localStorage.setItem('cyber_lang','fa');}, {token:auth.token});
await page.goto(base+'/admin/affiliates',{waitUntil:'domcontentloaded',timeout:90000});
await page.locator('[data-api-tokens]').waitFor({timeout:90000});
const result=await page.evaluate(async(token)=>{
 const h={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
 const call=async(p,method='GET',body)=>{const r=await fetch(p,{method,headers:h,body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(`${r.status}:${data.error}`);return data;};
 const conf=await call('/api/management/publishing/config');
 if(conf.config.data.defaultAgentId!=='builtin-manus')throw Error('Default missing');
 const pub=await fetch('/api/settings').then(r=>r.json());if(Object.keys(pub).some(k=>/^(publishing_|manus_|zernio_|ig_)/.test(k)))throw Error('Public settings leak');
 return {defaultAgentId:conf.config.data.defaultAgentId,configurationVersion:conf.config.version,secretLeak:false};
},auth.token);
if(Number(batch)>=2){
 const raw=' { "event": "webhook.test" } ',secret='local-browser-hook-only',sig=createHmac('sha256',secret).update(raw).digest('hex');
 const probe=await page.evaluate(async({token,secret,raw,sig})=>{
  const r=await fetch('/api/management/publishing/secrets/zernio_webhook_secret',{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({value:secret})});if(!r.ok)throw Error('Secret setup failed');
  for(const url of ['/api/webhooks/zernio','/api/integrations/zernio/webhook']){const p=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Zernio-Signature':sig},body:raw});const b=await p.json();if(!p.ok||b.outboundSent!==false||!b.test)throw Error('Signature/raw-body probe failed');}
  return {rawHmac:true,legacyAlias:true};
 },{token:auth.token,secret,raw,sig});Object.assign(result,probe);
}
if(Number(batch)>=3){
 await page.evaluate(async(token)=>{
  const h={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
  const api=async(p,m='GET',b)=>{const r=await fetch('/api/management/publishing'+p,{method:m,headers:h,body:b?JSON.stringify({...b,idempotencyKey:crypto.randomUUID()}):undefined});const d=await r.json();if(!r.ok)throw Error(d.error);return d;};
  const c=await api('/config');await api('/config','PUT',{...c.config.data,zernioAccountId:'local-account',outboundEnabled:false,version:c.config.version});
  const cp=(await api('/campaigns'))[0];await api('/campaigns/'+cp.id,'PUT',{...cp.data,accountId:'local-account',active:true,policyConfirmed:true,version:cp.version});
  await api('/media','POST',{media_id:'18109137383324992',media_type:'post',accountId:'local-account',campaign_id:cp.id});
 },auth.token);
 const ev={id:'browser-event-'+batch,event:'comment.received',account:{id:'local-account',platform:'instagram'},post:{platformPostId:'18109137383324992'},comment:{id:'browser-comment-'+batch,platformPostId:'18109137383324992',author:{id:String(99000+Number(batch)),username:'browser-fixture-'+batch},text:'Ready',createdAt:new Date().toISOString()},timestamp:new Date().toISOString()};
 const raw=JSON.stringify(ev),sig=createHmac('sha256','local-browser-hook-only').update(raw).digest('hex');
 await page.evaluate(async({raw,sig})=>{const r=await fetch('/api/webhooks/zernio',{method:'POST',headers:{'Content-Type':'application/json','X-Zernio-Signature':sig},body:raw});if(!r.ok)throw Error('Comment webhook failed');},{raw,sig});
 await page.waitForFunction(async({token,batch})=>{const r=await fetch('/api/management/publishing/members',{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)return false;return (await r.json()).some(m=>m.username==='browser-fixture-'+batch&&m.status==='partner_follow_pending'&&m.language==='en');},{token:auth.token,batch},{timeout:15000});
 Object.assign(result,{signedComment:true,queuedNotSent:true,correctLanguage:true});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-api-tokens]').waitFor({timeout:30000});
}
await page.screenshot({path:`${SHOTS}/batch${batch}.png`,fullPage:true});
writeFileSync(`${SHOTS}/batch${batch}.json`,JSON.stringify({result,errors},null,2));
console.log(JSON.stringify({batch,result,errorCount:errors.length}));
await browser.close();
