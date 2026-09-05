import assert from 'node:assert/strict';
import { test, suite, run } from './harness.mts';
import { SqliteStore } from '../server/dataProviders';
import { FinanceService } from '../server/management/finance';
import { OpsCore } from '../server/management/core';
import { bookingWindow, dayAt, localInstant } from '../server/management/time';

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
await run({title:'Management operational core',jsonOut:'tests/reports/management.json'});
