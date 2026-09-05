import type express from 'express';
import { OpsCore, endpoint, fail, minor, newId, nowISO, stringValue } from './core';
import { bookingViews, assertStationFree } from './bookings';
import { onReservationAttended } from '../affiliate/engine';
import type { FinanceService } from './finance';

export function billableSeconds(session:any,until=Date.now()):number {
  const end=session.closedAt?Date.parse(session.closedAt):session.settlingAt?Date.parse(session.settlingAt):until,start=Date.parse(session.startedAt);
  let duration=Math.max(0,end-start);for(const pause of session.pauses||[])duration-=Math.max(0,Math.min(end,pause.to?Date.parse(pause.to):end)-Math.max(start,Date.parse(pause.from)));
  return Math.max(0,duration/1000);
}
export function segmentCost(session:any,until=Date.now()):number {
  const end=session.settlingAt?Date.parse(session.settlingAt):session.closedAt?Date.parse(session.closedAt):until;let cost=0;
  for(const seg of session.segments||[{from:session.startedAt,rate:session.hourlyRate}]){
    let a=Date.parse(seg.from),b=Math.min(end,seg.to?Date.parse(seg.to):end);
    // The reserved interval was already priced and paid at checkout. Only overrun is new.
    if(session.reservationEndsAt)a=Math.max(a,Date.parse(session.reservationEndsAt));
    let seconds=Math.max(0,b-a)/1000;
    for(const pause of session.pauses||[])seconds-=Math.max(0,Math.min(b,pause.to?Date.parse(pause.to):b)-Math.max(a,Date.parse(pause.from)))/1000;
    cost+=Math.max(0,seconds)*Number(seg.rate||0)/3600;
  }
  return Math.round(cost*100)/100;
}
export class SessionService {
  constructor(public core:OpsCore,public finance:FinanceService){}
  async start(actor:string,b:any){return this.core.command(actor,b.idempotencyKey,'session-start',b,async()=>{
    const station=await this.core.read('station',stringValue(b.stationId,100,true));if(!station||!station.data.active)fail('STATION_NOT_REGISTERED',409);
    if((await this.core.list('session')).some(r=>r.data.stationId===station.id&&!r.data.closedAt))fail('STATION_IN_USE',409);
    let booking:any=null;const current=Date.now();let username=stringValue(b.username,100),duration=b.durationMinutes===undefined?60:Number(b.durationMinutes);
    if(!Number.isFinite(duration)||duration<1||duration>1440)fail('INVALID_DURATION');
    if(b.reservationId){booking=(await bookingViews(this.core)).find(r=>r.id===b.reservationId);if(!booking||booking.stationId!==station.id)fail('RESERVATION_MISMATCH');if(!['paid','free'].includes(booking.paymentStatus)||booking.bookingStatus!=='confirmed')fail('PAYMENT_REQUIRED',409);
      if(!booking.startsAt||!booking.endsAt||current<Date.parse(booking.startsAt)-15*60000||current>=Date.parse(booking.endsAt))fail('RESERVATION_START_WINDOW',409);
      username=booking.username;duration=(Date.parse(booking.endsAt)-current)/60000;
      const meta=await this.core.read('booking',booking.id);if(meta?.data.sessionId)fail('ALREADY_STARTED',409);
    }
    const user=username?await this.core.store.getUserByUsername(username):null;if(username&&!user)fail('USER_NOT_FOUND',404);
    const controllers=Number(b.controllers||1);if(![1,2,4].includes(controllers))fail('INVALID_CONTROLLERS');
    const system=station.data.systemId?await this.core.store.getSystemById(station.data.systemId):null;
    const rate=minor((system?.hourlyRate??station.data.hourlyRate)*(controllers===4?1.5:controllers===2?1.2:1),true)/100;
    const startsAt=new Date(current).toISOString(),endsAt=new Date(current+duration*60000).toISOString();
    await assertStationFree(this.core,station.data.systemId,startsAt,endsAt,booking?.id);
    const id=newId('SS'),data={stationId:station.id,systemId:station.data.systemId,username,customerName:user?.displayName||username||stringValue(b.customerName,100)||'مشتری آزاد',startedAt:startsAt,endsAt,hourlyRate:rate,controllers,durationMinutes:duration,status:'playing',pauses:[],segments:[{from:startsAt,rate}],reservationId:booking?.id||null,reservationOrderId:booking?.orderId||null,reservationEndsAt:booking?.endsAt||null,prepaidAmount:booking?.paidAmount||0,reservationPrice:booking?.totalAmount||0,startedBy:actor};
    const row=await this.core.save('session',id,data,0);
    if(booking){const meta=await this.core.read('booking',booking.id);await this.core.save('booking',booking.id,{...meta?.data,attendanceStatus:'playing',sessionId:id},meta?.version||0);await this.core.store.setReservationCheckedIn(booking.id);await onReservationAttended(this.core.store,booking.id,username);}
    return row;
  });}
  async action(actor:string,id:string,action:string,b:any){return this.core.command(actor,b.idempotencyKey,`session-${action}`,{id,...b},async()=>{
    const row=await this.core.read('session',id);if(!row||row.data.closedAt)fail('SESSION_CLOSED',409);const data={...row.data,pauses:[...(row.data.pauses||[])],segments:[...(row.data.segments||[])]};
    if(data.settlingAt&&action!=='resume')fail('SESSION_SETTLING',409);
    if(action==='pause'){if(data.status!=='playing')fail('BAD_STATE',409);data.status='paused';data.pauses.push({from:nowISO()});}
    else if(action==='resume'){if(data.settlingAt){data.pauses.push({from:data.settlingAt,to:nowISO()});delete data.settlingAt;delete data.quote;}
      else {if(data.status!=='paused')fail('BAD_STATE',409);const last=data.pauses.at(-1);if(last&&!last.to)last.to=nowISO();data.status='playing';}}
    else if(action==='extend'){const minutes=Number(b.minutes);if(!Number.isFinite(minutes)||minutes<1||minutes>480)fail('INVALID_DURATION');const end=new Date(Date.parse(data.endsAt)+minutes*60000).toISOString();await assertStationFree(this.core,data.systemId,data.endsAt,end,data.reservationId,id);data.endsAt=end;data.durationMinutes+=minutes;}
    else if(action==='move'){const target=await this.core.read('station',stringValue(b.stationId,100,true));if(!target||!target.data.active)fail('STATION_NOT_REGISTERED',409);
      if((await this.core.list('session')).some(s=>s.id!==id&&s.data.stationId===target.id&&!s.data.closedAt))fail('STATION_IN_USE',409);
      await assertStationFree(this.core,target.data.systemId,nowISO(),data.endsAt,data.reservationId,id);data.stationId=target.id;data.systemId=target.data.systemId;
      if(data.reservationId){const meta=await this.core.read('booking',data.reservationId);await this.core.save('booking',data.reservationId,{...meta?.data,assignedSystemId:target.data.systemId,assignedStationId:target.id},meta?.version||0);}
    }else if(action==='rate'){const rate=minor(b.hourlyRate,true)/100;data.segments[data.segments.length-1]={...data.segments.at(-1),to:nowISO()};data.segments.push({from:nowISO(),rate});data.hourlyRate=rate;}
    else fail('INVALID_ACTION');return this.core.save('session',id,data,row.version);
  });}
  async quoteData(data:any){
    let extra=0;const orders=[];for(const o of await this.core.store.listOnsiteOrders()){const p=JSON.parse(o.payload||'{}');if(p._ops?.sessionId&&p._ops.sessionId===data.id&&o.status==='pending_onsite'){extra+=o.amount;orders.push(o.id);}}
    const newGameCost=segmentCost(data),gameCost=Math.round((newGameCost+Number(data.reservationPrice||0))*100)/100;
    return {gameCost,newGameCost,prepaidAmount:data.prepaidAmount||0,orderCost:Math.round(extra*100)/100,orderIds:orders,amount:Math.round((newGameCost+extra)*100)/100,currency:'TRY'};
  }
  async quote(actor:string,id:string,b:any){return this.core.command(actor,b.idempotencyKey,'session-quote',{id,...b},async()=>{
    const row=await this.core.read('session',id);if(!row||row.data.closedAt)fail('SESSION_CLOSED',409);const data={...row.data,settlingAt:row.data.settlingAt||nowISO()};const quote=await this.quoteData({...data,id});return this.core.save('session',id,{...data,quote},row.version);
  });}
  async finish(actor:string,id:string,b:any){return this.core.command(actor,b.idempotencyKey,'session-finish',{id,...b},async()=>{
    const row=await this.core.read('session',id);if(!row||row.data.closedAt)fail('SESSION_CLOSED',409);if(!row.data.settlingAt||!row.data.quote)fail('QUOTE_REQUIRED');
    if(Number(b.version)!==row.version)fail('VERSION_CONFLICT',409);
    const current=await this.quoteData({...row.data,id});if(current.amount!==row.data.quote.amount||JSON.stringify(current.orderIds)!==JSON.stringify(row.data.quote.orderIds))fail('QUOTE_CHANGED',409);
    const receipt=await this.finance.receipt(actor,b,current.amount,row.data.username,'session_sale',undefined,id);
    // Linked orders are settled atomically using the same already-recorded collection.
    for(const orderId of current.orderIds){const o=await this.core.store.getOnsiteOrder(orderId);if(!o||o.status!=='pending_onsite')fail('QUOTE_CHANGED',409);const p=JSON.parse(o.payload),old=JSON.parse(o.result||'{}');const result={...old,...await this.finance.deps.fulfil(o.kind as any,{...p,__pointsOnly:!!old.orderId},o.username,{merchantOid:o.id,kind:o.kind,username:o.username}),method:b.method,receiptId:receipt?.id};await this.core.store.updateOnsiteOrder(o.id,{status:'settled',settledAt:nowISO(),settledBy:`${b.method}:${actor}`,payload:JSON.stringify({...p,_ops:{...p._ops,inventoryBooked:true}}),result:JSON.stringify(result),updatedAt:nowISO()});}
    const closedAt=row.data.settlingAt;const durationSeconds=billableSeconds(row.data);const invoice={id:newId('IV'),sessionId:id,stationId:row.data.stationId,username:row.data.username,customerName:row.data.customerName,startedAt:row.data.startedAt,closedAt,durationSeconds,...current,receipt,actor};
    await this.core.save('invoice',invoice.id,invoice,0);await this.core.save('session',id,{...row.data,closedAt,status:'completed',invoiceId:invoice.id,receiptId:receipt?.id},row.version);
    if(row.data.reservationId){const meta=await this.core.read('booking',row.data.reservationId);await this.core.save('booking',row.data.reservationId,{...meta?.data,attendanceStatus:'completed'},meta?.version||0);}
    if(row.data.username){const stats=await this.core.read('customer-stats',row.data.username);await this.core.save('customer-stats',row.data.username,{...stats?.data,totalSeconds:(stats?.data.totalSeconds||0)+durationSeconds},stats?.version||0);}
    return {invoice,receipt};
  });}
}
export function registerSessions(app:express.Express,service:SessionService){const {core}=service,base='/api/management';
  app.get(`${base}/floor`,core.guard('reservations'),endpoint(async(_req,res)=>{const sessions=[];for(const r of await core.list('session'))if(!r.data.closedAt)sessions.push({...r,data:{...r.data,elapsedSeconds:billableSeconds(r.data),quote:await service.quoteData({...r.data,id:r.id})}});res.setHeader('Cache-Control','no-store');res.json({stations:await core.list('station'),reservations:await bookingViews(core),sessions,timezone:await core.timezone(),serverTime:nowISO()});}));
  app.get(`${base}/reservations`,core.guard('reservations'),endpoint(async(_req,res)=>res.json(await bookingViews(core))));
  app.post(`${base}/reservations/:id/checkin`,core.guard('reservations'),endpoint(async(req,res)=>res.json(await core.command((req as any).staff.username,req.body?.idempotencyKey,'checkin',{id:req.params.id},async()=>{const booking=(await bookingViews(core)).find(r=>r.id===req.params.id);if(!booking)fail('NOT_FOUND',404);if(booking.bookingStatus!=='confirmed')fail('PAYMENT_REQUIRED',409);const old=await core.read('booking',booking.id);if(old?.data.attendanceStatus&&old.data.attendanceStatus!=='not_arrived')return old;await core.store.setReservationCheckedIn(booking.id);await onReservationAttended(core.store,booking.id,booking.username);return core.save('booking',booking.id,{...old?.data,attendanceStatus:'checked_in'},old?.version||0);}))));
  app.post(`${base}/sessions/start`,core.guard('reservations'),endpoint(async(req,res)=>res.json(await service.start((req as any).staff.username,req.body||{}))));
  app.post(`${base}/sessions/:id/quote`,core.guard('collect'),endpoint(async(req,res)=>res.json(await service.quote((req as any).staff.username,String(req.params.id),req.body||{}))));
  app.post(`${base}/sessions/:id/finish`,core.guard('collect'),endpoint(async(req,res)=>res.json(await service.finish((req as any).staff.username,String(req.params.id),req.body||{}))));
  app.post(`${base}/sessions/:id/:action`,core.guard('reservations'),endpoint(async(req,res)=>{if(req.params.action==='rate'&&!(req as any).staff.permissions.includes('configure'))fail('FORBIDDEN',403);res.json(await service.action((req as any).staff.username,String(req.params.id),String(req.params.action),req.body||{}));}));
}
