import type express from 'express';
import { OpsCore, endpoint, fail } from '../management/core';
import { PublishingSettings, SECRET_NAMES } from './settings';
import { MediaRegistry } from './registry';
import { PublishingReports } from './reports';
import { AgentRegistry } from './agents';
import { ZernioClient } from './provider';
import {PublishingService} from './publish';
import {registerPublicationRoutes} from './publicationRoutes';
import { WebhookService, registerZernioReceiver } from './webhooks';
import { InstagramCampaignService } from '../affiliate/campaignV4';
import { AwayReplier } from '../affiliate/awayReply';
import { inAwayWindow } from '../affiliate/awayPolicy';
import { FriendGateService,registerFriendGate } from '../affiliate/friendGate';
export function publishingAdmin(core:OpsCore):express.RequestHandler {
  return async(req,res,next)=>{try{const staff=await core.authorize(req);if(!staff.admin)fail('ADMIN_ONLY',403);(req as any).staff=staff;next();}catch(e:any){res.status(e.statusCode||500).json({error:e.code||'OPERATION_FAILED'});}};
}
export function registerPublishing(app:express.Express,core:OpsCore) {
  const settings=new PublishingSettings(core),registry=new MediaRegistry(core),admin=publishingAdmin(core),base='/api/management/publishing';
  const webhooks=new WebhookService(core),campaigns=new InstagramCampaignService(core),away=new AwayReplier(core,campaigns.queue);
  registerZernioReceiver(app,webhooks);
  registerPublicationRoutes(app,new PublishingService(core));
  registerFriendGate(app,new FriendGateService(core));
  const reports=new PublishingReports(core);
  const agents=new AgentRegistry(core);
  app.post(`${base}/zernio-test`,admin,endpoint(async(req,res)=>{
    if(req.body?.confirmed!==true)fail('CONFIRMATION_REQUIRED');
    const cfg=await settings.config();const r=await new ZernioClient(settings).request('/v1/accounts?platform=instagram&status=connected');
    const accounts=Array.isArray(r.accounts)?r.accounts:r.data?.accounts||[];
    const matched=accounts.some((a:any)=>String(a._id||a.id)===cfg.data.zernioAccountId);
    await core.audit((req as any).staff.username,'zernio.connection_check','configured-account',{matched});
    res.json({ok:matched,accountMatched:matched,publishingPermissionsVerified:false});
  }));
  app.get(`${base}/agents`,core.guard('content'),endpoint(async(_req,res)=>{res.setHeader('Cache-Control','no-store');res.json(await agents.list());}));
  app.post(`${base}/agents`,admin,endpoint(async(req,res)=>res.json(await agents.save((req as any).staff.username,undefined,req.body||{}))));
  app.put(`${base}/agents/:id`,admin,endpoint(async(req,res)=>res.json(await agents.save((req as any).staff.username,String(req.params.id),req.body||{}))));
  app.post(`${base}/agents/:id/test`,admin,endpoint(async(req,res)=>res.json(await agents.testConnection((req as any).staff.username,String(req.params.id),req.body||{}))));
  app.get(`${base}/reports`,core.guard('reports'),endpoint(async(_req,res)=>res.json(await reports.report())));
  app.post(`${base}/settlements`,admin,endpoint(async(req,res)=>res.json(await reports.settleMonth((req as any).staff.username,req.body||{}))));
  app.post(`${base}/outbox/:id/:action`,admin,endpoint(async(req,res)=>res.json(await campaigns.resolveOutbox((req as any).staff.username,String(req.params.id),String(req.params.action),req.body||{}))));
  app.get(`${base}/members`,admin,endpoint(async(_req,res)=>res.json(await campaigns.list())));
  app.get(`${base}/ig-inbox`,admin,endpoint(async(_req,res)=>{res.setHeader('Cache-Control','no-store');res.json({items:await away.list(100)});}));
  app.get(`${base}/ig-away`,admin,endpoint(async(_req,res)=>{const s=await away.settings();res.setHeader('Cache-Control','no-store');res.json({settings:s,nowActive:inAwayWindow(s,new Date(),s.timezone)});}));
  app.put(`${base}/ig-away`,admin,endpoint(async(req,res)=>res.json(await away.saveSettings(req.body||{}))));
  app.get(`${base}/events`,core.guard('reports'),endpoint(async(_req,res)=>res.json(await webhooks.queue.report())));
  let inboxBusy=false,analyticsBusy=false;
  const timer=setInterval(async()=>{
    if(!inboxBusy){inboxBusy=true;webhooks.queue.processInbox(async e=>{
      if(e.type==='comment.received')return campaigns.dispatch(e);
      if(e.type==='message.received'){
        const r=await campaigns.dispatch(e);
        /* Away auto-reply: only when the campaign flow did NOT answer, and only
         * recorded/answered — never throws into the inbox loop. */
        await away.recordAndMaybeReply(e,!!r?.ok).catch(()=>{});
        return r;
      }
      return core.store.runInTransaction(()=>webhooks.lifecycle(e));
    }).then(()=>campaigns.queue.sendOutbox(d=>campaigns.beforeSend(d),(d,r)=>campaigns.afterSend(d,r),d=>campaigns.prepareMessage(d))).catch(()=>{}).finally(()=>{inboxBusy=false;});}
    if(!analyticsBusy){analyticsBusy=true;webhooks.queue.processInbox(e=>webhooks.analytics(e),'analytics',1).catch(()=>{}).finally(()=>{analyticsBusy=false;});}
  },3000);timer.unref();
  app.get(`${base}/config`,core.guard('content'),endpoint(async(req,res)=>{
    const cfg=await settings.config();
    const secrets:any={};if((req as any).staff.admin)for(const key of SECRET_NAMES)secrets[key]=await settings.vault.status(key);
    res.setHeader('Cache-Control','no-store');res.json({config:cfg,secrets,vaultAvailable:settings.vault.available(),accountFromHost:!!(process.env.ZERNIO_IG_ACCOUNT_ID||process.env.ZERNIO_ACCOUNT_ID),webhookUrl:`${cfg.data.baseUrl}/api/webhooks/zernio`});
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
  return {settings,registry,webhooks,campaigns,away};
}
