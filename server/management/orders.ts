import type express from 'express';
import type { FinanceService } from './finance';
import { OpsCore, endpoint, expected, fail, minor, newId, nowISO, parseJSON, stringValue } from './core';
export type ProductKind='cafe'|'shop';
export const productKind=(value:unknown):ProductKind=>{if(value!=='cafe'&&value!=='shop')fail('INVALID_KIND');return value as ProductKind;};
const transitions:Record<string,string[]>={new:['accepted','cancelled'],accepted:['preparing','ready','cancelled'],preparing:['ready','cancelled'],ready:['delivered','cancelled'],delivered:['returned'],cancelled:[],returned:[]};
export class OrderService {
 constructor(public core:OpsCore,public finance:FinanceService,public quote:(kind:any,p:any,u?:string)=>Promise<any>,public catalog:(kind:ProductKind)=>Promise<any[]>){ }
 async list(kind:ProductKind){const list=await this.core.store.listOnsiteOrders({kind}),meta=await this.core.list('order-state'),sessions=await this.core.list('session'),stations=await this.core.list('station'),users=await this.core.store.listUsers();const linked=new Set<string>();
  const result=list.map(o=>{const p=parseJSON(o.payload),r=parseJSON(o.result),m=meta.find(x=>x.id===o.id);if(r.orderId)linked.add(r.orderId);const session=sessions.find(s=>s.id===p._ops?.sessionId),stationId=session?.data.stationId||p._ops?.stationId||stations.find(s=>s.data.systemId===p._ops?.systemId)?.id||null;
   return {id:o.id,kind,source:p._ops?.source||'online',username:o.username,customerName:users.find(u=>u.username===o.username)?.displayName||o.username||p._ops?.customerName||'—',stationId,stationName:stations.find(s=>s.id===stationId)?.data.name||p.tableNumber||'',sessionId:p._ops?.sessionId||null,lines:kind==='cafe'?p.items||[]:p.cart||[],amount:o.amount,createdAt:o.createdAt,paymentStatus:o.status==='settled'?(o.amount===0?'free':'paid'):o.status.startsWith('cancelled')?'cancelled':o.status==='refunded'?'refunded':'pending',fulfilmentStatus:m?.data.status||(o.status.startsWith('cancelled')?'cancelled':'new'),version:m?.version||0,receiptId:r.receiptId||null,legacy:false};});
  const legacy=kind==='cafe'?await this.core.store.listCafeOrders():await this.core.store.listShopOrders();for(const o of legacy){if(linked.has(o.id))continue;result.push({id:o.id,kind,source:'legacy',username:o.username||'',customerName:o.username||'—',stationId:null,stationName:(o as any).tableNumber||'',sessionId:null,lines:parseJSON((o as any).items||(o as any).cart,[]),amount:o.finalAmount,createdAt:o.date,paymentStatus:'unknown',fulfilmentStatus:o.status,version:0,receiptId:null,legacy:true});}
  return result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 }
 async create(actor:string,b:any){return this.core.command(actor,b.idempotencyKey,'create-order',b,async()=>{
  const kind=productKind(b.kind),username=stringValue(b.username,100),stationId=b.stationId?stringValue(b.stationId,100):null,sessionId=b.sessionId?stringValue(b.sessionId,100):null;
  if(username&&!(await this.core.store.getUserByUsername(username)))fail('USER_NOT_FOUND',404);
  if(stationId&&!(await this.core.read('station',stationId)))fail('STATION_NOT_REGISTERED',409);
  const session=sessionId?await this.core.read('session',sessionId):null;if(sessionId&&(!session||session.data.closedAt||session.data.settlingAt||session.data.stationId!==stationId))fail('SESSION_NOT_AVAILABLE',409);
  const params={...(kind==='cafe'?{items:b.lines}:{cart:b.lines}),couponCode:stringValue(b.couponCode,50),stationId,sessionId};
  const q=await this.quote(kind,params,username||session?.data.username||'');const id=newId('OS'),time=nowISO();q.payload._ops={source:'onsite',stationId,sessionId,customerName:stringValue(b.customerName,100),createdBy:actor};
  await this.core.store.createOnsiteOrder({id,kind,username:username||session?.data.username||'',amount:q.amount,status:'pending_onsite',dueAt:'',payload:JSON.stringify(q.payload),description:q.description,result:'{}',createdAt:time,updatedAt:time,settledAt:'',settledBy:''});return {id,amount:q.amount,status:'pending_onsite'};
 });}
 async moveStock(kind:ProductKind,p:any,direction:1|-1,orderId:string,reason:string){
  const lines=kind==='cafe'?p.items:p.cart;
  for(const l of lines||[]){const id=l.item.id,item=kind==='cafe'?await this.core.store.getCafeItemById(id):await this.core.store.getAccessoryById(id);if(!item)fail('PRODUCT_NOT_FOUND',404);const previous=kind==='cafe'?(item as any).inventory:(item as any).stock,qty=Number(l.quantity);
   if(kind==='cafe')await this.core.store.updateCafeItem(id,{inventory:previous+direction*qty});else await this.core.store.updateAccessory(id,{stock:previous+direction*qty});
   await this.core.save('stock-movement',newId('SM'),{kind,itemId:id,delta:direction*qty,orderId,reason,at:nowISO()},0);
  }
 }
 async transition(actor:string,id:string,b:any,allowRefund=false){return this.core.command(actor,b.idempotencyKey,'order-transition',{id,...b},async()=>{
  const o=await this.core.store.getOnsiteOrder(id);if(!o||!['cafe','shop'].includes(o.kind))fail('NOT_FOUND',404);const kind=o.kind as ProductKind,old=await this.core.read('order-state',id),status=old?.data.status||'new',next=stringValue(b.status,30,true);
  if(expected(b.version)!==(old?.version||0))fail('VERSION_CONFLICT',409);
  if(!(transitions[status]||[]).includes(next))fail('INVALID_TRANSITION',409);
  const p=parseJSON(o.payload),r=parseJSON(o.result);p._ops={...p._ops};
  if(next==='accepted'&&r.orderId)p._ops.inventoryBooked=true;
  if(next==='accepted'&&!r.orderId){Object.assign(r,await this.finance.deps.fulfil(kind,{...p,__noPoints:true},o.username,{merchantOid:o.id,kind:o.kind,username:o.username}));p._ops.inventoryBooked=true;}
  if(next==='cancelled'){
   if(o.status==='settled')fail('PAID_ORDER_REQUIRES_REFUND',409);
   if(['preparing','ready'].includes(status)&&b.discard!==true)fail('DISCARD_CONFIRMATION_REQUIRED');
   if(p._ops.inventoryBooked&&status==='accepted')await this.moveStock(kind,p,1,id,'cancel-before-preparation');
   if(p._ops.inventoryBooked&&['preparing','ready'].includes(status))await this.core.save('stock-movement',newId('SM'),{kind,orderId:id,reason:'waste',note:stringValue(b.note,500,true),at:nowISO()},0);
   await this.core.store.updateOnsiteOrder(id,{status:'cancelled_admin',updatedAt:nowISO()});
  }
  if(next==='returned'){
   if(kind!=='shop')fail('CAFE_RETURN_NOT_SUPPORTED');if(!allowRefund)fail('FORBIDDEN',403);stringValue(b.note,500,true);
   if(o.status==='settled'){
    if(r.method==='wallet')await this.core.store.appendWalletTx({id:newId('TX'),username:o.username,amount:o.amount,type:'refund',ref:id,operator:actor,note:b.note,idempotencyKey:`return:${id}`,createdAt:nowISO()});
    else r.refundReceipt=await this.finance.receipt(actor,{...b,method:'cash'},o.amount,o.username,'shop_refund',id,undefined,'out');
   }
   if(b.restock===true&&p._ops.inventoryBooked)await this.moveStock(kind,p,1,id,'returned-goods');
   await this.core.store.updateOnsiteOrder(id,{status:o.status==='settled'?'refunded':'cancelled_admin',updatedAt:nowISO()});
  }
  if(r.orderId){const legacyStatus:Record<string,string>={accepted:kind==='cafe'?'Pending':'Processing',preparing:'Preparing',ready:'Ready',delivered:'Delivered',cancelled:'Cancelled',returned:'Returned'};if(kind==='cafe')await this.core.store.setCafeOrderStatus(r.orderId,legacyStatus[next]);else await this.core.store.setShopOrderStatus(r.orderId,legacyStatus[next]);}
  await this.core.store.updateOnsiteOrder(id,{payload:JSON.stringify(p),result:JSON.stringify(r),updatedAt:nowISO()});
  return this.core.save('order-state',id,{status:next,actor,changedAt:nowISO(),note:stringValue(b.note,500)},old?.version||0);
 });}
 async attach(actor:string,id:string,b:any){return this.core.command(actor,b.idempotencyKey,'attach-order',{id,...b},async()=>{
  const o=await this.core.store.getOnsiteOrder(id);if(!o||!['cafe','shop'].includes(o.kind))fail('NOT_FOUND',404);if(o.status!=='pending_onsite')fail('ORDER_ALREADY_PAID',409);
  const session=await this.core.read('session',stringValue(b.sessionId,100,true));if(!session||session.data.closedAt||session.data.settlingAt)fail('SESSION_NOT_AVAILABLE',409);
  const p=parseJSON(o.payload);p._ops={...p._ops,stationId:session.data.stationId,sessionId:session.id};await this.core.store.updateOnsiteOrder(id,{payload:JSON.stringify(p),updatedAt:nowISO()});return {success:true};
 });}
 async saveProduct(actor:string,kind:ProductKind,b:any){return this.core.command(actor,b.idempotencyKey,'save-product',{kind,...b},async()=>{
  const id=b.id?stringValue(b.id,100):newId(kind==='cafe'?'CFI':'SKU'),metadata=await this.core.read('catalog-version',id),existing=(await this.catalog(kind)).find(p=>p.id===id);
  if((metadata?.version||0)!==expected(b.version))fail('VERSION_CONFLICT',409);
  const stock=Number(b.stock);if(!Number.isSafeInteger(stock)||stock<0||stock>1_000_000)fail('INVALID_STOCK');
  const common={id,name:stringValue(b.name,160,true),category:stringValue(b.category,50,true),price:minor(b.price,true)/100,imageUrl:stringValue(b.imageUrl,500)||existing?.imageUrl||'/images/home/energy-drink-400.webp'};
  if(kind==='cafe'){const data={...common,inventory:stock,isAvailable:b.active!==false};if(await this.core.store.getCafeItemById(id))await this.core.store.updateCafeItem(id,data);else await this.core.store.createCafeItem(data);}
  else{const data={...common,stock,description:stringValue(b.description,2000)};if(await this.core.store.getAccessoryById(id))await this.core.store.updateAccessory(id,data);else await this.core.store.createAccessory(data);}
  await this.core.save('stock-movement',newId('SM'),{kind,itemId:id,reason:'inventory-adjustment',before:existing?(kind==='cafe'?existing.inventory:existing.stock):0,after:stock,actor,at:nowISO()},0);
  return this.core.save('catalog-version',id,{kind},metadata?.version||0);
 });}
}
export function registerOrders(app:express.Express,service:OrderService){const {core}=service,base='/api/management';
 app.get(`${base}/order-context`,core.guard('orders'),endpoint(async(_req,res)=>res.json({stations:await core.list('station'),sessions:(await core.list('session')).filter(s=>!s.data.closedAt&&!s.data.settlingAt).map(s=>({id:s.id,stationId:s.data.stationId,customerName:s.data.customerName}))})));
 app.get(`${base}/orders`,core.guard('orders'),endpoint(async(req,res)=>res.json(await service.list(productKind(req.query.kind)))));
 app.post(`${base}/orders`,core.guard('orders'),endpoint(async(req,res)=>res.json(await service.create((req as any).staff.username,req.body||{}))));
 app.post(`${base}/orders/:id/status`,core.guard('orders'),endpoint(async(req,res)=>res.json(await service.transition((req as any).staff.username,String(req.params.id),req.body||{},(req as any).staff.permissions.includes('collect')))));
 app.post(`${base}/orders/:id/attach`,core.guard('orders'),endpoint(async(req,res)=>res.json(await service.attach((req as any).staff.username,String(req.params.id),req.body||{}))));
 app.get(`${base}/catalog/:kind`,core.guard('orders'),endpoint(async(req,res)=>{const kind=productKind(req.params.kind),meta=await core.list('catalog-version');res.json((await service.catalog(kind)).map(p=>({...p,stock:kind==='cafe'?p.inventory:p.stock,version:meta.find(m=>m.id===p.id)?.version||0})));}));
 app.post(`${base}/catalog/:kind`,core.guard('configure'),endpoint(async(req,res)=>res.json(await service.saveProduct((req as any).staff.username,productKind(req.params.kind),req.body||{}))));
}
