/**
 * ═══════════════════════════════════════════════════════════════════════════
 * تست‌های رابط کاربری (سوئیت ۲۸–۳۴)
 *
 * کامپوننت‌های واقعی React/Preact را داخل یک DOM واقعی (jsdom) رندر می‌کند و
 * رفتارشان را می‌سنجد: رندر اولیه، کلیک، تغییر state، فراخوانی API و صحت
 * تصاویر/دسترس‌پذیری. هیچ snapshot کورکورانه‌ای گرفته نمی‌شود — هر assert
 * یک رفتار مشخص را بررسی می‌کند.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { suite, test, assert, run } from './harness.mts';
import {
  setupDom, teardownDom, loadModule, mount, act, getDocument, getWindow,
  installIntersectionObserver, removeIntersectionObserver, stubFetch,
} from './dom.mts';

await setupDom();

const realFetch = globalThis.fetch;
const restoreFetch = () => { (globalThis as any).fetch = realFetch; };

/* ═══════════════════════════════════════════════════════════════════════
   28. PerformanceGuards — DeferredSection رفتار واقعی در DOM
   ═══════════════════════════════════════════════════════════════════════ */
suite('28. UI — DeferredSection');

const { DeferredSection } = await loadModule('/src/components/PerformanceGuards.tsx');

test('renders a reserved-height placeholder before it becomes visible', async () => {
  const io = installIntersectionObserver();
  try {
    const el = await mount(DeferredSection, {
      minHeight: 320,
      render: () => 'LOADED-CONTENT',
    });
    const placeholder = el.find('div[aria-hidden="true"]');
    assert.ok(placeholder, 'no placeholder rendered');
    assert.match(placeholder.getAttribute('style') ?? '', /min-height:\s*320px/,
      'placeholder does not reserve its height (causes layout shift)');
    assert.ok(!el.text().includes('LOADED-CONTENT'), 'content mounted too early');
    await el.unmount();
  } finally { removeIntersectionObserver(); }
});

test('mounts its content once the section scrolls into view', async () => {
  const io = installIntersectionObserver();
  try {
    const el = await mount(DeferredSection, { minHeight: 200, render: () => 'LOADED-CONTENT' });
    assert.ok(!el.text().includes('LOADED-CONTENT'));

    await act(async () => { io.triggerAll(true); });

    assert.ok(el.text().includes('LOADED-CONTENT'), 'content did not mount after intersecting');
    assert.equal(el.find('div[aria-hidden="true"]'), null, 'placeholder should be gone');
    await el.unmount();
  } finally { removeIntersectionObserver(); }
});

test('stays collapsed while the section is still off-screen', async () => {
  const io = installIntersectionObserver();
  try {
    const el = await mount(DeferredSection, { minHeight: 200, render: () => 'LOADED-CONTENT' });
    await act(async () => { io.triggerAll(false); });
    assert.ok(!el.text().includes('LOADED-CONTENT'), 'content mounted despite not intersecting');
    await el.unmount();
  } finally { removeIntersectionObserver(); }
});

test('fires onVisible exactly once', async () => {
  const io = installIntersectionObserver();
  try {
    let calls = 0;
    const el = await mount(DeferredSection, {
      minHeight: 100, render: () => 'X', onVisible: () => { calls++; },
    });
    await act(async () => { io.triggerAll(true); });
    await act(async () => { io.triggerAll(true); });
    assert.equal(calls, 1, `onVisible fired ${calls} times`);
    await el.unmount();
  } finally { removeIntersectionObserver(); }
});

test('mounts immediately when IntersectionObserver is unavailable', async () => {
  removeIntersectionObserver();
  const el = await mount(DeferredSection, { minHeight: 100, render: () => 'NO-IO-CONTENT' });
  assert.ok(el.text().includes('NO-IO-CONTENT'),
    'content must render eagerly when the browser lacks IntersectionObserver');
  await el.unmount();
});

/* ═══════════════════════════════════════════════════════════════════════
   29. LandingHero — کامپوننت LCP
   ═══════════════════════════════════════════════════════════════════════ */
suite('29. UI — LandingHero (LCP)');

const LandingHero = (await loadModule('/src/components/LandingHero.tsx')).default;

test('renders the hero image eagerly with a high fetch priority', async () => {
  const el = await mount(LandingHero, { onNavigate: () => {} });
  const img = el.find('img');
  assert.ok(img, 'no hero image rendered');
  assert.equal(img.getAttribute('loading'), 'eager', 'the LCP image must not be lazy-loaded');
  assert.equal((img.getAttribute('fetchpriority') || '').toLowerCase(), 'high');
  await el.unmount();
});

test('the hero image is a local webp with explicit dimensions', async () => {
  const el = await mount(LandingHero, { onNavigate: () => {} });
  const img = el.find('img');
  const src = img.getAttribute('src') ?? '';
  assert.match(src, /^\/images\/.+\.webp$/, `hero src is not a local webp: ${src}`);
  assert.ok(!src.includes('unsplash'), 'hero still points at unsplash');
  assert.ok(img.getAttribute('width') && img.getAttribute('height'),
    'width/height missing — causes layout shift');
  await el.unmount();
});

test('every srcset candidate is a local webp variant', async () => {
  const el = await mount(LandingHero, { onNavigate: () => {} });
  const srcset = el.find('img').getAttribute('srcset') ?? '';
  assert.ok(srcset.length > 0, 'no srcset on the hero image');
  for (const part of srcset.split(',')) {
    const url = part.trim().split(/\s+/)[0];
    assert.match(url, /^\/images\/.+\.webp$/, `bad srcset candidate: ${url}`);
  }
  await el.unmount();
});

test('the hero image has a non-empty alt text', async () => {
  const el = await mount(LandingHero, { onNavigate: () => {} });
  const alt = el.find('img').getAttribute('alt') ?? '';
  assert.ok(alt.trim().length > 0, 'hero image has no alt text');
  await el.unmount();
});

test('clicking the call-to-action navigates', async () => {
  let navigated = 0;
  const el = await mount(LandingHero, { onNavigate: () => { navigated++; } });
  await el.click('button');
  assert.equal(navigated, 1, 'the CTA button did not call onNavigate');
  await el.unmount();
});

/* ═══════════════════════════════════════════════════════════════════════
   30. CyberUI — کامپوننت‌های پایه‌ای قابل استفادهٔ مجدد
   ═══════════════════════════════════════════════════════════════════════ */
suite('30. UI — CyberUI primitives');

const { HexIcon, CyberButton, HudSquareButton } = await loadModule('/src/components/CyberUI.tsx');

test('HexIcon renders at the requested size', async () => {
  const el = await mount(HexIcon, { icon: 'A', size: 96 });
  const style = el.find('div')?.getAttribute('style') ?? '';
  assert.match(style, /width:\s*96px/, `size not applied: ${style}`);
  await el.unmount();
});

test('HexIcon forwards clicks', async () => {
  let clicked = 0;
  const el = await mount(HexIcon, { icon: 'A', onClick: () => { clicked++; } });
  await el.click('div');
  assert.equal(clicked, 1, 'HexIcon swallowed the click');
  await el.unmount();
});

test('CyberButton renders its label and handles clicks', async () => {
  let clicked = 0;
  const el = await mount(CyberButton, { onClick: () => { clicked++; } }, 'ثبت رزرو');
  assert.ok(el.text().includes('ثبت رزرو'), `label missing: ${el.text()}`);
  const target = el.find('button') ?? el.find('div');
  await el.click(target);
  assert.equal(clicked, 1, 'CyberButton did not fire onClick');
  await el.unmount();
});

test('HudSquareButton shows its badge only when there is one', async () => {
  const withBadge = await mount(HudSquareButton, { icon: 'I', badge: 7 });
  assert.ok(withBadge.text().includes('7'), 'badge not rendered');
  await withBadge.unmount();

  const without = await mount(HudSquareButton, { icon: 'I' });
  assert.ok(!/\d/.test(without.text()), `unexpected badge digits: ${without.text()}`);
  await without.unmount();
});

/* ═══════════════════════════════════════════════════════════════════════
   31. AuthModal — ورود با کد پیامکی (OTP) / رمز عبور
   ═══════════════════════════════════════════════════════════════════════ */
suite('31. UI — AuthModal');

const LanguageCtx = await loadModule('/src/context/LanguageContext.tsx');
const AuthModal = (await loadModule('/src/components/AuthModal.tsx')).default;
const React = (await loadModule('react')) as any;

/** AuthModal به context زبان نیاز دارد. */
const withLanguage = (node: any) =>
  React.createElement(LanguageCtx.LanguageProvider, null, node);

async function mountAuthModal(props: any) {
  const Wrapper = () => withLanguage(React.createElement(AuthModal, props));
  return mount(Wrapper, {});
}

test('renders nothing while closed', async () => {
  const el = await mountAuthModal({
    isOpen: false, onClose: () => {}, onAuthSuccess: () => {}, addNotification: () => {},
  });
  assert.equal(el.html().trim(), '', 'a closed modal must not render anything');
  await el.unmount();
});

const Ev = () => getDocument().defaultView.Event;
const setInput = async (input: any, value: string) => act(async () => {
  const setter = Object.getOwnPropertyDescriptor(getDocument().defaultView.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new (Ev())('input', { bubbles: true }));
});
const submit = async (form: any) => { await act(async () => { form.dispatchEvent(new (Ev())('submit', { bubbles: true, cancelable: true })); }); await act(async () => { await new Promise(r => setTimeout(r, 30)); }); };
const clickTab = async (el: any, i: number) => act(async () => { el.findAll('[role=tab]')[i].click(); });

test('opens on the SMS-code tab with a phone field; no registration tab exists', async () => {
  const el = await mountAuthModal({ isOpen: true, onClose: () => {}, onAuthSuccess: () => {}, addNotification: () => {} });
  assert.ok(el.find('[data-otp-step="phone"]'), 'phone step not rendered');
  assert.ok(el.find('#auth-phone'), 'no phone input');
  assert.equal(el.findAll('[role=tab]').length, 2, 'exactly two tabs: SMS code / password');
  assert.ok(!el.find('input[type="email"]'), 'no e-mail/registration form anymore');
  await el.unmount();
});

test('requesting a code moves to the code step and shows a countdown from the server retryAfter', async () => {
  const calls = stubFetch((url) => {
    if (url.includes('/api/auth/otp/request')) return { status: 200, body: { success: true, phone: '+905321112233', retryAfter: 45, expiresIn: 300 } };
    return { status: 200, body: {} };
  });
  try {
    const el = await mountAuthModal({ isOpen: true, onClose: () => {}, onAuthSuccess: () => {}, addNotification: () => {} });
    await setInput(el.find('#auth-phone'), '0532 111 22 33');
    await submit(el.find('form'));
    const req = calls.find(c => c.url.includes('/api/auth/otp/request'));
    assert.ok(req, 'otp/request was not called');
    assert.equal(JSON.parse(req!.init.body).phone, '0532 111 22 33');
    assert.ok(el.find('[data-otp-step="code"]'), 'did not advance to the code step');
    assert.ok(el.text().includes('+905321112233'), 'normalised phone from the server should be shown');
    assert.ok(el.find('[data-otp-resend]').textContent.includes('00:45'), `countdown should start at 00:45, got: ${el.find('[data-otp-resend]').textContent}`);
    await el.unmount();
  } finally { restoreFetch(); }
});

test('a 429 from the server is shown with its retryAfter countdown (cooldown is server-driven)', async () => {
  stubFetch((url) => {
    if (url.includes('/api/auth/otp/request')) return { status: 429, body: { error: 'Too soon', code: 'OTP_TOO_SOON', retryAfter: 37 } };
    return { status: 200, body: {} };
  });
  try {
    const el = await mountAuthModal({ isOpen: true, onClose: () => {}, onAuthSuccess: () => {}, addNotification: () => {} });
    await setInput(el.find('#auth-phone'), '05321112233');
    await submit(el.find('form'));
    assert.ok(el.find('[role=alert]')?.textContent.includes('Too soon'), 'server error not displayed');
    assert.ok(el.find('[data-otp-step="code"]'), 'OTP_TOO_SOON should still let the user type the code they already got');
    assert.ok(el.find('[data-otp-resend]').textContent.includes('00:37'));
    await el.unmount();
  } finally { restoreFetch(); }
});

test('verifying the code stores the JWT and reports the user; wrong code shows the error', async () => {
  const { clearAuthToken, getAuthToken } = await loadModule('/src/services/authToken.ts');
  clearAuthToken();
  const calls = stubFetch((url, init) => {
    if (url.includes('/api/auth/otp/request')) return { status: 200, body: { success: true, phone: '+905321112233', retryAfter: 60 } };
    if (url.includes('/api/auth/otp/verify')) {
      const { code } = JSON.parse(init.body);
      if (code === '123456') return { status: 200, body: { success: true, isNew: true, token: 'jwt-otp', user: { username: '905321112233', role: 'gamer', loyaltyPoints: 100 } } };
      return { status: 400, body: { error: 'Incorrect code (4 attempts left).', code: 'OTP_WRONG', attemptsLeft: 4 } };
    }
    return { status: 200, body: {} };
  });
  try {
    let authed: any = null;
    const el = await mountAuthModal({ isOpen: true, onClose: () => {}, onAuthSuccess: (u: any) => { authed = u; }, addNotification: () => {} });
    await setInput(el.find('#auth-phone'), '05321112233');
    await submit(el.find('form'));
    await setInput(el.find('#auth-code'), '000000');
    await submit(el.find('form'));
    assert.ok(el.find('[role=alert]')?.textContent.includes('4 attempts'), 'wrong-code error not shown');
    assert.equal(getAuthToken(), null);
    await setInput(el.find('#auth-code'), '123456');
    await submit(el.find('form'));
    const verify = calls.filter(c => c.url.includes('/api/auth/otp/verify'));
    assert.equal(verify.length, 2);
    assert.equal(JSON.parse(verify[1].init.body).phone, '+905321112233', 'verify must use the server-normalised phone');
    assert.ok(authed && authed.username === '905321112233', 'onAuthSuccess not called with the user');
    assert.equal(getAuthToken(), 'jwt-otp');
    await el.unmount();
  } finally { restoreFetch(); }
});

test('the password tab still logs in with username/password (admin path)', async () => {
  const calls = stubFetch((url) => {
    if (url.includes('/api/auth/login')) return { status: 200, body: { success: true, token: 'jwt-from-test', user: { username: 'tester', role: 'admin' } } };
    return { status: 200, body: {} };
  });
  try {
    let authed: any = null;
    const el = await mountAuthModal({ isOpen: true, onClose: () => {}, onAuthSuccess: (u: any) => { authed = u; }, addNotification: () => {} });
    await clickTab(el, 1);
    assert.ok(el.find('[data-password-login]'), 'password form not shown');
    await setInput(el.find('#auth-username'), 'tester');
    await setInput(el.find('#auth-password'), 'secret');
    await submit(el.find('form'));
    assert.ok(calls.some(c => c.url.includes('/api/auth/login')), 'login endpoint was never called');
    assert.equal(authed?.username, 'tester');
    const { getAuthToken } = await loadModule('/src/services/authToken.ts');
    assert.equal(getAuthToken(), 'jwt-from-test');
    await el.unmount();
  } finally { restoreFetch(); }
});

test('a failed password login surfaces the server error and stores no token', async () => {
  const { clearAuthToken, getAuthToken } = await loadModule('/src/services/authToken.ts');
  clearAuthToken();
  stubFetch(() => ({ status: 400, body: { error: 'نام کاربری یا کلمه عبور اشتباه است.' } }));
  try {
    let notified = '';
    const el = await mountAuthModal({ isOpen: true, onClose: () => {}, onAuthSuccess: () => {}, addNotification: (m: string) => { notified = m; } });
    await clickTab(el, 1);
    await submit(el.find('form'));
    assert.ok(el.text().includes('اشتباه') || notified.includes('اشتباه'), `the error was not shown (notified: "${notified}")`);
    assert.equal(getAuthToken(), null);
    await el.unmount();
  } finally { restoreFetch(); }
});

/* ═══════════════════════════════════════════════════════════════════════
   32. authToken — نگه‌دارندهٔ توکن و interceptor
   ═══════════════════════════════════════════════════════════════════════ */
suite('32. UI — auth token store');

const tokenMod = await loadModule('/src/services/authToken.ts');

test('the token round-trips through storage', async () => {
  tokenMod.setAuthToken('abc123');
  assert.equal(tokenMod.getAuthToken(), 'abc123');
  tokenMod.clearAuthToken();
  assert.equal(tokenMod.getAuthToken(), null);
});

test('the interceptor attaches the token to same-origin /api calls', async () => {
  const seen: any[] = [];
  (globalThis as any).fetch = async (_i: any, init?: any) => { seen.push(init); return { ok: true, status: 200 }; };
  try {
    tokenMod.setAuthToken('secret-token');
    tokenMod.installAuthFetchInterceptor();
    await (globalThis as any).fetch('/api/admin/users');
    const headers = new Headers(seen.at(-1)?.headers);
    assert.equal(headers.get('Authorization'), 'Bearer secret-token',
      'the admin call went out without the token');
  } finally { tokenMod.clearAuthToken(); restoreFetch(); }
});

test('the token is never sent to a third-party origin', async () => {
  const seen: any[] = [];
  (globalThis as any).fetch = async (_i: any, init?: any) => { seen.push(init); return { ok: true, status: 200 }; };
  try {
    tokenMod.setAuthToken('secret-token');
    tokenMod.installAuthFetchInterceptor();
    await (globalThis as any).fetch('https://evil.example.com/api/steal');
    const headers = new Headers(seen.at(-1)?.headers);
    assert.equal(headers.get('Authorization'), null, 'the JWT leaked to a third-party host!');
  } finally { tokenMod.clearAuthToken(); restoreFetch(); }
});

test('a caller-supplied Authorization header is not overwritten', async () => {
  const seen: any[] = [];
  (globalThis as any).fetch = async (_i: any, init?: any) => { seen.push(init); return { ok: true, status: 200 }; };
  try {
    tokenMod.setAuthToken('stored-token');
    tokenMod.installAuthFetchInterceptor();
    await (globalThis as any).fetch('/api/sync/logs', { headers: { Authorization: 'Bearer explicit-key' } });
    const headers = new Headers(seen.at(-1)?.headers);
    assert.equal(headers.get('Authorization'), 'Bearer explicit-key');
  } finally { tokenMod.clearAuthToken(); restoreFetch(); }
});

test('no Authorization header is added when nobody is logged in', async () => {
  const seen: any[] = [];
  (globalThis as any).fetch = async (_i: any, init?: any) => { seen.push(init); return { ok: true, status: 200 }; };
  try {
    tokenMod.clearAuthToken();
    tokenMod.installAuthFetchInterceptor();
    await (globalThis as any).fetch('/api/systems');
    const headers = new Headers(seen.at(-1)?.headers);
    assert.equal(headers.get('Authorization'), null);
  } finally { restoreFetch(); }
});

/* ═══════════════════════════════════════════════════════════════════════
   33. MobileAppDownloadWidget
   ═══════════════════════════════════════════════════════════════════════ */
suite('33. UI — MobileAppDownloadWidget');

const MobileWidget = (await loadModule('/src/components/MobileAppDownloadWidget.tsx')).default;

async function mountWidget(onOpen: () => void) {
  const Wrapper = () => withLanguage(React.createElement(MobileWidget, { onOpenDownloadPage: onOpen }));
  return mount(Wrapper, {});
}

test('renders a QR code and a download call-to-action', async () => {
  const el = await mountWidget(() => {});
  assert.ok(el.html().length > 0, 'widget rendered nothing');
  const qr = el.find('img');
  assert.ok(qr, 'no QR image rendered');
  assert.ok((qr.getAttribute('alt') ?? '').length > 0, 'QR image has no alt text');
  assert.ok(el.findAll('button').length >= 2, 'expected a close button and a download button');
  await el.unmount();
});

test('the download button calls onOpenDownloadPage', async () => {
  let opened = 0;
  const el = await mountWidget(() => { opened++; });
  // the first button is "close"; the download CTA is the last one
  const buttons = el.findAll('button');
  await el.click(buttons[buttons.length - 1]);
  assert.equal(opened, 1, 'the download button did not call onOpenDownloadPage');
  await el.unmount();
});

test('the close button hides the widget without navigating', async () => {
  let opened = 0;
  const el = await mountWidget(() => { opened++; });
  const closeBtn = el.findAll('button')[0];
  await el.click(closeBtn);
  assert.equal(opened, 0, 'closing the widget must not trigger navigation');
  const card = el.find('aside');
  assert.equal(card?.style?.display, 'none', 'the widget did not hide itself');
  await el.unmount();
});

/* ═══════════════════════════════════════════════════════════════════════
   34. سیاست تصاویر در کل کامپوننت‌ها
   ═══════════════════════════════════════════════════════════════════════ */
suite('34. UI — image policy across components');

test('no rendered component emits an unsplash image', async () => {
  const components: Array<[string, any, any]> = [
    ['LandingHero', LandingHero, { onNavigate: () => {} }],
  ];
  for (const [name, Comp, props] of components) {
    const el = await mount(Comp, props);
    assert.ok(!el.html().includes('unsplash'), `${name} still renders an unsplash URL`);
    await el.unmount();
  }
});

test('every <img> rendered by LandingHero has width, height and alt', async () => {
  const el = await mount(LandingHero, { onNavigate: () => {} });
  for (const img of el.findAll('img')) {
    assert.ok(img.getAttribute('alt') !== null, 'an <img> is missing alt');
    assert.ok(img.getAttribute('width'), 'an <img> is missing width');
    assert.ok(img.getAttribute('height'), 'an <img> is missing height');
  }
  await el.unmount();
});

suite('35. UI — TournamentsTab');

test('does not crash when mounting a tournament with an empty bracket', async () => {
  const { default: TournamentsTab } = await loadModule('/src/components/TournamentsTab.tsx');
  
  stubFetch(async (url) => {
    if (url.includes('/api/tournaments')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          tournaments: [{
            id: 'test-tournament',
            title: 'Empty Bracket Tournament',
            game: 'Test Game',
            registrationFee: 0,
            startDate: '2026-08-13',
            maxTeams: 16,
            status: 'Active',
            registeredTeamsCount: 0,
            teams: [],
            bracket: {}
          }]
        })
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  });

  const Wrapper = () => withLanguage(React.createElement(TournamentsTab, { 
    tournaments: [{
      id: 'test-tournament',
      title: 'Empty Bracket Tournament',
      game: 'Test Game',
      registrationFee: 0,
      startDate: '2026-08-13',
      maxTeams: 16,
      status: 'Active',
      registeredTeamsCount: 0,
      teams: [],
      bracket: {}
    }],
    onAddLoyaltyPoints: () => {},
    onRegisterTeam: () => {},
    addNotification: () => {}
  }));
  const el = await mount(Wrapper, {});
  
  // Wait for fetch and effect
  await act(async () => {
    await new Promise(r => setTimeout(r, 100));
  });

  const html = el.html();
  // It shouldn't crash, meaning we should find evidence it rendered
  assert.ok(html.includes('Empty Bracket Tournament') || html.includes('جدول حذفی هنوز مشخص نشده است') || html.includes('Bracket not drawn yet'), 'Did not find expected text indicating successful render');

  await el.unmount();
  restoreFetch();
});

/* ═══════════════════════════════════════════════════════════════════════
   38. Theme SDK — خروجی render (DOM خام / html) و LocationFrame
   ═══════════════════════════════════════════════════════════════════════ */
suite('38. UI — Theme SDK render outputs & LocationFrame');

const sdk = await loadModule('/src/themeSdk/sdk.ts');
const { LocationFrame, locationFrom } = await loadModule('/src/themeSdk/LocationFrame.tsx');

const baseProps = () => ({ language: 'tr', dir: 'ltr', t: (k: string) => k, ts: (k: string) => k, tokens: {}, slides: [], onNavigate: () => {}, featuredGames: [], tournaments: [], settings: {}, logoUrl: '/logo.png', assetsBase: '/x', themeId: 't', region: 'header' });

test('a theme render() that returns a raw DOM node is mounted inside the region host', async () => {
  const doc = getDocument();
  sdk.registerComponent('header', { apiVersion: 2, render: () => { const d = doc.createElement('div'); d.id = 'raw-dom-header'; d.textContent = 'RAW'; return d; } });
  const host = doc.createElement('div'); doc.body.appendChild(host);
  await act(() => { sdk.mountComponent('header', host, baseProps()); });
  assert.ok(host.querySelector('#raw-dom-header'), 'raw DOM output was not rendered');
  assert.equal(host.textContent, 'RAW');
  await act(() => { sdk.unregisterComponent('header'); });
  host.remove();
});

test('a theme render() that returns { html } is injected; unsupported values render nothing without throwing', async () => {
  const doc = getDocument();
  sdk.registerComponent('footer', { apiVersion: 2, render: () => ({ html: '<b id="html-footer">HTML</b>' }) });
  const host = doc.createElement('div'); doc.body.appendChild(host);
  await act(() => { sdk.mountComponent('footer', host, { ...baseProps(), region: 'footer' }); });
  assert.ok(host.querySelector('#html-footer'));
  sdk.registerComponent('footer', { apiVersion: 2, render: () => 42n as any });
  await act(() => { sdk.mountComponent('footer', host, { ...baseProps(), region: 'footer' }); });
  assert.equal(host.textContent, '');
  sdk.registerComponent('footer', { apiVersion: 2, render: () => { throw new Error('boom'); } });
  await act(() => { sdk.mountComponent('footer', host, { ...baseProps(), region: 'footer' }); });
  assert.equal(host.textContent, '', 'a throwing render must not break the host');
  await act(() => { sdk.unregisterComponent('footer'); });
  host.remove();
});

test('locationFrom normalises admin settings and falls back to the real club coordinates', () => {
  const loc = locationFrom({ club_address: 'A', club_phone: '+90 1', club_hours: '24/7', club_map_lat: '35.1', club_map_lng: '33.9', club_map_url: 'https://maps.app.goo.gl/x' });
  assert.equal(loc.lat, 35.1); assert.equal(loc.lng, 33.9); assert.equal(loc.mapUrl, 'https://maps.app.goo.gl/x');
  assert.match(loc.embedUrl, /openstreetmap\.org\/export\/embed\.html\?bbox=.*marker=35\.1%2C33\.9/);
  assert.match(loc.directionsUrl, /destination=35\.1,33\.9/);
  const def = locationFrom({});
  assert.equal(def.lat, 35.2628); assert.equal(def.lng, 33.9084);
  assert.match(def.mapUrl, /google\.com\/maps\?q=35\.2628,33\.9084/);
});

test('LocationFrame renders address/phone/hours/map from settings in all three variants', async () => {
  const settings = { club_address: 'Vista Mare No.5', club_phone: '+90 539 133 37 47', club_hours: '24/7', club_map_lat: '35.2628', club_map_lng: '33.9084' };
  for (const variant of ['card', 'map', 'inline'] as const) {
    const m = await mount(LocationFrame, { settings, language: 'tr', variant });
    const html = m.container.innerHTML;
    if (variant !== 'map') { assert.ok(html.includes('Vista Mare No.5'), `${variant}: address`); assert.ok(html.includes('+90 539 133 37 47'), `${variant}: phone`); }
    if (variant !== 'inline') assert.ok(m.container.querySelector('iframe[src*="openstreetmap.org"]'), `${variant}: map iframe`);
    if (variant === 'card') { assert.ok(html.includes('Bizi bulun'), 'tr title'); assert.ok(html.includes('24/7')); }
    await m.unmount();
  }
});

test('the theme SDK exposes LocationFrame and locationFrom to theme.js', () => {
  const w = getWindow();
  assert.equal(typeof w.BazinoThemeSDK?.LocationFrame, 'function');
  assert.equal(typeof w.BazinoThemeSDK?.locationFrom, 'function');
});

await run({ title: 'Bazino — UI component tests', jsonOut: 'tests/reports/ui.json' });
await teardownDom();
