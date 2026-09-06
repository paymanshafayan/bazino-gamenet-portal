/**
 * تسک ۱۳ — مودال واحد انتخاب روش پرداخت (مستقل از قالب، Portal روی body):
 *   • کیف پول   → POST /api/checkout/wallet  (کسر فوری + تکمیل سفارش)
 *   • در محل    → POST /api/checkout/onsite  (ثبت با مهلت: رزرو ≥۱۰ دقیقه قبل از سانس، تورنمنت ≥۴۸ ساعت قبل)
 *   • آنلاین    → PaymentCheckout (PayTR) فقط اگر سرور اعلام کند فعال است
 * روش‌های مجاز هر نوع سفارش از GET /api/payments/methods خوانده می‌شود (بوفه/فروشگاه: فقط در محل).
 */
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { L } from '../utils/i18n';
import { postJson, errorMessage } from '../services/postJson';
import { ensureLegalStyles, LEGAL_PALETTE } from './LegalShell';
import { PaymentCheckout, type PaymentKind } from './PaymentCheckout';
import { getAuthToken } from '../services/authToken';

/** رویداد سراسری برای باز کردن مودال ورود (App گوش می‌دهد) */
export const OPEN_AUTH_EVENT = 'bazino:open-auth';
export function requestLogin() { window.dispatchEvent(new CustomEvent(OPEN_AUTH_EVENT)); }

export type PayMethod = 'wallet' | 'onsite' | 'online';

export interface PaymentMethods { online: boolean; currency: string; methods: Record<PaymentKind, PayMethod[]>; onsiteLeadMinutes: { reservation: number; tournament: number } }

let methodsCache: PaymentMethods | null = null;
export async function getPaymentMethods(force = false): Promise<PaymentMethods> {
  if (methodsCache && !force) return methodsCache;
  const fallback: PaymentMethods = { online: false, currency: 'TL', methods: { reservation: ['wallet', 'onsite'], tournament: ['wallet', 'onsite'], cafe: ['onsite'], shop: ['onsite'] }, onsiteLeadMinutes: { reservation: 10, tournament: 2880 } };
  try {
    const r = await fetch('/api/payments/methods');
    methodsCache = r.ok ? await r.json() : fallback;
  } catch { methodsCache = fallback; }
  return methodsCache!;
}

export interface CheckoutResult {
  method: PayMethod;
  orderId: string;
  amount: number;
  status?: string;
  dueAt?: string;
  startsAt?: string;
  balance?: number;
  result?: any;
}

interface Props {
  kind: PaymentKind;
  params: Record<string, unknown>;
  estimatedAmount?: number;
  title?: string;
  /** کاربر لاگین است؟ (پیش‌فرض: وجود توکن) */
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
  onDone: (r: CheckoutResult) => void;
  onClose: () => void;
}

/** متن قانون مهلت پرداخت در محل برای هر نوع سفارش */
export function onsiteRuleText(kind: PaymentKind, language: string): string {
  if (kind === 'reservation') return L(language, {
    fa: 'برای رزرو ایستگاه باید حداقل ۱۰ دقیقه قبل از شروع سانس در محل حاضر شده و هزینه را حضوری پرداخت کنید؛ در غیر این صورت رزرو به‌صورت خودکار باطل می‌شود.',
    en: 'For a station booking you must arrive and pay at the venue at least 10 minutes before the session starts; otherwise the booking is cancelled automatically.',
    ru: 'Для брони станции необходимо прийти и оплатить на месте не позднее чем за 10 минут до начала сеанса; иначе бронь автоматически аннулируется.',
    tr: 'İstasyon rezervasyonu için seansın başlamasından en az 10 dakika önce mekâna gelip ücreti yerinde ödemeniz gerekir; aksi hâlde rezervasyon otomatik olarak iptal edilir.',
  });
  if (kind === 'tournament') return L(language, {
    fa: 'برای ثبت‌نام تورنمنت باید حداقل ۴۸ ساعت قبل از شروع تورنمنت در محل حاضر شده و هزینه را حضوری پرداخت کنید؛ در غیر این صورت ثبت‌نام به‌صورت خودکار باطل می‌شود.',
    en: 'For tournament registration you must arrive and pay at the venue at least 48 hours before the tournament starts; otherwise the registration is cancelled automatically.',
    ru: 'Для регистрации на турнир необходимо прийти и оплатить на месте не позднее чем за 48 часов до начала турнира; иначе регистрация автоматически аннулируется.',
    tr: 'Turnuva kaydı için turnuva başlangıcından en az 48 saat önce mekâna gelip ücreti yerinde ödemeniz gerekir; aksi hâlde kayıt otomatik olarak iptal edilir.',
  });
  return L(language, {
    fa: 'سفارش شما ثبت می‌شود و هزینه هنگام تحویل در محل (نقدی یا کیف پول) تسویه می‌شود.',
    en: 'Your order is registered and paid at the venue on delivery (cash or wallet).',
    ru: 'Заказ регистрируется и оплачивается на месте при получении (наличными или из кошелька).',
    tr: 'Siparişiniz kaydedilir ve teslimatta mekânda (nakit veya cüzdan) ödenir.',
  });
}

export function formatDue(dueAt: string | undefined, language: string): string {
  if (!dueAt) return '';
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return '';
  const locale = language === 'fa' ? 'fa-IR' : language === 'ru' ? 'ru-RU' : language === 'tr' ? 'tr-TR' : 'en-GB';
  return d.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

export function CheckoutModal({ kind, params, estimatedAmount, title, isLoggedIn: loggedInProp, onRequireLogin = requestLogin, onDone, onClose }: Props) {
  const { language, dir } = useLanguage();
  const isLoggedIn = loggedInProp ?? !!getAuthToken();
  const [methods, setMethods] = useState<PaymentMethods | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [selected, setSelected] = useState<PayMethod | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(false);
  ensureLegalStyles();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const walletP: Promise<number | null> = isLoggedIn
      ? fetch('/api/me/wallet').then(r => (r.ok ? r.json() : null)).then(d => (d ? Number(d.balance) || 0 : null)).catch(() => null)
      : Promise.resolve(null);
    Promise.all([getPaymentMethods(true), walletP]).then(([m, bal]) => {
      if (cancelled) return;
      setMethods(m);
      if (bal !== null) setBalance(bal);
      const allowed = m.methods[kind] || [];
      // اگر موجودی کیف پول کافی نیست، پیش‌فرض «پرداخت در محل» انتخاب شود
      const first = allowed[0] === 'wallet' && (bal ?? 0) < estimatedAmount && allowed.includes('onsite') ? 'onsite' : allowed[0];
      setSelected(first || null);
    });
    return () => { cancelled = true; };
  }, [kind, isLoggedIn]);

  const allowed = methods ? (methods.methods[kind] || []) : [];
  const amount = typeof estimatedAmount === 'number' ? estimatedAmount : 0;
  const walletShort = balance !== null && amount > balance;
  const needsRule = kind === 'reservation' || kind === 'tournament';

  const labels: Record<PayMethod, { title: string; desc: string }> = {
    wallet: {
      title: L(language, { fa: 'کیف پول بازینو', en: 'Bazino wallet', ru: 'Кошелёк Bazino', tr: 'Bazino cüzdanı' }),
      desc: L(language, { fa: 'کسر فوری از موجودی؛ شارژ حضوری در کلاب انجام می‌شود.', en: 'Deducted instantly from your balance; top up in person at the club.', ru: 'Списывается сразу с баланса; пополнение — лично в клубе.', tr: 'Bakiyenizden anında düşülür; yükleme kulüpte yüz yüze yapılır.' }),
    },
    onsite: {
      title: L(language, { fa: 'پرداخت در محل', en: 'Pay at the venue', ru: 'Оплата на месте', tr: 'Mekânda ödeme' }),
      desc: onsiteRuleText(kind, language),
    },
    online: {
      title: L(language, { fa: 'پرداخت آنلاین (کارت)', en: 'Online card payment', ru: 'Онлайн-оплата картой', tr: 'Online kart ödemesi' }),
      desc: L(language, { fa: 'پرداخت امن با کارت بانکی.', en: 'Secure bank card payment.', ru: 'Безопасная оплата банковской картой.', tr: 'Güvenli banka kartı ödemesi.' }),
    },
  };

  const confirm = async () => {
    if (!selected) return;
    if (selected === 'online') { setOnline(true); return; }
    if (!isLoggedIn) { onRequireLogin?.(); return; }
    if (selected === 'onsite' && needsRule && !accepted) {
      setError(L(language, { fa: 'برای ادامه باید شرط پرداخت حضوری را بپذیرید.', en: 'You must accept the on-site payment rule to continue.', ru: 'Чтобы продолжить, примите условие оплаты на месте.', tr: 'Devam etmek için mekânda ödeme kuralını kabul etmelisiniz.' }));
      return;
    }
    setBusy(true); setError('');
    try {
      const signature=JSON.stringify({kind,params,selected});
      let idempotencyKey=localStorage.getItem('bazino.checkout.'+signature);if(!idempotencyKey){idempotencyKey=crypto.randomUUID();localStorage.setItem('bazino.checkout.'+signature,idempotencyKey);}
      const r = await postJson<any>(selected === 'wallet' ? '/api/checkout/wallet' : '/api/checkout/onsite', { kind, params, idempotencyKey });
      localStorage.removeItem('bazino.checkout.'+signature);
      window.dispatchEvent(new CustomEvent('bazino:refresh-data'));
      onDone({ method: selected, orderId: r.orderId, amount: r.amount, status: r.status, dueAt: r.dueAt, startsAt: r.startsAt, balance: r.balance, result: r.result });
    } catch (e) {
      const msg = errorMessage(e, '');
      if (msg === 'INSUFFICIENT_FUNDS') setError(L(language, { fa: 'موجودی کیف پول کافی نیست. لطفاً در کلاب کیف پول خود را شارژ کنید یا «پرداخت در محل» را انتخاب کنید.', en: 'Insufficient wallet balance. Top up at the club or choose “Pay at the venue”.', ru: 'Недостаточно средств в кошельке. Пополните в клубе или выберите «Оплата на месте».', tr: 'Cüzdan bakiyesi yetersiz. Kulüpte yükleme yapın veya “Mekânda ödeme” seçin.' }));
      else if (msg === 'Too late for on-site payment') setError(L(language, { fa: 'مهلت پرداخت حضوری برای این زمان گذشته است؛ لطفاً با کیف پول پرداخت کنید یا زمان دیگری انتخاب کنید.', en: 'The on-site payment window for this time has passed; pay with your wallet or choose another time.', ru: 'Срок оплаты на месте для этого времени истёк; оплатите кошельком или выберите другое время.', tr: 'Bu saat için mekânda ödeme süresi geçti; cüzdanla ödeyin veya başka bir zaman seçin.' }));
      else setError(msg || L(language, { fa: 'ثبت انجام نشد. دوباره تلاش کنید.', en: 'Could not complete. Please try again.', ru: 'Не удалось выполнить. Попробуйте снова.', tr: 'Tamamlanamadı. Lütfen tekrar deneyin.' }));
    } finally { setBusy(false); }
  };

  if (online) return <PaymentCheckout kind={kind} params={params} estimatedAmount={estimatedAmount} title={title} onClose={onClose} />;

  return createPortal(
    <div className="bz-legal" dir={dir} role="dialog" aria-modal="true" data-checkout-modal
      style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(3,6,12,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div className="bz-legal-card" style={{ width: '100%', maxWidth: 540, maxHeight: '94vh', overflow: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${LEGAL_PALETTE.border}` }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{title || L(language, { fa: 'روش پرداخت', en: 'Payment method', ru: 'Способ оплаты', tr: 'Ödeme yöntemi' })}</div>
          <button type="button" onClick={onClose} aria-label="close" className="bz-legal-btn bz-legal-btn-ghost" style={{ padding: '4px 10px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>
        <div style={{ padding: 18, display: 'grid', gap: 12 }}>
          {typeof estimatedAmount === 'number' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
              <span style={{ color: LEGAL_PALETTE.muted }}>{L(language, { fa: 'مبلغ', en: 'Amount', ru: 'Сумма', tr: 'Tutar' })}</span>
              <strong dir="ltr" data-checkout-amount>{estimatedAmount.toLocaleString()} TL</strong>
            </div>
          )}
          {!methods && <div style={{ color: LEGAL_PALETTE.muted, fontSize: 13 }}>…</div>}
          {methods && allowed.map(m => {
            const active = selected === m;
            const disabled = m === 'wallet' && isLoggedIn && walletShort;
            return (
              <label key={m} data-pay-method={m} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 12, borderRadius: 12, cursor: 'pointer', border: `1px solid ${active ? LEGAL_PALETTE.accent : LEGAL_PALETTE.border}`, background: active ? 'rgba(255,255,255,0.03)' : 'transparent', opacity: disabled ? 0.7 : 1 }}>
                <input type="radio" name="pay-method" checked={active} onChange={() => { setSelected(m); setError(''); }} style={{ marginTop: 4 }} />
                <span style={{ display: 'grid', gap: 4, flex: 1 }}>
                  <span style={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <span>{labels[m].title}</span>
                    {m === 'wallet' && isLoggedIn && balance !== null && (
                      <span dir="ltr" data-wallet-balance style={{ fontSize: 12, color: walletShort ? LEGAL_PALETTE.danger : LEGAL_PALETTE.accent, fontWeight: 700 }}>
                        {L(language, { fa: 'موجودی:', en: 'Balance:', ru: 'Баланс:', tr: 'Bakiye:' })} {balance.toLocaleString()} TL
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 12.5, color: LEGAL_PALETTE.muted, lineHeight: 1.6 }}>{labels[m].desc}</span>
                  {m === 'wallet' && isLoggedIn && walletShort && (
                    <span style={{ fontSize: 12, color: LEGAL_PALETTE.danger }}>{L(language, { fa: 'موجودی کافی نیست — در کلاب شارژ کنید.', en: 'Not enough balance — top up at the club.', ru: 'Недостаточно средств — пополните в клубе.', tr: 'Bakiye yetersiz — kulüpte yükleyin.' })}</span>
                  )}
                </span>
              </label>
            );
          })}
          {!isLoggedIn && selected && selected !== 'online' && (
            <div style={{ fontSize: 13, color: LEGAL_PALETTE.muted }} data-login-hint>
              {L(language, { fa: 'برای ادامه باید با شماره موبایل وارد شوید.', en: 'Sign in with your phone number to continue.', ru: 'Войдите по номеру телефона, чтобы продолжить.', tr: 'Devam etmek için telefon numaranızla giriş yapın.' })}
            </div>
          )}
          {selected === 'onsite' && needsRule && (
            <label data-onsite-accept style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, cursor: 'pointer', padding: 12, borderRadius: 10, border: `1px solid ${accepted ? LEGAL_PALETTE.accent : LEGAL_PALETTE.border}`, background: 'rgba(252,211,77,0.06)' }}>
              <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} style={{ marginTop: 3 }} />
              <span>{L(language, { fa: 'شرط بالا را خواندم و می‌پذیرم که در صورت عدم پرداخت حضوری تا مهلت اعلام‌شده، ', en: 'I have read the rule above and accept that if I do not pay at the venue by the stated deadline, ', ru: 'Я прочитал(а) условие выше и принимаю, что при неоплате на месте до указанного срока ', tr: 'Yukarıdaki kuralı okudum; belirtilen süreye kadar mekânda ödeme yapmazsam ' })}
                <strong>{kind === 'reservation' ? L(language, { fa: 'رزرو من باطل می‌شود.', en: 'my booking will be cancelled.', ru: 'моя бронь будет аннулирована.', tr: 'rezervasyonumun iptal edileceğini kabul ediyorum.' }) : L(language, { fa: 'ثبت‌نام من باطل می‌شود.', en: 'my registration will be cancelled.', ru: 'моя регистрация будет аннулирована.', tr: 'kaydımın iptal edileceğini kabul ediyorum.' })}</strong>
              </span>
            </label>
          )}
          {error && <div style={{ color: LEGAL_PALETTE.danger, fontSize: 13 }} data-error>{error}</div>}
          <button type="button" className="bz-legal-btn bz-legal-btn-primary" data-checkout-confirm disabled={busy || !selected || (selected === 'wallet' && isLoggedIn && walletShort)} onClick={confirm}
            style={{ opacity: busy || !selected || (selected === 'wallet' && isLoggedIn && walletShort) ? 0.55 : 1, padding: '12px 18px', fontSize: 15 }}>
            {busy ? '…' : !isLoggedIn && selected !== 'online'
              ? L(language, { fa: 'ورود و ادامه', en: 'Sign in & continue', ru: 'Войти и продолжить', tr: 'Giriş yap ve devam et' })
              : selected === 'wallet' ? L(language, { fa: 'پرداخت از کیف پول', en: 'Pay from wallet', ru: 'Оплатить из кошелька', tr: 'Cüzdandan öde' })
              : selected === 'onsite' ? L(language, { fa: 'ثبت با پرداخت در محل', en: 'Register with on-site payment', ru: 'Оформить с оплатой на месте', tr: 'Mekânda ödeme ile kaydet' })
              : L(language, { fa: 'ادامه به درگاه', en: 'Continue to gateway', ru: 'Перейти к оплате', tr: 'Ödemeye geç' })}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
