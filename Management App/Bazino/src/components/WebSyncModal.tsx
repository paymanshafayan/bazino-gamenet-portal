import React, { useState, useEffect } from 'react';
import { RefreshCw, Globe, CheckCircle2, ShieldCheck, X, Key, Server, ArrowUpRight, ArrowDownLeft, Terminal, Copy, Check, Settings, Activity, Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, ListFilter, FileText, Download, Smartphone, Monitor } from 'lucide-react';
import { WebSyncStatus } from '../types';
import { buildSyncUrl, syncHeaders } from '../utils/syncClient';

interface WebReservation {
  id: string;
  customerName: string;
  phone: string;
  stationType: string;
  stationName?: string;
  reservedTime: string;
  depositPaid: number;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
}

interface SyncLogEntry {
  id: string;
  timestamp: string;
  action: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  details: string;
  itemsSyncedCount: number;
}

interface WebSyncModalProps {
  status: WebSyncStatus;
  onClose: () => void;
  onTriggerSync: () => void;
  /** Persists a new server URL / API key (Web Sync → تنظیمات tab → ذخیره). */
  onUpdateSyncSettings: (next: WebSyncStatus) => void;
}

export const WebSyncModal: React.FC<WebSyncModalProps> = ({
  status,
  onClose,
  onTriggerSync,
  onUpdateSyncSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'reservations' | 'config' | 'payload' | 'logs' | 'docs'>('status');
  // Draft fields for the config tab — only actually applied (and persisted) when the user
  // clicks "ذخیره تنظیمات". Seeded from the real, persisted settings (`status`), not fake
  // placeholder values, so what you see here is what's really being used to connect.
  const [apiUrlDraft, setApiUrlDraft] = useState(status.webServerUrl);
  const [apiKeyDraft, setApiKeyDraft] = useState(status.apiKey);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [syncInterval, setSyncInterval] = useState('5');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; delayMs?: number } | null>(null);

  const [reservations, setReservations] = useState<WebReservation[]>([]);
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const handleSaveSettings = () => {
    onUpdateSyncSettings({ ...status, webServerUrl: apiUrlDraft.trim(), apiKey: apiKeyDraft.trim() });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  // Fetch live reservations & logs on load
  const fetchWebData = async () => {
    setIsLoadingData(true);
    try {
      const resReservations = await fetch(buildSyncUrl(status.webServerUrl, '/api/sync/reservations'), {
        headers: syncHeaders(status.apiKey),
      });
      if (resReservations.ok) {
        const resData = await resReservations.json();
        if (resData.reservations) setReservations(resData.reservations);
      }

      const resLogs = await fetch(buildSyncUrl(status.webServerUrl, '/api/sync/logs'), {
        headers: syncHeaders(status.apiKey),
      });
      if (resLogs.ok) {
        const logData = await resLogs.json();
        if (logData.logs) setLogs(logData.logs);
      }
    } catch (err) {
      console.error('Failed to fetch web sync data', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchWebData();
    // Re-fetch whenever the active (saved) server URL/key actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.webServerUrl, status.apiKey]);

  const sampleJsonPayload = JSON.stringify(
    {
      action: "BAZINO_LAN_SYNC",
      station_id: "LAN_SERVER_TEHRAN_01",
      timestamp: new Date().toISOString(),
      active_stations_count: 8,
      total_revenue_today: 3450000,
      active_sessions: [
        { station: "PS5 VIP #1", status: "PLAYING", elapsed_minutes: 42, current_cost: 140000 },
        { station: "PC Gaming #3", status: "PLAYING", elapsed_minutes: 115, current_cost: 230000 }
      ],
      online_reservations_received: [
        { reservation_id: "RES-8801", customer: "علی رضایی", target_station: "PS5 VIP #1", time: "20:30" }
      ]
    },
    null,
    2
  );

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(sampleJsonPayload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleTestConnection = async () => {
    setIsTestingApi(true);
    setTestResult(null);
    const startTime = Date.now();

    try {
      const res = await fetch(buildSyncUrl(status.webServerUrl, '/api/sync/webservice'), {
        method: 'POST',
        headers: syncHeaders(status.apiKey, true),
        body: JSON.stringify({
          action: 'MANUAL_TEST_CONNECT',
          station_id: 'BAZINO_CENTRAL_DESKTOP',
          timestamp: new Date().toISOString()
        })
      });

      const delayMs = Date.now() - startTime;
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          success: true,
          message: data.webPortalMessage || 'ارتباط با موفقیت برقرار شد.',
          delayMs
        });
        onTriggerSync();
        fetchWebData();
      } else if (res.status === 401) {
        setTestResult({
          success: false,
          message: 'کلید API نامعتبر است — تنظیمات را چک کنید.',
          delayMs
        });
      } else {
        setTestResult({
          success: false,
          message: `خطا در برقراری ارتباط. کد پاسخ: ${res.status}`,
          delayMs
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'خطای شبکه در اتصال به Endpoint معرفی شده.',
        delayMs: Date.now() - startTime
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleUpdateReservationStatus = async (id: string, newStatus: 'CONFIRMED' | 'REJECTED') => {
    try {
      const res = await fetch(buildSyncUrl(status.webServerUrl, '/api/sync/reservations/update'), {
        method: 'POST',
        headers: syncHeaders(status.apiKey, true),
        body: JSON.stringify({ reservationId: id, newStatus })
      });
      if (res.ok) {
        setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        fetchWebData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-zinc-100">
                  اتصال و همگام‌سازی وب‌سایت با نرم‌افزار (REST API & Cloud Sync)
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
                  v2.4 Live
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                ارتباط زنده دوطرفه دسکتاپ با سایت گیم‌نت، رزرو آنلاین، شارژ حساب و گزارش‌گیری بوفه
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-zinc-950 px-4 border-b border-zinc-800 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'status'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>وضعیت اتصال</span>
          </button>

          <button
            onClick={() => setActiveTab('reservations')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all relative ${
              activeTab === 'reservations'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>رزروهای آنلاین</span>
            {reservations.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-zinc-950 font-extrabold rounded-full text-[10px]">
                {reservations.filter(r => r.status === 'PENDING').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'logs'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>لاگ‌های تراکنش و Webhook</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'config'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>تنظیمات کلید API</span>
          </button>

          <button
            onClick={() => setActiveTab('payload')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'payload'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>مستندات JSON</span>
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'docs'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>دانلود اسناد امکانات</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs text-zinc-300">
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                  <span className="text-zinc-400 font-semibold">وضعیت ارتباط با سرور سایت:</span>
                  {status.isConnected ? (
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" /> متصل و آماده تبادل داده
                    </span>
                  ) : (
                    <span className="font-bold text-red-400 flex items-center gap-1.5 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
                      <XCircle className="w-4 h-4" /> قطع — از تب «تنظیمات» تست اتصال بگیرید
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">آدرس سرور سایت:</span>
                  <span className="font-mono text-amber-400 dir-ltr">
                    {status.webServerUrl || 'همین سرور (حالت محلی/co-located)'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">آخرین زمان همگام‌سازی موفق:</span>
                  <span className="font-mono text-zinc-200">{status.lastSyncTime || 'هنوز همگام‌سازی نشده'}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">بازه زمانی بروزرسانی اتوماتیک:</span>
                  <span className="font-bold text-zinc-200">هر {syncInterval} دقیقه یک‌بار (پایدار)</span>
                </div>
              </div>

              {/* Data Sync Capabilities Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>ارسال از دسکتاپ به سایت (Push API):</span>
                  </div>
                  <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
                    <li>ارسال آنلاین وضعیت پر/خالی بودن کنسول‌ها</li>
                    <li>گزارش لحظه‌ای فروش بوفه و کارکرد ایستگاه‌ها</li>
                    <li>سینک لیست قیمتها و تعرفه‌های فعال</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>دریافت از سایت به دسکتاپ (Pull / Webhook):</span>
                  </div>
                  <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
                    <li>دریافت رزروهای آنلاین مشتریان همراه با بیعانه</li>
                    <li>افزایش آنلاین اعتبار کیف‌پول اعضا از درگاه بانکی</li>
                    <li>ثبت‌نام مشتریان جدید از طریق سایت و اپلیکیشن</li>
                  </ul>
                </div>
              </div>

              {testResult && (
                <div className={`p-3.5 rounded-xl border text-xs font-semibold animate-in fade-in flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                  <div>
                    <div className="font-bold">{testResult.message}</div>
                    {testResult.delayMs !== undefined && (
                      <div className="text-[10px] opacity-80 mt-0.5">زمان پاسخ‌دهی سرور (Latency): {testResult.delayMs} میلی‌ثانیه</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reservations' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="font-bold text-zinc-200">لیست رزروهای آنلاین دریافتی از وب‌سایت:</span>
                <button
                  onClick={fetchWebData}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px] flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                  <span>بروزرسانی لیست</span>
                </button>
              </div>

              {reservations.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950 rounded-xl border border-zinc-800 text-zinc-500">
                  هیچ رزرو آنلاینی یافت نشد.
                </div>
              ) : (
                <div className="space-y-2">
                  {reservations.map(res => (
                    <div key={res.id} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between flex-wrap gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-400">{res.id}</span>
                          <span className="font-semibold text-zinc-200">{res.customerName}</span>
                          <span className="text-[10px] text-zinc-500 dir-ltr">{res.phone}</span>
                        </div>
                        <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
                          <span className="flex items-center gap-1"><Server className="w-3.5 h-3.5 text-amber-500" /> {res.stationName || res.stationType}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-zinc-500" /> ساعت: {res.reservedTime}</span>
                          <span className="text-emerald-400 font-bold">بیعانه: {res.depositPaid.toLocaleString('fa-IR')} تومان</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {res.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleUpdateReservationStatus(res.id, 'CONFIRMED')}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg text-[11px] flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>تایید رزرو</span>
                            </button>
                            <button
                              onClick={() => handleUpdateReservationStatus(res.id, 'REJECTED')}
                              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold border border-rose-500/30 rounded-lg text-[11px] flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>رد رزرو</span>
                            </button>
                          </>
                        )}
                        {res.status === 'CONFIRMED' && (
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold text-[11px]">
                            تایید شده
                          </span>
                        )}
                        {res.status === 'REJECTED' && (
                          <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg font-bold text-[11px]">
                            رد شده
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="font-bold text-zinc-200">تاریخچه تبادلات زنده API و Webhook:</span>
                <button
                  onClick={fetchWebData}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px] flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                  <span>بروزرسانی لاگ‌ها</span>
                </button>
              </div>

              <div className="space-y-2 font-mono text-[11px]">
                {logs.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500">هیچ لاگی ثبت نشده است.</div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-bold">{log.action}</span>
                          <span className="text-zinc-500 text-[10px]">{new Date(log.timestamp).toLocaleTimeString('fa-IR')}</span>
                        </div>
                        <div className="text-zinc-300">{log.details}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                          log.status === 'ERROR'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : log.status === 'WARNING'
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 leading-relaxed">
                برای نسخه‌ی <b>دسکتاپ مستقل</b> (که دیتابیس محلی خودش رو داره)، آدرس سرور واقعی سایت (<span className="dir-ltr inline-block">https://xerxes.biz</span>) رو اینجا وارد کنید تا رزروهای آنلاین از اون سرور دریافت بشه. اگه این برنامه از همون سرور سایت سرو می‌شه (حالت وب‌اپ عادی)، این فیلد رو خالی بذارید.
              </div>
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">آدرس سرور سایت (خالی = همین سرور):</label>
                  <div className="relative">
                    <Server className="w-4 h-4 text-zinc-500 absolute right-3 top-3" />
                    <input
                      type="text"
                      value={apiUrlDraft}
                      onChange={(e) => setApiUrlDraft(e.target.value)}
                      placeholder="https://xerxes.biz"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pr-9 pl-3 py-2 text-amber-400 font-mono text-xs focus:outline-none focus:border-amber-500 dir-ltr text-left"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">فقط آدرس پایه (بدون /api/...) — مسیرهای API خودکار اضافه می‌شن.</p>
                </div>

                <div>
                  <label className="text-zinc-300 font-bold block mb-1">کلید امنیتی اتصال (Secret Bearer API Key):</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-zinc-500 absolute right-3 top-3" />
                    <input
                      type="password"
                      value={apiKeyDraft}
                      onChange={(e) => setApiKeyDraft(e.target.value)}
                      placeholder="از تنظیمات ادمین سایت (gamenet_sync_api_key) بگیرید"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pr-9 pl-3 py-2 text-zinc-200 font-mono text-xs focus:outline-none focus:border-amber-500 dir-ltr text-left"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl transition-colors"
                >
                  {settingsSaved ? 'ذخیره شد ✓' : 'ذخیره تنظیمات'}
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingApi}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isTestingApi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>تست اتصال (با تنظیمات ذخیره‌شده)</span>
                </button>

                {testResult && (
                  <div
                    className={`p-2.5 rounded-lg text-[11px] font-bold flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {testResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>{testResult.message}{testResult.delayMs != null ? ` (${testResult.delayMs}ms)` : ''}</span>
                  </div>
                )}
                <p className="text-[10px] text-zinc-500">
                  توجه: فیلدهای بالا تا وقتی «ذخیره تنظیمات» رو نزنید اعمال نمی‌شن — «تست اتصال» و همگام‌سازی‌های بعدی از آخرین مقدار ذخیره‌شده استفاده می‌کنن.
                </p>
              </div>

              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-300 font-bold block mb-1">تکرار همگام‌سازی اتوماتیک:</label>
                    <select
                      value={syncInterval}
                      onChange={(e) => setSyncInterval(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2 text-zinc-200 font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="1">هر ۱ دقیقه یک‌بار (آنلاین لحظه‌ای)</option>
                      <option value="5">هر ۵ دقیقه یک‌بار (پیش‌فرض)</option>
                      <option value="15">هر ۱۵ دقیقه یک‌بار</option>
                      <option value="60">هر ۱ ساعت یک‌بار</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-200 font-bold">
                      <input
                        type="checkbox"
                        checked={autoSyncEnabled}
                        onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span>فعال‌سازی همگام‌سازی خودکار در پس‌زمینه</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payload' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-zinc-200">نمونه ساختار JSON تبادل داده (برای برنامه‌نویس وب‌سایت):</span>
                <button
                  onClick={handleCopyPayload}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded-lg text-[11px] font-bold flex items-center gap-1"
                >
                  {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPayload ? 'کپی شد!' : 'کپی کد JSON'}</span>
                </button>
              </div>

              <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto dir-ltr text-left leading-relaxed">
                {sampleJsonPayload}
              </pre>
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-amber-400 text-xs">اسناد و دفترچه امکانات سیستم BAZINO PRO</div>
                  <div className="text-[11px] text-zinc-400">می‌توانید فایل‌های متنی و مشخصات امکانات را تفکیک‌شده دانلود نمایید.</div>
                </div>
                <FileText className="w-5 h-5 text-amber-400" />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* Desktop Report */}
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-100">۱. دفترچه امکانات نرم‌افزار دسکتاپ (Desktop Core)</h4>
                      <p className="text-[11px] text-zinc-400">شامل کنترل رله‌ها، قفل PC، تایمرها، بوفه، چاپ حرارتی و کنترل سخت‌افزار</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="/BAZINO_PRO_System_Report.md"
                      download="BAZINO_PRO_System_Report.md"
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
                    >
                      <Download className="w-4 h-4" />
                      <span>دانلود فایل Markdown</span>
                    </a>
                  </div>
                </div>

                {/* Website Report */}
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-100">۲. سند معرفی امکانات و ویژگی‌های وب‌سایت (Web Portal)</h4>
                      <p className="text-[11px] text-zinc-400">شامل رزرو آنلاین دستگاه‌ها، درگاه بانکی، شارژ آنلاین کیف پول و وب‌هوک API</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="/BAZINO_PRO_Website_Features.md"
                      download="BAZINO_PRO_Website_Features.md"
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
                    >
                      <Download className="w-4 h-4" />
                      <span>دانلود فایل وب‌سایت</span>
                    </a>
                  </div>
                </div>

                {/* Mobile App Report */}
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-100">۳. سند معرفی امکانات اپلیکیشن موبایل (iOS & Android)</h4>
                      <p className="text-[11px] text-zinc-400">اپلیکیشن بازیکنان (کارت عضویت QR) + اپلیکیشن مدیریت از راه دور (آیفون ۱۴ پرو)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="/BAZINO_PRO_MobileApp_Features.md"
                      download="BAZINO_PRO_MobileApp_Features.md"
                      className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
                    >
                      <Download className="w-4 h-4" />
                      <span>دانلود فایل اپلیکیشن</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTestingApi}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isTestingApi ? 'animate-spin' : ''}`} />
            <span>{isTestingApi ? 'در حال تست اتصال به REST API...' : 'تست اتصال و همگام‌سازی هم‌اکنون'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-zinc-800 rounded-xl text-zinc-300 hover:bg-zinc-800 text-xs font-bold"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
