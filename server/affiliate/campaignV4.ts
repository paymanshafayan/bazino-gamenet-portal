/** V4 state machine. Existing affiliate/member tables remain the financial/domain source. */
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { IgMemberRow, AffiliateRow } from '../dataProviders';
import { OpsCore, fingerprint, fail, nowISO, newId } from '../management/core';
import { PublishingSettings } from '../publishing/settings';
import { MediaRegistry } from '../publishing/registry';
import { DurableQueue, type InboxEvent } from '../publishing/queue';
import type { CampaignPolicy, SocialLanguage } from '../../shared/publishing/types';
export interface CampaignResult {ok?:boolean;ignored?:boolean;wait?:boolean;reason?:string;memberId?:string;outboxId?:string;duplicate?:boolean;}
export interface CampaignMember {
  role:'partner'|'friend';accountId:string;mediaId:string;campaignId:string;igUserId:string;username:string;
  language:SocialLanguage;partnerCode:string;parentId:string;status:string;policy:CampaignPolicy;policyVersion:number;
  followMethod:string;followStatus:string;shareStatus:string;buttonNonce:string;createdAt:string;updatedAt:string;
  conversationId?:string;lastInteractionAt?:string;linkExpiresAt?:string;claimedBy?:string;
}
export function normalizeDigits(s:string){return s.replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x6f0)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x660));}
export function wholeKeyword(text:string,keyword:string,language:SocialLanguage){
  const s=String(text).replace(/@[A-Za-z0-9._]+/g,' ').normalize('NFKC').toLocaleLowerCase(language==='tr'?'tr':'en');
  const k=String(keyword).normalize('NFKC').toLocaleLowerCase(language==='tr'?'tr':'en').trim();
  if(!k)return false;const escaped=k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}\\p{M}_\\u200c\\u200d])${escaped}($|[^\\p{L}\\p{N}\\p{M}_\\u200c\\u200d])`,'u').test(s);
}
export function commentLanguage(text:string,policy:CampaignPolicy,languages:SocialLanguage[]):SocialLanguage|'ambiguous'|null {
  const found=languages.filter(l=>wholeKeyword(text,policy.keywords[l],l));return found.length>1?'ambiguous':found[0]||null;
}
export function renderCampaign(template:string,code:string,url='') {
  return template.replace(/\[(?:عدد یکتا|benzersiz numara|unique number|уникальный номер)\]/g,code).replace(/\{\{\s*code\s*\}\}/g,code).replace(/\{\{\s*invite_url\s*\}\}/g,url);
}
function sameSig(a:string,b:string){if(!/^[a-f\d]{64}$/i.test(a))return false;return timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));}
export class InstagramCampaignService {
  settings:PublishingSettings;registry:MediaRegistry;queue:DurableQueue;
  constructor(public core:OpsCore,fetcher?:typeof fetch){this.settings=new PublishingSettings(core);this.registry=new MediaRegistry(core);this.queue=new DurableQueue(core,fetcher);}
  async button(id:string,m:CampaignMember){
    const payload=`${id}.${m.buttonNonce}`;
    const sig=createHmac('sha256',await this.settings.invitationKey()).update(`button:${payload}:${m.igUserId}:${m.campaignId}:${m.mediaId}`).digest('hex');
    return `ig4.${payload}.${sig}`;
  }
  async memberForButton(token:string,authorId:string){
    const match=/^ig4\.([\w-]+)\.([a-f\d]{32})\.([a-f\d]{64})$/.exec(token||'');if(!match)return null;
    const row=await this.core.read<CampaignMember>('pub-member',match[1]);if(!row||row.data.igUserId!==authorId||row.data.buttonNonce!==match[2])return null;
    const expected=(await this.button(row.id,row.data)).split('.').pop()!;
    if(!sameSig(match[3],expected)||Date.now()-Date.parse(row.data.createdAt)>30*86400000)return null;
    return row;
  }
  async list(){return (await this.core.list<CampaignMember>('pub-member')).map(r=>({id:r.id,role:r.data.role,language:r.data.language,mediaId:r.data.mediaId,campaignId:r.data.campaignId,username:r.data.username,partnerCode:r.data.partnerCode,status:r.data.status,followMethod:r.data.followMethod,shareStatus:r.data.shareStatus,createdAt:r.data.createdAt}));}
  private async saveMember(id:string,data:CampaignMember,version:number){
    const uniqueKey='ig-member:'+fingerprint({account:data.accountId,campaign:data.campaignId,media:data.mediaId,author:data.igUserId,role:data.role,parent:data.parentId});
    const row=await this.core.save('pub-member',id,data,version,uniqueKey);
    const patch={status:data.status,followMethod:data.followMethod,shareStatus:data.shareStatus,updatedAt:data.updatedAt};
    if(await this.core.store.getIgMemberById(id))await this.core.store.updateIgMember(id,patch);
    return row;
  }
  async onComment(e:InboxEvent):Promise<CampaignResult>{
    if(e.status==='nested_reply')return {ignored:true};
    if(!e.nativeId||!e.commentId||!e.authorId||!/^\d{1,40}$/.test(e.authorId))return {ignored:true};
    const eligible=await this.registry.eligible(e.accountId,e.nativeId);if(!eligible)return {wait:true};
    if(!e.createdAt||!Number.isFinite(Date.parse(e.createdAt)))return {ignored:true,reason:'comment_timestamp_required'};
    const age=Date.now()-Date.parse(e.createdAt);if(age>7*86400000||age< -300000)return {ignored:true,reason:'comment_expired'};
    return this.core.store.runInTransaction(async()=>{
      const commentKey=fingerprint({account:e.accountId,comment:e.commentId});
      if(await this.core.read('pub-comment',commentKey)||await this.core.store.getIgMemberByCommentId(e.commentId!))return {ignored:true,duplicate:true};
      const policy=eligible.campaign.data,numeric=normalizeDigits((e.text||'').trim());
      const members=await this.core.list<CampaignMember>('pub-member');
      let role:'partner'|'friend'='partner',parent:any=null,lang:SocialLanguage|'ambiguous'|null=null;
      if(/^\d{6}$/.test(numeric)){
        parent=members.find(r=>r.data.role==='partner'&&r.data.partnerCode===numeric&&r.data.mediaId===e.nativeId&&r.data.accountId===e.accountId&&r.data.campaignId===eligible.campaign.id&&r.data.status==='code_sent');
        if(!parent||parent.data.igUserId===e.authorId)return {ignored:true,reason:'invalid_friend_code'};
        role='friend';lang=parent.data.language;
      }else lang=commentLanguage(e.text||'',policy,eligible.media.data.languages);
      if(!lang||lang==='ambiguous')return {ignored:true,reason:lang==='ambiguous'?'ambiguous_language':'no_keyword'};
      const repeat=members.find(r=>r.data.role===role&&r.data.igUserId===e.authorId&&r.data.mediaId===e.nativeId&&r.data.accountId===e.accountId&&r.data.campaignId===eligible.campaign.id&&(role==='partner'||r.data.parentId===parent.id));
      if(repeat){await this.core.save('pub-comment',commentKey,{memberId:repeat.id,duplicate:true},0);return {ignored:true,duplicate:true};}
      let code=numeric;
      if(role==='partner'){
        const taken=new Set((await this.core.store.listAffiliates()).map(a=>a.code));
        for(let i=0;i<40;i++){const candidate=String(randomInt(100000,1000000));if(!taken.has(candidate)){code=candidate;break;}}
        if(!/^\d{6}$/.test(code))fail('CODE_POOL_EXHAUSTED',503);
        const aff:AffiliateRow={id:newId('AFF'),code,username:'',name:e.username||code,type:'instagram',language:lang,destination:'/',parentId:'',status:'active',newPct:-1,returnPct:0,tournamentPct:0,overridePct:0,notes:'Instagram v4',createdAt:nowISO(),updatedAt:nowISO()};
        await this.core.store.createAffiliate(aff);
        await this.core.save('pub-affiliate-policy',code,{campaignId:eligible.campaign.id,policyVersion:eligible.campaign.version,policy},0);
      }
      const id=newId('IG4'),now=nowISO();
      const m:CampaignMember={role,accountId:e.accountId,mediaId:e.nativeId!,campaignId:eligible.campaign.id,igUserId:e.authorId!,username:e.username||'',language:lang,partnerCode:code,parentId:parent?.id||'',status:role==='partner'?'partner_follow_pending':'friend_follow_pending',policy:role==='friend'?parent.data.policy:policy,policyVersion:role==='friend'?parent.data.policyVersion:eligible.campaign.version,followMethod:'',followStatus:'unknown',shareStatus:role==='friend'?'share_confirmed_by_friend_code':'',buttonNonce:randomBytes(16).toString('hex'),createdAt:now,updatedAt:now};
      const legacy:IgMemberRow={id,role,campaignId:m.campaignId,mediaId:m.mediaId,commentId:e.commentId!,igUserId:m.igUserId,igUsername:m.username,partnerCode:code,parentMemberId:m.parentId,affiliateCode:code,status:m.status,followMethod:'',shareStatus:m.shareStatus,couponCode:'',inviteUrl:'',createdAt:now,updatedAt:now};
      await this.core.store.createIgMember(legacy);await this.saveMember(id,m,0);await this.core.save('pub-comment',commentKey,{memberId:id,campaignId:m.campaignId,language:lang},0);
      const template=role==='partner'?m.policy.messages[lang].partner1:m.policy.messages[lang].friend;
      const text=renderCampaign(template,'');
      if(role==='partner'&&/invite_url|[?&](?:token|sig|gate)=|\/ig\/invite\//i.test(text))fail('PRIVATE_LINK_FORBIDDEN');
      const outboxId=await this.queue.enqueue({kind:'private_reply',accountId:m.accountId,mediaId:m.mediaId,commentId:e.commentId,memberId:id,recipientId:m.igUserId,text,buttons:[{type:'postback',title:m.policy.messages[lang].button,payload:await this.button(id,m)}],expiresAt:new Date(Date.parse(e.createdAt!)+7*86400000).toISOString()},role==='partner'?'partner_intro':'friend_intro');
      await this.core.store.createIgEvent({id:newId('IGE'),memberId:id,mediaId:m.mediaId,commentId:e.commentId!,kind:role==='friend'?'friend_code_comment':'partner_comment',payload:'',result:role==='friend'?m.shareStatus:'queued',verificationMethod:role==='friend'?m.shareStatus:'comment_id',createdAt:now});
      return {ok:true,memberId:id,outboxId};
    });
  }
  async onMessage(e:InboxEvent):Promise<CampaignResult>{
    if(!e.button||!e.authorId||!e.conversationId||e.direction==='outgoing')return {ignored:true};
    if(e.participantId&&e.participantId!==e.authorId)return {ignored:true};
    if(Date.now()-Date.parse(e.timestamp)>24*3600000||Date.parse(e.timestamp)>Date.now()+300000)return {ignored:true};
    const member=await this.memberForButton(e.button,e.authorId);if(!member||member.data.accountId!==e.accountId)return {ignored:true,reason:'invalid_button'};
    if(!['partner_follow_pending','friend_follow_pending'].includes(member.data.status))return {ignored:true,duplicate:true};
    if(!await this.registry.eligible(e.accountId,member.data.mediaId))return {ignored:true};
    // External lookup outside DB transaction; a signed callback with this sender is necessary even for self-attestation.
    const follow=await this.queue.client.follow(e.accountId,e.authorId);
    return this.core.store.runInTransaction(async()=>{
      const row=await this.core.read<CampaignMember>('pub-member',member.id);if(!row||!['partner_follow_pending','friend_follow_pending'].includes(row.data.status))return {ignored:true};
      const m={...row.data,followStatus:follow,followMethod:follow==='verified'?'follow_verified':'button_event_only',conversationId:e.conversationId,lastInteractionAt:e.timestamp,updatedAt:nowISO()};
      if(follow==='not_following'||m.policy.requireVerifiedFollow&&follow!=='verified'){await this.saveMember(row.id,m,row.version);return {ignored:true,reason:'follow_pending'};}
      const stage=m.role==='partner'?'partner_code':'friend_link';
      m.status=m.role==='partner'?'code_ready':'link_ready';
      if(m.role==='friend')m.linkExpiresAt=new Date(Date.now()+m.policy.couponDays*86400000).toISOString();
      await this.saveMember(row.id,m,row.version);
      const text=m.role==='partner'?renderCampaign(m.policy.messages[m.language].partner2,m.partnerCode):m.policy.messages[m.language].invite;
      if(m.role==='partner'&&/invite_url|[?&](?:token|sig|gate)=|\/ig\/invite\//i.test(text))fail('PRIVATE_LINK_FORBIDDEN');
      const outboxId=await this.queue.enqueue({kind:'dm',accountId:m.accountId,mediaId:m.mediaId,memberId:row.id,recipientId:m.igUserId,conversationId:e.conversationId,text,buttons:[],expiresAt:new Date(Date.parse(e.timestamp)+24*3600000).toISOString()},stage);
      return {ok:true,outboxId};
    });
  }
  async linkToken(id:string,m:CampaignMember){
    if(m.role!=='friend'||!m.linkExpiresAt)fail('FRIEND_GATE_REQUIRED',409);
    return createHmac('sha256',await this.settings.invitationKey()).update(`friend:${id}:${m.igUserId}:${m.campaignId}:${m.mediaId}:${m.linkExpiresAt}`).digest('hex');
  }
  async verifyLink(id:string,token:string){
    const m=await this.core.read<CampaignMember>('pub-member',id);
    if(!m||m.data.role!=='friend'||!['link_ready','link_sent','activated'].includes(m.data.status)||!m.data.linkExpiresAt||Date.parse(m.data.linkExpiresAt)<Date.now())fail('INVITE_INVALID_OR_EXPIRED',404);
    if(!sameSig(token,await this.linkToken(id,m.data)))fail('INVITE_INVALID_OR_EXPIRED',404);
    return m;
  }
  async prepareMessage(input:any){
    if(input.stage!=='friend_link')return input;
    const r=await this.core.read<CampaignMember>('pub-member',input.memberId);
    if(!r||r.data.role!=='friend'||r.data.igUserId!==input.recipientId)fail('FRIEND_GATE_REQUIRED',409);
    const cfg=await this.settings.config(),token=await this.linkToken(r.id,r.data);
    // Computed only at dispatch: never returned in admin lists, logs or partner responses.
    return {...input,text:renderCampaign(input.text,r.data.partnerCode,`${cfg.data.baseUrl}/ig/invite/${r.id}?token=${token}`)};
  }
  async beforeSend(input:any){return input.accountId===(await this.settings.config()).data.zernioAccountId && !!await this.registry.eligible(input.accountId,input.mediaId);}
  async afterSend(input:any,result:any){
    const r=await this.core.read<CampaignMember>('pub-member',input.memberId);if(!r)return;
    const status=input.stage==='partner_code'?'code_sent':input.stage==='friend_link'?'link_sent':r.data.status;
    await this.saveMember(r.id,{...r.data,status,updatedAt:nowISO()},r.version);
    await this.core.store.createIgEvent({id:newId('IGE'),memberId:r.id,mediaId:r.data.mediaId,commentId:input.commentId||'',kind:'message_sent',payload:'',result:'sent',verificationMethod:result?.evidence==='operator_confirmed'?'operator_confirmed':'provider_response',createdAt:nowISO()});
  }
  async resolveOutbox(actor:string,id:string,action:string,b:any){
    if(b.confirmed!==true)fail('CONFIRMATION_REQUIRED');
    return this.core.command(actor,b.idempotencyKey,'outbox.resolve',{id,action,reference:b.messageId||'',noteHash:fingerprint(String(b.note||''))},async()=>{
      const r=await this.core.read('pub-outbox',id);if(!r)fail('NOT_FOUND',404);
      if(action==='retry'){
        if(r.data.status!=='failed'||r.data.attempts>=8)fail('UNSAFE_RETRY',409);
        if(!await this.beforeSend(r.data))fail('MEDIA_OR_POLICY_INACTIVE',409);
        if(Date.parse(r.data.expiresAt)<Date.now())fail('MESSAGE_WINDOW_EXPIRED',409);
        await this.core.save('pub-outbox',id,{...r.data,status:'queued',error:'',nextAt:0},r.version);return {id,status:'queued'};
      }
      if(action!=='confirm-observed'||r.data.status!=='delivery_unknown')fail('BAD_STATE',409);
      const reference=String(b.messageId||'');if(!reference||reference.length>300||/^https?:/i.test(reference)||!String(b.note||'').trim())fail('PROVIDER_REFERENCE_REQUIRED');
      await this.afterSend(r.data,{messageId:reference,evidence:'operator_confirmed'});
      await this.core.save('pub-outbox',id,{...r.data,status:'sent',providerMessageId:reference,sendEvidence:'operator_confirmed',resolvedBy:actor,resolvedAt:nowISO(),noteHash:fingerprint(String(b.note)),error:''},r.version);
      return {id,status:'sent',evidence:'operator_confirmed',sentInThisRequest:false};
    });
  }
  async dispatch(e:InboxEvent){if(e.type==='comment.received')return this.onComment(e);if(e.type==='message.received')return this.onMessage(e);return {ignored:true};}
}
