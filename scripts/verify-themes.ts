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
  console.log('\nzip sample parsed:', parsed.theme.id, '| name:', parsed.theme.name,
    '| css:', parsed.css.length, 'bytes | colors:', JSON.stringify(parsed.theme.colors));
  if (parsed.theme.id !== 'neon-storm') throw new Error('Expected id neon-storm from sample CSS');
  if (!parsed.theme.css || parsed.theme.css !== parsed.css) throw new Error('theme.css must be carried on ThemeInfo');

  // ZIP theme CSS is injected verbatim (not regenerated)
  await themes.loadThemeStylesheet(parsed.theme as any);
  const zipTag = styleTags[styleTags.length - 1];
  if (zipTag.textContent !== parsed.css) throw new Error('ZIP theme css must be injected verbatim');
  console.log('zip theme css injected verbatim: OK');

  // Invalid zip → clear error code
  const bad = zip.parseThemeZip(new Uint8Array([1, 2, 3]), 'bad.zip');
  if (!('error' in bad) || bad.code !== 'invalid-zip') throw new Error('Invalid zip should return invalid-zip error');
  console.log('invalid zip rejected with code:', bad.code);

  // Round-trip: build zip from an installed theme → parse again
  const rebuilt = zip.buildThemeZip(parsed.theme as any);
  const reparsed = zip.parseThemeZip(rebuilt, 'rebuilt.zip');
  if ('error' in reparsed) throw new Error('reparse of rebuilt zip failed: ' + reparsed.error);
  if (reparsed.theme.id !== parsed.theme.id || reparsed.css !== parsed.css) throw new Error('zip round-trip mismatch');
  console.log('zip round-trip (build → parse): OK');

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
