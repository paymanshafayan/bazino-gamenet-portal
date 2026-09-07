import express from 'express';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { OpsCore, endpoint, fail, nowISO } from '../management/core';
import { PublishingSettings } from './settings';
import { DurableQueue, type InboxEvent } from './queue';
import { MediaRegistry } from './registry';
import type { Publication, PublishedMedia } from '../../shared/publishing/types';

export const ZERNIO_EVENTS=['post.scheduled','post.published','post.failed','post.partial','post.cancelled','post.recycled','post.platform.published','post.platform.failed','post.platform.deleted','post.external.created','post.external.updated','post.external.deleted','account.connected','account.disconnected','message.received','message.sent','message.edited','message.deleted','message.read','reaction.received','referral.received','conversation.started','comment.received'] as const;
export function verifyHmac(raw:Buffer,signature:string,secret:string){
  const sig=String(signature||'').replace(/^sha256=/i,'');if(!secret||!/^\p{ASCII}+$/u.test(sig)||!/^([a-f\d]{64})$/i.test(sig))return false;
  const a=Buffer.from(sig,'hex'),b=createHmac('sha256',secret).update(raw).digest();return timingSafeEqual(a,b);
}
const str=(v:any)=>typeof v==='string'?v:'';
function identity(...v:any[]){const values=v.filter(x=>x!==undefined&&x!==null&&x!=='');if(values.some(x=>typeof x!=='string'))fail('INVALID_IDENTIFIER');const set=new Set(values);if(set.size>1)fail('CONFLICTING_IDENTIFIERS');return String(values[0]||'');}
export function normalizeZernio(b:any):InboxEvent {
  if(!b||typeof b!=='object'||Array.isArray(b))fail('INVALID_EVENT');
  const type=identity(b.event,b.type),d=b.data||b.payload||b,c=d.comment||{},post=d.post||{},account=d.account||b.account||{},message=d.message||{},conversation=d.conversation||{},metadata=d.metadata||{};
  const timestamp=str(b.timestamp)||nowISO();if(!Number.isFinite(Date.parse(timestamp)))fail('INVALID_TIMESTAMP');
  const e:InboxEvent={type,accountId:identity(account.accountId,account.id,d.accountId),timestamp,platform: str(account.platform)||str(c.platform)||str(message.platform)||str(d.platform?.name)||str(post.platform)};
  if(type==='comment.received'){
    // post.id and comment.postId are Zernio INTERNAL IDs on the official comment envelope.
    e.nativeId=identity(c.platformPostId,c.mediaId,post.platformPostId,d.platformPostId,d.mediaId,d.postId);
    e.commentId=identity(c.id,c.commentId,d.commentId);e.authorId=identity(c.author?.id,d.author?.id,c.authorId);e.username=str(c.author?.username||d.author?.username).slice(0,100);
    e.text=str(c.text??c.message??d.text).slice(0,3000);e.createdAt=str(c.createdAt)||str(d.createdAt)||'';
    if(!e.nativeId||!/^\d{1,40}$/.test(e.nativeId)||!e.commentId||!e.authorId||!e.text)fail('INVALID_COMMENT');
    if(c.isReply||c.parentCommentId)e.status='nested_reply';
  }else if(type.startsWith('post.external.')){
    e.nativeId=identity(post.id,post.platformPostId);e.platform=str(post.platform)||e.platform;
  }else if(type.startsWith('post.')){
    e.providerPostId=str(post.id);e.publicationId=str(post.metadata?.bazinoPublicationId);
    e.nativeId=str(d.platform?.platformPostId);e.status=str(d.platform?.status||post.status);e.platform=str(d.platform?.name)||e.platform;
  }else if(type.startsWith('message.')||['conversation.started','reaction.received','referral.received'].includes(type)){
    e.authorId=identity(message.sender?.id,d.sender?.id,d.reaction?.sender?.id);e.conversationId=identity(conversation.id,message.conversationId);
    e.participantId=str(conversation.participantId);e.direction=str(message.direction);e.messageId=str(message.platformMessageId||message.id);
    e.button=identity(metadata.postbackPayload,metadata.quickReplyPayload,d.button?.payload,d.postback?.payload,message.payload);
  }else if(type==='analytics.synced'){e.cursor=str(d.sync?.cursor);}
  return e;
}
export class WebhookService {
  queue:DurableQueue;settings:PublishingSettings;registry:MediaRegistry;
  constructor(public core:OpsCore,fetcher?:typeof fetch){this.queue=new DurableQueue(core,fetcher);this.settings=this.queue.settings;this.registry=new MediaRegistry(core);}
  async receive(raw:Buffer,signature:string,stream:'main'|'analytics'='main'){
    const secret=await this.settings.vault.zernio(stream==='analytics'?'zernio_analytics_webhook_secret':'zernio_webhook_secret');
    if(!secret)fail('WEBHOOK_NOT_CONFIGURED',503);
    if(!verifyHmac(raw,signature,secret))fail('INVALID_SIGNATURE',401);
    let body:any;try{body=JSON.parse(raw.toString('utf8'));}catch{fail('INVALID_JSON');}
    if(body.event==='webhook.test')return {ok:true,outboundSent:false,test:true};
    const event=normalizeZernio(body);
    if(stream==='analytics'?event.type!=='analytics.synced':!ZERNIO_EVENTS.includes(event.type as any))return {ok:true,ignored:'unsupported_event'};
    const cfg=(await this.settings.config()).data;
    if(!event.accountId && event.providerPostId){
      const job=(await this.core.list<Publication>('pub-publication')).find(r=>r.data.providerPostId===event.providerPostId);
      if(job)event.accountId=job.data.snapshot.accountId;
    }
    if(!cfg.zernioAccountId||event.accountId!==cfg.zernioAccountId||event.platform&&event.platform!=='instagram')return {ok:true,ignored:'account_mismatch'};
    const id=str(body.id||body.eventId)||createHash('sha256').update(raw).digest('hex');
    const accepted=await this.queue.ingest(id,createHash('sha256').update(raw).digest('hex'),event,stream);
    if(accepted.conflict)fail('EVENT_ID_CONFLICT',409);
    return {ok:true,accepted:true,duplicate:accepted.duplicate,outboundSent:false};
  }
  async lifecycle(e:InboxEvent){
    if(e.type.startsWith('account.')){
      const r=await this.core.read('pub-account',e.accountId);
      if(r?.data.timestamp&&Date.parse(r.data.timestamp)>Date.parse(e.timestamp))return;
      await this.core.save('pub-account',e.accountId,{connected:e.type==='account.connected',timestamp:e.timestamp},r?.version||0);return;
    }
    if(e.type.startsWith('post.external.')){
      if(!e.nativeId||!/^\d+$/.test(e.nativeId))return;
      const r=await this.registry.lookup(e.accountId,e.nativeId);
      if(e.type.endsWith('deleted')){
        if(r)await this.core.save('pub-media',r.id,{...r.data,active:false,approval:'deleted'},r.version);
      }else if(!r)await this.registry.register('zernio-sync',{media_id:e.nativeId,accountId:e.accountId},'external_discovery');
      return;
    }
    if(e.type.startsWith('post.')){
      const jobs=await this.core.list<Publication>('pub-publication');
      const job=jobs.find(j=>(j.data.providerPostId===e.providerPostId||!!e.publicationId&&j.id===e.publicationId)&&j.data.snapshot.accountId===e.accountId);
      if(!job){if(e.nativeId&&/^\d+$/.test(e.nativeId))await this.registry.register('zernio-discovery',{media_id:e.nativeId,accountId:e.accountId},'external_discovery');return;}
      if(e.type==='post.platform.published'&&e.nativeId){
        const data={...job.data,state:'published' as const,providerPostId:e.providerPostId,nativeMediaId:e.nativeId,updatedAt:nowISO()};
        await this.core.save('pub-publication',job.id,data,job.version);
        await this.registry.register('publication',{media_id:e.nativeId,accountId:e.accountId,campaign_id:job.data.snapshot.campaignId,media_type:job.data.snapshot.format==='story'?'story':job.data.snapshot.format==='reel'?'reel':'post',providerPostId:e.providerPostId,published_at:e.timestamp},'zernio_publication',job.id);
        return;
      }
      if(e.type==='post.platform.deleted'&&e.nativeId){const m=await this.registry.lookup(e.accountId,e.nativeId);if(m)await this.core.save('pub-media',m.id,{...m.data,active:false,approval:'deleted'},m.version);return;}
      // Never let a late rollup/failed event overwrite a verified successful target.
      if(job.data.state==='published')return;
      if(e.type.endsWith('failed'))await this.core.save('pub-publication',job.id,{...job.data,state:'failed',error:'PROVIDER_REPORTED_FAILURE',updatedAt:nowISO()},job.version);
      if(e.type==='post.cancelled')await this.core.save('pub-publication',job.id,{...job.data,state:'cancelled',updatedAt:nowISO()},job.version);
      return;
    }
    if(e.type==='conversation.started'||e.type.startsWith('message.')||['referral.received','reaction.received'].includes(e.type)){
      if(e.conversationId){const r=await this.core.read('pub-conversation',e.conversationId);await this.core.save('pub-conversation',e.conversationId,{...r?.data,accountId:e.accountId,participantId:e.participantId||r?.data.participantId,lastType:e.type,updatedAt:e.timestamp},r?.version||0);}
    }
  }
  async analytics(e:InboxEvent){
    if(!e.cursor)return {ignored:true};
    const key=e.accountId,old=await this.core.read('pub-analytics-cursor',key);
    const cursor=old?.data.nextCursor||e.cursor;
    const response=await this.queue.client.request(`/v1/analytics/delta?cursor=${encodeURIComponent(cursor)}`);
    const rows=Array.isArray(response.data)?response.data:response.data?.data||[];
    if(!rows.length)return {wait:true}; // Materialized view lag: DO NOT advance an empty page.
    await this.core.store.runInTransaction(async()=>{
      for(const item of rows){if(String(item.accountId||item.account?.id)!==e.accountId)continue;const id=String(item.platformPostId||item.postId||'');if(!id)continue;const m=await this.registry.lookup(e.accountId,id);if(!m)continue;const prior=await this.core.read('pub-metrics',m.id);
        const raw=item.metrics||{},metrics:any={};for(const k of ['reach','impressions','views','shares','comments','likes','saved','follows'])if(Number.isFinite(Number(raw[k]))&&Number(raw[k])>=0)metrics[k]=Number(raw[k]);
        await this.core.save('pub-metrics',m.id,{metrics,syncedAt:nowISO()},prior?.version||0);
      }
      const current=await this.core.read('pub-analytics-cursor',key);await this.core.save('pub-analytics-cursor',key,{nextCursor:response.nextCursor||response.pagination?.nextCursor||cursor,updatedAt:nowISO()},current?.version||0);
    });return {};
  }
}
export function registerZernioReceiver(app:express.Express,service:WebhookService){
  const receive=(stream:'main'|'analytics')=>endpoint(async(req,res)=>{
    const raw=(req as any).rawBody;if(!Buffer.isBuffer(raw))fail('RAW_BODY_REQUIRED',400);
    res.setHeader('Cache-Control','no-store');res.json(await service.receive(raw,String(req.headers['x-zernio-signature']||''),stream));
  });
  app.post('/api/webhooks/zernio',receive('main'));
  app.post('/api/integrations/zernio/webhook',receive('main'));
  app.post('/api/webhooks/zernio/analytics',receive('analytics'));
  app.get('/api/webhooks/zernio/health',endpoint(async(_req,res)=>{
    const s=await service.settings.vault.status('zernio_webhook_secret');res.setHeader('Cache-Control','no-store');res.status(s.configured?200:503).json({ok:s.configured,service:'bazino-zernio-receiver'});
  }));
}
