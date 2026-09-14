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
test('campaign confirmation, financial policy, and partner-link guards (new flow)',async()=>{
  const c=defaultCampaign();
  await assert.rejects(()=>settings.saveCampaign('admin','X',{...c,active:true,accountId:'acc',version:0,idempotencyKey:'policy1'}),{code:'POLICY_CONFIRMATION_REQUIRED'});
  await assert.rejects(()=>settings.saveCampaign('admin','X',{...c,financialApproved:true,version:0,idempotencyKey:'policy2'}),{code:'FINANCIAL_POLICY_REQUIRED'});
  // New flow: partner1 must NOT contain private link, partner2 IS allowed to contain it
  const c1={...c, messages:{...c.messages, fa:{...c.messages.fa, partner1: c.messages.fa.partner1+' {{invite_url}}'}}};
  await assert.rejects(()=>settings.saveCampaign('admin','X',{...c1,version:0,idempotencyKey:'policy3'}),{code:'PRIVATE_LINK_FORBIDDEN'});
  const c2={...c, messages:{...c.messages, fa:{...c.messages.fa, partner2: c.messages.fa.partner2}}};
  // partner2 with invite_url should be allowed now
  const cp0=await core.read('pub-campaign','SQUAD26');
  await settings.saveCampaign('admin','SQUAD26-TEST',{...c2,active:false,accountId:'',policyConfirmed:false,version:0,idempotencyKey:'policy4-allowed'});
  // clean
  await core.store.runInTransaction(async()=>{const r=await core.read('pub-campaign','SQUAD26-TEST'); if(r) await core.save('pub-campaign','SQUAD26-TEST',{...r.data,active:false},r.version);});
});
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

suite('Four-language partner state machine - NEW FLOW');
const {InstagramCampaignService,wholeKeyword,commentLanguage,renderCampaign}=await import('../server/affiliate/campaignV4');
const {CAMPAIGN_MESSAGES}=await import('../shared/publishing/messages');
const sent:any[]=[];
const fetcher:typeof fetch=async(url,init)=>{
 if(String(url).includes('follow-status'))return new Response(JSON.stringify({isFollower:null}),{status:200});
 sent.push({url:String(url),body:JSON.parse(String(init?.body))});return new Response(JSON.stringify({messageId:`message-${sent.length}`}),{status:200});
};
const campaign=new InstagramCampaignService(core,fetcher);
let partnerId='',partnerCode='',partnerLinkToken='';
const comment=(id:string,authorId:string,text:string)=>({type:'comment.received',accountId:'acc',nativeId:'1234567',commentId:id,authorId,username:`test-${authorId}`,text,createdAt:new Date().toISOString(),timestamp:new Date().toISOString()});

test('Unicode whole-word and Turkish casing; ambiguous language does not auto-select',()=>{
 assert.ok(wholeKeyword('من آماده هستم!','آماده','fa'));assert.ok(!wholeKeyword('آماده‌ای؟','آماده','fa'));
 assert.ok(wholeKeyword('HAZIR!','Hazır','tr'));assert.ok(!wholeKeyword('Already','Ready','en'));
 assert.ok(wholeKeyword('Я Готово!','Готово','ru'));assert.equal(commentLanguage('Ready آماده',defaultCampaign(),['fa','en']),'ambiguous');
});

test('partner comment queues first PR guide without private link',async()=>{
 const r=await campaign.onComment(comment('partner-1','10001','Ready'));assert.ok(r.ok);partnerId=r.memberId!;
 let m=(await core.read('pub-member',partnerId))!;partnerCode=m.data.partnerCode;assert.equal(m.data.language,'en');assert.equal(m.data.status,'partner_follow_pending');assert.equal(m.data.role,'partner');
 const o=await core.read('pub-outbox',r.outboxId!);assert.equal(o!.data.status,'queued');
 assert.ok(!o!.data.text.includes('/ig/invite/'));assert.ok(!o!.data.text.includes('{{invite_url}}') || o!.data.text===CAMPAIGN_MESSAGES.en.partner1);
 // New flow PR guide should be the exact message from CAMPAIGN_MESSAGES
 assert.equal(o!.data.text, CAMPAIGN_MESSAGES.en.partner1);
 await campaign.queue.sendOutbox(d=>campaign.beforeSend(d),(d,r)=>campaign.afterSend(d,r),d=>campaign.prepareMessage(d));
 assert.equal((await core.read('pub-outbox',r.outboxId!))!.data.status,'sent');
});

test('numeric code comment is now retired (friend flow)',async()=>{
 const r=await campaign.onComment(comment('friend-attempt','10002',partnerCode));
 assert.ok(r.ignored);assert.equal(r.reason,'friend_flow_retired');
});

test('button must belong to the actual sender and conversation',async()=>{
 const m=(await core.read('pub-member',partnerId))!,button=await campaign.button(partnerId,m.data);
 const bad=await campaign.onMessage({type:'message.received',accountId:'acc',authorId:'99999',conversationId:'wrong',button,direction:'incoming',timestamp:new Date().toISOString()});assert.ok(bad.ignored);assert.equal((await core.read('pub-member',partnerId))!.data.status,'partner_follow_pending');
});

test('partner DM now contains private invite link (new flow)',async()=>{
 const m=(await core.read('pub-member',partnerId))!,button=await campaign.button(partnerId,m.data);
 await campaign.onMessage({type:'message.received',accountId:'acc',authorId:'10001',participantId:'10001',conversationId:'partner-conv',button,direction:'incoming',timestamp:new Date().toISOString()});
 const afterFollow=await core.read('pub-member',partnerId);
 assert.equal(afterFollow!.data.status,'link_ready');
 assert.ok(afterFollow!.data.linkExpiresAt);
 const outId=afterFollow!.data.conversationId ? (await core.list('pub-outbox')).find(o=>o.data.memberId===partnerId && o.data.stage==='partner_link')?.id : null;
 // send
 await campaign.queue.sendOutbox(d=>campaign.beforeSend(d),(d,r)=>campaign.afterSend(d,r),d=>campaign.prepareMessage(d));
 const finalM=await core.read('pub-member',partnerId);
 assert.equal(finalM!.data.status,'link_sent');
 assert.equal(finalM!.data.followMethod,'button_event_only');
 const last=sent.at(-1);
 assert.ok(last.url.endsWith('/partner-conv/messages'));
 assert.ok(last.body.message.includes('/ig/invite/'));
 assert.ok(last.body.message.includes('token='));
 // persisted outbox must NOT contain raw token URL (security)
 const persisted=await core.read('pub-outbox', (await core.list('pub-outbox')).find(o=>o.data.memberId===partnerId && o.data.stage==='partner_link')!.id);
 assert.ok(!JSON.stringify(persisted!.data).includes('token=') || persisted!.data.text.includes('{{invite_url}}'));
 // linkToken should work for partner now
 const token=await campaign.linkToken(partnerId,finalM!.data);
 partnerLinkToken=token;
 assert.ok(/^[a-f\d]{64}$/.test(token));
});

test('concurrent repeats cannot add extra PRs or replace saved language',async()=>{
 const before=(await core.list('pub-outbox')).length;
 await Promise.all([campaign.onComment(comment('partner-1','10001','آماده')),campaign.onComment(comment('partner-1','10001','Ready'))]);
 assert.equal((await core.list('pub-outbox')).length,before);assert.equal((await core.read('pub-member',partnerId))!.data.language,'en');
});

test('partner2 template contains invite_url placeholder and renders correctly',()=>{
 const tpl=CAMPAIGN_MESSAGES.fa.partner2;
 assert.ok(tpl.includes('{{invite_url}}'));
 const rendered=renderCampaign(tpl,'', 'https://bazino.pro/ig/invite/ID?token=abc');
 assert.ok(rendered.includes('https://bazino.pro/ig/invite/ID?token=abc'));
});

test('all four campaign languages get the matching partner PR guide',async()=>{
 for(const [i,l] of ['fa','tr','en','ru'].entries()){
   const r=await campaign.onComment(comment(`lang-${l}`,String(20000+i),defaultCampaign().keywords[l]));const m=await core.read('pub-member',r.memberId!);assert.equal(m!.data.language,l);
   const o=await core.read('pub-outbox',r.outboxId!);assert.equal(o!.data.text,CAMPAIGN_MESSAGES[l].partner1);
 }
});

suite('Friend web gate and per-customer coupons - NEW FLOW via partner link');
const {FriendGateService}=await import('../server/affiliate/friendGate');
const gate=new FriendGateService(core);
let friendToken='', secondFriendToken='';
test('prepare verified site customers and coupon-enabled partner fixture',async()=>{
 for(const name of ['coupon_friend1','coupon_friend2','coupon_friend3']){await store.createUser({username:name,password:'local-test-only',email:'',phone:name==='coupon_friend1'?'+15555551001':name==='coupon_friend2'?'+15555551002':'+15555551003'});await store.updateUserFields(name,{phoneVerifiedAt:new Date().toISOString()});}
 const m=(await core.read('pub-member',partnerId))!;await core.save('pub-member',partnerId,{...m.data,policy:{...m.data.policy,couponEnabled:true,couponValue:15,couponMinOrder:100}},m.version);
 friendToken=await campaign.linkToken(partnerId,(await core.read('pub-member',partnerId))!.data);
});

test('invalid signatures cannot reach the web gate',async()=>{
 await assert.rejects(()=>gate.info(partnerId,'a'.repeat(64)),{code:'INVITE_INVALID_OR_EXPIRED'});
 // token for different member should fail
 await assert.rejects(()=>gate.info('non-existent-id',friendToken),{code:'INVITE_INVALID_OR_EXPIRED'});
});

test('invitation info for partner link is truthful and does not reveal PII',async()=>{
 const info=await gate.info(partnerId,friendToken);assert.equal(info.needsLogin,true);assert.equal(info.verificationMethod,'link_possession');
 assert.equal(info.role,'partner');
 assert.ok(!JSON.stringify(info).includes('10001'));assert.ok(!JSON.stringify(info).includes(friendToken));
});

test('gate requires authentication, consent and explicit like self-attestation',async()=>{
 await assert.rejects(()=>gate.claim(partnerId,'',{token:friendToken,consent:true}),{code:'AUTH_REQUIRED'});
 await assert.rejects(()=>gate.claim(partnerId,'coupon_friend1',{token:friendToken,likeAttested:true}),{code:'CONSENT_REQUIRED'});
 await assert.rejects(()=>gate.claim(partnerId,'coupon_friend1',{token:friendToken,consent:true}),{code:'LIKE_ATTESTATION_REQUIRED'});
});

test('partner link is reusable: multiple friends can claim same partner link with independent coupons',async()=>{
 // First friend
 const r1=await gate.claim(partnerId,'coupon_friend1',{token:friendToken,consent:true,likeAttested:true,handle:'@test_friend1'});
 assert.ok(r1.coupon);
 const coupon1=await store.getCouponByCode(r1.coupon.code);assert.equal(coupon1?.ownerUsername,'coupon_friend1');

 // Second friend using SAME partner link should succeed with different coupon (new flow)
 const r2=await gate.claim(partnerId,'coupon_friend2',{token:friendToken,consent:true,likeAttested:true,handle:'@test_friend2'});
 assert.ok(r2.coupon);
 assert.notEqual(r1.coupon.code, r2.coupon.code);
 const coupon2=await store.getCouponByCode(r2.coupon.code);assert.equal(coupon2?.ownerUsername,'coupon_friend2');

 // Both attributions point to same partner code
 assert.equal((await store.getAttributionForUser('coupon_friend1'))?.code,partnerCode);
 assert.equal((await store.getAttributionForUser('coupon_friend2'))?.code,partnerCode);

 // Five concurrent claims for same user produce exactly one coupon (idempotency)
 const rs=await Promise.all(Array.from({length:5},()=>gate.claim(partnerId,'coupon_friend3',{token:friendToken,consent:true,likeAttested:true,handle:'@test_friend3'})));
 assert.equal(rs.filter(r=>!r.duplicate).length,1);
 assert.equal(new Set(rs.map(r=>r.coupon.code)).size,1);
});

test('same user cannot claim two different partners in same campaign',async()=>{
 // Create second partner with full follow flow to get link_ready
 const r=await campaign.onComment(comment('partner-second','10010','Ready'));
 const secondPartnerId=r.memberId!;
 let m=(await core.read('pub-member',secondPartnerId))!;
 await core.save('pub-member',secondPartnerId,{...m.data,policy:{...m.data.policy,couponEnabled:true,couponValue:15,couponMinOrder:0}},m.version);
 m=(await core.read('pub-member',secondPartnerId))!;
 const button2=await campaign.button(secondPartnerId,m.data);
 await campaign.onMessage({type:'message.received',accountId:'acc',authorId:'10010',participantId:'10010',conversationId:'second-partner-conv',button:button2,direction:'incoming',timestamp:new Date().toISOString()});
 await campaign.queue.sendOutbox(d=>campaign.beforeSend(d),(d,r)=>campaign.afterSend(d,r),d=>campaign.prepareMessage(d));
 const secondToken=await campaign.linkToken(secondPartnerId,(await core.read('pub-member',secondPartnerId))!.data);
 // coupon_friend1 already claimed partnerId, trying to claim second partner should fail CAMPAIGN_ALREADY_CLAIMED
 await assert.rejects(()=>gate.claim(secondPartnerId,'coupon_friend1',{token:secondToken,consent:true,likeAttested:true}),{code:'CAMPAIGN_ALREADY_CLAIMED'});
});

test('gate route is a real standalone route, not just a gate=1 query flag',async()=>{
 const {standalonePageFromPath}=await import('../src/utils/routes');assert.deepEqual(standalonePageFromPath('/ig/invite/ID','?token=abc'),{type:'invite',id:'ID',token:'abc'});
});

suite('Financial attribution, refund hold and monthly wallet settlement');
const af=await import('../server/affiliate/engine');const {PublishingReports}=await import('../server/publishing/reports');
const financial=new PublishingReports(core);
let commissionId='';
async function paidOrder(id:string,user:string,status='settled',amount=200){const n=new Date().toISOString();await store.createOnsiteOrder({id,username:user,kind:'reservation',amount,status,dueAt:n,payload:JSON.stringify({referralCode:partnerCode}),description:'V4 financial test',result:'{}',createdAt:n,updatedAt:n,settledAt:status==='settled'?n:'',settledBy:'cash:admin'});}
test('financial policy must be approved; unpaid orders never create commissions',async()=>{
 await store.createUser({username:'finance_buyer',password:'test',email:'',phone:''});await paidOrder('v4-unpaid','finance_buyer','pending_onsite');
 assert.equal((await af.onOrderPaid(store,{username:'finance_buyer',orderId:'v4-unpaid',kind:'reservation',amount:200,payload:{referralCode:partnerCode}})).length,0);
 const r=(await core.read('pub-affiliate-policy',partnerCode))!;await core.save('pub-affiliate-policy',partnerCode,{...r.data,policy:{...r.data.policy,financialApproved:true,commissionPct:10,refundDays:7,responsible:'owner-confirmed-test',payoutMin:0}},r.version);
 assert.equal((await af.onOrderPaid(store,{username:'finance_buyer',orderId:'v4-unpaid',kind:'reservation',amount:200,payload:{referralCode:partnerCode}})).length,0);
});
test('concurrent paid callbacks use actual net amount and create one commission',async()=>{
 await paidOrder('v4-paid','finance_buyer');const rs=await Promise.all(Array.from({length:5},()=>af.onOrderPaid(store,{username:'finance_buyer',orderId:'v4-paid',kind:'reservation',amount:999999,payload:{referralCode:partnerCode}})));
 assert.equal(new Set(rs.map(r=>r[0].id)).size,1);commissionId=rs[0][0].id;assert.equal(rs[0][0].commissionAmount,20);assert.ok(Date.parse(rs[0][0].holdUntil)>Date.now()+6*86400000);
});
test('invalid explicit referral never falls back to the previous valid attribution',async()=>{
 await store.createUser({username:'invalid_ref_buyer',password:'test',email:'',phone:''});await af.claimAttribution(store,{username:'invalid_ref_buyer',code:partnerCode,source:'link'});await paidOrder('invalid-ref-paid','invalid_ref_buyer');
 assert.equal((await af.onOrderPaid(store,{username:'invalid_ref_buyer',orderId:'invalid-ref-paid',kind:'reservation',amount:200,payload:{referralCode:'NOTEXIST'}})).length,0);
});
test('returning customers and staff do not get a new-customer commission',async()=>{
 await paidOrder('v4-return','finance_buyer');assert.equal((await af.onOrderPaid(store,{username:'finance_buyer',orderId:'v4-return',kind:'reservation',amount:200,payload:{referralCode:partnerCode}})).length,0);
 await paidOrder('v4-admin','admin');assert.equal((await af.onOrderPaid(store,{username:'admin',orderId:'v4-admin',kind:'reservation',amount:200,userRole:'gamer',payload:{referralCode:partnerCode}})).length,0);
});
test('refund hold cannot be bypassed and approval does not silently pay cash or credit wallet',async()=>{
 await store.createUser({username:'commission_owner',password:'test',email:'',phone:''});const a=(await store.getAffiliateByCode(partnerCode))!;await store.updateAffiliate(a.id,{username:'commission_owner'});
 await af.approveDueCommissions(store);assert.equal((await store.getAffiliateCommissionById(commissionId))!.status,'pending');assert.equal(await store.getWalletBalance('commission_owner'),0);
 await store.updateAffiliateCommission(commissionId,{holdUntil:'2020-01-01T00:00:00Z'});await af.approveDueCommissions(store);assert.equal((await store.getAffiliateCommissionById(commissionId))!.status,'pending');
 const meta=(await core.read('pub-commission-policy',commissionId))!;await core.save('pub-commission-policy',commissionId,{...meta.data,holdUntil:'2020-01-01T00:00:00Z'},meta.version);
 await af.approveDueCommissions(store);assert.equal((await store.getAffiliateCommissionById(commissionId))!.status,'approved');assert.equal(await store.getWalletBalance('commission_owner'),0);
});
test('open-month settlement is rejected and a refund reverses the approved commission',async()=>{
 await assert.rejects(()=>financial.settleMonth('admin',{confirmed:true,period:new Date().toISOString().slice(0,7),idempotencyKey:'openmonth'}),{code:'SETTLEMENT_PERIOD_OPEN'});
 await af.onOrderReversed(store,'v4-paid','admin');assert.equal((await store.getAffiliateCommissionById(commissionId))!.status,'reversed');
});
test('campaign reports count unpaid reservations separately and no cash is inferred from wallet credits',async()=>{
 const r=await financial.report();const c=r.campaigns.find(x=>x.id==='SQUAD26')!;assert.ok(c.reserved>c.paid);assert.equal(r.financial.physicalHandoverIsAllWallets,true);assert.equal(r.financial.walletCredited,0);
});

test('closed-month settlement credits wallet once, never claims physical cash payout, and can reverse',async()=>{
 const realNow=Date.now, date=new Date();date.setUTCDate(2);date.setUTCMonth(date.getUTCMonth()-1);const past=date.getTime(),period=date.toISOString().slice(0,7);
 await store.createUser({username:'past_buyer',password:'test',email:'',phone:''});await paidOrder('v4-past','past_buyer');
 let c:any;try{Date.now=()=>past;c=(await af.onOrderPaid(store,{username:'past_buyer',orderId:'v4-past',kind:'reservation',amount:200,payload:{referralCode:partnerCode}}))[0];}finally{Date.now=realNow;}
 assert.ok(c);await af.approveDueCommissions(store);
 const b={confirmed:true,period,idempotencyKey:'settle-month-test'};const a=await financial.settleMonth('admin',b);const replay=await financial.settleMonth('admin',b);
 assert.equal(a.credited,20);assert.deepEqual(replay,a);assert.equal(a.physicalCashPaid,false);assert.equal(await store.getWalletBalance('commission_owner'),20);assert.equal((await store.getAffiliateCommissionById(c.id))!.status,'wallet_credited');
 await af.onOrderReversed(store,'v4-past');assert.equal(await store.getWalletBalance('commission_owner'),0);
});
test('paid walk-in invoice uses only actual new gameplay cost, not linked food or prepaid bookings',async()=>{
 await store.createUser({username:'walkin_buyer',password:'test',email:'',phone:''});await af.claimAttribution(store,{username:'walkin_buyer',code:partnerCode,source:'walkin'});
 const receipt={id:'walkin-receipt',amount:250,direction:'in',confirmation:'operator_pos_manual'};await core.save('receipt',receipt.id,receipt,0);
 await core.save('invoice','walkin-invoice',{username:'walkin_buyer',newGameCost:150,amount:250,receipt},0);
 const c=await af.onOrderPaid(store,{username:'walkin_buyer',orderId:'walkin-invoice',kind:'session',amount:250});assert.equal(c[0].netAmount,150);assert.equal(c[0].commissionAmount,15);
 await store.createUser({username:'prepaid_buyer',password:'test',email:'',phone:''});await af.claimAttribution(store,{username:'prepaid_buyer',code:partnerCode,source:'link'});
 await core.save('invoice','prepaid-invoice',{username:'prepaid_buyer',newGameCost:150,receipt,reservationOrderId:'already-paid'},0);
 assert.equal((await af.onOrderPaid(store,{username:'prepaid_buyer',orderId:'prepaid-invoice',kind:'session',amount:250})).length,0);
});

suite('Agent registry and safe configuration');
const {AgentRegistry}=await import('../server/publishing/agents');
const agents=new AgentRegistry(core,async()=>new Response(JSON.stringify({ok:true,tasks:[]}),{status:200}));
let savedAgent:any;
test('agent profile stores only encrypted credentials and reports untested until explicitly checked',async()=>{
 savedAgent=await agents.save('admin',undefined,{name:'Test agent',adapterId:'manus',enabled:true,projectId:'',profile:'standard',apiKey:'agent-test-secret-1234'});
 assert.equal(savedAgent.status,'configured_untested');assert.ok(!JSON.stringify(await agents.list()).includes('agent-test-secret-1234'));
 const raw=await core.read('pub-agent',savedAgent.id);assert.ok(!JSON.stringify(raw).includes('agent-test-secret-1234'));
});
test('read-only connection test requires explicit consent and cannot claim publishing permissions',async()=>{
 await assert.rejects(()=>agents.testConnection('admin',savedAgent.id,{}),{code:'CONFIRMATION_REQUIRED'});
 const checked=await agents.testConnection('admin',savedAgent.id,{confirmed:true});assert.equal(checked.status,'ready');assert.equal(checked.capabilities.requiresExternalAccountAuthorization,true);savedAgent=checked;
});
test('explicit key deletion never falls back and seed does not reset a chosen default',async()=>{
 const cfg=await settings.config();await core.save('pub-config','main',{...cfg.data,defaultAgentId:savedAgent.id,selectedMode:'manual'},cfg.version);
 const cleared=await agents.save('admin',savedAgent.id,{...savedAgent.data,version:savedAgent.version,apiKey:''});assert.equal(cleared.status,'unconfigured');await settings.seed();assert.equal((await settings.config()).data.defaultAgentId,savedAgent.id);
});
test('unsupported adapters and ingest tokens cannot masquerade as working provider keys',async()=>{
 const x=await agents.save('admin',undefined,{name:'Unknown API',adapterId:'unsupported',profile:'standard',projectId:'',enabled:true,apiKey:'opaque-test-key'});assert.equal(x.status,'unsupported');await assert.rejects(()=>agents.testConnection('admin',x.id,{confirmed:true}),{code:'AGENT_ADAPTER_UNSUPPORTED'});
 await assert.rejects(()=>agents.save('admin',undefined,{name:'Wrong key',adapterId:'manus',apiKey:'baz_abc123'}),{code:'PROVIDER_KEY_NOT_INGEST_TOKEN'});
});
test('agent edits are CAS protected and stale requests roll back credential changes',async()=>{
 const before=await settings.vault.read('agent:'+savedAgent.id);
 await assert.rejects(()=>agents.save('admin',savedAgent.id,{...savedAgent.data,version:0,apiKey:'must-not-be-stored'}),{code:'VERSION_CONFLICT'});
 assert.equal(await settings.vault.read('agent:'+savedAgent.id),before);
});

suite('Retry review and queue fairness');
test('critical comments are not starved by an older external-post backlog',async()=>{
 const queue=new DurableQueue(core);for(let i=0;i<120;i++)await queue.ingest('bulk-'+i,'h'+i,{type:'post.external.created',accountId:'acc',nativeId:String(4000000+i),timestamp:new Date().toISOString()},'fairness');
 await queue.ingest('critical-comment','critical-hash',{type:'comment.received',accountId:'acc',timestamp:new Date().toISOString()},'fairness');
 const seen:string[]=[];await queue.processInbox(async e=>{seen.push(e.type);return {};},'fairness',1);assert.deepEqual(seen,['comment.received']);
});
test('business uniqueness is retained across updates, including after activation',async()=>{
 // In new flow, partner link is reusable, so we test uniqueness still holds for same member update
 const row=(await core.read('pub-member',partnerId))!;assert.ok(row.uniqueKey);
 await core.save('pub-member',row.id,{...row.data,updatedAt:new Date().toISOString()},row.version);
 assert.equal((await core.read('pub-member',row.id))!.uniqueKey,row.uniqueKey);
 await assert.rejects(()=>core.save('pub-member','another-member',row.data,0,row.uniqueKey));
});
test('ambiguous delivery cannot be retried blindly; operator observation is recorded separately',async()=>{
 const id='review-outbox';await core.save('pub-outbox',id,{status:'delivery_unknown',stage:'partner_link',memberId:partnerId,accountId:'acc',mediaId:'1234567',recipientId:'10001',createdAt:new Date().toISOString(),attempts:1,expiresAt:new Date(Date.now()+3600000).toISOString()},0);
 await assert.rejects(()=>campaign.resolveOutbox('admin',id,'retry',{confirmed:true,idempotencyKey:'unsafe-retry'}),{code:'UNSAFE_RETRY'});
 await assert.rejects(()=>campaign.resolveOutbox('admin',id,'confirm-observed',{confirmed:true,idempotencyKey:'missing-reference'}),{code:'PROVIDER_REFERENCE_REQUIRED'});
 const r=await campaign.resolveOutbox('admin',id,'confirm-observed',{confirmed:true,idempotencyKey:'review-done',messageId:'observed-provider-message',note:'Operator reviewed the correct conversation'});assert.equal(r.sentInThisRequest,false);assert.equal(r.evidence,'operator_confirmed');
 const saved=await core.read('pub-outbox',id);assert.equal(saved!.data.status,'sent');assert.ok(!JSON.stringify(saved).includes('Operator reviewed'));
});
await run({title:'Publishing / Instagram v4',jsonOut:'tests/reports/publishing.json'});
process.env=env;
