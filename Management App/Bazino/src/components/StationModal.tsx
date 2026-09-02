import React, { useState } from 'react';
import { X, Play, DollarSign, Clock, User, Tag, ShieldCheck, Sparkles } from 'lucide-react';
import { Station, TariffRate, Customer, PaymentType, CurrencyCode } from '../types';
import { formatCurrency, CURRENCY_SYMBOLS, getActiveHourlyRate } from '../utils/formatters';
import { useModalDismiss } from '../hooks/useModalDismiss';

interface StationModalProps {
  station: Station;
  tariffs: TariffRate[];
  customers: Customer[];
  currency: CurrencyCode;
  onClose: () => void;
  onConfirmStart: (params: {
    stationId: string;
    tariffId: string;
    customerId?: string;
    customerName?: string;
    durationMinutes?: number;
    paidAmountTarget?: number;
    paymentType: PaymentType;
    customHourlyRate?: number;
  }) => void;
}

export const StationModal: React.FC<StationModalProps> = ({
  station,
  tariffs,
  customers,
  currency,
  onClose,
  onConfirmStart,
}) => {
  // این مودال فقط وقتی باز است mount می‌شود، پس isOpen همیشه true است.
  useModalDismiss(true, onClose);

  const [mode, setMode] = useState<'AMOUNT' | 'DURATION' | 'OPEN'>('AMOUNT');
  const [selectedTariffId, setSelectedTariffId] = useState<string>(station.currentTariffId || tariffs[0]?.id || 't1');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentType, setPaymentType] = useState<PaymentType>('POST_PAY');
  const [controllerCount, setControllerCount] = useState<number>(1); // 1, 2, or 4 controllers
  
  // Controller multiplier
  const controllerMultiplier = controllerCount === 4 ? 1.5 : controllerCount === 2 ? 1.2 : 1.0;

  // Amounts preset (e.g. 50 ₺, 100 ₺, 150 ₺, 200 ₺)
  const [amountInput, setAmountInput] = useState<number>(100);
  // Duration preset (minutes e.g., 60, 120, 180)
  const [durationInput, setDurationInput] = useState<number>(60);

  const activeTariff = tariffs.find((t) => t.id === selectedTariffId) || tariffs[0];
  // Applies the tariff's real time-of-day special rate (e.g. a cheaper
  // overnight rate) automatically when a session is started within that
  // window — this used to be configurable but never actually applied.
  const baseHourlyRate = activeTariff ? getActiveHourlyRate(activeTariff) : 0;
  const isSpecialRateActive = activeTariff ? baseHourlyRate !== activeTariff.hourlyRate : false;
  const effectiveHourlyRate = baseHourlyRate * controllerMultiplier;
  const activeCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Calculate calculated duration in minutes based on paid amount target
  const calculatedMinutesFromAmount = effectiveHourlyRate > 0
    ? Math.round((amountInput / effectiveHourlyRate) * 60)
    : 0;

  // Calculate cost from duration
  const calculatedCostFromDuration = effectiveHourlyRate > 0
    ? Math.round((durationInput / 60) * effectiveHourlyRate)
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let durationMinutes: number | undefined = undefined;
    let paidAmountTarget: number | undefined = undefined;

    if (mode === 'AMOUNT') {
      durationMinutes = calculatedMinutesFromAmount;
      paidAmountTarget = amountInput;
    } else if (mode === 'DURATION') {
      durationMinutes = durationInput;
      paidAmountTarget = calculatedCostFromDuration;
    }

    onConfirmStart({
      stationId: station.id,
      tariffId: selectedTariffId,
      customerId: selectedCustomerId || undefined,
      customerName: activeCustomer ? activeCustomer.name : undefined,
      durationMinutes,
      paidAmountTarget,
      paymentType,
      customHourlyRate: effectiveHourlyRate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
              <Play className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-100">
                شروع بازی در {station.name}
              </h3>
              <p className="text-xs text-zinc-400">تعیین زمان، مبلغ پرداختی و عضویت مشتری</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Tariff Selection */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-amber-400" />
              <span>انتخاب تعرفه نرخ ساعت:</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {tariffs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTariffId(t.id)}
                  className={`p-3 rounded-xl border text-right transition-all ${
                    selectedTariffId === t.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xs">{t.name}</div>
                  <div className="text-[11px] opacity-80 mt-1">
                    {formatCurrency(t.hourlyRate, currency)} / ساعت
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Controller Count Detection & Multiplier */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>تعداد دسته/کنترلرهای فعال:</span>
              </span>
              <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1.5">
                {isSpecialRateActive && (
                  <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[9px] font-bold">
                    نرخ ویژه ساعتی فعال
                  </span>
                )}
                <span>نرخ نهایی: {formatCurrency(effectiveHourlyRate, currency)} / ساعت</span>
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { count: 1, label: '۱ دسته (تک‌نفره)', mult: '۱.۰× پایه' },
                { count: 2, label: '۲ دسته (دونفره)', mult: '۱.۲× ضریب' },
                { count: 4, label: '۴ دسته (چهارنفره)', mult: '۱.۵× ضریب' },
              ].map((c) => (
                <button
                  key={c.count}
                  type="button"
                  onClick={() => setControllerCount(c.count)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    controllerCount === c.count
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xs">{c.label}</div>
                  <div className="text-[10px] text-amber-400 font-mono mt-0.5">{c.mult}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mode Selector (Amount vs Duration vs Open-ended) */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>نحوه تعیین تایم بازی:</span>
            </label>

            <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setMode('AMOUNT')}
                className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'AMOUNT'
                    ? 'bg-amber-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                براساس مبلغ پرداختی
              </button>

              <button
                type="button"
                onClick={() => setMode('DURATION')}
                className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'DURATION'
                    ? 'bg-amber-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                براساس زمان (ساعت/دقیقه)
              </button>

              <button
                type="button"
                onClick={() => setMode('OPEN')}
                className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'OPEN'
                    ? 'bg-amber-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                تایم آزاد (باز)
              </button>
            </div>
          </div>

          {/* Mode Specific Controls */}
          {mode === 'AMOUNT' && (
            <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">ورود مبلغ پرداختی مشتری:</span>
                <span className="text-amber-400 font-bold">
                  محاسبه: {calculatedMinutesFromAmount} دقیقه بازی
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={amountInput}
                  onChange={(e) => setAmountInput(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-lg font-bold text-amber-400 focus:outline-none focus:border-amber-500 text-center"
                />
                <span className="absolute left-3 top-3 text-xs text-zinc-400 font-semibold">
                  {CURRENCY_SYMBOLS[currency]?.symbol}
                </span>
              </div>

              {/* Quick Preset Amount Chips */}
              <div className="flex items-center gap-2 pt-1">
                {[50, 100, 150, 200, 300].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountInput(amt)}
                    className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 font-semibold"
                  >
                    {amt} {CURRENCY_SYMBOLS[currency]?.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'DURATION' && (
            <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">مدت زمان بازی (دقیقه):</span>
                <span className="text-amber-400 font-bold">
                  مبلغ فاکتور: {formatCurrency(calculatedCostFromDuration, currency)}
                </span>
              </div>

              <input
                type="number"
                min="15"
                step="15"
                value={durationInput}
                onChange={(e) => setDurationInput(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-lg font-bold text-amber-400 focus:outline-none focus:border-amber-500 text-center"
              />

              {/* Preset Duration Chips */}
              <div className="flex items-center gap-2 pt-1">
                {[
                  { label: 'نیم ساعت', mins: 30 },
                  { label: '۱ ساعت', mins: 60 },
                  { label: '۱.۵ ساعت', mins: 90 },
                  { label: '۲ ساعت', mins: 120 },
                  { label: '۳ ساعت', mins: 180 },
                ].map((item) => (
                  <button
                    key={item.mins}
                    type="button"
                    onClick={() => setDurationInput(item.mins)}
                    className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-[11px] text-zinc-200 font-semibold"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'OPEN' && (
            <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/30 text-xs text-amber-300">
              تایم بدون محدودیت زمانی آغاز می‌شود و محاسبه بر مبنای دقیقه‌های بازی صورت خواهد گرفت.
            </div>
          )}

          {/* Customer Profile Selection & Wallet Bonus */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-amber-400" />
              <span>انتخاب مشتری (جهت کیف‌پول و تخفیف وفاداری):</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">مشتری متفرقه / عمومی (بدون حساب)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.rank} - شارژ کیف‌پول: {formatCurrency(c.walletBalance, currency)})
                  {c.isBirthdayToday ? ' 🎂 امروز تولدشه!' : ''}
                </option>
              ))}
            </select>

            {activeCustomer && (
              <div className="mt-2 p-2.5 bg-zinc-950/80 rounded-xl border border-amber-500/20 text-xs flex items-center justify-between">
                <div>
                  <span className="text-amber-400 font-bold">{activeCustomer.name}</span>
                  <span className="text-zinc-400 text-[10px] block">
                    موجودی کیف‌پول: {formatCurrency(activeCustomer.walletBalance, currency)}
                  </span>
                </div>
                {activeCustomer.isBirthdayToday && (
                  <div className="text-[10px] bg-amber-500 text-zinc-950 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> تخفیف ماه تولد!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Type Selection */}
          <div className="flex items-center justify-between bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 text-xs">
            <span className="text-zinc-300">حالت پرداخت:</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="paymentType"
                  value="POST_PAY"
                  checked={paymentType === 'POST_PAY'}
                  onChange={() => setPaymentType('POST_PAY')}
                  className="accent-amber-500"
                />
                <span className="text-zinc-200">تسویه بعد از بازی</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="paymentType"
                  value="PRE_PAY"
                  checked={paymentType === 'PRE_PAY'}
                  onChange={() => setPaymentType('PRE_PAY')}
                  className="accent-amber-500"
                />
                <span className="text-zinc-200">پرداخت قبل از بازی</span>
              </label>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-300 hover:from-amber-400 hover:to-amber-200 text-zinc-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-zinc-950" />
            <span>تایید و شروع تایم بازی</span>
          </button>
        </form>
      </div>
    </div>
  );
};
