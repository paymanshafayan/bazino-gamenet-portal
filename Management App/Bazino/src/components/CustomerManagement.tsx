import React, { useState } from 'react';
import { Users, UserPlus, Search, Wallet, Gift, Award, Plus, Minus, Phone, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Customer, WalletTransaction, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/formatters';

interface CustomerManagementProps {
  customers: Customer[];
  walletTransactions: WalletTransaction[];
  currency: CurrencyCode;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'rank' | 'registeredAt'>) => void;
  onUpdateWallet: (customerId: string, amount: number, type: 'CHARGE' | 'PAYMENT' | 'DEBT_SETTLEMENT' | 'BONUS_DISCOUNT' | 'CASHOUT', description: string) => void;
  onAttachAffiliate?: (phone: string, code: string) => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers,
  walletTransactions,
  currency,
  onAddCustomer,
  onUpdateWallet,
  onAttachAffiliate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState<Customer | null>(null);

  // New Customer Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('2000-01-01');
  const [initialCharge, setInitialCharge] = useState(0);
  const [notes, setNotes] = useState('');

  // Wallet Tx Modal State
  const [txAmount, setTxAmount] = useState(100);
  const [txType, setTxType] = useState<'CHARGE' | 'DEBT_SETTLEMENT' | 'CASHOUT'>('CHARGE');
  const [refCode, setRefCode] = useState('');
  const [txDescription, setTxDescription] = useState('');

  // Filtered
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddCustomer({
      name: name.trim(),
      phone: phone.trim(),
      birthDate,
      walletBalance: initialCharge,
      totalHoursPlayed: 0,
      notes: notes.trim(),
    });

    setName('');
    setPhone('');
    setShowAddModal(false);
  };

  const handleWalletTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showWalletModal || txAmount <= 0) return;

    // onUpdateWallet always takes a positive amount and decides the sign
    // itself based on `type` — both CHARGE (top-up) and DEBT_SETTLEMENT
    // (paying off existing debt) increase the balance.
    onUpdateWallet(
      showWalletModal.id,
      txAmount,
      txType,
      txDescription || (txType === 'CHARGE' ? 'شارژ دستی کیف‌پول' : txType === 'CASHOUT' ? 'نقد حضوری کیف‌پول' : 'تسویه بدهی حساب')
    );
    const code = refCode.trim();
    if (code && showWalletModal.phone && onAttachAffiliate) {
      onAttachAffiliate(showWalletModal.phone, code);
    }
    setRefCode('');
    setShowWalletModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-zinc-400">اعضای ثبت‌شده</div>
            <div className="text-lg font-extrabold text-amber-400">{customers.length} نفر</div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-zinc-400">مجموع اعتبار کیف‌پول مشتریان</div>
            <div className="text-lg font-extrabold text-emerald-400">
              {formatCurrency(
                customers.reduce((acc, c) => acc + (c.walletBalance > 0 ? c.walletBalance : 0), 0),
                currency
              )}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-zinc-400">متولدین این ماه (تخفیف ویژه)</div>
            <div className="text-lg font-extrabold text-purple-400">
              {customers.filter((c) => c.isBirthdayThisMonth).length} نفر
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="جستجوی اعضا با نام یا شماره تلفن..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pr-9 pl-4 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
          />
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>ثبت عضو جدید</span>
        </button>
      </div>

      {/* Customer Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCustomers.map((c) => (
          <div
            key={c.id}
            className={`bg-zinc-900 border rounded-2xl p-4 flex flex-col justify-between space-y-4 transition-all ${
              c.isBirthdayToday
                ? 'border-amber-500 shadow-lg shadow-amber-500/10 bg-amber-950/10'
                : 'border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 font-extrabold flex items-center justify-center border border-amber-500/20">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                      <span>{c.name}</span>
                      {c.isBirthdayToday && (
                        <span className="px-2 py-0.5 bg-amber-500 text-zinc-950 font-bold text-[10px] rounded-full animate-bounce">
                          🎂 امروز تولدشه!
                        </span>
                      )}
                    </h3>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-amber-500" />
                      <span>{c.phone}</span>
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    c.rank === 'الماس'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : c.rank === 'طلایی'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : c.rank === 'نقره'
                      ? 'bg-zinc-400/20 text-zinc-200 border border-zinc-400/30'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  رتبه {c.rank}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">کارکرد کل بازی:</span>
                  <span className="font-bold text-zinc-200">{c.totalHoursPlayed} ساعت</span>
                </div>

                <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">کیف‌پول (شارژ / بدهی):</span>
                  <span
                    className={`font-bold font-mono ${
                      c.walletBalance < 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {formatCurrency(c.walletBalance, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
              <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>تولد: {c.birthDate}</span>
              </div>

              <button
                onClick={() => setShowWalletModal(c)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>مدیریت کیف‌پول / بدهی</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-100">ثبت عضو جدید گیم‌نت BAZINO</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-zinc-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 block mb-1">نام و نام خانوادگی:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">شماره همراه (قبرس/بین‌المللی):</label>
                <input
                  type="text"
                  required
                  placeholder="+90 533 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500 dir-ltr text-right"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">تاریخ تولد (جهت تخفیف ماه تولد):</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">شارژ اولیه کیف‌پول (اختیاری):</label>
                <input
                  type="number"
                  value={initialCharge}
                  onChange={(e) => setInitialCharge(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold"
                >
                  ثبت عضو جدید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wallet Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-100">
                مدیریت کیف‌پول: {showWalletModal.name}
              </h3>
              <button onClick={() => setShowWalletModal(null)} className="p-1 text-zinc-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleWalletTxSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex justify-between">
                <span>موجودی فعلی:</span>
                <span className="font-bold font-mono text-amber-400">
                  {formatCurrency(showWalletModal.walletBalance, currency)}
                </span>
              </div>

              {/* Real transaction ledger for this specific customer */}
              {walletTransactions.filter((tx) => tx.customerId === showWalletModal.id).length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {walletTransactions
                    .filter((tx) => tx.customerId === showWalletModal.id)
                    .slice(0, 8)
                    .map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-2 bg-zinc-950/60 rounded-lg border border-zinc-800/60 text-[10px]"
                      >
                        <div className="flex items-center gap-1.5">
                          {tx.amount >= 0 ? (
                            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <ArrowDownLeft className="w-3 h-3 text-red-400" />
                          )}
                          <span className="text-zinc-300">{tx.description}</span>
                        </div>
                        <span className={`font-mono font-bold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.amount >= 0 ? '+' : ''}
                          {formatCurrency(tx.amount, currency)}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTxType('CHARGE')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    txType === 'CHARGE' ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  افزایش شارژ (+)
                </button>

                <button
                  type="button"
                  onClick={() => setTxType('DEBT_SETTLEMENT')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    txType === 'DEBT_SETTLEMENT' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  تسویه بدهی
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('CASHOUT')}
                  data-cashout
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    txType === 'CASHOUT' ? 'bg-rose-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  نقد حضوری (−)
                </button>
              </div>
              <div>
                <label className="text-zinc-300 block mb-1">کد معرفی همکار (اختیاری، جدا از تخفیف):</label>
                <input
                  type="text"
                  data-walkin-ref
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value)}
                  placeholder="مثلا ALI12"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">مبلغ تراکنش:</label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={txAmount}
                  onChange={(e) => setTxAmount(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-amber-400 font-bold focus:outline-none focus:border-amber-500 text-center text-lg"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">توضیحات (اختیاری):</label>
                <input
                  type="text"
                  placeholder="مثلا: کارت به کارت / دریافت نقدی بابت شارژ"
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWalletModal(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold"
                >
                  ثبت تراکنش
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
