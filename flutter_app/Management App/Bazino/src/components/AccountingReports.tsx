import React, { useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, CreditCard, PieChart, Plus, Receipt, Calendar, ArrowUpRight, Scale, Download, Globe, Smartphone, Monitor, FileText } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Invoice, ShopExpense, Station, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/formatters';

interface AccountingReportsProps {
  invoices: Invoice[];
  expenses: ShopExpense[];
  stations: Station[];
  currency: CurrencyCode;
  onAddExpense: (expense: Omit<ShopExpense, 'id'>) => void;
  canManageExpenses: boolean;
}

export const AccountingReports: React.FC<AccountingReportsProps> = ({
  invoices,
  expenses,
  stations,
  currency,
  onAddExpense,
  canManageExpenses,
}) => {
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [compareMonthA, setCompareMonthA] = useState('06');
  const [compareMonthB, setCompareMonthB] = useState('07');

  // New Expense form
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<'قبوض' | 'اجاره' | 'خرید تجهیزات' | 'حقوق کارمندان' | 'بوفه' | 'متفرقه'>('قبوض');
  const [expAmount, setExpAmount] = useState(1000);
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);

  // Aggregate Calculations
  const totalRevenue = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const totalCashRevenue = invoices.reduce((acc, inv) => acc + inv.cashPaid, 0);
  const totalPosRevenue = invoices.reduce((acc, inv) => acc + inv.posPaid, 0);

  const totalExpensesAmount = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const netProfit = totalRevenue - totalExpensesAmount;

  const monthNames: Record<string, string> = {
    '01': 'فروردین', '02': 'اردیبهشت', '03': 'خرداد', '04': 'تیر',
    '05': 'مرداد', '06': 'شهریور', '07': 'مهر', '08': 'آبان',
    '09': 'آذر', '10': 'دی', '11': 'بهمن', '12': 'اسفند'
  };

  // Real per-month aggregation, derived from actual invoice/expense dates
  // (both are stored as real "YYYY-MM-DD" strings) — nothing here is a
  // placeholder number.
  const getMonthStats = (monthCode: string, year: number) => {
    const monthInvoices = invoices.filter((inv) => {
      const [y, m] = (inv.date || '').split('-');
      return Number(y) === year && m === monthCode;
    });
    const monthExpenses = expenses.filter((exp) => {
      const [y, m] = (exp.date || '').split('-');
      return Number(y) === year && m === monthCode;
    });
    const gameRevenue = monthInvoices.reduce((acc, inv) => acc + inv.gameCost, 0);
    const buffetRevenue = monthInvoices.reduce((acc, inv) => acc + inv.buffetCost, 0);
    const monthRevenue = monthInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
    const monthExpense = monthExpenses.reduce((acc, exp) => acc + exp.amount, 0);
    return { gameRevenue, buffetRevenue, monthRevenue, monthExpense, monthProfit: monthRevenue - monthExpense };
  };

  // Monthly Bar Chart Data — the real last 6 months (including the current one)
  const now = new Date();
  const monthlyChartData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const year = d.getFullYear();
    const monthCode = String(d.getMonth() + 1).padStart(2, '0');
    const stats = getMonthStats(monthCode, year);
    const isCurrent = i === 5;
    return {
      month: monthNames[monthCode] + (isCurrent ? ' (جاری)' : ''),
      درآمد: stats.monthRevenue,
      هزینه: stats.monthExpense,
      سود: stats.monthProfit,
    };
  });

  // 2 Month Comparison Data — real figures for whichever two months are selected
  const compareYear = now.getFullYear();
  const statsA = getMonthStats(compareMonthA, compareYear);
  const statsB = getMonthStats(compareMonthB, compareYear);
  const nameA = monthNames[compareMonthA] || 'ماه ۱';
  const nameB = monthNames[compareMonthB] || 'ماه ۲';

  const comparisonData = [
    { category: 'درآمد بازی (ایستگاه‌ها)', [nameA]: statsA.gameRevenue, [nameB]: statsB.gameRevenue },
    { category: 'درآمد بوفه و خوراکی', [nameA]: statsA.buffetRevenue, [nameB]: statsB.buffetRevenue },
    { category: 'هزینه‌ها و قبوض', [nameA]: statsA.monthExpense, [nameB]: statsB.monthExpense },
    { category: 'سود خالص نهايی', [nameA]: statsA.monthProfit, [nameB]: statsB.monthProfit },
  ];

  const handleCreateExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim()) return;

    onAddExpense({
      title: expTitle.trim(),
      category: expCategory,
      amount: expAmount,
      date: expDate,
      operatorName: 'مدیر مالی',
    });

    setExpTitle('');
    setShowAddExpenseModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <div className="text-xs text-zinc-400 mb-1">کل درآمد گیم‌نت</div>
          <div className="text-xl font-extrabold text-amber-400">
            {formatCurrency(totalRevenue, currency)}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-400 mb-1">تفکیک نقد و کارتخوان</div>
            <div className="text-xs font-bold text-emerald-400">
              نقد: {formatCurrency(totalCashRevenue, currency)}
            </div>
            <div className="text-xs font-bold text-blue-400">
              کارتخوان: {formatCurrency(totalPosRevenue, currency)}
            </div>
          </div>
          <CreditCard className="w-8 h-8 text-blue-400 opacity-60" />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <div className="text-xs text-zinc-400 mb-1">کل هزینه‌ها و خرج‌کردها</div>
          <div className="text-xl font-extrabold text-red-400">
            {formatCurrency(totalExpensesAmount, currency)}
          </div>
        </div>

        <div className="bg-zinc-900 border border-amber-500/30 p-4 rounded-2xl bg-amber-500/5">
          <div className="text-xs text-amber-300 font-semibold mb-1">سود خالص کل</div>
          <div className="text-2xl font-black text-emerald-400">
            {formatCurrency(netProfit, currency)}
          </div>
        </div>
      </div>

      {/* Feature Documentation Download Banner */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-zinc-100">
              دانلود فایل‌های معرفی امکانات و مشخصات فنی BAZINO PRO
            </h3>
          </div>
          <span className="text-xs text-zinc-400">فرمت فایل‌ها: Markdown (.md) قابل ویرایش و مطالعه</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Desktop Report */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-zinc-100">نرم‌افزار دسکتاپ</div>
                <div className="text-[10px] text-zinc-400">کنترل رله، قفل PC، بوفه و پرینتر</div>
              </div>
            </div>
            <a
              href="/BAZINO_PRO_System_Report.md"
              download="BAZINO_PRO_System_Report.md"
              className="w-full py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود امکانات دسکتاپ</span>
            </a>
          </div>

          {/* Website Report */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-zinc-100">پورتال وب‌سایت</div>
                <div className="text-[10px] text-zinc-400">رزرو آنلاین، کیف پول و درگاه</div>
              </div>
            </div>
            <a
              href="/BAZINO_PRO_Website_Features.md"
              download="BAZINO_PRO_Website_Features.md"
              className="w-full py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود امکانات وب‌سایت</span>
            </a>
          </div>

          {/* Mobile App Report */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-zinc-100">اپلیکیشن موبایل</div>
                <div className="text-[10px] text-zinc-400">کارت عضویت QR و مدیریت آیفون</div>
              </div>
            </div>
            <a
              href="/BAZINO_PRO_MobileApp_Features.md"
              download="BAZINO_PRO_MobileApp_Features.md"
              className="w-full py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-sky-400 border border-sky-500/20 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود امکانات اپلیکیشن</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Bar Chart */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <span>نمودار ستونی روند درآمد، هزینه و سود ماهانه:</span>
          </h3>
        </div>

        <div className="h-72 w-full dir-ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#a1a1aa" fontSize={12} />
              <YAxis stroke="#a1a1aa" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }}
                itemStyle={{ color: '#f4f4f5' }}
              />
              <Legend />
              <Bar dataKey="درآمد" fill="#eab308" radius={[4, 4, 0, 0]} />
              <Bar dataKey="هزینه" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="سود" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Compare 2 Months Feature */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-400" />
            <span>مقایسه درآمد دو ماه متفاوت بر روی نمودار:</span>
          </h3>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={compareMonthA}
              onChange={(e) => setCompareMonthA(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg p-2 focus:outline-none focus:border-amber-500"
            >
              {Object.entries(monthNames).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>

            <span className="text-zinc-500">در مقایسه با</span>

            <select
              value={compareMonthB}
              onChange={(e) => setCompareMonthB(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg p-2 focus:outline-none focus:border-amber-500"
            >
              {Object.entries(monthNames).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-64 w-full dir-ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="category" stroke="#a1a1aa" fontSize={11} />
              <YAxis stroke="#a1a1aa" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }}
              />
              <Legend />
              <Bar dataKey={monthNames[compareMonthA] || 'ماه ۱'} fill="#a855f7" radius={[4, 4, 0, 0]} />
              <Bar dataKey={monthNames[compareMonthB] || 'ماه ۲'} fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Station Service Hours Stats */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-3">
        <h3 className="font-bold text-sm text-zinc-100">ساعات سرویس‌دهی و کارکرد هر ایستگاه بازی:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {stations.map((st) => (
            <div key={st.id} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex justify-between items-center">
              <div>
                <div className="font-bold text-zinc-200">{st.name}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{st.type}</div>
              </div>
              <div className="text-right font-mono font-bold text-amber-400">
                {st.totalServiceHoursToday} ساعت
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses Log & Add Expense */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-400" />
            <span>دفتر ثبت هزینه‌ها و خرج‌کردهای مغازه:</span>
          </h3>

          {canManageExpenses && (
            <button
              onClick={() => setShowAddExpenseModal(true)}
              className="px-3.5 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت هزینه جدید</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-semibold">
              <tr>
                <th className="p-3">عنوان هزینه</th>
                <th className="p-3">دسته‌بندی</th>
                <th className="p-3">مبلغ</th>
                <th className="p-3">تاریخ ثبت</th>
                <th className="p-3">ثبت‌کننده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-zinc-800/40">
                  <td className="p-3 font-bold text-zinc-200">{exp.title}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px]">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-3 text-red-400 font-mono font-bold">
                    -{formatCurrency(exp.amount, currency)}
                  </td>
                  <td className="p-3 font-mono text-zinc-400">{exp.date}</td>
                  <td className="p-3 text-zinc-400">{exp.operatorName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-100">ثبت خرج‌کرد و هزینه مغازه</h3>
              <button onClick={() => setShowAddExpenseModal(false)} className="p-1 text-zinc-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpenseSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 block mb-1">عنوان هزینه:</label>
                <input
                  type="text"
                  required
                  placeholder="مثلا: قبض برق جولای / خرید دسته جدید"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">دسته‌بندی:</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-red-500"
                >
                  <option value="قبوض">قبوض (برق/اینترنت/آب)</option>
                  <option value="اجاره">اجاره ملک گیم‌نت</option>
                  <option value="خرید تجهیزات">خرید یا تعمیر تجهیزات</option>
                  <option value="حقوق کارمندان">حقوق و دستمزد اپراتورها</option>
                  <option value="بوفه">خرید موجودی بوفه</option>
                  <option value="متفرقه">متفرقه</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">مبلغ هزینه (₺):</label>
                <input
                  type="number"
                  required
                  value={expAmount}
                  onChange={(e) => setExpAmount(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-red-400 font-bold focus:outline-none focus:border-red-500 text-lg text-center"
                />
              </div>

              <div>
                <label className="text-zinc-300 block mb-1">تاریخ:</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-500 text-zinc-950 font-bold"
                >
                  ثبت هزینه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
