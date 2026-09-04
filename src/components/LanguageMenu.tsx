import React, { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LanguageType } from '../utils/translations';

/* ─────────────────────────────────────────────────────────────────────────
   منوی زبان — فقط «پرچم + کد اختصاری» (بدون نام کامل زبان).
   پرچم‌ها SVG داخلی‌اند: نه CDN (بلاک/کند)، نه emoji (روی ویندوز رندر نمی‌شود).
   ───────────────────────────────────────────────────────────────────────── */

export const LANGUAGE_OPTIONS: { id: LanguageType; code: string; country: string }[] = [
  { id: 'fa', code: 'FA', country: 'IR' },
  { id: 'en', code: 'EN', country: 'GB' },
  { id: 'ru', code: 'RU', country: 'RU' },
  { id: 'tr', code: 'TR', country: 'TR' },
];

const FlagIR: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 3 2" className={className} aria-hidden="true">
    <rect width="3" height="2" fill="#fff" />
    <rect width="3" height="0.667" fill="#239f40" />
    <rect y="1.333" width="3" height="0.667" fill="#da0000" />
    <circle cx="1.5" cy="1" r="0.26" fill="none" stroke="#da0000" strokeWidth="0.09" />
  </svg>
);
const FlagGB: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 60 30" className={className} aria-hidden="true">
    <clipPath id="lm-gb"><path d="M0 0v30h60V0z" /></clipPath>
    <path d="M0 0v30h60V0z" fill="#012169" />
    <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
    <path d="M0 0l60 30m0-30L0 30" clipPath="url(#lm-gb)" stroke="#C8102E" strokeWidth="4" />
    <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
    <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
  </svg>
);
const FlagRU: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 3 2" className={className} aria-hidden="true">
    <rect width="3" height="2" fill="#fff" />
    <rect y="0.667" width="3" height="0.667" fill="#0039a6" />
    <rect y="1.333" width="3" height="0.667" fill="#d52b1e" />
  </svg>
);
const FlagTR: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 30 20" className={className} aria-hidden="true">
    <rect width="30" height="20" fill="#e30a17" />
    <circle cx="11.25" cy="10" r="5" fill="#fff" />
    <circle cx="12.5" cy="10" r="4" fill="#e30a17" />
    <polygon fill="#fff" points="17.5,10 15.1,10.8 16.6,8.7 16.6,11.3 15.1,9.2" transform="rotate(0 16.3 10)" />
  </svg>
);

export const Flag: React.FC<{ country: string; className?: string }> = ({ country, className = 'w-5 h-3.5 rounded-[2px] shadow-sm shrink-0' }) => {
  switch (country) {
    case 'IR': return <FlagIR className={className} />;
    case 'GB': return <FlagGB className={className} />;
    case 'RU': return <FlagRU className={className} />;
    case 'TR': return <FlagTR className={className} />;
    default: return null;
  }
};

interface LanguageMenuProps {
  language: LanguageType;
  setLanguage: (l: LanguageType) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}

/** دکمه‌ی هدر دسکتاپ + dropdown */
export const LanguageMenu: React.FC<LanguageMenuProps> = ({ language, setLanguage, open, setOpen }) => {
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGE_OPTIONS.find(o => o.id === language) ?? LANGUAGE_OPTIONS[1];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, setOpen]);

  return (
    <div ref={ref} className="relative" data-testid="language-menu">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.code}`}
        className="h-8 px-2.5 flex items-center gap-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[11px] font-black tracking-wider text-white transition-all"
      >
        <Flag country={current.country} />
        <span dir="ltr">{current.code}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Language"
          className="absolute top-full mt-2 end-0 min-w-[96px] bg-dark-card border border-white/10 rounded-xl shadow-2xl p-1 z-[80]"
        >
          {LANGUAGE_OPTIONS.map(o => (
            <li key={o.id} role="option" aria-selected={o.id === language}>
              <button
                type="button"
                onClick={() => { setLanguage(o.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-black tracking-wider transition-all ${
                  o.id === language ? 'bg-primary text-black' : 'text-gray-200 hover:bg-white/5'
                }`}
              >
                <Flag country={o.country} />
                <span dir="ltr">{o.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** ردیف فشرده‌ی پرچم+کد برای شیت «بیشتر» موبایل */
export const LanguageRow: React.FC<{ language: LanguageType; setLanguage: (l: LanguageType) => void }> = ({ language, setLanguage }) => (
  <div className="flex items-center justify-between gap-1 px-2 py-2 border-t border-white/10 mt-1" data-testid="language-row">
    {LANGUAGE_OPTIONS.map(o => (
      <button
        key={o.id}
        type="button"
        onClick={() => setLanguage(o.id)}
        aria-pressed={o.id === language}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-black tracking-wider transition-all ${
          o.id === language ? 'bg-primary text-black' : 'text-gray-300 bg-white/5 hover:bg-white/10'
        }`}
      >
        <Flag country={o.country} />
        <span dir="ltr">{o.code}</span>
      </button>
    ))}
  </div>
);
