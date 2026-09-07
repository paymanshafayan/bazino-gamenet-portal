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

suite('Four-language partner/friend state machine');
const {InstagramCampaignService,wholeKeyword,commentLanguage,renderCampaign}=await import('../server/affiliate/campaignV4');
const {CAMPAIGN_MESSAGES}=await import('../shared/publishing/messages');
const sent:any[]=[];
const fetcher:typeof fetch=async(url,init)=>{
 if(String(url).includes('follow-status'))return new Response(JSON.stringify({isFollower:null}),{status:200});
 sent.push({url:String(url),body:JSON.parse(String(init?.body))});return new Response(JSON.stringify({messageId:`message-${sent.length}`}),{status:200});
};
const campaign=new InstagramCampaignService(core,fetcher);
let partnerId='',friendId='',partnerCode='';
const comment=(id:string,authorId:string,text:string)=>({type:'comment.received',accountId:'acc',nativeId:'1234567',commentId:id,authorId,username:`test-${authorId}`,text,createdAt:new Date().toISOString(),timestamp:new Date().toISOString()});
test('Unicode whole-word and Turkish casing; ambiguous language does not auto-select',()=>{
 assert.ok(wholeKeyword('من آماده هستم!','آماده','fa'));assert.ok(!wholeKeyword('آماده‌ای؟','آماده','fa'));
 assert.ok(wholeKeyword('HAZIR!','Hazır','tr'));assert.ok(!wholeKeyword('Already','Ready','en'));
 assert.ok(wholeKeyword('Я Готово!','Готово','ru'));assert.equal(commentLanguage('Ready آماده',defaultCampaign(),['fa','en']),'ambiguous');
});
test('partner comment queues first PR without recording sent before delivery',async()=>{
 const r=await campaign.onComment(comment('partner-1','10001','Ready'));assert.ok(r.ok);partnerId=r.memberId!;
 let m=(await core.read('pub-member',partnerId))!;partnerCode=m.data.partnerCode;assert.equal(m.data.language,'en');assert.equal(m.data.status,'partner_follow_pending');
 const o=await core.read('pub-outbox',r.outboxId!);assert.equal(o!.data.status,'queued');assert.ok(!o!.data.text.includes('/ig/invite/'));assert.ok(!o!.data.text.includes(partnerCode));
 await campaign.queue.sendOutbox(d=>campaign.beforeSend(d),(d,r)=>campaign.afterSend(d,r),d=>campaign.prepareMessage(d));assert.equal((await core.read('pub-outbox',r.outboxId!))!.data.status,'sent');
});
test('button must belong to the actual sender and conversation',async()=>{
 const m=(await core.read('pub-member',partnerId))!,button=await campaign.button(partnerId,m.data);
 const bad=await campaign.onMessage({type:'message.received',accountId:'acc',authorId:'99999',conversationId:'wrong',button,direction:'incoming',timestamp:new Date().toISOString()});assert.ok(bad.ignored);assert.equal((await core.read('pub-member',partnerId))!.data.status,'partner_follow_pending');
});
test('partner DM is code plus approved text, never an invitation link',async()=>{
 const m=(await core.read('pub-member',partnerId))!,button=await campaign.button(partnerId,m.data);
 await campaign.onMessage({type:'message.received',accountId:'acc',authorId:'10001',participantId:'10001',conversationId:'partner-conv',button,direction:'incoming',timestamp:new Date().toISOString()});
 await campaign.queue.sendOutbox(d=>campaign.beforeSend(d),(d,r)=>campaign.afterSend(d,r),d=>campaign.prepareMessage(d));
 assert.equal((await core.read('pub-member',partnerId))!.data.status,'code_sent');assert.equal((await core.read('pub-member',partnerId))!.data.followMethod,'button_event_only');
 const last=sent.at(-1);assert.ok(last.url.endsWith('/partner-conv/messages'));assert.ok(last.body.message.includes(partnerCode));assert.ok(!last.body.message.includes('/ig/invite/'));
});
test('friend code on another media and self-referral never pass',async()=>{
 assert.ok((await campaign.onComment(comment('self','10001',partnerCode))).ignored);
 const r=await campaign.onComment({...comment('other-media','10002',partnerCode),nativeId:'999888'});assert.ok(r.wait);
});
test('friend comment inherits partner language and records indirect share evidence',async()=>{
 const r=await campaign.onComment(comment('friend-1','10002',partnerCode));friendId=r.memberId!;
 const m=(await core.read('pub-member',friendId))!;assert.equal(m.data.language,'en');assert.equal(m.data.shareStatus,'share_confirmed_by_friend_code');assert.equal(m.data.status,'friend_follow_pending');
 await campaign.queue.sendOutbox(d=>campaign.beforeSend(d),(d,r)=>campaign.afterSend(d,r),d=>campaign.prepareMessage(d));
});
test('only friend receives the private link; raw URL is absent from persisted outbox/admin report',async()=>{
 const m=(await core.read('pub-member',friendId))!,button=await campaign.button(friendId,m.data);
 const r=await campaign.onMessage({type:'message.received',accountId:'acc',authorId:'10002',participantId:'10002',conversationId:'friend-conv',button,direction:'incoming',timestamp:new Date().toISOString()});
 const out=await core.read('pub-outbox',r.outboxId!);assert.ok(!JSON.stringify(out).includes('/ig/invite/'));
 await campaign.queue.sendOutbox(d=>campaign.beforeSend(d),(d,r)=>campaign.afterSend(d,r),d=>campaign.prepareMessage(d));
 assert.ok(sent.at(-1).url.endsWith('/friend-conv/messages'));assert.ok(sent.at(-1).body.message.includes('/ig/invite/'));
 assert.ok(!JSON.stringify(await campaign.list()).includes('token='));
 await assert.rejects(async()=>campaign.linkToken(partnerId,(await core.read('pub-member',partnerId))!.data),{code:'FRIEND_GATE_REQUIRED'});
});
test('concurrent repeats cannot add extra PRs or replace saved language',async()=>{
 const before=(await core.list('pub-outbox')).length;
 await Promise.all([campaign.onComment(comment('partner-1','10001','آماده')),campaign.onComment(comment('partner-1','10001','Ready'))]);
 assert.equal((await core.list('pub-outbox')).length,before);assert.equal((await core.read('pub-member',partnerId))!.data.language,'en');
});
test('approved Persian second message is preserved except for its code placeholder',()=>{
 assert.equal(renderCampaign(CAMPAIGN_MESSAGES.fa.partner2,'123456'),CAMPAIGN_MESSAGES.fa.partner2.replace('[عدد یکتا]','123456'));
});
test('all four campaign languages get the matching partner message',async()=>{
 for(const [i,l] of ['fa','tr','en','ru'].entries()){
   const r=await campaign.onComment(comment(`lang-${l}`,String(20000+i),defaultCampaign().keywords[l]));const m=await core.read('pub-member',r.memberId!);assert.equal(m!.data.language,l);
   const o=await core.read('pub-outbox',r.outboxId!);assert.equal(o!.data.text,CAMPAIGN_MESSAGES[l].partner1);
 }
});

suite('Friend web gate and per-customer coupons');
const {FriendGateService}=await import('../server/affiliate/friendGate');
const gate=new FriendGateService(core);
let friendToken='',friend2Id='',friend2Token='';
test('prepare distinct verified site customers and a coupon-enabled invitation fixture',async()=>{
 for(const name of ['coupon_friend1','coupon_friend2']){await store.createUser({username:name,password:'local-test-only',email:'',phone:name==='coupon_friend1'?'+15555551001':'+15555551002'});await store.updateUserFields(name,{phoneVerifiedAt:new Date().toISOString()});}
 const m=(await core.read('pub-member',friendId))!;await core.save('pub-member',friendId,{...m.data,policy:{...m.data.policy,couponEnabled:true,couponValue:15,couponMinOrder:100}},m.version);
 friendToken=await campaign.linkToken(friendId,(await core.read('pub-member',friendId))!.data);
});
test('invalid or partner invitation signatures cannot reach the web gate',async()=>{
 await assert.rejects(()=>gate.info(friendId,'a'.repeat(64)),{code:'INVITE_INVALID_OR_EXPIRED'});
 await assert.rejects(()=>gate.info(partnerId,friendToken),{code:'INVITE_INVALID_OR_EXPIRED'});
});
test('invitation info is truthful and does not reveal partner identity or private keys',async()=>{
 const info=await gate.info(friendId,friendToken);assert.equal(info.needsLogin,true);assert.equal(info.followMethod,'button_event_only');assert.equal(info.verificationMethod,'link_possession');
 assert.ok(!JSON.stringify(info).includes('10001'));assert.ok(!JSON.stringify(info).includes(friendToken));
});
test('gate requires authentication, consent and explicit like self-attestation',async()=>{
 await assert.rejects(()=>gate.claim(friendId,'',{token:friendToken,consent:true}),{code:'AUTH_REQUIRED'});
 await assert.rejects(()=>gate.claim(friendId,'coupon_friend1',{token:friendToken,likeAttested:true}),{code:'CONSENT_REQUIRED'});
 await assert.rejects(()=>gate.claim(friendId,'coupon_friend1',{token:friendToken,consent:true}),{code:'LIKE_ATTESTATION_REQUIRED'});
});
test('five concurrent claims produce exactly one owner-bound coupon',async()=>{
 const rs=await Promise.all(Array.from({length:5},()=>gate.claim(friendId,'coupon_friend1',{token:friendToken,consent:true,likeAttested:true,handle:'@test_friend'})));
 assert.equal(rs.filter(r=>!r.duplicate).length,1);assert.equal(new Set(rs.map(r=>r.coupon.code)).size,1);
 const coupon=await store.getCouponByCode(rs[0].coupon.code);assert.equal(coupon?.ownerUsername,'coupon_friend1');assert.equal(coupon?.maxUsageCount,1);assert.equal(coupon?.type,'Percent');assert.equal(coupon?.minOrder,100);
 assert.equal((await store.getAttributionForUser('coupon_friend1'))?.code,partnerCode);
});
test('a claimed invitation cannot be moved to another account',async()=>{
 await assert.rejects(()=>gate.claim(friendId,'coupon_friend2',{token:friendToken,consent:true,likeAttested:true}),{code:'INVITE_ALREADY_CLAIMED'});
});
test('another friend of the same partner gets an independent coupon',async()=>{
 const r=await campaign.onComment(comment('friend-2','10003',partnerCode));friend2Id=r.memberId!;
 let m=(await core.read('pub-member',friend2Id))!;await core.save('pub-member',friend2Id,{...m.data,policy:{...m.data.policy,couponEnabled:true,couponValue:15}},m.version);
 m=(await core.read('pub-member',friend2Id))!;await campaign.onMessage({type:'message.received',accountId:'acc',authorId:'10003',participantId:'10003',conversationId:'friend2-conv',button:await campaign.button(friend2Id,m.data),direction:'incoming',timestamp:new Date().toISOString()});
 await campaign.queue.sendOutbox(d=>campaign.beforeSend(d),(d,r)=>campaign.afterSend(d,r),d=>campaign.prepareMessage(d));
 friend2Token=await campaign.linkToken(friend2Id,(await core.read('pub-member',friend2Id))!.data);
 const result=await gate.claim(friend2Id,'coupon_friend2',{token:friend2Token,consent:true,likeAttested:true});
 const claims=await core.list('pub-claim');assert.equal(claims.length,2);assert.notEqual(claims[0].data.coupon.code,claims[1].data.coupon.code);assert.equal((await store.getCouponByCode(result.coupon.code))!.ownerUsername,'coupon_friend2');
});
test('gate route is a real standalone route, not just a gate=1 query flag',async()=>{
 const {standalonePageFromPath}=await import('../src/utils/routes');assert.deepEqual(standalonePageFromPath('/ig/invite/ID','?token=abc'),{type:'invite',id:'ID',token:'abc'});
});
await run({title:'Publishing / Instagram v4',jsonOut:'tests/reports/publishing.json'});
process.env=env;
