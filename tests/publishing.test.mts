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
test('all integration settings and secret aliases are blocked from generic/public APIs',()=>{for(const key of ['zernio_webhook_secret','manus_api_key','publishing_agents','ig_ingest_token','imejis_api_key','cloudflare_api_token','cloudflare_account_id','elevenlabs_api_key','youtube_api_key','twitch_client_id','twitch_client_secret','ZERNIO_API_KEY','MANUS_API_KEY','IMEJIS_API_KEY','CLOUDFLARE_API_TOKEN','ELEVENLABS_API_KEY','YOUTUBE_API_KEY','TWITCH_CLIENT_SECRET'])assert.equal(protectedIntegrationSetting(key),true);assert.equal(protectedIntegrationSetting('site_title'),false);});
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
 const row=(await core.read('pub-member',friend2Id))!;assert.ok(row.uniqueKey);await core.save('pub-member',row.id,{...row.data,updatedAt:new Date().toISOString()},row.version);
 assert.equal((await core.read('pub-member',row.id))!.uniqueKey,row.uniqueKey);
 await assert.rejects(()=>core.save('pub-member','another-member',row.data,0,row.uniqueKey));
});
test('ambiguous delivery cannot be retried blindly; operator observation is recorded separately',async()=>{
 const id='review-outbox';await core.save('pub-outbox',id,{status:'delivery_unknown',stage:'partner_code',memberId:partnerId,accountId:'acc',mediaId:'1234567',recipientId:'10001',createdAt:new Date().toISOString(),attempts:1,expiresAt:new Date(Date.now()+3600000).toISOString()},0);
 await assert.rejects(()=>campaign.resolveOutbox('admin',id,'retry',{confirmed:true,idempotencyKey:'unsafe-retry'}),{code:'UNSAFE_RETRY'});
 await assert.rejects(()=>campaign.resolveOutbox('admin',id,'confirm-observed',{confirmed:true,idempotencyKey:'missing-reference'}),{code:'PROVIDER_REFERENCE_REQUIRED'});
 const r=await campaign.resolveOutbox('admin',id,'confirm-observed',{confirmed:true,idempotencyKey:'review-done',messageId:'observed-provider-message',note:'Operator reviewed the correct conversation'});assert.equal(r.sentInThisRequest,false);assert.equal(r.evidence,'operator_confirmed');
 const saved=await core.read('pub-outbox',id);assert.equal(saved!.data.status,'sent');assert.ok(!JSON.stringify(saved).includes('Operator reviewed'));
});

suite('Media generation (Imejis + Cloudflare FLUX)');
const {MediaGenService,IMEJIS_RENDER_BASE,FLUX_MODEL}=await import('../server/publishing/mediagen');
const {PublishingService}=await import('../server/publishing/publish');
const sharp=(await import('sharp')).default;
const {mkdtempSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
const mgRoot=mkdtempSync(join(tmpdir(),'mediagen-'));
const square=await sharp({create:{width:1080,height:1080,channels:3,background:{r:18,g:52,b:86}}}).png().toBuffer();
const story=await sharp({create:{width:1080,height:1920,channels:3,background:{r:86,g:18,b:52}}}).png().toBuffer();
const mgCalls:any[]=[];
const mgFetch=async(url:string,init:any={})=>{mgCalls.push({url,init});
 if(url.startsWith(IMEJIS_RENDER_BASE)){if(url.includes('fail-design'))return new Response('boom',{status:500});return new Response(new Uint8Array(square),{headers:{'content-type':'image/png'}});}
 if(url.includes('/ai/run/')){const body=JSON.parse(String(init.body));if(String(body.prompt).includes('FAIL'))return new Response('boom',{status:500});
   return new Response(JSON.stringify({success:true,result:{image:story.toString('base64')}}),{headers:{'content-type':'application/json'}});}
 if(url.includes('/zones/'))return new Response(JSON.stringify({success:true,result:{account:{id:'cf-account-1'}}}),{headers:{'content-type':'application/json'}});
 return new Response('not found',{status:404});};
const mgPub=new PublishingService(core,mgFetch as any,mgRoot),mg=new MediaGenService(core,mgFetch as any,mgPub.assets,mgPub);
const mgConfig=async(b:any={})=>{const c=await settings.config();return settings.saveConfig('admin',{version:c.version,idempotencyKey:'mg-cfg-'+mgCalls.length+Math.random(),selectedMode:c.data.selectedMode,defaultCampaignId:c.data.defaultCampaignId,zernioAccountId:c.data.zernioAccountId,mediagenEnabled:true,mediagenDesigns:['design-1'],mediagenImejisLimit:2,mediagenFluxLimit:5,...b});};
test('mediagen stays closed until enabled and every request confirms cost',async()=>{
 delete process.env.CLOUDFLARE_ACCOUNT_ID;process.env.CLOUDFLARE_ZONE_ID='zone-1';
 process.env.IMEJIS_API_KEY='imejis-test-key';process.env.CLOUDFLARE_API_TOKEN='cf-test-token';
 await assert.rejects(()=>mg.generate('admin',{provider:'imejis',designId:'design-1',title:'t',language:'fa',confirmedCost:true}),{code:'MEDIAGEN_DISABLED'});
 await mgConfig();
 await assert.rejects(()=>mg.generate('admin',{provider:'imejis',designId:'design-1',title:'t',language:'fa'}),{code:'COST_CONFIRMATION_REQUIRED'});
 await assert.rejects(()=>mg.generate('admin',{provider:'imejis',designId:'not-allowed',title:'t',language:'fa',confirmedCost:true}),{code:'DESIGN_NOT_ALLOWED'});
 await assert.rejects(()=>mg.generate('admin',{provider:'imejis',designId:'bad design!',title:'t',language:'fa',confirmedCost:true}),{code:'INVALID_DESIGN_ID'});
 await assert.rejects(()=>mg.generate('admin',{provider:'flux',title:'t',language:'xx',prompt:'a'.repeat(20),confirmedCost:true}),{code:'INVALID_LANGUAGE'});
 const savedKey=process.env.IMEJIS_API_KEY;delete process.env.IMEJIS_API_KEY;
 await assert.rejects(()=>mg.generate('admin',{provider:'imejis',designId:'design-1',title:'t',language:'fa',confirmedCost:true}),{code:'IMEJIS_NOT_CONFIGURED'});
 process.env.IMEJIS_API_KEY=savedKey;
});
test('imejis render: exact request contract, idempotent enqueue, asset import, monthly quota',async()=>{
 const g=await mg.generate('admin',{provider:'imejis',designId:'design-1',title:'Poster A',language:'fa',fields:{'headline.text':'سلام بازینو'},confirmedCost:true});
 assert.equal(g.status,'queued');assert.match(g.id,/^[a-f0-9]{64}$/);
 const dup=await mg.generate('admin',{provider:'imejis',designId:'design-1',title:'Poster A',language:'fa',fields:{'headline.text':'سلام بازینو'},confirmedCost:true});
 assert.equal(dup.id,g.id);assert.equal(dup.duplicate,true);
 await mg.work();await mg.work();
 const t=(await core.read('pub-mediagen-task',g.id))!;
 assert.equal(t.data.status,'completed');assert.ok(!t.data.error);
 const call=mgCalls.find(c=>c.url==='https://render.imejis.io/v1/design-1?format=jpeg&quality=92');
 assert.ok(call,'expected imejis render call');
 assert.equal(call.init.headers['dma-api-key'],'imejis-test-key');
 assert.deepEqual(JSON.parse(call.init.body),{'headline.text':'سلام بازینو'});
 assert.match(t.data.assetId!,/^AS-/);
 const asset=await mgPub.assets.ready(t.data.assetId!);
 assert.equal(asset.data.status,'ready');assert.equal(asset.data.mime,'image/png');
 assert.equal(asset.data.width,1080);assert.equal(asset.data.height,1080);
 const g2=await mg.generate('admin',{provider:'imejis',designId:'design-1',title:'Poster B',language:'fa',fields:{'headline.text':'دومی'},confirmedCost:true});
 await mg.work();await mg.work();
 assert.equal((await core.read('pub-mediagen-task',g2.id))!.data.status,'completed');
 await assert.rejects(()=>mg.generate('admin',{provider:'imejis',designId:'design-1',title:'Poster C',language:'fa',fields:{'headline.text':'سومی'},confirmedCost:true}),{code:'GENERATION_QUOTA_EXCEEDED'});
});
test('flux render resolves the account from the zone and parses base64 JSON output',async()=>{
 const g=await mg.generate('admin',{provider:'flux',title:'Raw art',language:'en',prompt:'A neon arcade hall at night, cinematic',confirmedCost:true});
 await mg.work();await mg.work();
 const t=(await core.read('pub-mediagen-task',g.id))!;
 assert.equal(t.data.status,'completed');
 const zoneCall=mgCalls.find(c=>c.url==='https://api.cloudflare.com/client/v4/zones/zone-1');
 assert.ok(zoneCall,'expected zone lookup');
 assert.equal(zoneCall.init.headers.Authorization,'Bearer cf-test-token');
 const run=mgCalls.find(c=>c.url===`https://api.cloudflare.com/client/v4/accounts/cf-account-1/ai/run/${FLUX_MODEL}`);
 assert.ok(run,'expected flux run call with derived account id');
 assert.equal(run.init.headers.Authorization,'Bearer cf-test-token');
 assert.equal(JSON.parse(run.init.body).prompt,'A neon arcade hall at night, cinematic');
 const asset=await mgPub.assets.ready(t.data.assetId!);
 assert.equal(asset.data.width,1080);assert.equal(asset.data.height,1920);
});
test('provider failure is recorded, no asset is created, failed tasks cannot import',async()=>{
 const g=await mg.generate('admin',{provider:'flux',title:'Bad render',language:'en',prompt:'FAIL this render',confirmedCost:true});
 await mg.work();await mg.work();
 const t=(await core.read('pub-mediagen-task',g.id))!;
 assert.equal(t.data.status,'failed');assert.equal(t.data.error,'FLUX_HTTP_500');assert.ok(!t.data.assetId);
 await assert.rejects(()=>mg.import('admin',g.id,{confirmed:true,caption:'x'}),{code:'TASK_NOT_READY'});
});
test('import creates only a manual draft; human approval pipeline stays untouched',async()=>{
 const completed=(await mg.tasks('admin')).filter(t=>t.status==='completed');
 const fluxTask=completed.find(t=>t.provider==='flux')!,squareTask=completed.find(t=>t.provider==='imejis')!;
 await assert.rejects(()=>mg.import('admin',fluxTask.id,{caption:'Tehran nights'}),{code:'CONFIRMATION_REQUIRED'});
 await assert.rejects(()=>mg.import('admin',fluxTask.id,{confirmed:true}),{code:'CAPTION_REQUIRED'});
 await assert.rejects(()=>mg.import('staff2',squareTask.id,{confirmed:true,caption:'not mine',format:'image'}),{code:'FORBIDDEN'});
 // تصویر عمودی (۹:۱۶) برای فرمت image رد می‌شود — همان قاعدهٔ خط لوله
 await assert.rejects(()=>mg.import('admin',fluxTask.id,{confirmed:true,caption:'عمودی',format:'image'}),{code:'MEDIA_ASPECT_RATIO'});
 const imp=await mg.import('admin',fluxTask.id,{confirmed:true,caption:'Tehran nights at Bazino',format:'story'});
 assert.equal(imp.status,'imported');
 const draft=(await core.read('pub-draft',imp.draftId))!;
 assert.equal(draft.data.status,'draft');assert.equal(draft.data.executionMode,'manual');
 assert.deepEqual(draft.data.assetIds,[fluxTask.assetId]);assert.equal(draft.data.language,'en');
 assert.equal((await core.list('pub-publication')).length,0);
 assert.equal((await core.read('pub-mediagen-task',fluxTask.id))!.data.status,'imported');
 await assert.rejects(()=>mg.import('admin',fluxTask.id,{confirmed:true,caption:'again',format:'story'}),{code:'TASK_NOT_READY'});
});
test('cancel removes queued work from processing and frees nothing from quota',async()=>{
 const g=await mg.generate('admin',{provider:'flux',title:'Cancel me',language:'en',prompt:'A quiet chess board, cinematic lighting',confirmedCost:true});
 await assert.rejects(()=>mg.cancel('admin',g.id,{}),{code:'CONFIRMATION_REQUIRED'});
 await mg.cancel('admin',g.id,{confirmed:true});
 await mg.work();await mg.work();
 assert.equal((await core.read('pub-mediagen-task',g.id))!.data.status,'cancelled');
 await assert.rejects(()=>mg.cancel('admin',g.id,{confirmed:true}),{code:'TASK_NOT_CANCELLABLE'});
 const q=await mg.quota();
 assert.match(q.month,/^\d{4}-\d{2}$/);
 assert.equal(q.imejis.used,2);assert.equal(q.flux.used,2); // ۱ موفق + ۱ ناموفق؛ کنسل‌شده نمی‌شمارد
 assert.equal((await mg.tasks('staff2')).length,0); // مالکیت: دیگران چیزی نمی‌بینند
});


suite('Campaign brain + $0 reels (phase 2)');
const {TrendService}=await import('../server/publishing/trends');
const {BriefService}=await import('../server/publishing/briefs');
const {HOOK_PATTERNS,hooksFor}=await import('../server/publishing/hooks');
const {execFile}=await import('node:child_process');const {promisify:promisify2}=await import('node:util');const execT=promisify2(execFile);
const ffmpegPath=(await import('@ffmpeg-installer/ffmpeg')).default.path;
// صدای تستی واقعی (۴ ثانیه سکوت WAV) برای ماک ElevenLabs
const ttsWav=Buffer.from((await execT(ffmpegPath,['-y','-f','lavfi','-i','anullsrc=r=44100:cl=mono','-t','4','-c:a','pcm_s16le','-f','wav','-'],{encoding:'buffer',maxBuffer:16*1024*1024})).stdout);
assert.ok(ttsWav.length>1000,'test audio generated');
const brainCalls:any[]=[];
const brainFetch=async(url:string,init:any={})=>{brainCalls.push({url,init});
 if(url.startsWith('https://api.groq.com/'))return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({goal:'تورنمنت کانتر آخر هفته',audience:'گیمرهای فارسی‌زبان قبرس',offer:'پکیج شبانه با ۲۰٪ تخفیف',hooks:['چالش جدید کانتر که فقط ۵٪ گیمرها ردش می‌کنند!','اگر این پکیج را امتحان نکرده‌ای پولت را دور ریخته‌ای!','۳ دلیل که این هفته کلاب داغ‌ترین جای شهر است'],caption:'آماده‌ی چالش باش! #بازینو #گیمنت',cta:'همین حالا از سایت رزرو کن'})}}]}),{headers:{'content-type':'application/json'}});
 if(url.includes('elevenlabs.io/'))return new Response(new Uint8Array(ttsWav),{headers:{'content-type':'audio/wav'}});
 if(url.startsWith('https://www.googleapis.com/youtube/v3/videos')){const region=/regionCode=([A-Z]{2})/.exec(url)?.[1]||'';
   if(url.includes('videoCategoryId=20')&&region==='CY')return new Response(JSON.stringify({items:[]}),{headers:{'content-type':'application/json'}});
   return new Response(JSON.stringify({items:[{snippet:{title:`hot ${region} gaming video`,channelTitle:'GamerCh'},statistics:{viewCount:'98765'}}]}),{headers:{'content-type':'application/json'}});}
 if(url.startsWith('https://id.twitch.tv/oauth2/token'))return new Response(JSON.stringify({access_token:'tw-token'}),{headers:{'content-type':'application/json'}});
 if(url.startsWith('https://api.twitch.tv/helix/games/top'))return new Response(JSON.stringify({data:[{name:'Counter-Strike 2',viewers:'51234'},{name:'VALORANT',viewers:'41000'}]}),{headers:{'content-type':'application/json'}});
 return new Response('not found',{status:404});};
const today=new Date().toISOString().slice(0,10);

test('trend digest: silent without keys, daily record once, both sources merged',async()=>{
 delete process.env.YOUTUBE_API_KEY;delete process.env.TWITCH_CLIENT_ID;delete process.env.TWITCH_CLIENT_SECRET;
 const t0=new TrendService(core,brainFetch as any);await t0.work();
 assert.equal(await core.read('pub-trend-digest',today),undefined); // بدون کلید ساکت
 assert.equal(brainCalls.filter(c=>c.url.includes('googleapis')||c.url.includes('twitch')).length,0);
 process.env.YOUTUBE_API_KEY='yt-test-key';process.env.TWITCH_CLIENT_ID='tw-id';process.env.TWITCH_CLIENT_SECRET='tw-secret';
 const t1=new TrendService(core,brainFetch as any);await t1.work();
 const d=await core.read('pub-trend-digest',today);
 assert.ok(d,'digest saved');
 assert.equal(d!.data.youtube.length,2); // CY (fallback بدون دسته) + TR
 assert.equal(d!.data.twitch.length,2);
 assert.ok(d!.data.twitch[0].name==='Counter-Strike 2');
 const callsBefore=brainCalls.length;await t1.work();
 assert.equal(brainCalls.length,callsBefore); // idempotent روزانه
 assert.equal((await t1.latest())!.date,today);
 assert.ok(HOOK_PATTERNS.length>=24&&hooksFor('fa').length>=8,'hook library seeded');
});

test('brief lifecycle: validation, human approval gate, ownership, groq suggestion',async()=>{
 const br=new BriefService(core,brainFetch as any);
 const bad={language:'fa',goal:'تست',audience:'',offer:'',hooks:[],caption:'x',cta:''};
 await assert.rejects(()=>br.save('admin',undefined,bad),{code:'BRIEF_HOOKS_REQUIRED'});
 await assert.rejects(()=>br.save('admin',undefined,{...bad,hooks:['a'],caption:'لینک /ig/invite/x',cta:'برو'}),{code:'PRIVATE_LINK_FORBIDDEN'});
 const d=await br.save('admin',undefined,{language:'fa',goal:'تورنمنت شب یلدا',audience:'گیمرها',offer:'پکیج ویژه',hooks:['هوک ۱','هوک ۲'],caption:'کپشن تستی',cta:'رزرو کن'});
 assert.equal(d.data.status,'draft');assert.equal(d.data.source,'manual');
 await assert.rejects(()=>br.approve('admin',d.id,{}),{code:'BRIEF_CONFIRMATION_REQUIRED'});
 await assert.rejects(()=>br.approve('staff2',d.id,{confirmed:true}),{code:'FORBIDDEN'});
 const ap=await br.approve('admin',d.id,{confirmed:true,version:d.version});
 assert.equal(ap.data.status,'approved');assert.equal(ap.data.approvedBy,'admin');
 await assert.rejects(()=>br.approve('admin',d.id,{confirmed:true,version:ap.version}),{code:'BRIEF_NOT_DRAFT'});
 await assert.rejects(()=>br.save('admin',d.id,{language:'fa',goal:'ویرایش بعد از تأیید',hooks:['x'],caption:'c',cta:'c'}),{code:'BRIEF_NOT_EDITABLE'});
 assert.equal((await br.list('staff2')).length,0);
 // پیشنهاد با Groq
 delete process.env.GROQ_API_KEY;
 await assert.rejects(()=>br.suggest('admin',{language:'fa'}),{code:'GROQ_NOT_CONFIGURED'});
 process.env.GROQ_API_KEY='groq-test-key';
 const sug=await br.suggest('admin',{language:'fa',goalHint:'تورنمنت کانتر'});
 assert.equal(sug.data.status,'draft');assert.equal(sug.data.source,'groq');
 assert.equal(sug.data.hooks.length,3);assert.equal(sug.data.trendRef,today);
 const groqCall=brainCalls.find(c=>c.url.includes('api.groq.com'));
 assert.ok(groqCall,'groq called');
 assert.equal((groqCall.init.headers as any).Authorization,'Bearer groq-test-key');
});

test('compose provider: full chain brief→reel mp4 via real ffmpeg, quota, guards',async()=>{
 process.env.ELEVENLABS_API_KEY='eleven-test-key';
 // سرویس compose با fetcher ترکیبی (مسیرهای فاز ۱ + مغز/صدای فاز ۲)
 const combinedFetch=async(url:string,init:any={})=>(url.includes('elevenlabs.io/')||url.includes('api.groq.com')||url.includes('googleapis.com')||url.includes('twitch.tv'))?brainFetch(url,init):mgFetch(url,init);
 const mgc=new MediaGenService(core,combinedFetch as any,mgPub.assets,mgPub);
 // تصویر منبع ۹:۱۶ در کتابخانهٔ رسانه
 const poster=await sharp({create:{width:1080,height:1920,channels:3,background:{r:10,g:30,b:60}}}).png().toBuffer();
 const src=await mgPub.assets.create('admin',{mime:'image/png',size:poster.length,name:'poster.png',idempotencyKey:'compose-src-'+Date.now()});
 await mgPub.assets.chunk('admin',src.id,0,poster,true);await mgPub.assets.finalize('admin',src.id,true);
 // بریف‌ها: یکی draft (برای تست نگه) و یکی approved (برای زنجیرهٔ کامل)
 const br=new BriefService(core,brainFetch as any);
 const draftBrief=await br.save('admin',undefined,{language:'fa',goal:'بریف تأییدنشده',audience:'گیمرها',offer:'میز آزاد',hooks:['هوک'],caption:'کپشن',cta:'رزرو'});
 const brief=await br.save('admin',undefined,{language:'fa',goal:'ریلز بازی داغ امروز',audience:'گیمرها',offer:'میز آزاد',hooks:['هوک'],caption:'کپشن',cta:'رزرو'});
 const approved=await br.approve('admin',brief.id,{confirmed:true,version:brief.version});
 // نگه‌ها
 await assert.rejects(()=>mgc.generate('admin',{provider:'compose',sourceAssetId:src.id,script:'کوتاه',title:'t',language:'fa',confirmedCost:true}),{code:'INVALID_SCRIPT'});
 await assert.rejects(()=>mgc.generate('admin',{provider:'compose',sourceAssetId:src.id,script:'اسکریپت بدون بریف تأییدشده اینجا',title:'t',language:'fa',briefId:draftBrief.id,confirmedCost:true}),{code:'BRIEF_NOT_APPROVED'});
 delete process.env.ELEVENLABS_API_KEY;
 await assert.rejects(()=>mgc.generate('admin',{provider:'compose',sourceAssetId:src.id,script:'بدون کلید الونلَبز تست می‌شود',title:'t',language:'fa',confirmedCost:true}),{code:'ELEVENLABS_NOT_CONFIGURED'});
 process.env.ELEVENLABS_API_KEY='eleven-test-key';
 // تولید کامل
 const g=await mgc.generate('admin',{provider:'compose',sourceAssetId:src.id,briefId:approved.id,title:'ریلز بازی داغ',language:'fa',
   script:'سلام به همهٔ گیمرهای بازینو؛ امشب میزهای شطرنج و کانتر آمادهٔ چالش شماست.',subtitle:'بازی داغ امشب\nمیز آزاد منتظر شماست',confirmedCost:true});
 assert.equal(g.status,'queued');
 await mgc.work();await mgc.work();
 const t=(await core.read('pub-mediagen-task',g.id))!;
 assert.ok(t.data.status==='completed','compose render failed: '+JSON.stringify({error:t.data.error,callUrls:brainCalls.filter(c=>c.url.includes('elevenlabs')).map(c=>c.url)}));
 const reel=await mgPub.assets.ready(t.data.assetId!);
 assert.equal(reel.data.mime,'video/mp4');assert.equal(reel.data.width,1080);assert.equal(reel.data.height,1920);
 assert.ok(reel.data.duration!>=3&&reel.data.duration!<=10,'duration ~4s');
 const elCall=brainCalls.find(c=>c.url.startsWith('https://api.elevenlabs.io/'));
 assert.ok(elCall,'elevenlabs called');
 assert.equal((elCall.init.headers as any)['xi-api-key'],'eleven-test-key');
 assert.equal(JSON.parse(elCall.init.body).model_id,'eleven_v3');
 // ورود به جریان انتشار به‌عنوان ریلز — فقط draft
 const imp=await mgc.import('admin',g.id,{confirmed:true,caption:'چالش امشب! #بازینو',format:'reel'});
 const draft=(await core.read('pub-draft',imp.draftId))!;
 assert.equal(draft.data.format,'reel');assert.equal(draft.data.executionMode,'manual');
 assert.equal(draft.data.assetIds.length,1);
 assert.equal((await core.list('pub-publication')).length,0);
 // سهمیهٔ ماهانهٔ compose
 const q=await mgc.quota();assert.equal(q.compose.used,1);assert.ok(q.compose.limit>=1);
 const g2=await mgc.generate('admin',{provider:'compose',sourceAssetId:src.id,title:'ریلز دوم',language:'fa',script:'اسکریپت دوم برای تست سهمیهٔ ماهانهٔ ساخت ریلز فارسی',confirmedCost:true});
 await mgc.work();await mgc.work();
 assert.equal((await core.read('pub-mediagen-task',g2.id))!.data.status,'completed');
});

await run({title:'Publishing / Instagram v4',jsonOut:'tests/reports/publishing.json'});
process.env=env;
