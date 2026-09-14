/**
 * بخش «لاگ دیتابیس سایت» — داخل تب «لاگ‌ها» WebSyncModal نمایش داده می‌شود.
 * همان بخش لاگ دیتابیس پنل ادمین وب: درخواست‌ها و دستورات SQL/NoSQL موتور فعال
 * به همراه مدت اجرا. مسیر: GET /api/sync/db-logs
 */
import React, { useState } from 'react';
import { Database, RefreshCw, Loader2 } from 'lucide-react';
import { siteFetch, prettySiteError } from '../../utils/siteClient';

interface Props {
  webServerUrl: string;
  apiKey: string;
}

interface DbLog { provider: string; type: string; command: string; timestamp?: string; durationMs?: number; operation?: string; query?: string; }

export const SiteDbLogsPanel: React.FC<Props> = ({ webServerUrl, apiKey }) => {
  const [logs, setLogs] = useState<DbLog[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setBusy(true); setError('');
    try {
      const d = await siteFetch(webServerUrl, apiKey, '/api/sync/db-logs');
      setLogs(d.logs || []);
    } catch (err) {
      setError(prettySiteError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-200 font-bold text-xs">
          <Database className="w-4 h-4 text-emerald-400" />
          لاگ موتور دیتابیس سایت (SQL / NoSQL)
        </div>
        <button onClick={() => void load()} disabled={busy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 disabled:opacity-50 text-[10px]">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {logs === null ? 'نمایش لاگ‌ها' : 'بروزرسانی'}
        </button>
      </div>
      {error && <p className="text-[10px] text-rose-400">{error}</p>}
      {logs !== null && (
        <div className="bg-black/70 border border-zinc-800 rounded-xl p-3 font-mono text-[10px] max-h-[300px] overflow-y-auto space-y-1 text-left" dir="ltr">
          {logs.length === 0 ? (
            <div className="text-center py-6 text-zinc-600 font-bold uppercase">هیچ لاگی ثبت نشده است.</div>
          ) : logs.map((log, i) => {
            const cmd = log.command || log.query || '';
            const typ = log.type || log.operation || '';
            return (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-zinc-600 shrink-0">{String(i + 1).padStart(3, '0')}</span>
                <span className="text-amber-400 shrink-0">{log.provider}</span>
                <span className="text-emerald-400 shrink-0">{typ}</span>
                <span className="text-zinc-300 break-all flex-1">{cmd}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
