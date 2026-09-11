// هارنس تست قالب هاب v3.1 — شبیه‌سازی SDK بدون DOM واقعی (ساختار + رفتار)
// پوشش: ناوبری پرتال، حالت‌های کاربر، هروی داینامیک (اسلایدر سرور + تورنمنت +
// مسابقه زنده)، override تصاویر ادمین (theme_img.*)، نوار مقالات سرور، فوتر، گارد نصب.
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
  slides: [],
  eventsFeed: null,
  articles: [],
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
// لوگو: پیش‌فرض متنی؛ override ادمین → تصویری
ok(findAll(header, (n) => /hz-logo-main/.test(n.props.className || '')).length === 1, 'لوگوی متنی پیش‌فرض (BAZINO + GAMING CLUB)');
const headerLogo = regions.header.render({ ...baseProps, settings: { ...baseProps.settings, logo_url: '/uploads/theme/logo.webp' } });
ok(findAll(headerLogo, (n) => /hz-logo-img/.test(n.props.className || '')).length === 1, 'لوگوی تصویری ادمین (settings.logo_url)');
ok(findAll(headerLogo, (n) => /hz-logo-main/.test(n.props.className || '')).length === 0, 'با لوگوی تصویری، متن جایگزین حذف می‌شود');
// کاربر لاگین‌کرده
const headerU = regions.header.render({ ...baseProps, pathname: '/club', user: { username: 'payman', credits: 120 } });
const member = findAll(headerU, (n) => /(^|\s)hz-member(\s|$)/.test(n.props.className || ''));
ok(member.length === 1, 'حالت MEMBER برای کاربر لاگین‌کرده');
const logoutBtn = findAll(headerU, (n) => /hz-logout/.test(n.props.className || ''));
ok(logoutBtn.length === 1, 'دکمهٔ LOGOUT');
logoutBtn[0].props.onClick();
ok(calls.some((c) => c[0] === 'logout'), 'کلیک LOGOUT → onLogout()');
const activeClub = findAll(headerU, (n) => /hz-nav-link.*is-active/.test(n.props.className || ''));
ok(activeClub.length === 1 && /CLUB/.test(textOf(activeClub[0])), 'لینک فعال = CLUB (pathname=/club)');

// ── هوم: حالت بدون دادهٔ سرور (fallback ایستا) ──
console.log('── هوم (بدون دادهٔ سرور) ──');
const home = regions.home.render(baseProps);
const heroCards = findAll(home, (n) => /hz-hero-card/.test(n.props.className || ''));
ok(heroCards.length === 3, 'هروی ۳ کارته (تورنمنت / پرومو / زنده)');
const heroImgs = findAll(home, (n) => n.type === 'img' && /hz-hero-img/.test(n.props.className || ''));
ok(heroImgs.length === 3, '۳ تصویر hero');
ok(heroImgs.every((im) => String(im.props.src).startsWith('/api/themes/bazino-hub-v3/assets/')), 'تصاویر fallback از assetsBase قالب');
const gtaBadge = findAll(home, (n) => /hz-hero-badge/.test(n.props.className || ''));
ok(gtaBadge.length === 1 && /SOON/i.test(textOf(gtaBadge[0])), 'بج COMING SOON روی کارت مرکزی (بدون اسلاید سرور)');
ok(findAll(home, (n) => /hz-article/.test(n.props.className || '')).length === 0, 'بدون مقاله → نوار مقالات رندر نمی‌شود');
const quick = findAll(home, (n) => /(^|\s)hz-quick(\s|$)/.test(n.props.className || ''));
ok(quick.length === 7, '۷ کارت دسترسی سریع');
const tones = quick.map((q) => (q.props.className.match(/hz-tone-(\w+)/) || [])[1]);
ok(new Set(tones).size === 7, `۷ تن رنگ متفاوت (${tones.join(',')})`);
quick[0].props.onClick();
ok(calls.some((c) => c[0] === 'nav' && c[1] === '/games'), 'کلیک کارت GAMES → /games');

// ── هوم: دادهٔ داینامیک سرور ──
console.log('── هروی داینامیک (سرور) ──');
const serverProps = {
  ...baseProps,
  slides: [
    { id: 's1', imageUrl: '/images/home/esports-960.webp', target: 'shop', title: { fa: 'تخفیف ویژه', en: 'MEGA SALE', ru: '', tr: '' }, desc: { fa: '', en: 'Up to 50% off gaming gear', ru: '', tr: '' } },
    { id: 's2', imageUrl: '/images/home/pizza-960.webp', target: 'cafe', title: { fa: '', en: 'PIZZA TIME', ru: '', tr: '' }, desc: { fa: '', en: '', ru: '', tr: '' } },
  ],
  eventsFeed: {
    weekly: [
      { id: 'tw1', title: 'FC26 WEEKLY TOURNAMENT', game: 'FC26', startDate: '1405/07/20', liveState: 'upcoming' },
      { id: 'tw2', title: 'OLD CUP', game: 'CS2', startDate: '1405/06/01', liveState: 'past' },
    ],
    special: [
      { id: 'ts1', title: 'FC26 CHAMPIONS CUP', game: 'FC26', startDate: '1405/08/01', liveState: 'upcoming' },
    ],
    season: null,
    live: { id: 'tw1', title: 'REAL MADRID VS BARCELONA', game: 'FC26 SHOWMATCH', version: 1, bracketTotal: 6 },
  },
  articles: [
    { id: 'a1', title: 'گزارش مسابقات', titleEn: 'Weekend Tournament Report', imageUrl: '/images/home/esports-800.webp', category: 'Tournaments', date: '1405/04/28' },
    { id: 'a2', title: 'راهنما', titleEn: 'Pro Rig Guide', imageUrl: '/images/home/hardware-pc-800.webp', category: 'Hardware', date: '1405/04/05' },
    { id: 'a3', title: 'منو', titleEn: 'New Cafe Menu', imageUrl: '/images/home/pizza-800.webp', category: 'Cafe', date: '1405/03/15' },
  ],
};
const homeDyn = regions.home.render(serverProps);
const dynImgs = findAll(homeDyn, (n) => n.type === 'img' && /hz-hero-img/.test(n.props.className || ''));
ok(dynImgs.length === 3, 'هروی داینامیک هم ۳ کارت دارد');
// کارت مرکزی = اسلاید سرور
ok(dynImgs.some((im) => im.props.src === '/images/home/esports-960.webp'), 'کارت مرکزی: تصویر اسلایدر سرور (slides[0].imageUrl)');
const dynText = textOf(homeDyn);
ok(/MEGA SALE/.test(dynText), 'عنوان کارت مرکزی از اسلایدر سرور (title.en)');
ok(/Up to 50% off gaming gear/.test(dynText), 'توضیح کارت مرکزی از اسلایدر سرور (desc.en)');
ok(!/GTA VI/.test(dynText), 'با اسلاید سرور، متن پیش‌فرض GTA حذف می‌شود');
// کارت چپ = تورنمنت upcoming از سرور
ok(/FC26 WEEKLY TOURNAMENT/.test(dynText), 'کارت تورنمنت: عنوان از eventsFeed (اولین upcoming)');
ok(/FC26\s*·\s*1405\/07\/20|1405\/07\/20/.test(dynText.replace(/\s+/g, ' ')), 'متای کارت تورنمنت: بازی + تاریخ از سرور');
ok(!/OLD CUP/.test(dynText), 'تورنمنت past انتخاب نمی‌شود (upcoming اولویت دارد)');
// کارت راست = مسابقه زنده سرور
ok(/REAL MADRID VS BARCELONA/.test(dynText), 'کارت زنده: عنوان از eventsFeed.live');
ok(/FC26 SHOWMATCH/.test(dynText), 'کارت زنده: زیرعنوان از live.game');
const liveBadge = findAll(homeDyn, (n) => /hz-hero-livebadge/.test(n.props.className || ''));
ok(liveBadge.length === 1, 'بج LIVE برای bracket فعال (bracketTotal>0)');
// کلیک کارت مرکزی → هدف اسلاید (shop)
const dynHeroCards = findAll(homeDyn, (n) => /hz-hero-card/.test(n.props.className || ''));
dynHeroCards[1].props.onClick();
ok(calls.some((c) => c[0] === 'nav' && c[1] === '/shop'), 'کلیک کارت مرکزی → مسیر هدف اسلاید (target=shop → /shop)');
// نوار مقالات = تصاویر سرور
const articleCards = findAll(homeDyn, (n) => /(^|\s)hz-article(\s|$)/.test(n.props.className || ''));
ok(articleCards.length === 3, `نوار مقالات: ${articleCards.length} کارت از articles سرور`);
const artImgs = articleCards.map((a) => findAll(a, (n) => n.type === 'img' && /(^|\s)hz-article-img(\s|$)/.test(n.props.className || ''))).flat();
ok(artImgs.length === 3 && artImgs.every((im) => String(im.props.src).startsWith('/images/')), 'تصاویر مقالات از سرور (imageUrl)');
ok(/Weekend Tournament Report/.test(textOf(articleCards[0])), 'عنوان مقاله به زبان UI (titleEn)');
articleCards[0].props.onClick();
ok(calls.some((c) => c[0] === 'nav' && c[1] === '/blog'), 'کلیک مقاله → /blog');

// ── override تصاویر ادمین (theme_img.*) ──
console.log('── override تصاویر ادمین ──');
const homeOvr = regions.home.render({ ...serverProps, slides: [], settings: { theme_img: '' , 'theme_img.hero_tournament': '/uploads/theme/hero_tournament.webp?v=abc', 'theme_img.hero_main': '/uploads/theme/hero_main.webp?v=xyz' } });
const ovrImgs = findAll(homeOvr, (n) => n.type === 'img' && /hz-hero-img/.test(n.props.className || ''));
const ovrSrcs = ovrImgs.map((i) => String(i.props.src));
ok(ovrSrcs.includes('/uploads/theme/hero_tournament.webp?v=abc'), 'کارت تورنمنت: تصویر جایگزین ادمین (theme_img.hero_tournament)');
ok(ovrSrcs.includes('/uploads/theme/hero_main.webp?v=xyz'), 'کارت مرکزی: تصویر جایگزین ادمین (theme_img.hero_main)');
ok(ovrSrcs.some((s) => s.startsWith('/api/themes/bazino-hub-v3/assets/')), 'کارت زنده بدون override → asset پیش‌فرض قالب');
// live بدون bracket → تگ COMING UP به جای LIVE
const homeSoon = regions.home.render({ ...serverProps, slides: [], eventsFeed: { weekly: [], special: [], live: { id: 'x', title: 'NEXT SHOWMATCH', game: 'FC26', bracketTotal: 0 } } });
ok(/COMING UP/.test(textOf(homeSoon)), 'live بدون bracket → بج COMING UP (طلایی)');
ok(!findAll(homeSoon, (n) => /hz-hero-livebadge/.test(n.props.className || '')).length, 'live بدون bracket → بدون بج قرمز LIVE');

// ── تماس ──
console.log('── تماس ──');
const contacts = findAll(home, (n) => /(^|\s)hz-contact(\s|$)/.test(n.props.className || ''));
ok(contacts.length === 4, '۴ باکس تماس (hours/whatsapp/location/instagram)');
const wa = contacts.find((c) => c.type === 'a' && /wa\.me/.test(String(c.props.href || '')));
ok(!!wa && /wa\.me\/\d+/.test(String(wa.props.href)), 'لینک WhatsApp از شمارهٔ settings');
ok(/11:00/.test(textOf(contacts[0])) && /23:50/.test(textOf(contacts[0])), 'ساعات کاری 11:00–23:50 (پیش‌فرض مرجع)');
const homeS = regions.home.render({ ...baseProps, settings: { club_hours: '10:00 - 01:00', club_phone: '+90 555 000 11 22' } });
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

// ── hero مستقل ──
const hero = regions.hero.render(baseProps);
ok(findAll(hero, (n) => /hz-hero-card/.test(n.props.className || '')).length === 3, 'region «hero» مستقل هم ۳ کارته');

// ── گارد نصب (شبیه‌سازی) ──
console.log('── گارد نصب (شبیه‌سازی) ──');
const noComments = JS.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\\w])\/\/[^\n\r]*/g, '$1');
ok(!/\b(?:useState|useEffect|useRef|useMemo|useCallback|useReducer|useContext|useLayoutEffect)\s*\(/.test(noComments), 'بدون هیچ هوک React');
ok(!/\b(setInterval|setTimeout)\s*\(/.test(noComments), 'بدون تایمر');
ok(/BazinoThemeSDK/.test(JS), 'ارجاع به BazinoThemeSDK');
ok(!/from ['"]react['"]|require\(['"]react/.test(JS), 'بدون import/require React');
ok(!/https?:\/\/[a-z]/i.test(JS.replace(/wa\.me|instagram\.com|maps\.app/g, '')), 'بدون CDN/لینک خارجی در کد (به‌جز سوشال)');

console.log(`\n═══ نتیجه: ${pass} ✓ / ${fail} ✗ ═══`);
process.exit(fail ? 1 : 0);
