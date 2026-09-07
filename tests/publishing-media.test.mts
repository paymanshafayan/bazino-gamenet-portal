import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import {generateKeyPairSync,createSign,createHash} from 'node:crypto';
import sharp from 'sharp';import ffmpeg from '@ffmpeg-installer/ffmpeg';
import {suite,test,run} from './harness.mts';
import {SqliteStore} from '../server/dataProviders';import {OpsCore} from '../server/management/core';
import {PublishingService} from '../server/publishing/publish';import {agentConfigurationHash,verifyManusRsa} from '../server/publishing/manus';import {defaultCampaign} from '../server/publishing/settings';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bazino-media-test-'));
const store=new SqliteStore();store.config={filePath:':memory:'};await store.connect();await store.createDatabaseIfNotExist();await store.seedMinimal({username:'admin',password:'test',email:'',phone:''});const core=new OpsCore(()=>store);
process.env.BAZINO_SECRETS_KEY='cd'.repeat(32);process.env.ZERNIO_IG_ACCOUNT_ID='acc';process.env.ZERNIO_API_KEY='fake-zernio-for-contract-tests';process.env.ZERNIO_WEBHOOK_SECRET='fake-hook';
let postCalls=0,uploadCalls=0,failPost=false,manusCalls=0,taskPurpose='publish';const sent:any[]=[];
const keypair=generateKeyPairSync('rsa',{modulusLength:2048});const publicKey=keypair.publicKey.export({type:'spki',format:'pem'}).toString();
const fetcher:typeof fetch=async(url,init)=>{
 const u=String(url);if(init?.method==='PUT'){uploadCalls++;assert.ok(!(init.headers as any).Authorization);for await(const _ of (init.body as any)){}return new Response('',{status:200});}
 const b=init?.body?JSON.parse(String(init.body)):undefined;if(b)sent.push({url:u,body:b});
 if(u.endsWith('/v1/media/presign')){assert.ok(b.filename&&b.contentType);return new Response(JSON.stringify({uploadUrl:'https://unit.r2.cloudflarestorage.com/test',publicUrl:'https://media.zernio.com/temp/'+Math.random(),expiresIn:3600}));}
 if(u.endsWith('/v1/posts')&&init?.method==='POST'){postCalls++;if(failPost)throw Error('uncertain timeout');return new Response(JSON.stringify({post:{_id:'zpost-'+postCalls,status:'published',platforms:[{platform:'instagram',accountId:'acc',status:'published',platformPostId:String(188880000+postCalls)}]}}));}
 if(u.includes('/v1/inbox/comments/'))return new Response(JSON.stringify({comments:[]}));
 if(u.includes('webhook.publicKey'))return new Response(JSON.stringify({ok:true,public_key:publicKey,algorithm:'RSA-SHA256'}));
 if(u.includes('task.list?'))return new Response(JSON.stringify({ok:true,tasks:[]}));
 if(u.includes('task.create')){manusCalls++;assert.ok(b.message?.content?.[0]?.text);assert.equal(b.agent_profile,'standard');assert.ok(!JSON.stringify(b).includes('private-agent-test-key'));taskPurpose=b.structured_output_schema.required.includes('media_id')?'publish':'generate';return new Response(JSON.stringify({ok:true,task_id:'manus-task-'+manusCalls}));}
 if(u.includes('task.listMessages'))return new Response(JSON.stringify({ok:true,messages:[{structured_output_result:{success:true,value:taskPurpose==='publish'?{media_id:'199991111'}:{title:'Generated title',body:'Generated caption'}}},{status_update:{agent_status:'stopped'}}]}));
 throw Error('Unexpected mocked endpoint '+u);
};
const service=new PublishingService(core,fetcher,tmp);let imageId='',image2Id='',videoId='',manualId='',agentId='';
const draftInput=()=>({title:'Test post',caption:'Approved caption #Bazino',language:'en',format:'image',assetIds:[imageId],coverId:'',campaignId:'',executionMode:'manual',agentId:'',timezone:'Asia/Famagusta'});
async function upload(name:string,mime:string,buffer:Buffer){const r=await service.assets.create('admin',{name,mime,size:buffer.length,idempotencyKey:name});await service.assets.chunk('admin',r.id,0,buffer);return service.assets.finalize('admin',r.id);}
suite('Persistent media and validation');
test('initialize safe paused configuration',async()=>{await service.settings.seed();const c=await service.settings.config();await core.save('pub-config','main',{...c.data,selectedMode:'manual',zernioAccountId:'acc',outboundEnabled:false},c.version);});
test('file picker bytes are persisted, validated and privately previewable',async()=>{
 const buffer=await sharp({create:{width:640,height:800,channels:3,background:'#275565'}}).png().toBuffer();const r=await upload('image-one.png','image/png',buffer);imageId=r.id;assert.equal(r.data.status,'ready');assert.equal(r.data.width,640);assert.ok(r.data.hash);assert.ok(fs.existsSync(service.assets.file(r.id)));
 const p=await service.assets.preview('admin',r.id);const u=new URL(p.url,'https://example.test');assert.equal((await service.assets.verifyPreview(r.id,u.searchParams.get('until')!,u.searchParams.get('sig')!)).id,r.id);
 await assert.rejects(()=>service.assets.verifyPreview(r.id,u.searchParams.get('until')!,'a'.repeat(64)),{code:'MEDIA_ACCESS_EXPIRED'});
});
test('chunk offsets, duplicates, ownership and incomplete uploads are enforced',async()=>{
 const r=await service.assets.create('admin',{name:'chunk-test.png',mime:'image/png',size:20,idempotencyKey:'chunk-test'});
 await assert.rejects(()=>service.assets.chunk('other',r.id,0,Buffer.alloc(5)),{code:'FORBIDDEN'});
 await assert.rejects(()=>service.assets.chunk('admin',r.id,5,Buffer.alloc(5)),{code:'CHUNK_OUT_OF_ORDER'});
 await service.assets.chunk('admin',r.id,0,Buffer.from('abcde'));assert.equal((await service.assets.chunk('admin',r.id,0,Buffer.from('abcde'))).duplicate,true);
 await assert.rejects(()=>service.assets.chunk('admin',r.id,0,Buffer.from('zzzzz')),{code:'CHUNK_CONFLICT'});
 await assert.rejects(()=>service.assets.finalize('admin',r.id),{code:'UPLOAD_INCOMPLETE'});await service.assets.cancel('admin',r.id);
});
test('MIME spoofing is rejected and the failed status survives the error response',async()=>{
 const r=await service.assets.create('admin',{name:'fake.png',mime:'image/png',size:8,idempotencyKey:'fake'});await service.assets.chunk('admin',r.id,0,Buffer.from('notimage'));
 await assert.rejects(()=>service.assets.finalize('admin',r.id));assert.equal((await service.assets.owned(r.id,'admin')).data.status,'failed');
});
test('real MP4 is inspected with ffprobe, not trusted browser metadata',async()=>{
 const file=path.join(tmp,'fixture.mp4');execFileSync(ffmpeg.path,['-y','-f','lavfi','-i','color=c=navy:s=640x800:r=25','-t','4','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-an',file],{stdio:'pipe'});
 const r=await upload('clip.mp4','video/mp4',fs.readFileSync(file));videoId=r.id;assert.equal(r.data.codec,'h264');assert.ok(r.data.duration!>=3);assert.equal(r.data.height,800);
 const b=await sharp({create:{width:640,height:800,channels:3,background:'#634455'}}).jpeg().toBuffer();image2Id=(await upload('image-two.jpg','image/jpeg',b)).id;
});
suite('Immutable approvals and direct publishing');
test('draft validates caption, private links and media shape',async()=>{
 await assert.rejects(()=>service.save('admin',undefined,{...draftInput(),caption:'https://bazino.pro/ig/invite/secret?token=x'}),{code:'PRIVATE_LINK_FORBIDDEN'});
 const r=await service.save('admin',undefined,{...draftInput(),format:'carousel',assetIds:[imageId]});await assert.rejects(()=>service.approve('admin',r.id,{version:r.version,confirmed:true}),{code:'MEDIA_COUNT_INVALID'});
});
test('editing after approval invalidates it instead of silently publishing new content',async()=>{
 let r=await service.save('admin',undefined,draftInput());r=await service.approve('admin',r.id,{version:r.version,confirmed:true});const changed=await service.save('admin',r.id,{...r.data,caption:'Changed',version:r.version});assert.equal(changed.data.status,'draft');assert.equal(changed.data.approvalHash,undefined);
 await assert.rejects(()=>service.schedule('admin',r.id,{version:changed.version,confirmed:true,publishNow:true}),{code:'APPROVAL_REQUIRED'});
});
test('double-click schedule creates one job; a paused system does not publish',async()=>{
 let d=await service.save('admin',undefined,{...draftInput(),format:'carousel',assetIds:[image2Id,videoId,imageId]});d=await service.approve('admin',d.id,{version:d.version,confirmed:true});manualId=d.id;
 const rs=await Promise.all([service.schedule('admin',d.id,{version:d.version,confirmed:true,publishNow:true}),service.schedule('admin',d.id,{version:d.version,confirmed:true,publishNow:true})]);assert.equal(rs[0].id,rs[1].id);await service.work();assert.equal(postCalls,0);
});
test('manual publication stages the actual ordered assets and uses no Manus request',async()=>{
 const c=await service.settings.config();await core.save('pub-config','main',{...c.data,outboundEnabled:true},c.version);await service.work();assert.equal(postCalls,1);assert.equal(manusCalls,0);assert.equal(uploadCalls,3);
 const payload=sent.find(x=>x.url.endsWith('/v1/posts')).body;assert.deepEqual(payload.mediaItems.map((m:any)=>m.type),['image','video','image']);assert.ok(payload.metadata.bazinoPublicationId);assert.equal((await service.owned(manualId,'admin')).data.status,'published');
 assert.equal((await service.registry.list())[0].data.active,false,'A general post is not automatically an affiliate campaign');
});
test('published media cannot be edited or deleted out from under a snapshot',async()=>{
 const d=await service.owned(manualId,'admin');await assert.rejects(()=>service.save('admin',d.id,{...d.data,version:d.version}),{code:'CLONE_PUBLISHED_DRAFT'});
 await assert.rejects(()=>service.assets.cancel('admin',imageId),{code:'ASSET_IN_USE'});
});
test('ambiguous POST outcomes are not retried by the worker',async()=>{
 let d=await service.save('admin',undefined,draftInput());d=await service.approve('admin',d.id,{version:d.version,confirmed:true});const j=await service.schedule('admin',d.id,{version:d.version,confirmed:true,publishNow:true});failPost=true;await service.work();const count=postCalls;await service.work();failPost=false;assert.equal(postCalls,count);assert.equal((await core.read('pub-publication',j.id))!.data.state,'delivery_unknown');
});
test('expired provider staging URLs can be replaced from the persistent original',async()=>{
 const url=await service.stage(imageId,'expiry-test');const row=(await core.list('pub-provider-upload')).find(x=>x.data.publicUrl===url)!;await core.save('pub-provider-upload',row.id,{...row.data,expiresAt:'2000-01-01T00:00:00Z'},row.version);const before=uploadCalls;await service.stage(imageId,'expiry-test');assert.equal(uploadCalls,before+1);
});
suite('Agent execution and callback security');
test('a saved/default agent is not ready until a real adapter connection is checked',async()=>{
 const a=await service.agents.save('admin',undefined,{name:'Manus test',adapterId:'manus',profile:'standard',projectId:'',enabled:true,apiKey:'private-agent-test-key'});agentId=a.id;await service.agents.testConnection('admin',agentId,{confirmed:true});
});
test('agent publishes the approved snapshot and its returned native ID joins the same registry',async()=>{
 let d=await service.save('admin',undefined,{...draftInput(),executionMode:'agent',agentId});d=await service.approve('admin',d.id,{version:d.version,confirmed:true});await service.schedule('admin',d.id,{version:d.version,confirmed:true,confirmedAgentCost:true,publishNow:true});await service.work();assert.equal(manusCalls,1);
 assert.equal((await service.owned(d.id,'admin')).data.status,'published');assert.ok((await service.registry.list()).some(x=>x.data.nativeId==='199991111'));
});
test('Manus RSA verifies timestamp, canonical URL and exact bytes',()=>{
 const raw=Buffer.from('{"event":"task_stopped"}'),timestamp=String(Math.floor(Date.now()/1000)),url='https://bazino.pro/api/management/integrations/manus/webhook';
 const signed=`${timestamp}.${url}.${createHash('sha256').update(raw).digest('hex')}`,signer=createSign('RSA-SHA256');signer.update(signed);const sig=signer.sign(keypair.privateKey,'base64');assert.ok(verifyManusRsa(raw,url,timestamp,sig,publicKey));assert.ok(!verifyManusRsa(raw,url+'/wrong',timestamp,sig,publicKey));assert.ok(!verifyManusRsa(raw,url,'1000000000',sig,publicKey));
});
test('late agent generation cannot overwrite a manually revised draft',async()=>{
 let d=await service.save('admin',undefined,{...draftInput(),executionMode:'agent',agentId});const task=await service.generate('admin',d.id,{agentId,brief:'Draft a caption',confirmedCost:true});await service.workGenerations();d=await service.save('admin',d.id,{...d.data,caption:'Human revision wins',version:d.version});
 const r=(await core.read('pub-agent-task',task.id))!;await core.save('pub-agent-task',r.id,{...r.data,nextPollAt:0},r.version);await service.workGenerations();assert.equal((await service.owned(d.id,'admin')).data.caption,'Human revision wins');assert.equal((await core.read('pub-agent-task',r.id))!.data.status,'superseded');
});

test('superseded queued generation never spends credits when delivery is resumed',async()=>{
 let d=await service.save('admin',undefined,{...draftInput(),executionMode:'agent',agentId});const task=await service.generate('admin',d.id,{agentId,brief:'Queued work that must not run',confirmedCost:true});
 await service.save('admin',d.id,{...d.data,executionMode:'manual',caption:'Manual draft now',version:d.version});
 const before=manusCalls;await service.workGenerations();assert.equal(manusCalls,before);assert.equal((await core.read('pub-agent-task',task.id))!.data.status,'superseded');
});
test('queued publication cannot use a changed agent project with the same API key',async()=>{
 let d=await service.save('admin',undefined,{...draftInput(),executionMode:'agent',agentId});d=await service.approve('admin',d.id,{version:d.version,confirmed:true});const job=await service.schedule('admin',d.id,{version:d.version,confirmed:true,confirmedAgentCost:true,publishNow:true});
 const old=(await service.agents.get(agentId))!;await service.agents.save('admin',agentId,{...old.data,projectId:'different-project',version:old.version});
 const before=manusCalls;await service.work();assert.equal(manusCalls,before);const result=(await core.read('pub-publication',job.id))!;assert.equal(result.data.state,'failed');assert.equal(result.data.error,'AGENT_CONFIGURATION_CHANGED');
 const changed=(await service.agents.get(agentId))!;await service.agents.save('admin',agentId,{...old.data,version:changed.version});await service.agents.testConnection('admin',agentId,{confirmed:true});
});
test('agent configuration fingerprint pins execution fields but not display or health metadata',()=>{
 const a={adapterId:'manus',credentialRef:'agent:test',profile:'standard',projectId:'one',name:'Name',checkedAt:'before'};
 assert.equal(agentConfigurationHash(a),agentConfigurationHash({...a,name:'Renamed',checkedAt:'after'}));assert.notEqual(agentConfigurationHash(a),agentConfigurationHash({...a,projectId:'two'}));
});

suite('Batch approval, timing and provider registry');
test('affiliate posts require four slides and a closed three-post approval batch',async()=>{
 const c=(await core.read('pub-campaign','SQUAD26'))!;await core.save('pub-campaign','SQUAD26',{...c.data,active:true,accountId:'acc'},c.version);
 const extra=await upload('slide-four.png','image/png',await sharp({create:{width:640,height:800,channels:3,background:'#457344'}}).png().toBuffer());
 const ids=[];const versions:any={};
 for(let i=0;i<3;i++){let d=await service.save('admin',undefined,{...draftInput(),title:'Affiliate '+i,language:'tr',format:'carousel',campaignId:'SQUAD26',assetIds:[imageId,image2Id,videoId,extra.id]});d=await service.approve('admin',d.id,{version:d.version,confirmed:true});ids.push(d.id);versions[d.id]=d.version;}
 await assert.rejects(()=>service.schedule('admin',ids[0],{confirmed:true,publishNow:true,version:versions[ids[0]]}),{code:'AFFILIATE_BATCH_REQUIRED'});
 const r=await service.scheduleBatch('admin',{draftIds:ids,draftVersions:versions,confirmed:true,publishNow:true,idempotencyKey:'three-post-batch'});assert.equal(r.jobs.length,3);
});
test('venue-local scheduling beyond seven days stores a future job, not an expiring media URL',async()=>{
 let d=await service.save('admin',undefined,draftInput());d=await service.approve('admin',d.id,{version:d.version,confirmed:true});
 const date=new Date(Date.now()+15*86400000).toISOString().slice(0,10);const j=await service.schedule('admin',d.id,{version:d.version,confirmed:true,publishNow:false,date,time:'12:30'});
 assert.ok(Date.parse(j.data.scheduledAt)>Date.now()+14*86400000);assert.ok(j.data.snapshot.assetIds.includes(imageId));assert.ok(!JSON.stringify(j.data.snapshot).includes('media.zernio.com/temp'));
});
test('trusted publication promotes discovered media once; it does not reactivate a deleted record',async()=>{
 await service.registry.register('sync',{media_id:'1234567000',accountId:'acc'},'external_discovery');
 await service.registry.register('pub',{media_id:'1234567000',accountId:'acc',campaign_id:'SQUAD26',media_type:'post'},'zernio_publication','known-job');
 const r=(await service.registry.lookup('acc','1234567000'))!;assert.equal(r.data.approval,'approved');await core.save('pub-media',r.id,{...r.data,approval:'deleted',active:false},r.version);
 await service.registry.register('pub',{media_id:'1234567000',accountId:'acc',campaign_id:'SQUAD26',media_type:'post'},'zernio_publication','known-job');assert.equal((await service.registry.lookup('acc','1234567000'))!.data.active,false);
});
test('empty analytics deltas retain their opaque cursor across later events',async()=>{
 const {WebhookService}=await import('../server/publishing/webhooks');const ws=new WebhookService(core,async()=>new Response(JSON.stringify({data:[],nextCursor:'do-not-advance'})));
 const r=await ws.analytics({type:'analytics.synced',accountId:'acc',cursor:'original-opaque-cursor',timestamp:new Date().toISOString()});assert.equal(r.wait,true);assert.equal((await core.read('pub-analytics-cursor','acc'))!.data.nextCursor,'original-opaque-cursor');
 await ws.analytics({type:'analytics.synced',accountId:'acc',cursor:'later-event-cursor',timestamp:new Date().toISOString()});assert.equal((await core.read('pub-analytics-cursor','acc'))!.data.nextCursor,'original-opaque-cursor');
});

test('a restarted library/provider instance reads the same original and validated media',async()=>{
 const disk=path.join(tmp,'persistence.sqlite'),root=path.join(tmp,'persisted-assets');const a=new SqliteStore();a.config={filePath:disk};await a.connect();await a.createDatabaseIfNotExist();const one=new PublishingService(new OpsCore(()=>a),fetcher,root);
 const png=await sharp({create:{width:320,height:400,channels:3,background:'#354678'}}).png().toBuffer();const asset=await one.assets.create('owner',{name:'persist.png',mime:'image/png',size:png.length,idempotencyKey:'persist-upload'});await one.assets.chunk('owner',asset.id,0,png);const ready=await one.assets.finalize('owner',asset.id);
 const b=new SqliteStore();b.config={filePath:disk};await b.connect();const two=new PublishingService(new OpsCore(()=>b),fetcher,root);const restored=await two.assets.ready(asset.id);assert.equal(restored.data.hash,ready.data.hash);assert.ok(fs.readFileSync(two.assets.file(asset.id)).equals(png));
});
await run({title:'Publishing media / approval / adapters',jsonOut:'tests/reports/publishing-media.json'});
fs.rmSync(tmp,{recursive:true,force:true});
