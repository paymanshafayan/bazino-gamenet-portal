/**
 * تب «گفتگوی زنده» در WebSyncModal — همان بخش چت پنل ادمین وب:
 * لیست/ایجاد/حذف اتاق‌های گفتگو + مشاهدهٔ پیام‌های هر اتاق.
 * مسیرها: GET/POST /api/sync/chat-rooms ، GET /api/sync/chat-rooms/:name/messages ،
 * DELETE /api/sync/chat-rooms/:name
 */
import React, { useCallback, useEffect, useState } from 'react';
import { MessageSquare, RefreshCw, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { siteFetch, prettySiteError } from '../../utils/siteClient';

interface Props {
  webServerUrl: string;
  apiKey: string;
}

interface ChatMessage { id: string; room: string; username: string; message: string; timestamp: string; }

export const SiteChatPanel: React.FC<Props> = ({ webServerUrl, apiKey }) => {
  const [rooms, setRooms] = useState<string[]>([]);
  const [newRoom, setNewRoom] = useState('');
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [roomMessages, setRoomMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await siteFetch(webServerUrl, apiKey, '/api/sync/chat-rooms');
      setRooms(d.rooms || []);
    } catch (err) {
      setError(prettySiteError(err));
    } finally {
      setLoading(false);
    }
  }, [webServerUrl, apiKey]);

  useEffect(() => { void load(); }, [load]);

  const openRoom = async (room: string) => {
    setActiveRoom(room); setRoomMessages([]);
    try {
      const d = await siteFetch(webServerUrl, apiKey, `/api/sync/chat-rooms/${encodeURIComponent(room)}/messages`);
      setRoomMessages(d.messages || []);
    } catch (err) {
      setMsg({ ok: false, text: prettySiteError(err) });
    }
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const d = await siteFetch(webServerUrl, apiKey, '/api/sync/chat-rooms', {
        method: 'POST', body: { name: newRoom.trim() },
      });
      setRooms(d.rooms || []);
      setNewRoom('');
      setMsg({ ok: true, text: 'اتاق گفتگو ایجاد شد.' });
    } catch (err) {
      setMsg({ ok: false, text: prettySiteError(err) });
    } finally {
      setBusy(false);
    }
  };

  const deleteRoom = async (room: string) => {
    if (!window.confirm(`اتاق «${room}» حذف شود؟ پیام‌های قبلی حفظ می‌شوند ولی اتاق دیگر در دسترس نخواهد بود.`)) return;
    setBusy(true); setMsg(null);
    try {
      const d = await siteFetch(webServerUrl, apiKey, `/api/sync/chat-rooms/${encodeURIComponent(room)}`, { method: 'DELETE' });
      setRooms(d.rooms || []);
      if (activeRoom === room) { setActiveRoom(null); setRoomMessages([]); }
      setMsg({ ok: true, text: 'اتاق گفتگو حذف شد.' });
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
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-zinc-100">اتاق‌های گفتگوی زندهٔ سایت</h3>
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

      <form onSubmit={createRoom} className="flex gap-2">
        <input type="text" required value={newRoom} onChange={(e) => setNewRoom(e.target.value)}
          placeholder="نام اتاق جدید، مثلاً Apex Legends"
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/50" />
        <button type="submit" disabled={busy || !newRoom.trim()}
          className="flex items-center gap-1.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-lg text-xs">
          <Plus className="w-4 h-4" /> ایجاد اتاق
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
          <div className="text-zinc-200 font-bold text-xs">اتاق‌های فعال ({rooms.length})</div>
          {rooms.length === 0 && !loading && <p className="text-zinc-500 text-xs">اتاقی وجود ندارد.</p>}
          <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto">
            {rooms.map((room) => (
              <div key={room}
                className={`flex justify-between items-center gap-2 p-2.5 rounded-xl border ${
                  activeRoom === room ? 'border-amber-500/40 bg-amber-500/5' : 'border-zinc-800 bg-zinc-950'
                }`}>
                <button onClick={() => void openRoom(room)} className="text-xs font-bold text-zinc-100 truncate hover:text-amber-400">
                  {room}
                </button>
                <button onClick={() => void deleteRoom(room)} disabled={busy} title="حذف اتاق"
                  className="shrink-0 p-1.5 rounded-lg text-zinc-500 border border-zinc-800 hover:bg-rose-500/20 hover:text-rose-400 disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-zinc-200 font-bold text-xs mb-2">
            {activeRoom ? `پیام‌های اتاق «${activeRoom}»` : 'پیام‌های اتاق'}
          </div>
          {!activeRoom ? (
            <div className="h-[340px] flex items-center justify-center text-xs text-zinc-500">یک اتاق را برای مشاهدهٔ پیام‌ها انتخاب کنید.</div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-[340px] overflow-y-auto" dir="ltr">
              {roomMessages.length === 0 && (
                <div className="text-center py-8 text-zinc-500 text-xs">پیامی در این اتاق ثبت نشده است.</div>
              )}
              {roomMessages.map((m) => (
                <div key={m.id} className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5">
                  <div className="text-[10px] text-amber-400 font-bold">@{m.username} <span className="text-zinc-600 font-mono">{m.timestamp}</span></div>
                  <div className="text-xs text-zinc-200 break-words">{m.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
