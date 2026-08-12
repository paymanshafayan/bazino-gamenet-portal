import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../src/components/HomeTab.tsx');
const darkGold = read('../src/components/DarkGoldHome.tsx');
const geco = read('../src/components/GecoPurpleHome.tsx');
const gamingAmp = read('../src/components/GamingAmpHome.tsx');
const consoleGrid = read('../src/components/ConsoleGridClassic.tsx');
const consoleHub = read('../src/components/ConsoleHubView.tsx');
const guards = read('../src/components/PerformanceGuards.tsx');
const app = read('../src/App.tsx');
const html = read('../index.html');
const server = read('../server.ts');

// GTmetrix: LCP image must never begin life as a lazy, inactive carousel image.
assert.match(home, /const activeGame = activeBanners\[activeBanner\] \?\? activeBanners\[0\]/);
assert.match(home, /loading="eager"[\s\S]{0,80}fetchpriority="high"/);
assert.doesNotMatch(home, /loading=\{activeBanner === idx \? 'eager' : 'lazy'\}/);
assert.doesNotMatch(home, /activeBanners\.map\(\(game, idx\)/);
assert.match(darkGold, /const activeGame = featuredGames\[activeBanner\] \?\? featuredGames\[0\]/);
assert.doesNotMatch(darkGold, /featuredGames\.map\(\(game: any, idx: number\)/);
assert.match(geco, /loading="eager"[\s\S]{0,80}fetchpriority="high"/);
assert.doesNotMatch(geco, /bg-\[url\(/);
assert.match(gamingAmp, /loading="eager" fetchpriority="high"[\s\S]{0,180}srcSet=/);
assert.match(consoleHub, /loading="eager"[\s\S]{0,80}fetchpriority="high"[\s\S]{0,160}srcSet=/);
assert.doesNotMatch(consoleHub, /\/bg\.jpg/);

// GTmetrix: responsive delivery and intrinsic dimensions for reported image waste/CLS.
assert.ok((home.match(/srcSet=\{getResponsiveSrcSet/g) ?? []).length >= 4);
assert.match(home, /width="1200"[\s\S]{0,40}height="514"/);
assert.ok((darkGold.match(/srcSet=\{getResponsiveSrcSet/g) ?? []).length >= 6);
assert.match(darkGold, /width="1200"[\s\S]{0,40}height="514"/);
assert.ok((geco.match(/srcSet=\{getResponsiveSrcSet/g) ?? []).length >= 4);
assert.match(geco, /width="1600"[\s\S]{0,40}height="900"/);
assert.ok((gamingAmp.match(/srcSet=\{getResponsiveSrcSet/g) ?? []).length >= 6);
assert.match(gamingAmp, /width="1600"[\s\S]{0,40}height="686"/);
assert.ok((consoleGrid.match(/srcSet=\{getResponsiveSrcSet/g) ?? []).length >= 2);
assert.ok((consoleGrid.match(/width="400" height="240"/g) ?? []).length >= 2);
assert.match(consoleHub, /srcSet=\{`\$\{panel\.bg\} 400w, \$\{panel\.bgLarge\} 800w`\}/);
assert.match(consoleHub, /width=\{panel\.width\}[\s\S]{0,40}height=\{panel\.height\}/);
assert.match(html, /type="image\/webp" href="\/src\/assets\/images\/bazino_logo_user\.webp"/);

// GTmetrix: next-gen format and payload guards for local backgrounds/panel images.
const baseCss = read('../src/index.css');
const themeCss = read('../src/themes/dark-gold.css');
const themes = read('../src/themes/index.ts');
assert.doesNotMatch(`${baseCss}\n${themeCss}\n${themes}`, /background\.jpg/);
assert.match(`${baseCss}\n${themeCss}\n${themes}`, /background\.webp/);
assert.ok(statSync(new URL('../src/assets/images/background.webp', import.meta.url)).size < 10_000);
assert.doesNotMatch(consoleHub, /(?:_panel\.png|\/bg\.jpg)/);
const hubAssets: Array<[string, string]> = [
  ['background-1536.webp', '../public/bg.jpg'],
  ['reservations-400.webp', '../public/reservations_panel.png'],
  ['cafe-400.webp', '../public/cafe_panel.png'],
  ['shop-400.webp', '../public/shop_panel.png'],
  ['tournaments-400.webp', '../public/tournaments_panel.png'],
  ['loyalty-400.webp', '../public/loyalty_panel.png'],
];
for (const [optimized, original] of hubAssets) {
  const optimizedSize = statSync(new URL(`../src/assets/images/console-hub/${optimized}`, import.meta.url)).size;
  const originalSize = statSync(new URL(original, import.meta.url)).size;
  assert.ok(optimizedSize < originalSize, `${optimized} must remain smaller than ${original}`);
}

// GTmetrix: keep below-fold host nodes out of the initial 693-element DOM.
assert.match(guards, /rootMargin: '400px 0px'/);
assert.ok((home.match(/<DeferredSection/g) ?? []).length >= 6);
assert.ok((darkGold.match(/<DeferredSection/g) ?? []).length >= 6);
assert.ok((geco.match(/<DeferredSection/g) ?? []).length >= 6);
assert.ok((gamingAmp.match(/<DeferredSection/g) ?? []).length >= 9);
assert.ok((consoleGrid.match(/<DeferredSection/g) ?? []).length >= 2);
assert.match(home, /fallback=\{<div className="w-full min-h-\[600px\]" aria-hidden="true" \/>\}/);

// GTmetrix: recurring offscreen work is visibility-gated, and unused state stays out.
assert.match(home, /!isTournamentSectionVisible \|\| tournaments\.length === 0/);
assert.match(darkGold, /!isTournamentSectionVisible \|\| tournaments\.length === 0/);
assert.match(geco, /if \(!isMatchSectionVisible\) return/);
assert.match(geco, /document\.visibilityState !== 'visible'/);
assert.match(consoleGrid, /if \(!isChatPanelVisible\) return/);
assert.match(consoleGrid, /document\.visibilityState === 'visible'/);
assert.doesNotMatch(gamingAmp, /activeSlide|setActiveSlide/);

// GTmetrix: reported always-running non-composited indicators are static now.
for (const [name, source] of Object.entries({ home, darkGold, geco, gamingAmp, consoleGrid, consoleHub })) {
  assert.doesNotMatch(source, /animate-(?:pulse|ping)/, `${name} contains an always-running pulse/ping animation`);
}

// GTmetrix: avoid the spinner-only first commit and keep the Google font CSS off the
// initial critical request chain. The fallback stack renders immediately; webfonts only
// start after window load during an idle period.
assert.match(app, /useState<boolean \| null>\(true\)/);
assert.match(app, /<div className="w-full min-h-\[600px\]" aria-hidden="true" \/>/);
assert.match(html, /display=optional/);
assert.match(html, /window\.addEventListener\('load', scheduleFontLoad/);
assert.match(html, /requestIdleCallback/);
assert.doesNotMatch(html, /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com/);
assert.doesNotMatch(html, /family=Space\+Grotesk|family=Inter|family=JetBrains\+Mono/);

// Cloudflare's injected Web Analytics beacon has a vendor-controlled 24-hour TTL. It is
// excluded instead of downloaded on every visitor's first visit; only same-origin scripts
// may execute in the production response.
assert.match(server, /Content-Security-Policy/);
assert.match(server, /script-src 'self' 'unsafe-inline'/);
assert.doesNotMatch(server, /static\.cloudflareinsights\.com/);

console.log('Performance guard checks passed for all built-in templates.');
