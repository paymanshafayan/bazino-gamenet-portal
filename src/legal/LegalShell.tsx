/**
 * پوستهٔ مستقل از قالب برای صفحات قانونی/تماس/پرداخت.
 *
 * قاعدهٔ محصول: این صفحات و نوار پایینی قانونی «به هیچ عنوان» تحت تأثیر قالب قرار نمی‌گیرند و
 * مستقیماً توسط فرانت‌اند رندر می‌شوند. بنابراین:
 *  - هیچ توکن قالب (کلاس‌ها/متغیرهای CSS قالب) استفاده نمی‌شود؛
 *  - رنگ‌ها/فونت‌ها با استایل درون‌خطی و یک بلوک CSS با !important روی ریشهٔ `.bz-legal` قفل شده‌اند؛
 *  - خارج از ناحیه‌های قالب و بدون خواندن theme.js رندر می‌شوند (App.tsx).
 */
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';

export const LEGAL_PALETTE = {
  bg: '#0b0f17',
  card: '#121826',
  border: '#232c3d',
  text: '#e6e9f0',
  muted: '#9aa4b8',
  accent: '#3b82f6',
  accentText: '#ffffff',
  danger: '#ef4444',
  success: '#22c55e',
  warn: '#f59e0b',
};

const FONT = "'Vazirmatn', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

export const LEGAL_STYLE_BLOCK = `
.bz-legal, .bz-legal * { box-sizing: border-box !important; }
.bz-legal { font-family: ${FONT} !important; color: ${LEGAL_PALETTE.text} !important; background: ${LEGAL_PALETTE.bg} !important; line-height: 1.7 !important; letter-spacing: 0 !important; text-transform: none !important; }
.bz-legal h1, .bz-legal h2, .bz-legal h3 { font-family: ${FONT} !important; color: ${LEGAL_PALETTE.text} !important; text-transform: none !important; letter-spacing: 0 !important; text-shadow: none !important; }
.bz-legal p, .bz-legal li, .bz-legal label, .bz-legal span, .bz-legal td, .bz-legal th { color: inherit; font-family: inherit !important; }
.bz-legal a { color: ${LEGAL_PALETTE.accent} !important; text-decoration: none !important; }
.bz-legal a:hover { text-decoration: underline !important; }
.bz-legal button { font-family: ${FONT} !important; cursor: pointer; }
.bz-legal input[type=checkbox] { accent-color: ${LEGAL_PALETTE.accent}; width: 18px; height: 18px; }
.bz-legal-card { background: ${LEGAL_PALETTE.card} !important; border: 1px solid ${LEGAL_PALETTE.border} !important; border-radius: 16px !important; }
.bz-legal-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 18px; border-radius: 10px; font-weight: 700; font-size: 14px; border: 1px solid transparent; transition: filter .15s; }
.bz-legal-btn:hover { filter: brightness(1.1); }
.bz-legal-btn-primary { background: ${LEGAL_PALETTE.accent} !important; color: ${LEGAL_PALETTE.accentText} !important; }
.bz-legal-btn-ghost { background: transparent !important; color: ${LEGAL_PALETTE.text} !important; border-color: ${LEGAL_PALETTE.border} !important; }
.bz-legal-prose h2 { font-size: 18px; margin: 26px 0 10px; font-weight: 800; }
.bz-legal-prose p { margin: 0 0 12px; font-size: 15px; }
.bz-legal-prose ul { margin: 0 0 12px; padding-inline-start: 22px; }
.bz-legal-prose li { margin: 4px 0; font-size: 15px; }
.bz-legal-prose strong { color: #fff; }
.bz-legal-prose code { background: #1c2333; padding: 1px 6px; border-radius: 6px; font-size: 13px; }
`;

let styleInjected = false;
export function ensureLegalStyles() {
  if (styleInjected || typeof document === 'undefined') return;
  const tag = document.createElement('style');
  tag.id = 'bz-legal-styles';
  tag.textContent = LEGAL_STYLE_BLOCK;
  document.head.appendChild(tag);
  styleInjected = true;
}

interface ShellProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  footer?: React.ReactNode;
}

/** صفحهٔ تمام‌عرض مستقل (برای /legal/*, /contact, /payment/*). */
export function LegalShell({ title, subtitle, onBack, children, maxWidth = 860, footer }: ShellProps) {
  const { language, dir } = useLanguage();
  ensureLegalStyles();
  return (
    <div className="bz-legal" dir={dir} style={{ minHeight: '100vh', padding: '0 0 40px' }}>
      <header style={{ borderBottom: `1px solid ${LEGAL_PALETTE.border}`, background: '#0e131d' }}>
        <div style={{ maxWidth, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <a href="/" onClick={(e) => { if (onBack) { e.preventDefault(); onBack(); } }} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 16, color: LEGAL_PALETTE.text }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: LEGAL_PALETTE.accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900 }}>B</span>
            Bazino
          </a>
          <button type="button" className="bz-legal-btn bz-legal-btn-ghost" onClick={onBack} style={{ padding: '6px 12px', fontSize: 13 }}>
            {L(language, { fa: 'بازگشت به سایت', en: 'Back to site', ru: 'Назад на сайт', tr: 'Siteye dön' })}
          </button>
        </div>
      </header>
      <main style={{ maxWidth, margin: '0 auto', padding: '28px 20px 0' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 6px' }}>{title}</h1>
        {subtitle && <p style={{ color: LEGAL_PALETTE.muted, margin: '0 0 22px', fontSize: 14 }}>{subtitle}</p>}
        {children}
        {footer}
      </main>
    </div>
  );
}

/** رندر Markdown خیلی ساده (## ، - ، **bold**) بدون کتابخانه. */
export function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) { out.push(<ul key={`ul${out.length}`}>{list.map((li, i) => <li key={i}>{inline(li)}</li>)}</ul>); list = []; }
  };
  const inline = (s: string): React.ReactNode => {
    const parts = s.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>);
  };
  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (line.startsWith('## ')) { flush(); out.push(<h2 key={idx}>{line.slice(3)}</h2>); return; }
    if (line.startsWith('- ')) { list.push(line.slice(2)); return; }
    flush();
    if (line.trim() === '') return;
    out.push(<p key={idx}>{inline(line)}</p>);
  });
  flush();
  return <div className="bz-legal-prose">{out}</div>;
}
