/**
 * Small browser-safe helpers shared by the active theme engine and the ZIP editor.
 * Keep these separate from themeZipCore: the latter imports fflate and is only needed
 * when an administrator opens the theme ZIP workflow.
 */
export function sanitizeThemeId(id: string): string {
  const clean = (id || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return clean || 'custom-theme-' + Date.now().toString(36);
}

export function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

export function extractIdFromCss(css: string): string | null {
  const code = stripCssComments(css);
  const themeAttribute = code.match(/body\s*\[\s*data-theme\s*=\s*['"]([^'"]+)['"]\s*\]/);
  if (themeAttribute) return sanitizeThemeId(themeAttribute[1]);
  const themeClass = code.match(/\.theme-([a-zA-Z0-9][a-zA-Z0-9-_]*)/);
  return themeClass ? sanitizeThemeId(themeClass[1]) : null;
}

export function hasNewFormat(css: string): boolean {
  const code = stripCssComments(css);
  return /body\s*\[\s*data-theme\s*=/.test(code) || /\.theme-[a-zA-Z0-9_-]+\s/.test(code);
}

export function extractColorsFromCss(
  css: string,
  fallback: { primary: string; bg: string; card: string } = {
    primary: '#ffb800', bg: '#050608', card: '#0D0E15'
  }
): { primary: string; bg: string; card: string } {
  const code = stripCssComments(css || '');
  const getVar = (prop: string): string | null => {
    const m = code.match(new RegExp(prop + '\\s*:\\s*(#[0-9a-fA-F]{3,8}|rgba?\\([^)]*\\))'));
    return m ? m[1] : null;
  };
  return {
    primary: getVar('--primary-color') || fallback.primary,
    bg: getVar('--dark-bg-color') || getVar('--theme-bg') || fallback.bg,
    card: getVar('--dark-card-color') || getVar('--theme-card-bg') || fallback.card,
  };
}
