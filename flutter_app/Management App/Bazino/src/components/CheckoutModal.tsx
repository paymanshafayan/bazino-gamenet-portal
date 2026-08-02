import React, { useState } from 'react';
import { X, CheckCircle, CreditCard, DollarSign, Wallet, AlertCircle, Printer, Sparkles, Plus, Minus } from 'lucide-react';
import { Station, Customer, PaymentMethod, CurrencyCode, Invoice } from '../types';
import { formatCurrency, calculateBlendedGameCost, applyAmountRounding, CURRENCY_SYMBOLS } from '../utils/formatters';

interface CheckoutModalProps {
  station: Station;
  customers: Customer[];
  currency: CurrencyCode;
  operatorName: string;
  onClose: () => void;
  onConfirmCheckout: (invoice: Invoice) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  station,
  customers,
  currency,
  operatorName,
  onClose,
  onConfirmCheckout,
}) => {
  const activeSession = station.activeSession;
  if (!activeSession) return null;

  const elapsedMinutes = Math.ceil(activeSession.elapsedSeconds / 60);
  const rawGameCost = calculateBlendedGameCost(activeSession);
  const buffetCost = activeSession.services.reduce((acc, s) => acc + s.price * s.qty, 0);

  // Customer match
  const customer = customers.find((c) => c.id === activeSession.customerId);

  // Discount calculation
  let discountPercentage = 0;
  if (customer) {
    if (customer.rank === 'برنز') discountPercentage = 5;
    else if (customer.rank === 'نقره') discountPercentage = 10;
    else if (customer.rank === 'طلایی') discountPercentage = 15;
    else if (customer.rank === 'الماس') discountPercentage = 20;

    if (customer.isBirthdayToday || customer.isBirthdayThisMonth) {
      discountPercentage += 10; // Extra birthday discount!
    }
  }

  const subtotal = rawGameCost + buffetCost;
  const discountAmount = Math.round((subtotal * discountPercentage) / 100);
  const totalBeforeRounding = subtotal - discountAmount;

  // Rounding selection
  const [roundingMode, setRoundingMode] = useState<'EXACT' | 'ROUND_UP_5' | 'ROUND_DOWN_5' | 'ROUND_NEAREST_10'>('EXACT');
  const { finalAmount, roundedDifference } = applyAmountRounding(totalBeforeRounding, roundingMode);

  // Payment method selection
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashPaidInput, setCashPaidInput] = useState<number>(finalAmount);
  const [posPaidInput, setPosPaidInput] = useState<number>(0);

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === 'CASH') {
      setCashPaidInput(finalAmount);
      setPosPaidInput(0);
    } else if (method === 'POS') {
      setCashPaidInput(0);
      setPosPaidInput(finalAmount);
    } else if (method === 'SPLIT') {
      const half = Math.round(finalAmount / 2);
      setCashPaidInput(half);
      setPosPaidInput(finalAmount - half);
    } else {
      setCashPaidInput(0);
      setPosPaidInput(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMethod === 'WALLET' && customer && customer.walletBalance - finalAmount < 0) {
      const proceed = confirm(
        `موجودی کیف‌پول ${customer.name} کافی نیست و با این تسویه به بدهکار می‌رود. آیا مطمئن هستید؟`
      );
      if (!proceed) return;
    }

    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      stationId: station.id,
      stationName: station.name,
      customerId: activeSession.customerId,
      customerName: activeSession.customerName || 'مشتری عمومی',
      startTime: new Date(activeSession.startTime).toLocaleTimeString('fa-IR'),
      endTime: new Date().toLocaleTimeString('fa-IR'),
      playDurationMinutes: elapsedMinutes,
      gameCost: rawGameCost,
      buffetCost,
      extraServicesCost: 0,
      discountAmount,
      totalAmount: finalAmount,
      paymentMethod,
      cashPaid: paymentMethod === 'CASH' ? finalAmount : paymentMethod === 'SPLIT' ? cashPaidInput : 0,
      posPaid: paymentMethod === 'POS' ? finalAmount : paymentMethod === 'SPLIT' ? posPaidInput : 0,
      walletPaid: paymentMethod === 'WALLET' ? finalAmount : 0,
      roundingAmount: roundedDifference,
      operatorName,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
    };

    onConfirmCheckout(invoice);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-100">
                تسویه حساب و صدور فاکتور: {station.name}
              </h3>
              <p className="text-xs text-zinc-400">محاسبه دقیق زمان، بوفه و تفکیک پرداخت</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Customer Profile Banner */}
          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-zinc-400 block text-[10px]">نام مشتری:</span>
              <span className="font-bold text-amber-400 text-sm">
                {activeSession.customerName || 'مشتری عمومی (آزاد)'}
              </span>
            </div>
            {customer && (
              <div className="text-right">
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold rounded-md text-[11px]">
                  رتبه: {customer.rank} ({discountPercentage}% تخفیف)
                </span>
              </div>
            )}
          </div>

          {/* Itemized Calculation List */}
          <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800 space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-zinc-300">
              <span>کارکرد بازی ({elapsedMinutes} دقیقه):</span>
              <span className="font-mono font-bold">{formatCurrency(rawGameCost, currency)}</span>
            </div>

            {activeSession.services.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                <div className="text-[10px] text-amber-400 font-semibold">اقلام بوفه و خدمات:</div>
                {activeSession.services.map((s) => (
                  <div key={s.id} className="flex justify-between text-zinc-400 text-[11px]">
                    <span>{s.name} ({s.qty}x)</span>
                    <span className="font-mono">{formatCurrency(s.price * s.qty, currency)}</span>
                  </div>
                ))}
              </div>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between items-center text-emerald-400 pt-2 border-t border-zinc-800/80">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> تخفیف ویژه وفاداری/تولد:
                </span>
                <span className="font-mono font-bold">-{formatCurrency(discountAmount, currency)}</span>
              </div>
            )}

            {/* Rounding Selection */}
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <span className="text-zinc-400 text-[11px] block">تنظیم رند کردن مبلغ کل:</span>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { mode: 'EXACT', label: 'دقیق' },
                  { mode: 'ROUND_UP_5', label: 'گرد به بالا (۵)' },
                  { mode: 'ROUND_DOWN_5', label: 'گرد به پایین (۵)' },
                  { mode: 'ROUND_NEAREST_10', label: 'گرد ۱۰ لیر' },
                ].map((r) => (
                  <button
                    key={r.mode}
                    type="button"
                    onClick={() => setRoundingMode(r.mode as any)}
                    className={`py-1.5 text-[10px] font-semibold rounded-lg border transition-all ${
                      roundingMode === r.mode
                        ? 'bg-amber-500 text-zinc-950 font-bold border-amber-500'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Final Amount Highlight */}
            <div className="flex justify-between items-center bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 text-amber-400 font-extrabold text-base pt-3">
              <span>مبلغ قابل پرداخت:</span>
              <span className="font-mono text-xl">{formatCurrency(finalAmount, currency)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">روش تسویه فاکتور:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handlePaymentMethodChange('CASH')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">نقد (صندوق)</span>
              </button>

              <button
                type="button"
                onClick={() => handlePaymentMethodChange('POS')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  paymentMethod === 'POS'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-xs">کارتخوان POS</span>
              </button>

              <button
                type="button"
                onClick={() => handlePaymentMethodChange('SPLIT')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  paymentMethod === 'SPLIT'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">ترکیبی (نقد+کارت)</span>
              </button>

              <button
                type="button"
                onClick={() => handlePaymentMethodChange('WALLET')}
                disabled={!customer}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  paymentMethod === 'WALLET'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 disabled:opacity-40'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span className="text-xs">کیف‌پول اعتباری</span>
              </button>
            </div>
          </div>

          {/* Real wallet balance + debt warning */}
          {paymentMethod === 'WALLET' && customer && (
            <div
              className={`p-3 rounded-xl border text-xs space-y-1 ${
                customer.walletBalance - finalAmount < 0
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <div className="flex justify-between font-bold">
                <span>موجودی فعلی کیف‌پول:</span>
                <span className="font-mono">{formatCurrency(customer.walletBalance, currency)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>موجودی بعد از این تسویه:</span>
                <span className="font-mono">{formatCurrency(customer.walletBalance - finalAmount, currency)}</span>
              </div>
              {customer.walletBalance - finalAmount < 0 && (
                <div className="flex items-center gap-1.5 pt-1 border-t border-red-500/20">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>این تسویه، حساب مشتری را به بدهکار می‌برد. برای ادامه باید تایید کنید.</span>
                </div>
              )}
            </div>
          )}

          {/* Split Cash vs POS Inputs */}
          {paymentMethod === 'SPLIT' && (
            <div className="grid grid-cols-2 gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">مبلغ نقد (₺):</label>
                <input
                  type="number"
                  value={cashPaidInput}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCashPaidInput(val);
                    setPosPaidInput(Math.max(0, finalAmount - val));
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs font-bold text-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">مبلغ کارتخوان (₺):</label>
                <input
                  type="number"
                  value={posPaidInput}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPosPaidInput(val);
                    setCashPaidInput(Math.max(0, finalAmount - val));
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs font-bold text-blue-400 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold"
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>ثبت نهایی تسویه و آزاد کردن دستگاه</span>
          </button>
        </div>
      </div>
    </div>
  );
};
