import React, { useState } from 'react';
import { UserState, LoyaltyTx, DiscountCode } from '../types/gamenet';
import { Award, Gift, ArrowLeftRight, TrendingUp, History, Copy, Check, Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  themeId?: string;
  user: UserState;
  transactions: LoyaltyTx[];
  activeCoupons: DiscountCode[];
  onRedeemPoints: (points: number, couponValue: number, code: string) => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function LoyaltyProfileTab({
  user,
  transactions,
  activeCoupons,
  onRedeemPoints,
  addNotification,
}: Props) {
  const { t, dir, language } = useLanguage();
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(100);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Conversion rates
  const pointsRate = 100; // 1 Point = 100 Tomans
  const couponValue = pointsToRedeem * pointsRate;

  const handleRedeem = () => {
    if (user.loyaltyPoints < pointsToRedeem) {
      addNotification(
        language === 'fa' ? 'امتیاز شما کافی نیست!' : 
        language === 'en' ? 'Insufficient points!' : 
        language === 'ru' ? 'Недостаточно баллов!' : 'Puanınız yetersiz!', 
        'error'
      );
      return;
    }
    
    // Generate a random unique coupon code
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const generatedCode = `LOYAL-${randomSuffix}`;

    onRedeemPoints(pointsToRedeem, couponValue, generatedCode);
    
    const successMsg = language === 'fa' 
      ? `با موفقیت ${pointsToRedeem} امتیاز تبدیل به کد تخفیف ${couponValue.toLocaleString()} تومانی شد!`
      : language === 'en'
      ? `Successfully converted ${pointsToRedeem} points into a ${couponValue.toLocaleString()} Tomans discount coupon!`
      : language === 'ru'
      ? `Успешно обменено ${pointsToRedeem} баллов на купон номиналом ${couponValue.toLocaleString()} томанов!`
      : `Başarıyla ${pointsToRedeem} puan, ${couponValue.toLocaleString()} Tümenlik indirim kuponuna dönüştürüldü!`;

    addNotification(successMsg, 'success');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    
    const copyMsg = language === 'fa'
      ? `کد تخفیف ${code} کپی شد! می‌توانید در خریدهای خود استفاده کنید.`
      : language === 'en'
      ? `Discount code ${code} copied! You can use it in your next orders.`
      : language === 'ru'
      ? `Промокод ${code} скопирован! Вы можете использовать его при покупках.`
      : `İndirim kodu ${code} kopyalandı! Alışverişlerinizde kullanabilirsiniz.`;

    addNotification(copyMsg, 'success');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in font-sans" dir={dir}>
      
      {/* Current Balance Card */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        
        {/* Main Loyalty Badge */}
        <div className="rounded-2xl p-6 relative overflow-hidden bg-dark-card border border-white/10">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none"></div>
          
          <h2 className="text-lg font-bold mb-4 uppercase flex items-center gap-2 text-white font-display">
            <span className="w-1.5 h-6 bg-primary rounded-md shadow-[0_0_10px_rgba(0,240,255,0.4)]"></span> {t('loyalty.title', 'کلوپ وفاداری')}
          </h2>

          <div className="flex items-center gap-4 mb-4 mt-2">
            <div className="p-3 rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wide font-mono">{t('user.loyalGamer', 'گیمر وفادار')}</h3>
              <h2 className="text-2xl font-black text-white mt-0.5">{user.username}</h2>
            </div>
          </div>

          <div className="mt-6 mb-4">
            <span className="text-gray-400 text-xs block uppercase tracking-wide font-mono">{t('loyalty.balance', 'امتیاز وفاداری شما')}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <div className="text-6xl font-black text-primary font-display drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                {user.loyaltyPoints}
              </div>
              <span className="text-gray-400 text-xs font-bold font-mono">PTS</span>
            </div>
            <p className="text-gray-400 text-xs mt-3 leading-relaxed">
              {t('loyalty.approxValue', 'برابر با ارزش حدودی')} <strong className="text-primary font-mono font-bold">{(user.loyaltyPoints * pointsRate).toLocaleString()} {t('common.currency', 'تومان')}</strong> {t('loyalty.discountDirect', 'تخفیف مستقیم کافه و سیستم')}
            </p>
          </div>

          {/* Progress bar to next level */}
          <div className="mt-6 border-t border-white/5 pt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span className="font-bold">
                {language === 'fa' && 'سطح فعلی: برنزی'}
                {language === 'en' && 'Current Level: Bronze'}
                {language === 'ru' && 'Текущий уровень: Бронза'}
                {language === 'tr' && 'Mevcut Seviye: Bronz'}
              </span>
              <span className="font-mono text-gray-300">
                {(user.loyaltyPoints % 1000)} / 1000 {t('loyalty.pointsToSilver', 'امتیاز تا نقره‌ای')}
              </span>
            </div>
            <div className="w-full bg-[#0d122b] rounded-full h-2 overflow-hidden border border-white/5">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,240,255,0.6)]"
                style={{ width: `${Math.min(100, ((user.loyaltyPoints % 1000) / 1000) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Loyalty Quick Convert Panel */}
        <div className="rounded-2xl p-6 relative overflow-hidden bg-dark-card border border-white/10">
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none"></div>
          
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-display uppercase">
            <span className="w-1.5 h-6 bg-primary rounded-md shadow-[0_0_10px_rgba(0,240,255,0.4)]"></span> {t('loyalty.convertTitle', 'تبدیل امتیاز به کد تخفیف')}
          </h3>

          <p className="text-gray-400 text-xs leading-relaxed mb-6 font-medium">
            {t('loyalty.convertDesc', 'شما می‌توانید با خرج کردن امتیازهای وفاداری خود، کدهای تخفیف با مبالغ مختلف صادر کرده و در بوفه، رزرو سیستم یا فروشگاه استفاده کنید.')}
          </p>

          {/* Quick selectors */}
          <div className="grid grid-cols-3 gap-2 mb-6 font-mono">
            {[100, 200, 500].map((points) => (
              <button
                key={points}
                type="button"
                onClick={() => setPointsToRedeem(points)}
                className={`py-2.5 px-3 rounded-lg border text-xs font-black transition-all cursor-pointer ${
                  pointsToRedeem === points
                    ? 'border-primary bg-primary/10 text-primary shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {points} {t('user.pts', 'امتیاز')}
              </button>
            ))}
          </div>

          {/* Custom points range */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-xs text-gray-400">
              <span className="font-bold">{t('loyalty.pointsToRedeem', 'امتیاز برای صادر کردن کد:')}</span>
              <span className="font-black text-primary font-mono text-sm">{pointsToRedeem} PTS</span>
            </div>
            <input
              type="range"
              min="100"
              max={Math.max(100, Math.floor(user.loyaltyPoints / 100) * 100)}
              step="100"
              value={pointsToRedeem}
              onChange={(e) => setPointsToRedeem(Number(e.target.value))}
              disabled={user.loyaltyPoints < 100}
              className="w-full h-1.5 bg-[#0d122b] rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-gray-500 font-bold font-mono">
              <span>100 PTS</span>
              <span>{Math.max(100, Math.floor(user.loyaltyPoints / 100) * 100)} PTS</span>
            </div>
          </div>

          {/* Exchange review */}
          <div className="bg-[#0d122b] border border-white/5 rounded-xl p-4 mb-6">
            <div className="flex justify-between text-xs text-gray-400 mb-2.5">
              <span>{t('loyalty.couponValue', 'ارزش کد تخفیف:')}</span>
              <span className="text-primary font-bold font-mono">+{couponValue.toLocaleString()} {t('common.currency', 'تومان')}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mb-2.5">
              <span>{t('loyalty.minOrder', 'حداقل سفارش خرید:')}</span>
              <span className="text-gray-300 font-medium font-mono">{(couponValue * 1.5).toLocaleString()} {t('common.currency', 'تومان')}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{t('loyalty.validity', 'مدت اعتبار کد تخفیف:')}</span>
              <span className="text-gray-300 font-medium">{t('loyalty.daysFromIssue', '۳۰ روز از زمان صدور')}</span>
            </div>
          </div>

          <button
            onClick={handleRedeem}
            disabled={user.loyaltyPoints < pointsToRedeem || user.loyaltyPoints < 100}
            className="w-full py-4 bg-primary text-black font-black uppercase tracking-wider rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:bg-primary-hover border-2 border-primary transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none font-display text-xs cursor-pointer"
          >
            <ArrowLeftRight className="w-5 h-5" />
            {user.loyaltyPoints < 100 ? t('loyalty.btnMinRequired', 'حداقل ۱۰۰ امتیاز لازم است') : t('loyalty.btnRedeem', 'تبدیل امتیاز به کوپن تخفیف')}
          </button>
        </div>

      </div>

      {/* Main loyalty panel: Active Coupons and Transactions history */}
      <div className="lg:col-span-2 flex flex-col gap-6">

        {/* Active Generated Coupons */}
        <div className="rounded-2xl p-6 relative overflow-hidden bg-dark-card border border-white/10">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none"></div>
          
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-display uppercase">
            <span className="w-1.5 h-6 bg-primary rounded-md shadow-[0_0_10px_rgba(0,240,255,0.4)]"></span> {t('loyalty.activeCoupons', 'کدهای تخفیف فعال شما')}
          </h3>

          {activeCoupons.length === 0 ? (
            <div className="text-center py-10 rounded-xl border border-dashed border-white/10 bg-white/5 text-gray-400">
              <Gift className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <p className="text-sm font-bold">{t('loyalty.noCoupons', 'کد تخفیف فعالی صادر نشده است')}</p>
              <p className="text-xs text-gray-500 mt-1.5">{t('loyalty.noCouponsDesc', 'با بازی کردن و کسب امتیاز، کدهای تخفیف اختصاصی بسازید!')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeCoupons.map((coupon) => (
                <div 
                  key={coupon.code}
                  className="rounded-xl border border-white/10 bg-[#0f1326] hover:border-primary p-5 relative overflow-hidden flex flex-col justify-between transition-all group"
                >
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/5 blur-2xl pointer-events-none group-hover:bg-primary/10 transition-all"></div>
                  <div className="flex justify-between items-start gap-2 relative z-10">
                    <div>
                      <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-bold">
                        {coupon.type === 'Fixed' ? t('loyalty.typeFixed', 'مبلغ ثابت') : t('loyalty.typePercent', 'درصدی')}
                      </span>
                      <h4 className="text-2xl font-black text-white mt-3 font-mono">
                        {coupon.value.toLocaleString()} {coupon.type === 'Fixed' ? t('common.currency', 'تومان') : '%'}
                      </h4>
                    </div>
                    
                    <button
                      onClick={() => handleCopyCode(coupon.code)}
                      className="p-2.5 rounded-lg bg-white/5 hover:bg-primary hover:text-black text-gray-400 transition-all border border-white/5 cursor-pointer"
                      title="کپی کردن کد"
                    >
                      {copiedCode === coupon.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-gray-400 relative z-10 font-mono">
                    <div>
                      <span>{t('loyalty.couponLabel', 'کد کوپن:')} </span>
                      <strong className="text-primary tracking-widest text-sm font-bold">{coupon.code}</strong>
                    </div>
                    <span className="text-[10px] text-gray-500">{t('loyalty.minOrderLabel', 'حداقل خرید:')} {coupon.minOrder.toLocaleString()} {t('common.currency', 'تومان')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Points System Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-dark-card p-5 flex gap-4 items-start relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-20 h-20 bg-primary/5 blur-xl pointer-events-none"></div>
            <div className="p-3 bg-primary/10 text-primary border border-primary/20 rounded-lg shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white text-sm font-bold font-display uppercase tracking-wide">{t('loyalty.howToEarnTitle', 'چگونه امتیاز کسب کنم؟')}</h4>
              <p className="text-gray-400 text-xs mt-2.5 leading-relaxed">
                {t('loyalty.howToEarnDesc', 'به ازای هر ۱۰,۰۰۰ تومان هزینه در بوفه، رزرو سیستم یا خرید تجهیزات جانبی، ۱ امتیاز وفاداری دریافت می‌کنید.')}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-dark-card p-5 flex gap-4 items-start relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-20 h-20 bg-primary/5 blur-xl pointer-events-none"></div>
            <div className="p-3 bg-primary/10 text-primary border border-primary/20 rounded-lg shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white text-sm font-bold font-display uppercase tracking-wide">{t('loyalty.levelsTitle', 'سطوح کاربری گیمرها')}</h4>
              <p className="text-gray-400 text-xs mt-2.5 leading-relaxed">
                {t('loyalty.levelsDesc', 'برنزی (زیر ۱۰۰۰ امتیاز)، نقره‌ای (۱۰٪ تخفیف کل فاکتور بوفه)، طلایی (۲۰٪ تخفیف کافه و اولویت حداکثری رزرو سیستم‌های VIP).')}
              </p>
            </div>
          </div>
        </div>

        {/* Loyalty Transactions History */}
        <div className="rounded-2xl p-6 relative overflow-hidden bg-dark-card border border-white/10">
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none"></div>
          
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-display uppercase">
            <span className="w-1.5 h-6 bg-primary rounded-md shadow-[0_0_10px_rgba(0,240,255,0.4)]"></span> {t('loyalty.historyTitle', 'تاریخچه امتیازات باشگاه مشتریان')}
          </h3>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm text-gray-400">
              <thead className="text-xs text-gray-400 uppercase bg-[#0d122b] border-b border-white/10 font-mono font-bold">
                <tr>
                  <th scope="col" className={`px-4 py-3 ${dir === 'rtl' ? 'text-right rounded-r-lg' : 'text-left rounded-l-lg'}`}>{t('loyalty.tableDesc', 'شرح تراکنش وفاداری')}</th>
                  <th scope="col" className="px-4 py-3 text-center">{t('loyalty.tableType', 'نوع تراکنش')}</th>
                  <th scope="col" className="px-4 py-3 text-center">{t('loyalty.tablePoints', 'تغییر امتیاز')}</th>
                  <th scope="col" className={`px-4 py-3 ${dir === 'rtl' ? 'text-left rounded-l-lg' : 'text-right rounded-r-lg'}`}>{t('loyalty.tableDate', 'تاریخ ثبت')}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const translatedDesc = language === 'fa' 
                    ? tx.description
                    : tx.description
                        .replace('امتیاز خوش‌آمدگویی و تایید شماره تماس', 'Welcome points and phone confirmation')
                        .replace('امتیاز بابت رزرو ۲ ساعت سیستم VIP #5', 'Points for booking 2 hours of VIP System #5')
                        .replace('امتیاز سفارش پیتزا پپرونی و ردبول از کافه بوفه', 'Points for ordering Pepperoni Pizza and RedBull from Cafe Buffet')
                        .replace('تبدیل', 'Converted')
                        .replace('امتیاز به کد تخفیف', 'points to discount code')
                        .replace('تومانی', 'Tomans')
                        .replace('سیستم', 'System')
                        .replace('کافه', 'Cafe');

                  return (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                      <td className={`px-4 py-3.5 font-bold text-gray-200 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{translatedDesc}</td>
                      <td className="px-4 py-3.5 text-center">
                        {/* نوع تراکنش با یک شرط دوحالته رندر می‌شد، پس هر نوعی
                            غیر از 'Earned' — از جمله 'Bonus' — برچسب «خرج امتیاز»
                            می‌گرفت. ردیف هدیه‌ی خوش‌آمدگویی «خرج امتیاز +100 PTS»
                            نشان داده می‌شد که با خودش در تناقض بود. حالا علامت
                            خودِ امتیاز تعیین‌کننده است و 'Bonus' برچسب اختصاصی دارد. */}
                        {(() => {
                          const isSpend = tx.points < 0;
                          const label = tx.type === 'Bonus'
                            ? t('loyalty.bonus', 'هدیه باشگاه')
                            : isSpend
                              ? t('loyalty.redeemed', 'خرج امتیاز')
                              : t('loyalty.earned', 'کسب امتیاز');
                          return (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                              isSpend
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : tx.type === 'Bonus'
                                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className={`px-4 py-3.5 text-center font-mono font-black ${tx.points > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.points > 0 ? `+${tx.points}` : tx.points} PTS
                      </td>
                      <td className={`px-4 py-3.5 text-xs text-gray-500 font-bold font-mono ${dir === 'rtl' ? 'text-left' : 'text-right'}`}>
                        {tx.date === 'امروز' ? t('common.today', 'امروز') : tx.date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
