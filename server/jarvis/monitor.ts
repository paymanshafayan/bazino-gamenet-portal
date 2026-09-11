/**
 * Jarvis monitor — health snapshot of the portal + connected tools
 * (Zernio publishing, Telegram gateway). Snapshots are kept in one rolling
 * ops-record so the UI can chart the recent history; alerts are derived.
 */
import { OpsCore, nowISO } from '../management/core';
import { DurableQueue } from '../publishing/queue';
import { PublishingSettings } from '../publishing/settings';
import { readGatewayConfig } from '../manus/gateway';

export interface JarvisMonitorSnapshot {
  generatedAt: string;
  publishing: { outboundEnabled: boolean; zernioConfigured: boolean; inboxTotal: number; sent: number; queued: number; failed: number; unknown: number; lastInboundAt: string };
  telegram: { configured: boolean; reachable: boolean | null; detail: string };
  portal: { uptimeHours: number; memoryMB: number; dbLatencyMs: number; nodeVersion: string };
  alerts: string[];
}

const HISTORY_ID = 'jarvis-monitor-history';
const MAX_HISTORY = 120;

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const t = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - t };
}

export async function snapshot(core: OpsCore, fetcher?: typeof fetch): Promise<JarvisMonitorSnapshot> {
  const alerts: string[] = [];
  const db = await timed(() => core.store.getSetting('bazino.monitor.ping'));
  const dbLatencyMs = db.ms;

  // Publishing / Zernio
  let publishing: JarvisMonitorSnapshot['publishing'] = { outboundEnabled: false, zernioConfigured: false, inboxTotal: 0, sent: 0, queued: 0, failed: 0, unknown: 0, lastInboundAt: '' };
  try {
    const settings = new PublishingSettings(core);
    const cfg = await settings.config();
    const report: any = await new DurableQueue(core).report();
    const inboxRows = await core.list('pub-inbox');
    const lastInboundAt = inboxRows.map((r: any) => String(r.data.receivedAt || '')).sort().pop() || '';
    publishing = {
      outboundEnabled: !!cfg.data.outboundEnabled,
      zernioConfigured: !!cfg.data.zernioAccountId,
      inboxTotal: report.counts?.received || 0, sent: report.counts?.sent || 0,
      queued: report.counts?.queued || 0, failed: (report.outbox || []).filter((o: any) => o.status === 'failed').length,
      unknown: report.counts?.unknown || 0, lastInboundAt,
    };
    if (publishing.outboundEnabled && !publishing.zernioConfigured) alerts.push('ZERNIO_ACCOUNT_MISSING');
    if (publishing.failed >= 5) alerts.push('OUTBOX_FAILURES');
    if (publishing.unknown >= 3) alerts.push('DELIVERY_UNKNOWN');
  } catch { alerts.push('PUBLISHING_REPORT_FAILED'); }

  // Telegram gateway
  let telegram: JarvisMonitorSnapshot['telegram'] = { configured: false, reachable: null, detail: '' };
  try {
    const gw = readGatewayConfig(process.env);
    if (gw) {
      telegram.configured = true;
      try {
        const f = fetcher || fetch;
        const res = await f(`${gw.baseUrl.replace(/\/$/, '')}/healthz`, { signal: AbortSignal.timeout(4000) } as any);
        telegram.reachable = res.ok;
        telegram.detail = res.ok ? 'پاسخ OK' : `HTTP ${res.status}`;
      } catch (e: any) {
        telegram.reachable = false;
        telegram.detail = String(e?.message || e).slice(0, 120);
      }
      if (telegram.reachable === false) alerts.push('TELEGRAM_GATEWAY_DOWN');
    } else {
      telegram.detail = 'تنظیم نشده (TG_GATEWAY_URL)';
    }
  } catch { /* env read is safe; ignore */ }

  // Portal
  const portal = {
    uptimeHours: Math.round((process.uptime() / 3600) * 10) / 10,
    memoryMB: Math.round((process.memoryUsage().rss || 0) / 1e6),
    dbLatencyMs,
    nodeVersion: process.version,
  };
  if (dbLatencyMs > 500) alerts.push('DB_SLOW');
  if (portal.memoryMB > 1500) alerts.push('HIGH_MEMORY');

  return { generatedAt: nowISO(), publishing, telegram, portal, alerts };
}

export async function recordSnapshot(core: OpsCore, snap: JarvisMonitorSnapshot) {
  const row = await core.read<any>('jarvis-monitor', HISTORY_ID);
  const history = [...(row?.data?.history || []), snap].slice(-MAX_HISTORY);
  await core.save('jarvis-monitor', HISTORY_ID, { history, updatedAt: nowISO() }, row?.version || 0);
}

export async function monitorHistory(core: OpsCore) {
  const row = await core.read<any>('jarvis-monitor', HISTORY_ID);
  return { history: (row?.data?.history || []).slice(-60), latest: (row?.data?.history || []).slice(-1)[0] || null };
}
