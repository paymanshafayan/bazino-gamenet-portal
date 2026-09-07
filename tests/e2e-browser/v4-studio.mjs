import {mkdirSync as ensureShotDir} from 'node:fs';
const REVIEW_DIR=process.env.PUBLISHING_REVIEW_DIR||'/home/user/.cache/bazino-v4';
const SHOTS=process.env.V4_SHOT_DIR||'/home/user/visual-testing/v4';ensureShotDir(SHOTS,{recursive:true});
import {launch} from './lib.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const env=Object.fromEntries(readFileSync(`${REVIEW_DIR}/runtime.env`,'utf8').trim().split('\n').map(l=>l.split('=')));
const base=process.env.BASE||'http://127.0.0.1:3000';
const auth=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:env.PREVIEW_PASSWORD})}).then(r=>r.json());
if(!auth.token)throw Error('Review login failed');const report=[];
for(const [lang,width] of [['fa',1440],['en',1440],['tr',390],['ru',390]]){
 const {browser,page,errors}=await launch({width,height:1000});
 await page.addInitScript(({jwt,lang})=>{localStorage.setItem('bazino.authToken',jwt);localStorage.setItem('cyber_lang',lang);},{jwt:auth.token,lang});
 await page.goto(base+'/admin/content',{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('[data-agent-card]').count();await page.locator('[data-publishing-mode=manual]').waitFor({timeout:30000});
 await page.waitForFunction(()=>document.querySelector('.pub-endpoint code')?.textContent?.includes('/api/webhooks/zernio'));
 if(['fa','en'].includes(lang))await page.screenshot({path:`${SHOTS}/studio-overview-${lang}.png`,fullPage:true});
 await page.locator('[data-publishing-mode=manual]').click();await page.locator('.pub-success').waitFor();
 await page.locator('[data-pub-tab=agents]').click();await page.locator('[data-agent-card=builtin-manus]').waitFor();
 if(lang==='fa'){
   await page.locator('[data-agent-card=builtin-manus] .pub-secondary').first().click();await page.locator('[role=dialog]').waitFor();
   await page.locator('[data-agent-api-key]').fill('ui-local-test-key-never-persist');
   await page.locator('[role=dialog] form > .pub-primary').click();await page.locator('[role=dialog]').waitFor({state:'detached'});
   const stored=await page.evaluate(()=>JSON.stringify(localStorage));if(stored.includes('ui-local-test-key-never-persist'))throw Error('Credential leaked into browser storage');
 }
 if(['fa','ru'].includes(lang))await page.screenshot({path:`${SHOTS}/studio-agents-${lang}.png`,fullPage:true});
 await page.locator('[data-pub-tab=settings]').click();if(['fa','tr'].includes(lang))await page.screenshot({path:`${SHOTS}/studio-settings-${lang}.png`,fullPage:true});
 await page.locator('[data-pub-tab=campaigns]').click();await page.locator('.pub-card-grid .pub-secondary').first().click();await page.locator('[role=dialog]').waitFor();if(['fa','tr'].includes(lang)){await page.evaluate(()=>window.scrollTo(0,0));await page.setViewportSize({width,height:1800});await page.screenshot({path:`${SHOTS}/studio-campaign-${lang}-full.png`,fullPage:true});await page.setViewportSize({width,height:1000});}await page.keyboard.press('Escape');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);if(overflow)throw Error('Studio horizontal overflow');
 report.push({lang,width,errors,overflow});await browser.close();
}
writeFileSync(`${SHOTS}/studio-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
