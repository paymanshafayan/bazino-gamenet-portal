import assert from 'node:assert/strict';
import { suite,test,run } from './harness.mts';
import { SqliteStore } from '../server/dataProviders';
import { OpsCore } from '../server/management/core';
import { PublishingSettings, defaultCampaign, protectedIntegrationSetting } from '../server/publishing/settings';
import { MediaRegistry } from '../server/publishing/registry';
const store=new SqliteStore();store.config={filePath:':memory:'};await store.connect();await store.createDatabaseIfNotExist();
await store.seedMinimal({username:'admin',password:'test-password',email:'',phone:''});
const core=new OpsCore(()=>store),settings=new PublishingSettings(core),registry=new MediaRegistry(core);
const env={...process.env};
suite('Publishing foundations');
test('Manus and default reference are persisted once without a fake credential',async()=>{await settings.seed();const c=await settings.config();assert.equal(c.data.defaultAgentId,'builtin-manus');assert.equal(c.data.selectedMode,null);assert.equal(c.data.outboundEnabled,false);const a=await core.read('pub-agent','builtin-manus');assert.ok(a);assert.equal(await settings.vault.agentKey(a!.data),'');await core.save('pub-agent',a!.id,{...a!.data,enabled:false},a!.version);await settings.seed();assert.equal((await core.read('pub-agent',a!.id))!.data.enabled,false);});
test('vault refuses plaintext storage without a master key',async()=>{delete process.env.BAZINO_SECRETS_KEY;await assert.rejects(()=>settings.vault.set('test','secret','admin'),{code:'SECRETS_KEY_REQUIRED'});assert.equal(await core.read('pub-vault','test'),undefined);});
test('vault ciphertext is bound to its reference and explicit clear is durable',async()=>{process.env.BAZINO_SECRETS_KEY='ab'.repeat(32);await settings.vault.set('test','sensitive-test-value','admin');const r=await core.read('pub-vault','test');assert.ok(!JSON.stringify(r).includes('sensitive-test-value'));assert.equal(await settings.vault.read('test'),'sensitive-test-value');await core.save('pub-vault','copied',r!.data,0);await assert.rejects(()=>settings.vault.read('copied'),{code:'CREDENTIAL_UNAVAILABLE'});await settings.vault.set('test','','admin');assert.equal(await settings.vault.read('test'),'');});
test('Manus legacy setting precedence and revoked credential never falls back',async()=>{await store.setSetting('manus_api_key','legacy');process.env.MANUS_API_KEY='host';const a=(await core.read('pub-agent','builtin-manus'))!;assert.equal(await settings.vault.agentKey(a.data),'legacy');await settings.vault.set('agent:manus','','admin');assert.equal(await settings.vault.agentKey(a.data),'');});
test('all integration settings and secret aliases are blocked from generic/public APIs',()=>{for(const key of ['zernio_webhook_secret','manus_api_key','publishing_agents','ig_ingest_token','ZERNIO_API_KEY','MANUS_API_KEY'])assert.equal(protectedIntegrationSetting(key),true);assert.equal(protectedIntegrationSetting('site_title'),false);});
test('registry requires exact native IDs and type validation',async()=>{await assert.rejects(()=>registry.register('x',{media_id:'post-123',accountId:'acc'}),{code:'INVALID_MEDIA_ID'});await assert.rejects(()=>registry.register('x',{media_id:'123',media_type:'story',accountId:'acc'}),{code:'INVALID_MEDIA_TYPE'});});
test('media-only ingestion is durable and cannot activate an unapproved campaign',async()=>{const r=await registry.register('ingest',{media_id:'18109137383324992',accountId:'acc'});assert.equal(r.status,'needs_review');assert.equal((await registry.list()).length,1);assert.equal(await registry.eligible('acc','18109137383324992'),null);const a=await registry.register('ingest',{media_id:'18109137383324992',accountId:'acc'});assert.equal(a.duplicate,true);assert.equal((await store.listIgMedia()).length,1);});
test('campaign confirmation, financial policy, and partner-link guards',async()=>{const c=defaultCampaign();await assert.rejects(()=>settings.saveCampaign('admin','X',{...c,active:true,accountId:'acc',version:0,idempotencyKey:'policy1'}),{code:'POLICY_CONFIRMATION_REQUIRED'});await assert.rejects(()=>settings.saveCampaign('admin','X',{...c,financialApproved:true,version:0,idempotencyKey:'policy2'}),{code:'FINANCIAL_POLICY_REQUIRED'});c.messages.fa.partner2+=' {{invite_url}}';await assert.rejects(()=>settings.saveCampaign('admin','X',{...c,version:0,idempotencyKey:'policy3'}),{code:'PRIVATE_LINK_FORBIDDEN'});});
test('approved registry uses exact account/media and discovery never auto-approves',async()=>{const cp=await core.read('pub-campaign','SQUAD26');await settings.saveCampaign('admin','SQUAD26',{...defaultCampaign(),active:true,accountId:'acc',policyConfirmed:true,version:cp!.version,idempotencyKey:'activate'});const r=await registry.register('ingest',{media_id:'1234567',accountId:'acc'});assert.equal(r.status,'approved');assert.ok(await registry.eligible('acc','1234567'));assert.equal(await registry.eligible('acc','123456'),null);assert.equal(await registry.eligible('other','1234567'),null);const d=await registry.register('sync',{media_id:'567890',accountId:'acc'},'external_discovery');assert.equal(d.status,'needs_review');});
test('concurrent ingest creates just one media record',async()=>{const rs=await Promise.all(Array.from({length:5},()=>registry.register('ingest',{media_id:'777777777',accountId:'acc'})));assert.equal(rs.filter(r=>!r.duplicate).length,1);});
test('webhook secret change does not change the frozen invitation signing key',async()=>{process.env.ZERNIO_WEBHOOK_SECRET='initial-signing-material';const before=await settings.invitationKey();process.env.ZERNIO_WEBHOOK_SECRET='changed';assert.equal(await settings.invitationKey(),before);});

suite('Webhook ingress and durable queues');
const {WebhookService,normalizeZernio,verifyHmac}=await import('../server/publishing/webhooks');
const {createHmac}=await import('node:crypto');
const {DurableQueue}=await import('../server/publishing/queue');
const webhook=new WebhookService(core);
test('raw HMAC: exact bytes accepted, changed whitespace / empty secret rejected',()=>{
 const raw=Buffer.from('{ "event": "webhook.test" }');const sig=createHmac('sha256','s').update(raw).digest('hex');
 assert.ok(verifyHmac(raw,sig,'s'));assert.ok(!verifyHmac(Buffer.from('{"event":"webhook.test"}'),sig,'s'));assert.ok(!verifyHmac(raw,sig,''));
});
test('webhook test has no business side effect and missing secret fails closed',async()=>{
 process.env.ZERNIO_WEBHOOK_SECRET='test-hook';const body=Buffer.from('{"event":"webhook.test"}'),sig=createHmac('sha256','test-hook').update(body).digest('hex');
 const before=(await core.list('pub-inbox')).length;assert.deepEqual(await webhook.receive(body,sig),{ok:true,outboundSent:false,test:true});assert.equal((await core.list('pub-inbox')).length,before);
 delete process.env.ZERNIO_WEBHOOK_SECRET;await assert.rejects(()=>webhook.receive(body,sig),{code:'WEBHOOK_NOT_CONFIGURED'});
});
test('comment normalizer distinguishes internal post IDs and native media IDs',()=>{
 const e=normalizeZernio({id:'e1',event:'comment.received',account:{id:'acc',platform:'instagram'},comment:{id:'c1',postId:'internal-record',platformPostId:'1234567',text:'Ready',author:{id:'author'},createdAt:new Date().toISOString()},post:{id:'internal-record',platformPostId:'1234567'}});
 assert.equal(e.nativeId,'1234567');assert.equal(e.authorId,'author');
 assert.throws(()=>normalizeZernio({event:'comment.received',account:{id:'a',accountId:'b'},comment:{}}),{code:'CONFLICTING_IDENTIFIERS'});
});
test('message taps use metadata and conversation context, never text matching',()=>{
 const e=normalizeZernio({event:'message.received',account:{accountId:'acc',platform:'instagram'},message:{id:'m1',sender:{id:'friend'},direction:'incoming'},conversation:{id:'conv',participantId:'friend'},metadata:{postbackPayload:'signed-button'}});
 assert.equal(e.button,'signed-button');assert.equal(e.conversationId,'conv');assert.equal(e.authorId,'friend');
});
test('durable event ID dedup and conflicting bodies; foreign accounts ignored',async()=>{
 process.env.ZERNIO_IG_ACCOUNT_ID='acc';process.env.ZERNIO_WEBHOOK_SECRET='test-hook';
 const body=Buffer.from(JSON.stringify({id:'event-queue',event:'account.connected',account:{id:'acc',platform:'instagram'}}));const sign=(b:Buffer)=>createHmac('sha256','test-hook').update(b).digest('hex');
 const rs=await Promise.all([webhook.receive(body,sign(body)),webhook.receive(body,sign(body))]);assert.equal(rs.filter((r:any)=>r.duplicate).length,1);
 const changed=Buffer.from(body.toString().replace('connected','disconnected'));await assert.rejects(()=>webhook.receive(changed,sign(changed)),{code:'EVENT_ID_CONFLICT'});
 const foreign=Buffer.from(JSON.stringify({...JSON.parse(body.toString()),account:{id:'other',platform:'instagram'}}));assert.equal((await webhook.receive(foreign,sign(foreign)) as any).ignored,'account_mismatch');
});
test('external discovery and account disconnect do not mint affiliate rewards',async()=>{
 await core.store.runInTransaction(()=>webhook.lifecycle({type:'post.external.created',accountId:'acc',nativeId:'11223344',timestamp:new Date().toISOString()}));assert.equal((await registry.lookup('acc','11223344'))?.data.active,false);
 await core.store.runInTransaction(()=>webhook.lifecycle({type:'account.disconnected',accountId:'acc',timestamp:new Date().toISOString()}));assert.equal((await core.read('pub-account','acc'))?.data.connected,false);
});
test('one private reply claim for the same comment across all languages/roles',async()=>{
 const q=new DurableQueue(core);await core.store.runInTransaction(async()=>{
 const a=await q.enqueue({kind:'private_reply',accountId:'acc',commentId:'same',text:'A'},'partner1');const b=await q.enqueue({kind:'private_reply',accountId:'acc',commentId:'same',text:'B'},'friend');assert.equal(a,b);
 });
 const report=await q.report();assert.ok(!JSON.stringify(report).includes('"text"'));
});
test('timed-out sends become unknown and are not retried blindly',async()=>{
 const cfg=await settings.config();await core.save('pub-config','main',{...cfg.data,outboundEnabled:true},cfg.version);
 await settings.vault.set('zernio_api_key','test-only-key','admin');await core.save('pub-account','acc',{connected:true},(await core.read('pub-account','acc'))!.version);
 let calls=0;const q=new DurableQueue(core,async()=>{calls++;throw Error('connection lost');});
 const id=await q.enqueue({kind:'private_reply',accountId:'acc',commentId:'timeout',mediaId:'1234567',memberId:'test',text:'x',expiresAt:new Date(Date.now()+60000).toISOString()},'partner1');
 await q.sendOutbox();const count=calls;await q.sendOutbox();assert.equal(calls,count);assert.equal((await core.read('pub-outbox',id))!.data.status,'delivery_unknown');
});
await run({title:'Publishing / Instagram v4',jsonOut:'tests/reports/publishing.json'});
process.env=env;
