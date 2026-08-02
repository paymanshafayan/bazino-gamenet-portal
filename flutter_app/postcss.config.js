// Tailwind CSS v4 (imported via `@import "tailwindcss"` in src/index.css, compiled by the
// @tailwindcss/vite plugin) generates its default color palette using the modern `oklch()`
// color function, which only Safari 16.4+ / iOS 16.4+ understands. Any Safari/iOS version
// older than that simply can't parse `color: oklch(...)` and drops the whole declaration,
// which is what caused the broken/unstyled look reported on older devices (a separate,
// CSS-level issue from the JS `build.target` blank-page bug fixed in vite.config.ts).
//
// This PostCSS pass runs AFTER Tailwind generates its CSS and rewrites every oklch()/oklab()
// color into a plain rgb() value placed right before the original oklch() declaration, so:
//   - older browsers that can't parse oklch() just use the rgb() line above it (graceful
//     fallback, same final color, no OS-level HDR/wide-gamut correction)
//   - modern browsers (Safari 16.4+, current Chrome/Firefox/Edge) still get the oklch() line,
//     which — because it comes second — wins the normal CSS cascade "last rule wins" rule.
//
// NOTE: this could not be installed or built in this sandbox (no network/`node_modules`).
// Run `npm install` to pull in `postcss` + `@csstools/postcss-oklab-function` (added to
// package.json devDependencies), then `npm run build`, and verify on an older Safari/iOS
// simulator or device that colors render correctly instead of falling back to black/transparent.
export default {
  plugins: {
    '@csstools/postcss-oklab-function': { preserve: true },
  },
};
