import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Coffee, ShoppingBag, Trophy, Award, MessageSquare, Settings, User, LogIn, LogOut, Gamepad2, X, FileText } from 'lucide-react';
import { UserState } from '../types/gamenet';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';

interface HubLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
  user: UserState | null;
  onLogout: () => void;
  setIsAuthModalOpen: (b: boolean) => void;
  setLayoutMode: (mode: 'standard' | 'hub') => void;
}

export default function HubLayout({
  activeTab,
  setActiveTab,
  children,
  user,
  onLogout,
  setIsAuthModalOpen,
  setLayoutMode
}: HubLayoutProps) {
  const { language, t } = useLanguage();
  
  // Map our app tabs to the hub buttons
  const hubButtons = [
    { id: 'systems', icon: Monitor, label: L(language, { fa: 'رزرو', en: 'RESERVE', ru: 'БРОНЬ', tr: 'REZERV' }), color: '#00FFCC', x: -160, y: -160, delay: 0.1 },
    { id: 'cafe', icon: Coffee, label: L(language, { fa: 'کافه', en: 'CAFE', ru: 'КАФЕ', tr: 'KAFE' }), color: '#FFD700', x: 160, y: -120, delay: 0.2 },
    { id: 'shop', icon: ShoppingBag, label: L(language, { fa: 'فروشگاه', en: 'SHOP', ru: 'МАГАЗИН', tr: 'MAĞAZA' }), color: '#00FFCC', x: -180, y: 80, delay: 0.3 },
    { id: 'tournaments', icon: Trophy, label: L(language, { fa: 'مسابقات', en: 'ARENA', ru: 'АРЕНА', tr: 'ARENA' }), color: '#9D00FF', x: 160, y: 120, delay: 0.4 },
    { id: 'loyalty', icon: Award, label: L(language, { fa: 'جوایز', en: 'LOYALTY', ru: 'БОНУСЫ', tr: 'SADAKAT' }), color: '#FFD700', x: 0, y: 220, delay: 0.5 },
    { id: 'blog', icon: FileText, label: L(language, { fa: 'مجله', en: 'BLOG', ru: 'БЛОГ', tr: 'BLOG' }), color: '#FF2A2A', x: -260, y: -40, delay: 0.6 },
  ];

  const handleClosePanel = () => {
    setActiveTab('hub'); // Special state for just seeing the hub
  };

  const isModalOpen = activeTab !== 'hub' && activeTab !== 'home';

  return (
    <div className="fixed inset-0 bg-[#060913] overflow-hidden flex items-center justify-center font-sans">
      {/* Particle Background - basic CSS animation for now */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
         <div className="absolute top-[20%] left-[30%] w-2 h-2 bg-[#00FFCC] rounded-full shadow-[0_0_10px_#00FFCC] animate-pulse"></div>
         <div className="absolute top-[60%] left-[70%] w-1.5 h-1.5 bg-[#9D00FF] rounded-full shadow-[0_0_10px_#9D00FF] animate-bounce"></div>
         <div className="absolute top-[80%] left-[20%] w-2.5 h-2.5 bg-[#FFD700] rounded-full shadow-[0_0_10px_#FFD700] animate-pulse" style={{ animationDelay: '1s'}}></div>
         <div className="absolute top-[10%] left-[80%] w-2 h-2 bg-[#FF2A2A] rounded-full shadow-[0_0_10px_#FF2A2A] animate-ping" style={{ animationDuration: '3s'}}></div>
         {/* More particles could be added or use react-tsparticles */}
      </div>

      {/* Admin / Switch Mode Button */}
      <div className="absolute top-6 right-6 z-10 flex gap-4">
        {user?.username.toLowerCase() === 'admin' || user?.username.toLowerCase() === 'root' && (
          <button 
            onClick={() => setActiveTab('admin')}
            className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/10 hover:text-primary transition-all backdrop-blur-sm"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
        <button 
          onClick={() => setLayoutMode('standard')}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-white hover:bg-white/10 hover:text-primary transition-all backdrop-blur-sm flex items-center gap-2"
        >
          {L(language, { fa: 'نسخه استاندارد', en: 'Standard UI', ru: 'Стандартный интерфейс', tr: 'Standart Arayüz' })}
        </button>
      </div>

      {/* User Login/Profile */}
      <div className="absolute top-6 left-6 z-10">
        {!user ? (
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="px-6 py-2 bg-primary/20 border border-primary text-primary rounded-full text-xs font-bold hover:bg-primary hover:text-black transition-all shadow-[0_0_15px_rgba(0,255,204,0.3)] flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {L(language, { fa: 'ورود', en: 'LOGIN', ru: 'ВОЙТИ', tr: 'GİRİŞ' })}
          </button>
        ) : (
          <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2">
            <a href="/profile" className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden" data-header-profile-link>
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-8 h-8 object-cover" /> : (user.displayName || user.username).charAt(0).toUpperCase()}
            </a>
            <div className="flex flex-col">
              <a href="/profile" className="text-white text-xs font-bold hover:text-primary">{user.displayName || `@${user.username}`}</a>
              <span className="text-primary text-[10px]">{user.loyaltyPoints} EXP</span>
            </div>
            <button onClick={onLogout} className="ml-2 text-red-400 hover:text-red-300">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Central Orb */}
      <motion.div 
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="absolute w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-tr from-[#9D00FF]/40 to-transparent flex items-center justify-center border border-[#9D00FF]/50 shadow-[0_0_60px_rgba(157,0,255,0.4)] backdrop-blur-md z-0 cursor-pointer hover:scale-105 transition-transform duration-500"
        onClick={() => setActiveTab('hub')}
      >
        <Gamepad2 className="w-12 h-12 md:w-20 md:h-20 text-[#00FFCC]" />
      </motion.div>

      {/* Orbiting Buttons */}
      {hubButtons.map((btn) => (
        <motion.button
          key={btn.id}
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{ opacity: 1, x: btn.x, y: btn.y }}
          transition={{ duration: 0.8, delay: btn.delay, ease: 'easeOut' }}
          onClick={() => setActiveTab(btn.id)}
          className="absolute w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#111326]/60 backdrop-blur-md flex flex-col items-center justify-center gap-1 group hover:scale-110 transition-transform duration-300 z-10"
          style={{ 
            border: `1px solid ${btn.color}66`,
            boxShadow: `0 0 20px ${btn.color}33`
          }}
        >
          <btn.icon className="w-6 h-6 md:w-8 md:h-8" style={{ color: btn.color }} />
          <span className="text-[10px] md:text-xs font-black tracking-wider text-white group-hover:text-white/80">{btn.label}</span>
          
          {/* Glowing ring on hover */}
          <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" 
               style={{ boxShadow: `inset 0 0 15px ${btn.color}80` }}></div>
        </motion.button>
      ))}

      {/* Chat FAB */}
      <motion.button 
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1 }}
        onClick={() => setActiveTab('chat')}
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#9D00FF] rounded-full flex items-center justify-center shadow-[0_0_20px_#9D00FF] hover:scale-110 transition-transform z-10 text-white"
      >
        <MessageSquare className="w-6 h-6" />
      </motion.button>

      {/* Glassmorphism Panel Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-6xl max-h-[90vh] bg-[#111326]/80 backdrop-blur-xl border border-[#00FFCC]/30 rounded-3xl shadow-[0_0_50px_rgba(0,255,204,0.1)] flex flex-col overflow-hidden"
            >
              {/* Panel Header */}
              <div className="h-16 border-b border-[#00FFCC]/20 bg-gradient-to-r from-[#00FFCC]/10 to-transparent flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-[#00FFCC] rounded-full shadow-[0_0_10px_#00FFCC]"></div>
                  <h2 className="text-white font-black text-xl tracking-widest uppercase">
                    {hubButtons.find(b => b.id === activeTab)?.label || activeTab}
                  </h2>
                </div>
                <button 
                  onClick={handleClosePanel}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Panel Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                 {children}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 204, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 204, 0.6);
        }
      `}</style>
    </div>
  );
}
