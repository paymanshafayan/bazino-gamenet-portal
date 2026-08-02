import React from 'react';
import { Play, Pause, Square, Gamepad2, Gamepad, Monitor, Glasses, CircleDot, Clock, ArrowRightLeft, Coffee, DollarSign, Bell, AlertTriangle, ShieldAlert, Tag, User, Edit2 } from 'lucide-react';
import { Station, TariffRate, CurrencyCode } from '../types';
import { formatCurrency, formatTimerSeconds, calculateGameCost } from '../utils/formatters';

interface StationCardProps {
  station: Station;
  tariffs: TariffRate[];
  currency: CurrencyCode;
  onStartSession: (station: Station) => void;
  onPauseResume: (stationId: string) => void;
  onChangeTariffMidGame: (station: Station) => void;
  onTransferStation: (station: Station) => void;
  onAddBuffetServices: (station: Station) => void;
  onCheckoutSession: (station: Station) => void;
  onEditStation?: (station: Station) => void;
}

export const StationCard: React.FC<StationCardProps> = ({
  station,
  tariffs,
  currency,
  onStartSession,
  onPauseResume,
  onChangeTariffMidGame,
  onTransferStation,
  onAddBuffetServices,
  onCheckoutSession,
  onEditStation,
}) => {
  const currentTariff = tariffs.find((t) => t.id === station.currentTariffId) || tariffs[0];
  const activeSession = station.activeSession;

  // Render station icon based on type
  const renderIcon = () => {
    switch (station.type) {
      case 'PS5_VIP':
        return <Gamepad2 className="w-6 h-6 text-amber-400" />;
      case 'PS5_REGULAR':
        return <Gamepad className="w-6 h-6 text-blue-400" />;
      case 'PC_GAMING':
        return <Monitor className="w-6 h-6 text-cyan-400" />;
      case 'VR':
        return <Glasses className="w-6 h-6 text-purple-400" />;
      case 'BILLIARDS':
        return <CircleDot className="w-6 h-6 text-emerald-400" />;
      default:
        return <Gamepad2 className="w-6 h-6 text-amber-400" />;
    }
  };

  // Calculate remaining seconds if duration target is set
  let remainingSeconds: number | null = null;
  let isWarning = false;
  let isEnded = false;

  if (activeSession) {
    if (activeSession.durationMinutes) {
      const totalAllowedSeconds = activeSession.durationMinutes * 60;
      remainingSeconds = totalAllowedSeconds - activeSession.elapsedSeconds;
      if (remainingSeconds <= 0) {
        isEnded = true;
        remainingSeconds = 0;
      } else if (remainingSeconds <= 5 * 60) {
        isWarning = true; // less than 5 minutes
      }
    }
  }

  // Calculate live game cost
  const elapsedMinutes = activeSession ? Math.ceil(activeSession.elapsedSeconds / 60) : 0;
  const gameCost = activeSession
    ? calculateGameCost(elapsedMinutes, activeSession.currentHourlyRate)
    : 0;

  // Calculate buffet/extra services total
  const servicesTotal = activeSession
    ? activeSession.services.reduce((acc, s) => acc + s.price * s.qty, 0)
    : 0;

  const totalCurrentBill = gameCost + servicesTotal;

  // Warning Light Indicator Color
  const getStatusLightClass = () => {
    if (station.status === 'IDLE') return 'bg-zinc-700 shadow-none';
    if (station.status === 'PAUSED') return 'bg-amber-500 shadow-amber-500/50';
    if (isEnded || station.status === 'FINISHED') return 'bg-red-500 animate-ping shadow-red-500/80';
    if (isWarning) return 'bg-yellow-400 animate-pulse shadow-yellow-400/80';
    return 'bg-emerald-500 shadow-emerald-500/50'; // Normal playing (Green)
  };

  return (
    <div
      className={`relative rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden ${
        isEnded || station.status === 'FINISHED'
          ? 'bg-red-950/20 border-red-500/60 shadow-xl shadow-red-500/10 timer-warning-pulse'
          : station.status === 'PLAYING'
          ? 'bg-zinc-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5'
          : station.status === 'PAUSED'
          ? 'bg-zinc-900/70 border-amber-500/30'
          : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
      }`}
    >
      {/* Top Header Row with Status Light */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-center">
            {renderIcon()}
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
              <span>{station.name}</span>
            </h3>
            <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-amber-400">
                <Tag className="w-3 h-3" />
                {currentTariff?.name || 'تعرفه پایه'} ({formatCurrency(currentTariff?.hourlyRate || 0, currency)}/ساعت)
              </span>
            </div>
          </div>
        </div>

        {/* Status Indicator Warning Light and Edit Button */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {onEditStation && (
            <button
              onClick={() => onEditStation(station)}
              className="px-2.5 py-1 bg-zinc-800/90 hover:bg-amber-500 hover:text-zinc-950 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm whitespace-nowrap"
              title="ویرایش و مدیریت کامل مشخصات و حذف ایستگاه"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>ویرایش / حذف</span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                station.status === 'IDLE'
                  ? 'bg-zinc-800 text-zinc-400'
                  : station.status === 'PAUSED'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : isEnded
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {station.status === 'IDLE'
                ? 'خالی'
                : station.status === 'PAUSED'
                ? 'توقف موقت'
                : isEnded
                ? 'زمان تمام شد!'
                : 'در حال بازی'}
            </span>

            <div
              className={`w-3.5 h-3.5 rounded-full transition-all shrink-0 ${getStatusLightClass()}`}
              title="چراغ وضعیت دستگاه (سبز: فعال / زرد: هشدار / قرمز: پایان)"
            />
          </div>
        </div>
      </div>

      {/* Main Active Timer Display */}
      <div className="p-4 flex-1 flex flex-col justify-center">
        {station.status !== 'IDLE' && activeSession ? (
          <div className="space-y-3">
            {/* Customer & Session Badge */}
            <div className="flex items-center justify-between text-xs bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-zinc-100">
                  {activeSession.customerName || 'مشتری عمومی (آزاد)'}
                </span>
              </div>
              <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">
                {activeSession.paymentType === 'PRE_PAY' ? 'پیش‌پرداخت' : 'اعتباری / پس‌پرداخت'}
              </span>
            </div>

            {/* Live Clock / Countdown Display */}
            <div className="text-center py-2 bg-gradient-to-b from-zinc-950/80 to-zinc-900/80 rounded-xl border border-zinc-800/80">
              <div className="text-[10px] text-zinc-400 mb-1 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                {remainingSeconds !== null ? 'زمان باقیمانده (معکوس):' : 'مدت زمان گذشته:'}
              </div>

              <div
                className={`text-3xl font-black font-mono tracking-widest ${
                  isEnded
                    ? 'text-red-500 animate-bounce'
                    : isWarning
                    ? 'text-yellow-400'
                    : 'text-amber-400'
                }`}
              >
                {remainingSeconds !== null
                  ? formatTimerSeconds(remainingSeconds)
                  : formatTimerSeconds(activeSession.elapsedSeconds)}
              </div>

              {activeSession.durationMinutes && (
                <div className="w-full bg-zinc-800 h-1.5 mt-3 rounded-full overflow-hidden px-1">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isEnded ? 'bg-red-500' : isWarning ? 'bg-yellow-400' : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (activeSession.elapsedSeconds / (activeSession.durationMinutes * 60)) * 100
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Bill Summary Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-950/40 p-2 rounded-lg border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">هزینه بازی:</span>
                <span className="font-bold text-zinc-200">
                  {formatCurrency(gameCost, currency)}
                </span>
              </div>
              <div className="bg-zinc-950/40 p-2 rounded-lg border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">بوفه و خدمات ({activeSession.services.length}):</span>
                <span className="font-bold text-amber-400">
                  {formatCurrency(servicesTotal, currency)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-zinc-500">
            <Gamepad2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs">دستگاه آماده شروع بازی جدید است</p>
          </div>
        )}
      </div>

      {/* Action Buttons Row */}
      <div className="p-3 bg-zinc-950/80 border-t border-zinc-800/80 gap-2 flex flex-col">
        {station.status === 'IDLE' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStartSession(station)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-300 text-zinc-950 font-bold text-xs hover:from-amber-400 hover:to-amber-200 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Play className="w-4 h-4 fill-zinc-950" />
              <span>شروع تایم بازی</span>
            </button>

            {onEditStation && (
              <button
                onClick={() => onEditStation(station)}
                className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-800 text-amber-400 rounded-xl transition-all flex items-center justify-center"
                title="ویرایش و حذف این دستگاه"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Primary Control Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onPauseResume(station.id)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  station.status === 'PAUSED'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                }`}
              >
                {station.status === 'PAUSED' ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-emerald-400" />
                    <span>ادامه تایم</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>توقف تایم</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onCheckoutSession(station)}
                className="py-2 px-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-red-400" />
                <span>پایان و تسویه ({formatCurrency(totalCurrentBill, currency)})</span>
              </button>
            </div>

            {/* Quick Secondary Actions */}
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <button
                onClick={() => onAddBuffetServices(station)}
                className="py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg flex items-center justify-center gap-1"
                title="افزایش خریدهای بوفه و خدمات به فاکتور"
              >
                <Coffee className="w-3 h-3 text-amber-400" />
                <span>افزایش بوفه</span>
              </button>

              <button
                onClick={() => onChangeTariffMidGame(station)}
                className="py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg flex items-center justify-center gap-1"
                title="تغییر تعرفه ایستگاه در حین بازی"
              >
                <Tag className="w-3 h-3 text-cyan-400" />
                <span>تغییر تعرفه</span>
              </button>

              <button
                onClick={() => onTransferStation(station)}
                className="py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg flex items-center justify-center gap-1"
                title="انتقال صورت‌حساب به ایستگاه دیگر"
              >
                <ArrowRightLeft className="w-3 h-3 text-purple-400" />
                <span>جابه‌جایی</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
