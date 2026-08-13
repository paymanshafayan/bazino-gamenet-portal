import React, { useState, useEffect } from 'react';
import { 
  GameSystem, 
  CafeItem, 
  Accessory, 
  Tournament, 
  LoyaltyTx, 
  DiscountCode, 
  UserState 
} from '../types/gamenet';
import { useLanguage } from '../context/LanguageContext';
import { DeferredSection, getResponsiveSrcSet } from './PerformanceGuards';
import { 
  Gamepad2, 
  Tv, 
  Utensils, 
  ShoppingBag, 
  Trophy, 
  Award, 
  MessageSquare, 
  Plus, 
  Minus, 
  Check, 
  X, 
  LogIn, 
  Clock, 
  Sparkles, 
  ShieldAlert, 
  Send, 
  Coins, 
  Flame, 
  ChevronRight,
  User,
  Heart,
  Grid
} from 'lucide-react';

interface Props {
  themeId?: string;
  systems: GameSystem[];
  cafeItems: CafeItem[];
  accessories: Accessory[];
  tournaments: Tournament[];
  user: UserState | null;
  transactions: LoyaltyTx[];
  activeCoupons: DiscountCode[];
  onRedeemPoints: (points: number, couponValue: number, code: string) => void;
  onAddLoyaltyPoints: (points: number) => void;
  onOpenAuth: () => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  refreshData: () => Promise<void>;
}

export default function ConsoleGridClassic({
  systems,
  cafeItems,
  accessories,
  tournaments,
  user,
  transactions,
  activeCoupons,
  onRedeemPoints,
  onAddLoyaltyPoints,
  onOpenAuth,
  addNotification,
  refreshData
}: Props) {
  const { language, dir } = useLanguage();
  
  // Tab/Active Category filters inside panels
  const [selectedSystem, setSelectedSystem] = useState<GameSystem | null>(null);
  const [reservationHours, setReservationHours] = useState(2);
  const [reservationCoupon, setReservationCoupon] = useState('');
  
  // Cafe cart
  const [cafeCart, setCafeCart] = useState<{[id: string]: number}>({});
  const [cafeTable, setCafeTable] = useState('VIP-1');
  const [cafeCoupon, setCafeCoupon] = useState('');

  // Shop cart
  const [shopCart, setShopCart] = useState<{[id: string]: number}>({});
  const [shopCoupon, setShopCoupon] = useState('');

  // Tournament selection for team register
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamLeader, setTeamLeader] = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>(['', '', '']);

  // Chat/Messages states
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatRoom, setChatRoom] = useState('عمومی (General)');
  const [isChatPanelVisible, setIsChatPanelVisible] = useState(false);

  // Fetch chat history
  const fetchChatMessages = async () => {
    try {
      const res = await fetch(`/api/messages?room=${encodeURIComponent(chatRoom)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setChatMessages(data.slice(-25));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!isChatPanelVisible) return;
    const pollChatMessages = () => {
      if (document.visibilityState === 'visible') fetchChatMessages();
    };
    pollChatMessages();
    const interval = setInterval(pollChatMessages, 5000);
    return () => clearInterval(interval);
  }, [chatRoom, isChatPanelVisible]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!user) {
      addNotification(language === 'fa' ? 'لطفاً ابتدا وارد حساب کاربری خود شوید' : 'Please login to chat', 'error');
      onOpenAuth();
      return;
    }

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: chatRoom,
          username: user.username,
          message: newMessage
        })
      });

      if (res.ok) {
        setNewMessage('');
        fetchChatMessages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick reserve
  const handleQuickReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addNotification(language === 'fa' ? 'لطفاً ابتدا وارد حساب کاربری خود شوید' : 'Please login to reserve', 'error');
      onOpenAuth();
      return;
    }
    if (!selectedSystem) return;

    let discount = 0;
    if (reservationCoupon) {
      const coupon = activeCoupons.find(c => c.code === reservationCoupon && c.isActive);
      if (coupon) {
        discount = coupon.value;
      }
    }

    const price = Math.max(0, (selectedSystem.hourlyRate * reservationHours) - discount);
    const points = Math.floor(price / 1000);

    try {
      const res = await fetch('/api/systems/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemId: selectedSystem.id,
          startTime: "الان",
          endTime: `بعد از ${reservationHours} ساعت`,
          totalPrice: price,
          pointsEarned: points,
          date: "امروز"
        })
      });

      if (res.ok) {
        addNotification(
          language === 'fa' 
            ? `سیستم ${selectedSystem.name} با موفقیت رزرو شد. +${points} امتیاز وفاداری!` 
            : `System ${selectedSystem.name} reserved. +${points} loyalty points!`,
          'success'
        );
        setSelectedSystem(null);
        setReservationCoupon('');
        await refreshData();
      }
    } catch (e) {
      addNotification('Error reserving system', 'error');
    }
  };

  // Cafe Order
  const handleCafeOrderSubmit = async () => {
    if (!user) {
      addNotification(language === 'fa' ? 'لطفاً ابتدا وارد حساب کاربری خود شوید' : 'Please login to order', 'error');
      onOpenAuth();
      return;
    }

    const orderItems = Object.entries(cafeCart)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([id, qty]) => {
        const item = cafeItems.find(c => c.id === id);
        return { item, quantity: qty as number };
      });

    if (orderItems.length === 0) {
      addNotification(language === 'fa' ? 'سبد خرید شما خالی است!' : 'Your cart is empty!', 'error');
      return;
    }

    const totalRawPrice = orderItems.reduce((acc, current) => {
      return acc + (current.item?.price || 0) * (current.quantity as number);
    }, 0);

    let discount = 0;
    if (cafeCoupon) {
      const coupon = activeCoupons.find(c => c.code === cafeCoupon && c.isActive);
      if (coupon) {
        discount = coupon.value;
      }
    }

    const finalAmount = Math.max(0, totalRawPrice - discount);
    const pointsEarned = Math.floor(finalAmount / 3000); // 1 point per 3000 Tomans spent on food

    try {
      const res = await fetch('/api/cafe/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: cafeTable,
          cart: cafeCart,
          totalPrice: totalRawPrice,
          pointsEarned,
          discountApplied: discount,
          couponCode: cafeCoupon
        })
      });

      if (res.ok) {
        addNotification(
          language === 'fa' 
            ? `سفارش کافه شما با موفقیت ثبت شد و به میز ${cafeTable} ارسال خواهد شد. +${pointsEarned} امتیاز وفاداری!` 
            : `Cafe order placed for seat ${cafeTable}! +${pointsEarned} loyalty points!`,
          'success'
        );
        setCafeCart({});
        setCafeCoupon('');
        await refreshData();
      }
    } catch (e) {
      addNotification('Error ordering cafe items', 'error');
    }
  };

  // Shop Order
  const handleShopOrderSubmit = async () => {
    if (!user) {
      addNotification(language === 'fa' ? 'لطفاً ابتدا وارد حساب کاربری خود شوید' : 'Please login to order', 'error');
      onOpenAuth();
      return;
    }

    const cartItems = Object.entries(shopCart)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([id, qty]) => {
        const item = accessories.find(a => a.id === id);
        return { item, quantity: qty as number };
      });

    if (cartItems.length === 0) {
      addNotification(language === 'fa' ? 'سبد خرید قطعات شما خالی است!' : 'Gamer shop cart is empty!', 'error');
      return;
    }

    const totalRawPrice = cartItems.reduce((acc, current) => {
      return acc + (current.item?.price || 0) * (current.quantity as number);
    }, 0);

    let discount = 0;
    if (shopCoupon) {
      const coupon = activeCoupons.find(c => c.code === shopCoupon && c.isActive);
      if (coupon) {
        discount = coupon.value;
      }
    }

    const finalAmount = Math.max(0, totalRawPrice - discount);
    const pointsEarned = Math.floor(finalAmount / 5000); // 1 point per 5000 Toman spend on accessories

    try {
      const res = await fetch('/api/accessories/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: cartItems,
          totalPrice: totalRawPrice,
          pointsEarned,
          discountApplied: discount,
          couponCode: shopCoupon
        })
      });

      if (res.ok) {
        addNotification(
          language === 'fa'
            ? `خرید قطعات گیمینگ شما با موفقیت ثبت شد. مامور سالن به زودی سفارش را تحویل می‌دهد. +${pointsEarned} امتیاز!`
            : `Hardware purchase completed successfully! Delivered soon. +${pointsEarned} points!`,
          'success'
        );
        setShopCart({});
        setShopCoupon('');
        await refreshData();
      }
    } catch (e) {
      addNotification('Error placing hardware order', 'error');
    }
  };

  // Team register for tournament
  const handleRegisterTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addNotification(language === 'fa' ? 'لطفاً ابتدا وارد حساب کاربری خود شوید' : 'Please login to register', 'error');
      onOpenAuth();
      return;
    }
    if (!selectedTournament) return;
    if (!teamName.trim() || !teamLeader.trim()) {
      addNotification(language === 'fa' ? 'لطفاً نام تیم و سرگروه را وارد کنید' : 'Please enter team name & leader', 'error');
      return;
    }

    try {
      const res = await fetch('/api/tournaments/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: selectedTournament.id,
          team: {
            name: teamName,
            leader: teamLeader,
            members: teamMembers.filter(m => m.trim() !== '')
          }
        })
      });

      if (res.ok) {
        addNotification(
          language === 'fa'
            ? `تیم "${teamName}" با موفقیت در تورنمنت ${selectedTournament.title} ثبت نام شد!`
            : `Team "${teamName}" successfully registered in ${selectedTournament.title}!`,
          'success'
        );
        setTeamName('');
        setTeamLeader('');
        setTeamMembers(['', '', '']);
        setSelectedTournament(null);
        await refreshData();
      }
    } catch (e) {
      addNotification('Error registering team', 'error');
    }
  };

  // Point Redeeming helper
  const handleRedeemPointsAction = (points: number, val: number) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    if (user.loyaltyPoints < points) {
      addNotification(language === 'fa' ? 'امتیاز وفاداری شما کافی نیست!' : 'Insufficient points!', 'error');
      return;
    }

    const code = 'BZ-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    onRedeemPoints(points, val, code);
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in font-sans pb-24" dir={dir}>
      
      {/* 1. Header & Quick stats overview banner */}
      <div className="bg-dark-card border border-[#00ff66]/20 p-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-6 mb-8 relative overflow-hidden backdrop-blur-md">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-[#00ff66]/10 to-transparent pointer-events-none" />
        <div className="space-y-2 z-10 text-center md:text-right">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00ff66] "></span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#00ff66] font-bold">Consolidated Dashboard Command</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
            {language === 'fa' ? 'قالب کلاسیک گرید کنسولی (بازی‌نو)' : 'Console Grid Classic Theme'}
          </h1>
          <p className="text-xs text-gray-400 max-w-xl font-medium">
            {language === 'fa' 
              ? 'این قالب زیبا نمای گرید خدمات سالن را به شکل پنل‌های مستقل و پیشرفته کلاسیک نمایش می‌دهد.' 
              : 'Access all services simultaneously in a beautifully responsive split console grid classic layout.'}
          </p>
        </div>

        {/* User context action */}
        <div className="z-10 shrink-0">
          {!user ? (
            <button 
              onClick={onOpenAuth}
              className="px-6 py-3 bg-[#00ff66] hover:bg-[#00d957] text-black rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,102,0.35)] transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>{language === 'fa' ? 'ورود به حساب کاربری گیمر' : 'Authenticate Gamer'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-4 bg-black/40 border border-white/5 p-3 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-[#00ff66]/10 border border-[#00ff66]/30 flex items-center justify-center text-[#00ff66]">
                <User className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-gray-500 font-bold uppercase font-mono">Verified Gamer Account</span>
                <span className="block text-sm font-black text-white">@{user.username}</span>
                <span className="text-xs font-black text-[#00ff66] flex items-center gap-1 mt-0.5 font-mono">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{user.loyaltyPoints} PTS</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Bento Grid of Interactive Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* PANEL 1: Systems Status Matrix (Col: 7) */}
        <div className="lg:col-span-7 bg-dark-card border border-white/10 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-black uppercase text-white flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-[#00ff66]" />
              <span>{language === 'fa' ? 'رزرو و وضعیت زنده کلاینت‌ها' : 'Systems & Quick Bookings'}</span>
            </h2>
            <span className="text-[10px] font-mono font-bold text-gray-500">Live Client Pool: {systems.length}</span>
          </div>

          {/* Quick list grid of systems */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {systems.map((sys) => (
              <div 
                key={sys.id} 
                onClick={() => sys.isActive && setSelectedSystem(sys)}
                className={`p-3 border rounded-xl flex flex-col gap-2.5 transition-all cursor-pointer relative group ${
                  !sys.isActive 
                    ? 'border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed'
                    : sys.isReserved
                    ? 'border-rose-500/30 bg-rose-950/10 hover:border-rose-500/50'
                    : 'border-[#00ff66]/20 bg-[#00ff66]/[0.02] hover:border-[#00ff66] hover:shadow-[0_0_12px_rgba(0,255,102,0.15)]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-black font-mono uppercase ${
                    sys.type === 'PC' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'
                  }`}>
                    {sys.type}
                  </span>
                  
                  <span className={`w-2 h-2 rounded-full ${
                    !sys.isActive ? 'bg-gray-600' : sys.isReserved ? 'bg-rose-500' : 'bg-[#00ff66] '
                  }`} />
                </div>

                <div>
                  <h3 className="text-xs font-black text-white">{sys.name}</h3>
                  <span className="text-[10px] text-gray-500 font-bold font-mono mt-0.5 block">{sys.hourlyRate.toLocaleString()} T/H</span>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-black">
                  <span className={sys.isReserved ? 'text-rose-400' : 'text-[#00ff66]'}>
                    {sys.isReserved ? (language === 'fa' ? 'مشغول' : 'Busy') : (language === 'fa' ? 'آزاد' : 'Open')}
                  </span>
                  <span className="text-gray-500 group-hover:text-white transition-colors">→</span>
                </div>
              </div>
            ))}
          </div>

          {/* Inline Reservation Form if system is selected */}
          {selectedSystem && (
            <form onSubmit={handleQuickReserve} className="mt-4 p-4 bg-black/40 border border-[#00ff66]/30 rounded-xl space-y-4 animate-slide-in">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#00ff66]" />
                  <span>{language === 'fa' ? `فرم رزرو آنی: ${selectedSystem.name}` : `Quick Reserve: ${selectedSystem.name}`}</span>
                </h4>
                <button type="button" onClick={() => setSelectedSystem(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4"/></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1 font-bold">{language === 'fa' ? 'تعداد ساعات' : 'Hours'}</label>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => setReservationHours(prev => Math.max(1, prev - 1))}
                      className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center text-white"
                    >
                      -
                    </button>
                    <span className="text-sm font-black text-white font-mono w-6 text-center">{reservationHours}</span>
                    <button 
                      type="button" 
                      onClick={() => setReservationHours(prev => Math.min(12, prev + 1))}
                      className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center text-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 block mb-1 font-bold">{language === 'fa' ? 'کد تخفیف' : 'Promo Code'}</label>
                  <select 
                    value={reservationCoupon}
                    onChange={(e) => setReservationCoupon(e.target.value)}
                    className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#00ff66] font-bold"
                  >
                    <option value="">{language === 'fa' ? 'بدون کد تخفیف' : 'No Promo Code'}</option>
                    {activeCoupons.filter(c => c.isActive).map(c => (
                      <option key={c.code} value={c.code}>🎫 {c.code} ({c.value.toLocaleString()} T)</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estimate calculation block */}
              <div className="bg-[#050a0e] p-3 rounded-lg border border-white/5 flex justify-between items-center text-xs font-bold">
                <span className="text-gray-400">{language === 'fa' ? 'مبلغ کل نهایی:' : 'Final Estimated Cost:'}</span>
                <span className="text-white font-mono text-sm font-black">
                  {Math.max(0, (selectedSystem.hourlyRate * reservationHours) - (activeCoupons.find(c => c.code === reservationCoupon)?.value || 0)).toLocaleString()} تومان
                </span>
              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-[#00ff66] hover:bg-[#00d957] text-black rounded-lg text-xs font-black uppercase tracking-wider transition-all"
              >
                {language === 'fa' ? 'تایید و شروع بازی (شارژ اکانت)' : 'Confirm & Ignite Station'}
              </button>
            </form>
          )}
        </div>

        {/* PANEL 2: Loyalty Status & Coupon Exchange (Col: 5) */}
        <div className="lg:col-span-5 bg-dark-card border border-white/10 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-black uppercase text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-[#00ff66]" />
              <span>{language === 'fa' ? 'باشگاه وفاداری و کدهای تخفیف' : 'Loyalty & Reward Station'}</span>
            </h2>
            <Coins className="w-4 h-4 text-[#00ff66]" />
          </div>

          {/* Loyalty Level & Stats Card */}
          <div className="bg-gradient-to-br from-[#00ff66]/10 to-transparent border border-[#00ff66]/20 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500 font-bold uppercase font-mono">Loyalty Tier Status</span>
              <span className="px-2.5 py-0.5 bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/30 text-[10px] font-black rounded font-mono">
                {user && user.loyaltyPoints > 1000 ? 'ELITE GURU' : 'PRO GAMER'}
              </span>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <span className="block text-2xl font-black text-white font-mono">{user ? user.loyaltyPoints : '0'}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{language === 'fa' ? 'امتیاز وفاداری جمع شده' : 'Accumulated Loyalty Points'}</span>
              </div>
              <Flame className="w-8 h-8 text-[#00ff66]  shrink-0" />
            </div>

            {/* Micro Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#00ff66] to-emerald-400" 
                  style={{ width: `${Math.min(100, (user ? user.loyaltyPoints / 5000 : 0) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 font-bold font-mono">
                <span>0 PTS</span>
                <span>LEVEL UP AT 5,000 PTS</span>
              </div>
            </div>
          </div>

          {/* Quick Redeeming / Coupon generation */}
          <div className="space-y-2">
            <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">{language === 'fa' ? 'تبدیل آنی امتیاز به کدهای تخفیف کیف پول' : 'Redeem Points for Discount Vouchers'}</span>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => handleRedeemPointsAction(100, 15000)}
                className="p-2.5 border border-white/5 hover:border-[#00ff66] hover:bg-[#00ff66]/5 rounded-xl text-right transition-all flex flex-col justify-between"
              >
                <span className="text-[10px] text-gray-500 font-bold">100 امتیاز</span>
                <span className="text-xs font-black text-white mt-1">۱۵,۰۰۰ تومان</span>
                <span className="text-[10px] font-mono font-bold text-[#00ff66] mt-2 block">کد تخفیف بازی نو</span>
              </button>

              <button 
                onClick={() => handleRedeemPointsAction(250, 40000)}
                className="p-2.5 border border-white/5 hover:border-[#00ff66] hover:bg-[#00ff66]/5 rounded-xl text-right transition-all flex flex-col justify-between"
              >
                <span className="text-[10px] text-gray-500 font-bold">250 امتیاز</span>
                <span className="text-xs font-black text-white mt-1">۴۰,۰۰۰ تومان</span>
                <span className="text-[10px] font-mono font-bold text-[#00ff66] mt-2 block">کد تخفیف بازی نو</span>
              </button>
            </div>
          </div>

          {/* Active vouchers review */}
          <div className="space-y-2">
            <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">{language === 'fa' ? 'کدهای تخفیف فعال شما' : 'Your Ready Vouchers'}</span>
            
            <div className="flex flex-col gap-1.5 max-h-[110px] overflow-y-auto scrollbar-thin">
              {activeCoupons.filter(c => c.isActive).length === 0 ? (
                <div className="text-center py-4 border border-white/5 rounded-xl text-[10px] text-gray-500 font-bold">
                  {language === 'fa' ? 'کد تخفیف فعالی ندارید. از امتیاز خود استفاده کنید!' : 'No active vouchers available yet.'}
                </div>
              ) : (
                activeCoupons.filter(c => c.isActive).map((c) => (
                  <div key={c.code} className="flex justify-between items-center p-2 bg-black/40 border border-white/5 rounded-lg text-xs font-bold font-mono">
                    <span className="text-[#00ff66]">🎫 {c.code}</span>
                    <span className="text-white">{c.value.toLocaleString()} T</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      <DeferredSection minHeight={620} render={() => (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-8">
        
        {/* PANEL 3: Cafe Cyber-Snack Buffet (Col: 6) */}
        <div className="lg:col-span-6 bg-dark-card border border-white/10 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-black uppercase text-white flex items-center gap-2">
              <Utensils className="w-4 h-4 text-[#00ff66]" />
              <span>{language === 'fa' ? 'بوفه کافه و سفارشات غذا' : 'Cafe Quick Buffet Orders'}</span>
            </h2>
            <span className="text-[10px] font-mono font-bold text-[#00ff66]">{language === 'fa' ? 'سفارش پای کلاینت' : 'Seat Service'}</span>
          </div>

          {/* Grid of cafe items */}
          <div className="grid grid-cols-2 gap-3 max-h-[320px] overflow-y-auto scrollbar-thin pr-1">
            {cafeItems.map((item) => {
              const qty = cafeCart[item.id] || 0;
              const imageUrl = item.imageUrl || '/images/home/cafe-480.webp';
              return (
                <div key={item.id} className="p-2.5 border border-white/5 bg-black/20 rounded-xl flex flex-col gap-2 relative">
                  <img loading="lazy" src={imageUrl} srcSet={getResponsiveSrcSet(imageUrl, [320, 480])} sizes="(min-width: 1024px) 25vw, 50vw" width="400" height="240" alt={item.name} className="h-20 w-full object-cover rounded-lg" />
                  
                  <div>
                    <h3 className="text-xs font-black text-white truncate">{item.name}</h3>
                    <span className="text-[10px] text-[#00ff66] font-bold font-mono mt-0.5 block">{item.price.toLocaleString()} T</span>
                  </div>

                  {/* Quantity selector */}
                  <div className="flex items-center justify-between gap-1 pt-2 border-t border-white/5">
                    <span className="text-[10px] text-gray-500 font-bold font-mono">{language === 'fa' ? 'تعداد:' : 'Qty:'}</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setCafeCart(prev => ({...prev, [item.id]: Math.max(0, (prev[item.id] || 0) as number - 1)}))}
                        className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center text-white text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="text-xs font-black text-white font-mono w-4 text-center">{qty as number}</span>
                      <button 
                        disabled={qty as number >= item.inventory}
                        onClick={() => setCafeCart(prev => ({...prev, [item.id]: Math.min(item.inventory, (prev[item.id] || 0) as number + 1)}))}
                        className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${qty as number >= item.inventory ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cafe Checkout Details */}
          {Object.values(cafeCart).some(qty => (qty as number) > 0) && (
            <div className="mt-2 p-3 bg-black/40 border border-[#00ff66]/20 rounded-xl space-y-3 animate-slide-in">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1 font-bold">{language === 'fa' ? 'شماره میز / سیستم' : 'Seat / Desk'}</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. VIP-4"
                    value={cafeTable}
                    onChange={(e) => setCafeTable(e.target.value)}
                    className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-gray-700 outline-none focus:border-[#00ff66] font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 block mb-1 font-bold">{language === 'fa' ? 'کد تخفیف بوفه' : 'Food Voucher'}</label>
                  <select 
                    value={cafeCoupon}
                    onChange={(e) => setCafeCoupon(e.target.value)}
                    className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-[#00ff66] font-bold"
                  >
                    <option value="">No Voucher</option>
                    {activeCoupons.filter(c => c.isActive).map(c => (
                      <option key={c.code} value={c.code}>🎫 {c.code} ({c.value.toLocaleString()} T)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs font-bold border-t border-white/5 pt-2">
                <span className="text-gray-400">{language === 'fa' ? 'مبلغ کل سفارش بوفه:' : 'Final Cost:'}</span>
                <span className="text-[#00ff66] font-mono text-xs font-black">
                  {Math.max(0, Object.entries(cafeCart).reduce((sum, [id, qty]) => {
                    const price = cafeItems.find(c => c.id === id)?.price || 0;
                    return sum + price * (qty as number);
                  }, 0) - (activeCoupons.find(c => c.code === cafeCoupon)?.value || 0)).toLocaleString()} تومان
                </span>
              </div>

              <button 
                onClick={handleCafeOrderSubmit}
                className="w-full py-2 bg-[#00ff66] hover:bg-[#00d957] text-black rounded-lg text-xs font-black uppercase tracking-wider transition-all"
              >
                {language === 'fa' ? 'ثبت سفارش و پرداخت از حساب' : 'Send Order to Seat'}
              </button>
            </div>
          )}
        </div>

        {/* PANEL 4: Gamer Hardware Store (Col: 6) */}
        <div className="lg:col-span-6 bg-dark-card border border-white/10 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-black uppercase text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#00ff66]" />
              <span>{language === 'fa' ? 'فروشگاه جانبی و قطعات آرنا' : 'Gaming Accessories Store'}</span>
            </h2>
            <span className="text-[10px] font-mono font-bold text-gray-500">Premium Gear</span>
          </div>

          {/* Grid of hardware accessories */}
          <div className="grid grid-cols-2 gap-3 max-h-[320px] overflow-y-auto scrollbar-thin pr-1">
            {accessories.map((acc) => {
              const qty = shopCart[acc.id] || 0;
              const imageUrl = acc.imageUrl || '/images/home/gear-shop-480.webp';
              return (
                <div key={acc.id} className="p-2.5 border border-white/5 bg-black/20 rounded-xl flex flex-col gap-2 relative">
                  <img loading="lazy" src={imageUrl} srcSet={getResponsiveSrcSet(imageUrl, [320, 480])} sizes="(min-width: 1024px) 25vw, 50vw" width="400" height="240" alt={acc.name} className="h-20 w-full object-cover rounded-lg" />
                  
                  <div>
                    <h3 className="text-xs font-black text-white truncate">{acc.name}</h3>
                    <span className="text-[10px] text-[#00ff66] font-bold font-mono mt-0.5 block">{acc.price.toLocaleString()} T</span>
                  </div>

                  {/* Quantity selector */}
                  <div className="flex items-center justify-between gap-1 pt-2 border-t border-white/5">
                    <span className="text-[10px] text-gray-500 font-bold font-mono">{language === 'fa' ? 'تعداد:' : 'Qty:'}</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShopCart(prev => ({...prev, [acc.id]: Math.max(0, (prev[acc.id] || 0) as number - 1)}))}
                        className="w-5 h-5 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center text-white text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="text-xs font-black text-white font-mono w-4 text-center">{qty as number}</span>
                      <button 
                        disabled={qty as number >= acc.stock}
                        onClick={() => setShopCart(prev => ({...prev, [acc.id]: Math.min(acc.stock, (prev[acc.id] || 0) as number + 1)}))}
                        className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${qty as number >= acc.stock ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Shop checkout footer */}
          {Object.values(shopCart).some(qty => (qty as number) > 0) && (
            <div className="mt-2 p-3 bg-black/40 border border-[#00ff66]/20 rounded-xl space-y-3 animate-slide-in">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-gray-400">{language === 'fa' ? 'مبلغ نهایی سخت افزار:' : 'Final Cost:'}</span>
                <span className="text-white font-mono text-xs font-black">
                  {Math.max(0, Object.entries(shopCart).reduce((sum, [id, qty]) => {
                    const price = accessories.find(a => a.id === id)?.price || 0;
                    return sum + price * (qty as number);
                  }, 0) - (activeCoupons.find(c => c.code === shopCoupon)?.value || 0)).toLocaleString()} تومان
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1">
                <label className="text-[10px] text-gray-500 block mb-1 font-bold">{language === 'fa' ? 'اعمال کد تخفیف سخت افزار' : 'Promo Code'}</label>
                <select 
                  value={shopCoupon}
                  onChange={(e) => setShopCoupon(e.target.value)}
                  className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-[#00ff66] font-bold"
                >
                  <option value="">No Code</option>
                  {activeCoupons.filter(c => c.isActive).map(c => (
                    <option key={c.code} value={c.code}>🎫 {c.code} ({c.value.toLocaleString()} T)</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handleShopOrderSubmit}
                className="w-full py-2 bg-[#00ff66] hover:bg-[#00d957] text-black rounded-lg text-xs font-black uppercase tracking-wider transition-all"
              >
                {language === 'fa' ? 'ثبت سفارش و تحویل درب سالن' : 'Order Accessories'}
              </button>
            </div>
          )}
        </div>

      </div>
      )} />

      <DeferredSection minHeight={620} onVisible={() => setIsChatPanelVisible(true)} render={() => (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-8">
        
        {/* PANEL 5: Live Chat Room & Support (Col: 6) */}
        <div className="lg:col-span-6 bg-dark-card border border-white/10 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-black uppercase text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#00ff66]" />
              <span>{language === 'fa' ? 'اتاق گفتگوی زنده کلوپ' : 'Live Gamer Chat Lounge'}</span>
            </h2>
            <select 
              value={chatRoom}
              onChange={(e) => setChatRoom(e.target.value)}
              className="bg-black/40 text-white border border-white/10 text-[10px] font-bold rounded-lg px-2 py-0.5 outline-none focus:border-[#00ff66]"
            >
              <option value="عمومی (General)">General Room</option>
              <option value="CS2">CS2 Channel</option>
              <option value="Dota 2">Dota 2 Lounge</option>
              <option value="Valorant">Valorant Arena</option>
            </select>
          </div>

          {/* Chat log wrapper */}
          <div className="h-[240px] bg-black/30 border border-white/5 rounded-xl p-3 overflow-y-auto scrollbar-thin flex flex-col gap-2">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-600 text-[10px] font-bold py-12">
                {language === 'fa' ? 'هیچ گفتگویی شروع نشده است. اولین پیام را ارسال کنید!' : 'No messages in this chat room yet.'}
              </div>
            ) : (
              chatMessages.map((msg, index) => {
                const isSelf = user && msg.username === user.username;
                return (
                  <div key={index} className={`flex flex-col max-w-[85%] ${isSelf ? 'self-end items-end' : 'self-start items-start'}`}>
                    <span className="text-[10px] text-gray-500 font-bold mb-0.5">@{msg.username}</span>
                    <div className={`p-2.5 rounded-xl text-xs font-medium leading-relaxed ${
                      isSelf ? 'bg-[#00ff66]/10 border border-[#00ff66]/30 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-gray-300 rounded-tl-none'
                    }`}>
                      {msg.message}
                    </div>
                    <span className="text-[10px] text-gray-600 font-mono mt-0.5">{msg.timestamp || 'همین الان'}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat input form */}
          <form onSubmit={handleSendChatMessage} className="flex gap-2">
            <input 
              type="text" 
              required
              placeholder={language === 'fa' ? 'پیام خود را به کلوپ بفرستید...' : 'Type message...'}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-grow bg-[#0d122b] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-[#00ff66]"
            />
            <button 
              type="submit"
              className="px-4 bg-[#00ff66] hover:bg-[#00d957] text-black rounded-xl text-xs font-black flex items-center justify-center border border-[#00ff66]/20 transition-all shadow-[0_0_15px_rgba(0,255,102,0.15)]"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* PANEL 6: Active Tournaments Brackets (Col: 6) */}
        <div className="lg:col-span-6 bg-dark-card border border-white/10 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-black uppercase text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#00ff66]" />
              <span>{language === 'fa' ? 'تورنمنت‌های فعال و ثبت‌نام تیم' : 'Active Tournaments & Brackets'}</span>
            </h2>
            <span className="text-[10px] font-mono font-bold text-gray-500">Esports Center</span>
          </div>

          {/* Quick lists of tournaments */}
          <div className="flex flex-col gap-2.5 max-h-[140px] overflow-y-auto scrollbar-thin">
            {tournaments.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-500 font-bold border border-white/5 rounded-xl">
                {language === 'fa' ? 'تورنمنتی یافت نشد.' : 'No tournaments active.'}
              </div>
            ) : (
              tournaments.map((tour) => (
                <div 
                  key={tour.id} 
                  onClick={() => setSelectedTournament(tour)}
                  className={`p-3 border rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                    selectedTournament?.id === tour.id
                      ? 'border-[#00ff66] bg-[#00ff66]/[0.03]'
                      : 'border-white/5 bg-black/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-black text-white font-display">{tour.title}</h4>
                    <span className="text-[10px] text-gray-400 font-bold block mt-0.5">{tour.game} - شروع: {tour.startDate}</span>
                  </div>

                  <div className="text-right">
                    <span className="block text-[10px] text-[#00ff66] font-mono font-black">{tour.registeredTeamsCount} / {tour.maxTeams} TEAMS</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider block mt-1">{tour.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Team register drawer / form */}
          {selectedTournament && (
            <form onSubmit={handleRegisterTournament} className="p-3 border border-[#00ff66]/30 bg-black/40 rounded-xl space-y-3 animate-slide-in">
              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                <h4 className="text-[10px] font-black text-[#00ff66] uppercase font-mono">
                  🎮 Register Team for: {selectedTournament.title}
                </h4>
                <button type="button" onClick={() => setSelectedTournament(null)} className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5"/></button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1 font-bold">{language === 'fa' ? 'نام تیم' : 'Team Name'}</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Apex Predators"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-700 outline-none focus:border-[#00ff66]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 block mb-1 font-bold">{language === 'fa' ? 'آیدی کاپیتان' : 'Leader Gamertag'}</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. @SinaPro"
                    value={teamLeader}
                    onChange={(e) => setTeamLeader(e.target.value)}
                    className="w-full bg-[#0d122b] border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-700 outline-none focus:border-[#00ff66]"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-2 bg-[#00ff66] hover:bg-[#00d957] text-black rounded-lg text-xs font-black uppercase tracking-wider transition-all"
              >
                {language === 'fa' ? 'ثبت نام رسمی تیم در مسابقات' : 'Confirm Registration & Enter bracket'}
              </button>
            </form>
          )}
        </div>

      </div>
      )} />

    </div>
  );
}
