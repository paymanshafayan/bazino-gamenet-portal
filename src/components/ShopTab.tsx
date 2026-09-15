import React, { useState, useEffect } from 'react';
import { Accessory, DiscountCode } from '../types/gamenet';
import { ShoppingCart, Tag, CreditCard, ChevronRight, Check, X, Sparkles, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { postJson, errorMessage, toServerCart } from '../services/postJson';
import { CheckoutModal, type CheckoutResult } from '../legal/CheckoutModal';
import { L, localeOf } from '../utils/i18n';
import ComingSoonPanel from './ComingSoonPanel';
import ThemeRegion from '../themeSdk/ThemeRegion';
import { useThemeRegionBase } from '../themeSdk/ThemeRegion';

interface Props {
  themeId?: string;
  accessories: Accessory[];
  activeCoupons: DiscountCode[];
  onServerState: (data: any) => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  comingSoon?: boolean;
}

export default function ShopTab({
  accessories,
  activeCoupons,
  onServerState,
  addNotification,
  comingSoon,
}: Props) {
  const { t, dir, language } = useLanguage();
  const themeBase = useThemeRegionBase();
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
        addNotification(L(language, { fa: `موجودی کالا (${accessory.stock}) کافی نیست.`, en: `Insufficient product stock (${accessory.stock}).`, ru: `Недостаточно товара на складе (${accessory.stock} шт.).`, tr: `Ürün stoğu (${accessory.stock}) yetersiz.` }), 'error');
        return;
      }
      setCart(cart.map(c => c.item.id === accessory.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { item: accessory, qty: 1 }]);
    }
    addNotification(L(language, { fa: `${accessory.name} به سبد خرید اضافه شد.`, en: `${accessory.name} added to your shopping cart.`, ru: `${accessory.name} добавлен в корзину.`, tr: `${accessory.name} sepetinize eklendi.` }), 'success');
  };

  const updateQty = (id: string, delta: number) => {
    const current = cart.find(c => c.item.id === id);
    if (!current) return;
    const newQty = current.qty + delta;
    if (newQty <= 0) {
      setCart(cart.filter(c => c.item.id !== id));
    } else {
      if (newQty > current.item.stock) {
        addNotification(L(language, { fa: `حداکثر موجودی (${current.item.stock}) است.`, en: `Maximum available stock limit is (${current.item.stock}).`, ru: `Максимальный лимит на складе (${current.item.stock} шт.).`, tr: `Maksimum stok (${current.item.stock}).` }), 'error');
        return;
      }
      setCart(cart.map(c => c.item.id === id ? { ...c, qty: newQty } : c));
    }
  };

  const removeFromCart = (id: string) => setCart(cart.filter(c => c.item.id !== id));
  const getSubtotal = () => cart.reduce((acc, c) => acc + (c.item.price * c.qty), 0);
  const getDiscountAmount = () => {
    if (!appliedCoupon) return 0;
    const subtotal = getSubtotal();
    if (subtotal < appliedCoupon.minOrder) return 0;
    return appliedCoupon.type === 'Percent' ? subtotal * (appliedCoupon.value / 100) : appliedCoupon.value;
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    const found = activeCoupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase());
    if (!found) {
      addNotification(L(language, { fa: 'کد تخفیف معتبر نیست یا منقضی شده است.', en: 'Discount code is invalid or expired.', ru: 'Промокод недействителен или истек.', tr: 'İndirim kodu geçersiz veya süresi dolmuş.' }), 'error');
      return;
    }
    const subtotal = getSubtotal();
    if (subtotal < found.minOrder) {
      addNotification(L(language, { fa: `حداقل خرید جهت اعمال این کد ${found.minOrder.toLocaleString(localeOf(language))} لیر است.`, en: `Minimum order value to apply this code is ${found.minOrder.toLocaleString(localeOf(language))} TL.`, ru: `Минимальный заказ для применения кода: ${found.minOrder.toLocaleString(localeOf(language))} TL.`, tr: `Bu kodu uygulamak için minimum sipariş tutarı ${found.minOrder.toLocaleString(localeOf(language))} TL.` }), 'error');
      return;
    }
    setAppliedCoupon(found);
    addNotification(L(language, { fa: 'کد تخفیف با موفقیت اعمال شد!', en: 'Discount coupon applied successfully!', ru: 'Промокод успешно применен!', tr: 'İndirim kuponu başarıyla uygulandı!' }), 'success');
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliverySystemId,setDeliverySystemId] = useState('');
  const [deliverySystems,setDeliverySystems] = useState<any[]>([]);
  useEffect(() => { fetch('/api/systems').then(r=>r.json()).then(d=>setDeliverySystems(Array.isArray(d)?d:[])).catch(()=>{}); }, []);
  const [checkout, setCheckout] = useState<{ params: Record<string, unknown>; amount: number } | null>(null);

  const handleCheckout = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setCheckout({ params: { cart: toServerCart(cart), couponCode: appliedCoupon?.code || '', systemId: deliverySystemId || undefined }, amount: getSubtotal() - getDiscountAmount() });
  };

  const subtotal = getSubtotal();
  const discount = getDiscountAmount();
  const total = subtotal - discount;

  if (comingSoon) return <ComingSoonPanel kind="shop" />;

  const gridFallback = (
    <>
      <div className="rounded-2xl p-5 relative overflow-hidden bg-dark-card border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none"></div>
        <div className="flex flex-wrap gap-2 relative z-10 font-display">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer uppercase tracking-wider border ${selectedCategory === cat ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(0,240,255,0.25)]' : 'text-gray-400 hover:text-white bg-card-3 hover:bg-white/5 border-white/10'}`}>
              {cat === 'All' && (L(language, { fa: 'همه محصولات', en: 'All Products', ru: 'Все товары', tr: 'Tüm Ürünler' }))}
              {cat === 'Keyboard' && (L(language, { fa: 'کیبورد', en: 'Keyboards', ru: 'Клавиатуры', tr: 'Klavyeler' }))}
              {cat === 'Mouse' && (L(language, { fa: 'موس', en: 'Mice', ru: 'Мыши', tr: 'Fareler' }))}
              {cat === 'Headset' && (L(language, { fa: 'هدست', en: 'Headsets', ru: 'Наушники', tr: 'Kulaklıklar' }))}
              {cat === 'Controller' && (L(language, { fa: 'دسته بازی', en: 'Controllers', ru: 'Геймпады', tr: 'Oyun Kolları' }))}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-2 relative z-10 font-medium">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>{L(language, { fa: 'تجهیزات برند و اورجینال مخصوص گیمرهای سالن', en: 'Original branded gear specially curated for arena gamers', ru: 'Оригинальные брендовые девайсы для наших геймеров', tr: 'Oyun salonumuzun oyuncuları için özel, orijinal ekipmanlar' })}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAccessories.map((accessory) => (
          <div key={accessory.id} className="rounded-2xl border border-white/10 bg-dark-card overflow-hidden flex flex-col group hover:border-primary/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all duration-300">
            <div className="relative aspect-video w-full bg-card-2 overflow-hidden">
              <img loading="lazy" src={accessory.imageUrl} alt={accessory.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded bg-black/80 text-[10px] text-gray-300 font-bold border border-white/10 font-mono uppercase tracking-wide">{accessory.category}</div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-white font-bold group-hover:text-primary transition-colors font-display text-sm tracking-wide">{accessory.name}</h4>
                <p className="text-gray-400 text-xs mt-2.5 leading-relaxed h-12 overflow-hidden text-ellipsis line-clamp-2 font-medium">{accessory.description}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 block font-bold font-mono uppercase">{L(language, { fa: 'قیمت ویژه:', en: 'Special Price:', ru: 'Спеццена:', tr: 'Özel Fiyat:' })}</span>
                  <strong className="text-primary font-black font-mono text-lg">{accessory.price.toLocaleString(localeOf(language))}</strong>
                  <span className="text-gray-400 text-[10px] mr-1 font-bold">{t('common.currency', 'لیر')}</span>
                </div>
                <button onClick={() => addToCart(accessory)} data-shop-add className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-primary text-primary font-black text-[10px] uppercase tracking-wider hover:bg-primary hover:text-black transition-all font-display cursor-pointer">
                  <ShoppingBag className="w-3.5 h-3.5" /><span>{t('shop.btnBuy', 'خرید فوری کالا')}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const cartFallback = (
    <div className="rounded-2xl border border-white/10 bg-dark-card p-6 sticky top-6">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-white/5 pb-3 font-display uppercase tracking-wider">
        <span className="w-1.5 h-6 bg-primary rounded-md shadow-[0_0_10px_rgba(0,240,255,0.4)]"></span>
        <span>{t('cafe.cartTitle', 'سبد خرید تجهیزات')}</span>
        {cart.length > 0 && <span className="mr-auto bg-primary text-black text-xs font-black w-5 h-5 rounded flex items-center justify-center font-mono">{cart.reduce((acc, c) => acc + c.qty, 0)}</span>}
      </h3>
      {cart.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <ShoppingBag className="w-12 h-12 mx-auto text-gray-700 mb-3 animate-pulse" />
          <p className="text-sm font-bold">{t('cafe.emptyCart', 'سبد خرید شما خالی است')}</p>
          <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">{L(language, { fa: 'تجهیزاتی به سبد خود اضافه کنید.', en: 'Add some premium gear to your cart.', ru: 'Добавьте девайсы в свою корзину.', tr: 'Sepetinize harika ekipmanlar ekleyin.' })}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.item.id} className="flex gap-3 bg-card-2 p-2.5 rounded-xl border border-white/5 relative group">
                <div className="w-12 h-12 bg-card-3 rounded overflow-hidden shrink-0">
                  <img loading="lazy" src={item.item.imageUrl} alt={item.item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <h4 className="text-white text-xs font-bold truncate font-display">{item.item.name}</h4>
                  <div className="flex items-center justify-between mt-1 font-mono">
                    <span className="text-primary font-bold text-xs">{(item.item.price * item.qty).toLocaleString(localeOf(language))} {t('common.currency', 'لیر')}</span>
                    <div className="flex items-center gap-1.5 bg-card-3 rounded border border-white/10 px-1 py-0.5">
                      <button onClick={() => updateQty(item.item.id, -1)} className="text-gray-400 hover:text-white px-1.5 text-xs font-bold cursor-pointer">-</button>
                      <span className="text-white text-xs font-black font-mono">{item.qty}</span>
                      <button onClick={() => updateQty(item.item.id, 1)} className="text-gray-400 hover:text-white px-1.5 text-xs font-bold cursor-pointer">+</button>
                    </div>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.item.id)} className="absolute top-1 left-1 p-1 rounded bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:bg-rose-500/20 cursor-pointer"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-4">
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg text-xs font-mono">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold"><Check className="w-4 h-4 animate-pulse" /><span>{L(language, { fa: 'تخفیف اعمال شد:', en: 'Discount applied:', ru: 'Скидка применена:', tr: 'İndirim uygulandı:' })} {appliedCoupon.code}</span></div>
                <button onClick={() => setAppliedCoupon(null)} className="text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="text" placeholder={t('booking.promoLabel', 'کد تخفیف')} value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="flex-1 px-3.5 py-2.5 bg-card-2 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-primary font-mono" />
                <button onClick={handleApplyCoupon} className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-black font-bold rounded-lg text-xs transition-all font-display uppercase tracking-wider cursor-pointer">{t('booking.btnApply', 'اعمال')}</button>
              </div>
            )}
          </div>
          <div className="border-t border-white/5 pt-4 space-y-2.5 text-xs text-gray-400 font-mono">
            <div className="flex justify-between font-medium"><span>{L(language, { fa: 'مجموع خرید تجهیزات:', en: 'Gear Subtotal:', ru: 'Подитог товаров:', tr: 'Ekipmanlar Toplamı:' })}</span><span className="text-gray-200">{subtotal.toLocaleString(localeOf(language))} {t('common.currency', 'لیر')}</span></div>
            {appliedCoupon && <div className="flex justify-between text-emerald-400 font-bold"><span>{L(language, { fa: 'کاهش قیمت:', en: 'Discount Amount:', ru: 'Сумма скидки:', tr: 'İndirim Tutarı:' })}</span><span>-{discount.toLocaleString(localeOf(language))} {t('common.currency', 'لیر')}</span></div>}
            <div className="flex justify-between border-t border-white/5 pt-2.5 text-sm font-black text-white font-sans"><span>{t('booking.totalPrice', 'مبلغ قابل پرداخت:')}</span><span className="text-primary text-base font-mono font-bold">{total.toLocaleString(localeOf(language))} {t('common.currency', 'لیر')}</span></div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3.5 text-primary mt-2 relative overflow-hidden font-sans">
              <div className="absolute -top-12 -right-12 w-16 h-16 bg-primary/5 blur-xl"></div>
              <div className="flex items-center gap-1.5 font-bold mb-1 relative z-10 font-display text-xs uppercase tracking-wider"><Sparkles className="w-3.5 h-3.5" /><span>{t('booking.pointsToEarn', 'کسب امتیاز باشگاه:')}</span></div>
              <span className="relative z-10 block text-[10px] leading-relaxed text-gray-400 font-medium font-sans">{L(language, { fa: `با نهایی کردن خرید، ${Math.floor(total / 10)} امتیاز دریافت خواهید کرد.`, en: `By confirming this purchase, you will receive ${Math.floor(total / 10)} points.`, ru: `После покупки вы получите ${Math.floor(total / 10)} баллов.`, tr: `Satın alma işlemini tamamladığınızda, ${Math.floor(total / 10)} puan kazanırsınız.` })}</span>
            </div>
          </div>
          <button onClick={handleCheckout} data-shop-checkout disabled={isSubmitting} className="w-full mt-2 py-4 bg-primary text-black font-black uppercase tracking-wider rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:bg-primary-hover border-2 border-primary transition-all flex items-center justify-center gap-2 cursor-pointer font-display text-xs disabled:opacity-60 disabled:cursor-not-allowed">
            <CreditCard className="w-4 h-4" /><span>{L(language, { fa: 'پرداخت نهایی و تسویه', en: 'Finalize & Checkout', ru: 'Оплатить и оформить', tr: 'Ödemeyi Tamamla' })}</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in font-sans" dir={dir}>
      <div className="p-4 border border-white/10 rounded-xl my-3"><label className="text-sm text-gray-300">{L(language,{fa:'ایستگاه مرتبط (اختیاری)',en:'Related station (optional)',tr:'İlgili istasyon (isteğe bağlı)',ru:'Станция (необязательно)'})}<select value={deliverySystemId} onChange={e=>setDeliverySystemId(e.target.value)} className="block w-full bg-darkBg border border-white/20 rounded-lg p-2 mt-2"><option value="">—</option>{deliverySystems.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>
      {checkout && <CheckoutModal kind="shop" params={checkout.params} estimatedAmount={checkout.amount} onClose={() => setCheckout(null)} onDone={(r: CheckoutResult) => { setCheckout(null); addNotification(L(language, { fa: `سفارش شما ثبت شد (${r.orderId}). کالا در کلاب تحویل و هزینه حضوری تسویه می‌شود؛ امتیاز پس از پرداخت داده می‌شود.`, en: `Order registered (${r.orderId}). Pick up and pay at the club; points are credited after payment.`, ru: `Заказ оформлен (${r.orderId}). Получение и оплата в клубе; баллы начисляются после оплаты.`, tr: `Sipariş kaydedildi (${r.orderId}). Ürün kulüpte teslim edilir ve ödeme yerinde yapılır; puanlar ödemeden sonra eklenir.` }), 'success'); setCart([]); setAppliedCoupon(null); setCouponCode(''); }} />}
      <div className="lg:col-span-3 flex flex-col gap-6">
        <ThemeRegion
          name="shop.detail"
          fallback={gridFallback}
          props={{
            shopItems: accessories,
            shopCategories: categories,
            activeCoupons,
            cart,
            onAddToCart: addToCart,
            onRemoveFromCart: removeFromCart,
            onUpdateQty: updateQty,
            onCheckout: handleCheckout,
            onServerState,
            addNotification,
            onNavigate: themeBase?.onNavigate,
            loading: false,
            error: null,
            isEmpty: accessories.length === 0,
            comingSoon,
          }}
        />
      </div>
      <div className="lg:col-span-1">
        <ThemeRegion
          name="shop.cart"
          fallback={cartFallback}
          props={{
            shopItems: accessories,
            cart,
            subtotal,
            discount,
            total,
            appliedCoupon,
            couponCode,
            systemNumber: '',
            onUpdateQty: updateQty,
            onRemoveFromCart: removeFromCart,
            onApplyCoupon: handleApplyCoupon,
            onCheckout: handleCheckout,
            onNavigate: themeBase?.onNavigate,
            addNotification,
          }}
        />
      </div>
    </div>
  );
}
