import React, { useState, useEffect, lazy, Suspense } from 'react';
import { UserState, LoyaltyTx, GameSystem, CafeItem, Accessory, Tournament, Article, DiscountCode } from './types/gamenet';
import bazinoLogo from './assets/images/bazino_logo_user.webp';
// تب‌ها و مودال‌های سنگین به‌صورت lazy بارگذاری می‌شوند (کد اسپلیتینگ):
// فقط HomeTab (صفحه اصلی/LCP) به‌صورت eager می‌ماند — بقیه با کلیک کاربر
// دانلود می‌شوند تا باندل اولیه کوچک بماند (توصیه اصلی GTmetrix/PageSpeed).
import HomeTab from './components/HomeTab';
const LoyaltyProfileTab = lazy(() => import('./components/LoyaltyProfileTab'));
const ReservationsTab = lazy(() => import('./components/ReservationsTab'));
const CafeTab = lazy(() => import('./components/CafeTab'));
const ShopTab = lazy(() => import('./components/ShopTab'));
const TournamentsTab = lazy(() => import('./components/TournamentsTab'));
const BlogTab = lazy(() => import('./components/BlogTab'));
const CsharpCodeViewer = lazy(() => import('./components/CsharpCodeViewer'));
const AdminPanelTab = lazy(() => import('./components/AdminPanelTab'));
const FlutterCodeViewer = lazy(() => import('./components/FlutterCodeViewer'));
const PresentationTab = lazy(() => import('./components/PresentationTab'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const InstallPage = lazy(() => import('./components/InstallPage'));
const ChatTab = lazy(() => import('./components/ChatTab'));
const ThemeSelectorModal = lazy(() => import('./components/ThemeSelectorModal'));
const ConsoleHubView = lazy(() => import('./components/ConsoleHubView'));
const ConsoleGridClassic = lazy(() => import('./components/ConsoleGridClassic'));
const VisualHelpGuide = lazy(() => import('./components/VisualHelpGuide'));
import { useLanguage } from './context/LanguageContext';
import { 
  Trophy, Monitor, Coffee, ShoppingBag, Newspaper, Award, Code, Flame, Coins, X, HelpCircle,
  Sparkles, Home, Instagram, Send, Youtube, Twitter, Facebook, Settings, ChevronDown,
  Smartphone, QrCode, Download, Menu, MessageSquare, LogIn, Search, User, LogOut, ArrowLeft, ArrowRight, Palette
} from 'lucide-react';

export default function App() {
  const { language, setLanguage, t, dir } = useLanguage();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [themeId, setThemeId] = useState(() => {
    const saved = localStorage.getItem('themeId') || "dark-gold";
    return saved === "gaming-hub" ? "dark-gold" : saved;
  });
  const [layoutMode, setLayoutMode] = useState<'classic' | 'hub'>('classic');
  const [availableThemes, setAvailableThemes] = useState([
    { id: 'dark-gold', name: 'Dark Gold', type: 'built-in' },
    { id: 'cyberpunk-cyan', name: 'Cyberpunk Cyan', type: 'built-in' },
    { id: 'geco-purple', name: 'Geco Purple', type: 'built-in' },
    { id: 'gaming-amp', name: 'Gaming AMP', type: 'built-in' },
    { id: 'console-grid', name: 'قالب گرید کنسولی (کلاسیک)', type: 'built-in' }
  ]);

  useEffect(() => {
    localStorage.setItem('themeId', themeId);
    document.body.setAttribute('data-theme', themeId);
    setLayoutMode('classic');
  }, [themeId]);

  useEffect(() => {
    localStorage.setItem('layoutMode', layoutMode);
  }, [layoutMode]);

  const [activeTab, setActiveTab] = useState('home');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpMode, setHelpMode] = useState<'admin' | 'gamenet'>('gamenet');
  const [user, setUser] = useState<UserState | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  
  // Data States
  const [systems, setSystems] = useState<GameSystem[]>([]);
  const [cafeItems, setCafeItems] = useState<CafeItem[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTx[]>([]);
  const [activeCoupons, setActiveCoupons] = useState<DiscountCode[]>([]);

  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; type: 'success' | 'error' | 'info' }>>([]);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const addNotification = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Fetch initial data & allow live refreshes
  const fetchData = async () => {
    try {
      const [sysRes, cafeRes, accRes, tourRes, artRes, transRes, coupRes, userRes] = await Promise.all([
        fetch('/api/systems').then(res => res.json()).catch(() => []),
        fetch('/api/cafe').then(res => res.json()).catch(() => []),
        fetch('/api/accessories').then(res => res.json()).catch(() => []),
        fetch('/api/tournaments').then(res => res.json()).catch(() => []),
        fetch('/api/articles').then(res => res.json()).catch(() => []),
        fetch('/api/transactions').then(res => res.json()).catch(() => []),
        fetch('/api/coupons').then(res => res.json()).catch(() => []),
        fetch('/api/user').then(res => res.json()).catch(() => null)
      ]);

      if (Array.isArray(sysRes)) setSystems(sysRes);
      if (Array.isArray(cafeRes)) setCafeItems(cafeRes);
      if (Array.isArray(accRes)) setAccessories(accRes);
      if (Array.isArray(tourRes)) setTournaments(tourRes);
      if (Array.isArray(artRes)) setArticles(artRes);
      if (Array.isArray(transRes)) setTransactions(transRes);
      if (Array.isArray(coupRes)) setActiveCoupons(coupRes);
      if (userRes && userRes.username && userRes.username !== 'Guest') {
        setUser(userRes);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const checkInstallStatus = async () => {
    // BYPASSED: Temporarily bypass installation page and load main app directly
    setIsInstalled(true);
    fetchData();

    /* 
    --- HOW TO REVERT TO ORIGINAL INSTALLATION SCREEN ---
    If you want to re-enable the installation step, simply delete or comment out 
    the two lines above (setIsInstalled(true) and fetchData()) and uncomment 
    the original checking block below:

    try {
      const res = await fetch('/api/install/status');
      const data = await res.json();
      setIsInstalled(data.isInstalled);
      if (data.isInstalled) {
        fetchData();
      }
    } catch (e) {
      setIsInstalled(true); // default fallback so it doesn't get stuck
      fetchData();
    }
    */
  };

  useEffect(() => {
    checkInstallStatus();
  }, []);

  const handleRedeemPoints = async (points: number, couponValue: number, code: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/loyalty/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points, couponValue, code })
      });
      if (res.ok) {
        setUser({ ...user, points: user.loyaltyPoints - points });
        addNotification(language === 'fa' ? 'کد تخفیف با موفقیت ایجاد شد.' : 'Discount code created.', 'success');
        const updatedCoupons = await fetch('/api/coupons').then(r => r.json());
        if(Array.isArray(updatedCoupons)) setActiveCoupons(updatedCoupons);
      }
    } catch (e) {
      addNotification('Error redeeming points', 'error');
    }
  };

  const handleAddLoyaltyPoints = async (points: number) => {
    if (!user) return;
    try {
      const res = await fetch('/api/user/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points })
      });
      if (res.ok) {
        setUser({ ...user, points: user.loyaltyPoints + points });
        addNotification(language === 'fa' ? `${points} امتیاز به شما اضافه شد.` : `Added ${points} points.`, 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegisterTeam = async (tournamentId: string, team: { name: string; leader: string; members: string[]; }) => {
    addNotification('Registered successfully', 'success');
  };

  const handleAddComment = async (articleId: string, comment: { gamerTag: string; content: string; }) => {
    addNotification('Comment added', 'success');
  };
  
  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const confirmLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setIsLogoutConfirmOpen(false);
    setActiveTab('home');
    addNotification(language === 'fa' ? 'خروج موفقیت‌آمیز بود' : 'Logged out successfully', 'success');
  };

  const renderTabContent = () => (
    <Suspense fallback={
      <div className="w-full flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    }>
    <div className="max-w-7xl mx-auto w-full flex-grow relative pb-20">
      {activeTab === 'home' && (
        layoutMode === 'hub' ? (
          <ConsoleHubView 
            themeId={themeId} 
            systems={systems} 
            cafeItems={cafeItems} 
            accessories={accessories} 
            tournaments={tournaments} 
            user={user} 
            transactions={transactions} 
            activeCoupons={activeCoupons} 
            onRedeemPoints={handleRedeemPoints} 
            onAddLoyaltyPoints={handleAddLoyaltyPoints} 
            onOpenAuth={() => setIsAuthModalOpen(true)}
            addNotification={addNotification}
            refreshData={fetchData}
            onBackToClassic={() => {
              setLayoutMode('classic');
              addNotification(language === 'fa' ? 'نمای کلاسیک فعال شد' : 'Classic View Activated', 'info');
            }}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        ) : themeId === 'console-grid' ? (
          <ConsoleGridClassic
            themeId={themeId} 
            systems={systems} 
            cafeItems={cafeItems} 
            accessories={accessories} 
            tournaments={tournaments} 
            user={user} 
            transactions={transactions} 
            activeCoupons={activeCoupons} 
            onRedeemPoints={handleRedeemPoints} 
            onAddLoyaltyPoints={handleAddLoyaltyPoints} 
            onOpenAuth={() => setIsAuthModalOpen(true)}
            addNotification={addNotification}
            refreshData={fetchData}
          />
        ) : (
          <HomeTab themeId={themeId} tournaments={tournaments} onNavigate={setActiveTab} />
        )
      )}
      {activeTab === 'loyalty' && <LoyaltyProfileTab themeId={themeId} user={user} transactions={transactions} activeCoupons={activeCoupons} onRedeemPoints={handleRedeemPoints} addNotification={addNotification}/>}
      {activeTab === 'reservations' && <ReservationsTab themeId={themeId} systems={systems} activeCoupons={activeCoupons} onAddLoyaltyPoints={handleAddLoyaltyPoints} addNotification={addNotification}/>}
      {activeTab === 'cafe' && <CafeTab themeId={themeId} cafeItems={cafeItems} activeCoupons={activeCoupons} onAddLoyaltyPoints={handleAddLoyaltyPoints} addNotification={addNotification}/>}
      {activeTab === 'shop' && <ShopTab themeId={themeId} accessories={accessories} activeCoupons={activeCoupons} onAddLoyaltyPoints={handleAddLoyaltyPoints} addNotification={addNotification}/>}
      {activeTab === 'tournaments' && <TournamentsTab themeId={themeId} tournaments={tournaments} onAddLoyaltyPoints={handleAddLoyaltyPoints} onRegisterTeam={handleRegisterTeam} addNotification={addNotification}/>}
      {activeTab === 'blog' && <BlogTab themeId={themeId} articles={articles} onAddComment={handleAddComment} addNotification={addNotification}/>}
      {activeTab === 'admin' && (
        <AdminPanelTab 
          themeId={themeId} 
          setThemeId={setThemeId} 
          availableThemes={availableThemes} 
          setAvailableThemes={setAvailableThemes} 
          addNotification={addNotification} 
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
        />
      )}
      {activeTab === 'csharp' && <CsharpCodeViewer addNotification={addNotification} />}
      {activeTab === 'flutter' && <FlutterCodeViewer addNotification={addNotification} />}
      {activeTab === 'presentation' && <PresentationTab addNotification={addNotification} />}
      {activeTab === 'chat' && <ChatTab user={user} addNotification={addNotification} onOpenAuth={() => setIsAuthModalOpen(true)} />}
    </div>
    </Suspense>
  );

  if (isInstalled === null) {
    return (
      <div className="min-h-screen bg-[#050714] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isInstalled === false) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-[#050714] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      }>
        <InstallPage 
          onInstallationComplete={() => {
            setIsInstalled(true);
            fetchData();
          }} 
        />
      </Suspense>
    );
  }

  return (
    <div 
      className={`theme-${themeId || "dark-gold"} ${layoutMode === 'hub' && activeTab === 'home' ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'} pb-[env(safe-area-inset-bottom,0px)] w-full text-gray-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-primary/30 app-bg-main`} 
      dir={dir}
    >
      {/* Admin Ribbon Bar */}
      {user?.role === 'admin' && activeTab !== 'admin' && (
        <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 border-b border-purple-500/30 text-white px-4 py-2 flex items-center justify-between text-xs font-bold z-50 relative shadow-lg animate-pulse-subtle">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
            <span className="font-display uppercase tracking-wider text-purple-200">
              {language === 'fa' ? 'پنل مدیریت فعال است' : 'Admin Area Active'}
            </span>
            <span className="text-purple-400 font-normal hidden sm:inline">
              | {language === 'fa' ? `ورود با حساب مدیر: @${user.username}` : `Logged in as: @${user.username}`}
            </span>
          </div>
          <button 
            onClick={() => setActiveTab('admin')} 
            className="bg-primary hover:bg-primary/95 text-black px-3.5 py-1.5 rounded-lg transition-all font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,184,0,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Settings className="w-3 h-3" />
            <span>{language === 'fa' ? 'ورود به پنل مدیریت' : 'Enter Admin Panel'}</span>
          </button>
        </div>
      )}

      {/* Decorative neon background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#A855F7]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[#06B6D4]/5 rounded-full blur-[150px]" />
      </div>
      
      {/* Toast Notifications Layer */}
      <div className={`fixed top-6 z-[100] flex flex-col gap-3 max-w-sm w-full ${dir === 'rtl' ? 'right-6' : 'left-6'}`}>
        {notifications.map((n) => (
          <div 
            key={n.id}
            className={`p-4 rounded-2xl shadow-2xl border flex items-center justify-between text-xs font-bold animate-slide-in backdrop-blur-md ${
              n.type === 'success' 
                ? 'bg-slate-900/95 border-white/10 text-white shadow-black/40' 
                : n.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/30 text-rose-400 shadow-rose-500/10'
                : 'bg-cyan-950/80 border-cyan-500/30 text-cyan-400 shadow-cyan-500/10'
            }`}
          >
            <span>{n.text}</span>
            <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} className="text-white/50 hover:text-white"><X className="w-4 h-4"/></button>
          </div>
        ))}
      </div>

      {themeId === 'gaming-hub' && (
        <>
          {/* Cyber scanlines overlay for Hub Theme */}
          <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden opacity-[0.06] mix-blend-overlay">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%]" />
          </div>
          {/* Subtle Cyber vignette glow overlay in neon purple instead of green */}
          <div className="pointer-events-none fixed inset-0 z-40 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(168,85,247,0.05)_100%)]" />
        </>
      )}

      {!(layoutMode === 'hub' && activeTab === 'home') && activeTab !== 'admin' && (
        <header className="h-[70px] border-b border-white/10 bg-dark-card/90 backdrop-blur-xl px-4 md:px-8 flex justify-between items-center z-40 sticky top-0 shrink-0 shadow-lg">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('home')}>
               <img src={bazinoLogo} alt="Bazino Pro" width="40" height="40" className="brand-logo-guard h-10 w-auto" />
               <span className="font-display font-black text-xl tracking-wider text-white hidden md:block">BAZINO <span className="text-primary">PRO</span></span>
            </div>
            
            <nav className="hidden md:flex items-center gap-2 h-full">
              {[
                { id: 'home', label: language === 'fa' ? 'خانه' : (language === 'ru' ? 'ГЛАВНАЯ' : (language === 'tr' ? 'ANASAYFA' : 'Home')), icon: Home },
                { id: 'reservations', label: language === 'fa' ? 'رزرو' : (language === 'ru' ? 'БРОНЬ' : (language === 'tr' ? 'REZERV' : 'Reserve')), icon: Monitor },
                { id: 'cafe', label: language === 'fa' ? 'کافه' : (language === 'ru' ? 'КАФЕ' : (language === 'tr' ? 'KAFE' : 'Cafe')), icon: Coffee },
                { id: 'shop', label: language === 'fa' ? 'فروشگاه' : (language === 'ru' ? 'МАГАЗИН' : (language === 'tr' ? 'MAĞAZA' : 'Shop')), icon: ShoppingBag },
                { id: 'tournaments', label: language === 'fa' ? 'مسابقات' : (language === 'ru' ? 'АРЕНА' : (language === 'tr' ? 'ARENA' : 'Arena')), icon: Trophy },
                { id: 'loyalty', label: language === 'fa' ? 'باشگاه' : (language === 'ru' ? 'КЛУБ' : (language === 'tr' ? 'KULÜP' : 'Club')), icon: Award },
                { id: 'presentation', label: language === 'fa' ? 'پرزنتیشن' : 'Slides', icon: Sparkles }
              ].map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 h-full flex items-center justify-center font-bold text-xs uppercase transition-all ${activeTab === t.id ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-white'}`}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-4">
               {user?.role === 'admin' && (
                  <button onClick={() => setActiveTab('admin')} className="text-xs font-bold text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg hover:bg-purple-500/20">Admin</button>
               )}
               {!user ? (
                 <button onClick={() => setIsAuthModalOpen(true)} className="text-xs font-bold bg-primary text-black px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2">
                   <LogIn className="w-4 h-4"/> {language === 'fa' ? 'ورود' : 'Login'}
                 </button>
               ) : (
                 <div className="flex items-center gap-3">
                   <span className="text-xs font-bold text-primary">@{user.username}</span>
                   <button onClick={handleLogout} className="text-red-400 hover:text-red-300"><LogOut className="w-4 h-4"/></button>
                 </div>
               )}
               <button 
                 onClick={() => { setHelpMode('gamenet'); setIsHelpOpen(true); }}
                 className="p-2 text-white bg-white/5 rounded-full hover:bg-white/10 flex items-center justify-center cursor-pointer transition-all"
                 title={language === 'fa' ? 'راهنمای تصویری کلوپ' : 'Client Visual Guide'}
               >
                 <HelpCircle className="w-4 h-4 text-primary animate-pulse" />
               </button>
               <button onClick={() => setIsThemeModalOpen(true)} className="p-2 text-white bg-white/5 rounded-full hover:bg-white/10">
                 <Palette className="w-4 h-4"/>
               </button>
            </div>
          </header>
      )}

      {activeTab === 'admin' && (
        <header className="h-[70px] bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-b border-purple-500/30 px-4 md:px-8 flex justify-between items-center z-50 sticky top-0 shrink-0 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping"></span>
            <div className="flex flex-col">
              <span className="font-display font-black text-sm tracking-wider text-purple-200">
                {language === 'fa' ? 'پنل مدیریت بازینو پرو' : 'BAZINO PRO ADMIN'}
              </span>
              <span className="text-[10px] text-purple-400 font-medium font-sans">
                {language === 'fa' ? `مدیر: @${user?.username}` : `Admin: @${user?.username}`}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setHelpMode('admin'); setIsHelpOpen(true); }}
              className="bg-purple-500/20 hover:bg-purple-500/35 border border-purple-500/30 text-purple-200 px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <HelpCircle className="w-4 h-4 text-purple-300 animate-pulse" />
              <span>{language === 'fa' ? 'راهنمای ادمین' : 'Admin Guide'}</span>
            </button>
            <button 
              onClick={() => setActiveTab('home')} 
              className="bg-white/10 hover:bg-white/15 border border-white/20 hover:border-purple-500/40 text-white px-4 py-2 rounded-xl transition-all font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
            >
              {dir === 'rtl' ? <ArrowRight className="w-4 h-4 text-purple-300" /> : <ArrowLeft className="w-4 h-4 text-purple-300" />}
              <span>{language === 'fa' ? 'بازگشت به سایت' : 'Back to Site'}</span>
            </button>
          </div>
        </header>
      )}

          <main className="flex-grow z-10 w-full relative">
            {renderTabContent()}
          </main>

      {/* Modals — lazy: هنگام اولین باز شدن دانلود می‌شوند */}
      <Suspense fallback={null}>
        <VisualHelpGuide 
          isOpen={isHelpOpen} 
          onClose={() => setIsHelpOpen(false)} 
          mode={helpMode} 
          language={language} 
          dir={dir} 
        />
        <AuthModal 
          addNotification={addNotification}
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={setUser}
        />
        <ThemeSelectorModal 
          isOpen={isThemeModalOpen}
          onClose={() => setIsThemeModalOpen(false)}
          availableThemes={availableThemes}
          themeId={themeId}
          setThemeId={setThemeId}
          language={language}
        />
      </Suspense>

      {/* Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setIsLogoutConfirmOpen(false)}
          />

          {/* Modal Card */}
          <div 
            className="bg-dark-card border border-white/10 rounded-3xl p-6 md:p-8 max-w-sm w-full relative overflow-hidden shadow-[0_0_50px_rgba(255,0,0,0.1)] z-10"
            dir={dir}
          >
            {/* Design accents */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-500/10 blur-3xl pointer-events-none"></div>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center mx-auto text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white font-display">
                {language === 'fa' ? 'خروج از حساب کاربری' : 'Sign Out Profile'}
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                {language === 'fa' 
                  ? 'آیا برای خروج از حساب کاربری خود مطمئن هستید؟ برای استفاده دوباره از خدمات باید وارد شوید.' 
                  : 'Are you sure you want to sign out from your gaming profile? You will need to login again to reserve rigs.'}
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {language === 'fa' ? 'انصراف' : 'Cancel'}
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] cursor-pointer animate-pulse-subtle"
              >
                {language === 'fa' ? 'خروج' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
