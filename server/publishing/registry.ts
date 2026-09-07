import { OpsCore, fingerprint, fail, nowISO, stringValue } from '../management/core';
import { PublishingSettings } from './settings';
import type { CampaignPolicy, PublishedMedia } from '../../shared/publishing/types';
export const mediaKey=(account:string,nativeId:string)=>fingerprint({account,nativeId});
export function nativeMediaId(v:unknown):string {
  if(typeof v!=='string'||!/^\d{1,40}$/.test(v))fail('INVALID_MEDIA_ID');return v;
}
export class MediaRegistry {
  settings:PublishingSettings;
  constructor(public core:OpsCore){this.settings=new PublishingSettings(core);}
  async list(){return this.core.list<PublishedMedia>('pub-media');}
  async lookup(accountId:string,nativeId:string){return this.core.read<PublishedMedia>('pub-media',mediaKey(accountId,nativeId));}
  async eligible(accountId:string,nativeId:string) {
    const media=await this.lookup(accountId,nativeId);if(!media||!media.data.active||media.data.approval!=='approved'||media.data.mediaType==='story')return null;
    const campaign=await this.core.read<CampaignPolicy>('pub-campaign',media.data.campaignId);
    if(!campaign?.data.active||campaign.data.accountId!==accountId)return null;
    return {media,campaign};
  }
  async register(actor:string,b:any,source:PublishedMedia['source']='manus_ingest',publicationId?:string) {
    const nativeId=nativeMediaId(b.media_id), cfg=(await this.settings.config()).data;
    const accountId=stringValue(b.accountId||cfg.zernioAccountId,100,true);
    // HTTP ingest never gets to choose arbitrary account/approval; callers supply only server-scoped fields.
    const type=b.media_type || 'unknown';if(!['post','reel','unknown','story'].includes(type)||(source==='manus_ingest'&&type==='story'))fail('INVALID_MEDIA_TYPE');
    const campaignId=source==='external_discovery'?'':String(b.campaign_id ?? cfg.defaultCampaignId);
    const campaign=campaignId?await this.core.read<CampaignPolicy>('pub-campaign',campaignId):undefined;
    if(campaignId&&!campaign)fail('CAMPAIGN_NOT_FOUND',422);
    const ready=source!=='external_discovery'&&type!=='story'&&!!campaign?.data.active&&campaign.data.accountId===accountId;
    return this.core.store.runInTransaction(async()=>{
      const id=mediaKey(accountId,nativeId),existing=await this.lookup(accountId,nativeId);
      if(existing) return {accepted:true,media_id:nativeId,registry_id:id,campaign_id:existing.data.campaignId,status:existing.data.approval,duplicate:true};
      const data:PublishedMedia={nativeId,accountId,platform:'instagram',source,mediaType:type,campaignId,languages:campaign?.data.languages||[],active:ready,approval:ready?'approved':'needs_review',receivedAt:nowISO(),publicationId,providerPostId:b.providerPostId};
      if(b.published_at){if(!Number.isFinite(Date.parse(b.published_at)))fail('INVALID_DATE');data.publishedAt=new Date(b.published_at).toISOString();}
      await this.core.save('pub-media',id,data,0,`media:${id}`);
      if(!await this.core.store.getIgMediaByMediaId(nativeId))await this.core.store.upsertIgMedia({id:`IGM-${id.slice(0,24)}`,mediaId:nativeId,mediaType:type,campaignId,publishedAt:data.publishedAt||'',captionVersion:'',idempotencyKey:`instagram:${nativeId}`,createdAt:nowISO()});
      await this.core.audit(actor,'media.register',id,{source,approval:data.approval});
      return {accepted:true,media_id:nativeId,registry_id:id,campaign_id:campaignId,status:data.approval,duplicate:false};
    });
  }
  async review(actor:string,id:string,b:any){
    return this.core.command(actor,b.idempotencyKey,'media.review',{id,...b},async()=>{
      const r=await this.core.read<PublishedMedia>('pub-media',id);if(!r)fail('NOT_FOUND',404);
      const campaign=await this.core.read<CampaignPolicy>('pub-campaign',String(b.campaignId));
      if(!campaign?.data.active||campaign.data.accountId!==r.data.accountId)fail('CAMPAIGN_NOT_READY',409);
      if(r.data.approval==='deleted'&&b.active)fail('MEDIA_DELETED',409);
      const type=b.mediaType||r.data.mediaType;if(!['post','reel','unknown','story'].includes(type))fail('INVALID_MEDIA_TYPE');
      if(type==='story'&&b.active)fail('STORY_NOT_AFFILIATE');
      const languages=Array.isArray(b.languages)?b.languages:campaign.data.languages;
      if(!languages.length||languages.some((l:any)=>!campaign.data.languages.includes(l)))fail('INVALID_LANGUAGE');
      return this.core.save('pub-media',id,{...r.data,mediaType:type,campaignId:campaign.id,languages,active:b.active===true,approval:'approved'},Number(b.version));
    });
  }
}
