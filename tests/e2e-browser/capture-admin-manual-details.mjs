/** Safe detail exploration on a disposable local database. Creates a demo draft and
 * a demo system only when MANUAL_ALLOW_TRAINING_WRITES=1; never publishes or pays. */
import fs from 'node:fs';
import os from 'node:os';
import {launch} from './lib.mjs';
import {assertCurrentPanel} from './manual-capture-guards.mjs';
const BASE=process.env.MANUAL_BASE||'http://127.0.0.1:3000';
if(!['localhost','127.0.0.1'].includes(new URL(BASE).hostname))throw Error('Local training environment required');
const {token}=JSON.parse(fs.readFileSync(process.env.MANUAL_SESSION||`${process.env.MANUAL_RUNTIME||os.tmpdir()+'/bazino-admin-manual'}/session.json`));
const OUT=(process.env.MANUAL_OUTPUT||'public/admin-manual/assets')+'/',RUNTIME=(process.env.MANUAL_RUNTIME||os.tmpdir()+'/bazino-admin-manual')+'/';
fs.mkdirSync(RUNTIME,{recursive:true});fs.mkdirSync(OUT,{recursive:true});
const {browser,context,page,errors}=await launch({width:1440,height:1100});
await context.route('**/*',r=>new URL(r.request().url()).origin!==new URL(BASE).origin&&r.request().url().startsWith('http')?r.abort():r.fallback());
await page.addInitScript(t=>{localStorage.setItem('bazino.authToken',t);localStorage.setItem('cyber_lang','fa');},token);
async function go(sec){await page.goto(BASE+'/admin/'+sec,{waitUntil:'networkidle',timeout:90000});await page.locator('#admin-body').waitFor();await page.addStyleTag({content:`@font-face{font-family:ManualVazir;src:url('/admin-manual/assets/Vazirmatn-Regular.woff2')}body,input,button,textarea,select{font-family:ManualVazir,sans-serif!important}*{animation:none!important;transition:none!important}`});await page.evaluate(()=>document.fonts.ready);await assertCurrentPanel(page);}
async function shot(name,selector='#admin-body-content'){
 await page.waitForTimeout(500);
 const el=page.locator(selector).first();await el.scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);
 const b=await el.boundingBox();
 await page.screenshot({path:OUT+name+'.png',clip:{x:Math.max(0,b.x),y:Math.max(0,b.y),width:Math.min(b.width,1440-Math.max(0,b.x)),height:Math.min(b.height,950)}});
 fs.writeFileSync(RUNTIME+name+'.txt',await page.locator('body').innerText());console.log('Detail',name);
}
const result=[];const only=process.env.MANUAL_ONLY?.split(',');async function run(name,fn){if(only&&!only.includes(name))return;try{await fn();result.push({name,status:'ok'});}catch(e){console.log('FAILED',name,String(e).slice(0,260));result.push({name,status:'failed',error:String(e).slice(0,200)});}}
await run('systems-example',async()=>{await go('systems');await page.locator('#admin-body form input').nth(0).fill('PS5 آموزشی شماره ۶');await page.locator('#admin-body form select').selectOption('PS5');await page.locator('#admin-body form input[type=number]').fill('150');await shot('systems-example');if(process.env.MANUAL_ALLOW_TRAINING_WRITES==='1'){await page.locator('#admin-body form button[type=submit]').click();await page.waitForTimeout(5500);if(!await page.locator('#admin-body').innerText().then(x=>x.includes('PS5 آموزشی شماره ۶')))throw Error('Created record missing');await shot('systems-saved');}});
await run('systems-saved-review',async()=>{if(!only)return;await go('systems');await shot('systems-saved');});
await run('wallet-account',async()=>{await go('wallet');await page.locator('[data-wallet-customer]').selectOption('12025550148');await page.waitForTimeout(500);await shot('wallet-account');await page.locator('[data-wallet-amount]').fill('200');await page.getByRole('button',{name:'انتخاب روش دریافت',exact:true}).click();await shot('wallet-payment','[role=dialog]');await page.locator('[data-ops-method=pos]').click();await shot('wallet-pos','[role=dialog]');await page.keyboard.press('Escape');await page.getByRole('button',{name:'نقدکردن',exact:true}).click();await shot('wallet-cashout');});
await run('wallet-new',async()=>{await go('wallet');await page.getByRole('button',{name:'مشتری جدید',exact:true}).click();await shot('wallet-new','[role=dialog]');});
await run('coupon',async()=>{await go('promotions');await page.getByRole('button',{name:'کوپن جدید',exact:true}).click();await page.locator('[data-coupon-code]').fill('BAZINO10');await shot('coupon-form','[role=dialog]');await page.keyboard.press('Escape');await page.getByRole('button',{name:/ساعات رایگان/}).click();await page.getByRole('button',{name:'ساعت ویژه جدید',exact:true}).click();await page.getByPlaceholder('مثلاً ساعات رایگان جمعه').fill('نیم‌بهای عصر — نمونه');await shot('hours-form','[role=dialog]');});
await run('tournament-detail',async()=>{await go('tournamentOps');await page.getByRole('button',{name:'مدیریت',exact:true}).nth(1).click();await shot('tournament-detail');await page.getByRole('button',{name:'ثبت‌نام حضوری تیم',exact:true}).click();await shot('tournament-register','[role=dialog]');});
await run('ticket-thread',async()=>{await go('tickets');await page.locator('[data-admin-ticket-row]').first().click();await page.locator('[data-admin-reply-form] textarea').fill('سلام؛ ابتدا از بخش بازی‌ها سیستم و بازه زمانی را انتخاب کنید. این پاسخ صرفاً نمونه آموزشی است.');await shot('ticket-thread');});
await run('content-tabs',async()=>{await go('content');await page.getByRole('button',{name:/تولید تصویر/}).click();await page.locator('#admin-body input[placeholder="عنوان"]').fill('پوستر مسابقه — نمونه');await page.getByPlaceholder('توضیح عکس').fill('پوستر ساده برای معرفی مسابقه فوتبال کنسولی، بدون اطلاعات شخصی و بدون نشان تجاری دیگران.');await shot('content-image');await page.getByRole('button',{name:/ترندها/}).click();await shot('content-trends');await page.getByRole('button',{name:/صف انتشار/}).click();await shot('content-queue');});
await run('themes-upload',async()=>{await go('themes');await page.locator('#admin-body').getByRole('button',{name:'آپلود',exact:true}).click();await shot('themes-upload');});
await run('settings-legal',async()=>{await go('customization');await page.locator('#admin-body').getByRole('button',{name:'FA',exact:true}).click();await page.locator('[data-legal-admin] > div').nth(1).screenshot({path:OUT+'settings-legal.png'});});
await run('publishing-tabs',async()=>{await go('affiliates');for(const tab of ['overview','posts','campaigns','media','events','agents','settings','telegram','legacy']){await page.locator(`[data-pub-tab=${tab}]`).click();await shot('publishing-'+tab,'[data-publishing-studio]');}
 if(process.env.MANUAL_ALLOW_TRAINING_WRITES==='1'){await page.locator('[data-pub-tab=posts]').click();await page.locator('[data-new-post]').click();await page.locator('[data-post-title]').fill('معرفی مسابقه آموزشی');await page.locator('[data-post-caption]').fill('این متن یک پیش‌نویس آموزشی است و برای شبکه اجتماعی ارسال نمی‌شود.');await shot('publishing-editor','[data-post-manager]');await page.locator('[data-save-post]').click();await page.waitForTimeout(500);}
 await page.locator('[data-pub-tab=campaigns]').click();await page.locator('[data-publishing-studio]').getByRole('button',{name:'ویرایش',exact:true}).first().click();await shot('campaign-form','.pub-modal');await page.getByText('سیاست مالی — نیازمند تأیید مالک',{exact:true}).click();await page.locator('details').filter({has:page.getByText('سیاست مالی — نیازمند تأیید مالک',{exact:true})}).screenshot({path:OUT+'campaign-finance.png'});});
await run('affiliate-register',async()=>{await go('affiliates');await page.locator('section').filter({has:page.locator('[data-new=username]')}).last().screenshot({path:OUT+'affiliate-register.png'});});
await run('jarvis-menu',async()=>{await go('dashboard');await page.getByRole('button',{name:/فنی/}).click();const b=page.getByRole('button',{name:'جارویس',exact:true});await b.click();await shot('jarvis');});
await run('login',async()=>{
 // Isolated browser avoids auth/language state leaking between single-process contexts.
 const isolated=await launch({width:1440,height:1000});const anonymous=isolated.context,login=isolated.page;
 try {
  await anonymous.route('**/*',r=>r.request().url().startsWith('http')&&new URL(r.request().url()).origin!==new URL(BASE).origin?r.abort():r.fallback());
  await anonymous.addInitScript(()=>localStorage.setItem('cyber_lang','fa'));
  await login.goto(BASE+'/',{waitUntil:'networkidle'});
  // Wait for the real auth opener to hydrate before clicking the navigation control.
  await login.waitForTimeout(700);
  await login.getByRole('button',{name:'ورود',exact:true}).first().click();
  await login.getByRole('tab',{name:'رمز عبور',exact:true}).click();await login.locator('#auth-username').fill('guide_admin');
  await login.addStyleTag({content:`@font-face{font-family:ManualVazir;src:url('/admin-manual/assets/Vazirmatn-Regular.woff2')}body,input,button{font-family:ManualVazir,sans-serif!important}`});
  await login.evaluate(()=>document.fonts.ready);
  const card=await login.locator('[data-auth-modal] > div').nth(1).boundingBox();
  if(!card)throw Error('Auth card missing');
  // Crop inside the rounded card: includes tabs, excludes the public theme/backdrop.
  await login.screenshot({path:OUT+'login-password.png',clip:{x:card.x+24,y:card.y+24,width:card.width-48,height:card.height-48}});
 } finally {await isolated.browser.close();}
});
const previous=only&&fs.existsSync(RUNTIME+'details-results.json')?JSON.parse(fs.readFileSync(RUNTIME+'details-results.json')):{result:[],pageErrors:[]};
const combined=[...previous.result.filter(r=>!result.some(n=>n.name===r.name)),...result];
fs.writeFileSync(RUNTIME+'details-results.json',JSON.stringify({result:combined,pageErrors:errors.filter(x=>x.startsWith('pageerror:'))},null,2));
await browser.close();

if(result.some(r=>r.status!=="ok"))process.exitCode=1;
