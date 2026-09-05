import type express from 'express';
import { OpsCore, endpoint, fail } from './core';
import { dayAt, localInstant, parseDay, plusDay } from './time';
export async function operationalReport(core:OpsCore,from?:string,to?:string){
 const zone=await core.timezone(),first=parseDay(from||dayAt(Date.now(),zone),Date.now(),zone),last=parseDay(to||first,Date.now(),zone);if(last<first)fail('INVALID_RANGE');
 const start=localInstant(first,'00:00',zone),end=localInstant(plusDay(last),'00:00',zone),within=(value:string)=>{const n=Date.parse(value);return n>=start&&n<end;};
 const receipts=(await core.list('receipt')).map(r=>r.data).filter(r=>within(r.createdAt));
 const byKind:Record<string,number>={reservation:0,tournament:0,cafe:0,shop:0,session:0};let returns=0;
 for(const o of await core.store.listOnsiteOrders()){
  if(o.settledAt&&within(o.settledAt))byKind[o.kind]=(byKind[o.kind]||0)+o.amount;
  if(o.settledAt&&['refunded','cancelled_user'].includes(o.status)&&within(o.updatedAt))returns+=o.amount;
 }
 for(const r of await core.list('invoice'))if(within(r.data.closedAt))byKind.session+=r.data.newGameCost||0;
 const pendingCashouts=(await core.list('cashout')).filter(r=>r.data.status==='pending_handover').reduce((a,r)=>a+r.data.amount,0);
 const walletAvailable=await core.store.getWalletBalance();
 const r2=(n:number)=>Math.round(n*100)/100;
 return {from:first,to:last,timezone:zone,currency:'TRY',receipts,byKind:Object.fromEntries(Object.entries(byKind).map(([k,v])=>[k,r2(v)])),grossSales:r2(Object.values(byKind).reduce((a,b)=>a+b,0)),returns:r2(returns),netSales:r2(Object.values(byKind).reduce((a,b)=>a+b,0)-returns),
  cashIn:r2(receipts.filter(r=>r.direction==='in'&&r.method==='cash').reduce((a,r)=>a+r.amount,0)),posIn:r2(receipts.filter(r=>r.direction==='in'&&r.method==='pos').reduce((a,r)=>a+r.amount,0)),cashOut:r2(receipts.filter(r=>r.direction==='out').reduce((a,r)=>a+r.amount,0)),walletAvailable:r2(walletAvailable),pendingCashouts:r2(pendingCashouts),customerLiability:r2(walletAvailable+pendingCashouts)};
}
export function registerReports(app:express.Express,core:OpsCore){app.get('/api/management/reports',core.guard('reports'),endpoint(async(req,res)=>res.json(await operationalReport(core,typeof req.query.from==='string'?req.query.from:undefined,typeof req.query.to==='string'?req.query.to:undefined))));}
