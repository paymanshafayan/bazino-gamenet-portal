import {mkdirSync as ensureShotDir} from 'node:fs';
const REVIEW_DIR=process.env.PUBLISHING_REVIEW_DIR||'/home/user/.cache/bazino-v4';
const SHOTS=process.env.V4_SHOT_DIR||'/home/user/visual-testing/v4';ensureShotDir(SHOTS,{recursive:true});
import {launch} from './lib.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const env=Object.fromEntries(readFileSync(`${REVIEW_DIR}/runtime.env`,'utf8').trim().split('\n').map(l=>l.split('=')));
const {id,token}=JSON.parse(readFileSync(`${REVIEW_DIR}/invite.json`,'utf8'));
const base=process.env.BASE||'http://127.0.0.1:3000';
const auth=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'review_gamer',password:env.PREVIEW_PASSWORD})}).then(r=>r.json());
if(!auth.token)throw Error('Fixture login failed');
const report=[];
for(const [lang,width] of [['en',1440],['tr',390],['ru',390],['fa',1440]]){
 const {browser,page,errors}=await launch({width,height:1000});
 await page.addInitScript(({jwt,lang})=>{localStorage.setItem('bazino.authToken',jwt);localStorage.setItem('cyber_lang',lang);},{jwt:auth.token,lang});
 const r=await page.goto(`${base}/ig/invite/${id}?token=${token}`,{waitUntil:'domcontentloaded',timeout:60000});
 if(r.headers()['referrer-policy']!=='no-referrer')throw Error('Private invitation lacks referrer protection');
 await page.locator('.ig-check input').first().waitFor({timeout:30000});
 if(await page.locator('.ig-claim .ig-primary').isEnabled())throw Error('Gate should require consent');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);if(overflow)throw Error('Horizontal overflow');
 await page.screenshot({path:`${SHOTS}/gate-${lang}.png`,fullPage:true});
 if(lang==='fa'){
   await page.locator('.ig-check input').nth(0).check();await page.locator('.ig-check input').nth(1).check();await page.locator('.ig-claim .ig-primary').click();
   await page.locator('[data-invite-result] code').waitFor({timeout:15000});
   await page.screenshot({path:`${SHOTS}/gate-activated.png`,fullPage:true});
 }
 report.push({language:lang,width,errors,overflow});await browser.close();
}
writeFileSync(`${SHOTS}/gate-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
