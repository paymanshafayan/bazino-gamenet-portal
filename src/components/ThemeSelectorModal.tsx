import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Palette, Sparkles } from 'lucide-react';
import ThemeScreenshot from './ThemeScreenshot';

interface ThemeColorConfig {
  primary: string;
  bg: string;
  card: string;
}

interface ThemeInfo {
  id: string;
  name: string;
  type: string;
  colors?: ThemeColorConfig;
}

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableThemes: ThemeInfo[];
  themeId: string;
  setThemeId: (id: string) => void;
  language: 'fa' | 'en';
}

export default function ThemeSelectorModal({
  isOpen,
  onClose,
  availableThemes,
  themeId,
  setThemeId,
  language
}: ThemeSelectorModalProps) {
  
  // Custom initial positions for the throwing/flying effect for each theme card
  const getThrowAnimation = (index: number) => {
    const directions = [
      { x: -500, y: 300, rotate: -45, scale: 0.3 },   // bottom-left
      { x: 100, y: -600, rotate: 35, scale: 0.2 },    // top-center
      { x: 500, y: 400, rotate: 50, scale: 0.4 },    // bottom-right
      { x: -100, y: 600, rotate: -25, scale: 0.3 },   // bottom-center
      { x: -600, y: -200, rotate: -60, scale: 0.4 },  // top-left
      { x: 600, y: -300, rotate: 45, scale: 0.2 },   // top-right
    ];
    
    const dir = directions[index % directions.length];
    
    return {
      hidden: {
        x: dir.x,
        y: dir.y,
        rotate: dir.rotate,
        scale: dir.scale,
        opacity: 0
      },
      visible: {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        opacity: 1,
        transition: {
          type: 'spring',
          damping: 14,
          stiffness: 85,
          mass: 1.1,
          delay: index * 0.18 // Staggered entrance
        }
      },
      exit: {
        x: dir.x * 0.6,
        y: dir.y * 0.6,
        rotate: dir.rotate * 0.5,
        scale: 0.7,
        opacity: 0,
        transition: {
          duration: 0.3,
          ease: 'easeIn'
        }
      }
    };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Dark Glass Backdrop with Fade-In */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
          />

          {/* Modal Content Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 120 }}
            className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-[#0b0c13]/90 border border-white/10 p-5 md:p-8 rounded-3xl shadow-[0_0_50px_rgba(0,240,255,0.15)] z-10 overflow-hidden"
            dir={language === 'fa' ? 'rtl' : 'ltr'}
          >
            {/* Ambient background accent glows */}
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-[#A855F7]/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Header row */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5 relative z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-wider font-display flex items-center gap-2">
                    {language === 'fa' ? 'انتخاب قالب بصری کلوپ' : 'CLUB THEME ENGINE'}
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {language === 'fa' ? 'قالب مورد علاقه خود را انتخاب کنید و تغییرات آن را به صورت آنی مشاهده نمایید.' : 'Switch themes instantly with real-time viewport generators.'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid container of throwing cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 overflow-y-auto p-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800 relative z-10 flex-grow">
              {availableThemes.map((theme, index) => {
                const isActive = themeId === theme.id;
                const cardAnim = getThrowAnimation(index);
                
                return (
                  <motion.div
                    key={theme.id}
                    variants={cardAnim}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={() => {
                      setThemeId(theme.id);
                      // Let's delay slightly to let the user see the selected badge checkmark before closing!
                      setTimeout(() => {
                        onClose();
                      }, 400);
                    }}
                    className={`relative rounded-2xl p-4 cursor-pointer bg-[#11131e]/80 border transition-all flex flex-col justify-between group ${
                      isActive 
                        ? 'border-primary shadow-[0_0_20px_rgba(255,184,0,0.15)] bg-primary/5' 
                        : 'border-white/5 hover:border-primary/50 hover:bg-white/5'
                    }`}
                  >
                    {/* Header bar of card */}
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                          {theme.name}
                        </h4>
                        <span className="text-[9px] uppercase font-mono tracking-widest text-gray-500">
                          {theme.type === 'built-in' 
                            ? (language === 'fa' ? 'سیستمی' : 'BUILT-IN') 
                            : (language === 'fa' ? 'پوسته سفارشی' : 'CUSTOM')}
                        </span>
                      </div>
                      
                      {/* Selection Status Badge */}
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                        isActive 
                          ? 'bg-primary text-black' 
                          : 'bg-white/5 text-gray-500 group-hover:text-white'
                      }`}>
                        <Check className={`w-3.5 h-3.5 transition-transform ${isActive ? 'scale-100' : 'scale-0'}`} strokeWidth={3} />
                      </div>
                    </div>

                    {/* Screenshot view */}
                    <div className="w-full mb-2 overflow-hidden rounded-lg">
                      <ThemeScreenshot theme={theme as any} language={language} />
                    </div>

                    {/* Active/Select prompt */}
                    <div className="mt-2 text-center">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                        isActive ? 'text-primary' : 'text-gray-400 group-hover:text-white'
                      }`}>
                        {isActive 
                          ? (language === 'fa' ? 'قالب فعال' : 'ACTIVE THEME') 
                          : (language === 'fa' ? 'کلیک برای انتخاب' : 'CLICK TO SELECT')}
                      </span>
                    </div>

                    {/* Animated shine line on hover */}
                    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                      <div className="absolute top-0 -inset-full h-full w-1/2 z-50 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/5 opacity-40 group-hover:animate-shine" />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Bottom Info bar */}
            <div className="mt-8 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center text-gray-500 text-[10px] uppercase font-bold tracking-widest relative z-10">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {language === 'fa' ? 'موتور پویا و تمام‌انیمیشنی کلوپ بازینو' : 'POWERED BY BAZINO ANIMATION ENGINE'}
              </span>
              <span className="mt-2 sm:mt-0">
                {language === 'fa' ? '۴ قالب آماده گیمینگ و سایبرپانک بارگذاری شده' : '4 READY GAMING THEMES INSTALLED'}
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
