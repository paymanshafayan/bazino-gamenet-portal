import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../src/components/HomeTab.tsx');
const landingHero = read('../src/components/LandingHero.tsx');
const darkGold = read('../src/components/DarkGoldHome.tsx');
const geco = read('../src/components/GecoPurpleHome.tsx');
const gamingAmp = read('../src/components/GamingAmpHome.tsx');
const consoleGrid = read('../src/components/ConsoleGridClassic.tsx');
const consoleHub = read('../src/components/ConsoleHubView.tsx');
const guards = read('../src/components/PerformanceGuards.tsx');
const app = read('../src/App.tsx');
const html = read('../index.html');
const server = read('../server.ts');
const viteConfig = read('../vite.config.ts');

// GTmetrix: LCP image must never begin life as a lazy, inactive carousel image.
// LandingHero is in the entry chunk; the much larger HomeTab follows as a lazy chunk.
assert.match(app, /import LandingHero from '\.\/components\/LandingHero'/);
assert.match(app, /const HomeTab = lazy\(\(\) => import\('\.\/components\/HomeTab'\)\)/);
assert.match(app, /const \[isHomeContentReady, setIsHomeContentReady\] = useState\(false\)/);
assert.match(app, /document\.readyState === 'complete'/);
assert.match(app, /requestIdleCallback\(\(\) => setIsHomeContentReady\(true\)/);
assert.match(app, /<Suspense fallback=\{<LandingHero/);
assert.match(landingHero, /loading="eager"[\s\S]{0,80}fetchPriority="high"/);
assert.match(landingHero, /sizes="\(min-width: 1024px\) 960px, 100vw"/);
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
// The initial Unsplash hero must select a compact responsive candidate rather than the
// prior 1200px/q80 source, while keeping its eager LCP priority.
assert.match(home, /getResponsiveSrcSet\(activeGame\.imageUrl, \[480, 720, 960\]\)/);
assert.match(home, /sizes="\(min-width: 1024px\) 960px, 100vw"/);
assert.match(guards, /url\.searchParams\.set\('q', '70'\)/);
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

// Large API-derived trees must not monopolize the first interaction window.
assert.match(app, /startTransition\(\(\) => \{[\s\S]{0,500}setSystems/);
assert.match(app, /window\.setTimeout\(\(\) => \{[\s\S]{0,120}scheduleIdle\(checkInstallStatus\)/);
assert.match(home, /window\.setTimeout\(\(\) => \{[\s\S]{0,300}fetch\('\/api\/settings'\)/);
assert.match(home, /startTransition\(\(\) => \{/);

// Keep the browser runtime compact: Preact compatibility is sufficient for the client
// components, and a server renderer must never be pulled into the browser vendor chunk.
assert.match(viteConfig, /@preact\/preset-vite/);
assert.match(viteConfig, /'react': 'preact\/compat'/);
assert.doesNotMatch(viteConfig, /'react-dom\/server'/);

// ZIP decompression belongs to the lazy theme editor, not the public landing bundle.
assert.match(themes, /from '\.\/themeCssUtils'/);
assert.doesNotMatch(themes, /from '\.\/themeZipCore'/);

// GTmetrix: reported always-running non-composited indicators are static now.
for (const [name, source] of Object.entries({ home, darkGold, geco, gamingAmp, consoleGrid, consoleHub })) {
  assert.doesNotMatch(source, /animate-(?:pulse|ping)/, `${name} contains an always-running pulse/ping animation`);
}

// GTmetrix: avoid the spinner-only first commit and any late webfont layout swap.
// The local/system stack renders on the first paint, so the brand header cannot push the
// hero after a remote font response completes.
assert.match(app, /useState<boolean \| null>\(true\)/);
assert.match(app, /<div className="w-full min-h-\[600px\]" aria-hidden="true" \/>/);
assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
assert.doesNotMatch(html, /family=Space\+Grotesk|family=Inter|family=JetBrains\+Mono/);

// Cloudflare's injected Web Analytics beacon has a vendor-controlled 24-hour TTL. It is
// excluded instead of downloaded on every visitor's first visit; only same-origin scripts
// may execute in the production response.
assert.match(server, /Content-Security-Policy/);
assert.match(server, /script-src 'self' 'unsafe-inline'/);
assert.doesNotMatch(server, /static\.cloudflareinsights\.com/);

console.log('Performance guard checks passed for all built-in templates.');
