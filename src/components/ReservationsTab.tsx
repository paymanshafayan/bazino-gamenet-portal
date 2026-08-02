import React, { useState } from 'react';
import { GameSystem, DiscountCode } from '../types/gamenet';
import { Monitor, Cpu, Sparkles, Clock, Check, X, ShieldAlert, CreditCard, QrCode, UserCheck, ScanLine, Smartphone, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  themeId?: string;
  systems: GameSystem[];
  activeCoupons: DiscountCode[];
  onAddLoyaltyPoints: (points: number, desc: string) => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function ReservationsTab({
  systems,
  activeCoupons,
  onAddLoyaltyPoints,
  addNotification,
}: Props) {
  const { t, dir, language } = useLanguage();
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [hours, setHours] = useState<number>(2);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<DiscountCode | null>(null);

  // QR Code check-in and active reservations states
  const [reservations, setReservations] = useState<any[]>([]);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [showScannerSim, setShowScannerSim] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const fetchReservations = async () => {
    try {
      const res = await fetch('/api/reservations');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setReservations(data);
        }
      }
    } catch (err) {
      console.error("Error fetching active reservations:", err);
    }
  };

  React.useEffect(() => {
    fetchReservations();
  }, []);

  const handleSimulateCheckIn = async (resId: string) => {
    setScanningId(resId);
    setShowScannerSim(true);

    // Simulate cyber scanning beep & verification
    setTimeout(async () => {
      try {
        const response = await fetch(`/api/reservations/${resId}/checkin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          addNotification(
            language === 'fa' ? 'بارکد با موفقیت اسکن شد! کاربر وارد سیستم شد.' :
            language === 'en' ? 'Barcode scanned successfully! Guest checked into system.' :
            language === 'ru' ? 'Штрих-код отсканирован! Гость вошел в систему.' :
            'Barkod başarıyla tarandı! Misafir sisteme giriş yaptı.',
            'success'
          );
          fetchReservations();
        } else {
          addNotification('Check-in failed on server.', 'error');
        }
      } catch (err) {
        console.error("Checkin error:", err);
        addNotification('Network error during check-in.', 'error');
      } finally {
        setScanningId(null);
        setShowScannerSim(false);
      }
    }, 1800);
  };

  const selectedSystem = systems.find(s => s.id === selectedSystemId);

  const getSubtotal = () => {
    if (!selectedSystem) return 0;
    return selectedSystem.hourlyRate * hours;
  };

  const getDiscountAmount = () => {
    if (!appliedCoupon) return 0;
    const subtotal = getSubtotal();
    if (subtotal < appliedCoupon.minOrder) return 0;

    if (appliedCoupon.type === 'Percent') {
      return subtotal * (appliedCoupon.value / 100);
    } else {
      return appliedCoupon.value;
    }
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;

    const found = activeCoupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase());
    if (!found) {
      addNotification(
        language === 'fa' ? 'کد تخفیف معتبر نیست یا منقضی شده است.' :
        language === 'en' ? 'Discount code is invalid or expired.' :
        language === 'ru' ? 'Промокод недействителен или истек.' :
        'İndirim kodu geçersiz veya süresi dolmuş.',
        'error'
      );
      return;
    }

    const subtotal = getSubtotal();
    if (subtotal < found.minOrder) {
      const errorMsg = language === 'fa'
        ? `حداقل خرید جهت اعمال این کد ${found.minOrder.toLocaleString()} تومان است.`
        : language === 'en'
        ? `Minimum purchase to apply this code is ${found.minOrder.toLocaleString()} Tomans.`
        : language === 'ru'
        ? `Минимальный заказ для применения этого кода: ${found.minOrder.toLocaleString()} томанов.`
        : `Bu kodu uygulamak için minimum sipariş tutarı ${found.minOrder.toLocaleString()} Tümen'dir.`;

      addNotification(errorMsg, 'error');
      return;
    }

    setAppliedCoupon(found);
    addNotification(
      language === 'fa' ? 'کد تخفیف اعمال شد!' :
      language === 'en' ? 'Discount code applied!' :
      language === 'ru' ? 'Промокод успешно применен!' :
      'İndirim kodu uygulandı!',
      'success'
    );
  };

  const handleReserve = async () => {
    if (!selectedSystem) {
      addNotification(
        language === 'fa' ? 'لطفاً ابتدا یک سیستم یا صندلی خالی انتخاب کنید.' :
        language === 'en' ? 'Please select an available system or seat first.' :
        language === 'ru' ? 'Пожалуйста, сначала выберите свободную систему или место.' :
        'Lütfen önce boş bir sistem یا koltuk seçin.',
        'error'
      );
      return;
    }

    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    const finalAmount = subtotal - discount;

    // Calculate points: 1 point per 10,000 Tomans
    const pointsEarned = Math.floor(finalAmount / 10000);

    const descMsg = language === 'fa'
      ? `رزرو آنلاین ${selectedSystem.name} به مدت ${hours} ساعت`
      : language === 'en'
      ? `Online booking of ${selectedSystem.name} for ${hours} hours`
      : language === 'ru'
      ? `Онлайн бронирование ${selectedSystem.name} на ${hours} ч.`
      : `${selectedSystem.name} sisteminin ${hours} saatlik online rezervasyonu`;

    try {
      const response = await fetch('/api/systems/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemId: selectedSystem.id,
          startTime: '14:00',
          endTime: `${14 + hours}:00`,
          totalPrice: finalAmount,
          pointsEarned,
          date: 'امروز'
        })
      });

      if (response.ok) {
        onAddLoyaltyPoints(pointsEarned, descMsg);

        const successMsg = language === 'fa'
          ? `رزرو سیستم ${selectedSystem.name} با موفقیت انجام شد! ${pointsEarned} امتیاز وفاداری به شما تعلق گرفت.`
          : language === 'en'
          ? `Successfully booked ${selectedSystem.name}! You earned ${pointsEarned} loyalty points.`
          : language === 'ru'
          ? `Система ${selectedSystem.name} успешно забронирована! Вам начислено ${pointsEarned} баллов.`
          : `${selectedSystem.name} rezervasyonu başarıyla yapıldı! ${pointsEarned} sadakat puanı kazandınız.`;

        addNotification(successMsg, 'success');
        fetchReservations();
      } else {
        const errData = await response.json();
        addNotification(errData.error || 'Error', 'error');
      }
    } catch (err) {
      console.error("Reserve error:", err);
      onAddLoyaltyPoints(pointsEarned, descMsg);
      addNotification(
        language === 'fa' ? `رزرو سیستم ${selectedSystem.name} با موفقیت انجام شد!` : `Successfully booked ${selectedSystem.name}!`,
        'success'
      );
    }

    // Reset fields
    setSelectedSystemId(null);
    setHours(2);
    setAppliedCoupon(null);
    setCouponCode('');
  };

  // Sort reservations by timestamp (latest first)
  const sortedReservations = [...reservations].sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeB - timeA;
  });

  const itemsPerPage = 4;
  const totalPages = Math.max(1, Math.ceil(sortedReservations.length / itemsPerPage));
  const paginatedHistory = sortedReservations.slice(
    (historyPage - 1) * itemsPerPage,
    historyPage * itemsPerPage
  );

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return language === 'fa' ? 'نامشخص' : 'N/A';
    try {
      const dateObj = new Date(isoString);
      if (language === 'fa') {
        return dateObj.toLocaleDateString('fa-IR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return dateObj.toLocaleString(language === 'ru' ? 'ru-RU' : language === 'tr' ? 'tr-TR' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const total = subtotal - discount;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in font-sans" dir={dir}>
      
      {/* Grid of systems & Interactive Map */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        
        {/* Reservation Info Header */}
        <div className="rounded-2xl p-6 relative overflow-hidden bg-dark-card border border-white/10">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none"></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display uppercase tracking-wider">
                <span className="w-1.5 h-6 bg-primary rounded-md shadow-[0_0_10px_rgba(0,240,255,0.4)]"></span>
                <span>
                  {language === 'fa' && 'پلان و نقشه‌ سالن سیستم‌ها'}
                  {language === 'en' && 'Arena Layout & System Seatmap'}
                  {language === 'ru' && 'Карта зала и игровых систем'}
                  {language === 'tr' && 'Oyun Salonu Oturma Planı'}
                </span>
              </h3>
              <p className="text-gray-400 text-xs mt-1.5 leading-relaxed font-medium">
                {language === 'fa' && 'سیستم یا کنسول موردنظر خود را برای ساعت‌های آینده رزرو کنید. صندلی‌های سبز آماده رزرو هستند.'}
                {language === 'en' && 'Book your desired gaming PC or console for the upcoming hours. Green seats are ready to book.'}
                {language === 'ru' && 'Забронируйте игровой ПК или консоль на ближайшее время. Зеленые места готовы к бронированию.'}
                {language === 'tr' && 'İstediğiniz bilgisayarı veya konsolu gelecek saatler için ayırtın. Yeşil koltuklar rezerve edilmeye hazırdır.'}
              </p>
            </div>

            <div className="flex gap-4 text-xs font-bold font-mono">
              <div className="flex items-center gap-1.5 text-primary">
                <span className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_rgba(0,240,255,0.6)] block" />
                <span>
                  {language === 'fa' && 'خالی / آماده'}
                  {language === 'en' && 'Available / Ready'}
                  {language === 'ru' && 'Свободно'}
                  {language === 'tr' && 'Müsait / Hazır'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-500">
                <span className="w-3 h-3 rounded-full bg-rose-500 block shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                <span>
                  {language === 'fa' && 'مشغول'}
                  {language === 'en' && 'Occupied / In Game'}
                  {language === 'ru' && 'Занято'}
                  {language === 'tr' && 'Dolu / Oyunda'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Seat Grid */}
        <div className="rounded-2xl border border-white/10 bg-dark-card p-6">
          <div className="text-center text-xs text-gray-500 mb-6 border-b border-white/5 pb-4 select-none font-bold uppercase tracking-wider font-display">
            📺 {language === 'fa' && 'صفحه نمایش بزرگ یا ویدیو پروژکتور مرکزی سالن'}
            {language === 'en' && 'Big Screen Display / Main Central Arena Projector'}
            {language === 'ru' && 'Большой экран / Центральный проектор зала'}
            {language === 'tr' && 'Dev Ekran / Salon Merkezi Projeksiyon Cihazı'}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {systems.map((sys) => {
              const isSelected = selectedSystemId === sys.id;
              return (
                <button
                  key={sys.id}
                  disabled={sys.isReserved}
                  onClick={() => {
                    setSelectedSystemId(sys.id);
                    setAppliedCoupon(null);
                    setCouponCode('');
                  }}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all relative group cursor-pointer ${
                    sys.isReserved
                      ? 'border-rose-500/10 bg-rose-500/5 cursor-not-allowed opacity-40'
                      : isSelected
                      ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(0,240,255,0.15)] scale-[1.02]'
                      : 'border-white/10 bg-white/5 hover:border-primary text-gray-400 hover:text-white'
                  }`}
                >
                  <div className={`p-2.5 rounded-lg transition-all ${
                    sys.isReserved 
                      ? 'bg-rose-500/10 text-rose-400' 
                      : isSelected 
                      ? 'bg-primary/20 text-primary shadow-[0_0_10px_rgba(0,240,255,0.2)]' 
                      : 'bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-white'
                  }`}>
                    <Cpu className="w-6 h-6" />
                  </div>

                  <div className="text-center">
                    <span className="text-white text-xs font-bold block font-display">{sys.name}</span>
                    <span className="text-[10px] text-gray-500 mt-1 block font-bold">
                      {sys.type === 'PC' && (language === 'fa' ? 'سیستم PC' : language === 'en' ? 'PC Gaming' : language === 'ru' ? 'Игровой ПК' : 'PC Sistemi')}
                      {sys.type === 'PS5' && (language === 'fa' ? 'پی‌اس ۵' : 'PS5')}
                      {sys.type === 'Xbox' && (language === 'fa' ? 'ایکس‌باکس' : 'Xbox')}
                    </span>
                  </div>

                  <div className="border-t border-white/5 pt-2.5 w-full text-center">
                    <span className="text-xs font-bold text-primary font-mono">
                      {sys.hourlyRate.toLocaleString()} {t('common.currency', 'تومان')} / {language === 'fa' ? 'ساعت' : language === 'en' ? 'hour' : language === 'ru' ? 'ч.' : 'saat'}
                    </span>
                  </div>

                  {sys.isReserved && (
                    <span className="absolute top-2 left-2 text-[8px] bg-rose-500/20 border border-rose-500/30 text-rose-400 px-1.5 py-0.5 rounded-full font-bold">
                      {language === 'fa' && 'مشغول'}
                      {language === 'en' && 'In Use'}
                      {language === 'ru' && 'Занят'}
                      {language === 'tr' && 'Meşgul'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Reservations & QR Entry Code Display */}
        <div className="rounded-2xl border border-white/10 bg-dark-card p-6 mt-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display uppercase tracking-wider">
                <QrCode className="w-5 h-5 text-primary" />
                <span>
                  {language === 'fa' && 'بارکدهای ورود و رزروهای فعال شما'}
                  {language === 'en' && 'Your Active Reservations & QR Entry Tokens'}
                  {language === 'ru' && 'Ваши активные бронирования и QR-коды'}
                  {language === 'tr' && 'Aktif Rezervasyonlarınız ve QR Giriş Kodları'}
                </span>
              </h3>
              <p className="text-gray-400 text-xs mt-1.5 leading-relaxed font-medium">
                {language === 'fa' && 'هنگام ورود به سالن گیم‌نت، کدهای QR زیر را جهت فعال‌سازی سیستم به مسئول کانتر ارائه دهید.'}
                {language === 'en' && 'Upon arrival, show these QR codes to the front counter staff to quickly scan and activate your seat.'}
                {language === 'ru' && 'По прибытии покажите эти QR-коды администратору на стойке регистрации для активации места.'}
                {language === 'tr' && 'Salona vardığınızda, koltuğunuzu etkinleştirmek için bu QR kodlarını girişteki personele gösterin.'}
              </p>
            </div>
          </div>

          {reservations.length === 0 ? (
            <div className="text-center py-12 text-gray-500 border border-dashed border-white/5 rounded-xl">
              <QrCode className="w-12 h-12 mx-auto text-gray-700 mb-3 opacity-40 animate-pulse" />
              <p className="text-sm font-bold">
                {language === 'fa' && 'هیچ رزرو فعالی برای شما ثبت نشده است.'}
                {language === 'en' && 'No active reservations found.'}
                {language === 'ru' && 'Активных бронированиях не найдено.'}
                {language === 'tr' && 'Aktif rezervasyon bulunamadı.'}
              </p>
              <p className="text-xs text-gray-600 mt-2 font-medium">
                {language === 'fa' && 'از طریق جدول فوق یا صندلی‌های سالن اقدام به ثبت رزرو جدید کنید.'}
                {language === 'en' && 'Book an available system from the seatmap grid above.'}
                {language === 'ru' && 'Забронируйте свободную систему на карте зала выше.'}
                {language === 'tr' && 'Yukarıdaki oturma planından boş bir sistem seçip ayırtın.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reservations.map((res) => {
                const isCheckedIn = res.checkedIn;
                return (
                  <div key={res.id} className="bg-dark-card/60 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row gap-4 items-center relative overflow-hidden">
                    {/* QR Code Graphic Container */}
                    <div className="bg-dark-bg p-2.5 rounded-xl border border-white/10 flex flex-col items-center justify-center relative group shrink-0">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&color=00f0ff&bgcolor=070913&data=${res.id}`} 
                        alt="Reservation QR Token"
                        className="w-28 h-28 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[10px] font-mono font-bold text-gray-500 mt-1 select-all uppercase">ID: {res.id}</span>
                    </div>

                    {/* Meta Details and simulated checkout buttons */}
                    <div className="flex-1 flex flex-col justify-between w-full h-full min-h-[120px]">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-white text-xs font-bold font-display">{res.systemName}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            isCheckedIn
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                          }`}>
                            {isCheckedIn ? (
                              <span className="flex items-center gap-1">
                                <UserCheck className="w-2.5 h-2.5" />
                                {language === 'fa' ? 'پذیرش شده' : language === 'en' ? 'Checked-In' : language === 'ru' ? 'Зарегистрирован' : 'Giriş Yapıldı'}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-amber-400" />
                                {language === 'fa' ? 'در انتظار ورود' : language === 'en' ? 'Pending Check-In' : language === 'ru' ? 'Ожидание' : 'Bekliyor'}
                              </span>
                            )}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-gray-400 font-mono">
                          <div>
                            <span className="text-gray-600 block text-[9px] uppercase">{language === 'fa' ? 'سانس رزرو:' : 'Time slot:'}</span>
                            <span className="text-gray-300 font-bold">{res.startTime} - {res.endTime}</span>
                          </div>
                          <div>
                            <span className="text-gray-600 block text-[9px] uppercase">{language === 'fa' ? 'هزینه پرداخت شده:' : 'Price:'}</span>
                            <span className="text-primary font-black">{(res.totalPrice || 0).toLocaleString()} {t('common.currency', 'تومان')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Counter Check-in Scan trigger */}
                      <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                        {!isCheckedIn ? (
                          <button
                            onClick={() => handleSimulateCheckIn(res.id)}
                            disabled={scanningId !== null}
                            className="w-full py-2 bg-[#A855F7]/10 hover:bg-[#A855F7] text-[#A855F7] hover:text-white border border-[#A855F7]/20 hover:border-[#A855F7] rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <ScanLine className="w-3.5 h-3.5" />
                            <span>
                              {language === 'fa' ? 'شبیه‌ساز اسکنر مسئول کانتر' : 'Simulate Counter Scanner'}
                            </span>
                          </button>
                        ) : (
                          <div className="w-full py-2 bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 rounded-lg text-[10px] font-black text-center flex items-center justify-center gap-1.5 select-none">
                            <Check className="w-3.5 h-3.5" />
                            <span>
                              {language === 'fa' ? 'ورود با موفقیت ثبت شد' : 'Seat is successfully active'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Booking History View */}
        <div className="rounded-2xl border border-white/10 bg-dark-card p-6 mt-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#A855F7]/5 blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 font-display uppercase tracking-wider">
                <History className="w-5 h-5 text-[#A855F7]" />
                <span>
                  {language === 'fa' && 'تاریخچه رزروهای شما'}
                  {language === 'en' && 'Your Booking History'}
                  {language === 'ru' && 'История ваших бронирований'}
                  {language === 'tr' && 'Rezervasyon Geçmişiniz'}
                </span>
              </h3>
              <p className="text-gray-400 text-xs mt-1.5 leading-relaxed font-medium">
                {language === 'fa' && 'لیست تمامی رزروهای قبلی و تفکیک وضعیت پرداخت و پذیرش سیستم'}
                {language === 'en' && 'List of all previous bookings, with status breakdowns, total costs, and timestamps.'}
                {language === 'ru' && 'Список всех предыдущих бронирований с расшифровкой статуса, стоимости и времени.'}
                {language === 'tr' && 'Durum dökümleri, toplam maliyetler ve zaman damgaları ile önceki tüm rezervasyonların listesi.'}
              </p>
            </div>
          </div>

          {sortedReservations.length === 0 ? (
            <div className="text-center py-12 text-gray-500 border border-dashed border-white/5 rounded-xl">
              <History className="w-12 h-12 mx-auto text-gray-700 mb-3 opacity-40" />
              <p className="text-sm font-bold">
                {language === 'fa' && 'هیچ سابقه‌ رزروی یافت نشد.'}
                {language === 'en' && 'No booking history found.'}
                {language === 'ru' && 'История бронирований пуста.'}
                {language === 'tr' && 'Rezervasyon geçmişi bulunamadı.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-gray-400 border-collapse" dir={dir}>
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500 uppercase font-mono text-[10px] tracking-wider">
                      <th className="py-3 px-4 font-bold text-start">
                        {language === 'fa' && 'سیستم / صندلی'}
                        {language === 'en' && 'System / Seat'}
                        {language === 'ru' && 'Система'}
                        {language === 'tr' && 'Sistem'}
                      </th>
                      <th className="py-3 px-4 font-bold">
                        {language === 'fa' && 'زمان دقیق رزرو'}
                        {language === 'en' && 'Exact Timestamp'}
                        {language === 'ru' && 'Время создания'}
                        {language === 'tr' && 'Zaman Damgası'}
                      </th>
                      <th className="py-3 px-4 font-bold">
                        {language === 'fa' && 'سانس'}
                        {language === 'en' && 'Time Slot'}
                        {language === 'ru' && 'Интервал'}
                        {language === 'tr' && 'Süreç'}
                      </th>
                      <th className="py-3 px-4 font-bold text-center">
                        {language === 'fa' && 'هزینه پرداخت شده'}
                        {language === 'en' && 'Total Cost'}
                        {language === 'ru' && 'Итоговая цена'}
                        {language === 'tr' && 'Toplam Ücret'}
                      </th>
                      <th className="py-3 px-4 font-bold text-end">
                        {language === 'fa' && 'وضعیت'}
                        {language === 'en' && 'Status'}
                        {language === 'ru' && 'Статус'}
                        {language === 'tr' && 'Durum'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paginatedHistory.map((res) => (
                      <tr key={res.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white text-start">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                            <span>{res.systemName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-300 font-mono">
                          {formatTimestamp(res.timestamp)}
                        </td>
                        <td className="py-3.5 px-4 text-gray-300 font-mono">
                          <span className="bg-white/5 px-2 py-1 rounded border border-white/5">
                            {res.startTime} - {res.endTime}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-primary font-mono">
                          {(res.totalPrice || 0).toLocaleString()} {t('common.currency', 'تومان')}
                        </td>
                        <td className="py-3.5 px-4 text-end">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            res.checkedIn
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {res.checkedIn ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                {language === 'fa' ? 'پذیرش شده' : language === 'en' ? 'Checked-In' : language === 'ru' ? 'Занят' : 'Giriş Yapıldı'}
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-amber-400" />
                                {language === 'fa' ? 'در انتظار' : language === 'en' ? 'Pending' : language === 'ru' ? 'В ожидании' : 'Bekliyor'}
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-2">
                  <span className="text-[11px] text-gray-500 font-bold font-mono">
                    {language === 'fa' && `صفحه ${historyPage} از ${totalPages}`}
                    {language === 'en' && `Page ${historyPage} of ${totalPages}`}
                    {language === 'ru' && `Страница ${historyPage} из ${totalPages}`}
                    {language === 'tr' && `Sayfa ${historyPage} / ${totalPages}`}
                  </span>
                  <div className="flex gap-2 font-mono">
                    <button
                      onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                      className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                      disabled={historyPage === totalPages}
                      className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Dynamic Cyberpunk Scanner Simulation Overlay */}
      {showScannerSim && (
        <div className="fixed inset-0 bg-[#070913]/90 backdrop-blur-md z-[9999] flex items-center justify-center font-sans">
          <div className="max-w-md w-full mx-4 bg-dark-card border-2 border-primary/40 rounded-2xl p-6 relative overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.15)] animate-fade-in">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary/20">
              <div className="h-full bg-primary animate-pulse" style={{ width: '100%' }}></div>
            </div>
            
            <div className="text-center space-y-4">
              <div className="relative w-40 h-40 mx-auto bg-dark-bg border border-white/10 rounded-xl overflow-hidden flex items-center justify-center p-4">
                {/* Simulated scanner cyan laser beam sweeping up and down */}
                <div className="absolute top-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_15px_var(--color-primary),0_0_30px_var(--color-primary)] animate-[bounce_1.5s_infinite]" />
                <QrCode className="w-24 h-24 text-gray-700 animate-pulse" />
              </div>

              <div>
                <h4 className="text-white text-sm font-black font-display uppercase tracking-widest flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  {language === 'fa' ? 'در حال اسکن بارکد...' : 'Scanning QR Entry Code...'}
                </h4>
                <p className="text-gray-400 text-[11px] mt-1.5 font-medium">
                  {language === 'fa' ? 'کد ورود شما با موفقیت شناسایی و پردازش شد.' : 'Capturing credentials from optical frame matrices...'}
                </p>
              </div>

              {/* Cyberpunk terminal logs */}
              <div className="bg-[#0a0a0a] border border-white/5 p-4 rounded-xl text-left font-mono text-[10px] space-y-1.5 h-36 overflow-y-auto text-emerald-400">
                <p className="text-gray-500">{"[BAZINO-OS v2.6.4]"}</p>
                <p className="text-gray-400">{"[CONNECTING] Connecting to FrontDesk Scanner..."}</p>
                <p className="animate-pulse">{"[SCANNING] Initializing optical sensor laser sweeps..."}</p>
                <p className="text-primary">{"[INFO] Capturing raw QR matrix codes..."}</p>
                <p className="text-[#A855F7] animate-pulse">{"[DB] Querying secure reservation records database..."}</p>
                <p className="text-white">{"[SUCCESS] Verification successful! Seat activated."}</p>
              </div>

              <div className="pt-2">
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary animate-[pulse_1s_infinite]" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reservation details & Checkout panel */}
      <div className="lg:col-span-1">
        <div className="rounded-2xl border border-white/10 bg-dark-card p-6 sticky top-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/5 pb-3 font-display uppercase tracking-wider">
            <span className="w-1.5 h-6 bg-primary rounded-md shadow-[0_0_10px_rgba(0,240,255,0.4)]"></span>
            <span>
              {language === 'fa' && 'جزئیات رزرو'}
              {language === 'en' && 'Booking Details'}
              {language === 'ru' && 'Детали бронирования'}
              {language === 'tr' && 'Rezervasyon Detayları'}
            </span>
          </h3>

          {!selectedSystem ? (
            <div className="text-center py-12 text-gray-500">
              <ShieldAlert className="w-12 h-12 mx-auto text-gray-700 mb-3" />
              <p className="text-sm font-bold">
                {language === 'fa' && 'سیستمی انتخاب نشده است'}
                {language === 'en' && 'No system selected'}
                {language === 'ru' && 'Система не выбрана'}
                {language === 'tr' && 'Sistem seçilmedi'}
              </p>
              <p className="text-xs text-gray-600 mt-2 font-medium">
                {language === 'fa' && 'یک سیستم را از جدول روبه‌رو انتخاب کنید تا رزرو آغاز شود.'}
                {language === 'en' && 'Select a system from the layout grid to start booking.'}
                {language === 'ru' && 'Выберите систему из сетки, чтобы начать бронирование.'}
                {language === 'tr' && 'Rezervasyona başlamak için yandaki plandan bir sistem seçin.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              
              {/* Selected info card */}
              <div className="bg-[#0d122b] p-4 rounded-xl border border-white/5">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wide font-mono">{t('booking.selectedSys', 'سیستم انتخاب شده:')}</span>
                <h4 className="text-white text-sm font-bold mt-1 font-display">{selectedSystem.name}</h4>
                <div className="flex justify-between items-center text-xs text-primary font-bold mt-2 pt-2 border-t border-white/5 font-mono">
                  <span>{t('booking.hourlyRate', 'نرخ ساعتی:')}</span>
                  <span>{selectedSystem.hourlyRate.toLocaleString()} {t('common.currency', 'تومان')}</span>
                </div>
              </div>

              {/* Booking Hours range */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span className="font-bold">{t('booking.hoursLabel', 'مدت زمان رزرو (ساعت):')}</span>
                  <span className="font-bold text-primary font-mono">{hours} {language === 'fa' ? 'ساعت' : language === 'en' ? 'Hours' : language === 'ru' ? 'ч.' : 'Saat'}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 font-mono">
                  {[1, 2, 3, 4].map((h) => (
                    <button
                      key={h}
                      onClick={() => {
                        setHours(h);
                        setAppliedCoupon(null);
                        setCouponCode('');
                      }}
                      className={`py-2 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                        hours === h
                          ? 'border-primary bg-primary/15 text-primary shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {h}{language === 'fa' ? 'س' : language === 'en' ? 'H' : language === 'ru' ? 'ч' : 'S'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Promo code field */}
              <div className="border-t border-white/5 pt-4">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <Check className="w-4 h-4 animate-pulse" />
                      <span>{language === 'fa' ? 'اعمال شد:' : 'Applied:'} {appliedCoupon.code}</span>
                    </div>
                    <button 
                      onClick={() => setAppliedCoupon(null)}
                      className="text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t('booking.promoLabel', 'کد تخفیف (در صورت وجود):')}
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-[#0d122b] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-primary font-mono"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-black font-bold rounded-lg text-xs transition-all font-display uppercase tracking-wider cursor-pointer"
                    >
                      {t('booking.btnApply', 'اعمال')}
                    </button>
                  </div>
                )}
              </div>

              {/* Receipt Breakdowns */}
              <div className="border-t border-white/5 pt-4 space-y-2.5 text-xs text-gray-400 font-mono">
                <div className="flex justify-between font-medium">
                  <span>
                    {language === 'fa' && 'جمع هزینه رزرو:'}
                    {language === 'en' && 'Subtotal Rate:'}
                    {language === 'ru' && 'Подитог стоимости:'}
                    {language === 'tr' && 'Rezervasyon Toplamı:'}
                  </span>
                  <span className="text-gray-200">{subtotal.toLocaleString()} {t('common.currency', 'تومان')}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>
                      {language === 'fa' && 'کاهش قیمت:'}
                      {language === 'en' && 'Discount Amount:'}
                      {language === 'ru' && 'Сумма скидки:'}
                      {language === 'tr' && 'İndirim Tutarı:'}
                    </span>
                    <span>-{discount.toLocaleString()} {t('common.currency', 'تومان')}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-white/5 pt-2.5 text-sm font-black text-white font-sans">
                  <span>{t('booking.totalPrice', 'مبلغ کل فاکتور:')}</span>
                  <span className="text-primary text-base font-mono font-bold">{total.toLocaleString()} {t('common.currency', 'تومان')}</span>
                </div>

                {/* Loyalty points display */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3.5 text-primary mt-2 relative overflow-hidden font-sans">
                  <div className="absolute -top-12 -right-12 w-16 h-16 bg-primary/5 blur-xl"></div>
                  <div className="flex items-center gap-1.5 font-bold mb-1 relative z-10 font-display text-[11px] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t('booking.pointsToEarn', 'امتیاز وفاداری دریافتی:')}</span>
                  </div>
                  <span className="relative z-10 block text-[10px] leading-relaxed text-gray-400 font-medium">
                    {language === 'fa' && <>با نهایی کردن این رزرو، <strong className="text-white font-bold">{Math.floor(total / 10000)} امتیاز</strong> به باشگاه مشتریان شما واریز می‌شود.</>}
                    {language === 'en' && <>By completing this booking, <strong className="text-white font-bold">{Math.floor(total / 10000)} points</strong> will be added to your loyalty club.</>}
                    {language === 'ru' && <>Завершив бронь, вы получите <strong className="text-white font-bold">{Math.floor(total / 10000)} баллов</strong> на баланс клуба.</>}
                    {language === 'tr' && <>Bu rezervasyonu tamamladığınızda, <strong className="text-white font-bold">{Math.floor(total / 10000)} puan</strong> sadakat kulübünüze yüklenecektir.</>}
                  </span>
                </div>
              </div>

              {/* Pay button */}
              <button
                onClick={handleReserve}
                className="w-full mt-2 py-4 bg-primary text-black font-black uppercase tracking-wider rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:bg-primary-hover border-2 border-primary transition-all flex items-center justify-center gap-2 cursor-pointer font-display text-xs"
              >
                <CreditCard className="w-4 h-4" />
                <span>{t('booking.btnConfirm', 'پرداخت و تایید نهایی رزرو')}</span>
              </button>

            </div>
          )}
        </div>
      </div>

    </div>
  );
}
