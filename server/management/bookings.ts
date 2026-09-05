import type { BookingView } from '../../shared/management/types';
import { OpsCore, parseJSON, fail, nowISO } from './core';
import { bookingWindow, overlaps } from './time';

export async function bookingViews(core:OpsCore):Promise<BookingView[]> {
  const logs=await core.store.listReservationLogs(),orders=await core.store.listOnsiteOrders({kind:'reservation'}),stations=await core.list('station'),metadata=await core.list('booking'),users=await core.store.listUsers(),zone=await core.timezone();
  const result:BookingView[]=[];const seen=new Set<string>();
  function make(r:any,o?:any){
    const p=parseJSON(o?.payload),payment=parseJSON(o?.result),meta=metadata.find(m=>m.id===r.id),extra=meta?.data||{};
    let window:any={startsAt:null,endsAt:null};try{window=bookingWindow(p.startsAt?p:r,Date.parse(o?.createdAt||r.timestamp)||Date.now(),zone);}catch{}
    const cancelled=o?.status?.startsWith('cancelled')||extra.cancelledAt,expired=o?.status==='cancelled_unpaid'||(o?.status==='pending_onsite'&&!!o.dueAt&&Date.parse(o.dueAt)<=Date.now());
    const paid=o?.status==='settled';const systemId=extra.assignedSystemId||r.systemId||p.systemId;
    const view:BookingView={id:r.id,orderId:o?.id||null,systemId,stationId:extra.assignedStationId||stations.find(s=>s.data.systemId===systemId)?.id||null,systemName:r.systemName||p.systemName||systemId,
      username:r.username||o?.username||'',customerName:users.find(u=>u.username===(r.username||o?.username))?.displayName||r.username||o?.username||'—',
      startsAt:window.startsAt,endsAt:window.endsAt,totalAmount:Number(o?.amount??r.totalPrice??0),paidAmount:paid?Number(o.amount):0,currency:'TRY',
      paymentStatus:paid?(Number(o.amount)===0?'free':'paid'):cancelled&&o?.settledBy==='wallet'?'refunded':o?'pending':'unknown',
      bookingStatus:expired?'expired':cancelled?'cancelled':extra.attendanceStatus==='completed'?'completed':paid?'confirmed':o?'held':'unknown',
      attendanceStatus:extra.attendanceStatus||(r.checkedIn?'checked_in':'not_arrived'),paymentMethod:payment.method||(o?.settledBy==='wallet'?'wallet':null),paymentDueAt:o?.dueAt||'',source:p._ops?.source||'online',version:meta?.version||0,sessionId:extra.sessionId};
    result.push(view);seen.add(r.id);
  }
  for(const r of logs){const o=orders.find(o=>parseJSON(o.result).reservationId===r.id);make(r,o);}
  // Cancelled orders retain their identity/history even if old code deleted the log.
  for(const o of orders){const p=parseJSON(o.payload),id=parseJSON(o.result).reservationId;if(id&&!seen.has(id))make({id,systemId:p.systemId,systemName:p.systemName,username:o.username,startTime:p.startTime,endTime:p.endTime,date:p.date,timestamp:o.createdAt},o);}
  return result.sort((a,b)=>(a.startsAt||'').localeCompare(b.startsAt||''));
}
export async function assertStationFree(core:OpsCore,systemId:string|null,start:string,end:string,ignoreBooking?:string,ignoreSession?:string,ignoreMatch?:string) {
  if(!systemId)return;
  const reservations=await bookingViews(core);
  if(reservations.some(r=>r.systemId===systemId&&r.id!==ignoreBooking&&r.startsAt&&r.endsAt&&!['cancelled','expired','completed'].includes(r.bookingStatus)&&!(r.bookingStatus==='held'&&r.paymentDueAt&&Date.parse(r.paymentDueAt)<=Date.now())&&overlaps(start,end,r.startsAt,r.endsAt)))fail('SLOT_TAKEN',409);
  const slots=await core.list('match-slot');if(slots.some(r=>r.id!==ignoreMatch&&r.data.systemId===systemId&&r.data.status!=='cancelled'&&overlaps(start,end,r.data.startsAt,r.data.endsAt)))fail('SLOT_TAKEN',409);
  const sessions=await core.list('session');if(sessions.some(r=>r.id!==ignoreSession&&!r.data.closedAt&&r.data.systemId===systemId&&overlaps(start,end,r.data.startedAt,r.data.endsAt)))fail('SLOT_TAKEN',409);
}
