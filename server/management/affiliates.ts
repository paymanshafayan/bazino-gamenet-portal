import type express from 'express';
import { OpsCore, endpoint, fail, fingerprint, newId, nowISO, stringValue } from './core';
import { sanitizeAffiliateInput, assertParentOk } from '../affiliate/routes';
import { isValidCode, normalizeCode, statsForAffiliate, emptyStats, addStats, approveDueCommissions, claimAttribution } from '../affiliate/engine';
import { readAffiliateSettings, AFFILIATE_SETTING_KEYS } from '../affiliate/settings';

export class AffiliateService {
 constructor(public core:OpsCore){}
 async report(since?:string){let totals=emptyStats();const rows=[];for(const a of await this.core.store.listAffiliates()){const stats=await statsForAffiliate(this.core.store,a,since);totals=addStats(totals,stats);rows.push({...a,stats,etag:fingerprint(a)});}return {totals,affiliates:rows,settings:await readAffiliateSettings(this.core.store)};}
 async save(actor:string,b:any){return this.core.command(actor,b.idempotencyKey,'save-affiliate',b,async()=>{
  const old=b.id?await this.core.store.getAffiliateById(stringValue(b.id,100)):undefined;if(b.id&&!old)fail('NOT_FOUND',404);if(old&&b.etag!==fingerprint(old))fail('VERSION_CONFLICT',409);
  const f=sanitizeAffiliateInput(b),code=normalizeCode(f.code||old?.code||'');if(!isValidCode(code))fail('BAD_CODE');
  for(const k of ['newPct','returnPct','tournamentPct','overridePct'] as const)if(f[k]!==undefined&&(!Number.isFinite(f[k])||f[k]!<-1||f[k]!>100))fail('INVALID_RATE');
  const clash=await this.core.store.getAffiliateByCode(code);if(clash&&clash.id!==old?.id)fail('CODE_TAKEN',409);
  if(f.username){const user=await this.core.store.getUserByUsername(f.username);if(!user)fail('USER_NOT_FOUND',404);f.username=user.username;const owner=await this.core.store.getAffiliateByUsername(f.username);if(owner&&owner.id!==old?.id)fail('USER_TAKEN',409);}
  if(!['active','paused','blocked'].includes(f.status||old?.status||'active'))fail('INVALID_STATUS');
  if(f.destination&&(!f.destination.startsWith('/')||f.destination.startsWith('//')))fail('INVALID_DESTINATION');
  await assertParentOk(this.core.store,f.parentId??old?.parentId??'',old?.id);
  const row={id:old?.id||newId('AFF'),code,username:'',name:code,type:'gamer',language:'fa',destination:'/',parentId:'',status:'active',newPct:-1,returnPct:-1,tournamentPct:-1,overridePct:-1,notes:'',createdAt:nowISO(),...old,...f,updatedAt:nowISO()};
  if(old)await this.core.store.updateAffiliate(old.id,row);else await this.core.store.createAffiliate(row);
  await this.core.store.createAffiliateAudit({id:newId('AUD'),affiliateId:row.id,commissionId:'',actor,action:old?'update':'create',fromStatus:old?.status||'',toStatus:row.status,detail:JSON.stringify({code:row.code,username:row.username}),createdAt:nowISO()});return {...row,etag:fingerprint(row)};
 });}
 async settings(actor:string,b:any){return this.core.command(actor,b.idempotencyKey,'affiliate-settings',b,async()=>{
  for(const key of AFFILIATE_SETTING_KEYS){if(b.settings?.[key]===undefined)continue;const value=String(b.settings[key]);if(key.endsWith('_pct')&&(!Number.isFinite(Number(value))||Number(value)<0||Number(value)>100))fail('INVALID_RATE');
   if(key==='affiliate_window_days'&&(!Number.isInteger(Number(value))||Number(value)<1||Number(value)>365))fail('INVALID_DAYS');if(key==='wallet_cashout_min_tl'&&(!Number.isFinite(Number(value))||Number(value)<0))fail('INVALID_AMOUNT');if(key==='affiliate_program_open'&&!['0','1'].includes(value))fail('INVALID_STATUS');await this.core.store.setSetting(key,value.slice(0,300));}
  return readAffiliateSettings(this.core.store);
 });}
}
export function registerAffiliates(app:express.Express,service:AffiliateService){const {core}=service,base='/api/management';
 app.get(`${base}/affiliates`,core.guard('affiliates'),endpoint(async(req,res)=>res.json(await service.report(typeof req.query.since==='string'?req.query.since:undefined))));
 app.post(`${base}/affiliates`,core.guard('affiliates'),endpoint(async(req,res)=>res.json(await service.save((req as any).staff.username,req.body||{}))));
 app.get(`${base}/affiliates/:id`,core.guard('affiliates'),endpoint(async(req,res)=>{const a=await core.store.getAffiliateById(String(req.params.id));if(!a)fail('NOT_FOUND',404);res.json({affiliate:{...a,etag:fingerprint(a)},commissions:await core.store.listAffiliateCommissions({affiliateId:a.id}),attributions:await core.store.listAttributionsByCode(a.code),children:(await core.store.listAffiliates()).filter(c=>c.parentId===a.id),audit:await core.store.listAffiliateAudit(a.id,100)});}));
 app.post(`${base}/affiliate-settings`,core.guard('affiliates'),endpoint(async(req,res)=>res.json(await service.settings((req as any).staff.username,req.body||{}))));
 app.post(`${base}/affiliate-commissions/:id/:action`,core.guard('affiliates'),endpoint(async(req,res)=>res.json(await core.command((req as any).staff.username,req.body?.idempotencyKey,'commission-action',{id:req.params.id,action:req.params.action,...req.body},async()=>{
  const c=await core.store.getAffiliateCommissionById(String(req.params.id));if(!c)fail('NOT_FOUND',404);if(c.status!=='pending')fail('BAD_STATE',409);
  if(req.params.action==='approve'){await core.store.updateAffiliateCommission(c.id,{holdUntil:nowISO(),flag:'',updatedAt:nowISO()});await approveDueCommissions(core.store);}
  else if(req.params.action==='reject')await core.store.updateAffiliateCommission(c.id,{status:'rejected',note:stringValue(req.body?.note,500,true),updatedAt:nowISO()});else fail('INVALID_ACTION');
  return {success:true};
 }))));
 app.post(`${base}/affiliate-attach`,core.guard('affiliates'),endpoint(async(req,res)=>res.json(await core.command((req as any).staff.username,req.body?.idempotencyKey,'affiliate-attach',req.body,async()=>{
  const username=stringValue(req.body?.username,100,true);if(!(await core.store.getUserByUsername(username)))fail('USER_NOT_FOUND',404);
  const r=await claimAttribution(core.store,{username,code:stringValue(req.body?.code,50,true),source:'walkin',actor:(req as any).staff.username});if(!r.ok)fail(r.error||'INVALID_CODE');return r;
 }))));
}
