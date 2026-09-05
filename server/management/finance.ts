import type express from 'express';
import type { WalletDeps, OrderKind } from '../wallet/routes';
import { normalizePhone } from '../accountRoutes';
import { randomBytes } from 'node:crypto';
import { onOrderPaid } from '../affiliate/engine';
import type { Receipt } from '../../shared/management/types';
import { OpsCore, cashMethod, endpoint, fail, minor, newId, nowISO, parseJSON, stringValue } from './core';

export class FinanceService {
  constructor(public core:OpsCore, public deps:Pick<WalletDeps,'fulfil'|'unfulfil'>){}
  async receipt(actor:string,b:any,amount:number,username:string,action:string,orderId?:string,sessionId?:string,direction:'in'|'out'='in'):Promise<Receipt|null>{
    if(amount===0)return null;
    const method=direction==='out'?'cash':cashMethod(b.method);
    if(b.confirmed!==true)fail('PAYMENT_NOT_CONFIRMED');
    const reference=stringValue(b.reference,80),note=stringValue(b.note,500);
    const receipt:Receipt={id:newId('RC'),actor,action,amount,currency:'TRY',method,confirmation:method==='pos'?'operator_pos_manual':'operator_cash',reference,username,orderId,sessionId,direction,createdAt:nowISO(),note};
    await this.core.save('receipt',receipt.id,receipt,0);return receipt;
  }
  async customer(username:string){const u=await this.core.store.getUserByUsername(username);if(!u)fail('USER_NOT_FOUND',404);return u;}
  async wallet(username:string){const u=await this.customer(username);return {username:u.username,displayName:u.displayName||u.username,phone:u.phone,balance:await this.core.store.getWalletBalance(u.username),currency:'TRY',transactions:await this.core.store.listWalletTxFor(u.username,100),cashouts:(await this.core.list('cashout')).filter(r=>r.data.username===u.username)};}
  async topup(actor:string,b:any){return this.core.command(actor,b.idempotencyKey,'wallet-topup',b,async()=>{
    const user=await this.customer(stringValue(b.username,100,true)),amount=minor(b.amount)/100;
    const receipt=await this.receipt(actor,b,amount,user.username,'wallet_topup');
    const transaction=await this.core.store.appendWalletTx({id:newId('TX'),username:user.username,amount,type:'topup',ref:receipt!.id,operator:actor,note:stringValue(b.note,500),idempotencyKey:receipt!.id,createdAt:nowISO()});
    return {receipt,transaction,balance:transaction.balanceAfter};
  });}
  async requestCashout(actor:string,b:any){return this.core.command(actor,b.idempotencyKey,'cashout-request',b,async()=>{
    const user=await this.customer(stringValue(b.username,100,true)),amount=minor(b.amount)/100;
    const minimum=Number(await this.core.store.getSetting('wallet_cashout_min_tl'))||0;if(amount<minimum)fail('CASHOUT_MIN');
    const id=newId('WD');const tx=await this.core.store.appendWalletTx({id:newId('TX'),username:user.username,amount:-amount,type:'cashout_hold',ref:id,operator:actor,note:'Reserved for cash handover',idempotencyKey:id,createdAt:nowISO()});
    return this.core.save('cashout',id,{username:user.username,amount,currency:'TRY',status:'pending_handover',requestedBy:actor,createdAt:nowISO(),walletTxId:tx.id,balanceAfter:tx.balanceAfter,note:stringValue(b.note,500)},0);
  });}
  async finishCashout(actor:string,id:string,action:string,b:any){return this.core.command(actor,b.idempotencyKey,`cashout-${action}`,{id,...b},async()=>{
    const row=await this.core.read('cashout',id);if(!row)fail('NOT_FOUND',404);if(row.data.status!=='pending_handover')fail('BAD_STATE',409);
    const value={...row.data};
    if(action==='confirm'){
      const receipt=await this.receipt(actor,{...b,method:'cash'},value.amount,value.username,'wallet_cashout',undefined,undefined,'out');
      value.status='paid';value.receipt=receipt;value.handedOverBy=actor;value.handedOverAt=nowISO();
    }else if(action==='cancel'){
      const reason=stringValue(b.note,500,true);
      await this.core.store.appendWalletTx({id:newId('TX'),username:value.username,amount:value.amount,type:'cashout_release',ref:id,operator:actor,note:reason,idempotencyKey:`${id}:release`,createdAt:nowISO()});value.status='cancelled';value.cancelledBy=actor;value.cancelReason=reason;
    }else fail('INVALID_ACTION');
    return this.core.save('cashout',id,value,row.version);
  });}
  async settle(actor:string,id:string,b:any){return this.core.command(actor,b.idempotencyKey,'settle-order',{id,...b},async()=>{
    const store=this.core.store,o=await store.getOnsiteOrder(id);if(!o)fail('NOT_FOUND',404);
    if(o.status!=='pending_onsite')fail('BAD_STATE',409);
    if(o.dueAt&&Date.parse(o.dueAt)<=Date.now())fail('PAYMENT_DEADLINE_PASSED',409);
    const amount=minor(o.amount,true)/100,payload=parseJSON(o.payload),previous=parseJSON(o.result);
    const method=amount?cashMethod(b.method):'free';
    if(amount&&b.confirmed!==true)fail('PAYMENT_NOT_CONFIRMED');
    let result:any=previous;
    if((o.kind==='cafe'||o.kind==='shop')&&!previous.orderId)result={...previous,...await this.deps.fulfil(o.kind,payload,o.username,{merchantOid:o.id,kind:o.kind,username:o.username})};
    else result={...previous,...await this.deps.fulfil(o.kind as OrderKind,{...payload,__pointsOnly:true},o.username,{merchantOid:o.id,kind:o.kind,username:o.username})};
    const receipt=await this.receipt(actor,b,amount,o.username,`${o.kind}_sale`,o.id,payload._ops?.sessionId);
    result={...result,method,receiptId:receipt?.id||null};
    await store.updateOnsiteOrder(o.id,{status:'settled',settledAt:nowISO(),settledBy:`${method}:${actor}`,result:JSON.stringify(result),updatedAt:nowISO()});
    await this.core.save('commission-job',o.id,{username:o.username,orderId:o.id,kind:o.kind,amount:o.amount,dueAt:o.dueAt,payload,status:'pending'},0);
    return {success:true,status:'settled',result,receipt};
  });}
  async cancelOrder(actor:string,id:string,b:any){return this.core.command(actor,b.idempotencyKey,'cancel-order',{id,...b},async()=>{
    const o=await this.core.store.getOnsiteOrder(id);if(!o)fail('NOT_FOUND',404);if(o.status!=='pending_onsite')fail('PAID_ORDER_REQUIRES_REFUND',409);
    const payload=parseJSON(o.payload);if(payload._ops?.inventoryBooked)fail('ORDER_ALREADY_PREPARED',409);
    await this.deps.unfulfil(o.kind as OrderKind,payload,o.username,parseJSON(o.result));
    await this.core.store.updateOnsiteOrder(o.id,{status:'cancelled_admin',updatedAt:nowISO(),settledBy:actor});
    return {success:true,status:'cancelled_admin'};
  });}
  async processCommissionJobs(){for(const row of await this.core.list('commission-job')){
    if(row.data.status!=='pending')continue;
    try{await this.core.store.runInTransaction(async()=>{const fresh=await this.core.read('commission-job',row.id);if(fresh?.data.status!=='pending')return;
      const user=await this.core.store.getUserByUsername(row.data.username);await onOrderPaid(this.core.store,{...row.data,userRole:user?.role});await this.core.save('commission-job',row.id,{...row.data,status:'done'},fresh.version);
    });}catch{/* Persisted job remains available for a later retry; card sale is never repeated. */}
  }}
}
export function registerFinance(app:express.Express,service:FinanceService){const {core}=service,base='/api/management';
  app.get(`${base}/customers`,core.guard(),endpoint(async(req,res)=>{const staff=(req as any).staff;if(!staff.permissions.some((p:string)=>['wallet','cashout','orders','reservations','affiliates'].includes(p)))fail('FORBIDDEN',403);
    const out=[];for(const u of await core.store.listUsers())out.push({username:u.username,displayName:u.displayName||u.username,phone:u.phone,balance:staff.permissions.includes('wallet')||staff.permissions.includes('cashout')?await core.store.getWalletBalance(u.username):undefined,stats:(await core.read('customer-stats',u.username))?.data||{}});res.json(out);
  }));
  app.post(`${base}/customers`,core.guard('wallet'),endpoint(async(req,res)=>{const b=req.body||{};res.json(await core.command((req as any).staff.username,b.idempotencyKey,'create-customer',b,async()=>{
    const phone=normalizePhone(b.phone);if(!phone)fail('BAD_PHONE');if(await core.store.getUserByPhone(phone))fail('PHONE_EXISTS',409);
    const username=phone.replace(/^\+/,'');if(await core.store.getUserByUsername(username))fail('USER_EXISTS',409);
    await core.store.createUser({username,phone,email:'',password:randomBytes(32).toString('base64url')});await core.store.updateUserFields(username,{displayName:stringValue(b.displayName,100,true),hasPassword:0,createdAt:nowISO()});return {username,phone};
  }));}));
  app.get(`${base}/wallet/:username`,core.guard(),endpoint(async(req,res)=>{if(!(req as any).staff.permissions.some((p:string)=>['wallet','cashout'].includes(p)))fail('FORBIDDEN',403);res.json(await service.wallet(String(req.params.username)));}));
  app.post(`${base}/wallet/topup`,core.guard('wallet'),endpoint(async(req,res)=>res.json(await service.topup((req as any).staff.username,req.body||{}))));
  app.post(`${base}/wallet/cashout`,core.guard('cashout'),endpoint(async(req,res)=>res.json(await service.requestCashout((req as any).staff.username,req.body||{}))));
  app.post(`${base}/cashouts/:id/:action`,core.guard('cashout'),endpoint(async(req,res)=>res.json(await service.finishCashout((req as any).staff.username,String(req.params.id),String(req.params.action),req.body||{}))));
  app.get(`${base}/cashouts`,core.guard('cashout'),endpoint(async(_req,res)=>res.json(await core.list('cashout'))));
  app.get(`${base}/receipts`,core.guard('reports'),endpoint(async(_req,res)=>res.json(await core.list('receipt'))));
  app.get(`${base}/onsite-orders`,core.guard('collect'),endpoint(async(_req,res)=>res.json((await core.store.listOnsiteOrders()).map(o=>({...o,payload:parseJSON(o.payload),result:parseJSON(o.result)})))));
  app.post(`${base}/onsite-orders/:id/settle`,core.guard('collect'),endpoint(async(req,res)=>res.json(await service.settle((req as any).staff.username,String(req.params.id),req.body||{}))));
  app.post(`${base}/onsite-orders/:id/cancel`,core.guard('collect'),endpoint(async(req,res)=>res.json(await service.cancelOrder((req as any).staff.username,String(req.params.id),req.body||{}))));
  const timer=setInterval(()=>void service.processCommissionJobs(),5000);timer.unref();
}
