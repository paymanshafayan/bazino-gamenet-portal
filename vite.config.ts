import tailwindcss from '@tailwindcss/vite';
import preact from '@preact/preset-vite';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      preact(),
      tailwindcss(),
      legacy({
        targets: ['defaults', 'not IE 11']
      })
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
