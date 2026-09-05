import { createHash, randomUUID } from 'node:crypto';
import type { IDataStore } from '../dataProviders';
import { OPS_PERMISSIONS, type OpsRecord, type OpsPermission, type StaffIdentity } from '../../shared/management/types';
import { DEFAULT_TIMEZONE } from './time';
import type { Request, Response, RequestHandler } from 'express';

export const nowISO=()=>new Date().toISOString();
export const newId=(prefix='OP')=>`${prefix}-${randomUUID()}`;
export const parseJSON=(s:unknown,fallback:any={})=>{if(typeof s!=='string')return s??fallback;try{return JSON.parse(s);}catch{return fallback;}};
export function fail(code:string,statusCode=400,message=code):never {throw Object.assign(new Error(message),{code,statusCode});}
export function stringValue(v:unknown,max=160,required=false):string { if(v!==undefined&&typeof v!=='string')fail('INVALID_TEXT');const s=String(v??'').trim();if(s.length>max||(required&&!s))fail('INVALID_TEXT');return s; }
export function minor(v:unknown,allowZero=false):number { const n=Number(v);if(!Number.isFinite(n)||n<0||(!allowZero&&n===0)||n>10_000_000)fail('INVALID_AMOUNT');return Math.round((n+Number.EPSILON)*100); }
export function cashMethod(v:unknown) { if(v!=='cash'&&v!=='pos')fail('METHOD_NOT_ALLOWED');return v as 'cash'|'pos'; }
export function expected(v:unknown):number {const n=Number(v);if(!Number.isSafeInteger(n)||n<0)fail('VERSION_REQUIRED');return n;}
function sorted(v:any):any {if(Array.isArray(v))return v.map(sorted);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,sorted(v[k])]));return v;}
export const fingerprint=(v:any)=>createHash('sha256').update(JSON.stringify(sorted(v))).digest('hex');
export class OpsCore {
  constructor(public getStore:()=>IDataStore) {}
  get store(){return this.getStore();}
  async read<T=any>(kind:string,id:string):Promise<OpsRecord<T>|undefined>{return this.store.getOpsRecord(kind,id);}
  async list<T=any>(kind:string):Promise<OpsRecord<T>[]>{return this.store.listOpsRecords(kind);}
  async save<T=any>(kind:string,id:string,data:T,version:number,uniqueKey?:string|null):Promise<OpsRecord<T>> {
    if(!/^[\w.-]{1,50}$/.test(kind)||!id||id.length>100)fail('INVALID_RECORD_ID');
    return this.store.saveOpsRecord({kind,id,data,version,uniqueKey,updatedAt:nowISO()},expected(version));
  }
  async settings(){return (await this.read('config','venue'))?.data||{timezone:DEFAULT_TIMEZONE};}
  async timezone(){const z=(await this.settings()).timezone||DEFAULT_TIMEZONE;try{new Intl.DateTimeFormat('en',{timeZone:z});return z;}catch{return DEFAULT_TIMEZONE;}}
  async staff(username?:string):Promise<StaffIdentity> {
    if(!username)fail('AUTH_REQUIRED',401);
    const u=await this.store.getUserByUsername(username);if(!u)fail('AUTH_REQUIRED',401);
    const admin=u.role==='admin';const configured=(await this.read('access',u.username))?.data?.permissions||[];
    const permissions=admin?[...OPS_PERMISSIONS]:OPS_PERMISSIONS.filter(p=>configured.includes(p));
    if(!permissions.length)fail('STAFF_ONLY',403);
    return {username:u.username,displayName:u.displayName||u.username,admin,permissions};
  }
  async authorize(req:Request,permission?:OpsPermission) {const staff=await this.staff((req as any).authUsername);if(permission&&!staff.permissions.includes(permission))fail('FORBIDDEN',403);return staff;}
  guard(permission?:OpsPermission):RequestHandler {return async(req,res,next)=>{try{(req as any).staff=await this.authorize(req,permission);next();}catch(e){sendError(res,e);}};}
  async audit(actor:string,action:string,target:string,detail:any={}) {return this.save('audit',newId('AU'),{actor,action,target,detail,createdAt:nowISO()},0);}
  async command<T>(actor:string,keyValue:unknown,action:string,input:any,fn:()=>Promise<T>):Promise<T> {
    const key=stringValue(keyValue,100,true),id=fingerprint({actor,key}),hash=fingerprint({action,input});
    return this.store.runInTransaction(async()=>{
      const old=await this.read('operation',id);
      if(old){if(old.data.hash!==hash)fail('IDEMPOTENCY_CONFLICT',409);return old.data.result as T;}
      const result=await fn();
      await this.save('operation',id,{hash,action,actor,result},0);
      await this.audit(actor,action,id);
      return result;
    });
  }
}
export function sendError(res:Response,e:any) {
  const conflict=e?.code===11000||/UNIQUE constraint|duplicate key|Violation of.*UNIQUE/i.test(e?.message||'');
  const status=conflict?409:Number(e?.statusCode)||500;
  return res.status(status).json({error:conflict?'VERSION_CONFLICT':e?.code|| (status<500?e?.message:'OPERATION_FAILED'),message:status<500?e?.message:undefined});
}
export function endpoint(fn:(req:Request,res:Response)=>Promise<any>):RequestHandler {return (req,res)=>{Promise.resolve(fn(req,res)).catch(e=>sendError(res,e));};}

/** Existing JSON handlers retain their response contract, but no successful response is
 * sent until COMMIT, and handled HTTP errors roll back rather than commit partial work. */
export function transactional(getStore:()=>IDataStore,fn:(req:Request,res:Response)=>any):RequestHandler {
  return async(req,res)=>{
    const json=res.json;let body:any;let captured=false;let status=200;
    res.json=function(b:any){body=b;captured=true;status=this.statusCode;return this;};
    try {
      const execute=async()=>{await fn(req,res);if(captured&&status>=400)throw {responseAbort:true};return {body,status};};
      if(req.path.startsWith('/api/checkout/') && req.body?.idempotencyKey && (req as any).authUsername){
        const r=await new OpsCore(getStore).command((req as any).authUsername,req.body.idempotencyKey,req.path,req.body,execute);body=r.body;status=r.status;captured=true;
      } else await getStore().runInTransaction(execute);
      res.json=json;
      if(captured)res.status(status).json(body);
    }catch(e:any){res.json=json;if(e?.responseAbort)res.status(status).json(body);else sendError(res,e);}
  };
}
