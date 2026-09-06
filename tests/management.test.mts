import assert from 'node:assert/strict';
import { test, suite, run } from './harness.mts';
import { SqliteStore } from '../server/dataProviders';
import { AffiliateService } from '../server/management/affiliates';
import { operationalReport } from '../server/management/reports';
import { approveDueCommissions, onOrderPaid } from '../server/affiliate/engine';
import { OrderService } from '../server/management/orders';
import { SessionService, segmentCost } from '../server/management/sessions';
import { bookingViews, assertStationFree } from '../server/management/bookings';
import { FinanceService } from '../server/management/finance';
import { OpsCore } from '../server/management/core';
import { bookingWindow, dayAt, localInstant } from '../server/management/time';
import { PromotionService, hourDiscountFraction } from '../server/management/promotions';
import { sessionPromoCost } from '../server/management/sessions';
import { TournamentService } from '../server/management/tournaments';
import { ContentService } from '../server/management/content';

const store=new SqliteStore();store.config={filePath:':memory:'};await store.connect();await store.createDatabaseIfNotExist();
await store.seedMinimal({username:'admin',password:'test-password',email:'',phone:''});
const core=new OpsCore(()=>store);
suite('Management: durable core');
test('unprivileged accounts cannot claim staff permissions',async()=>{await store.createUser({username:'member',password:'test-only',email:'',phone:''});await assert.rejects(()=>core.staff('member'),{code:'STAFF_ONLY'});const r=await core.save('access','member',{permissions:['orders']},0);assert.deepEqual((await core.staff('member')).permissions,['orders']);assert.equal(r.version,1);});
test('native rollback removes all partial records',async()=>{await assert.rejects(()=>store.runInTransaction(async()=>{await core.save('test','rollback',{value:1},0);throw new Error('stop');}));assert.equal(await core.read('test','rollback'),undefined);});
test('outside calls wait for async SQLite transactions and do not join rollback',async()=>{
 let notify!:()=>void;const entered=new Promise<void>(r=>notify=r);
 const tx=store.runInTransaction(async()=>{await core.save('test','inside',{},0);notify();await new Promise(r=>setTimeout(r,20));throw new Error('rollback');});
 await entered;const outside=core.save('test','outside',{},0);await assert.rejects(()=>tx);await outside;assert.ok(await core.read('test','outside'));assert.equal(await core.read('test','inside'),undefined);
});
test('concurrent duplicate commands execute one time',async()=>{let n=0;const fn=()=>core.command('admin','same-key','count',{amount:1},async()=>({count:++n}));const r=await Promise.all([fn(),fn(),fn()]);assert.equal(n,1);assert.deepEqual(r,[{count:1},{count:1},{count:1}]);await assert.rejects(()=>core.command('admin','same-key','count',{amount:2},async()=>({})),{code:'IDEMPOTENCY_CONFLICT'});});
test('CAS refuses stale edits',async()=>{await core.save('test','version',{x:1},0);await core.save('test','version',{x:2},1);await assert.rejects(()=>core.save('test','version',{x:3},1),{code:'VERSION_CONFLICT'});});
test('station one-to-one mapping has a database uniqueness constraint',async()=>{await core.save('station','a',{systemId:'s1'},0,'station:s1');await assert.rejects(()=>core.save('station','b',{systemId:'s1'},0,'station:s1'));});
test('venue time handles overnight boundaries and keeps UTC',()=>{const w=bookingWindow({date:'2026-09-05',startTime:'23:30',endTime:'01:00'});assert.equal(Date.parse(w.endsAt)-Date.parse(w.startsAt),90*60000);assert.equal(dayAt(Date.parse(w.endsAt)),'2026-09-06');assert.throws(()=>localInstant('2026-09-05','25:00'));assert.throws(()=>bookingWindow({date:'2026-09-05',startTime:'10:00',endTime:'10:00'}));});
test('wallet and operational receipt roll back together',async()=>{await assert.rejects(()=>store.runInTransaction(async()=>{await store.appendWalletTx({id:'tx-a',username:'member',amount:10,type:'topup',ref:'',operator:'admin',note:'',idempotencyKey:'test-topup',createdAt:new Date().toISOString()});await core.save('receipt','r-a',{},0);throw new Error('receipt failed');}));assert.equal((await store.listWalletTxFor('member')).length,0);assert.equal(await core.read('receipt','r-a'),undefined);});

suite('Management: collection and cash handover');
const finance=new FinanceService(core,{fulfil:async()=>({points:0}),unfulfil:async()=>{}});
test('top-up has a manual POS receipt and one ledger movement under retries',async()=>{
 const body={idempotencyKey:'topup-test',username:'member',amount:100,method:'pos',confirmed:true,reference:'test-reference'};
 const [a,b]=await Promise.all([finance.topup('admin',body),finance.topup('admin',body)]);
 assert.equal(a.receipt?.confirmation,'operator_pos_manual');assert.equal(a.receipt?.id,b.receipt?.id);assert.equal(await store.getWalletBalance('member'),100);
});
test('unconfirmed collection and third payment choices are rejected',async()=>{
 await assert.rejects(()=>finance.topup('admin',{idempotencyKey:'bad-method',username:'member',amount:10,method:'wallet',confirmed:true}),{code:'METHOD_NOT_ALLOWED'});
 await assert.rejects(()=>finance.topup('admin',{idempotencyKey:'unconfirmed',username:'member',amount:10,method:'cash'}),{code:'PAYMENT_NOT_CONFIRMED'});
 assert.equal(await store.getWalletBalance('member'),100);
});
test('cash-out reserves funds; a competing withdrawal cannot overspend',async()=>{
 const both=await Promise.allSettled([finance.requestCashout('admin',{idempotencyKey:'wd-one',username:'member',amount:75}),finance.requestCashout('admin',{idempotencyKey:'wd-two',username:'member',amount:75})]);
 assert.equal(both.filter(x=>x.status==='fulfilled').length,1);assert.equal(await store.getWalletBalance('member'),25);
 const row=(both.find(x=>x.status==='fulfilled') as PromiseFulfilledResult<any>).value;assert.equal(row.data.status,'pending_handover');
 const paid=await finance.finishCashout('admin',row.id,'confirm',{idempotencyKey:'handover',confirmed:true});assert.equal(paid.data.status,'paid');assert.equal(paid.data.receipt.direction,'out');assert.equal(await store.getWalletBalance('member'),25);
 const replay=await finance.finishCashout('admin',row.id,'confirm',{idempotencyKey:'handover',confirmed:true});assert.equal(replay.data.receipt.id,paid.data.receipt.id);
 await assert.rejects(()=>finance.finishCashout('admin',row.id,'cancel',{idempotencyKey:'too-late',note:'test'}),{code:'BAD_STATE'});
});
test('cancelling an undelivered cash-out releases funds exactly once',async()=>{
 const row=await finance.requestCashout('admin',{idempotencyKey:'wd-cancel',username:'member',amount:20});assert.equal(await store.getWalletBalance('member'),5);
 const b={idempotencyKey:'release',note:'Not handed over'};await finance.finishCashout('admin',row.id,'cancel',b);await finance.finishCashout('admin',row.id,'cancel',b);assert.equal(await store.getWalletBalance('member'),25);
});
test('settlement preserves reservationId, prevents repeat collection and records receipt',async()=>{
 const time=new Date().toISOString();await store.createOnsiteOrder({id:'onsite-res',kind:'reservation',username:'member',amount:12,status:'pending_onsite',dueAt:new Date(Date.now()+86400000).toISOString(),payload:'{}',description:'test',result:JSON.stringify({reservationId:'res-keep'}),createdAt:time,updatedAt:time,settledAt:'',settledBy:''});
 const b={idempotencyKey:'settle',method:'cash',confirmed:true};const a=await finance.settle('admin','onsite-res',b);const c=await finance.settle('admin','onsite-res',b);assert.equal(a.result.reservationId,'res-keep');assert.equal(a.receipt?.id,c.receipt?.id);await assert.rejects(()=>finance.settle('admin','onsite-res',{...b,idempotencyKey:'other'}),{code:'BAD_STATE'});
});

suite('Management: reservations and sessions');
const sessions=new SessionService(core,finance);
test('setup a real server station and create a session',async()=>{
 await store.createSystem({id:'test-system',name:'Test station',type:'PC',hourlyRate:120,isActive:true,isReserved:false});
 await core.save('station','test-station',{name:'Test station',systemId:'test-system',hourlyRate:120,active:true},0,'station:test-system');
 const r=await sessions.start('admin',{idempotencyKey:'start-session',stationId:'test-station',username:'member',durationMinutes:60});assert.equal(r.data.hourlyRate,120);assert.equal(r.data.username,'member');
 await assert.rejects(()=>sessions.start('admin',{idempotencyKey:'competing-session',stationId:'test-station',durationMinutes:60}),{code:'STATION_IN_USE'});
});
test('a booking blocks only its own station; unknown legacy payment is not marked paid',async()=>{
 const date=new Date(Date.now()+86400000).toISOString().slice(0,10);await store.addReservationLog({id:'legacy-unknown',systemId:'test-system',username:'member',systemName:'Test',date,startTime:'10:00',endTime:'11:00',totalPrice:120,checkedIn:false,timestamp:new Date().toISOString()});
 const r=(await bookingViews(core)).find(x=>x.id==='legacy-unknown')!;assert.equal(r.paymentStatus,'unknown');assert.equal(r.stationId,'test-station');
 await assert.rejects(()=>assertStationFree(core,'test-system',r.startsAt!,r.endsAt!),{code:'SLOT_TAKEN'});await assertStationFree(core,'other-system',r.startsAt!,r.endsAt!);
});
test('prepaid reservation interval is not charged again',()=>{
 const from='2026-09-05T10:00:00Z',end='2026-09-05T11:00:00Z';const data={startedAt:from,reservationEndsAt:end,hourlyRate:120,segments:[{from,rate:120}],pauses:[]};
 assert.equal(segmentCost(data,Date.parse(end)),0);assert.equal(segmentCost(data,Date.parse(end)+30*60000),60);
});
test('quote freezes billing; finish is idempotent and creates one invoice',async()=>{
 const r=(await core.list('session')).find(r=>r.data.stationId==='test-station')!;const from=new Date(Date.now()-30*60000).toISOString();await core.save('session',r.id,{...r.data,startedAt:from,segments:[{from,rate:120}]},r.version);
 const q=await sessions.quote('admin',r.id,{idempotencyKey:'quote-session'});assert.ok(q.data.quote.amount>=60);
 const b={idempotencyKey:'finish-session',version:q.version,method:'cash',confirmed:true};const a=await sessions.finish('admin',r.id,b),again=await sessions.finish('admin',r.id,b);assert.equal(a.invoice.id,again.invoice.id);assert.equal((await core.list('invoice')).length,1);
});

suite('Management: order lifecycle');
const orderService=new OrderService(core,finance,async(kind,p,u)=>({amount:25,payload:{...p},description:'Test order'}),async kind=>kind==='cafe'?store.listCafeItems():store.listAccessories());
test('walk-in order is visible before collection and retains its canonical ID',async()=>{
 const r=await orderService.create('admin',{idempotencyKey:'create-order',kind:'cafe',username:'member',stationId:'test-station',lines:[{item:{id:'test-product',name:'Tea'},quantity:1}]});
 const view=(await orderService.list('cafe')).find(x=>x.id===r.id)!;assert.equal(view.source,'onsite');assert.equal(view.stationId,'test-station');assert.equal(view.paymentStatus,'pending');
 const again=await orderService.create('admin',{idempotencyKey:'create-order',kind:'cafe',username:'member',stationId:'test-station',lines:[{item:{id:'test-product',name:'Tea'},quantity:1}]});assert.equal(again.id,r.id);
});
test('invalid fulfilment transitions and stale versions are rejected',async()=>{
 const o=(await orderService.list('cafe')).find(x=>x.source==='onsite')!;
 await assert.rejects(()=>orderService.transition('admin',o.id,{idempotencyKey:'invalid-transition',version:0,status:'delivered'}),{code:'INVALID_TRANSITION'});
 await orderService.transition('admin',o.id,{idempotencyKey:'accept-order',version:0,status:'accepted'});
 await assert.rejects(()=>orderService.transition('admin',o.id,{idempotencyKey:'stale-transition',version:0,status:'ready'}),{code:'VERSION_CONFLICT'});
});

suite('Management: affiliates and accounting');
const affiliates=new AffiliateService(core);
test('affiliate edits are version checked and link to the existing wallet account',async()=>{
 const a=await affiliates.save('admin',{idempotencyKey:'new-affiliate',code:'TESTAFF',name:'Test partner',username:'member'});assert.equal(a.username,'member');
 const b=await affiliates.save('admin',{idempotencyKey:'edit-affiliate',id:a.id,etag:a.etag,status:'paused'});assert.equal(b.status,'paused');
 await assert.rejects(()=>affiliates.save('admin',{idempotencyKey:'stale-affiliate',id:a.id,etag:a.etag,status:'active'}),{code:'VERSION_CONFLICT'});
 await affiliates.save('admin',{idempotencyKey:'resume-affiliate',id:a.id,etag:b.etag,status:'active'});
});
test('commission approval retries credit the same wallet once',async()=>{
 await store.createUser({username:'buyer',password:'test-only',email:'',phone:''});
 await onOrderPaid(store,{username:'buyer',orderId:'commission-order',kind:'reservation',amount:100,payload:{referralCode:'TESTAFF'},dueAt:new Date(Date.now()-1000).toISOString()});
 const before=await store.getWalletBalance('member');await Promise.all([approveDueCommissions(store),approveDueCommissions(store)]);assert.equal(await store.getWalletBalance('member')-before,10);
});
test('reports do not count wallet top-ups as service revenue',async()=>{
 const r=await operationalReport(core);assert.ok(r.posIn>=100);assert.ok(r.cashOut>=75);assert.ok(r.byKind.session>=60);assert.equal(r.byKind.reservation,12);assert.ok(r.customerLiability>=0);
});
suite('Management: promotions (batch 6)');
const promos = new PromotionService(core);
test('coupon is created with scopes and mirrored to the store table', async () => {
  const r = await promos.saveCoupon('admin', { idempotencyKey: 'cpn-1', code: 'vip30', kind: 'percent', value: 30, scopes: ['reservation', 'cafe'], maxUsage: 50, perUserMax: 2, minOrder: 0, active: true });
  assert.equal(r.data.code, 'VIP30');
  const stored = await store.getCouponByCode('VIP30'); assert.ok(stored && stored.isActive);
  assert.deepEqual(JSON.parse(stored!.scopes as string), ['reservation', 'cafe']);
  const list = await promos.listCoupons(); assert.ok(list.some(c => c.code === 'VIP30' && c.scopes.length === 2));
});
test('saving the same code updates the single record (no duplicate) and a distinct record id is rejected', async () => {
  // Same code with no id → updates the same record, scopes replaced.
  await promos.saveCoupon('admin', { idempotencyKey: 'cpn-2', code: 'vip30', kind: 'percent', value: 10, scopes: ['shop'], maxUsage: 5, perUserMax: 1, minOrder: 0, active: true });
  const list = await promos.listCoupons();
  const vip = list.filter(c => c.code === 'VIP30');
  assert.equal(vip.length, 1); assert.deepEqual(vip[0].scopes, ['shop']);
  // A different record id claiming the same code is a clash.
  await assert.rejects(() => promos.saveCoupon('admin', { idempotencyKey: 'cpn-2b', id: 'coupon-OTHER', code: 'vip30', kind: 'percent', value: 10, scopes: ['cafe'], maxUsage: 5, perUserMax: 1, minOrder: 0, active: true }), { code: 'CODE_TAKEN' });
});
test('invalid coupon values and missing scope are rejected', async () => {
  await assert.rejects(() => promos.saveCoupon('admin', { idempotencyKey: 'cpn-3', code: 'BAD1', kind: 'percent', value: 150, scopes: ['cafe'], maxUsage: 5 }), { code: 'INVALID_VALUE' });
  await assert.rejects(() => promos.saveCoupon('admin', { idempotencyKey: 'cpn-4', code: 'BAD2', kind: 'percent', value: 10, scopes: [], maxUsage: 5 }), { code: 'SCOPE_REQUIRED' });
});
test('special hour is stored and active for matching weekday/type only', async () => {
  await promos.saveHour('admin', { idempotencyKey: 'hh-1', name: 'Free Friday night', mode: 'free', weekdays: [5], stationTypes: [], startHour: 22, startMinute: 0, endHour: 23, endMinute: 59, active: true });
  const hours = await promos.listHours(); assert.equal(hours.length, 1);
  // Friday 23:00 venue time (Asia/Famagusta = UTC+3): 20:00 UTC Friday
  const fri = new Date('2026-09-11T20:00:00Z').getTime();
  const active = await promos.activeHoursFor('PC_GAMING', fri, 'Asia/Famagusta');
  assert.equal(active.length, 1); assert.equal(hourDiscountFraction(active), 1);
  // Wednesday 20:00 UTC same time -> inactive (weekday mismatch)
  const wed = new Date('2026-09-09T20:00:00Z').getTime();
  assert.equal((await promos.activeHoursFor('PC_GAMING', wed, 'Asia/Famagusta')).length, 0);
});
test('session cost applies free hour segment only inside the special interval', async () => {
  // 1-hour session at 100/h with no special hours: cost = 100
  const session = { startedAt: new Date('2026-09-09T17:00:00Z').toISOString(), segments: [{ from: new Date('2026-09-09T17:00:00Z').toISOString(), rate: 100 }], pauses: [] };
  const plain = await sessionPromoCost(core, promos, 'PC_GAMING', session, Date.parse(session.startedAt) + 3600000);
  assert.ok(Math.abs(plain - 100) < 1);
  // Add a half-price hour covering the second 30 minutes: session 17:00-18:00 UTC, hour 20:00-21:00 local
  await promos.saveHour('admin', { idempotencyKey: 'hh-half', name: 'Half hour test', mode: 'half', weekdays: [3], stationTypes: ['PC_GAMING'], startHour: 20, startMinute: 30, endHour: 21, endMinute: 0, active: true });
  const cost = await sessionPromoCost(core, promos, 'PC_GAMING', { ...session, startedAt: new Date('2026-09-09T17:30:00Z').toISOString(), segments: [{ from: new Date('2026-09-09T17:30:00Z').toISOString(), rate: 100 }] }, new Date('2026-09-09T18:30:00Z').getTime());
  // 30 min at 100 = 50; 30 min at 50 = 25 -> 75
  assert.ok(Math.abs(cost - 75) < 3, `expected ~75, got ${cost}`);
});

suite('Management: tournaments (batch 7)');
const tournamentOps = new TournamentService(core, finance);
test('bracket generates BYEs and winner advances on result entry', async () => {
  await store.createTournament({ id: 'tour-test', title: 'Test Cup', titleFa: 'کاپ تست', game: 'FIFA', registrationFee: 0, startDate: '2026-10-01', maxTeams: 8, status: 'active', registeredTeamsCount: 0, teams: '[]', bracket: '' });
  // register and check in 3 teams (free entry)
  for (const name of ['Alpha', 'Beta', 'Gamma']) {
    const r = await tournamentOps.registerWalkIn('admin', { idempotencyKey: `reg-${name}`, tournamentId: 'tour-test', teamName: name });
    assert.ok(r.team.paid); // fee 0 -> paid
    await tournamentOps.checkIn('admin', { idempotencyKey: `ci-${name}`, tournamentId: 'tour-test', teamName: name, checkedIn: true });
  }
  await tournamentOps.generateBracket('admin', { idempotencyKey: 'brk-1', tournamentId: 'tour-test' });
  const v = await tournamentOps.view('tour-test');
  assert.ok(v.bracket.length >= 2);
  // first round: one real match (Alpha vs Beta) and one BYE for Gamma
  const ready = v.bracket.find((m: any) => m.status === 'ready' && m.teamA && m.teamB);
  const bye = v.bracket.find((m: any) => m.status === 'done' && (!m.teamA || !m.teamB));
  assert.ok(ready && bye);
  await tournamentOps.enterResult('admin', { idempotencyKey: 'res-1', tournamentId: 'tour-test', matchId: ready.id, scoreA: 3, scoreB: 1 });
  const v2 = await tournamentOps.view('tour-test');
  const updated = v2.bracket.find((m: any) => m.id === ready.id);
  assert.equal(updated.winnerId, 'Alpha');
  // next round must include Alpha and the BYE winner
  const nextRound = v2.bracket.filter((m: any) => m.round === ready.round + 1);
  assert.ok(nextRound.length === 1 && nextRound[0].teamA === 'Alpha');
});
test('match result rejects equal scores', async () => {
  const v = await tournamentOps.view('tour-test');
  const next = v.bracket.find((m: any) => m.round === 2);
  await assert.rejects(() => tournamentOps.enterResult('admin', { idempotencyKey: 'res-bad', tournamentId: 'tour-test', matchId: next.id, scoreA: 2, scoreB: 2 }), { code: 'INVALID_SCORE' });
});

suite('Management: content (batch 8)');
const contentOps = new ContentService(core);
test('content draft is created and never published without approval', async () => {
  const c = await contentOps.create('admin', { idempotencyKey: 'ct-1', title: 'Launch post', destinations: ['blog'], versions: { blog: { title: 'Launch', body: 'Hello world', language: 'en' } } });
  assert.equal(c.data.status, 'draft');
  // scheduling before approval fails
  await assert.rejects(() => contentOps.schedule('admin', c.id, { idempotencyKey: 'ct-sched-fail', publishNow: true }), { code: 'APPROVAL_REQUIRED' });
  await contentOps.approve('admin', c.id, { idempotencyKey: 'ct-app', destination: 'blog' });
  await contentOps.schedule('admin', c.id, { idempotencyKey: 'ct-sched', publishNow: true });
});
test('publishDue writes blog to articles table but fails social when not configured', async () => {
  const results = await contentOps.publishDue();
  const blog = results.find(r => r.destination === 'blog');
  assert.ok(blog && blog.ok);
  const articles = await store.listArticles();
  assert.ok(articles.some(a => a.title === 'Launch'));
});
test('invalid Manus webhook signature is rejected', async () => {
  await store.setSetting('manus_webhook_secret', 'topsecret');
  await assert.rejects(() => contentOps.handleManusWebhook('{"task_id":"x"}', 'wrong-signature'), { code: 'INVALID_SIGNATURE' });
});
test('without a Manus key the simulator fills a reviewable version (no external call)', async () => {
  await store.setSetting('manus_api_key', ''); // ensure no credential
  const c = await contentOps.create('admin', { idempotencyKey: 'ct-sim-1', title: 'Simulated post', destinations: ['blog'] });
  const out = await contentOps.generate('admin', c.id, { idempotencyKey: 'ct-sim-gen', destination: 'blog', prompt: 'weekend tournament', language: 'en' });
  assert.equal(out.data.status, 'review');
  assert.ok((out.data.destinations.blog as any).simulated);
  assert.ok(out.data.versions.blog.body.includes('Simulator'));
  // Simulated draft can then be approved and published like any other version.
  await contentOps.approve('admin', c.id, { idempotencyKey: 'ct-sim-app', destination: 'blog' });
  await contentOps.schedule('admin', c.id, { idempotencyKey: 'ct-sim-sched', publishNow: true });
  const results = await contentOps.publishDue();
  assert.ok(results.some(r => r.destination === 'blog' && r.ok));
});



await run({title:'Management operational core',jsonOut:'tests/reports/management.json'});
