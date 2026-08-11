import React, { useState } from 'react';
import { Accessory, DiscountCode } from '../types/gamenet';
import { ShoppingCart, Tag, CreditCard, ChevronRight, Check, X, Sparkles, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  themeId?: string;
  accessories: Accessory[];
  activeCoupons: DiscountCode[];
  onAddLoyaltyPoints: (points: number, desc: string) => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function ShopTab({
  accessories,
  activeCoupons,
  onAddLoyaltyPoints,
  addNotification,
}: Props) {
  const { t, dir, language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<Array<{ item: Accessory; qty: number }>>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<DiscountCode | null>(null);

  const categories = ['All', 'Keyboard', 'Mouse', 'Headset', 'Controller'];

  const filteredAccessories = selectedCategory === 'All'
    ? accessories
    : accessories.filter(a => a.category === selectedCategory);

  const addToCart = (accessory: Accessory) => {
    const existing = cart.find(c => c.item.id === accessory.id);
    if (existing) {
      if (existing.qty >= accessory.stock) {
        const errorStock = language === 'fa'
          ? `موجودی کالا (${accessory.stock}) کافی نیست.`
          : language === 'en'
          ? `Insufficient product stock (${accessory.stock}).`
          : language === 'ru'
          ? `Недостаточно товара на складе (${accessory.stock} шт.).`
          : `Yetersiz ürün stoğu (${accessory.stock} adet).`;
        addNotification(errorStock, 'error');
        return;
      }
      setCart(cart.map(c => c.item.id === accessory.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { item: accessory, qty: 1 }]);
    }

    const successAdd = language === 'fa'
      ? `${accessory.name} به سبد خرید اضافه شد.`
      : language === 'en'
      ? `${accessory.name} added to your shopping cart.`
      : language === 'ru'
      ? `${accessory.name} добавлен в корзину.`
      : `${accessory.name} sepete eklendi.`;

    addNotification(successAdd, 'success');
  };

  const updateQty = (id: string, delta: number) => {
    const current = cart.find(c => c.item.id === id);
    if (!current) return;
    
    const newQty = current.qty + delta;
    if (newQty <= 0) {
      setCart(cart.filter(c => c.item.id !== id));
    } else {
      if (newQty > current.item.stock) {
        const maxLimit = language === 'fa'
          ? `حداکثر موجودی (${current.item.stock}) است.`
          : language === 'en'
          ? `Maximum available stock limit is (${current.item.stock}).`
          : language === 'ru'
          ? `Максимальный лимит на складе (${current.item.stock} шт.).`
          : `Maksimum ürün stoğu (${current.item.stock}) adettir.`;
        addNotification(maxLimit, 'error');
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
      language === 'fa' ? 'کد تخفیف با موفقیت اعمال شد!' :
      language === 'en' ? 'Discount coupon applied successfully!' :
      language === 'ru' ? 'Промокод успешно применен!' :
      'İndirim kuponu uygulandı!',
      'success'
    );
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    const finalAmount = subtotal - discount;

    const pointsEarned = Math.floor(finalAmount / 10000);
    const invoiceNum = Math.floor(1000 + Math.random() * 9000);

    const descMsg = language === 'fa'
      ? `خرید لوازم جانبی گیمینگ (فاکتور #${invoiceNum})`
      : language === 'en'
      ? `Purchase of gaming accessories (Invoice #${invoiceNum})`
      : language === 'ru'
      ? `Покупка игровых аксессуаров (Счет #${invoiceNum})`
      : `Oyuncu ekipmanları satın alımı (Fatura #${invoiceNum})`;

    onAddLoyaltyPoints(pointsEarned, descMsg);
    
    const successMsg = language === 'fa'
      ? `پرداخت با موفقیت انجام شد! ${pointsEarned} امتیاز وفاداری به حساب شما اضافه گردید.`
      : language === 'en'
      ? `Payment completed successfully! ${pointsEarned} loyalty points have been added to your account.`
      : language === 'ru'
      ? `Оплата прошла успешно! Вам начислено ${pointsEarned} баллов лояльности.`
      : `Ödeme başarıyla tamamlandı! Hesabınıza ${pointsEarned} sadakat puanı eklendi.`;

    addNotification(successMsg, 'success');
    
    // Clear cart and state
    setCart([]);
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const total = subtotal - discount;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in font-sans" dir={dir}>
      
      {/* Products list area */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        
        {/* Category Pills & Info */}
        <div className="rounded-2xl p-5 relative overflow-hidden bg-dark-card border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none"></div>
          <div className="flex flex-wrap gap-2 relative z-10 font-display">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer uppercase tracking-wider border ${
                  selectedCategory === cat
                    ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                    : 'text-gray-400 hover:text-white bg-[#0f1326] hover:bg-white/5 border-white/10'
                }`}
              >
                {cat === 'All' && (language === 'fa' ? 'همه محصولات' : language === 'en' ? 'All Products' : language === 'ru' ? 'Все товары' : 'Tüm Ürünler')}
                {cat === 'Keyboard' && (language === 'fa' ? 'کیبورد' : language === 'en' ? 'Keyboards' : language === 'ru' ? 'Клавиатуры' : 'Klavyeler')}
                {cat === 'Mouse' && (language === 'fa' ? 'موس' : language === 'en' ? 'Mice' : language === 'ru' ? 'Мыши' : 'Fareler')}
                {cat === 'Headset' && (language === 'fa' ? 'هدست' : language === 'en' ? 'Headsets' : language === 'ru' ? 'Наушники' : 'Kulaklıklar')}
                {cat === 'Controller' && (language === 'fa' ? 'دسته بازی' : language === 'en' ? 'Controllers' : language === 'ru' ? 'Геймпады' : 'Oyun Kolları')}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-400 flex items-center gap-2 relative z-10 font-medium">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>
              {language === 'fa' && 'تجهیزات برند و اورجینال مخصوص گیمرهای سالن'}
              {language === 'en' && 'Original branded gear specially curated for arena gamers'}
              {language === 'ru' && 'Оригинальные брендовые девайсы для наших геймеров'}
              {language === 'tr' && 'Oyun salonumuzun oyuncuları için özel, orijinal ekipmanlar'}
            </span>
          </div>
        </div>

        {/* Accessories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {accessories.map((accessory) => {
            let translatedName = accessory.name;
            let translatedDesc = accessory.description;

            if (language !== 'fa') {
              if (accessory.name.includes('کیبورد مکانیکال')) {
                translatedName = language === 'en' ? 'Razer BlackWidow V4 Mechanical Keyboard' : language === 'ru' ? 'Механическая клавиатура Razer BlackWidow V4' : 'Razer BlackWidow V4 Mekanik Klavye';
                translatedDesc = language === 'en' ? 'Yellow silent switches, chroma RGB backlighting, elegant aluminum build.' : language === 'ru' ? 'Желтые тихие переключатели, подсветка RGB Chroma, алюминиевый корпус.' : 'Sarı sessiz anahtarlar, chroma RGB aydınlatma, şık alüminyum gövde.';
              } else if (accessory.name.includes('موس گیمینگ')) {
                translatedName = language === 'en' ? 'Logitech G Pro X Superlight Mouse' : language === 'ru' ? 'Игровая мышь Logitech G Pro X Superlight' : 'Logitech G Pro X Superlight Fare';
                translatedDesc = language === 'en' ? 'Ultra-lightweight 63g design, HERO 25K sensor, high performance wireless speed.' : language === 'ru' ? 'Ультралегкий вес 63г, сенсор HERO 25K, высокая скорость беспроводной связи.' : 'Ultra hafif 63g tasarım, HERO 25K sensör, yüksek performans kablosuz hız.';
              } else if (accessory.name.includes('هدست بیسیم')) {
                translatedName = language === 'en' ? 'HyperX Cloud III Wireless Headset' : language === 'ru' ? 'Беспроводная гарнитура HyperX Cloud III' : 'HyperX Cloud III Kablosuz Kulaklık';
                translatedDesc = language === 'en' ? 'DTS Headphone:X 3D spatial audio, 120-hour battery life, red-black cloud memory foam.' : language === 'ru' ? 'Пространственный 3D-звук DTS Headphone:X, 120 часов работы, пена с эффектом памяти.' : 'DTS Headphone:X 3D uzamsal ses, 120 saat pil ömrü, ultra konforlu kulak yastıkları.';
              } else if (accessory.name.includes('دسته بازی پلی‌استیشن')) {
                translatedName = language === 'en' ? 'DualSense Edge PS5 Controller' : language === 'ru' ? 'Контроллер DualSense Edge PS5' : 'DualSense Edge PS5 Oyun Kolu';
                translatedDesc = language === 'en' ? 'Pro-grade customization, change stick caps, map back paddles, profile presets.' : language === 'ru' ? 'Кастомизация про-уровня, сменные стики, лепестки, профили настроек.' : 'Profesyonel düzeyde özelleştirme, değiştirilebilir analog başlıkları, arka tuşlar.';
              }
            }

            return (
              <div 
                key={accessory.id}
                className="rounded-2xl border border-white/10 bg-dark-card overflow-hidden flex flex-col group hover:border-primary/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all duration-300"
              >
                {/* Product Image */}
                <div className="relative aspect-video w-full bg-[#0d122b] overflow-hidden">
                  <img loading="lazy" 
                    src={accessory.imageUrl} 
                    alt={translatedName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded bg-black/80 text-[10px] text-gray-300 font-bold border border-white/10 font-mono uppercase tracking-wide">
                    {accessory.category === 'Keyboard' && (language === 'fa' ? 'کیبورد' : language === 'en' ? 'Keyboard' : language === 'ru' ? 'Клавиатура' : 'Klavye')}
                    {accessory.category === 'Mouse' && (language === 'fa' ? 'موس' : language === 'en' ? 'Mouse' : language === 'ru' ? 'Мышь' : 'Fare')}
                    {accessory.category === 'Headset' && (language === 'fa' ? 'هدست' : language === 'en' ? 'Headset' : language === 'ru' ? 'Наушники' : 'Kulaklık')}
                    {accessory.category === 'Controller' && (language === 'fa' ? 'کنترلر' : language === 'en' ? 'Gamepad' : language === 'ru' ? 'Геймпад' : 'Oyun Kolu')}
                  </div>
                </div>

                {/* Product Details */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-white font-bold group-hover:text-primary transition-colors font-display text-sm tracking-wide">{translatedName}</h4>
                    <p className="text-gray-400 text-xs mt-2.5 leading-relaxed h-12 overflow-hidden text-ellipsis line-clamp-2 font-medium">
                      {translatedDesc}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-500 block font-bold font-mono uppercase">
                        {language === 'fa' ? 'قیمت ویژه:' : 'Special Price:'}
                      </span>
                      <strong className="text-primary font-black font-mono text-lg">{accessory.price.toLocaleString()}</strong>
                      <span className="text-gray-400 text-[10px] mr-1 font-bold">{t('common.currency', 'تومان')}</span>
                    </div>

                    <button
                      onClick={() => addToCart(accessory)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-primary text-primary font-black text-[10px] uppercase tracking-wider hover:bg-primary hover:text-black transition-all font-display cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{t('shop.btnBuy', 'خرید فوری کالا')}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Cart Column */}
      <div className="lg:col-span-1">
        <div className="rounded-2xl border border-white/10 bg-dark-card p-6 sticky top-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/5 pb-3 font-display uppercase tracking-wider">
            <span className="w-1.5 h-6 bg-primary rounded-md shadow-[0_0_10px_rgba(0,240,255,0.4)]"></span>
            <span>{t('cafe.cartTitle', 'سبد خرید تجهیزات')}</span>
            {cart.length > 0 && (
              <span className="mr-auto bg-primary text-black text-xs font-black w-5 h-5 rounded flex items-center justify-center font-mono">
                {cart.reduce((acc, c) => acc + c.qty, 0)}
              </span>
            )}
          </h3>

          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingBag className="w-12 h-12 mx-auto text-gray-700 mb-3 animate-pulse" />
              <p className="text-sm font-bold">{t('cafe.emptyCart', 'سبد خرید شما خالی است')}</p>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">
                {language === 'fa' && 'تجهیزاتی به سبد خود اضافه کنید.'}
                {language === 'en' && 'Add some premium gear to your cart.'}
                {language === 'ru' && 'Добавьте девайсы в свою корзину.'}
                {language === 'tr' && 'Sepetinize harika ekipmanlar ekleyin.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              
              {/* Cart Items list */}
              <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {cart.map((item) => {
                  let mappedItemName = item.item.name;
                  if (language !== 'fa') {
                    if (item.item.name.includes('کیبورد مکانیکال')) mappedItemName = 'Razer Keyboard';
                    else if (item.item.name.includes('موس گیمینگ')) mappedItemName = 'Logitech G Pro Mouse';
                    else if (item.item.name.includes('هدست بیسیم')) mappedItemName = 'HyperX Headset';
                    else if (item.item.name.includes('دسته بازی 플레이스테이션')) mappedItemName = 'DualSense Edge';
                  }

                  return (
                    <div key={item.item.id} className="flex gap-3 bg-[#0d122b] p-2.5 rounded-xl border border-white/5 relative group">
                      <div className="w-12 h-12 bg-[#0f1326] rounded overflow-hidden shrink-0">
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

              {/* Coupon code input */}
              <div className="border-t border-white/5 pt-4">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <Check className="w-4 h-4 animate-pulse" />
                      <span>{language === 'fa' ? 'تخفیف اعمال شد:' : 'Discount applied:'} {appliedCoupon.code}</span>
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
                    {language === 'fa' && 'مجموع خرید تجهیزات:'}
                    {language === 'en' && 'Gear Subtotal:'}
                    {language === 'ru' && 'Подитог товаров:'}
                    {language === 'tr' && 'Ekipmanlar Toplamı:'}
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
                    {language === 'fa' && <>با نهایی کردن خرید، <strong className="text-white font-bold">{Math.floor(total / 10000)} امتیاز</strong> به باشگاه مشتریان شما افزوده می‌شود.</>}
                    {language === 'en' && <>By confirming this purchase, you will receive <strong className="text-white font-bold">{Math.floor(total / 10000)} points</strong>.</>}
                    {language === 'ru' && <>После покупки вы получите <strong className="text-white font-bold">{Math.floor(total / 10000)} баллов</strong> на клубную карту.</>}
                    {language === 'tr' && <>Satın alma işlemini tamamladığınızda, <strong className="text-white font-bold">{Math.floor(total / 10000)} puan</strong> kazanırsınız.</>}
                  </span>
                </div>
              </div>

              {/* Purchase button */}
              <button
                onClick={handleCheckout}
                className="w-full mt-2 py-4 bg-primary text-black font-black uppercase tracking-wider rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:bg-primary-hover border-2 border-primary transition-all flex items-center justify-center gap-2 cursor-pointer font-display text-xs"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {language === 'fa' && 'پرداخت نهایی و تسویه'}
                  {language === 'en' && 'Finalize & Checkout'}
                  {language === 'ru' && 'Оплатить и оформить'}
                  {language === 'tr' && 'Ödemeyi Tamamla'}
                </span>
              </button>

            </div>
          )}
        </div>
      </div>

    </div>
  );
}
