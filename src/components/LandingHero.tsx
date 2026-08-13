import { vimg, vsrcset } from '../utils/assetVersion';

interface LandingHeroProps {
  onNavigate: () => void;
}

/**
 * The LCP-only first view. Keeping this separate from HomeTab means the browser can paint
 * the featured reservation image without waiting for the below-the-fold homepage data,
 * icons and interactive sections to be parsed and evaluated.
 *
 * HomeTab replaces this with the identical default slide once its lazy chunk is ready.
 *
 * The hero image is a first-party /images/home asset (same esports art the preload tag in
 * index.html points at), so the LCP request is local and discoverable from the initial
 * document instead of a cross-origin Unsplash fetch discovered only after JS runs.
 */
export default function LandingHero({ onNavigate }: LandingHeroProps) {
  const image = vimg('/images/home/esports-960.webp');

  return (
    <section className="relative w-[calc(100%+2rem)] md:w-[calc(100%+4rem)] -mx-4 md:-mx-8 overflow-hidden bg-[#050608] shadow-[0_0_50px_rgba(0,0,0,0.8)] aspect-[21/9] min-h-[340px] group border-b-4 border-primary">
      <img
        loading="eager"
        fetchPriority="high"
        src={image}
        srcSet={vsrcset("/images/home/esports-480.webp 480w, /images/home/esports-800.webp 800w, /images/home/esports-960.webp 960w")}
        sizes="(min-width: 1024px) 960px, 100vw"
        width="1200"
        height="514"
        alt="رزرو سیستم‌های گیمینگ فوق پیشرفته"
        className="absolute inset-0 w-full h-full object-cover opacity-100"
      />
      <div className="absolute inset-0 bg-transparent" />
      <div className="absolute inset-y-0 right-6 md:right-16 lg:right-24 xl:right-32 z-10 flex flex-col justify-center max-w-xl md:max-w-2xl gap-3.5 md:gap-4 text-right" dir="rtl">
        <span className="self-start px-3 py-1 bg-primary/20 border border-primary text-primary notched-clip-sm text-[10px] md:text-xs font-black tracking-widest uppercase font-display neon-text-glow">
          BAZINO PRO GAMING
        </span>
        <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] font-display uppercase tracking-tight">
          رزرو سیستم‌های گیمینگ فوق پیشرفته
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed max-w-xl">
          تجربه‌ی حرفه‌ای بازی با جدیدترین تجهیزات، اینترنت پرسرعت و فضای اختصاصی بازینو پرو.
        </p>
        <div className="flex flex-wrap gap-3 mt-2">
          <button onClick={onNavigate} className="theme-btn bg-primary text-black px-5 py-3 font-black text-xs md:text-sm">
            رزرو سیستم
          </button>
        </div>
      </div>
    </section>
  );
}
