import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { StaffIdentity, OpsPermission } from './types';
import './styles.css';
export type Language = 'fa'|'en'|'tr'|'ru';
export type Translate=(fa:string,en:string,tr?:string,ru?:string)=>string;
export const requestKey=()=>globalThis.crypto?.randomUUID?.()||`req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const TOKEN='bazino.authToken';
const pendingKey='bazino.ops.pending';
const storage={get:(k:string)=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k:string,v:string)=>{try{localStorage.setItem(k,v);}catch{}},remove:(k:string)=>{try{localStorage.removeItem(k);}catch{}}};
export class OpsError extends Error {constructor(public code:string,public status=0,public uncertain=false){super(code);}}
export async function opsRequest(path:string,method='GET',body?:any):Promise<any> {
  const headers:Record<string,string>={'Content-Type':'application/json'};const token=storage.get(TOKEN);if(token)headers.Authorization=`Bearer ${token}`;
  let payload=body,signature='',pending:any={};
  if(method!=='GET'&&path!=='/login'){
    signature=JSON.stringify({path,method,body});try{pending=JSON.parse(storage.get(pendingKey)||'{}');}catch{}
    const key=body?.idempotencyKey||pending[signature]||requestKey();payload={...body,idempotencyKey:key};pending[signature]=key;storage.set(pendingKey,JSON.stringify(pending));
  }
  let response:Response;try{response=await fetch(`/api/management${path}`,{method,headers,body:payload===undefined?undefined:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});}catch{throw new OpsError('CONNECTION_LOST',0,method!=='GET');}
  const result=await response.json().catch(()=>null);
  if(signature&&(response.ok||(response.status>=400&&response.status<500))){delete pending[signature];storage.set(pendingKey,JSON.stringify(pending));}
  if(!response.ok)throw new OpsError(result?.error||'OPERATION_FAILED',response.status,response.status>=500&&method!=='GET');
  if(method!=='GET')window.dispatchEvent(new Event('bazino:ops-change'));
  return result;
}
interface OpsContextValue {staff:StaffIdentity|null;api:typeof opsRequest;refresh:()=>Promise<void>;logout:()=>void;can:(p:OpsPermission)=>boolean;t:Translate;language:Language;timezone:string;}
const Context=createContext<OpsContextValue|null>(null);
export function OpsProvider({children,language='fa',gate=false}:{children:React.ReactNode;language?:Language;gate?:boolean}){
  const [staff,setStaff]=useState<StaffIdentity|null>(null),[ready,setReady]=useState(false),[timezone,setTimezone]=useState('Asia/Famagusta');
  const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const t:Translate=(fa,en,tr,ru)=>language==='fa'?fa:language==='tr'?(tr||en):language==='ru'?(ru||en):en;
  const refresh=useCallback(async()=>{try{const r=await opsRequest('/me');setStaff(r.staff);setTimezone(r.timezone);setError('');}catch(e:any){if(e.status===401||e.status===403)setStaff(null);setError(e.code||'CONNECTION_LOST');}finally{setReady(true);}},[]);
  useEffect(()=>{void refresh();const onStorage=()=>void refresh();window.addEventListener('storage',onStorage);return()=>window.removeEventListener('storage',onStorage);},[refresh]);
  const logout=()=>{storage.remove(TOKEN);setStaff(null);window.dispatchEvent(new Event('storage'));};
  const value={staff,api:opsRequest,refresh,logout,can:(p:OpsPermission)=>!!staff?.permissions.includes(p),t,language,timezone};
  return <Context.Provider value={value}>{gate&&!staff?<div className="ops ops-login" dir="rtl"><form className="ops-card ops-login-card" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const r=await opsRequest('/login','POST',{username,password});storage.set(TOKEN,r.token);setPassword('');await refresh();}catch(e:any){setError(e.code);}finally{setBusy(false);}}}>
    <div className="ops-eyebrow">BAZINO / OPERATIONS</div><h1>ورود به مدیریت مجموعه</h1><p className="ops-muted">حساب مدیر سایت یا اپراتور دارای دسترسی را وارد کنید. انتخاب نام اپراتور به‌تنهایی مجوز مالی نیست.</p>
    {!ready?<p>در حال بررسی نشست…</p>:<><label>نام کاربری<input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required data-ops-login-user /></label><label>رمز عبور<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required data-ops-login-password /></label><button className="ops-primary" disabled={busy}>{busy?'در حال ورود…':'ورود امن'}</button></>}
    {error&&<Notice error={error==='AUTH_REQUIRED'?'':error} />}
    <a href="/">بازگشت به سایت</a><p className="ops-muted ops-small">پرداخت حضوری: نقدی یا ثبت دستی POS · اتصال خودکار کارتخوان فعال نیست.</p>
  </form></div>:children}</Context.Provider>;
}
export function useOps(){const c=useContext(Context);if(!c)throw new Error('OpsProvider missing');return c;}
export function useResource<T=any>(path:string|null,interval=5000){
  const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[lastSync,setLastSync]=useState('');
  const load=useCallback(async()=>{if(!path)return;setLoading(true);try{setData(await opsRequest(path));setLastSync(new Date().toISOString());setError('');}catch(e:any){setError(e.code||'CONNECTION_LOST');}finally{setLoading(false);}},[path]);
  useEffect(()=>{void load();const update=()=>void load();window.addEventListener('bazino:ops-change',update);const timer=interval?setInterval(()=>{if(document.visibilityState!=='hidden')void load();},interval):undefined;return()=>{if(timer)clearInterval(timer);window.removeEventListener('bazino:ops-change',update);};},[load,interval]);
  return {data,error,loading,lastSync,reload:load};
}
const errors:Record<string,string>={AUTH_REQUIRED:'ورود لازم است.',STAFF_ONLY:'این حساب دسترسی مدیریت ندارد.',INVALID_CREDENTIALS:'نام کاربری یا رمز درست نیست.',FORBIDDEN:'اجازهٔ انجام این عملیات را ندارید.',ADMIN_ONLY:'فقط مدیر اصلی مجاز است.',CONNECTION_LOST:'ارتباط برقرار نشد. برای عملیات مالی نتیجه را بررسی کنید؛ تلاش مجدد با همان شناسه انجام می‌شود.',VERSION_CONFLICT:'اطلاعات تغییر کرده است؛ تازه‌سازی کنید و دوباره تصمیم بگیرید.',IDEMPOTENCY_CONFLICT:'شناسهٔ درخواست قبلاً برای اطلاعات دیگری استفاده شده است.',INSUFFICIENT_FUNDS:'موجودی قابل برداشت کافی نیست.',INVALID_AMOUNT:'مبلغ نامعتبر است.',METHOD_NOT_ALLOWED:'دریافت حضوری فقط نقدی یا POS است.',SLOT_TAKEN:'این بازه با رزرو یا مسابقهٔ دیگری تداخل دارد.',STATION_IN_USE:'ایستگاه در حال استفاده است.',PAYMENT_REQUIRED:'ابتدا پرداخت این رزرو را ثبت کنید.',PAYMENT_NOT_CONFIRMED:'دریافت وجه باید صریحاً تأیید شود.',TRANSACTIONS_REQUIRED:'دیتابیس برای عملیات مالی اتمیک آماده نیست؛ MongoDB به replica set نیاز دارد.',INTEGRATION_NOT_CONFIGURED:'اتصال سرویس تنظیم نشده است؛ هیچ انتشار یا درخواست خارجی انجام نشد.',OPERATION_FAILED:'عملیات تکمیل نشد؛ قبل از تکرار نتیجه را بررسی کنید.'};
export function Notice({error,success}:{error?:string;success?:string}){const {language,t}=useOps();return <>{error&&<div role="alert" className="ops-notice ops-error">{language==='fa'?(errors[error]||error):error}</div>}{success&&<div role="status" className="ops-notice ops-success">{success}</div>}</>;}
export function Screen({title,subtitle,actions,children}:{title:string;subtitle?:string;actions?:React.ReactNode;children:React.ReactNode}){const {language}=useOps();return <section className="ops ops-screen" dir={language==='fa'?'rtl':'ltr'}><header className="ops-heading"><div><div className="ops-eyebrow">BAZINO / OPERATIONS</div><h2>{title}</h2>{subtitle&&<p className="ops-muted">{subtitle}</p>}</div><div className="ops-actions">{actions}</div></header>{children}</section>;}
export function Money({amount}:{amount:number}){const {language}=useOps();return <b className="ops-money">{new Intl.NumberFormat(language==='fa'?'fa-IR':'en-GB',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(amount||0)}</b>;}
export function Badge({children,tone='neutral'}:{children:React.ReactNode;tone?:string}){return <span className={`ops-badge ops-${tone}`}>{children}</span>;}
export function Empty({children}:{children:React.ReactNode}){return <div className="ops-empty">{children}</div>;}
export function SyncState({lastSync,error}:{lastSync:string;error?:string}){const {t,language}=useOps();return <span className={`ops-small ${error?'ops-warn-text':'ops-muted'}`}>{error?t('اطلاعات ممکن است قدیمی باشد','Data may be stale','Veriler güncel olmayabilir','Данные могут устареть'):t('همگام با سرور','Synced with server','Sunucuyla eşitlendi','Синхронизировано')} {lastSync&&new Date(lastSync).toLocaleTimeString(language)}</span>;}
