/** Real UI capture; requires a local isolated installation. Never submits forms. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {launch} from './lib.mjs';
import {assertCurrentPanel} from './manual-capture-guards.mjs';
const BASE=process.env.MANUAL_BASE||'http://127.0.0.1:3000';
if(!['localhost','127.0.0.1'].includes(new URL(BASE).hostname))throw new Error('Local training server only.');
const session=JSON.parse(fs.readFileSync(process.env.MANUAL_SESSION||`${process.env.MANUAL_RUNTIME||os.tmpdir()+'/bazino-admin-manual'}/session.json`,'utf8'));
const assets=path.resolve(process.env.MANUAL_OUTPUT||'public/admin-manual/assets');
fs.mkdirSync(assets,{recursive:true});
const runtime=process.env.MANUAL_RUNTIME||os.tmpdir()+'/bazino-admin-manual';
fs.mkdirSync(runtime,{recursive:true});
const {browser,context,page,errors}=await launch({width:1440,height:1000});
await context.route('**/*',route=>{
 const u=new URL(route.request().url());
 if(u.origin!==new URL(BASE).origin && ['http:','https:'].includes(u.protocol))return route.abort();
 return route.fallback();
});
await page.addInitScript(token=>{localStorage.setItem('bazino.authToken',token);localStorage.setItem('cyber_lang','fa');},session.token);
const sections=['dashboard','systems','tournaments','tournamentOps','cafe','shop','wallet','promotions','affiliates','messaging','messages','chat','tickets','content','blog','appSlider','themes','customization','mobileAppDownload','presentation','apiKeys','dbLogs','migrations'];
const results=[];
async function shot(name){
 await page.addStyleTag({content:`@font-face{font-family:ManualVazir;src:url('/admin-manual/assets/Vazirmatn-Regular.woff2')} body,input,button,textarea,select{font-family:ManualVazir,sans-serif!important} *{animation:none!important;transition:none!important}`});
 await page.evaluate(()=>document.fonts.ready);
 await assertCurrentPanel(page);
 if(name==='dashboard')await page.locator('#admin-wrap').screenshot({path:assets+'/navigation.png'});
 const b=await page.locator('#admin-body-content').boundingBox();
 await page.screenshot({path:assets+'/'+name+'.png',clip:{x:b.x,y:b.y,width:b.width,height:Math.min(b.height,850)}});
 fs.writeFileSync(runtime+'/'+name+'.txt',await page.locator('body').innerText());
}
for(const sec of sections){
 const before=errors.length;
 await page.goto(BASE+(sec==='dashboard'?'/admin':'/admin/'+sec),{waitUntil:'networkidle',timeout:90000});
 await page.waitForTimeout(350);
 await page.locator('#admin-body').waitFor({timeout:20000});
 await shot(sec);
 const info=await page.locator('#admin-body').evaluate(el=>({text:el.innerText,controls:[...el.querySelectorAll('input,select,textarea,button')].map(e=>({tag:e.tagName,type:e.type,placeholder:e.getAttribute('placeholder'),text:e.tagName==='SELECT'?[...e.options].map(o=>o.text).join(' | '):e.innerText,value:e.type==='password'?'[redacted]':e.value}))}));
 fs.writeFileSync(runtime+'/'+sec+'.json',JSON.stringify(info,null,2));
 results.push({section:sec,url:sec==='dashboard'?'/admin':'/admin/'+sec,image:'assets/'+sec+'.png',title:await page.title(),pageErrors:errors.slice(before).filter(x=>x.startsWith('pageerror:'))});
 console.log('Captured',sec,info.text.length);
}
fs.writeFileSync(runtime+'/capture-results.json',JSON.stringify(results,null,2));
await browser.close();
