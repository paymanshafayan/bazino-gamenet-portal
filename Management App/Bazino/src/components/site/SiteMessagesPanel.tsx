/**
 * تب «پیام‌ها و نوتیفیکیشن» در WebSyncModal — همان بخش پیام پنل ادمین وب:
 * ارسال پیام جمعی/فردی + گزینهٔ نوتیفیکیشن زنده + تاریخچهٔ پیام‌های ارسال‌شده.
 * مسیرها: GET/POST /api/sync/messages
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Mail, RefreshCw, Send, AlertCircle, CheckCircle2, Bell } from 'lucide-react';
import { siteFetch, prettySiteError } from '../../utils/siteClient';

interface Props {
  webServerUrl: string;
  apiKey: string;
}

interface UserRow { username: string; email?: string; phone?: string; displayName?: string; }
interface MessageRow { id: string; recipient: string; title: string; body: string; date: string; type: string; }

export const SiteMessagesPanel: React.FC<Props> = ({ webServerUrl, apiKey }) => {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [recipient, setRecipient] = useState('All');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [asNotif, setAsNotif] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await siteFetch(webServerUrl, apiKey, '/api/sync/messages');
      setMessages((d.messages || []).slice().reverse());
      setUsers(d.users || []);
    } catch (err) {
      setError(prettySiteError(err));
    } finally {
      setLoading(false);
    }
  }, [webServerUrl, apiKey]);

  useEffect(() => { void load(); }, [load]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setBusy(true); setMsg(null);
    try {
      await siteFetch(webServerUrl, apiKey, '/api/sync/messages', {
        method: 'POST',
        body: { recipient, title: title.trim(), body: body.trim(), sendAsNotification: asNotif },
      });
      setMsg({ ok: true, text: asNotif ? 'پیام ارسال و نوتیفیکیشن زنده برای کاربران فعال شد.' : 'پیام با موفقیت ارسال شد.' });
      setTitle(''); setBody(''); setAsNotif(false);
      void load();
    } catch (err) {
      setMsg({ ok: false, text: prettySiteError(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-zinc-100">پیام و نوتیفیکیشن به کاربران سایت</h3>
        </div>
        <button onClick={() => void load()} disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          بروزرسانی
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
        </div>
      )}
      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-xl border ${msg.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* فرم ارسال */}
      <form onSubmit={send} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 font-bold block mb-1">گیرنده پیام</label>
            <select value={recipient} onChange={(e) => setRecipient(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/50">
              <option value="All">📢 همهٔ کاربران (ارسال جمعی)</option>
              {users.map((u) => (
                <option key={u.username} value={u.username}>👤 {u.username}{u.email || u.phone ? ` (${u.email || u.phone})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 font-bold block mb-1">موضوع پیام</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تاییدیه رزرو سیستم VIP"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/50" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 font-bold block mb-1">متن پیام</label>
          <textarea required rows={4} value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="متن خود را در این بخش وارد کنید..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/50" />
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-xl">
            <input type="checkbox" checked={asNotif} onChange={(e) => setAsNotif(e.target.checked)} className="accent-amber-500" />
            <span className="text-xs text-zinc-200 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> ارسال به‌عنوان نوتیفیکیشن فشاری زنده
            </span>
          </label>
          <button type="submit" disabled={busy || !title.trim() || !body.trim()}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50">
            <Send className="w-3.5 h-3.5" /> ارسال پیام / نوتیفیکیشن
          </button>
        </div>
      </form>

      {/* تاریخچه */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-zinc-200 font-bold">
          <Mail className="w-4 h-4 text-emerald-400" />
          تاریخچهٔ پیام‌های ارسال‌شده
        </div>
        <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-center py-6 text-zinc-500 text-xs font-bold">هیچ پیامی هنوز ارسال نشده است.</div>
          )}
          {messages.map((m) => (
            <div key={m.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-bold">
                  به: {m.recipient === 'All' ? 'همهٔ کاربران' : `@${m.recipient}`}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">{m.date}</span>
              </div>
              <h4 className="text-xs font-bold text-zinc-100 mt-0.5">{m.title}</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">{m.body}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${m.type === 'notification' ? 'bg-amber-400' : 'bg-sky-400'}`} />
                <span className="text-[10px] text-zinc-500 font-bold">
                  {m.type === 'notification' ? 'نوع: نوتیفیکیشن لایو' : 'نوع: صندوق پیام'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
