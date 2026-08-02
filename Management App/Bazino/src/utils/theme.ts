/**
 * Dynamic theming engine for BAZINO PRO Management App (Item #12 — GameCenter.md checklist).
 *
 * The app is built almost entirely with Tailwind's `amber-*` (brand/primary) and `zinc-*`
 * (backgrounds / neutral text & borders) utility classes — over a thousand call sites
 * across App.tsx and every component. `yellow-*` is deliberately excluded: it's used as a
 * genuine semantic color (the WARNING/5-minutes-left status light in StationCard, and the
 * macOS-style "minimize" window-control dot in Header) and must stay recognizable no
 * matter which theme is active, so it's never overridden here.
 *
 * Tailwind CSS v4 compiles every utility class to reference a CSS custom property
 * (e.g. `.bg-amber-500 { background-color: var(--color-amber-500); }`) and declares the
 * default value of that property on `:root`. Because inline styles set on <html> win over
 * a `:root` selector rule for the same custom property, we can re-point the ENTIRE app's
 * brand palette at runtime — with zero changes to any component's JSX/className — by
 * overriding `--color-amber-*` and `--color-zinc-*` on `document.documentElement`
 * whenever the selected AppTheme changes.
 *
 * NOTE: this could not be verified in a real browser in this sandbox (no `node_modules`,
 * no network to install/build). Please confirm with `npm install && npm run dev`, switch
 * themes in Settings, and check DevTools → Elements → <html> → Styles to see the
 * `--color-amber-500` / `--color-zinc-950` etc. custom properties update live.
 */

import { AppTheme } from '../types';

type HSL = { h: number; s: number; l: number };

function hexToHsl(hex: string): HSL {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.substring(0, 2), 16) / 255;
  const g = parseInt(full.substring(2, 4), 16) / 255;
  const b = parseInt(full.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      default:
        h = ((r - g) / d + 4) * 60;
    }
  }

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = Math.min(100, Math.max(0, s)) / 100;
  const lNorm = Math.min(100, Math.max(0, l)) / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c; g = x; b = 0;
  } else if (h < 120) {
    r = x; g = c; b = 0;
  } else if (h < 180) {
    r = 0; g = c; b = x;
  } else if (h < 240) {
    r = 0; g = x; b = c;
  } else if (h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Standard Tailwind shade steps, excluding 500 which is always the exact brand color itself. */
const BRAND_LIGHTNESS_CURVE: Record<number, number> = {
  50: 97, 100: 93, 200: 85, 300: 74, 400: 62,
  600: 42, 700: 34, 800: 26, 900: 18, 950: 10,
};

/** Builds a full 50–950 Tailwind-style scale anchored so that shade 500 equals `baseHex` exactly. */
function buildBrandScale(baseHex: string): Record<number, string> {
  const { h, s } = hexToHsl(baseHex);
  const scale: Record<number, string> = { 500: baseHex };
  for (const [shadeStr, targetL] of Object.entries(BRAND_LIGHTNESS_CURVE)) {
    const shade = Number(shadeStr);
    // Pull saturation in slightly at the extremes so very light/dark steps don't look neon or muddy.
    const satAdj = shade <= 200 || shade >= 900 ? s * 0.75 : s;
    scale[shade] = hslToHex(h, satAdj, targetL);
  }
  return scale;
}

const NEUTRAL_LIGHTNESS_CURVE: Record<number, number> = {
  50: 97, 100: 93, 200: 85, 300: 74, 400: 62, 500: 50, 600: 38, 700: 28, 800: 20, 900: 14, 950: 8,
};

/**
 * Builds the zinc scale for backgrounds/neutral text/borders. `cardBg` anchors the hue/
 * saturation (it's the more frequently-used "surface" tone); `bgColor` and `cardBg` are
 * still plugged in verbatim for shades 950/900 so the two most visible surfaces (page vs.
 * card) match the theme's exact declared colors instead of an approximation.
 */
function buildNeutralScale(bgColor: string, cardBg: string): Record<number, string> {
  const { h, s } = hexToHsl(cardBg);
  const desaturated = s * 0.4; // keep grays looking like grays, just tinted toward the theme hue
  const scale: Record<number, string> = {};
  for (const [shadeStr, l] of Object.entries(NEUTRAL_LIGHTNESS_CURVE)) {
    scale[Number(shadeStr)] = hslToHex(h, desaturated, l);
  }
  scale[950] = bgColor;
  scale[900] = cardBg;
  return scale;
}

function setVar(root: CSSStyleDeclaration, name: string, value: string) {
  root.setProperty(name, value);
}

/**
 * Applies an AppTheme to the whole document by overriding the CSS custom properties that
 * every `amber-*` / `yellow-*` / `zinc-*` Tailwind utility class resolves to. Call this once
 * on mount and again every time the selected theme changes.
 */
export function applyAppTheme(theme: AppTheme): void {
  if (typeof document === 'undefined') return; // SSR / non-browser guard
  const root = document.documentElement.style;

  const brandScale = buildBrandScale(theme.primaryColor);
  Object.entries(brandScale).forEach(([shade, hex]) => {
    setVar(root, `--color-amber-${shade}`, hex);
  });
  // NOTE: `yellow-*` is intentionally left untouched — it's used as a genuine semantic
  // color (the WARNING/5-minutes-left status light in StationCard, and the macOS-style
  // "minimize" window-control dot in Header) and must stay recognizable across every
  // theme. Decorative gold-gradient spots that used to mix amber→yellow were changed to
  // amber→amber gradients instead (see Header.tsx, StationCard.tsx, StationModal.tsx,
  // OperatorPermissions.tsx, App.tsx) so they follow the theme instead of clashing with it.

  const neutralScale = buildNeutralScale(theme.bgColor, theme.cardBg);
  Object.entries(neutralScale).forEach(([shade, hex]) => {
    setVar(root, `--color-zinc-${shade}`, hex);
  });

  // Named tokens for any future direct (non-Tailwind-class) usage, e.g. inline styles in
  // SettingsThemesModal previews or canvas/SVG rendering that can't use a className.
  setVar(root, '--app-theme-primary', theme.primaryColor);
  setVar(root, '--app-theme-accent', theme.accentColor);
  setVar(root, '--app-theme-bg', theme.bgColor);
  setVar(root, '--app-theme-card', theme.cardBg);
}
