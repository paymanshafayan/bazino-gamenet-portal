import React, { useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';
import { LegalShell, SimpleMarkdown, LEGAL_PALETTE } from './LegalShell';
import { LEGAL_DEFAULTS, LEGAL_SLUGS, LEGAL_TITLES, fillLegalTemplate, isLegalSlug, type Lang4, type LegalSlug } from './legalContent';
import { useCompanyInfo } from './useCompanyInfo';
import { PaymentBadgeRow } from './PaymentBadges';

/** متن نهایی یک صفحهٔ قانونی: override ادمین (legal_<slug>_<lang>) یا پیش‌فرض. */
export function resolveLegalText(slug: LegalSlug, lang: Lang4, settings: Record<string, string> | null): string {
  const key = `legal_${slug}_${lang}`;
  const override = settings?.[key];
  if (override && override.trim()) return override;
  return LEGAL_DEFAULTS[slug][lang] || LEGAL_DEFAULTS[slug].en;
}

export function LegalPage({ slug, onBack, onNavigate }: { slug: string; onBack: () => void; onNavigate: (p: string) => void }) {
  const { language } = useLanguage();
  const lang = (['fa', 'en', 'ru', 'tr'].includes(language) ? language : 'en') as Lang4;
  const { info, settings } = useCompanyInfo();
  const valid = isLegalSlug(slug) ? slug : 'terms';
  const body = useMemo(() => fillLegalTemplate(resolveLegalText(valid, lang, settings), info), [valid, lang, settings, info]);
  const updated = settings?.legal_updated_at || '2026-09-04';

  return (
    <LegalShell title={LEGAL_TITLES[valid][lang]} subtitle={`${L(language, { fa: 'آخرین به‌روزرسانی', en: 'Last updated', ru: 'Обновлено', tr: 'Son güncelleme' })}: ${updated}`} onBack={onBack}
      footer={
        <div style={{ marginTop: 30, paddingTop: 16, borderTop: `1px solid ${LEGAL_PALETTE.border}` }}>
          <PaymentBadgeRow height={24} />
        </div>
      }>
      <nav aria-label="legal" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {LEGAL_SLUGS.map(s => (
          <a key={s} href={`/legal/${s}`} onClick={(e) => { e.preventDefault(); onNavigate(`/legal/${s}`); }}
            style={{ fontSize: 12, padding: '5px 10px', borderRadius: 999, border: `1px solid ${s === valid ? LEGAL_PALETTE.accent : LEGAL_PALETTE.border}`, background: s === valid ? LEGAL_PALETTE.accent : 'transparent', color: s === valid ? '#fff' : LEGAL_PALETTE.muted }}>
            {LEGAL_TITLES[s][lang]}
          </a>
        ))}
      </nav>
      <article className="bz-legal-card" style={{ padding: '22px 24px' }} data-legal-slug={valid}>
        <SimpleMarkdown text={body} />
      </article>
    </LegalShell>
  );
}
