import { useOps } from '../../../../shared/management/context';
import type { OpsTab } from '../../../../shared/management/types';
import React from 'react';
import { Gamepad2, Shield, Wallet, Users, Coffee, BarChart3, Settings, RefreshCw, Volume2, VolumeX, ShieldAlert, Crown, Sparkles, MapPin, Cpu, Minimize2, Square, X, Monitor, Wifi, FileText, Download, HelpCircle } from 'lucide-react';
import { Operator, AppTheme, SoundAlarmConfig, CurrencyCode } from '../types';
import { CURRENCY_SYMBOLS, formatCurrency } from '../utils/formatters';

interface HeaderProps {
  activeTab: OpsTab;
  setActiveTab: (tab: OpsTab) => void;
  activeOperator: Operator;
  operators: Operator[];
  onSwitchOperator: (op: Operator) => void;
  soundConfig: SoundAlarmConfig;
  onToggleSound: () => void;
  currentTheme: AppTheme;
  onOpenThemesModal: () => void;
  currency: CurrencyCode;
  onChangeCurrency: (c: CurrencyCode) => void;
  webSyncConnected: boolean;
  pendingReservationsCount?: number;
  onOpenWebSyncModal: () => void;
  todayTotalRevenue: number;
  activeStationsCount: number;
  totalStationsCount: number;
  birthdayCountToday: number;
  onOpenHardwareModal?: () => void;
  onOpenHelpGuide: () => void;
}

/**
 * آدرسی که اپراتور باید برای رسیدن به این سرور از دستگاه دیگری وارد کند.
 *
 * قبلاً این متن هاردکد بود («آفلاین LAN: 192.168.1.100:3000») و هیچ ربطی به پورت واقعی
 * نداشت — نسخه‌ی دسکتاپ روی پورت دیگری بالا می‌آمد و هدر همچنان ۳۰۰۰ نشان می‌داد،
 * که برای کسی که می‌خواهد از صندوق یا گوشی وصل شود مستقیماً گمراه‌کننده است.
 * حالا از خودِ آدرس صفحه خوانده می‌شود.
 */
function getServerAddressLabel(): string {
  if (typeof window === 'undefined') return 'LAN: —';
  const { hostname, port, protocol } = window.location;
  const shown = port ? `${hostname}:${port}` : `${hostname}${protocol === 'https:' ? ':443' : ''}`;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
  return `${isLocal ? 'آفلاین LAN' : 'آنلاین'}: ${shown}`;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeOperator,
  operators,
  onSwitchOperator,
  soundConfig,
  onToggleSound,
  currentTheme,
  onOpenThemesModal,
  currency,
  onChangeCurrency,
  webSyncConnected,
  pendingReservationsCount = 0,
  onOpenWebSyncModal,
  todayTotalRevenue,
  activeStationsCount,
  totalStationsCount,
  birthdayCountToday,
  onOpenHardwareModal,
  onOpenHelpGuide,
}) => {
  const { can } = useOps();
  const serverAddressLabel = getServerAddressLabel();

  const [showOpMenu, setShowOpMenu] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-amber-500/20 shadow-xl">
      {/* Desktop App Window TitleBar (Electron / WPF Desktop Simulation) */}
      <div className="bg-zinc-950 border-b border-zinc-900 px-3 py-1 flex items-center justify-between text-[11px] text-zinc-400 select-none">
        <div className="flex items-center gap-2">
          {/* Windows-style Controls */}
          <div className="flex items-center gap-1.5 ml-2">
            <button className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors" title="بستن نرم‌افزار" />
            <button className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors" title="کوچک‌سازی" />
            <button className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors" title="تمام صفحه" />
          </div>

          <div className="flex items-center gap-2 pr-2 border-r border-zinc-800">
            <Monitor className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-zinc-300">BAZINO PRO Desktop v4.2.0 (نرم‌افزار دسکتاپ سرور گیم‌نت)</span>
            <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono">
              {serverAddressLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/BAZINO_PRO_System_Report.md"
            download="BAZINO_PRO_System_Report.md"
            className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold transition-all flex items-center gap-1"
            title="دانلود سند کامل گزارش امکانات و نیازمندی‌های فنی BAZINO PRO"
          >
            <Download className="w-3 h-3" />
            <span>دانلود گزارش فنی (.md)</span>
          </a>

          <div className="flex items-center gap-1.5 text-zinc-400">
            <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>پایگاه داده محلی (SQLite / PostgreSQL) : متصل</span>
          </div>
          {onOpenHardwareModal && (
            <button
              onClick={onOpenHardwareModal}
              className="text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold transition-all flex items-center gap-1"
            >
              <Cpu className="w-3 h-3" />
              <span>پورت سریال COM / رله‌ها</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Banner with Brand Logo & Quick Metrics */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Logo & Cyprus Badge */}
        <div className="flex items-center gap-3">
          {/* Custom Crown & Shield Logo Icon matching BAZINO PRO */}
          <div className="relative group cursor-pointer" onClick={() => setActiveTab('stations')}>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center relative overflow-hidden">
                <Crown className="w-7 h-7 text-amber-400 drop-shadow-[0_2px_8px_rgba(234,179,8,0.5)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent pointer-events-none" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-wider gold-gradient-text">
                BAZINO PRO
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> نسخه کلوپ
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="flex items-center gap-1 text-zinc-300">
                <MapPin className="w-3 h-3 text-amber-500" /> قبرس شمالی (North Cyprus)
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-emerald-400 font-medium">سرور محلی فعال</span>
            </div>
          </div>
        </div>

        {/* Center Live Metrics */}
        <div className="hidden lg:flex items-center gap-4 bg-zinc-900/80 px-4 py-2 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-400">ایستگاه‌های فعال</div>
              <div className="text-xs font-bold text-zinc-100">
                {activeStationsCount} از {totalStationsCount} دستگاه
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-zinc-800" />

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-400">درآمد امروز</div>
              <div className="text-xs font-bold text-emerald-400">
                {formatCurrency(todayTotalRevenue, currency)}
              </div>
            </div>
          </div>

          {birthdayCountToday > 0 && (
            <>
              <div className="h-6 w-px bg-zinc-800" />
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 animate-pulse">
                <span>🎂</span>
                <span>تولد {birthdayCountToday} مشتری امروز!</span>
              </div>
            </>
          )}
        </div>

        {/* Right Tools (Currency, Sound, Operator, Web Sync, Theme) */}
        <div className="flex items-center gap-2">
          {/* Currency Switcher */}
          <select
            value={currency}
            onChange={(e) => onChangeCurrency(e.target.value as CurrencyCode)}
            className="bg-zinc-900 text-xs text-zinc-200 border border-zinc-700 rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-500"
            title="تغییر واحد پول"
          >
            {Object.entries(CURRENCY_SYMBOLS).filter(([code]) => code === 'TRY').map(([code, info]) => (
              <option key={code} value={code}>
                {info.label}
              </option>
            ))}
          </select>

          {/* Sound Alarm Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-lg border transition-all text-xs flex items-center gap-1.5 ${
              soundConfig.enabled
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
            }`}
            title={soundConfig.enabled ? 'هشدار صوتی فعال است' : 'هشدار صوتی غیرفعال است'}
          >
            {soundConfig.enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Full Visual Guide */}
          <button
            onClick={onOpenHelpGuide}
            className="px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
            title="راهنمای تصویری کامل نرم‌افزار"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">راهنما</span>
          </button>

          {/* Web Sync Status */}
          <button
            onClick={onOpenWebSyncModal}
            className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all relative ${
              webSyncConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="وضعیت همگام‌سازی با سایت اصلی BAZINO PRO"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${webSyncConnected ? '' : 'animate-spin'}`} />
            <span className="hidden sm:inline">همگام وب</span>
            {pendingReservationsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-zinc-950 font-black rounded-full text-[10px] animate-bounce">
                {pendingReservationsCount}
              </span>
            )}
          </button>

          {/* Themes Switcher Button */}
          <button
            onClick={onOpenThemesModal}
            className="p-2 rounded-lg bg-zinc-900 text-amber-400 border border-zinc-800 hover:border-amber-500/50 transition-all text-xs"
            title="تغییر تم و تنظیمات آلارم"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Operator Role Menu */}
          <div className="relative">
            <button
              onClick={() => setShowOpMenu(!showOpMenu)}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-xl transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-amber-200 flex items-center justify-center text-zinc-950 font-bold text-xs">
                {activeOperator.name.charAt(0)}
              </div>
              <div className="text-right text-xs">
                <div className="font-semibold text-zinc-200">{activeOperator.name}</div>
                <div className="text-[10px] text-amber-400">
                  {activeOperator.role === 'ADMIN' ? 'مدیر ارشد' : activeOperator.role === 'MANAGER' ? 'سرپرست' : 'اپراتور شیفت'}
                </div>
              </div>
            </button>

            {showOpMenu && (
              <div className="absolute left-0 mt-2 w-52 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-2 z-50">
                <div className="text-[10px] font-semibold text-zinc-400 px-2 py-1">تغییر شیفت / اپراتور:</div>
                {operators.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => {
                      onSwitchOperator(op);
                      setShowOpMenu(false);
                    }}
                    className={`w-full text-right px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      activeOperator.id === op.id
                        ? 'bg-amber-500/20 text-amber-400 font-bold'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{op.name}</span>
                    <span className="text-[10px] opacity-70">
                      {op.role === 'ADMIN' ? 'ADMIN' : 'OP'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="border-t border-zinc-900 bg-zinc-950/80 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('stations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'stations'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>ایستگاه‌های بازی ({totalStationsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('buffet')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'buffet'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>کافه</span>
          </button>

          <button onClick={() => setActiveTab('shop')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${activeTab==='shop'?'bg-amber-500 text-zinc-950':'text-zinc-400 hover:bg-zinc-900'}`}>فروشگاه</button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'customers'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>اعضا و کیف پول</span>
          </button>

          {can('affiliates') && <button onClick={() => setActiveTab('affiliates')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${activeTab==='affiliates'?'bg-amber-500 text-zinc-950':'text-zinc-400 hover:bg-zinc-900'}`}>همکاری در فروش</button>}
          {activeOperator.permissions.canAccessReports && (
            <button
              onClick={() => setActiveTab('accounting')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'accounting'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>حسابداری و نمودارها</span>
            </button>
          )}

          {activeOperator.permissions.canManageOperators && (
            <button
              onClick={() => setActiveTab('operators')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'operators'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>دسترسی اپراتورها</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>تنظیمات و تم‌ها</span>
          </button>
        </div>
      </div>
    </header>
  );
};
