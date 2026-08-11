import React, { useState } from 'react';
import { CafeItem, DiscountCode } from '../types/gamenet';
import { ShoppingCart, Check, X, Sparkles, Coffee, Utensils, Zap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  themeId?: string;
  cafeItems: CafeItem[];
  activeCoupons: DiscountCode[];
  onAddLoyaltyPoints: (points: number, desc: string) => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function CafeTab({
  cafeItems,
  activeCoupons,
  onAddLoyaltyPoints,
  addNotification,
}: Props) {
  const { t, dir, language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<Array<{ item: CafeItem; qty: number }>>([]);
  const [systemNumber, setSystemNumber] = useState('Seat #05');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<DiscountCode | null>(null);

  const categories = ['All', 'Drinks', 'Foods', 'Snacks'];

  const filteredItems = selectedCategory === 'All'
    ? cafeItems
    : cafeItems.filter(item => item.category === selectedCategory);

  const addToCart = (item: CafeItem) => {
    const existing = cart.find(c => c.item.id === item.id);
    if (existing) {
      if (existing.qty >= item.inventory) {
        const errorStock = language === 'fa'
          ? `موجودی کافه (${item.inventory}) کافی نیست.`
          : language === 'en'
          ? `Buffet stock (${item.inventory}) is insufficient.`
          : language === 'ru'
          ? `Недостаточно в буфете (${item.inventory} шт.).`
          : `Yetersiz stok (${item.inventory} adet).`;
        addNotification(errorStock, 'error');
        return;
      }
      setCart(cart.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { item, qty: 1 }]);
    }

    const successAdd = language === 'fa'
      ? `${item.name} به سفارش کافه اضافه شد.`
      : language === 'en'
      ? `${item.name} added to buffet order.`
      : language === 'ru'
      ? `${item.name} добавлен в заказ.`
      : `${item.name} siparişe eklendi.`;

    addNotification(successAdd, 'success');
  };

  const updateQty = (id: string, delta: number) => {
    const current = cart.find(c => c.item.id === id);
    if (!current) return;

    const newQty = current.qty + delta;
    if (newQty <= 0) {
      setCart(cart.filter(c => c.item.id !== id));
    } else {
      if (newQty > current.item.inventory) {
        const maxStock = language === 'fa'
          ? `حداکثر موجودی بوفه (${current.item.inventory}) است.`
          : language === 'en'
          ? `Maximum buffet stock limit is (${current.item.inventory}).`
          : language === 'ru'
          ? `Достигнут лимит наличия (${current.item.inventory} шт.).`
          : `Maksimum büfe stoğu (${current.item.inventory}) adettir.`;
        addNotification(maxStock, 'error');
        return;
      }
      setCart(cart.map(c => c.item.id === id ? { ...c, qty: newQty } : c));
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(c => c.item.id !== id));
  };

  const getSubtotal = () => cart.reduce((acc, c) => acc + (c.item.price * c.qty), 0);

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
      const errorMin = language === 'fa'
        ? `حداقل خرید جهت اعمال این کد ${found.minOrder.toLocaleString()} تومان است.`
        : language === 'en'
        ? `Minimum order value to apply this code is ${found.minOrder.toLocaleString()} Tomans.`
        : language === 'ru'
        ? `Минимальный заказ для применения кода: ${found.minOrder.toLocaleString()} томанов.`
        : `Bu kodu uygulamak için minimum sipariş tutarı ${found.minOrder.toLocaleString()} Tümen'dir.`;
      addNotification(errorMin, 'error');
      return;
    }

    setAppliedCoupon(found);
    addNotification(
      language === 'fa' ? 'تخفیف بوفه با موفقیت اعمال شد!' :
      language === 'en' ? 'Buffet discount applied successfully!' :
      language === 'ru' ? 'Скидка на буфет успешно применена!' :
      'Büfe indirimi başarıyla uygulandı!',
      'success'
    );
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (!systemNumber.trim()) {
      addNotification(
        language === 'fa' ? 'لطفاً شماره سیستم یا صندلی خود را وارد کنید.' :
        language === 'en' ? 'Please enter your system or seat number.' :
        language === 'ru' ? 'Пожалуйста, введите номер места или системы.' :
        'Lütfen sistem veya koltuk numaranızı girin.',
        'error'
      );
      return;
    }

    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    const finalAmount = subtotal - discount;

    const pointsEarned = Math.floor(finalAmount / 10000);

    const descMsg = language === 'fa'
      ? `خرید از بوفه و کافه تحویل روی سیستم ${systemNumber}`
      : language === 'en'
      ? `Buffet order delivered to system ${systemNumber}`
      : language === 'ru'
      ? `Заказ буфета доставлен на систему ${systemNumber}`
      : `Büfe siparişi ${systemNumber} nolu sisteme teslim edildi`;

    onAddLoyaltyPoints(pointsEarned, descMsg);

    const successMsg = language === 'fa'
      ? `سفارش شما ثبت شد! بلافاصله پس از آماده‌سازی روی صندلی ${systemNumber} تحویل داده می‌شود. ${pointsEarned} امتیاز به شما تعلق گرفت.`
      : language === 'en'
      ? `Your order has been registered! It will be delivered to seat ${systemNumber} immediately after preparation. You earned ${pointsEarned} points.`
      : language === 'ru'
      ? `Ваш заказ зарегистрирован! Он будет доставлен к вашему месту ${systemNumber} сразу после приготовления. Получено ${pointsEarned} баллов.`
      : `Siparişiniz kaydedildi! Hazırlandıktan hemen sonra ${systemNumber} nolu koltuğa teslim edilecektir. ${pointsEarned} puan kazandınız.`;

    addNotification(successMsg, 'success');

    setCart([]);
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const total = subtotal - discount;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in font-sans" dir={dir}>
      
      {/* Menu items list */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        
        {/* Category Selector bar */}
        <div className="rounded-2xl p-5 relative overflow-hidden bg-dark-card border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none"></div>
          <div className="flex flex-wrap gap-2 relative z-10 font-display">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider border ${
                  selectedCategory === cat
                    ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                    : 'text-gray-400 hover:text-white bg-[#0f1326] hover:bg-white/5 border-white/10'
                }`}
              >
                {cat === 'Drinks' && <Coffee className="w-3.5 h-3.5" />}
                {cat === 'Foods' && <Utensils className="w-3.5 h-3.5" />}
                {cat === 'Snacks' && <Zap className="w-3.5 h-3.5" />}
                {cat === 'All' && (language === 'fa' ? 'منوی کامل' : language === 'en' ? 'Full Menu' : language === 'ru' ? 'Полное меню' : 'Tüm Menü')}
                {cat === 'Drinks' && (language === 'fa' ? 'نوشیدنی‌ها' : language === 'en' ? 'Drinks & Soda' : language === 'ru' ? 'Напитки' : 'İçecekler')}
                {cat === 'Foods' && (language === 'fa' ? 'غذاهای گرم' : language === 'en' ? 'Hot Dishes' : language === 'ru' ? 'Горячие блюда' : 'Sıcak Yemekler')}
                {cat === 'Snacks' && (language === 'fa' ? 'اسنک و تنقلات' : language === 'en' ? 'Snacks & Chips' : language === 'ru' ? 'Закуски и чипсы' : 'Atıştırmalıklar')}
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-400 flex items-center gap-2 relative z-10 font-medium">
            <Coffee className="w-4 h-4 text-primary" />
            <span>
              {language === 'fa' && 'سفارش بوفه مستقیماً روی صندلی یا میز بازی شما تحویل داده می‌شود'}
              {language === 'en' && 'Buffet orders are delivered directly to your system gaming desk'}
              {language === 'ru' && 'Заказы из буфета доставляются прямо к вашему игровому столу'}
              {language === 'tr' && 'Büfe siparişleri doğrudan oyun masanıza teslim edilir'}
            </span>
          </div>
        </div>

        {/* Cafe Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            let translatedName = item.name;
            if (language !== 'fa') {
              if (item.name.includes('پیتزا پپرونی')) {
                translatedName = language === 'en' ? 'Pepperoni Pizza XL' : language === 'ru' ? 'Пицца Пепперони XL' : 'Pepperoni Pizza XL';
              } else if (item.name.includes('همبرگر دوبل')) {
                translatedName = language === 'en' ? 'Double Cheese Burger' : language === 'ru' ? 'Двойной Чизбургер' : 'Double Burger';
              } else if (item.name.includes('سیب‌زمینی سرخ‌کرده')) {
                translatedName = language === 'en' ? 'French Fries XL' : language === 'ru' ? 'Картофель Фри XL' : 'Patates Kızartması XL';
              } else if (item.name.includes('انرژی‌زا ردبول')) {
                translatedName = language === 'en' ? 'RedBull Energy Drink' : language === 'ru' ? 'Энергетик RedBull' : 'RedBull Enerji İçeceği';
              } else if (item.name.includes('موهیتو خنک')) {
                translatedName = language === 'en' ? 'Fresh Mojito Ice' : language === 'ru' ? 'Ледяной Мохито' : 'Nane Limon Mojito';
              } else if (item.name.includes('قهوه اسپرسو دوبل')) {
                translatedName = language === 'en' ? 'Double Espresso Shot' : language === 'ru' ? 'Двойной Эспрессо' : 'Double Espresso';
              } else if (item.name.includes('چیپس ساده نمکی')) {
                translatedName = language === 'en' ? 'Salted Potato Chips' : language === 'ru' ? 'Чипсы соленые' : 'Sade Tuzlu Cips';
              } else if (item.name.includes('پفک نمکی لینا')) {
                translatedName = language === 'en' ? 'Lina Crunchy Snacks' : language === 'ru' ? 'Кукурузные Снеки' : 'Lina Çıtır Atıştırmalık';
              }
            }

            return (
              <div 
                key={item.id}
                className="rounded-2xl border border-white/10 bg-dark-card overflow-hidden flex flex-col group hover:border-primary/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all duration-300"
              >
                <div className="relative aspect-video w-full bg-[#0d122b] overflow-hidden">
                  <img loading="lazy" 
                    src={item.imageUrl} 
                    alt={translatedName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded bg-black/80 text-[10px] text-gray-300 font-bold border border-white/10 font-mono uppercase tracking-wide">
                    {item.category === 'Drinks' && (language === 'fa' ? 'نوشیدنی' : language === 'en' ? 'Drinks' : language === 'ru' ? 'Напиток' : 'İçecek')}
                    {item.category === 'Foods' && (language === 'fa' ? 'غذای گرم' : language === 'en' ? 'Hot Dish' : language === 'ru' ? 'Горячее блюдо' : 'Yemek')}
                    {item.category === 'Snacks' && (language === 'fa' ? 'تنقلات' : language === 'en' ? 'Snack' : language === 'ru' ? 'Закуска' : 'Atıştırmalık')}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-white font-bold group-hover:text-primary transition-colors font-display text-sm tracking-wide">{translatedName}</h4>
                    <div className="flex justify-between items-center mt-2.5 text-xs text-gray-500 font-medium">
                      <span>
                        {t('cafe.inventory', 'موجودی:')}: <strong className="text-gray-300 font-mono font-bold">{item.inventory}</strong> {t('cafe.pcs', 'عدد')}
                      </span>
                      <span className="text-primary font-mono text-[10px] font-bold uppercase tracking-wider">
                        {language === 'fa' && 'تحویل روی سیستم'}
                        {language === 'en' && 'Seat Delivery'}
                        {language === 'ru' && 'К месту'}
                        {language === 'tr' && 'Masaya Hizmet'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 block font-bold font-mono uppercase">
                        {language === 'fa' ? 'قیمت:' : 'Price:'}
                      </span>
                      <strong className="text-primary font-black font-mono text-lg">{item.price.toLocaleString()}</strong>
                      <span className="text-gray-400 text-[10px] mr-1 font-bold">{t('common.currency', 'تومان')}</span>
                    </div>

                    <button
                      onClick={() => addToCart(item)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-primary text-primary font-black text-[10px] uppercase tracking-wider hover:bg-primary hover:text-black transition-all font-display cursor-pointer"
                    >
                      <span>{t('cafe.addToCart', 'افزودن به سبد خرید')}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Checkout Sidebar */}
      <div className="lg:col-span-1">
        <div className="rounded-2xl border border-white/10 bg-dark-card p-6 sticky top-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/5 pb-3 font-display uppercase tracking-wider">
            <span className="w-1.5 h-6 bg-primary rounded-md shadow-[0_0_10px_rgba(0,240,255,0.4)]"></span>
            <span>{t('cafe.cartTitle', 'سبد خرید خوراکی')}</span>
            {cart.length > 0 && (
              <span className="mr-auto bg-primary text-black text-xs font-black w-5 h-5 rounded flex items-center justify-center font-mono">
                {cart.reduce((acc, c) => acc + c.qty, 0)}
              </span>
            )}
          </h3>

          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Coffee className="w-12 h-12 mx-auto text-gray-700 mb-3 animate-pulse" />
              <p className="text-sm font-bold">{t('cafe.emptyCart', 'سبد خرید شما خالی است')}</p>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">{t('cafe.emptyCartDesc', 'از منوی بوفه، پیتزا، ردبول یا تنقلات مورد نظرتان را اضافه کنید.')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              
              {/* Table / System Seat Selection */}
              <div className="bg-[#0d122b] p-3.5 rounded-xl border border-white/5">
                <label className="text-xs text-gray-400 block mb-1.5 font-bold">
                  {language === 'fa' && 'تحویل روی کدام صندلی/میز؟'}
                  {language === 'en' && 'Deliver to which seat/desk?'}
                  {language === 'ru' && 'Доставить к какому месту?'}
                  {language === 'tr' && 'Hangi masaya teslim edilsin?'}
                </label>
                <select
                  value={systemNumber}
                  onChange={(e) => setSystemNumber(e.target.value)}
                  className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-bold cursor-pointer font-mono"
                >
                  <option value="Seat #01">{language === 'fa' ? 'سیستم شماره ۱ (PC Standard)' : 'System #1 (PC Standard)'}</option>
                  <option value="Seat #02">{language === 'fa' ? 'سیستم شماره ۲ (PC Standard)' : 'System #2 (PC Standard)'}</option>
                  <option value="Seat #03">{language === 'fa' ? 'سیستم شماره ۳ (PC Standard)' : 'System #3 (PC Standard)'}</option>
                  <option value="Seat #04">{language === 'fa' ? 'سیستم شماره ۴ (PC Standard)' : 'System #4 (PC Standard)'}</option>
                  <option value="Seat #05">{language === 'fa' ? 'سیستم شماره ۵ (PC VIP)' : 'System #5 (PC VIP)'}</option>
                  <option value="Seat #06">{language === 'fa' ? 'سیستم شماره ۶ (PC VIP)' : 'System #6 (PC VIP)'}</option>
                  <option value="Seat #07">{language === 'fa' ? 'سیستم شماره ۷ (PC VIP)' : 'System #7 (PC VIP)'}</option>
                  <option value="Seat #08">{language === 'fa' ? 'سیستم شماره ۸ (PS5 #1)' : 'System #8 (PS5 #1)'}</option>
                  <option value="Seat #09">{language === 'fa' ? 'سیستم شماره ۹ (PS5 #2)' : 'System #9 (PS5 #2)'}</option>
                  <option value="Seat #10">{language === 'fa' ? 'سیستم شماره ۱۰ (Xbox Series)' : 'System #10 (Xbox Series)'}</option>
                  <option value="Table VIP #1">{language === 'fa' ? 'میز استراحت VIP ۱' : 'Relax Lounge Table #1'}</option>
                  <option value="Table VIP #2">{language === 'fa' ? 'میز استراحت VIP ۲' : 'Relax Lounge Table #2'}</option>
                </select>
              </div>

              {/* Order Items List */}
              <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {cart.map((item) => {
                  let mappedItemName = item.item.name;
                  if (language !== 'fa') {
                    if (item.item.name.includes('پیتزا پپرونی')) mappedItemName = 'Pepperoni Pizza';
                    else if (item.item.name.includes('همبرگر دوبل')) mappedItemName = 'Double Burger';
                    else if (item.item.name.includes('سیب‌زمینی سرخ‌کرده')) mappedItemName = 'French Fries';
                    else if (item.item.name.includes('انرژی‌زا ردبول')) mappedItemName = 'RedBull Energy';
                    else if (item.item.name.includes('موهیتو خنک')) mappedItemName = 'Mojito Ice';
                    else if (item.item.name.includes('قهوه اسپرسو دوبل')) mappedItemName = 'Espresso Shot';
                    else if (item.item.name.includes('چیپس ساده نمکی')) mappedItemName = 'Potato Chips';
                    else if (item.item.name.includes('پفک نمکی لینا')) mappedItemName = 'Lina Snacks';
                  }

                  return (
                    <div key={item.item.id} className="flex gap-3 bg-[#0d122b] p-2.5 rounded-xl border border-white/5 relative group">
                      <div className="w-10 h-10 bg-[#0f1326] rounded overflow-hidden shrink-0">
                        <img loading="lazy" src={item.item.imageUrl} alt={mappedItemName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <h4 className="text-white text-xs font-bold truncate font-display">{mappedItemName}</h4>
                        <div className="flex items-center justify-between mt-1 font-mono">
                          <span className="text-primary font-bold text-xs">
                            {(item.item.price * item.qty).toLocaleString()} {t('common.currency', 'تومان')}
                          </span>

                          {/* Qty actions */}
                          <div className="flex items-center gap-1.5 bg-[#0f1326] rounded border border-white/10 px-1 py-0.5">
                            <button 
                              onClick={() => updateQty(item.item.id, -1)}
                              className="text-gray-400 hover:text-white px-1.5 text-xs font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-white text-xs font-black font-mono">{item.qty}</span>
                            <button 
                              onClick={() => updateQty(item.item.id, 1)}
                              className="text-gray-400 hover:text-white px-1.5 text-xs font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.item.id)}
                        className="absolute top-1 left-1 p-1 rounded bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Coupon input */}
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
                      placeholder={t('booking.promoLabel', 'کد تخفیف')}
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
                    {language === 'fa' && 'مجموع اقلام بوفه:'}
                    {language === 'en' && 'Items Subtotal:'}
                    {language === 'ru' && 'Подитог товаров:'}
                    {language === 'tr' && 'Yiyecekler Toplamı:'}
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
                  <span>{t('booking.totalPrice', 'مبلغ قابل پرداخت:')}</span>
                  <span className="text-primary text-base font-mono font-bold">{total.toLocaleString()} {t('common.currency', 'تومان')}</span>
                </div>

                {/* Loyalty points display */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3.5 text-primary mt-2 relative overflow-hidden font-sans">
                  <div className="absolute -top-12 -right-12 w-16 h-16 bg-primary/5 blur-xl"></div>
                  <div className="flex items-center gap-1.5 font-bold mb-1 relative z-10 font-display text-xs uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t('booking.pointsToEarn', 'کسب امتیاز باشگاه:')}</span>
                  </div>
                  <span className="relative z-10 block text-[10px] leading-relaxed text-gray-400 font-medium font-sans">
                    {language === 'fa' && <>با تکمیل این سفارش، <strong className="text-white font-bold">{Math.floor(total / 10000)} امتیاز</strong> دریافت خواهید کرد.</>}
                    {language === 'en' && <>By confirming this order, you will earn <strong className="text-white font-bold">{Math.floor(total / 10000)} points</strong>.</>}
                    {language === 'ru' && <>После оплаты заказа вам начислится <strong className="text-white font-bold">{Math.floor(total / 10000)} баллов</strong>.</>}
                    {language === 'tr' && <>Bu siparişi tamamladığınızda <strong className="text-white font-bold">{Math.floor(total / 10000)} puan</strong> kazanacaksınız.</>}
                  </span>
                </div>
              </div>

              {/* Order button */}
              <button
                onClick={handleCheckout}
                className="w-full mt-2 py-4 bg-primary text-black font-black uppercase tracking-wider rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:bg-primary-hover border-2 border-primary transition-all flex items-center justify-center gap-2 cursor-pointer font-display text-xs"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{t('cafe.btnOrder', 'ثبت نهایی سفارش بوفه')}</span>
              </button>

            </div>
          )}
        </div>
      </div>

    </div>
  );
}
