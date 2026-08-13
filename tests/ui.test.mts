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
  setupDom, teardownDom, loadModule, mount, act, getDocument,
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
   31. AuthModal — فرم ورود/ثبت‌نام
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

test('renders username and password fields when open', async () => {
  const el = await mountAuthModal({
    isOpen: true, onClose: () => {}, onAuthSuccess: () => {}, addNotification: () => {},
  });
  assert.ok(el.findAll('input').length >= 2, 'login form should have at least 2 inputs');
  assert.ok(el.find('input[type="password"]'), 'no password field');
  await el.unmount();
});

test('a successful login stores the JWT and reports the user', async () => {
  const calls = stubFetch((url) => {
    if (url.includes('/api/auth/login')) {
      return { status: 200, body: { success: true, token: 'jwt-from-test', user: { username: 'tester', role: 'admin' } } };
    }
    return { status: 200, body: {} };
  });
  try {
    let authed: any = null;
    const el = await mountAuthModal({
      isOpen: true, onClose: () => {}, onAuthSuccess: (u: any) => { authed = u; }, addNotification: () => {},
    });

    const inputs = el.findAll('input');
    const pwd = el.find('input[type="password"]');
    const user = inputs.find((i: any) => i !== pwd);

    await act(async () => {
      user.value = 'tester';
      user.dispatchEvent(new (getDocument().defaultView.Event)('input', { bubbles: true }));
      pwd.value = 'secret';
      pwd.dispatchEvent(new (getDocument().defaultView.Event)('input', { bubbles: true }));
    });

    const form = el.find('form');
    assert.ok(form, 'no form element to submit');
    await act(async () => {
      form.dispatchEvent(new (getDocument().defaultView.Event)('submit', { bubbles: true, cancelable: true }));
    });
    await act(async () => { await new Promise(r => setTimeout(r, 30)); });

    assert.ok(calls.some(c => c.url.includes('/api/auth/login')), 'login endpoint was never called');
    assert.ok(authed, 'onAuthSuccess was not called');
    assert.equal(authed.username, 'tester');

    const { getAuthToken } = await loadModule('/src/services/authToken.ts');
    assert.equal(getAuthToken(), 'jwt-from-test',
      'the JWT was not persisted — the admin panel would be locked out');
    await el.unmount();
  } finally { restoreFetch(); }
});

test('a failed login surfaces the server error and stores no token', async () => {
  const { clearAuthToken, getAuthToken } = await loadModule('/src/services/authToken.ts');
  clearAuthToken();
  stubFetch(() => ({ status: 400, body: { error: 'نام کاربری یا کلمه عبور اشتباه است.' } }));
  try {
    let notified = '';
    const el = await mountAuthModal({
      isOpen: true, onClose: () => {}, onAuthSuccess: () => {},
      addNotification: (m: string) => { notified = m; },
    });
    const form = el.find('form');
    await act(async () => {
      form.dispatchEvent(new (getDocument().defaultView.Event)('submit', { bubbles: true, cancelable: true }));
    });
    await act(async () => { await new Promise(r => setTimeout(r, 30)); });

    assert.ok(el.text().includes('اشتباه') || notified.includes('اشتباه'),
      `the error was not shown to the user (notified: "${notified}")`);
    assert.equal(getAuthToken(), null, 'a token was stored despite a failed login');
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

await run({ title: 'Bazino — UI component tests', jsonOut: 'tests/reports/ui.json' });
await teardownDom();
