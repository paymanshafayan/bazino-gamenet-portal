import assert from 'node:assert/strict';
import { test, suite, run } from './harness.mts';
import { SqliteStore } from '../server/dataProviders';
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
await run({title:'Management operational core',jsonOut:'tests/reports/management.json'});
