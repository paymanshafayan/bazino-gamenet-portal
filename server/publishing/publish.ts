import fs from 'node:fs';
import {Readable} from 'node:stream';
import {createHash,randomUUID} from 'node:crypto';
import {OpsCore,fail,newId,nowISO,fingerprint} from '../management/core';
import {localInstant} from '../management/time';
import {AssetLibrary} from './assets';
import {PublishingSettings} from './settings';
import {AgentRegistry} from './agents';
import {ZernioClient,ProviderFailure} from './provider';
import {ManusClient} from './manus';
import {MediaRegistry} from './registry';
import type {PostDraft,Publication,MediaAsset,CampaignPolicy} from '../../shared/publishing/types';
export const PUBLISH_CAPABILITIES={formats:['image','carousel','reel','story'],captionLimit:2200,maxCarousel:10,videoSeconds:{min:3,max:90},accountPermissionVerified:false};
function safeError(e:any){return typeof e?.code==='string'&&/^[A-Z0-9_]+$/.test(e.code)?e.code:'PUBLISHING_ERROR';}
function safeStorageUrl(value:string){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||!(u.hostname==='media.zernio.com'||u.hostname.endsWith('.r2.cloudflarestorage.com')||u.hostname==='storage.googleapis.com'||u.hostname.endsWith('.amazonaws.com')))fail('UNTRUSTED_MEDIA_HOST',502);return u.toString();}
export function approvalSpec(d:PostDraft){return {title:d.title,caption:d.caption,language:d.language,format:d.format,assetIds:d.assetIds,coverId:d.coverId||'',campaignId:d.campaignId,accountId:d.accountId,executionMode:d.executionMode,agentId:d.agentId,revision:d.revision,timezone:d.timezone};}
export class PublishingService {
  settings:PublishingSettings;assets:AssetLibrary;agents:AgentRegistry;client:ZernioClient;manus:ManusClient;registry:MediaRegistry;
  constructor(public core:OpsCore,public fetcher:typeof fetch=fetch,assetRoot?:string){this.settings=new PublishingSettings(core);this.assets=new AssetLibrary(core,assetRoot);this.agents=new AgentRegistry(core,fetcher);this.client=new ZernioClient(this.settings,fetcher);this.manus=new ManusClient(core,fetcher);this.registry=new MediaRegistry(core);}
  async list(actor:string,admin=false){return (await this.core.list<PostDraft>('pub-draft')).filter(r=>admin||r.data.owner===actor);}
  async owned(id:string,actor:string,admin=false){const r=await this.core.read<PostDraft>('pub-draft',id);if(!r)fail('DRAFT_NOT_FOUND',404);if(!admin&&r.data.owner!==actor)fail('FORBIDDEN',403);return r;}
  async save(actor:string,id:string|undefined,b:any,admin=false){
    const cfg=(await this.settings.config()).data;
    return this.core.store.runInTransaction(async()=>{
      const old=id?await this.owned(id,actor,admin):undefined;
      if(old&&old.version!==Number(b.version))fail('VERSION_CONFLICT',409);
      if(old&&['submitted','published','delivery_unknown'].includes(old.data.status))fail('CLONE_PUBLISHED_DRAFT',409);
      if(old?.data.publicationId){const j=await this.core.read<Publication>('pub-publication',old.data.publicationId);if(j&&['submitting','submitted','delivery_unknown','published'].includes(j.data.state))fail('PUBLICATION_IN_FLIGHT',409);if(j)await this.core.save('pub-publication',j.id,{...j.data,state:'cancelled',updatedAt:nowISO()},j.version);}
      if(!['manual','agent'].includes(b.executionMode))fail('MODE_REQUIRED');
      if(!['image','carousel','reel','story'].includes(b.format))fail('INVALID_POST_FORMAT');
      if(!['fa','tr','en','ru'].includes(b.language))fail('INVALID_LANGUAGE');
      const assetIds=Array.isArray(b.assetIds)?b.assetIds:[];if(assetIds.length>10||assetIds.some((a:any)=>typeof a!=='string')||new Set(assetIds).size!==assetIds.length)fail('INVALID_ASSETS');
      for(const aid of [...assetIds,...(b.coverId?[b.coverId]:[])])await this.assets.owned(aid,actor,admin);
      const caption=String(b.caption||'');if([...caption].length>2200)fail('CAPTION_TOO_LONG');
      if(/\/ig\/invite\/|[?&](?:token|sig|gate)=|\{\{\s*invite_url/i.test(caption))fail('PRIVATE_LINK_FORBIDDEN');
      const campaignId=String(b.campaignId||'');if(campaignId&&!await this.core.read('pub-campaign',campaignId))fail('CAMPAIGN_NOT_FOUND');
      if(b.format==='story'&&campaignId)fail('STORY_NOT_AFFILIATE');
      const timezone=String(b.timezone||cfg.timezone);try{new Intl.DateTimeFormat('en',{timeZone:timezone});}catch{fail('INVALID_TIMEZONE');}
      const d:PostDraft={title:String(b.title||'').slice(0,200),caption,language:b.language,format:b.format,assetIds,coverId:String(b.coverId||''),accountId:cfg.zernioAccountId,campaignId,executionMode:b.executionMode,agentId:b.executionMode==='agent'?String(b.agentId||cfg.defaultAgentId):'',status:'draft',revision:(old?.data.revision||0)+1,timezone,owner:old?.data.owner||actor};
      if(d.executionMode==='agent'){const a=await this.agents.get(d.agentId);if(!a||!a.data.enabled)fail('AGENT_NOT_AVAILABLE');}
      const r=await this.core.save('pub-draft',id||newId('POST'),d,old?.version||0);await this.core.audit(actor,'post.draft_save',r.id,{revision:d.revision,mode:d.executionMode});return r;
    });
  }
  async validate(d:PostDraft){
    if(!d.title.trim())fail('TITLE_REQUIRED');if(!d.accountId)fail('ACCOUNT_REQUIRED');
    const cfg=await this.settings.config();if(cfg.data.zernioAccountId!==d.accountId)fail('ACCOUNT_CONFIGURATION_CHANGED',409);
    const assets=await Promise.all(d.assetIds.map(id=>this.assets.ready(id)));
    if(d.format==='carousel'?(assets.length<2||assets.length>10):assets.length!==1)fail('MEDIA_COUNT_INVALID');
    if(d.format==='image'&&assets[0].data.mime.startsWith('video/'))fail('IMAGE_REQUIRED');
    if(d.format==='reel'&&!assets[0].data.mime.startsWith('video/'))fail('VIDEO_REQUIRED');
    const firstRatio=assets[0].data.width!/assets[0].data.height!;
    for(const a of assets){
      const ratio=a.data.width!/a.data.height!;const min=d.format==='reel'||d.format==='story'?9/16:.8;
      if(!Number.isFinite(ratio)||ratio<min-.01||ratio>1.91+.01)fail('MEDIA_ASPECT_RATIO');
      if(d.format==='carousel'&&Math.abs(ratio-firstRatio)>.015)fail('CAROUSEL_ASPECT_MISMATCH');
    }
    if(d.coverId){const c=await this.assets.ready(d.coverId);if(c.data.mime.startsWith('video/')||d.format!=='reel')fail('INVALID_COVER');assets.push(c);}
    if(d.campaignId){const c=await this.core.read<CampaignPolicy>('pub-campaign',d.campaignId);if(!c?.data.active||c.data.accountId!==d.accountId)fail('CAMPAIGN_NOT_READY',409);if(d.format==='story')fail('STORY_NOT_AFFILIATE');if(!c.data.languages.includes(d.language))fail('INVALID_LANGUAGE');if(d.format==='image')fail('AFFILIATE_FOUR_SLIDES_REQUIRED');if(d.format==='carousel'&&(assets.length!==4||d.language!=='tr'))fail('AFFILIATE_FOUR_SLIDES_TURKISH_CAPTION');}
    return {assetHashes:Object.fromEntries(assets.map(a=>[a.id,a.data.hash!])),assets};
  }
  async approve(actor:string,id:string,b:any,admin=false){
    if(b.confirmed!==true)fail('APPROVAL_CONFIRMATION_REQUIRED');const row=await this.owned(id,actor,admin);
    if(row.data.status!=='draft'||row.version!==Number(b.version))fail('VERSION_CONFLICT',409);
    const {assetHashes}=await this.validate(row.data),hash=fingerprint({spec:approvalSpec(row.data),assetHashes});
    return this.core.store.runInTransaction(async()=>{
      const r=await this.core.save<PostDraft>('pub-draft',id,{...row.data,status:'approved',approvalHash:hash,approvedBy:actor,approvedAt:nowISO()},row.version);
      await this.core.audit(actor,'post.approve',id,{hash,revision:row.data.revision});return r;
    });
  }
  async schedule(actor:string,id:string,b:any,admin=false,batchId?:string){
    const r=await this.owned(id,actor,admin);
    if(r.data.publicationId){const old=await this.core.read<Publication>('pub-publication',r.data.publicationId);if(old&&old.data.state!=='cancelled')return old;}
    if(r.data.campaignId&&!batchId)fail('AFFILIATE_BATCH_REQUIRED',409);
    if(b.confirmed!==true)fail('PUBLICATION_CONFIRMATION_REQUIRED');if(r.data.status!=='approved'||r.version!==Number(b.version))fail('APPROVAL_REQUIRED',409);
    const validation=await this.validate(r.data);if(r.data.approvalHash!==fingerprint({spec:approvalSpec(r.data),assetHashes:validation.assetHashes}))fail('APPROVAL_STALE',409);
    if(!await this.settings.vault.zernio('zernio_api_key'))fail('ZERNIO_NOT_CONFIGURED',409);
    let agentVersion:number|undefined,credentialHash='';
    if(r.data.executionMode==='agent'){
      if(b.confirmedAgentCost!==true)fail('AGENT_COST_CONFIRMATION_REQUIRED');
      const agent=await this.agents.get(r.data.agentId);if(!agent)fail('AGENT_NOT_AVAILABLE');
      if((await this.agents.view(agent)).status!=='ready')fail('AGENT_NOT_READY',409);
      agentVersion=agent.version;credentialHash=(await this.manus.credential(agent.id)).fingerprint;
    }
    let at=Date.now();if(!b.publishNow){try{at=localInstant(String(b.date),String(b.time),r.data.timezone);}catch{fail('INVALID_SCHEDULE');}}
    if(at<Date.now()-60000||at>Date.now()+366*86400000)fail('INVALID_SCHEDULE');
    const idempotent=fingerprint({draftId:id,revision:r.data.revision,hash:r.data.approvalHash});
    return this.core.store.runInTransaction(async()=>{
      const existing=await this.core.read<Publication>('pub-publication',idempotent);if(existing)return existing;
      const fresh=await this.owned(id,actor,admin);if(fresh.version!==r.version)fail('VERSION_CONFLICT',409);
      const data:Publication={draftId:id,draftRevision:r.data.revision,snapshot:r.data,approvalHash:r.data.approvalHash!,assetHashes:validation.assetHashes,agentVersion,agentCredentialHash:credentialHash,state:'queued',provider:r.data.executionMode==='agent'?'manus':'zernio',scheduledAt:new Date(at).toISOString(),createdAt:nowISO(),updatedAt:nowISO()};
      const job=await this.core.save('pub-publication',idempotent,data,0,`publication:${idempotent}`);
      await this.core.save('pub-draft',id,{...r.data,status:'scheduled',publicationId:job.id,scheduledAt:data.scheduledAt},r.version);
      await this.core.audit(actor,'post.schedule',job.id,{mode:r.data.executionMode,scheduledAt:data.scheduledAt});return job;
    });
  }
  async scheduleBatch(actor:string,b:any,admin=false){
    if(!Array.isArray(b.draftIds)||b.draftIds.length!==3||new Set(b.draftIds).size!==3)fail('THREE_POSTS_REQUIRED');
    return this.core.command(actor,b.idempotencyKey,'publication.batch',{draftIds:b.draftIds,draftVersions:b.draftVersions,publishNow:b.publishNow,date:b.date,time:b.time,confirmed:b.confirmed,confirmedAgentCost:b.confirmedAgentCost},async()=>{
      const rows=await Promise.all(b.draftIds.map((id:string)=>this.owned(id,actor,admin)));
      const first=rows[0].data;
      if(!first.campaignId||rows.some(r=>r.data.campaignId!==first.campaignId||r.data.format!==first.format||r.data.accountId!==first.accountId||r.data.executionMode!==first.executionMode||r.data.agentId!==first.agentId))fail('BATCH_SCOPE_MISMATCH');
      if(rows.some(r=>r.version!==Number(b.draftVersions?.[r.id])))fail('VERSION_CONFLICT',409);
      const id=fingerprint({ids:b.draftIds,versions:b.draftVersions});
      await this.core.save('pub-approval-batch',id,{draftIds:b.draftIds,versions:b.draftVersions,actor,createdAt:nowISO()},0);
      const jobs=[];for(const r of rows){const j=await this.schedule(actor,r.id,{...b,version:r.version},admin,id);jobs.push({id:j.id,state:j.data.state});}
      return {id,jobs};
    });
  }
  async cancel(actor:string,id:string,b:any,admin=false){
    return this.core.store.runInTransaction(async()=>{
      const r=await this.owned(id,actor,admin);if(r.version!==Number(b.version))fail('VERSION_CONFLICT',409);
      const p=r.data.publicationId?await this.core.read<Publication>('pub-publication',r.data.publicationId):undefined;
      if(p&&['submitting','submitted','published','delivery_unknown'].includes(p.data.state))fail('REMOTE_CANCELLATION_REQUIRES_REVIEW',409);
      if(p)await this.core.save('pub-publication',p.id,{...p.data,state:'cancelled',updatedAt:nowISO()},p.version);
      return this.core.save('pub-draft',id,{...r.data,status:'cancelled'},r.version);
    });
  }
  async clone(actor:string,id:string,admin=false){const r=await this.owned(id,actor,admin);return this.save(actor,undefined,{...r.data,title:`${r.data.title} (copy)`},admin);}
  async jobs(actor:string,admin=false){return (await this.core.list<Publication>('pub-publication')).filter(p=>admin||p.data.snapshot.owner===actor).map(p=>({id:p.id,version:p.version,data:{draftId:p.data.draftId,state:p.data.state,provider:p.data.provider,createdAt:p.data.createdAt,scheduledAt:p.data.scheduledAt,nativeMediaId:p.data.nativeMediaId,providerPostId:p.data.providerPostId,taskUrl:p.data.taskId?`https://manus.im/app/${encodeURIComponent(p.data.taskId)}`:undefined,error:p.data.error,title:p.data.snapshot.title,executionMode:p.data.snapshot.executionMode,agentId:p.data.snapshot.agentId,publishedUrl:(p.data as any).publishedUrl,rollupStatus:(p.data as any).rollupStatus}}));}
  async stage(assetId:string,jobId:string){
    const asset=await this.assets.ready(assetId),ref=fingerprint({jobId,assetId,hash:asset.data.hash});
    const old=await this.core.read('pub-provider-upload',ref);
    if(old&&Date.parse(old.data.expiresAt)>Date.now()+3600000)return old.data.publicUrl as string;
    const size=this.assets.preparedSize(assetId);
    const r=await this.client.request('/v1/media/presign','POST',{filename:`${asset.id}.${asset.data.mime==='video/mp4'?'mp4':asset.data.mime==='image/png'?'png':'jpg'}`,contentType:asset.data.mime,size});
    const d=r.data||r,uploadUrl=safeStorageUrl(String(d.uploadUrl)),publicUrl=safeStorageUrl(String(d.publicUrl));
    const stream=this.assets.openPrepared(assetId).stream;
    try{const upload=await this.fetcher(uploadUrl,{method:'PUT',headers:{'Content-Type':asset.data.mime,'Content-Length':String(size)},body:Readable.toWeb(stream),duplex:'half',signal:AbortSignal.timeout(120000),redirect:'error'} as any);if(!upload.ok)fail('PROVIDER_UPLOAD_FAILED',502);}finally{stream.destroy();}
    await this.core.store.runInTransaction(async()=>{const prior=await this.core.read('pub-provider-upload',ref);await this.core.save('pub-provider-upload',ref,{assetId,hash:asset.data.hash,publicUrl,expiresAt:new Date(Date.now()+6*86400000).toISOString()},prior?.version||0);});
    return publicUrl;
  }
  async finish(id:string,state:Publication['state'],extra:any={}){
    return this.core.store.runInTransaction(async()=>{
      const p=await this.core.read<Publication>('pub-publication',id);if(!p||p.data.state==='cancelled'||p.data.state==='published'&&state!=='published')return;
      await this.core.save('pub-publication',id,{...p.data,...extra,state,updatedAt:nowISO(),leaseUntil:'',leaseToken:''},p.version);
      const d=await this.core.read<PostDraft>('pub-draft',p.data.draftId);if(d?.data.publicationId===id)await this.core.save('pub-draft',d.id,{...d.data,status:state==='preparing'||state==='submitting'||state==='queued'?'scheduled':state},d.version);
    });
  }
  async confirmPublished(job:any,nativeId:string,method:string,url?:string){
    if(!/^\d{1,40}$/.test(nativeId))fail('NATIVE_MEDIA_ID_REQUIRED');
    const d=job.data.snapshot;
    await this.registry.register('publication',{media_id:nativeId,accountId:d.accountId,campaign_id:d.campaignId,media_type:d.format==='story'?'story':d.format==='reel'?'reel':'post',providerPostId:job.data.providerPostId,published_at:nowISO()},job.data.provider==='manus'?'manus_ingest':'zernio_publication',job.id);
    let publishedUrl='';try{const u=new URL(url||'');if(u.protocol==='https:'&&['instagram.com','www.instagram.com'].includes(u.hostname))publishedUrl=u.toString();}catch{}
    await this.finish(job.id,'published',{nativeMediaId:nativeId,publishedUrl,confirmation:method,error:''});
  }
  async work(){
    const cfg=(await this.settings.config()).data;if(!cfg.outboundEnabled)return;
    const jobs=(await this.core.list<Publication>('pub-publication')).sort((a,b)=>a.data.scheduledAt.localeCompare(b.data.scheduledAt));
    for(const row of jobs.filter(r=>['preparing','submitting'].includes(r.data.state)&&Date.parse(r.data.leaseUntil||'')<Date.now()))await this.finish(row.id,row.data.state==='submitting'?'delivery_unknown':'failed',{error:'WORKER_INTERRUPTED'});
    for(const row of jobs.filter(r=>r.data.state==='queued'&&Date.parse(r.data.scheduledAt)<=Date.now()).slice(0,2)){
      const lease=randomUUID();
      const claimed=await this.core.store.runInTransaction(async()=>{
        const r=await this.core.read<Publication>('pub-publication',row.id);if(!r||r.data.state!=='queued')return false;
        await this.core.save('pub-publication',r.id,{...r.data,state:'preparing',leaseToken:lease,leaseUntil:new Date(Date.now()+15*60000).toISOString()},r.version);return true;
      });if(!claimed)continue;
      let committedSubmission=false;
      try{
        const job=(await this.core.read<Publication>('pub-publication',row.id))!,d=job.data.snapshot;
        if(cfg.zernioAccountId!==d.accountId)fail('ACCOUNT_CONFIGURATION_CHANGED');
        if((await this.core.read('pub-account',d.accountId))?.data.connected===false)fail('ACCOUNT_DISCONNECTED');
        const v=await this.validate(d);if(fingerprint({spec:approvalSpec(d),assetHashes:v.assetHashes})!==job.data.approvalHash)fail('APPROVAL_STALE');
        if(job.data.provider==='manus'){const key=await this.manus.credential(d.agentId);if(key.fingerprint!==job.data.agentCredentialHash)fail('AGENT_CREDENTIAL_CHANGED');await this.manus.cachePublicKey(d.agentId);}
        const mediaItems=[];for(const id of d.assetIds){const a=await this.assets.ready(id);mediaItems.push({type:a.data.mime.startsWith('video/')?'video':'image',url:await this.stage(id,job.id)});}
        const specifics:any={};if(d.format==='story')specifics.contentType='story';if(d.format==='reel')specifics.shareToFeed=true;if(d.coverId)specifics.instagramThumbnail=await this.stage(d.coverId,job.id);
        const proceed=await this.core.store.runInTransaction(async()=>{
          const r=await this.core.read<Publication>('pub-publication',job.id);if(!r||r.data.state!=='preparing'||r.data.leaseToken!==lease)return false;
          await this.core.save('pub-publication',r.id,{...r.data,state:'submitting',attemptedAt:nowISO(),leaseUntil:new Date(Date.now()+60000).toISOString()},r.version);return true;
        });if(!proceed)continue;committedSubmission=true;
        if(job.data.provider==='zernio'){
          const response=await this.client.request('/v1/posts','POST',{content:d.caption,mediaItems,platforms:[{platform:'instagram',accountId:d.accountId,platformSpecificData:specifics}],publishNow:true,metadata:{bazinoPublicationId:job.id,approvalHash:job.data.approvalHash}},job.id);
          const post=response.post||response.data?.post||response.data||response;
          const providerPostId=post._id||post.id;if(!providerPostId)throw new ProviderFailure('ZERNIO_POST_UNCONFIRMED',true);
          await this.finish(job.id,'submitted',{providerPostId:String(providerPostId)});
          const target=post.platforms?.find((p:any)=>p.platform==='instagram'&&(!p.accountId||String(p.accountId?._id||p.accountId)===d.accountId));
          if(target?.status==='published'&&target.platformPostId)await this.confirmPublished((await this.core.read('pub-publication',job.id))!,String(target.platformPostId),'provider_response',target.publishedUrl||target.platformPostUrl||target.url);
        }else{
          const prompt=`Publish EXACTLY ONE already approved Instagram ${d.format} for @bazinopro using your authorized publishing connector. Do NOT alter the caption or media order. Do NOT generate affiliate codes, coupons, private invitation links or send DMs. If you cannot access the authorized account, stop and request access; never invent a media ID. Return only the real native Instagram media_id after successful publication. Approved payload: ${JSON.stringify({caption:d.caption,mediaItems,accountId:d.accountId,format:d.format,specifics})}`;
          const taskId=await this.manus.create(d.agentId,d.title,d.language,prompt,'publish');await this.finish(job.id,'submitted',{taskId});
        }
      }catch(e:any){await this.finish(row.id,committedSubmission&&(e.uncertain||!e.code)?'delivery_unknown':'failed',{error:safeError(e)});}
    }
    await this.pollPublications();await this.workGenerations();
  }
  async pollPublications(){
    const rows=(await this.core.list<Publication>('pub-publication')).filter(r=>r.data.state==='submitted'&&(Date.parse((r.data as any).nextPollAt||'')||0)<Date.now()).slice(0,5);
    for(const r of rows){
      await this.core.store.runInTransaction(async()=>{const p=await this.core.read<Publication>('pub-publication',r.id);if(p?.data.state==='submitted')await this.core.save('pub-publication',r.id,{...p.data,nextPollAt:new Date(Date.now()+60000).toISOString()},p.version);});
      try{
        if(r.data.provider==='zernio'&&r.data.providerPostId){
          const response=await this.client.request(`/v1/posts/${encodeURIComponent(r.data.providerPostId)}`);const p=response.post||response.data?.post||response.data||response;
          const target=p.platforms?.find((p:any)=>p.platform==='instagram'&&(!p.accountId||String(p.accountId?._id||p.accountId)===r.data.snapshot.accountId));
          if(target?.status==='published'&&target.platformPostId)await this.confirmPublished(r,String(target.platformPostId),'provider_reconciliation',target.publishedUrl||target.platformPostUrl||target.url);
          else if(p.status==='failed'||target?.status==='failed')await this.finish(r.id,'failed',{error:'PROVIDER_REPORTED_FAILURE'});
        }else if(r.data.taskId){
          if((await this.manus.credential(r.data.snapshot.agentId)).fingerprint!==r.data.agentCredentialHash)fail('AGENT_CREDENTIAL_CHANGED',409);
          const result=await this.manus.result(r.data.snapshot.agentId,r.data.taskId);
          if(result.state==='complete'){
            const nativeId=String(result.result?.media_id||'');if(!/^\d{1,40}$/.test(nativeId))fail('AGENT_MEDIA_UNCONFIRMED');
            const check=await this.client.request(`/v1/inbox/comments/${encodeURIComponent(nativeId)}?accountId=${encodeURIComponent(r.data.snapshot.accountId)}`);
            if(check.error||check.success===false)fail('AGENT_MEDIA_UNCONFIRMED');
            await this.confirmPublished(r,nativeId,'agent_result_and_account_api');
          }else if(result.state==='failed')await this.finish(r.id,'delivery_unknown',{error:'AGENT_TASK_FAILED_REVIEW_REQUIRED'});
          else if(result.state==='needs_input')await this.core.store.runInTransaction(async()=>{const p=await this.core.read('pub-publication',r.id);if(p)await this.core.save('pub-publication',p.id,{...p.data,error:'AGENT_REQUIRES_ACTION'},p.version);});
        }
      }catch(e:any){
        // Surface read failures without retrying a side-effecting POST or changing agent/account.
        await this.core.store.runInTransaction(async()=>{const p=await this.core.read('pub-publication',r.id);if(p?.data.state==='submitted')await this.core.save('pub-publication',p.id,{...p.data,error:safeError(e)},p.version);});
      }
    }
  }
  async generate(actor:string,id:string,b:any,admin=false){
    if(b.confirmedCost!==true)fail('AGENT_COST_CONFIRMATION_REQUIRED');const row=await this.owned(id,actor,admin);
    if(row.data.status!=='draft')fail('DRAFT_REQUIRED');const agentId=String(b.agentId||(await this.settings.config()).data.defaultAgentId);
    const a=await this.agents.get(agentId);if(!a||(await this.agents.view(a)).status!=='ready')fail('AGENT_NOT_READY',409);
    const credential=await this.manus.credential(agentId);const brief=String(b.brief||'').slice(0,5000);if(!brief.trim())fail('PROMPT_REQUIRED');
    const key=fingerprint({id,revision:row.data.revision,agentId,brief});
    return this.core.store.runInTransaction(async()=>{
      const prior=await this.core.read('pub-agent-task',key);if(prior)return {id:key,status:prior.data.status};
      await this.core.save('pub-agent-task',key,{draftId:id,revision:row.data.revision,owner:row.data.owner,agentId,agentVersion:a.version,credentialHash:credential.fingerprint,brief,language:row.data.language,title:row.data.title,status:'queued',createdAt:nowISO()},0);return {id:key,status:'queued'};
    });
  }
  async cancelGeneration(actor:string,id:string,b:any,admin=false){
    if(b.confirmed!==true)fail('CONFIRMATION_REQUIRED');const r=await this.core.read('pub-agent-task',id);if(!r)fail('NOT_FOUND',404);if(!admin&&r.data.owner!==actor)fail('FORBIDDEN',403);
    if(r.data.status==='submitting')fail('TASK_SUBMISSION_IN_FLIGHT',409);
    if(!['queued','submitted','cancel_unknown'].includes(r.data.status))return {status:r.data.status};
    await this.core.store.runInTransaction(async()=>{const current=await this.core.read('pub-agent-task',id);if(!current||current.version!==r.version)fail('VERSION_CONFLICT',409);await this.core.save('pub-agent-task',id,{...current.data,status:'cancelling'},current.version);});
    let status='cancelled';
    if(r.data.taskId){
      try{if((await this.manus.credential(r.data.agentId)).fingerprint!==r.data.credentialHash)fail('AGENT_CREDENTIAL_CHANGED',409);await this.manus.rpc(r.data.agentId,'task.stop','POST',{task_id:r.data.taskId});}catch{status='cancel_unknown';}
    }
    await this.core.store.runInTransaction(async()=>{const fresh=await this.core.read('pub-agent-task',id);if(fresh)await this.core.save('pub-agent-task',id,{...fresh.data,status},fresh.version);});return {status,creditsRefunded:false};
  }
  async workGenerations(){
    if(!(await this.settings.config()).data.outboundEnabled)return;
    const rows=(await this.core.list('pub-agent-task')).filter(r=>['queued','submitted','submitting'].includes(r.data.status)).slice(0,5);
    for(const row of rows){const d=row.data;
      if(d.status==='submitting'){if(Date.parse(d.leaseUntil)<Date.now())await this.core.save('pub-agent-task',row.id,{...d,status:'delivery_unknown'},row.version);continue;}
      if(d.status==='queued'){
        const lease=randomUUID();const claimed=await this.core.store.runInTransaction(async()=>{const r=await this.core.read('pub-agent-task',row.id);if(!r||r.data.status!=='queued')return false;await this.core.save('pub-agent-task',r.id,{...r.data,status:'submitting',lease,leaseUntil:new Date(Date.now()+60000).toISOString()},r.version);return true;});if(!claimed)continue;
        let taskId='',error='',uncertain=false;
        try{if((await this.manus.credential(d.agentId)).fingerprint!==d.credentialHash)fail('AGENT_CREDENTIAL_CHANGED');await this.manus.cachePublicKey(d.agentId);taskId=await this.manus.create(d.agentId,d.title,d.language,`Create only a draft title and Instagram caption in ${d.language}. Do not publish, send messages, or create referral links. Brief: ${d.brief}`,'generate');}catch(e:any){error=safeError(e);uncertain=e.uncertain;}
        await this.core.store.runInTransaction(async()=>{const r=await this.core.read('pub-agent-task',row.id);if(r?.data.lease===lease)await this.core.save('pub-agent-task',r.id,{...r.data,status:error?uncertain?'delivery_unknown':'failed':'submitted',taskId,error,nextPollAt:Date.now()+10000},r.version);});
      }else if(d.taskId&&(d.nextPollAt||0)<Date.now()){
        await this.core.store.runInTransaction(async()=>{const current=await this.core.read('pub-agent-task',row.id);if(current?.data.status==='submitted')await this.core.save('pub-agent-task',row.id,{...current.data,nextPollAt:Date.now()+60000},current.version);});
        try{
          if((await this.manus.credential(d.agentId)).fingerprint!==d.credentialHash)fail('AGENT_CREDENTIAL_CHANGED',409);
          const result=await this.manus.result(d.agentId,d.taskId);
          await this.core.store.runInTransaction(async()=>{
            const r=await this.core.read('pub-agent-task',row.id);if(!r||r.data.status!=='submitted')return;
            let status=result.state==='complete'?'complete':result.state==='failed'?'failed':'submitted';
            if(result.state==='complete'){
              if(d.legacyContentId){
                const post=await this.core.read('content',d.legacyContentId),body=String(result.result?.body||'').slice(0,8000);
                if(!post||post.version!==d.legacyVersion||post.data.status!=='generating')status='superseded';
                else if(!body)status='failed';
                else await this.core.save('content',post.id,{...post.data,status:'review',taskStatus:'completed',taskId:d.taskId,versions:{...post.data.versions,[d.legacyDestination]:{...(post.data.versions?.[d.legacyDestination]||{}),title:String(result.result?.title||post.data.title).slice(0,200),body,language:d.language}},destinations:{...post.data.destinations,[d.legacyDestination]:{status:'review'}}},post.version);
              } else {
                const post=await this.core.read<PostDraft>('pub-draft',d.draftId);const caption=String(result.result?.body||'').slice(0,2200);
                if(!post||post.data.revision!==d.revision||post.data.status!=='draft')status='superseded';
                else if(!caption||/\/ig\/invite\/|[?&](?:token|sig|gate)=/.test(caption))status='failed';
                else await this.core.save('pub-draft',post.id,{...post.data,caption,title:post.data.title||String(result.result?.title||'').slice(0,200),revision:post.data.revision+1},post.version);
              }
            }
            await this.core.save('pub-agent-task',r.id,{...r.data,status,error:result.state==='needs_input'?'AGENT_REQUIRES_ACTION':'',nextPollAt:Date.now()+60000},r.version);
          });
        }catch(e:any){await this.core.store.runInTransaction(async()=>{const r=await this.core.read('pub-agent-task',row.id);if(r?.data.status==='submitted')await this.core.save('pub-agent-task',r.id,{...r.data,error:safeError(e)},r.version);});}
      }
    }
  }
}
