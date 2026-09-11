// هارنس تست قالب هاب v3 — شبیه‌سازی SDK بدون DOM واقعی (ساختار + رفتار)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'theme-packages', 'bazino-hub-v3');
const JS = fs.readFileSync(path.join(SRC, 'theme.js'), 'utf8');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.error(`  ✗ FAIL: ${name}`); }
}

// ── شبیه‌سازی React سبک ──
function h(type, props, ...kids) { return { type, props: props || {}, kids: kids.flat(9).filter((k) => k != null && k !== false && k !== true) }; }
const regions = {};
const SDK = {
  React: { createElement: h },
  registerComponent(name, def) { regions[name] = def; },
};
globalThis.window = { BazinoThemeSDK: SDK };

// اجرای theme.js (بدون eval در متن خود قالب — اینجا هارنس اجازه دارد)
new Function('window', JS)(globalThis.window);

console.log('── ثبت بخش‌ها ──');
ok(Object.keys(regions).length >= 6, `حداقل ۶ region ثبت شد (${Object.keys(regions).length}: ${Object.keys(regions).join(',')})`);
for (const r of ['header', 'footer', 'mobileNav', 'home', 'hero']) {
  ok(regions[r] && typeof regions[r].render === 'function', `region «${r}» تعریف {render} دارد`);
}
ok(!('hub.games' in regions) && !('hub.club' in regions) && !('hub.blog' in regions), 'هیچ hub.* داخلی ثبت نشده (صفحات = fallback زندهٔ پرتال)');

// props نمونه
const strings = JSON.parse(fs.readFileSync(path.join(SRC, 'theme.json'), 'utf8')).strings;
function ts(key, fb) { return (strings.en && strings.en[key]) || fb || key; }
const calls = [];
const baseProps = {
  language: 'en', dir: 'ltr', ts,
  assetsBase: '/api/themes/bazino-hub-v3/assets',
  pathname: '/games',
  onNavigate: (p) => calls.push(['nav', p]),
  onLogin: () => calls.push(['login']),
  onLogout: () => calls.push(['logout']),
  onLanguage: (l) => calls.push(['lang', l]),
  user: null,
  settings: {},
};

// ── ابزار پیمایش درخت (با resolve کامپوننت‌ها) ──
function resolve(node) {
  if (Array.isArray(node)) return node.map(resolve).flat();
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (node && typeof node === 'object' && typeof node.type === 'function') return resolve(node.type(node.props));
  if (node && typeof node === 'object' && node.type) {
    return [{ ...node, kids: (node.kids || []).map(resolve).flat() }];
  }
  return [];
}
function walk(node, fn) {
  for (const n of resolve(node)) {
    if (typeof n === 'string') { fn({ type: '#text', kids: [], props: {} }); continue; }
    fn(n);
    walk(n.kids || [], fn);
  }
}
function findAll(node, pred) { const out = []; walk(node, (n) => { if (pred(n)) out.push(n); }); return out; }
function textOf(node) {
  let t = '';
  const collect = (nd) => {
    if (Array.isArray(nd)) { nd.forEach(collect); return; }
    if (typeof nd === 'string' || typeof nd === 'number') { t += nd + ' '; return; }
    if (nd && typeof nd === 'object' && typeof nd.type === 'function') { collect(nd.type(nd.props)); return; }
    if (nd && typeof nd === 'object' && nd.kids) nd.kids.forEach(collect);
  };
  collect(node);
  return t;
}

// ── هدر ──
console.log('── هدر ──');
const header = regions.header.render(baseProps);
const navLinks = findAll(header, (n) => n.type === 'button' && /hz-nav-link/.test(n.props.className || ''));
ok(navLinks.length === 8, `۸ آیتم ناوبری (شبکهٔ واقعی پرتال) — ${navLinks.length}`);
const active = navLinks.filter((n) => /is-active/.test(n.props.className || ''));
ok(active.length === 1 && /GAMES/.test(textOf(active[0])), 'لینک فعال = GAMES (pathname=/games)');
const loginBtn = findAll(header, (n) => /hz-login/.test(n.props.className || ''));
ok(loginBtn.length === 1, 'دکمهٔ LOGIN (کاربر مهمان)');
loginBtn[0].props.onClick();
ok(calls.some((c) => c[0] === 'login'), 'کلیک LOGIN → onLogin()');
const langSel = findAll(header, (n) => n.type === 'select');
ok(langSel.length === 1 && langSel[0].props.value === 'en', 'سلکتور زبان با مقدار en');
langSel[0].props.onChange({ target: { value: 'fa' } });
ok(calls.some((c) => c[0] === 'lang' && c[1] === 'fa'), 'تغییر زبان → onLanguage("fa")');
navLinks[0].props.onClick();
ok(calls.some((c) => c[0] === 'nav' && c[1] === '/'), 'کلیک HOME → onNavigate("/")');

// هدر با کاربر لاگین‌کرده
const headerU = regions.header.render({ ...baseProps, pathname: '/club', user: { username: 'payman', credits: 120 } });
const member = findAll(headerU, (n) => /(^|\s)hz-member(\s|$)/.test(n.props.className || ''));
ok(member.length === 1, 'حالت MEMBER برای کاربر لاگین‌کرده');
const logoutBtn = findAll(headerU, (n) => /hz-logout/.test(n.props.className || ''));
ok(logoutBtn.length === 1, 'دکمهٔ LOGOUT');
logoutBtn[0].props.onClick();
ok(calls.some((c) => c[0] === 'logout'), 'کلیک LOGOUT → onLogout()');
const loginGone = findAll(headerU, (n) => /hz-login/.test(n.props.className || ''));
ok(loginGone.length === 0, 'بدون LOGIN در حالت عضو');
const activeClub = findAll(headerU, (n) => /hz-nav-link.*is-active/.test(n.props.className || ''));
ok(activeClub.length === 1 && /CLUB/.test(String(activeClub[0].props.children || textOf(activeClub[0]))), 'لینک فعال = CLUB (pathname=/club)');

// ── هوم ──
console.log('── صفحهٔ اصلی ──');
const home = regions.home.render(baseProps);
const heroCards = findAll(home, (n) => /hz-hero-card/.test(n.props.className || ''));
ok(heroCards.length === 3, 'هروی ۳ کارته (FC / GTA VI / LIVE)');
const gtaBadge = findAll(home, (n) => /hz-hero-badge/.test(n.props.className || ''));
ok(gtaBadge.length === 1 && /SOON/i.test(textOf(gtaBadge[0])), 'بج COMING SOON روی GTA VI');
const live = findAll(home, (n) => /hz-hero-livebadge/.test(n.props.className || ''));
ok(live.length === 1 && /LIVE/.test(textOf(live[0])), 'بج LIVE با دات پالس');
const heroImgs = findAll(home, (n) => n.type === 'img' && /hz-hero-img/.test(n.props.className || ''));
ok(heroImgs.length === 3, '۳ تصویر hero از assetsBase');
ok(heroImgs.every((im) => String(im.props.src).startsWith('/api/themes/bazino-hub-v3/assets/')), 'مسیر تصاویر از assetsBase');
const quick = findAll(home, (n) => /(^|\s)hz-quick(\s|$)/.test(n.props.className || ''));
ok(quick.length === 7, '۷ کارت دسترسی سریع');
const quickTitles = quick.map((q) => textOf(q)).join('|');
ok(/GAMES/.test(quickTitles) && /EVENTS/.test(quickTitles) && /SHOP/.test(quickTitles) && /FOOD/.test(quickTitles) && /CLUB/.test(quickTitles) && /BLOG/.test(quickTitles) && /CONTACT/.test(quickTitles), 'عناوین کارت‌ها = ۷ صفحهٔ واقعی پرتال');
quick[0].props.onClick();
ok(calls.some((c) => c[0] === 'nav' && c[1] === '/games'), 'کلیک کارت GAMES → /games');
const tones = quick.map((q) => (q.props.className.match(/hz-tone-(\w+)/) || [])[1]);
ok(new Set(tones).size === 7, `۷ تن رنگ متفاوت برای کارت‌ها (${tones.join(',')})`);
const contacts = findAll(home, (n) => /(^|\s)hz-contact(\s|$)/.test(n.props.className || ''));
ok(contacts.length === 4, '۴ باکس تماس (hours/whatsapp/location/instagram)');
const wa = contacts.find((c) => c.type === 'a' && /wa\.me/.test(String(c.props.href || '')));
ok(!!wa && /wa\.me\/\d+/.test(String(wa.props.href)), 'لینک WhatsApp از شمارهٔ settings');
const ig = contacts.find((c) => c.type === 'a' && /instagram/i.test(String(c.props.href || '')));
ok(!!ig, 'لینک Instagram');
const hoursTxt = textOf(contacts[0]);
ok(/11:00/.test(hoursTxt) && /23:50/.test(hoursTxt), 'ساعات کاری 11:00–23:50 (پیش‌فرض مرجع)');

// settings واقعی
const homeS = regions.home.render({ ...baseProps, settings: { club_hours: '10:00 - 01:00', club_instagram: 'https://instagram.com/test', club_phone: '+90 555 000 11 22' } });
const contactsS = findAll(homeS, (n) => /(^|\s)hz-contact(\s|$)/.test(n.props.className || ''));
ok(/10:00/.test(textOf(contactsS[0])), 'ساعات از settings.club_hours خوانده می‌شود');
const waS = contactsS.find((c) => c.type === 'a' && /wa\.me/.test(String(c.props.href || '')));
ok(/wa\.me\/905550001122/.test(String(waS.props.href)), 'WhatsApp از club_phone ساخته می‌شود');

// ── فوتر ──
console.log('── فوتر ──');
const footer = regions.footer.render(baseProps);
const footTag = findAll(footer, (n) => /hz-foot-tag/.test(n.props.className || ''));
ok(footTag.length === 1 && /GOOD GAMES/.test(textOf(footTag[0])), 'تگ‌لاین «GOOD GAMES • BETTER PEOPLE»');
const footLinks = findAll(footer, (n) => /hz-foot-link/.test(n.props.className || ''));
ok(footLinks.length === 8, '۸ لینک فوتر = صفحات واقعی');
const social = findAll(footer, (n) => n.type === 'a' && (String(n.props.href || '').includes('wa.me') || String(n.props.href || '').includes('instagram.com')));
ok(social.length >= 2, 'آیکون‌های سوشال (WhatsApp + Instagram)');

// ── موبایل‌ناو ──
console.log('── موبایل‌ناو ──');
const mnav = regions.mobileNav.render(baseProps);
const mitems = findAll(mnav, (n) => /hz-mnav-item/.test(n.props.className || ''));
ok(mitems.length === 5, '۵ آیتم ناوبری موبایل');
const mactive = mitems.filter((n) => /is-active/.test(n.props.className || ''));
ok(mactive.length === 1, 'یک آیتم فعال در موبایل');
mitems[2].props.onClick();
ok(calls.some((c) => c[0] === 'nav' && c[1] === '/events'), 'کلیک EVENTS موبایل → /events');

// ── hero region (کلاسیک) ──
const hero = regions.hero.render(baseProps);
ok(findAll(hero, (n) => /hz-hero-card/.test(n.props.className || '')).length === 3, 'region «hero» مستقل هم ۳ کارته');

// ── گارد متن ──
console.log('── گارد نصب (شبیه‌سازی) ──');
const noComments = JS.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\\w])\/\/[^\n\r]*/g, '$1');
ok(!/\b(?:useState|useEffect|useRef|useMemo|useCallback|useReducer|useContext|useLayoutEffect)\s*\(/.test(noComments), 'بدون هیچ هوک React');
ok(!/\b(setInterval|setTimeout)\s*\(/.test(noComments), 'بدون تایمر');
ok(/BazinoThemeSDK/.test(JS), 'ارجاع به BazinoThemeSDK');
ok(!/from ['"]react['"]|require\(['"]react/.test(JS), 'بدون import/require React');

console.log(`\n═══ نتیجه: ${pass} ✓ / ${fail} ✗ ═══`);
process.exit(fail ? 1 : 0);
