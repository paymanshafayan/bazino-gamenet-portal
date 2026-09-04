// One-shot runtime verification of the theme engine (run with tsx)
import { createServer } from 'vite';

// Minimal DOM shim (what the theme engine touches: document.head, style tags)
const styleTags: any[] = [];
(globalThis as any).document = {
  head: {
    appendChild: (tag: any) => { styleTags.push(tag); },
  },
  createElement: () => ({
    textContent: '',
    removed: false,
    remove() { this.removed = true; },
    setAttribute() {},
  }),
};

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'spa',
  logLevel: 'error',
  // از کش/قفل نمونه‌ی Vite در حال اجرا (سرور توسعه) جدا باشیم
  cacheDir: 'node_modules/.vite-verify',
  optimizeDeps: { noDiscovery: true },
});

try {
  const themes = await vite.ssrLoadModule('/src/themes/index.ts');

  console.log('== Built-in themes ==');
  console.log(themes.BUILT_IN_THEMES.map((t: any) => t.id).join(', '));

  // 1) Load every built-in theme like the app does on switch
  for (const theme of themes.BUILT_IN_THEMES) {
    const before = styleTags.length;
    await themes.loadThemeStylesheet(theme);
    const tag = styleTags[styleTags.length - 1];
    const css = tag.textContent;
    const hasVars = css.includes(`body[data-theme='${theme.id}']`);
    const hasScoped = css.includes(`.theme-${theme.id}`);
    // All themes must cover the app shell (header) + selection + inputs,
    // i.e. every page, not just home.
    const hasAllPages =
      css.includes('.site-header') && css.includes('::selection') &&
      css.includes('input') && css.includes('.theme-btn');
    console.log(
      `${theme.id.padEnd(14)} vars=${hasVars} scoped=${hasScoped} allPages=${hasAllPages} bytes=${css.length}`
    );
    if (!hasVars || !hasScoped || !hasAllPages) throw new Error(`Theme ${theme.id} CSS incomplete`);
  }

  // 2) Only ONE style tag is active at a time (old one removed on switch)
  const activeCount = styleTags.filter((t: any) => !t.removed).length;
  console.log(`\nActive style tags after 5 switches: ${activeCount} (expect 1)`);
  if (activeCount !== 1) throw new Error('Expected exactly 1 active theme style tag');

  // 3) Custom theme CSS generation (admin-created themes)
  const custom = {
    id: 'my-neon', name: 'My Neon', type: 'custom',
    colors: { primary: '#ff6b00', bg: '#120a05', card: '#1e1208' },
  };
  await themes.loadThemeStylesheet(custom);
  const customTag = styleTags[styleTags.length - 1];
  const customCss = customTag.textContent;
  const customOk =
    customCss.includes("body[data-theme='my-neon']") &&
    customCss.includes('--primary-color: #ff6b00') &&
    customCss.includes('.theme-my-neon .btn') &&
    customCss.includes('.theme-my-neon .bg-dark-card');
  console.log(`custom theme css generated: ${customOk} (bytes=${customCss.length})`);
  if (!customOk) throw new Error('Custom theme CSS generation failed');

  // 4) Helpers
  console.log('shadeHex(#ffb800, -12) =', themes.shadeHex('#ffb800', -12), '(expect darker)');
  console.log('hexToRgba(#ffb800, 0.3) =', themes.hexToRgba('#ffb800', 0.3));
  console.log('sanitizeThemeId("قالب بنفش من!") =', themes.sanitizeThemeId('قالب بنفش من!'));

  // 6) ZIP install flow (new package format: theme.json + theme.css)
  const zip = await vite.ssrLoadModule('/src/themes/zip.ts');
  const sampleZipBytes = zip.buildSampleThemeZip();
  const parsed = zip.parseThemeZip(sampleZipBytes, 'sample.zip');
  if ('error' in parsed) throw new Error('parseThemeZip failed on sample: ' + parsed.error);
  const assetsCount = Object.keys(parsed.assets).length;
  console.log('\nzip sample parsed:', parsed.meta.id, '| name:', parsed.meta.name,
    '| css:', parsed.css.length, 'bytes | assets:', assetsCount, '| colors:', JSON.stringify(parsed.meta.colors));
  if (parsed.meta.id !== 'neon-storm') throw new Error('Expected id neon-storm from sample CSS');
  if (assetsCount < 2) throw new Error('Sample zip must include assets folder files');

  // URL rewriting of assets paths in CSS
  const rewritten = (await import('../src/themes/themeZipCore')).rewriteCssAssetUrls(
    `body{background:url('assets/banner.svg')} .a{src:url("./assets/logo.svg")}`,
    '/api/themes/neon-storm'
  );
  if (!rewritten.includes("/api/themes/neon-storm/assets/banner.svg") || !rewritten.includes("/api/themes/neon-storm/assets/logo.svg")) {
    throw new Error('rewriteCssAssetUrls must rewrite relative asset urls: ' + rewritten);
  }
  console.log('rewriteCssAssetUrls: OK —', rewritten.slice(0, 90), '...');

  // Invalid zip → clear error code
  const bad = zip.parseThemeZip(new Uint8Array([1, 2, 3]), 'bad.zip');
  if (!('error' in bad) || bad.code !== 'invalid-zip') throw new Error('Invalid zip should return invalid-zip error');
  console.log('invalid zip rejected with code:', bad.code);

  // Round-trip: build zip from css+meta+assets+componentJs → parse again
  const { buildThemeZip, generateSampleThemeJs } = await import('../src/themes/themeZipCore');
  const rebuilt = buildThemeZip(parsed.css, parsed.meta, parsed.assets, generateSampleThemeJs());
  const reparsed = zip.parseThemeZip(rebuilt, 'rebuilt.zip');
  if ('error' in reparsed) throw new Error('reparse of rebuilt zip failed: ' + reparsed.error);
  if (reparsed.meta.id !== parsed.meta.id || reparsed.css !== parsed.css) throw new Error('zip round-trip mismatch');
  if (JSON.stringify(reparsed.assets) !== JSON.stringify(parsed.assets)) throw new Error('zip assets round-trip mismatch');
  if (!reparsed.componentJs || reparsed.componentJs.length === 0) throw new Error('zip round-trip: componentJs missing (theme.js is required)');
  console.log('zip round-trip (build → parse, incl. assets + theme.js): OK');

  // CSS-only zip (بدون theme.js): از SDK v2 به بعد theme.js اختیاری است → باید پذیرفته شود با componentJs خالی
  const { zipSync } = await import('fflate');
  const { strToU8 } = await import('fflate');
  const cssOnlyZip = zipSync({
    'my-theme.css': strToU8(
      `body[data-theme='my-theme'] { --primary-color: #123456; --dark-bg-color: #0a0a0a; --dark-card-color: #1a1a1a; }\n` +
      `.theme-my-theme .site-header { color: #123456; }\n`
    ),
  });
  const cssOnly = zip.parseThemeZip(cssOnlyZip, 'My Theme.zip');
  if ('error' in cssOnly) throw new Error('CSS-only ZIP must be accepted (theme.js is optional since SDK v2), got: ' + JSON.stringify(cssOnly));
  if (cssOnly.componentJs !== '') throw new Error('CSS-only ZIP must yield empty componentJs');
  if (cssOnly.meta.id !== 'my-theme') throw new Error('CSS-only ZIP: id must derive from CSS selector');
  console.log('zip بدون theme.js (فقط CSS): پذیرفته شد با componentJs خالی ✅ (theme.js اختیاری است)');

  // Metadata from CSS + filename (با وجود theme.js) — id/name/colors از CSS مشتق می‌شوند
  const fullZip = zipSync({
    'my-theme.css': strToU8(
      `body[data-theme='my-theme'] { --primary-color: #123456; --dark-bg-color: #0a0a0a; --dark-card-color: #1a1a1a; }\n` +
      `.theme-my-theme .site-header { color: #123456; }\n`
    ),
    'theme.js': strToU8('window.BazinoThemeSDK && window.BazinoThemeSDK.registerComponent("home", function(){ return { apiVersion: 1, render: function(p){ return null; } }; });'),
  });
  const full = zip.parseThemeZip(fullZip, 'My Theme.zip');
  if ('error' in full) throw new Error('ZIP with theme.js should parse: ' + full.error);
  if (full.meta.id !== 'my-theme') throw new Error('zip id must come from CSS, got: ' + full.meta.id);
  if (full.meta.name !== 'My Theme') throw new Error('zip name must come from filename, got: ' + full.meta.name);
  if (full.meta.colors?.primary !== '#123456') throw new Error('zip colors must be extracted from CSS');
  console.log('zip کامل (css+js، بدون theme.json): OK — id/name/colors auto-derived');

  // Path traversal must be rejected
  const evilZip = zipSync({
    'theme.css': strToU8(`body[data-theme='evil'] { color: red; }\n.theme-evil .x { color: red; }`),
    'theme.js': strToU8('window.BazinoThemeSDK && window.BazinoThemeSDK.registerComponent("home", function(){ return { apiVersion: 1, render: function(p){ return null; } }; });'),
    '../evil.txt': strToU8('pwned'),
  });
  const evil = zip.parseThemeZip(evilZip, 'evil.zip');
  if (!('error' in evil) || evil.code !== 'unsafe-path') throw new Error('Path traversal must be rejected');
  console.log('unsafe path rejected: OK');

  // 5) CSS validity: braces balanced
  const check = (css: string) => {
    let d = 0;
    for (const c of css) { if (c === '{') d++; if (c === '}') d--; }
    return d === 0;
  };
  for (const theme of [...themes.BUILT_IN_THEMES, custom]) {
    await themes.loadThemeStylesheet(theme);
    const tag = styleTags[styleTags.length - 1];
    if (!check(tag.textContent)) throw new Error(`Unbalanced braces in ${theme.id}`);
  }
  console.log('brace balance: OK for all themes');

  console.log('\n✅ ALL THEME ENGINE CHECKS PASSED');
} finally {
  await vite.close();
}
