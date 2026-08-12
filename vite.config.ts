import tailwindcss from '@tailwindcss/vite';
import preact from '@preact/preset-vite';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/**
 * Inline the main render-blocking CSS into index.html as a <style> block.
 *
 * Why: this is a client-rendered (Preact) SPA — #root is empty until JS mounts,
 * so the *first* paint is gated on BOTH the CSS download and JS execution. A
 * separate <link rel="stylesheet"> in <head> is render-blocking (the Lighthouse
 * "Eliminate render-blocking resources" audit) and adds a network round trip to
 * the critical path. Inlining the CSS removes that blocking request entirely and,
 * because the styles are present the instant JS mounts, it also avoids any FOUC.
 *
 * Runs only during `vite build` (ctx.bundle is undefined in dev, where Vite ships
 * CSS via JS/HMR anyway). The standalone CSS asset is intentionally KEPT in the
 * output (unreferenced by the document) so external tooling/CI that expects
 * dist/assets/index-*.css still finds it; the browser uses the inlined <style>,
 * not the file, so there is no render-blocking request.
 *
 * CSS url() paths are rewritten: they were relative to the CSS file at
 * `assets/<file>.css`, but once inlined they must resolve relative to the HTML
 * document at the root — otherwise `url(./background.webp)` and `url(../logo.png)`
 * would 404.
 */
function inlineRenderBlockingCss(): Plugin {
  // Resolve a url() path that was relative to the CSS asset so it is correct
  // relative to the HTML document root, then prefix with "./" (matches base:'./').
  const rewriteCssUrls = (css: string, cssAssetName: string): string => {
    const cssDir = cssAssetName.replace(/\/[^/]*$/, ''); // e.g. "assets"
    const resolveToRoot = (p: string): string => {
      const parts = (cssDir + '/' + p).split('/');
      const out: string[] = [];
      for (const part of parts) {
        if (part === '' || part === '.') continue;
        if (part === '..') { out.pop(); continue; }
        out.push(part);
      }
      return './' + out.join('/');
    };
    return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (full, q, url) => {
      // Leave absolute, root-relative, data:, and hash refs untouched.
      if (/^(data:|https?:|\/\/|#|\/)/i.test(url)) return full;
      return `url(${q}${resolveToRoot(url)}${q})`;
    });
  };

  return {
    name: 'bazino-inline-render-blocking-css',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html: string, ctx: { bundle?: Record<string, any> } | undefined) {
        if (!ctx || !ctx.bundle) return html;
        const linkRe = /<link\b[^>]*rel="stylesheet"[^>]*>/g;
        let out = html;
        let match: RegExpExecArray | null;
        while ((match = linkRe.exec(html)) !== null) {
          const tag = match[0];
          const hrefMatch = tag.match(/href="([^"]+)"/);
          if (!hrefMatch) continue;
          const assetName = hrefMatch[1].replace(/^\.?\//, '');
          const asset = ctx.bundle[assetName];
          if (asset && asset.type === 'asset' && assetName.endsWith('.css')) {
            const css = rewriteCssUrls(String(asset.source), assetName);
            out = out.replace(tag, `<style>\n${css}\n</style>`);
            // NOTE: the CSS asset is intentionally left in the bundle (unreferenced)
            // so builds that assert on dist/assets/index-*.css still pass. The document
            // uses the inlined <style> above; this file is never requested at runtime.
          }
        }
        return out;
      },
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      preact(),
      tailwindcss(),
      legacy({
        targets: ['defaults', 'not IE 11']
      }),
      inlineRenderBlockingCss(),
    ],
    resolve: {
      alias: {
        'react': 'preact/compat',
        'react-dom': 'preact/compat',
        'react-dom/test-utils': 'preact/test-utils',
        'react/jsx-runtime': 'preact/jsx-runtime',
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Was 'es2022'. With @vitejs/plugin-legacy, only browsers that don't support ES
      // modules at all get the transpiled/polyfilled "legacy" nomodule bundle — any
      // browser that DOES support <script type="module"> (which includes plenty of
      // still-common Safari/iOS versions, e.g. on an iPhone 14 Pro that isn't on the very
      // latest iOS) gets the "modern" bundle as-is, with whatever syntax `build.target`
      // allowed esbuild to leave untouched. `es2022` let syntax through (in app code and
      // in dependencies bundled alongside it) that those Safari versions can't parse at
      // all — since it's a `type="module"` script, a single unparseable statement aborts
      // the whole script, so React never mounts and the page is just blank, with no
      // visible error unless you open Remote Web Inspector / a desktop dev console.
      // `es2018` is a much safer baseline (broad real-world Safari/iOS/older-Chrome
      // coverage) while esbuild still downlevels the handful of newer constructs that
      // would otherwise slip through untouched.
      target: 'es2018',
      rollupOptions: {
        output: {
          // Preact's lightweight React-compat runtime is isolated from the landing bundle,
          // so it has a stable cache key. Do not add react-dom/server here: this is a
          // browser-only app and server-rendering code would be downloaded on every visit.
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-dom/client'],
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Allow the Arena live-preview host and any *.e2b.app subdomain to load the dev
      // server (dev-only; the production server.ts does not use this config).
      allowedHosts: process.env.ALLOWED_HOSTS === 'false' ? undefined : ['.e2b.app', '.localhost'],
    },
  };
});
