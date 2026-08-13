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
const IMAGES_DIR = path.join(ROOT, 'public/images/home');
const onDisk = new Set(existsSync(IMAGES_DIR) ? readdirSync(IMAGES_DIR) : []);

const {
  SAMPLE_SYSTEMS, SAMPLE_CAFE_ITEMS, SAMPLE_ACCESSORIES, SAMPLE_TOURNAMENTS,
  SAMPLE_ARTICLES, SAMPLE_SLIDERS, SAMPLE_COUPONS, SAMPLE_TRANSACTIONS,
  SAMPLE_CHAT_ROOMS, SAMPLE_RESERVATION_LOGS, SAMPLE_SETTINGS, SAMPLE_COUNTS,
} = await import('../server/sampleData.ts');

const { getResponsiveSrcSet } = await import('../src/components/PerformanceGuards.tsx');
const { sanitizeThemeId, stripCssComments, extractIdFromCss, hasNewFormat, extractColorsFromCss } =
  await import('../src/themes/themeCssUtils.ts');
const { parseThemeZip, buildSampleThemeZip, rewriteCssAssetUrls, isZipParseError } =
  await import('../src/themes/themeZipCore.ts');
const { translations } = await import('../src/utils/translations.ts');

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
  const files = [
    'server.ts', 'server/sampleData.ts', 'server/dataProviders.ts',
    'src/components/ConsoleGridClassic.tsx', 'src/components/AdminPanelTab.tsx',
    'src/components/HomeTab.tsx', 'src/components/BlogTab.tsx',
    'src/components/CafeTab.tsx', 'src/components/ShopTab.tsx',
  ];
  const offenders = files.filter(f => read(f).includes('unsplash'));
  assert.deepEqual(offenders, [], `unsplash still referenced in: ${offenders.join(', ')}`);
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

await run({ title: 'Bazino — Unit & integrity tests', jsonOut: 'tests/reports/unit.json' });
await vite.close();
