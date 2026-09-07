import type express from 'express';
import { OpsCore, endpoint, fail } from '../management/core';
import { PublishingSettings, SECRET_NAMES } from './settings';
import { MediaRegistry } from './registry';
import { PublishingReports } from './reports';
import { WebhookService, registerZernioReceiver } from './webhooks';
import { InstagramCampaignService } from '../affiliate/campaignV4';
import { FriendGateService,registerFriendGate } from '../affiliate/friendGate';
export function publishingAdmin(core:OpsCore):express.RequestHandler {
  return async(req,res,next)=>{try{const staff=await core.authorize(req);if(!staff.admin)fail('ADMIN_ONLY',403);(req as any).staff=staff;next();}catch(e:any){res.status(e.statusCode||500).json({error:e.code||'OPERATION_FAILED'});}};
}
export function registerPublishing(app:express.Express,core:OpsCore) {
  const settings=new PublishingSettings(core),registry=new MediaRegistry(core),admin=publishingAdmin(core),base='/api/management/publishing';
  const webhooks=new WebhookService(core),campaigns=new InstagramCampaignService(core);
  registerZernioReceiver(app,webhooks);
  registerFriendGate(app,new FriendGateService(core));
  const reports=new PublishingReports(core);
  app.get(`${base}/reports`,core.guard('reports'),endpoint(async(_req,res)=>res.json(await reports.report())));
  app.post(`${base}/settlements`,admin,endpoint(async(req,res)=>res.json(await reports.settleMonth((req as any).staff.username,req.body||{}))));
  app.get(`${base}/members`,admin,endpoint(async(_req,res)=>res.json(await campaigns.list())));
  app.get(`${base}/events`,core.guard('reports'),endpoint(async(_req,res)=>res.json(await webhooks.queue.report())));
  let inboxBusy=false,analyticsBusy=false;
  const timer=setInterval(async()=>{
    if(!inboxBusy){inboxBusy=true;webhooks.queue.processInbox(async e=>{if(e.type==='comment.received'||e.type==='message.received')return campaigns.dispatch(e);return core.store.runInTransaction(()=>webhooks.lifecycle(e));}).then(()=>campaigns.queue.sendOutbox(d=>campaigns.beforeSend(d),(d,r)=>campaigns.afterSend(d,r),d=>campaigns.prepareMessage(d))).catch(()=>{}).finally(()=>{inboxBusy=false;});}
    if(!analyticsBusy){analyticsBusy=true;webhooks.queue.processInbox(e=>webhooks.analytics(e),'analytics',1).catch(()=>{}).finally(()=>{analyticsBusy=false;});}
  },3000);timer.unref();
  app.get(`${base}/config`,core.guard('content'),endpoint(async(req,res)=>{
    const cfg=await settings.config();
    const secrets:any={};if((req as any).staff.admin)for(const key of SECRET_NAMES)secrets[key]=await settings.vault.status(key);
    res.setHeader('Cache-Control','no-store');res.json({config:cfg,secrets,vaultAvailable:settings.vault.available(),webhookUrl:`${cfg.data.baseUrl}/api/webhooks/zernio`});
  }));
  app.put(`${base}/config`,admin,endpoint(async(req,res)=>res.json(await settings.saveConfig((req as any).staff.username,req.body||{}))));
  app.put(`${base}/secrets/:key`,admin,endpoint(async(req,res)=>{
    const name=String(req.params.key);if(!SECRET_NAMES.includes(name as any))fail('INVALID_SECRET_REFERENCE');
    if(process.env[name.toUpperCase()])fail('HOST_MANAGED',409);
    if(typeof req.body?.value!=='string')fail('INVALID_TEXT');
    if(name==='zernio_webhook_secret')await settings.invitationKey();
    res.json(await settings.vault.set(name,req.body.value,(req as any).staff.username));
  }));
  app.get(`${base}/campaigns`,core.guard('content'),endpoint(async(_req,res)=>{await settings.seed();res.json(await core.list('pub-campaign'));}));
  app.put(`${base}/campaigns/:id`,admin,endpoint(async(req,res)=>res.json(await settings.saveCampaign((req as any).staff.username,String(req.params.id),req.body||{}))));
  app.get(`${base}/media`,core.guard('content'),endpoint(async(_req,res)=>res.json(await registry.list())));
  app.post(`${base}/media`,admin,endpoint(async(req,res)=>res.json(await registry.register((req as any).staff.username,req.body||{},'admin'))));
  app.put(`${base}/media/:id`,admin,endpoint(async(req,res)=>res.json(await registry.review((req as any).staff.username,String(req.params.id),req.body||{}))));
  return {settings,registry,webhooks,campaigns};
}
