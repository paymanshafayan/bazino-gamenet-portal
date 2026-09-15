/** Validate handbook navigation, assets, offline operation and generate A4 PDF. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import {launch} from './lib.mjs';
const BASE=process.env.MANUAL_BASE||'http://127.0.0.1:3000';const ROOT=path.resolve('public/admin-manual');
const runtime=process.env.MANUAL_RUNTIME||os.tmpdir()+'/bazino-admin-manual';fs.mkdirSync(runtime,{recursive:true});
const {browser,context,page,errors}=await launch({width:1440,height:1000});
const checks=[];const assert=(name,ok)=>{checks.push({name,ok});if(!ok)throw Error(name);};
await page.goto(BASE+'/admin-manual/index.html',{waitUntil:'networkidle'});await page.evaluate(async()=>{document.querySelectorAll('img').forEach(i=>i.loading='eager');await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.hasAttribute('src')).map(i=>i.decode()));});
assert('33 chapters',await page.locator('[data-chapter]').count()===33);
assert('43 instructional figures',await page.locator('figure').count()===43);
assert('No missing screenshots',await page.evaluate(()=>[...document.querySelectorAll('figure img')].every(i=>i.naturalWidth>0)));
assert('No broken internal anchors',await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].every(a=>document.getElementById(a.hash.slice(1)))));
await page.screenshot({path:runtime+'/manual-desktop.png'});
await page.locator('#search').fill('POS');assert('Full-text search filters chapters',await page.locator('[data-chapter]:visible').count()>0&&await page.locator('[data-chapter]:visible').count()<33);
await page.locator('#search').fill('عبارت-آزمایشی-بدون-نتیجه-۹۹');assert('No-results message',await page.locator('#no-results').isVisible());await page.locator('#clear-search').click();assert('Clear restores all chapters',await page.locator('[data-chapter]:visible').count()===33);
await page.locator('.zoom-image').first().click();assert('Image zoom dialog opens',await page.locator('dialog').isVisible());await page.keyboard.press('Escape');assert('Escape closes image',!await page.locator('dialog').isVisible());
await page.setViewportSize({width:390,height:844});await page.goto(BASE+'/admin-manual/index.html',{waitUntil:'networkidle'});assert('Mobile has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.screenshot({path:runtime+'/manual-mobile.png'});
await page.locator('#toggle-index').click();assert('Mobile contents can open',await page.locator('#chapter-nav').isVisible());
// PDF uses full content; linked table of contents and tagged outline are retained.
await page.setViewportSize({width:1200,height:1000});await page.goto(BASE+'/admin-manual/index.html',{waitUntil:'networkidle'});await page.evaluate(async()=>{document.querySelectorAll('img').forEach(i=>i.loading='eager');await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.hasAttribute('src')).map(i=>i.decode()));});
await page.emulateMedia({media:'print'});
await page.pdf({path:ROOT+'/bazino-admin-manual.pdf',format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<div></div>',footerTemplate:`<div style="font-size:8px;width:100%;color:#64748b;padding:0 17mm;display:flex;justify-content:space-between;font-family:Arial"><span>BAZINO · ADMIN HANDBOOK · 2026-09-15</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,tagged:true,outline:true});
// Self-contained offline document must not request network resources.
const offline=await browser.newContext({viewport:{width:1200,height:900}});const op=await offline.newPage();const external=[];await offline.route(/^https?:/,r=>{external.push(r.request().url());return r.abort()});await op.goto(pathToFileURL(ROOT+'/bazino-admin-manual.html').href);await op.evaluate(async()=>{document.querySelectorAll('img').forEach(i=>i.loading='eager');await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.hasAttribute('src')).map(i=>i.decode()));});assert('Offline document loads without network',external.length===0);assert('Offline images present',await op.evaluate(()=>[...document.querySelectorAll('figure img')].every(i=>i.naturalWidth>0)));await op.locator('#search').fill('کیف پول');assert('Offline search works',await op.locator('[data-chapter]:visible').count()>0);
assert('No handbook JavaScript errors',!errors.some(x=>x.startsWith('pageerror:')));
fs.writeFileSync('docs/admin-manual/validation.json',JSON.stringify({date:'2026-09-15',checks,externalCallsInOfflineDocument:external.length},null,2));console.log(checks);await browser.close();
