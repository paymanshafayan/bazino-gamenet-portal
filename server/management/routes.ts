import type express from 'express';
import type { IDataStore, SystemRow } from '../dataProviders';
import { OpsCore, endpoint, expected, fail, minor, nowISO, stringValue } from './core';
import { OPS_PERMISSIONS } from '../../shared/management/types';

export interface ManagementDeps {
  app:express.Express; getStore:()=>IDataStore; signToken:(username:string)=>string;
  systems:()=>Promise<SystemRow[]>; cafe:()=>Promise<any[]>; shop:()=>Promise<any[]>; tournaments:()=>Promise<any[]>;
}
export function registerManagementCore(d:ManagementDeps):OpsCore {
  const {app}=d, core=new OpsCore(d.getStore), base='/api/management';
  const attempts=new Map<string,{count:number,at:number}>();
  app.post(`${base}/login`,endpoint(async(req,res)=>{
    const ip=req.ip||'unknown',recent=attempts.get(ip),time=Date.now();
    if(recent&&time-recent.at<60000&&recent.count>=8)fail('RATE_LIMITED',429);
    if(attempts.size>2000)attempts.clear();attempts.set(ip,{count:recent&&time-recent.at<60000?recent.count+1:1,at:recent?.at&&time-recent.at<60000?recent.at:time});
    const u=await core.store.verifyLogin(stringValue(req.body?.username,100,true),stringValue(req.body?.password,500,true));
    if(!u)fail('INVALID_CREDENTIALS',401);const staff=await core.staff(u.username);attempts.delete(ip);
    res.json({token:d.signToken(u.username),staff});
  }));
  app.get(`${base}/me`,core.guard(),endpoint(async(req,res)=>{res.json({staff:(req as any).staff,timezone:await core.timezone(),provider:core.store.name,serverTime:nowISO(),posMode:'manual'});}));
  app.get(`${base}/bootstrap`,core.guard(),endpoint(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.json({staff:(req as any).staff,stations:await core.list('station'),systems:await d.systems(),timezone:await core.timezone(),serverTime:nowISO(),config:await core.read('config','venue')});
  }));
  app.put(`${base}/config`,core.guard('configure'),endpoint(async(req,res)=>{
    const timezone=stringValue(req.body?.timezone,80,true);try{new Intl.DateTimeFormat('en',{timeZone:timezone});}catch{fail('INVALID_TIMEZONE');}
    res.json(await core.command((req as any).staff.username,req.body?.idempotencyKey,'config',req.body,async()=>core.save('config','venue',{timezone},expected(req.body.version))));
  }));
  app.post(`${base}/stations/import`,core.guard('configure'),endpoint(async(req,res)=>{
    const rows=req.body?.stations;if(!Array.isArray(rows)||rows.length>100||!rows.length)fail('INVALID_STATIONS');
    res.json(await core.command((req as any).staff.username,req.body?.idempotencyKey,'import-stations',rows,async()=>{
      const imported=[];
      for(const v of rows){const id=stringValue(v.id,100,true);if(await core.read('station',id))continue;
        imported.push(await core.save('station',id,{id,name:stringValue(v.name,180,true),type:stringValue(v.type,50,true),systemId:null,hourlyRate:minor(v.hourlyRate,true)/100,active:true},0));}
      return {imported};
    }));
  }));
  app.put(`${base}/stations/:id`,core.guard('configure'),endpoint(async(req,res)=>{
    const id=stringValue(req.params.id,100,true),b=req.body||{},systemId=b.systemId?stringValue(b.systemId,100,true):null;
    const response=await core.command((req as any).staff.username,b.idempotencyKey,'update-station',{id,...b},async()=>{
      const old=await core.read('station',id);if(!old)fail('NOT_FOUND',404);
      if(systemId && !(await d.systems()).some(s=>s.id===systemId))fail('SYSTEM_NOT_FOUND',404);
      if(systemId!==old.data.systemId && (await core.list('session')).some(s=>s.data.stationId===id&&!s.data.closedAt))fail('STATION_IN_USE',409);
      if(systemId){const system=(await d.systems()).find(s=>s.id===systemId)!;if(!(await core.store.getSystemById(systemId)))await core.store.createSystem(system);}
      if(systemId&&b.hourlyRate!==undefined)await core.store.updateSystem(systemId,{hourlyRate:minor(b.hourlyRate,true)/100});
      return core.save('station',id,{...old.data,name:stringValue(b.name??old.data.name,180,true),systemId,hourlyRate:minor(b.hourlyRate??old.data.hourlyRate,true)/100,active:b.active!==false},expected(b.version),systemId?`station:${systemId}`:null);
    });res.json(response);
  }));
  app.get(`${base}/access`,core.guard('configure'),endpoint(async(req,res)=>{
    if(!(req as any).staff.admin)fail('ADMIN_ONLY',403);
    const access=await core.list('access');res.json({permissions:OPS_PERMISSIONS,users:(await core.store.listUsers()).map(u=>({username:u.username,displayName:u.displayName||u.username,role:u.role,access:access.find(a=>a.id===u.username)}))});
  }));
  app.put(`${base}/access/:username`,core.guard('configure'),endpoint(async(req,res)=>{
    if(!(req as any).staff.admin)fail('ADMIN_ONLY',403);const username=stringValue(req.params.username,100,true),b=req.body||{};
    if(!Array.isArray(b.permissions)||b.permissions.some((p:any)=>!OPS_PERMISSIONS.includes(p)))fail('INVALID_PERMISSIONS');
    if(!(await core.store.getUserByUsername(username)))fail('USER_NOT_FOUND',404);
    res.json(await core.command((req as any).staff.username,b.idempotencyKey,'access',{username,...b},()=>core.save('access',username,{permissions:[...new Set(b.permissions)]},expected(b.version))));
  }));
  app.get(`${base}/audit`,core.guard('reports'),endpoint(async(_req,res)=>res.json((await core.list('audit')).slice(0,500))));
  return core;
}
