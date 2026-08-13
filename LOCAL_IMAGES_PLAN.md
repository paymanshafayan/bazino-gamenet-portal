# Plan: Localize sample-data images (cafe / shop / blog / sliders)

> **Status: 10/11 DONE.** All food/accessory images plus `pizza`/`keyboard`
> hero variants are generated, optimized to WebP and wired into
> `server/sampleData.ts`. Only **`hardware-pc`** remains: `generate_image` hit
> its per-session quota (10 images) before the 11th could be produced. Until
> then, blog `art-2` uses the existing `/images/home/pc-arena-800.webp` as a
> stand-in — regenerate `hardware-pc` (16:9) → `hardware-pc-400.webp` +
> `hardware-pc-800.webp` in a later session and point `art-2` back to
> `/images/home/hardware-pc-800.webp`. `image_search` was rejected because it
> returns watermarked stock-site previews (istock/adobe/freepik/dreamstime).
>
> The **home page is already done** (HomeTab/GamingAmp/GecoPurple/DarkGold all
> use local `/images/home/*.webp`). This file is ONLY about the remaining
> sample-data images in `server/sampleData.ts`.

## What to generate (11 new images, AI)

All saved as source PNGs to a scratch dir, then resized/optimized to WebP with
ImageMagick into `public/images/home/`. Naming convention `{name}-{width}.webp`.

### Food — cafe menu (5)
| file stem | replaces unsplash | used by | variants |
|---|---|---|---|
| `pizza` | photo-1513104890138-7c749659a591 | cafe c1, **slider slide-2**, blog art-4 | 400, 480, 800, 960 |
| `burger` | photo-1568901346375-23c9450c58cd | cafe c2 | 400 |
| `energy-drink` | photo-1622483767028-3f66f32aef97 | cafe c3 | 400 |
| `fries` | photo-1573080496219-bb080dd4f877 | cafe c4 | 400 |
| `espresso` | photo-1514432324607-a09d9b4aefdd | cafe c5 | 400 |

### Accessories — shop (5)
| file stem | replaces unsplash | used by | variants |
|---|---|---|---|
| `keyboard` | photo-1618384887929-16ec33fab9ef | accessory a1, **slider slide-3** | 400, 480, 800, 960 |
| `mouse` | photo-1615663245857-ac93bb7c39e7 | accessory a2 | 400 |
| `headset` | photo-1599669454699-248893623440 | accessory a3 | 400 |
| `controller` | photo-1606813907291-d86efa9b94db | accessory a4 | 400 |
| `mousepad` | photo-1605453865916-3c1f9e4a1b5c | accessory a5 | 400 |

### Blog (1)
| file stem | replaces unsplash | used by | variants |
|---|---|---|---|
| `hardware-pc` | photo-1587202372775-e229f172b9d7 | blog art-2 | 400, 800 |

> `pizza` and `keyboard` need the larger set because they are also rendered in
> the **home hero** via `SAMPLE_SLIDERS` (`HomeTab.tsx` calls
> `getResponsiveSrcSet(activeGame.imageUrl, [480,800,960])`).

### Already covered (reuse existing `/images/home/*`)
- `esports` → slider slide-1, blog art-1
- `rpg-openworld` → slider slide-4, blog art-3

> ✅ **Done since:** `slide-1` and `slide-4` in `server/sampleData.ts` were localized
> to `/images/home/esports-960.webp` and `/images/home/rpg-openworld-960.webp` as part
> of the LCP fix (the home hero swaps to slide-1 after the appSliders fetch). Only
> `slide-2` (pizza) and `slide-3` (keyboard) still use Unsplash — they need the AI
> images below.

## Why variants differ
- Cafe/Shop/Blog tabs render images with plain `<img src>` (NO srcset), so card
  items only need a single small file (~400px).
- Sliders are shown in the home hero WITH responsive srcset → need 480/800/960.

## Edits to make in `server/sampleData.ts` (after images exist)

```ts
// SAMPLE_CAFE_ITEMS imageUrl:
//   c1 pizza   -> '/images/home/pizza-400.webp'
//   c2 burger  -> '/images/home/burger-400.webp'
//   c3 drink   -> '/images/home/energy-drink-400.webp'
//   c4 fries   -> '/images/home/fries-400.webp'
//   c5 espresso-> '/images/home/espresso-400.webp'
//
// SAMPLE_ACCESSORIES imageUrl:
//   a1 keyboard  -> '/images/home/keyboard-400.webp'
//   a2 mouse     -> '/images/home/mouse-400.webp'
//   a3 headset   -> '/images/home/headset-400.webp'
//   a4 controller-> '/images/home/controller-400.webp'
//   a5 mousepad  -> '/images/home/mousepad-400.webp'
//
// SAMPLE_SLIDERS imageUrl (hero — use the large variant as src):
//   slide-1 -> '/images/home/esports-960.webp'
//   slide-2 -> '/images/home/pizza-960.webp'
//   slide-3 -> '/images/home/keyboard-960.webp'
//   slide-4 -> '/images/home/rpg-openworld-960.webp'
//
// SAMPLE_ARTICLES imageUrl:
//   art-1 CS2        -> '/images/home/esports-800.webp'
//   art-2 Hardware   -> '/images/home/hardware-pc-800.webp'
//   art-3 Tournaments-> '/images/home/rpg-openworld-800.webp'
//   art-4 Cafe       -> '/images/home/pizza-800.webp'
```

Also update the two `imageUrl ||` fallbacks in `server.ts` (lines ~1659, ~1742,
~1880) if desired (they default new admin items to unsplash — optional).

## Verification (same as home work)
- `npx tsc --noEmit`
- `npx vite build`
- curl each new `/images/home/<name>-<w>.webp` → 200 image/webp
- `grep unsplash server/sampleData.ts` → 0
