import {launch} from './lib.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {createHmac} from 'node:crypto';
const env=Object.fromEntries(readFileSync('/home/user/.cache/bazino-v4/runtime.env','utf8').trim().split('\n').map(l=>l.split('=')));
const base=process.env.BASE||'http://127.0.0.1:3000',batch=process.env.BATCH||'1';
const auth=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:env.PREVIEW_PASSWORD})}).then(r=>r.json());
if(!auth.token)throw Error('Review login failed');
const {browser,page,errors}=await launch();
await page.addInitScript(({token})=>{localStorage.setItem('bazino.authToken',token);localStorage.setItem('language','fa');}, {token:auth.token});
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
await page.screenshot({path:`/home/user/visual-testing/v4/batch${batch}.png`,fullPage:true});
writeFileSync(`/home/user/visual-testing/v4/batch${batch}.json`,JSON.stringify({result,errors},null,2));
console.log(JSON.stringify({batch,result,errorCount:errors.length}));
await browser.close();
