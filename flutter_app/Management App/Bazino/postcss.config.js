// Same fix as the root project's postcss.config.js — see that file for the full
// explanation. Tailwind v4's default oklch() colors (used for red/emerald/blue/etc.
// semantic status colors here — amber/zinc are overridden separately at runtime by
// src/utils/theme.ts, but every other color still uses Tailwind's default oklch values)
// only render on Safari 16.4+ / iOS 16.4+. This adds an rgb() fallback before each
// oklch() declaration so older Safari/iOS still gets a correct (if not wide-gamut) color.
//
// NOTE: untested in this sandbox (no network/`node_modules`). Run `npm install` inside
// this folder to pull in the two new devDependencies before building.
export default {
  plugins: {
    '@csstools/postcss-oklab-function': { preserve: true },
  },
};
