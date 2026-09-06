/**
 * Unit suites — pure logic, no server, no network.
 *
 * Covers: sample data integrity, local image/WebP policy, responsive srcset
 * coverage, theme CSS/ZIP utilities, colour helpers, i18n dictionary, and the
 * database provider SQL shape (placeholder/param arity + migration list).
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { suite, test, assert, run } from './harness.mts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');
const IMAGES_DIRS = [path.join(ROOT, 'public/images/home'), path.join(ROOT, 'public/images/mobile')];
const onDisk = new Set(IMAGES_DIRS.flatMap(d => existsSync(d) ? readdirSync(d, { withFileTypes: true }).filter(e => e.isFile()).map(e => e.name) : []));

const {
  SAMPLE_SYSTEMS, SAMPLE_CAFE_ITEMS, SAMPLE_ACCESSORIES, SAMPLE_TOURNAMENTS,
  SAMPLE_ARTICLES, SAMPLE_SLIDERS, SAMPLE_COUPONS, SAMPLE_TRANSACTIONS,
  SAMPLE_CHAT_ROOMS, SAMPLE_RESERVATION_LOGS, SAMPLE_SETTINGS, SAMPLE_COUNTS,
} = await import('../server/sampleData.ts');

const { getResponsiveSrcSet } = await import('../src/components/PerformanceGuards.tsx');
const { sanitizeThemeId, stripCssComments, extractIdFromCss, hasNewFormat, extractColorsFromCss } =
  await import('../src/themes/themeCssUtils.ts');
const { parseThemeZip, buildSampleThemeZip, buildThemeZip, rewriteCssAssetUrls, isZipParseError, normalizeThemeStrings } =
  await import('../src/themes/themeZipCore.ts');
const { detectRegisteredRegions, KNOWN_REGIONS } = await import('../server/themeStore.ts');
const { makeThemeStrings, THEME_REGIONS } = await import('../src/themeSdk/sdk.ts');
const { translations } = await import('../src/utils/translations.ts');
const routes = await import('../src/utils/routes.ts');

// src/themes/index.ts is browser-coupled (import.meta.glob, `?inline` CSS and an
// image asset import), so plain Node cannot load it. Vite's SSR loader resolves
// those exactly like the app does — same approach as scripts/verify-themes.ts.
const { createServer } = await import('vite');
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'spa',
  logLevel: 'error',
  cacheDir: 'node_modules/.vite-tests',
  optimizeDeps: { noDiscovery: true },
});
const { shadeHex, hexToRgba, BUILT_IN_THEMES } = await vite.ssrLoadModule('/src/themes/index.ts');

/* ═══════════════════════════════════════════════════════════════════════
   1. Sample data integrity
   ═══════════════════════════════════════════════════════════════════════ */
suite('1. Sample data — integrity');

const collections: Array<[string, any[]]> = [
  ['systems', SAMPLE_SYSTEMS], ['cafe items', SAMPLE_CAFE_ITEMS],
  ['accessories', SAMPLE_ACCESSORIES], ['tournaments', SAMPLE_TOURNAMENTS],
  ['articles', SAMPLE_ARTICLES], ['sliders', SAMPLE_SLIDERS],
  ['coupons', SAMPLE_COUPONS], ['transactions', SAMPLE_TRANSACTIONS],
  ['chat rooms', SAMPLE_CHAT_ROOMS], ['reservations', SAMPLE_RESERVATION_LOGS],
  ['settings', SAMPLE_SETTINGS],
];

test('every sample collection is a non-empty array', () => {
  for (const [name, rows] of collections) {
    assert.ok(Array.isArray(rows), `${name} should be an array`);
    assert.ok(rows.length > 0, `${name} should not be empty`);
  }
});

test('SAMPLE_COUNTS matches the real collection lengths', () => {
  assert.equal(SAMPLE_COUNTS.coupons, SAMPLE_COUPONS.length);
  assert.equal(SAMPLE_COUNTS.transactions, SAMPLE_TRANSACTIONS.length);
  assert.equal(SAMPLE_COUNTS.chatRooms, SAMPLE_CHAT_ROOMS.length);
  assert.equal(SAMPLE_COUNTS.reservations, SAMPLE_RESERVATION_LOGS.length);
  assert.equal(SAMPLE_COUNTS.settings, SAMPLE_SETTINGS.length);
});

test('ids are unique inside every id-bearing collection', () => {
  for (const [name, rows] of collections) {
    const ids = rows.map((r: any) => r.id).filter(Boolean);
    if (!ids.length) continue;
    assert.equal(new Set(ids).size, ids.length, `${name} has duplicate ids`);
  }
});

test('coupon codes are unique and internally consistent', () => {
  const codes = SAMPLE_COUPONS.map((c: any) => c.code);
  assert.equal(new Set(codes).size, codes.length, 'duplicate coupon codes');
  for (const c of SAMPLE_COUPONS) {
    assert.ok(['Percent', 'Fixed'].includes(c.type), `${c.code}: bad type ${c.type}`);
    assert.ok(c.value > 0, `${c.code}: value must be > 0`);
    assert.ok(c.minOrder >= 0, `${c.code}: minOrder must be >= 0`);
    assert.ok(c.usageCount <= c.maxUsageCount, `${c.code}: usageCount exceeds maxUsageCount`);
    if (c.type === 'Percent') assert.ok(c.value <= 100, `${c.code}: percent > 100`);
  }
});

test('prices and rates are positive numbers', () => {
  for (const s of SAMPLE_SYSTEMS) assert.ok(s.hourlyRate > 0, `${s.id}: hourlyRate`);
  for (const c of SAMPLE_CAFE_ITEMS) assert.ok(c.price > 0, `${c.id}: price`);
  for (const a of SAMPLE_ACCESSORIES) assert.ok(a.price > 0, `${a.id}: price`);
});

test('inventory / stock are non-negative integers', () => {
  for (const c of SAMPLE_CAFE_ITEMS) {
    assert.ok(Number.isInteger(c.inventory) && c.inventory >= 0, `${c.id}: inventory`);
  }
  for (const a of SAMPLE_ACCESSORIES) {
    assert.ok(Number.isInteger(a.stock) && a.stock >= 0, `${a.id}: stock`);
  }
});

test('tournaments have consistent team counts and valid JSON blobs', () => {
  for (const t of SAMPLE_TOURNAMENTS) {
    assert.ok(t.registeredTeamsCount <= t.maxTeams, `${t.id}: registered > max`);
    assert.doesNotThrow(() => JSON.parse(t.teams), `${t.id}: teams is not valid JSON`);
    assert.doesNotThrow(() => JSON.parse(t.bracket), `${t.id}: bracket is not valid JSON`);
  }
});

test('articles carry valid JSON comments', () => {
  for (const a of SAMPLE_ARTICLES) {
    assert.doesNotThrow(() => JSON.parse(a.comments), `${a.id}: comments is not valid JSON`);
    assert.ok(Array.isArray(JSON.parse(a.comments)), `${a.id}: comments should be an array`);
  }
});

test('multilingual fields (fa/en/ru/tr) are present on user-facing rows', () => {
  for (const t of SAMPLE_TOURNAMENTS) {
    for (const k of ['titleFa', 'titleEn', 'titleRu', 'titleTr']) {
      assert.ok(t[k] && String(t[k]).trim(), `${t.id}: missing ${k}`);
    }
  }
  for (const a of SAMPLE_ARTICLES) {
    for (const k of ['titleFa', 'titleEn', 'titleRu', 'titleTr', 'contentFa', 'contentEn']) {
      assert.ok(a[k] && String(a[k]).trim(), `${a.id}: missing ${k}`);
    }
  }
  for (const s of SAMPLE_SLIDERS) {
    for (const k of ['titleFa', 'titleEn', 'titleRu', 'titleTr']) {
      assert.ok(s[k] && String(s[k]).trim(), `${s.id}: missing ${k}`);
    }
  }
});

test('sliders point at a known app target', () => {
  const allowed = new Set(['reserve', 'cafe', 'shop', 'tournaments', 'blog', 'loyalty', 'chat']);
  for (const s of SAMPLE_SLIDERS) {
    assert.ok(allowed.has(s.target), `${s.id}: unexpected target "${s.target}"`);
  }
});

/* ═══════════════════════════════════════════════════════════════════════
   2. Image policy — local WebP only, mobile variants, files exist
   ═══════════════════════════════════════════════════════════════════════ */
suite('2. Images — local WebP policy');

/** Every imageUrl/mobileImageUrl referenced by sample data. */
const sampleImageRefs: Array<{ owner: string; field: string; url: string }> = [];
for (const [name, rows] of collections) {
  for (const row of rows as any[]) {
    for (const field of ['imageUrl', 'mobileImageUrl']) {
      if (typeof row?.[field] === 'string' && row[field]) {
        sampleImageRefs.push({ owner: `${name}:${row.id ?? row.code ?? '?'}`, field, url: row[field] });
      }
    }
  }
}

test('sample data references at least one image', () => {
  assert.ok(sampleImageRefs.length > 0, 'no image references found — the scan is broken');
});

test('no sample image points at images.unsplash.com', () => {
  const bad = sampleImageRefs.filter(r => r.url.includes('unsplash'));
  assert.deepEqual(bad, [], `unsplash refs: ${JSON.stringify(bad)}`);
});

test('no sample image points at any remote host', () => {
  const remote = sampleImageRefs.filter(r => /^(https?:)?\/\//i.test(r.url));
  assert.deepEqual(remote, [], `remote refs: ${JSON.stringify(remote)}`);
});

test('every sample image is a .webp under /images/', () => {
  for (const r of sampleImageRefs) {
    assert.ok(r.url.startsWith('/images/'), `${r.owner}.${r.field} is not under /images/: ${r.url}`);
    assert.ok(r.url.endsWith('.webp'), `${r.owner}.${r.field} is not .webp: ${r.url}`);
  }
});

test('every referenced image file exists on disk', () => {
  const missing = sampleImageRefs
    .filter(r => !onDisk.has(path.basename(r.url)))
    .map(r => `${r.owner}.${r.field} → ${r.url}`);
  assert.deepEqual(missing, [], `missing files:\n${missing.join('\n')}`);
});

test('every content row exposes a mobileImageUrl', () => {
  const rowsNeedingMobile: Array<[string, any[]]> = [
    ['cafe', SAMPLE_CAFE_ITEMS], ['accessories', SAMPLE_ACCESSORIES],
    ['articles', SAMPLE_ARTICLES], ['sliders', SAMPLE_SLIDERS],
  ];
  const missing: string[] = [];
  for (const [name, rows] of rowsNeedingMobile) {
    for (const row of rows as any[]) {
      if (!row.mobileImageUrl) missing.push(`${name}:${row.id}`);
    }
  }
  assert.deepEqual(missing, [], `rows without mobileImageUrl: ${missing.join(', ')}`);
});

test('mobile variant is never larger than its desktop counterpart', () => {
  const widthOf = (u: string) => Number(u.match(/-(\d+)\.webp$/)?.[1] ?? NaN);
  const offenders: string[] = [];
  for (const [name, rows] of collections) {
    for (const row of rows as any[]) {
      if (!row?.imageUrl || !row?.mobileImageUrl) continue;
      const d = widthOf(row.imageUrl);
      const m = widthOf(row.mobileImageUrl);
      if (Number.isFinite(d) && Number.isFinite(m) && m > d) {
        offenders.push(`${name}:${row.id} mobile ${m}w > desktop ${d}w`);
      }
    }
  }
  assert.deepEqual(offenders, [], offenders.join('; '));
});

test('all shipped home images are WebP (no jpg/png leftovers)', () => {
  const nonWebp = [...onDisk].filter(f => !f.endsWith('.webp'));
  assert.deepEqual(nonWebp, [], `non-WebP files in public/images/home: ${nonWebp.join(', ')}`);
});

test('hardware-pc (the generated blog image) exists at 16:9 in both sizes', () => {
  assert.ok(onDisk.has('hardware-pc-400.webp'), 'hardware-pc-400.webp missing');
  assert.ok(onDisk.has('hardware-pc-800.webp'), 'hardware-pc-800.webp missing');
  const art2 = SAMPLE_ARTICLES.find((a: any) => a.id === 'art-2');
  assert.ok(art2, 'art-2 not found');
  assert.equal(art2.imageUrl, '/images/home/hardware-pc-800.webp');
  assert.equal(art2.mobileImageUrl, '/images/home/hardware-pc-400.webp');
});

/* ═══════════════════════════════════════════════════════════════════════
   3. getResponsiveSrcSet + full srcset coverage
   ═══════════════════════════════════════════════════════════════════════ */
suite('3. Responsive images — getResponsiveSrcSet');

test('builds a {stem}-{w}.webp srcset for local images', () => {
  const out = getResponsiveSrcSet('/images/home/esports-480.webp', [320, 640]);
  assert.equal(out, '/images/home/esports-320.webp 320w, /images/home/esports-640.webp 640w');
});

test('derives the stem from a file without a width suffix', () => {
  const out = getResponsiveSrcSet('/images/home/logo.webp', [200]);
  assert.equal(out, '/images/home/logo-200.webp 200w');
});

test('returns undefined for empty width lists and non-strings', () => {
  assert.equal(getResponsiveSrcSet('/images/home/esports-480.webp', []), undefined);
  assert.equal(getResponsiveSrcSet(undefined as any, [320]), undefined);
  assert.equal(getResponsiveSrcSet(123 as any, [320]), undefined);
});

test('returns undefined for arbitrary third-party hosts', () => {
  assert.equal(getResponsiveSrcSet('https://cdn.example.com/a.jpg', [320]), undefined);
});

test('still transforms unsplash URLs (admin-entered fallback path)', () => {
  const out = getResponsiveSrcSet('https://images.unsplash.com/photo-1?ixid=abc', [400]);
  assert.ok(out?.includes('w=400'), `expected w=400 in "${out}"`);
  assert.ok(out?.includes('q=70'), `expected q=70 in "${out}"`);
  assert.ok(out?.endsWith(' 400w'), `expected descriptor in "${out}"`);
});

test('every width any call site can request resolves to a real file', () => {
  // Mirrors the real call sites: which images can reach which widths list.
  const callSites: Array<{ where: string; stems: string[]; widths: number[] }> = [
    { where: 'HomeTab hero (static featuredGames)', stems: ['esports', 'rpg-openworld', 'sports-console'], widths: [480, 800, 960] },
    { where: 'HomeTab hero (slider-derived)', stems: ['esports', 'cafe', 'gear-shop', 'rpg-openworld'], widths: [480, 800, 960] },
    { where: 'DarkGold hero (static)', stems: ['esports', 'rpg-openworld', 'sports-console'], widths: [640, 960, 1200, 1600] },
    { where: 'DarkGold hero (slider-derived)', stems: ['esports', 'cafe', 'gear-shop', 'rpg-openworld'], widths: [640, 960, 1200, 1600] },
    { where: 'HomeTab genres', stems: ['esports', 'rpg-openworld', 'moba-strategy', 'sports-console'], widths: [320, 480, 640] },
    { where: 'HomeTab sections', stems: ['pc-arena', 'sports-console', 'cafe', 'gear-shop'], widths: [320, 480, 640] },
    { where: 'ConsoleGrid cafe cards', stems: ['cafe'], widths: [200, 400] },
    { where: 'ConsoleGrid accessory cards', stems: ['gear-shop', 'sports-console'], widths: [200, 400] },
  ];
  const missing: string[] = [];
  for (const cs of callSites) {
    for (const stem of cs.stems) {
      for (const w of cs.widths) {
        const file = `${stem}-${w}.webp`;
        if (!onDisk.has(file)) missing.push(`${cs.where}: ${file}`);
      }
    }
  }
  assert.deepEqual(missing, [], `srcset would 404 on:\n${missing.join('\n')}`);
});

/* ═══════════════════════════════════════════════════════════════════════
   4. Theme utilities
   ═══════════════════════════════════════════════════════════════════════ */
suite('4. Theme engine — CSS utilities');

test('sanitizeThemeId slugifies and strips unsafe characters', () => {
  assert.equal(sanitizeThemeId('  My Cool Theme!! '), 'my-cool-theme');
  assert.equal(sanitizeThemeId('a///b'), 'a-b');
  assert.equal(sanitizeThemeId('--x--'), 'x');
  assert.equal(sanitizeThemeId('Neon_Storm-2'), 'neon_storm-2');
});

test('sanitizeThemeId never returns an empty id', () => {
  const generated = sanitizeThemeId('***');
  assert.ok(generated.startsWith('custom-theme-'), `got "${generated}"`);
});

test('sanitizeThemeId output cannot escape a directory (path-traversal guard)', () => {
  for (const evil of ['../../etc/passwd', '..\\..\\win', './../x']) {
    const id = sanitizeThemeId(evil);
    assert.ok(!id.includes('/'), `slash survived: ${id}`);
    assert.ok(!id.includes('\\'), `backslash survived: ${id}`);
    assert.ok(!id.includes('..'), `dot-dot survived: ${id}`);
  }
});

test('stripCssComments removes block comments only', () => {
  assert.equal(stripCssComments('a{} /* gone */ b{}').replace(/\s+/g, ' ').trim(), 'a{} b{}');
});

test('extractIdFromCss reads both the attribute and class formats', () => {
  assert.equal(extractIdFromCss('body[data-theme="Neon Storm"] { color: red }'), 'neon-storm');
  assert.equal(extractIdFromCss('.theme-dark-gold .x { color: red }'), 'dark-gold');
  assert.equal(extractIdFromCss('/* body[data-theme="x"] */ .plain {}'), null);
});

test('hasNewFormat detects themed selectors', () => {
  assert.equal(hasNewFormat('body[data-theme="a"]{}'), true);
  assert.equal(hasNewFormat('.theme-b .card {}'), true);
  assert.equal(hasNewFormat('.card { color: red }'), false);
});

test('extractColorsFromCss falls back when variables are absent', () => {
  const fallback = { primary: '#ffb800', bg: '#050608', card: '#0D0E15' };
  assert.deepEqual(extractColorsFromCss('.x{}', fallback), fallback);
});

suite('5. Theme engine — colours');

test('shadeHex lightens and darkens, clamping at the ends', () => {
  assert.equal(shadeHex('#000000', 100), '#ffffff');
  assert.equal(shadeHex('#ffffff', -100), '#000000');
  assert.equal(shadeHex('#808080', 0), '#808080');
});

test('shadeHex expands 3-digit hex and rejects garbage', () => {
  assert.equal(shadeHex('#fff', 0), '#ffffff');
  assert.equal(shadeHex('not-a-colour', 10), 'not-a-colour');
});

test('hexToRgba converts, expands shorthand and falls back safely', () => {
  assert.equal(hexToRgba('#ff0000', 0.5), 'rgba(255,0,0,0.5)');
  assert.equal(hexToRgba('#0f0', 1), 'rgba(0,255,0,1)');
  // NOTE: 'bad' is *valid* 3-digit hex (→ #bbaadd), so the fallback case needs a
  // string containing a non-hex letter.
  assert.equal(hexToRgba('#bad', 1), 'rgba(187,170,221,1)');
  assert.equal(hexToRgba('nope', 0.3), 'rgba(255,184,0,0.3)');
  assert.equal(hexToRgba('', 0.25), 'rgba(255,184,0,0.25)');
});

test('built-in themes have unique ids and required fields', () => {
  const ids = BUILT_IN_THEMES.map((t: any) => t.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate built-in theme ids');
  for (const t of BUILT_IN_THEMES) {
    assert.ok(t.id && t.name, `theme missing id/name: ${JSON.stringify(t)}`);
  }
});

suite('6. Theme engine — ZIP round-trip');

test('the generated sample theme ZIP parses back correctly', () => {
  const parsed = parseThemeZip(buildSampleThemeZip(), 'sample.zip');
  assert.ok(!isZipParseError(parsed), `parse failed: ${JSON.stringify(parsed)}`);
  const theme = parsed as any;
  assert.ok(theme.meta?.id, 'missing meta.id');
  assert.ok(theme.css.length > 0, 'missing css');
  assert.ok(Object.keys(theme.assets).length > 0, 'missing assets');
});

test('sample theme is region-based (SDK v2): hero + footer, 4-language strings, tokens', () => {
  const theme = parseThemeZip(buildSampleThemeZip(), 'sample.zip') as any;
  assert.deepEqual(detectRegisteredRegions(theme.componentJs).sort(), ['footer', 'hero']);
  assert.deepEqual(Object.keys(theme.meta.strings).sort(), ['en', 'fa', 'ru', 'tr']);
  for (const lang of ['fa', 'en', 'ru', 'tr']) assert.ok(theme.meta.strings[lang].title, `strings.${lang}.title missing`);
  assert.ok(theme.meta.tokens && theme.meta.tokens['card-2'], 'tokens missing');
});

test('CSS-only theme (no theme.js) is a valid package', () => {
  const sample = parseThemeZip(buildSampleThemeZip(), 'x') as any;
  const zip = buildThemeZip(sample.css, { id: 'neon-storm', name: 'CSS only' }, {});
  const parsed = parseThemeZip(zip, 'css-only.zip');
  assert.ok(!isZipParseError(parsed), `css-only package rejected: ${JSON.stringify(parsed)}`);
  assert.equal((parsed as any).componentJs, '');
});

test('region contract: server KNOWN_REGIONS === client THEME_REGIONS', () => {
  assert.deepEqual([...KNOWN_REGIONS].sort(), [...THEME_REGIONS].sort());
});

test('detectRegisteredRegions finds every registerComponent call', () => {
  const js = "SDK.registerComponent('hero', {}); window.BazinoThemeSDK.registerComponent(\"home.pricing\", function(){});";
  assert.deepEqual(detectRegisteredRegions(js).sort(), ['hero', 'home.pricing']);
});

test('ts(): theme strings fall back language → en → first → key', () => {
  const strings = normalizeThemeStrings({ en: { a: 'A-en' }, tr: { a: 'A-tr', b: 'B-tr' }, junk: 5 });
  assert.deepEqual(Object.keys(strings!).sort(), ['en', 'tr']);
  assert.equal(makeThemeStrings(strings, 'tr')('a'), 'A-tr');
  assert.equal(makeThemeStrings(strings, 'fa')('a'), 'A-en');
  assert.equal(makeThemeStrings(strings, 'fa')('b'), 'B-tr');
  assert.equal(makeThemeStrings(strings, 'fa')('zzz', 'fb'), 'fb');
  assert.equal(makeThemeStrings(undefined, 'fa')('zzz'), 'zzz');
});

test('routes: browser path ↔ tab / admin section mapping', () => {
  assert.equal(routes.tabFromPath('/'), 'home');
  assert.equal(routes.tabFromPath('/reservations'), 'reservations');
  assert.equal(routes.tabFromPath('/admin/themes'), 'admin');
  assert.equal(routes.tabFromPath('/nope'), 'home');
  assert.equal(routes.pathFromTab('home'), '/');
  assert.equal(routes.pathFromTab('cafe'), '/cafe');
  assert.equal(routes.adminSectionFromPath('/admin'), 'dashboard');
  assert.equal(routes.adminSectionFromPath('/admin/appSlider'), 'appSlider');
  assert.equal(routes.adminSectionFromPath('/admin/unknown'), 'dashboard');
  assert.equal(routes.pathFromAdminSection('dashboard'), '/admin');
  assert.equal(routes.pathFromAdminSection('themes'), '/admin/themes');
});

test('parseThemeZip rejects non-zip input instead of throwing', () => {
  const result = parseThemeZip(new Uint8Array([1, 2, 3, 4, 5]), 'bad.zip');
  assert.ok(isZipParseError(result), 'expected a ZipParseError for garbage input');
});

test('rewriteCssAssetUrls points relative urls at the theme asset route', () => {
  const out = rewriteCssAssetUrls(".a{background:url('assets/b.svg')}", '/api/themes/x/assets');
  assert.ok(out.includes('/api/themes/x/assets'), `not rewritten: ${out}`);
});

test('rewriteCssAssetUrls leaves absolute and data urls alone', () => {
  const css = ".a{background:url('https://cdn/x.png')}.b{background:url('data:image/png;base64,AA')}";
  const out = rewriteCssAssetUrls(css, '/api/themes/x/assets');
  assert.ok(out.includes('https://cdn/x.png'), 'absolute url was rewritten');
  assert.ok(out.includes('data:image/png'), 'data url was rewritten');
});

/* ═══════════════════════════════════════════════════════════════════════
   7. i18n
   ═══════════════════════════════════════════════════════════════════════ */
suite('7. Internationalisation');

const LANGS = ['fa', 'en', 'ru', 'tr'] as const;

test('every translation key covers all four languages', () => {
  const incomplete: string[] = [];
  for (const [key, value] of Object.entries(translations as Record<string, any>)) {
    for (const lang of LANGS) {
      if (!value[lang] || !String(value[lang]).trim()) incomplete.push(`${key}.${lang}`);
    }
  }
  assert.deepEqual(incomplete, [], `incomplete translations: ${incomplete.join(', ')}`);
});

test('the dictionary is substantial and has no duplicate keys', () => {
  const keys = Object.keys(translations);
  assert.ok(keys.length >= 50, `only ${keys.length} keys`);
  assert.equal(new Set(keys).size, keys.length);
});

test('Persian strings actually contain Persian/Arabic script', () => {
  const suspicious: string[] = [];
  for (const [key, value] of Object.entries(translations as Record<string, any>)) {
    const fa = String(value.fa);
    // Allow pure brand/numeric strings (e.g. "BAZINO", "v2.0") to be Latin.
    if (/^[\s\d.v#A-Za-z+/-]*$/.test(fa)) continue;
    if (!/[\u0600-\u06FF]/.test(fa)) suspicious.push(`${key} → "${fa}"`);
  }
  assert.deepEqual(suspicious, [], `fa values without Persian script: ${suspicious.join(', ')}`);
});


test('API messages: every code covers all four languages and interpolates', async () => {
  const { apiMessage, requestLang } = await import('../server/apiMessages.ts');
  const mod: any = await import('../server/apiMessages.ts');
  // Reach the dictionary through apiMessage for every key we can discover.
  const keys = Object.keys((mod as any).M ?? {});
  const known = ['BAD_CREDENTIALS', 'OUT_OF_STOCK', 'SLOT_TAKEN', 'MIN_REDEEM_POINTS', 'ADMIN_ONLY'] as const;
  for (const key of keys.length ? keys : known) {
    for (const lang of LANGS) {
      const txt = apiMessage(lang, key as any, { min: 100, name: 'X', id: '1', hours: 2, points: 40, platform: 'P', detail: 'D', sec: 30, left: 4 });
      assert.ok(txt && txt.trim(), `${key}.${lang} empty`);
      assert.ok(!/\{\w+\}/.test(txt), `${key}.${lang} left a placeholder: ${txt}`);
      if (lang !== 'fa') assert.ok(!/[\u0600-\u06FF]/.test(txt), `${key}.${lang} contains Persian: ${txt}`);
    }
  }
  assert.equal(apiMessage('tr', 'MIN_REDEEM_POINTS', { min: 100 }), 'Dönüştürülebilecek en az puan 100 puandır.');
  const mk = (h: Record<string, string>) => ({ headers: h }) as any;
  assert.equal(requestLang(mk({ 'x-lang': 'ru' })), 'ru');
  assert.equal(requestLang(mk({ 'accept-language': 'tr-TR,tr;q=0.9' })), 'tr');
  assert.equal(requestLang(mk({ 'accept-language': 'de-DE' })), 'fa');
  assert.equal(requestLang(mk({})), 'fa');
});

test('server.ts sends no raw Persian error strings (all go through apiMessages)', () => {
  const src = read('server.ts');
  const offenders = src.split('\n')
    .map((l, i) => [i + 1, l] as const)
    .filter(([, l]) => /\b(error|message)\s*:\s*[`'"][^`'"]*[\u0600-\u06FF]/.test(l))
    .map(([n, l]) => `${n}: ${l.trim().slice(0, 80)}`);
  assert.deepEqual(offenders, [], `raw Persian API messages:\n${offenders.join('\n')}`);
});

test('customer-facing components have no fa/en-only ternaries left', () => {
  const dir = path.join(ROOT, 'src/components');
  const offenders: string[] = [];
  for (const f of readdirSync(dir).filter(f => f.endsWith('.tsx'))) {
    const src = read(`src/components/${f}`);
    const re = /language\s*===\s*'fa'\s*\?\s*(?!'rtl'|'ltr'|'right'|'left'|"rtl"|"ltr")[`'"][^`'"\n]*[\u0600-\u06FF]/g;
    const hits = src.match(re)?.length ?? 0;
    if (hits) offenders.push(`${f} (${hits})`);
  }
  assert.deepEqual(offenders, [], `bilingual-only ternaries remain in: ${offenders.join(', ')}`);
});

/* ═══════════════════════════════════════════════════════════════════════
   8. Data provider SQL shape
   ═══════════════════════════════════════════════════════════════════════ */
suite('8. Data providers — SQL shape');

const providersSrc = read('server/dataProviders.ts');

test('SQLite INSERT/UPDATE placeholder counts match their .run() arguments', () => {
  const re = /this\.db\.prepare\(`((?:INSERT INTO|UPDATE)[^`]*)`\)\s*\.run\(([^;]*?)\);/gs;
  const mismatches: string[] = [];
  for (const m of providersSrc.matchAll(re)) {
    const sql = m[1];
    const args = m[2].split(/,(?![^()]*\))/).map(s => s.trim()).filter(Boolean);
    const placeholders = (sql.match(/\?/g) ?? []).length;
    if (placeholders !== args.length) {
      mismatches.push(`${sql.split('\n')[0].slice(0, 70)} → ${placeholders} placeholders vs ${args.length} args`);
    }
  }
  assert.deepEqual(mismatches, [], `arity mismatches:\n${mismatches.join('\n')}`);
});

test('every MSSQL @param used is bound with .input()', () => {
  const re = /async (create|update)(CafeItem|Accessory|Article|Slider|System|Tournament)\([^)]*\)\s*\{(.*?)\n  \}/gs;
  const problems: string[] = [];
  for (const m of providersSrc.matchAll(re)) {
    const body = m[3];
    if (!body.includes('this.r()')) continue;
    const bound = new Set([...body.matchAll(/\.input\('(\w+)'/g)].map(x => x[1]));
    const used = new Set([...body.matchAll(/@(\w+)/g)].map(x => x[1]));
    for (const u of used) if (!bound.has(u)) problems.push(`${m[1]}${m[2]}: @${u} never bound`);
  }
  assert.deepEqual(problems, [], problems.join('; '));
});

test('mobileImageUrl is in the schema of all four content tables (SQLite)', () => {
  for (const table of ['cafe_items', 'accessories', 'articles', 'app_sliders']) {
    const create = providersSrc.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\(([^;]*)\\);`));
    assert.ok(create, `no CREATE TABLE for ${table}`);
    assert.ok(create![1].includes('mobileImageUrl'), `${table} lacks mobileImageUrl`);
  }
});

test('mobileImageUrl is in the schema of all four content tables (SQL Server)', () => {
  for (const table of ['cafe_items', 'accessories', 'articles', 'app_sliders']) {
    const create = providersSrc.match(new RegExp(`CREATE TABLE dbo\\.${table} \\(([^;]*)\\);`));
    assert.ok(create, `no CREATE TABLE for dbo.${table}`);
    assert.ok(create![1].includes('mobileImageUrl'), `dbo.${table} lacks mobileImageUrl`);
  }
});

test('the SQLite migration registers every table that needs mobileImageUrl', () => {
  const block = providersSrc.match(/addMissingColumns\(\): void \{([\s\S]*?)\n  \}/);
  assert.ok(block, 'addMissingColumns() not found');
  for (const table of ['cafe_items', 'accessories', 'articles', 'app_sliders']) {
    assert.ok(block![1].includes(`'${table}'`), `${table} not registered for migration`);
  }
  assert.ok(block![1].includes('PRAGMA table_info'), 'migration should probe existing columns');
  assert.ok(block![1].includes('ALTER TABLE'), 'migration should ALTER TABLE');
});

test('SQL Server migrates existing tables with IF COL_LENGTH guards', () => {
  for (const table of ['cafe_items', 'accessories', 'articles', 'app_sliders']) {
    const re = new RegExp(`IF COL_LENGTH\\('dbo\\.${table}','mobileImageUrl'\\) IS NULL ALTER TABLE dbo\\.${table} ADD mobileImageUrl`);
    assert.match(providersSrc, re, `missing MSSQL migration for ${table}`);
  }
});

/* ═══════════════════════════════════════════════════════════════════════
   9. Source-level policy guards
   ═══════════════════════════════════════════════════════════════════════ */
suite('9. Source policy');

test('no unsplash reference survives outside PerformanceGuards', () => {
  // صرفِ نامِ دامنه در کد مجاز است (مثلاً LEGACY_HINTS در server.ts برای شناسایی
  // لینک‌های قدیمی، یا رجکس allowlist برای دانلود نسخه موبایل) — آنچه ممنوع است
  // ارجاع واقعی به یک فایل تصویری روی unsplash است (photo-...)
  const UNSPLASH_ASSET_URL = /images\.unsplash\.com\/photo-/i;
  const files = [
    'server.ts', 'server/sampleData.ts', 'server/dataProviders.ts',
    'src/components/ConsoleGridClassic.tsx', 'src/components/AdminPanelTab.tsx',
    'src/components/HomeTab.tsx', 'src/components/BlogTab.tsx',
    'src/components/CafeTab.tsx', 'src/components/ShopTab.tsx',
  ];
  const offenders = files.filter(f => UNSPLASH_ASSET_URL.test(read(f)));
  assert.deepEqual(offenders, [], `unsplash asset URL still referenced in: ${offenders.join(', ')}`);
});

test('PerformanceGuards keeps its intentional unsplash transform', () => {
  assert.ok(read('src/components/PerformanceGuards.tsx').includes('images.unsplash.com'),
    'the admin-URL transform was removed');
});

test('the vite CSS-inlining plugin is still wired up', () => {
  const cfg = read('vite.config.ts');
  assert.ok(cfg.includes('inlineRenderBlockingCss'), 'plugin function missing');
  assert.match(cfg, /plugins:\s*\[[\s\S]*inlineRenderBlockingCss\(\)/, 'plugin not registered');
});

/* ═══════════════════════════════════════════════════════════════════════
   10. PayTR helpers (امضاها طبق مستندات dev.paytr.com)
   ═══════════════════════════════════════════════════════════════════════ */
suite('10. PayTR helpers');

const paytr = await import('../server/payments/paytr.ts');
const { createHmac } = await import('node:crypto');
const creds = { merchantId: '123456', merchantKey: 'k3y', merchantSalt: 's4lt' };

test('readPaytrConfig is null without credentials and enabled with them / mock', () => {
  assert.equal(paytr.readPaytrConfig({}), null);
  // تسک ۱۳: درگاه آنلاین به‌صورت پیش‌فرض خاموش است — حتی با کلیدهای کامل، بدون PAYMENT_ONLINE_ENABLED=1 null برمی‌گردد
  assert.equal(paytr.readPaytrConfig({ PAYTR_MERCHANT_ID: '1', PAYTR_MERCHANT_KEY: 'a', PAYTR_MERCHANT_SALT: 'b' }), null, 'gateway must stay disabled by default');
  assert.equal(paytr.isOnlinePaymentEnabled({}), false);
  assert.equal(paytr.isOnlinePaymentEnabled({ PAYMENT_ONLINE_ENABLED: '1' }), true);
  assert.equal(paytr.isOnlinePaymentEnabled({ PAYMENT_ONLINE_ENABLED: 'true' }), true);
  const live = paytr.readPaytrConfig({ PAYMENT_ONLINE_ENABLED: '1', PAYTR_MERCHANT_ID: '1', PAYTR_MERCHANT_KEY: 'a', PAYTR_MERCHANT_SALT: 'b', PAYTR_TEST_MODE: '0' });
  assert.equal(live?.testMode, false);
  assert.equal(live?.mock, false);
  const mock = paytr.readPaytrConfig({ PAYMENT_ONLINE_ENABLED: '1', PAYTR_MOCK: '1' });
  assert.equal(mock?.mock, true);
  assert.equal(mock?.testMode, true, 'test mode must default to on');
});

test('merchant_oid is alphanumeric and ≤ 64 chars', () => {
  const oid = paytr.generateMerchantOid();
  assert.match(oid, /^[A-Za-z0-9]{8,64}$/);
  assert.ok(paytr.isValidMerchantOid(oid));
  assert.ok(!paytr.isValidMerchantOid('bad-oid_1'));
});

test('user_basket is base64 JSON of [name, "price", qty] triples', () => {
  const b64 = paytr.encodeBasket([{ name: 'Latte', unitPrice: 120, qty: 2 }]);
  const arr = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  assert.deepEqual(arr, [['Latte', '120.00', 2]]);
});

test('paytr_token matches the documented HMAC-SHA256 formula', () => {
  const input = { userIp: '1.2.3.4', merchantOid: 'BZ1', email: 'a@b.co', amountKurus: 12345, userBasketB64: 'W10=', currency: 'TL' as const, noInstallment: 1 as const, maxInstallment: 0, userName: 'n', userAddress: 'a', userPhone: 'p', okUrl: 'https://x/ok', failUrl: 'https://x/fail' };
  const msg = '123456' + '1.2.3.4' + 'BZ1' + 'a@b.co' + '12345' + 'W10=' + '1' + '0' + 'TL' + '1' + 's4lt';
  const expected = createHmac('sha256', 'k3y').update(msg).digest('base64');
  assert.equal(paytr.buildPaytrToken(creds, input, true), expected);
  assert.notEqual(paytr.buildPaytrToken(creds, input, false), expected, 'test_mode must be part of the signature');
});

test('callback hash verifies and rejects tampering', () => {
  const hash = paytr.buildCallbackHash(creds, 'BZ1', 'success', '12345');
  const expected = createHmac('sha256', 'k3y').update('BZ1' + 's4lt' + 'success' + '12345').digest('base64');
  assert.equal(hash, expected);
  assert.ok(paytr.verifyCallbackHash(creds, { merchant_oid: 'BZ1', status: 'success', total_amount: '12345', hash }));
  assert.ok(!paytr.verifyCallbackHash(creds, { merchant_oid: 'BZ1', status: 'success', total_amount: '99999', hash }));
  assert.ok(!paytr.verifyCallbackHash(creds, { merchant_oid: 'BZ1', status: 'failed', total_amount: '12345', hash }));
});

test('refund form signs merchant_id + merchant_oid + return_amount with a dot decimal', () => {
  const f = paytr.buildRefundForm(creds, 'BZ1', 11.97);
  assert.equal(f.get('return_amount'), '11.97');
  const expected = createHmac('sha256', 'k3y').update('123456' + 'BZ1' + '11.97' + 's4lt').digest('base64');
  assert.equal(f.get('paytr_token'), expected);
});

test('toKurus rounds to integer kuruş', () => {
  assert.equal(paytr.toKurus(12.345), 1235);
  assert.equal(paytr.toKurus(100), 10000);
});

/* ═══════════════════════════════════════════════════════════════════════
   11. Legal content (theme-independent pages)
   ═══════════════════════════════════════════════════════════════════════ */
suite('11. Legal content');

const legal = await import('../src/legal/legalContent.ts');

test('every legal slug has a title and body in fa/en/ru/tr', () => {
  for (const slug of legal.LEGAL_SLUGS) {
    for (const lang of ['fa', 'en', 'ru', 'tr'] as const) {
      assert.ok(legal.LEGAL_TITLES[slug][lang], `${slug}.${lang} title`);
      assert.ok(legal.LEGAL_DEFAULTS[slug][lang]?.length > 100, `${slug}.${lang} body too short`);
    }
  }
});

test('fillLegalTemplate replaces every placeholder', () => {
  const out = legal.fillLegalTemplate('{{company}} / {{address}} / {{email}} / {{phone}} / {{taxNo}} / {{site}}', { company: 'C', address: 'A', email: 'E', phone: 'P', taxNo: 'T', site: 'S' });
  assert.equal(out, 'C / A / E / P / T / S');
  assert.ok(!legal.fillLegalTemplate(legal.LEGAL_DEFAULTS.terms.tr, { company: 'C', address: 'A', email: 'E', phone: 'P', taxNo: 'T', site: 'S' }).includes('{{'));
});

test('theme-independent pages never use theme tokens', () => {
  const files = ['src/legal/LegalShell.tsx', 'src/legal/LegalFooter.tsx', 'src/legal/LegalPage.tsx', 'src/legal/ContactPage.tsx', 'src/legal/PaymentCheckout.tsx', 'src/legal/PaymentResultPage.tsx', 'src/legal/PaymentBadges.tsx'];
  const forbidden = [/bg-dark-card/, /text-primary/, /bg-primary/, /--primary-color/, /ThemeRegion/, /useThemeScript/, /themeSdk/];
  for (const f of files) {
    // کامنت‌ها را حذف می‌کنیم؛ فقط کد واقعی (import/JSX/className) بررسی می‌شود
    const src = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const re of forbidden) assert.ok(!re.test(src), `${f} references theme token ${re}`);
  }
});

test('App.tsx renders legal/contact/payment pages before ThemeRegionProvider and a fixed LegalFooter', () => {
  const app = read('src/App.tsx');
  const standaloneIdx = app.indexOf('standalonePageFromPath(currentPath');
  const providerIdx = app.indexOf('<ThemeRegionProvider');
  assert.ok(standaloneIdx > 0 && providerIdx > 0 && standaloneIdx < providerIdx, 'standalone pages must be returned before the theme provider mounts');
  assert.ok(app.includes('<LegalFooter'), 'LegalFooter missing');
});

test('no Toman/تومان currency string survives in the frontend', () => {
  const dir = path.join(ROOT, 'src');
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const offenders = walk(dir).filter(f => /\.(tsx?|json)$/.test(f) && !f.includes(`${path.sep}data${path.sep}csharp`)).filter(f => /تومان|Toman|томан/i.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders.map(f => path.relative(ROOT, f)), []);
});

test('the public header has no theme-selector button and personal theme choice is not honoured', () => {
  const app = read('src/App.tsx');
  assert.ok(!app.includes('ThemeSelectorModal'), 'ThemeSelectorModal must not be referenced by App.tsx');
  assert.ok(!/<Palette\b/.test(app), 'palette (theme picker) button must not be in the header');
  assert.ok(!app.includes("getItem('themeChoice')"), 'personal themeChoice must no longer override the site default');
});


/* ═══════════════════════════════════════════════════════════════════════
   12. تسک ۱۲ — OTP / پروفایل / تیکت: مسیرها، لایهٔ SMS و سیاست‌های کد
   ═══════════════════════════════════════════════════════════════════════ */
suite('12. OTP auth, profile & tickets — routes, SMS layer, policies');

test('/profile[/tab] and /profile/tickets/:id resolve as theme-independent standalone pages', () => {
  assert.deepEqual(routes.standalonePageFromPath('/profile'), { type: 'profile', tab: 'overview', ticketId: undefined });
  assert.deepEqual(routes.standalonePageFromPath('/profile/security'), { type: 'profile', tab: 'security', ticketId: undefined });
  assert.deepEqual(routes.standalonePageFromPath('/profile/tickets/TK-1'), { type: 'profile', tab: 'tickets', ticketId: 'TK-1' });
  assert.equal((routes.standalonePageFromPath('/profile/bogus') as any)?.tab, 'overview');
  assert.equal(routes.pathFromProfileTab('overview'), '/profile');
  assert.equal(routes.pathFromProfileTab('points'), '/profile/points');
  assert.equal(routes.tabFromPath('/profile'), 'home', 'profile is not one of the themed tabs');
  assert.ok(routes.ADMIN_SECTIONS.includes('tickets'));
  assert.equal(routes.adminSectionFromPath('/admin/tickets'), 'tickets');
});

test('SMS layer: mock is the default, unknown provider falls back to mock, real providers require keys', async () => {
  const sms = await import('../server/sms/index.ts');
  const saved = { P: process.env.SMS_PROVIDER, K: process.env.SMSTO_API_KEY };
  try {
    delete process.env.SMS_PROVIDER;
    const p = sms.getSmsProvider();
    assert.equal(p.name, 'mock');
    assert.equal(sms.isMockSms(), true);
    const r = await p.send('+905321112233', 'Bazino login code: 123456');
    assert.equal(r.ok, true);
    assert.equal((p as any).lastFor('+905321112233').message, 'Bazino login code: 123456');
  } finally { process.env.SMS_PROVIDER = saved.P; process.env.SMSTO_API_KEY = saved.K; }
  const src = readFileSync(path.join(ROOT, 'server/sms/index.ts'), 'utf8');
  assert.ok(src.includes("throw new Error('SMS_PROVIDER=smsto requires SMSTO_API_KEY')"));
  assert.ok(src.includes('https://api.sms.to/sms/send'), 'SMS.to endpoint');
  assert.ok(src.includes('https://restapi.easysendsms.app/v1/rest/sms/send'), 'EasySendSMS endpoint');
  assert.ok(existsSync(path.join(ROOT, 'docs/sms/SMS-PROVIDERS.md')));
});

test('OTP policy in code: hashed storage, 5-minute expiry, 5 attempts, server-side limits, dev-peek gated', () => {
  const src = readFileSync(path.join(ROOT, 'server/accountRoutes.ts'), 'utf8');
  assert.ok(src.includes("createHash('sha256')"), 'codes must be hashed');
  assert.ok(src.includes('OTP_TTL_MS = 5 * 60 * 1000'));
  assert.ok(src.includes('OTP_MAX_ATTEMPTS = 5'));
  assert.ok(/phoneMinGapSec: 60/.test(src) && /phonePerHour: 5/.test(src) && /ipPer10Min: 10/.test(src) && /ipPerHour: 30/.test(src));
  assert.ok(src.includes("res.status(429)") && src.includes('retryAfter'), '429 + retryAfter contract');
  assert.ok(src.includes('isMockSms()') && src.includes("isProd && process.env.OTP_DEV_PEEK !== '1'"), 'dev-peek must be gated');
  assert.ok(!/res\.json\(\{[^}]*\bcode\b[^}]*\}\)\s*;\s*\/\/ leak/.test(src));
  assert.ok(read('server.ts').includes('app.set("trust proxy", 1)'), 'X-Forwarded-For must be trusted for IP limits');
});

test('the web AuthModal has no registration form; OTP + password only; profile page is lazy and theme-independent', () => {
  const modal = read('src/components/AuthModal.tsx');
  assert.ok(!modal.includes('/api/auth/register'), 'registration must go through OTP');
  assert.ok(modal.includes('/api/auth/otp/request') && modal.includes('/api/auth/otp/verify') && modal.includes('/api/auth/login'));
  assert.ok(modal.includes('retryAfter'), 'countdown must come from the server');
  const app = read('src/App.tsx');
  assert.ok(app.includes("lazy(() => import('./components/profile/ProfilePage'))"));
  assert.ok(app.includes('data-header-profile-link'), 'header username must link to /profile');
  const profile = read('src/components/profile/ProfilePage.tsx');
  assert.ok(profile.includes("from '../../legal/LegalShell'"), 'profile uses the theme-independent shell');
  assert.ok(!profile.includes('ThemeRegion'));
});

test('theme ZIP packed inside a root folder (my-theme/theme.js) still installs theme.js/theme.json (E.86)', async () => {
  const { zipSync, strToU8 } = await import('fflate');
  const css = readFileSync(path.join(ROOT, 'src/themes/dark-gold.css'), 'utf8').replace(/dark-gold/g, 'boxed');
  const js = "window.BazinoThemeSDK.registerComponent('header', { render: function () { return null; } });";
  const zip = zipSync({ 'my-theme/theme.json': strToU8(JSON.stringify({ id: 'boxed', name: 'Boxed', regions: ['header'] })), 'my-theme/theme.css': strToU8(css), 'my-theme/theme.js': strToU8(js), 'my-theme/assets/a.svg': strToU8('<svg/>') });
  const parsed = parseThemeZip(zip, 'boxed.zip') as any;
  assert.ok(!isZipParseError(parsed), parsed.error);
  assert.equal(parsed.componentJs, js, 'theme.js must not be silently dropped');
  assert.equal(parsed.meta.name, 'Boxed');
  assert.deepEqual(Object.keys(parsed.assets), ['a.svg']);
});

test('server bootstrap carries the active theme and App renders the first frame with it (E.86)', () => {
  const srv = read('server.ts');
  assert.ok(srv.includes('activeThemeId,\n          theme: activeServerTheme,'), 'bootstrap has activeThemeId + theme');
  const app = read('src/App.tsx');
  assert.ok(app.includes('const __initialThemeId = __bootstrapActiveId || getStoredThemeId();'));
  assert.ok(app.includes("themeRegistered.includes('hero') || themeRegistered.includes('home')"), 'default slider is not painted when the theme owns hero/home');
});

test('ticket status wording: open/customer_reply = under review, answered, closed; auto-close after 48 h', () => {
  const pp = read('src/components/profile/ProfilePage.tsx');
  assert.ok(/open: \{ fa: 'در حال بررسی'/.test(pp) && /customer_reply: \{ fa: 'در حال بررسی'/.test(pp));
  assert.ok(/answered: \{ fa: 'پاسخ داده شده'/.test(pp) && /closed: \{ fa: 'بسته شده'/.test(pp));
  const ar = read('server/accountRoutes.ts');
  assert.ok(ar.includes('TICKET_AUTO_CLOSE_MS = 48 * 60 * 60 * 1000'));
  assert.ok(ar.includes("app.get('/api/admin/tickets', async (req, res) => {\n    await sweep();"), 'admin list triggers the sweep');
});

test('order rows carry the owner username in all three providers', () => {
  const dp = read('server/dataProviders.ts');
  assert.ok(/CafeOrderRow \{[^}]*username\?: string/.test(dp) && /ShopOrderRow \{[^}]*username\?: string/.test(dp));
  assert.equal((dp.match(/INSERT INTO cafe_orders \([^)]*username\)/g) || []).length, 1, 'sqlite cafe insert');
  assert.equal((dp.match(/INSERT INTO dbo\.cafe_orders \([^)]*username\)/g) || []).length, 1, 'mssql cafe insert');
  assert.equal((dp.match(/INSERT INTO shop_orders \([^)]*username\)/g) || []).length, 1, 'sqlite shop insert');
  assert.equal((dp.match(/INSERT INTO dbo\.shop_orders \([^)]*username\)/g) || []).length, 1, 'mssql shop insert');
});


/* ═══════════════════════════════════════════════════════════════════════
   13. Wallet & pay-on-site helpers (تسک ۱۳)
   ═══════════════════════════════════════════════════════════════════════ */
suite('13. Wallet & pay-on-site — helpers');

const wallet = await import('../server/wallet/routes.ts');

test('METHODS_BY_KIND: reservation/tournament = wallet+onsite, cafe/shop = onsite only', () => {
  assert.equal(JSON.stringify(wallet.METHODS_BY_KIND.reservation), '["wallet","onsite"]');
  assert.equal(JSON.stringify(wallet.METHODS_BY_KIND.tournament), '["wallet","onsite"]');
  assert.equal(JSON.stringify(wallet.METHODS_BY_KIND.cafe), '["onsite"]');
  assert.equal(JSON.stringify(wallet.METHODS_BY_KIND.shop), '["onsite"]');
  assert.equal(wallet.ONSITE_RESERVATION_LEAD_MS, 10 * 60 * 1000);
  assert.equal(wallet.ONSITE_TOURNAMENT_LEAD_MS, 48 * 3600 * 1000);
});

test('parseSiteDate understands امروز/فردا, ISO and Jalali (Persian digits)', () => {
  const now = new Date(2026, 8, 4, 15, 30);
  assert.equal(wallet.parseSiteDate('امروز', now)?.getDate(), 4);
  assert.equal(wallet.parseSiteDate('tomorrow', now)?.getDate(), 5);
  assert.equal(wallet.parseSiteDate('2026-10-17', now)?.getMonth(), 9);
  const j = wallet.parseSiteDate('۱۴۰۵/۰۷/۲۵', now)!;
  assert.equal(`${j.getFullYear()}-${j.getMonth() + 1}-${j.getDate()}`, '2026-10-17');
  assert.equal(wallet.parseSiteDate('garbage', now), null);
});

test('computeOnsiteDueAt: reservation = start − 10 min, tournament = start − 48 h, cafe/shop = none', () => {
  const now = new Date(2026, 8, 4, 9, 0);
  const r = wallet.computeOnsiteDueAt('reservation', { date: 'امروز', startTime: '18:00' }, now);
  assert.equal(new Date(r.startsAt).getHours(), 18);
  assert.equal(Date.parse(r.startsAt) - Date.parse(r.dueAt), 10 * 60 * 1000);
  const t = wallet.computeOnsiteDueAt('tournament', { startDate: '۱۴۰۵/۰۷/۲۵' }, now);
  assert.equal(Date.parse(t.startsAt) - Date.parse(t.dueAt), 48 * 3600 * 1000);
  assert.equal(wallet.computeOnsiteDueAt('cafe', {}, now).dueAt, '');
  assert.equal(wallet.computeOnsiteDueAt('shop', {}, now).dueAt, '');
});

test('expireOnsiteOrders cancels only overdue pending orders and releases their seat', async () => {
  const calls: any[] = [];
  const rows: any[] = [
    { id: 'a', kind: 'reservation', username: 'u', status: 'pending_onsite', dueAt: '2026-01-01T00:00:00.000Z', payload: '{}', result: '{"reservationId":"r1"}' },
    { id: 'b', kind: 'tournament', username: 'u', status: 'pending_onsite', dueAt: '2999-01-01T00:00:00.000Z', payload: '{}', result: '{}' },
    { id: 'c', kind: 'cafe', username: 'u', status: 'pending_onsite', dueAt: '', payload: '{}', result: '' },
  ];
  const store: any = {
    listOnsiteOrders: async () => rows.filter(r => r.status === 'pending_onsite'),
    updateOnsiteOrder: async (id: string, f: any) => { Object.assign(rows.find(r => r.id === id), f); },
    runInTransaction: async (fn: () => Promise<any>) => fn(),
  };
  const n = await wallet.expireOnsiteOrders(store, { unfulfil: async (...a: any[]) => { calls.push(a); } }, Date.parse('2026-06-01T00:00:00Z'));
  assert.equal(n, 1);
  assert.equal(rows[0].status, 'cancelled_unpaid');
  assert.equal(rows[1].status, 'pending_onsite');
  assert.equal(rows[2].status, 'pending_onsite', 'cafe orders have no deadline');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'reservation');
});

test('Management App wallet queue: enqueue → flush with idempotency key; failures stay queued', async () => {
  const mem: Record<string, string> = {};
  (globalThis as any).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
  const ws = await import('../Management App/Bazino/src/utils/walletSync.ts');
  ws.saveQueue([]);
  ws.enqueueWalletOp({ type: 'topup', phone: '05331112233', amount: 100, operator: 'ali', note: 'cash' });
  ws.enqueueWalletOp({ type: 'charge', phone: '05331112233', amount: 30, operator: 'ali', note: 'snack' });
  assert.equal(ws.loadQueue().length, 2);
  const seen: any[] = [];
  const fakeFetch: any = async (url: string, init: any) => {
    const body = JSON.parse(init.body);
    seen.push({ url, body, auth: init.headers.Authorization });
    if (body.type === undefined && url.endsWith('/charge')) return { ok: false, status: 402, json: async () => ({ error: 'INSUFFICIENT_FUNDS' }) };
    return { ok: true, status: 200, json: async () => ({ success: true, balance: 100 }) };
  };
  const r = await ws.flushWalletQueue({ webServerUrl: 'https://bazino.pro', apiKey: 'KEY' }, fakeFetch);
  assert.equal(r.sent, 1); assert.equal(r.failed, 1);
  assert.equal(seen[0].url, 'https://bazino.pro/api/sync/wallet/topup');
  assert.equal(seen[0].auth, 'Bearer KEY');
  assert.match(seen[0].body.idempotencyKey, /^mgmt-/);
  assert.equal(r.remaining.length, 1);
  assert.equal(r.remaining[0].type, 'charge');
  assert.equal(r.remaining[0].attempts, 1);
  assert.equal(r.remaining[0].lastError, 'INSUFFICIENT_FUNDS');
  // ارسال مجدد همان کلید (بعد از قطعی) → همان idempotencyKey
  const key = r.remaining[0].idempotencyKey;
  const r2 = await ws.flushWalletQueue({ webServerUrl: '', apiKey: '' }, async (url: string, init: any) => ({ ok: true, status: 200, json: async () => ({ success: true, duplicate: true, balance: 70, key: JSON.parse(init.body).idempotencyKey }) }) as any);
  assert.equal(r2.sent, 1); assert.equal(ws.loadQueue().length, 0);
  assert.equal(key, r.remaining[0].idempotencyKey);
  delete (globalThis as any).localStorage;
});

/* ═══════════════════════════════════════════════════════════════════════
   14. Affiliate marketing
   ═══════════════════════════════════════════════════════════════════════ */
suite('14. Affiliate marketing — settings, codes, engine');

const affSettings = await import('../server/affiliate/settings.ts');
const affEngine = await import('../server/affiliate/engine.ts');

function memAffStore() {
  const settings: Record<string, string> = {};
  const affiliates: any[] = [];
  const clicks: any[] = [];
  const atts: any[] = [];
  const comms: any[] = [];
  const audits: any[] = [];
  const orders: any[] = [];
  const wallet: any[] = [];
  return {
    getSetting: async (k: string) => settings[k],
    setSetting: async (k: string, v: string) => { settings[k] = v; },
    listAffiliates: async () => affiliates,
    getAffiliateById: async (id: string) => affiliates.find(a => a.id === id),
    getAffiliateByCode: async (c: string) => affiliates.find(a => a.code === c),
    getAffiliateByUsername: async (u: string) => affiliates.find(a => a.username === u),
    createAffiliate: async (a: any) => { affiliates.push({ ...a }); },
    updateAffiliate: async (id: string, f: any) => { Object.assign(affiliates.find(a => a.id === id) || {}, f); },
    createAffiliateClick: async (c: any) => { clicks.push(c); },
    countRecentAffiliateClicks: async (code: string, ip: string, ua: string, since: string) =>
      clicks.filter(c => c.code === code && c.ipHash === ip && c.uaHash === ua && c.createdAt >= since).length,
    countAffiliateClicks: async (code: string, since?: string) =>
      clicks.filter(c => c.code === code && (!since || c.createdAt >= since)).length,
    upsertAffiliateAttribution: async (a: any) => {
      for (let i = atts.length - 1; i >= 0; i--) {
        if ((a.username && atts[i].username === a.username) || (a.visitorId && a.visitorId && atts[i].visitorId === a.visitorId)) atts.splice(i, 1);
      }
      atts.push(a);
    },
    getAttributionForUser: async (u: string) => atts.filter(a => a.username === u).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0],
    getAttributionForVisitor: async (v: string) => atts.find(a => a.visitorId === v),
    listAttributionsByCode: async (c: string) => atts.filter(a => a.code === c),
    createAffiliateCommission: async (c: any) => { comms.push({ ...c }); },
    getAffiliateCommissionById: async (id: string) => comms.find(c => c.id === id),
    listAffiliateCommissions: async (f: any = {}) => comms.filter(c =>
      (!f.affiliateId || c.affiliateId === f.affiliateId) &&
      (!f.username || c.username === f.username) &&
      (!f.orderId || c.orderId === f.orderId) &&
      (!f.status || c.status === f.status)),
    updateAffiliateCommission: async (id: string, f: any) => { Object.assign(comms.find(c => c.id === id) || {}, f); },
    createAffiliateAudit: async (a: any) => { audits.push(a); },
    listAffiliateAudit: async () => audits,
    listOnsiteOrders: async (f: any = {}) => orders.filter(o => !f.username || o.username === f.username),
    getOnsiteOrder: async (id: string) => orders.find(o => o.id === id),
    appendWalletTx: async (tx: any) => { const row = { ...tx, balanceAfter: (wallet.at(-1)?.balanceAfter || 0) + tx.amount }; wallet.push(row); return row; },
    runInTransaction: async (fn: () => Promise<any>) => fn(),
    _settings: settings, _affiliates: affiliates, _clicks: clicks, _comms: comms, _wallet: wallet, _orders: orders,
  };
}

test('normalizeCode / isValidCode: upper alnum 4–16, strips junk', () => {
  assert.equal(affEngine.normalizeCode(' ali-12 '), 'ALI12');
  assert.equal(affEngine.normalizeCode('ab'), 'AB');
  assert.equal(affEngine.isValidCode('ALI12'), true);
  assert.equal(affEngine.isValidCode('AB'), false);
  assert.equal(affEngine.isValidCode('ali12'), false);
});

test('seedAffiliateSettings inserts missing keys once and never overwrites stored values', async () => {
  const store = memAffStore();
  const n1 = await affSettings.seedAffiliateSettings(store as any);
  assert.equal(n1, affSettings.AFFILIATE_SETTING_KEYS.length);
  assert.equal(store._settings.affiliate_new_pct, '10');
  assert.equal(store._settings.affiliate_return_pct, '5');
  assert.equal(store._settings.affiliate_tournament_pct, '10');
  assert.equal(store._settings.affiliate_override_pct, '0');
  assert.equal(store._settings.affiliate_window_days, '30');
  assert.equal(store._settings.wallet_cashout_min_tl, '0');
  store._settings.affiliate_new_pct = '12';
  const n2 = await affSettings.seedAffiliateSettings(store as any);
  assert.equal(n2, 0);
  assert.equal(store._settings.affiliate_new_pct, '12', 'seed must not overwrite an existing row');
  const read = await affSettings.readAffiliateSettings(store as any);
  assert.equal(read.affiliate_new_pct, '12');
  assert.equal(read.affiliate_return_pct, '5');
});

test('parsePct / parseDays reject out-of-range and fall back', () => {
  assert.equal(affSettings.parsePct('10', 1), 10);
  assert.equal(affSettings.parsePct('101', 5), 5);
  assert.equal(affSettings.parsePct('nope', 7), 7);
  assert.equal(affSettings.parseDays('30', 1), 30);
  assert.equal(affSettings.parseDays('0', 14), 14);
});

test('onOrderPaid: reservation new=10%, cafe skipped, self-referral skipped, duplicate order reused', async () => {
  const store = memAffStore();
  await affSettings.seedAffiliateSettings(store as any);
  const aff = { id: 'AFF1', code: 'ALI12', username: 'partner', name: 'Ali', type: 'gamer', language: 'tr', destination: '/', parentId: '', status: 'active', newPct: -1, returnPct: -1, tournamentPct: -1, overridePct: -1, notes: '', createdAt: 't', updatedAt: 't' };
  await store.createAffiliate(aff);
  const cafe = await affEngine.onOrderPaid(store as any, { username: 'buyer', orderId: 'OS-c', kind: 'cafe', amount: 80, payload: { referralCode: 'ALI12' } });
  assert.equal(cafe.length, 0);
  const created = await affEngine.onOrderPaid(store as any, { username: 'buyer', orderId: 'WL-1', kind: 'reservation', amount: 200, dueAt: '2999-01-01T00:00:00.000Z', payload: { referralCode: 'ALI12' } });
  assert.equal(created.length, 1);
  assert.equal(created[0].eventType, 'new');
  assert.equal(created[0].ratePct, 10);
  assert.equal(created[0].commissionAmount, 20);
  assert.equal(created[0].status, 'pending');
  const again = await affEngine.onOrderPaid(store as any, { username: 'buyer', orderId: 'WL-1', kind: 'reservation', amount: 200, payload: { referralCode: 'ALI12' } });
  assert.equal(again[0].id, created[0].id);
  const self = await affEngine.onOrderPaid(store as any, { username: 'partner', orderId: 'WL-self', kind: 'reservation', amount: 100, payload: { referralCode: 'ALI12' } });
  assert.equal(self.length, 0);
  const adminBuy = await affEngine.onOrderPaid(store as any, { username: 'adminish', orderId: 'WL-ad', kind: 'reservation', amount: 100, userRole: 'admin', payload: { referralCode: 'ALI12' } });
  assert.equal(adminBuy.length, 0);
});

test('approveDueCommissions credits wallet; reverse after payout writes commission_reversal', async () => {
  const store = memAffStore();
  await affSettings.seedAffiliateSettings(store as any);
  await store.createAffiliate({ id: 'AFF1', code: 'ALI12', username: 'partner', name: 'Ali', type: 'gamer', language: 'tr', destination: '/', parentId: '', status: 'active', newPct: -1, returnPct: -1, tournamentPct: -1, overridePct: -1, notes: '', createdAt: 't', updatedAt: 't' });
  const created = await affEngine.onOrderPaid(store as any, { username: 'buyer', orderId: 'WL-2', kind: 'reservation', amount: 100, dueAt: '2000-01-01T00:00:00.000Z', payload: { referralCode: 'ALI12' } });
  const n = await affEngine.approveDueCommissions(store as any);
  assert.equal(n, 1);
  assert.equal(store._comms[0].status, 'paid_out');
  assert.equal(store._wallet[0].type, 'commission');
  assert.equal(store._wallet[0].amount, 10);
  const rev = await affEngine.onOrderReversed(store as any, 'WL-2', 'test');
  assert.equal(rev, 1);
  assert.equal(store._comms[0].status, 'reversed');
  assert.equal(store._wallet[1].type, 'commission_reversal');
  assert.equal(store._wallet[1].amount, -10);
});

test('click de-dupes same IP+UA within 15 minutes', async () => {
  const store = memAffStore();
  await store.createAffiliate({ id: 'AFF1', code: 'ALI12', username: 'partner', name: 'Ali', type: 'gamer', language: 'tr', destination: '/', parentId: '', status: 'active', newPct: -1, returnPct: -1, tournamentPct: -1, overridePct: -1, notes: '', createdAt: 't', updatedAt: 't' });
  const a = await affEngine.recordClick(store as any, { code: 'ALI12', path: '/', ip: '1.1.1.1', ua: 'ua', visitorId: 'v1' });
  const b = await affEngine.recordClick(store as any, { code: 'ALI12', path: '/', ip: '1.1.1.1', ua: 'ua', visitorId: 'v1' });
  assert.equal(a.ok, true); assert.equal(a.duplicate, undefined);
  assert.equal(b.duplicate, true);
  assert.equal(store._clicks.length, 1);
});

test('routes + legal slug expose affiliate surfaces', () => {
  assert.ok(routes.ADMIN_SECTIONS.includes('affiliates'));
  assert.equal(routes.adminSectionFromPath('/admin/affiliates'), 'affiliates');
  assert.ok(routes.PROFILE_TABS.includes('affiliate'));
  assert.equal(routes.pathFromProfileTab('affiliate'), '/profile/affiliate');
  assert.ok(legal.LEGAL_SLUGS.includes('affiliate'));
  assert.ok(legal.LEGAL_TITLES.affiliate.fa);
  assert.ok(legal.LEGAL_DEFAULTS.affiliate.tr.length > 100);
});

test('admin settings form keys match AFFILIATE_SETTING_KEYS; cashout is a wallet op type', () => {
  const adminSrc = read('src/components/AdminAffiliatesSection.tsx');
  for (const k of affSettings.AFFILIATE_SETTING_KEYS) {
    assert.ok(adminSrc.includes(`'${k}'`) || adminSrc.includes(`"${k}"`), `admin form missing ${k}`);
  }
  const wsSrc = read('Management App/Bazino/src/utils/walletSync.ts');
  assert.ok(wsSrc.includes("'cashout'"));
  assert.ok(read('server/wallet/routes.ts').includes('onOrderPaid'));
  assert.ok(read('server.ts').includes('seedAffiliateSettings'));
});

suite('15. Instagram campaign — Media-ID + Friend Gate');

const igSettings = await import('../server/affiliate/igSettings.ts');
const igEngine = await import('../server/affiliate/igEngine.ts');

function memIgStore() {
  const settings: Record<string, string> = {};
  const media: any[] = [];
  const members: any[] = [];
  const events: any[] = [];
  const affiliates: any[] = [];
  const coupons: any[] = [];
  return {
    async getSetting(k: string) { return settings[k]; },
    async setSetting(k: string, v: string) { settings[k] = v; },
    async upsertIgMedia(row: any) { media.push({ ...row }); },
    async getIgMediaByMediaId(id: string) { return media.find(m => m.mediaId === id); },
    async listIgMedia() { return media; },
    async createIgMember(m: any) { members.push({ ...m }); },
    async getIgMemberById(id: string) { return members.find(m => m.id === id); },
    async getIgMemberByCommentId(id: string) { return members.find(m => m.commentId === id); },
    async getIgMemberByPartnerCode(c: string) { return members.find(m => m.partnerCode === c && m.role === 'partner'); },
    async listIgMembers() { return members; },
    async updateIgMember(id: string, f: any) { const m = members.find(x => x.id === id); if (m) Object.assign(m, f); },
    async createIgEvent(e: any) { events.push(e); },
    async listIgEvents() { return events; },
    async listAffiliates() { return affiliates; },
    async getAffiliateByCode(c: string) { return affiliates.find(a => a.code === c); },
    async createAffiliate(a: any) { affiliates.push(a); },
    async getCouponByCode(c: string) { return coupons.find(x => x.code === c); },
    async createCoupon(c: any) { coupons.push(c); },
  };
}

test('IG setting keys are separate from affiliate keys and appear in the admin form', () => {
  for (const k of igSettings.IG_SETTING_KEYS) {
    assert.ok(!affSettings.AFFILIATE_SETTING_KEYS.includes(k), `IG key leaked into affiliate keys: ${k}`);
  }
  const adminSrc = read('src/components/AdminAffiliatesSection.tsx');
  for (const k of igSettings.IG_SETTING_KEYS) {
    assert.ok(adminSrc.includes(`'${k}'`) || adminSrc.includes(`"${k}"`) || adminSrc.includes(`data-ig-setting={k}`) || adminSrc.includes(`data-ig-setting={f.key}`), `admin IG form missing ${k}`);
    assert.ok(adminSrc.includes(k), `admin IG form missing string ${k}`);
  }
  assert.ok(read('server.ts').includes('seedIgSettings'));
  assert.ok(read('server.ts').includes('registerIgRoutes'));
});

test('published-media payload validation and template render', () => {
  const bad = igEngine.validatePublishedMediaPayload({ media_id: 'x', media_type: 'story' });
  assert.equal(bad.ok, false);
  const ok = igEngine.validatePublishedMediaPayload({ media_id: '179000111', media_type: 'reel', published_at: '2026-04-01T12:00:00Z', campaign_id: 'SQUAD26' });
  assert.equal(ok.ok, true);
  assert.equal(igEngine.isKeywordComment('@bazinopro SQUAD please', 'SQUAD'), true);
  assert.equal(igEngine.isKeywordComment('hello', 'SQUAD'), false);
  assert.equal(igEngine.extractNumericCode('code 482913 thanks'), '482913');
  assert.equal(igEngine.renderIgTemplate('x {{code}} y', { code: '111222' }), 'x 111222 y');
  assert.equal(igEngine.parseFollowPayload('ig_follow:IGP-1'), 'IGP-1');
});

test('Friend Gate: keyword PR → button DM with unique code → friend comment confirms share', async () => {
  const store = memIgStore();
  await igSettings.seedIgSettings(store as any);
  const ingested = await igEngine.registerPublishedMedia(store as any, {
    media_id: '179999001', media_type: 'post', published_at: '2026-04-01T12:00:00Z', campaign_id: 'SQUAD26',
  }, 'instagram:179999001');
  assert.equal(ingested.status, 200);
  const dup = await igEngine.registerPublishedMedia(store as any, {
    media_id: '179999001', media_type: 'post', published_at: '2026-04-01T12:00:00Z', campaign_id: 'SQUAD26',
  }, 'instagram:179999001');
  assert.equal(dup.json.duplicate, true);
  const conflict = await igEngine.registerPublishedMedia(store as any, {
    media_id: '179999001', media_type: 'reel', published_at: '2026-04-01T12:00:00Z',
  }, 'instagram:179999001');
  assert.equal(conflict.status, 409);
  const unknown = await igEngine.registerPublishedMedia(store as any, {
    media_id: '179999002', media_type: 'post', campaign_id: 'NOPE',
  }, 'instagram:179999002');
  assert.equal(unknown.status, 422);

  const c1 = await igEngine.onCampaignComment(store as any, {
    mediaId: '179999001', commentId: 'c-partner', text: 'SQUAD', igUserId: 'u1', igUsername: 'ali',
  });
  assert.equal(c1.ok, true);
  assert.equal(c1.outbound?.kind, 'private_reply');
  assert.ok(c1.member?.partnerCode);
  assert.match(c1.outbound?.text || '', /@bazinopro|Follow|takip|فالو/i);
  const btn = await igEngine.onFollowButton(store as any, c1.member!.id, false);
  assert.equal(btn.ok, true);
  assert.equal(btn.outbound?.kind, 'dm');
  assert.ok(btn.outbound?.text.includes(c1.member!.partnerCode));
  const friend = await igEngine.onCampaignComment(store as any, {
    mediaId: '179999001', commentId: 'c-friend', text: c1.member!.partnerCode, igUserId: 'u2', igUsername: 'veli',
  });
  assert.equal(friend.ok, true);
  assert.equal(friend.member?.shareStatus, 'share_confirmed_by_friend_code');
  assert.equal(friend.outbound?.kind, 'private_reply');
  const gate = await igEngine.onFollowButton(store as any, friend.member!.id, false);
  assert.equal(gate.ok, true);
  assert.equal(gate.outbound?.kind, 'dm');
  assert.match(gate.member?.inviteUrl || '', /utm_source=instagram/);
  assert.match(gate.member?.inviteUrl || '', /ref=/);
  assert.equal(gate.member?.followMethod, 'button_event_only');
});

await run({ title: 'Bazino — Unit & integrity tests', jsonOut: 'tests/reports/unit.json' });
await vite.close();
