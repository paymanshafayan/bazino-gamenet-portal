import type express from 'express';
import {createHash} from 'node:crypto';
import {OpsCore,endpoint,fail,nowISO} from '../management/core';
import {PublishingService} from './publish';
import {registerAssets} from './assets';
import {verifyManusRsa} from './manus';
export function registerPublicationRoutes(app:express.Express,service:PublishingService){
 const core=service.core,base='/api/management/publishing',read=core.guard('content'),publish=core.guard('publish');
 registerAssets(app,service.assets);
 app.post(`${base}/batches/schedule`,publish,endpoint(async(req,res)=>res.json(await service.scheduleBatch((req as any).staff.username,req.body||{},(req as any).staff.admin))));
 app.get(`${base}/drafts`,read,endpoint(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.json(await service.list((req as any).staff.username,(req as any).staff.admin));}));
 app.post(`${base}/drafts`,read,endpoint(async(req,res)=>res.json(await service.save((req as any).staff.username,undefined,req.body||{},(req as any).staff.admin))));
 app.put(`${base}/drafts/:id`,read,endpoint(async(req,res)=>res.json(await service.save((req as any).staff.username,String(req.params.id),req.body||{},(req as any).staff.admin))));
 app.post(`${base}/drafts/:id/clone`,read,endpoint(async(req,res)=>res.json(await service.clone((req as any).staff.username,String(req.params.id),(req as any).staff.admin))));
 app.post(`${base}/drafts/:id/approve`,publish,endpoint(async(req,res)=>res.json(await service.approve((req as any).staff.username,String(req.params.id),req.body||{},(req as any).staff.admin))));
 app.post(`${base}/drafts/:id/schedule`,publish,endpoint(async(req,res)=>{const r=await service.schedule((req as any).staff.username,String(req.params.id),req.body||{},(req as any).staff.admin);res.json({id:r.id,state:r.data.state});}));
 app.post(`${base}/drafts/:id/cancel`,publish,endpoint(async(req,res)=>res.json(await service.cancel((req as any).staff.username,String(req.params.id),req.body||{},(req as any).staff.admin))));
 app.post(`${base}/drafts/:id/generate`,publish,endpoint(async(req,res)=>res.json(await service.generate((req as any).staff.username,String(req.params.id),req.body||{},(req as any).staff.admin))));
 app.get(`${base}/publications`,read,endpoint(async(req,res)=>res.json(await service.jobs((req as any).staff.username,(req as any).staff.admin))));
 app.post(`${base}/agent-tasks/:id/cancel`,publish,endpoint(async(req,res)=>res.json(await service.cancelGeneration((req as any).staff.username,String(req.params.id),req.body||{},(req as any).staff.admin))));
 app.get(`${base}/agent-tasks`,read,endpoint(async(req,res)=>res.json((await core.list('pub-agent-task')).filter(r=>(req as any).staff.admin||r.data.owner===(req as any).staff.username).map(r=>({id:r.id,draftId:r.data.draftId,status:r.data.status,error:r.data.error,createdAt:r.data.createdAt})))));
 app.post(`${base}/publications/:id/reconcile`,publish,endpoint(async(req,res)=>{
   if(req.body?.confirmed!==true)fail('CONFIRMATION_REQUIRED');const p=await core.read('pub-publication',String(req.params.id));if(!p)fail('NOT_FOUND',404);await service.owned(p.data.draftId,(req as any).staff.username,(req as any).staff.admin);
   if(p.data.state==='delivery_unknown'&&!p.data.providerPostId&&p.data.provider==='zernio'){
     const list=await service.client.request('/v1/posts?limit=100'),posts=list.posts||list.data?.posts||[];
     const matches=posts.filter((x:any)=>x.metadata?.bazinoPublicationId===p.id&&x.metadata?.approvalHash===p.data.approvalHash);
     if(matches.length===1)await service.finish(p.id,'submitted',{providerPostId:String(matches[0]._id||matches[0].id),error:''});
   }
   await service.pollPublications();const fresh=await core.read('pub-publication',p.id);res.json({id:p.id,state:fresh?.data.state,error:fresh?.data.error||''});
 }));
 app.post(`${base}/publications/:id/retry`,publish,endpoint(async(req,res)=>{
   if(req.body?.confirmed!==true)fail('CONFIRMATION_REQUIRED');
   res.json(await core.store.runInTransaction(async()=>{
     const p=await core.read('pub-publication',String(req.params.id));if(!p||p.data.state!=='failed'||p.data.taskId)fail('UNSAFE_RETRY',409);
     const d=await service.owned(p.data.draftId,(req as any).staff.username,(req as any).staff.admin);if(d.data.publicationId!==p.id||d.data.revision!==p.data.draftRevision)fail('APPROVAL_STALE',409);
     await core.save('pub-publication',p.id,{...p.data,state:'queued',error:'',updatedAt:nowISO()},p.version);await core.save('pub-draft',d.id,{...d.data,status:'scheduled'},d.version);return {ok:true};
   }));
 }));
 // Manus RSA callback only nudges an owned task to reconcile over its authenticated API.
 app.post('/api/management/integrations/manus/webhook',endpoint(async(req,res)=>{
   const raw=(req as any).rawBody;if(!Buffer.isBuffer(raw))fail('RAW_BODY_REQUIRED');
   let b:any;try{b=JSON.parse(raw.toString('utf8'));}catch{fail('INVALID_JSON');}
   const taskId=String(b.task_id||b.taskId||b.task_detail?.task_id||b.data?.task_id||'');
   const generation=(await core.list('pub-agent-task')).find(r=>r.data.taskId===taskId&&!!taskId);
   const publication=(await core.list('pub-publication')).find(r=>r.data.taskId===taskId&&!!taskId);
   const legacy=(await core.list('content')).find(r=>r.data.taskId===taskId&&!!taskId);
   const cfg=await service.settings.config();
   const agentId=generation?.data.agentId||publication?.data.snapshot.agentId||legacy?.data.agentId||String(req.query.agent||cfg.data.defaultAgentId);
   const key=agentId?(await core.read('pub-manus-key',agentId))?.data.publicKey:null;
   const url=cfg.data.baseUrl+req.originalUrl;
   if(!key||!verifyManusRsa(raw,url,String(req.headers['x-webhook-timestamp']||''),String(req.headers['x-webhook-signature']||''),key))fail('INVALID_SIGNATURE',401);
   if(['webhook.test','webhook_test'].includes(b.event||b.event_type))return res.json({ok:true,test:true,outboundSent:false});
   if(!generation&&!publication&&!legacy)return res.json({ok:true,ignored:'unknown_task'});
   const eventKey=createHash('sha256').update(raw).digest('hex');
   await core.store.runInTransaction(async()=>{if(await core.read('pub-manus-event',eventKey))return;await core.save('pub-manus-event',eventKey,{taskId,agentId,receivedAt:nowISO()},0);});
   res.json({ok:true,accepted:true});
 }));
 let busy=false,lastCleanup=0;
 const timer=setInterval(()=>{if(Date.now()-lastCleanup>3600000){lastCleanup=Date.now();service.assets.cleanupExpired().catch(()=>{});}if(busy)return;busy=true;service.work().catch(()=>{}).finally(()=>{busy=false;});},4000);timer.unref();
}
