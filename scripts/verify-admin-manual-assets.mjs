/** Check the approved image refresh; reject stale or stray published screenshots. */
import fs from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const root='public/admin-manual';
const content=JSON.parse(fs.readFileSync('docs/admin-manual/content.json'));
const refresh=JSON.parse(fs.readFileSync('docs/admin-manual/image-refresh.json'));
const names=[...new Set(content.flatMap(c=>c.images.map(i=>i.src+'.png')))].sort();
const actual=fs.readdirSync(root+'/assets').filter(n=>n.endsWith('.png')).sort();
assert.deepEqual(actual,names,'Missing or unreferenced screenshots in published assets');
assert.deepEqual(refresh.images.map(i=>i.image).sort(),names,'Refresh manifest must cover every screenshot');
const hash=b=>createHash('sha256').update(b).digest('hex');
const html=fs.readFileSync(root+'/index.html','utf8');
const offline=fs.readFileSync(root+'/bazino-admin-manual.html','utf8');
for(const image of refresh.images){
 const digest=hash(fs.readFileSync(root+'/assets/'+image.image));
 assert.equal(digest,image.publishedSha256,`Published image changed since review: ${image.image}`);
 assert(html.includes(`assets/${image.image}?v=${digest.slice(0,12)}`),`Missing cache version: ${image.image}`);
}
const embedded=[...offline.matchAll(/src="data:image\/png;base64,([A-Za-z0-9+/=]+)"/g)].map(m=>hash(Buffer.from(m[1],'base64')));
assert.equal(embedded.length,content.reduce((n,c)=>n+c.images.length,0)+1,'Offline figures plus cover');
const expected=new Set(refresh.images.map(i=>i.publishedSha256));
assert.deepEqual(new Set(embedded),expected,'Offline file contains a missing or stale screenshot');
assert(!/src="assets\//.test(offline),'Offline screenshot is not embedded');
assert.equal(refresh.guards.obsoletePurpleHeaderCount,0);
assert.equal(refresh.guards.singleAdminBarHeight,50);
console.log(`PASS: ${names.length} reviewed screenshots, exact published file set, cache-versioned web assets and matching offline images.`);
