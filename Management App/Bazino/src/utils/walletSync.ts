/**
 * تسک ۱۳ — همگام‌سازی کیف پول با سرور سایت (منبع حقیقت موجودی = سرور سایت).
 *
 *  • هر شارژ/برداشت حضوری در اپ مدیریت به یک «صف آفلاین» با idempotencyKey اضافه می‌شود و
 *    در اولین فرصت (آنلاین) به `/api/sync/wallet/topup|charge` ارسال می‌گردد. تکرار ارسال بی‌خطر است
 *    (سرور با کلید یکتا پاسخ duplicate می‌دهد).
 *  • فهرست سفارش‌های «در انتظار پرداخت حضوری» از `/api/sync/onsite-orders?status=pending_onsite`
 *    خوانده و با `/settle` (نقدی/کارت/کیف پول) یا `/cancel` بسته می‌شود.
 *
 * صف در localStorage (`bazino_wallet_sync_queue`) نگه داشته می‌شود تا با بستن اپ از بین نرود.
 */
import { buildSyncUrl, syncHeaders } from './syncClient';

export type WalletOpType = 'topup' | 'charge';
export interface WalletQueueItem {
  idempotencyKey: string;
  type: WalletOpType;
  phone: string;
  amount: number;
  operator: string;
  note: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
}
export interface OnsiteOrder {
  id: string;
  kind: 'reservation' | 'tournament' | 'cafe' | 'shop';
  username: string;
  phone?: string;
  amount: number;
  status: string;
  dueAt?: string;
  description: string;
  createdAt: string;
}
export interface SyncConfig { webServerUrl: string; apiKey: string }

export const QUEUE_KEY = 'bazino_wallet_sync_queue';

function storage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}
export function loadQueue(): WalletQueueItem[] {
  try { const raw = storage()?.getItem(QUEUE_KEY); const q = raw ? JSON.parse(raw) : []; return Array.isArray(q) ? q : []; } catch { return []; }
}
export function saveQueue(q: WalletQueueItem[]) { try { storage()?.setItem(QUEUE_KEY, JSON.stringify(q)); } catch { /* quota */ } }

export function newIdempotencyKey(): string {
  const rnd = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `mgmt-${rnd}`;
}

/** افزودن به صف (بدون ارسال). خروجی: صف جدید. */
export function enqueueWalletOp(item: Omit<WalletQueueItem, 'idempotencyKey' | 'createdAt' | 'attempts'> & { idempotencyKey?: string }): WalletQueueItem[] {
  const q = loadQueue();
  q.push({ ...item, idempotencyKey: item.idempotencyKey || newIdempotencyKey(), createdAt: new Date().toISOString(), attempts: 0 });
  saveQueue(q);
  return q;
}

export interface FlushResult { sent: number; failed: number; remaining: WalletQueueItem[]; balances: Record<string, number> }

/** ارسال کل صف به ترتیب؛ آیتم‌های موفق (یا duplicate) حذف می‌شوند؛ خطاها می‌مانند. */
export async function flushWalletQueue(cfg: SyncConfig, fetchImpl: typeof fetch = fetch): Promise<FlushResult> {
  const q = loadQueue();
  const remaining: WalletQueueItem[] = [];
  const balances: Record<string, number> = {};
  let sent = 0, failed = 0;
  for (const item of q) {
    try {
      const res = await fetchImpl(buildSyncUrl(cfg.webServerUrl, `/api/sync/wallet/${item.type}`), {
        method: 'POST', headers: syncHeaders(cfg.apiKey, true),
        body: JSON.stringify({ phone: item.phone, amount: item.amount, operator: item.operator, note: item.note, idempotencyKey: item.idempotencyKey }),
      });
      const data: any = await res.json().catch(() => ({}));
      if (res.ok && data.success) { sent++; if (typeof data.balance === 'number') balances[item.phone] = data.balance; continue; }
      // خطاهای قطعی (۴xx غیر از 401/429) → از صف حذف نمی‌کنیم ولی خطا ثبت می‌شود تا اپراتور ببیند
      failed++;
      remaining.push({ ...item, attempts: item.attempts + 1, lastError: data.error || `HTTP ${res.status}` });
    } catch (e: any) {
      failed++;
      remaining.push({ ...item, attempts: item.attempts + 1, lastError: e?.message || 'network' });
    }
  }
  saveQueue(remaining);
  return { sent, failed, remaining, balances };
}

export async function fetchServerWallet(cfg: SyncConfig, phone: string, fetchImpl: typeof fetch = fetch): Promise<{ balance: number; username: string; transactions: any[] } | null> {
  const res = await fetchImpl(buildSyncUrl(cfg.webServerUrl, `/api/sync/wallet/${encodeURIComponent(phone)}`), { headers: syncHeaders(cfg.apiKey) });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchPendingOnsiteOrders(cfg: SyncConfig, fetchImpl: typeof fetch = fetch): Promise<OnsiteOrder[]> {
  const res = await fetchImpl(buildSyncUrl(cfg.webServerUrl, '/api/sync/onsite-orders?status=pending_onsite'), { headers: syncHeaders(cfg.apiKey) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = await res.json();
  return Array.isArray(d) ? d : [];
}

export async function settleOnsiteOrder(cfg: SyncConfig, id: string, method: 'cash' | 'pos' | 'wallet', operator: string, fetchImpl: typeof fetch = fetch): Promise<any> {
  const res = await fetchImpl(buildSyncUrl(cfg.webServerUrl, `/api/sync/onsite-orders/${encodeURIComponent(id)}/settle`), {
    method: 'POST', headers: syncHeaders(cfg.apiKey, true), body: JSON.stringify({ method, operator }),
  });
  const d: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
  return d;
}

export async function cancelOnsiteOrder(cfg: SyncConfig, id: string, operator: string, fetchImpl: typeof fetch = fetch): Promise<any> {
  const res = await fetchImpl(buildSyncUrl(cfg.webServerUrl, `/api/sync/onsite-orders/${encodeURIComponent(id)}/cancel`), {
    method: 'POST', headers: syncHeaders(cfg.apiKey, true), body: JSON.stringify({ operator }),
  });
  const d: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
  return d;
}
