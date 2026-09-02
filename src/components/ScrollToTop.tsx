import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface Props {
  hidden: boolean;
  isRTL: boolean;
}

export function ScrollToTop({ hidden, isRTL }: Props) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (hidden) return;

    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [hidden]);

  if (hidden || !isVisible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-[calc(64px+max(env(safe-area-inset-bottom,0px),16px))] md:bottom-[max(env(safe-area-inset-bottom,20px),20px)] ${isRTL ? 'left-6' : 'right-6'} z-50 p-3 rounded-full bg-primary/20 hover:bg-primary/40 border border-primary/40 text-primary shadow-[0_0_15px_rgba(0,240,255,0.2)] backdrop-blur-sm transition-all animate-fade-in focus:outline-none`}
      aria-label={isRTL ? 'بازگشت به بالای صفحه' : 'Scroll to top'}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
