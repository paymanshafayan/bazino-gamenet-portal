/**
 * بخش «توکن‌های اتصال (Manus/Zernio)» — داخل تب «تنظیمات کلید API» WebSyncModal
 * نمایش داده می‌شود. همان بخش توکن‌های پنل ادمین وب: ساخت/کپی/حذف توکن با scope.
 * مسیرها: GET/POST /api/sync/api-tokens ، DELETE /api/sync/api-tokens/:id
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Key, Plus, Copy, Check, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { siteFetch, prettySiteError } from '../../utils/siteClient';

interface Props {
  webServerUrl: string;
  apiKey: string;
}

interface TokenRow { id: string; name: string; token?: string; scopes?: string[]; createdAt?: string; }

export const SiteApiTokensPanel: React.FC<Props> = ({ webServerUrl, apiKey }) => {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [scopes, setScopes] = useState<string[]>(['instagram:ingest']);
  const [allowedScopes, setAllowedScopes] = useState<string[]>(['instagram:ingest', 'manus:telegram', 'manus:blog']);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [created, setCreated] = useState<TokenRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await siteFetch(webServerUrl, apiKey, '/api/sync/api-tokens');
      setTokens(d.tokens || []);
      if (Array.isArray(d.scopes) && d.scopes.length) setAllowedScopes(d.scopes);
    } catch (err) {
      setError(prettySiteError(err));
    } finally {
      setLoading(false);
    }
  }, [webServerUrl, apiKey]);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setBusy(true); setError(''); setCreated(null);
    try {
      const d = await siteFetch(webServerUrl, apiKey, '/api/sync/api-tokens', {
        method: 'POST', body: { name: name.trim() || 'API token', scopes },
      });
      setCreated(d.token);
      setName('');
      void load();
    } catch (err) {
      setError(prettySiteError(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(''), 1500); } catch { /* */ }
  };

  const revoke = async (id: string) => {
    if (!window.confirm('این توکن حذف شود؟ اتصال‌هایی که با آن کار می‌کنند از این پس کار نمی‌کنند.')) return;
    setBusy(true); setError('');
    try {
      await siteFetch(webServerUrl, apiKey, `/api/sync/api-tokens/${encodeURIComponent(id)}`, { method: 'DELETE' });
      void load();
    } catch (err) {
      setError(prettySiteError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-zinc-200 font-bold text-xs">
        <Key className="w-4 h-4 text-cyan-400" />
        توکن‌های اتصال خارجی (Manus / Zernio / اینستاگرام)
      </div>
      {error && (
        <div className="flex items-center gap-2 text-[10px] text-rose-400">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="نام توکن"
          className="flex-1 min-w-[160px] bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500/50" />
        <button onClick={() => void create()} disabled={busy || loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-zinc-950 font-bold rounded-lg text-[10px]">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} ساخت توکن
        </button>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {allowedScopes.map((s) => (
          <label key={s} className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={scopes.includes(s)}
              onChange={(e) => setScopes((ss) => (e.target.checked ? [...ss, s] : ss.filter((x) => x !== s)))} />
            <span className="font-mono" dir="ltr">{s}</span>
          </label>
        ))}
      </div>
      {created?.token && (
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between gap-2">
          <span className="text-[10px] text-emerald-300 font-mono break-all" dir="ltr">{created.token}</span>
          <button onClick={() => void copy(created.token!, created.id)} className="shrink-0 p-1.5 text-emerald-300 hover:text-emerald-100">
            {copied === created.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {tokens.length === 0 && !loading && <p className="text-[11px] text-zinc-500">هنوز توکنی ساخته نشده است.</p>}
        {tokens.map((t) => (
          <div key={t.id} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
            <span className="flex-1 text-xs text-zinc-100 font-bold truncate">{t.name}</span>
            {(t.scopes || []).map((s) => (
              <span key={s} className="text-[9px] font-mono text-cyan-200/80 bg-cyan-500/10 rounded px-1.5 py-0.5 hidden md:inline" dir="ltr">{s}</span>
            ))}
            <span className="text-[10px] text-zinc-500 font-mono" dir="ltr">baz_••••••••{String(t.token || '').slice(-4)}</span>
            <button onClick={() => void copy(t.token || '', t.id)} title="کپی مقدار توکن"
              className="p-1.5 text-cyan-300 hover:text-cyan-100">
              {copied === t.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => void revoke(t.id)} disabled={busy} title="حذف توکن"
              className="p-1.5 rounded text-zinc-500 hover:bg-rose-500/20 hover:text-rose-400 disabled:opacity-50">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-zinc-500 leading-relaxed">
        مقدار کامل توکن فقط هنگام ساخته‌شدن یک بار نمایش داده می‌شود؛ فهرست بالا همیشه ماسک است.
      </p>
    </div>
  );
};
