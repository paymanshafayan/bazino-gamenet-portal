# Plan: Localize sample-data images (cafe / shop / blog / sliders)

> **Status: DONE.** Every image referenced by `server/sampleData.ts` (cafe,
> shop, blog, sliders) is now a local, optimized WebP under
> `public/images/home/` — `grep -rn unsplash server/sampleData.ts` returns
> nothing and no `images.unsplash.com` request is made at runtime.
>
> The last remaining item, the AI-generated **`hardware-pc`** shot for blog
> article `art-2`, has been generated and encoded to
> `hardware-pc-400.webp` (400x225) and `hardware-pc-800.webp` (800x450);
> `art-2` now points at them (`imageUrl` / `mobileImageUrl`) instead of the
> temporary `pc-arena` stand-in.
>
> The **home page** is likewise done (HomeTab/GamingAmp/GecoPurple/DarkGold all
> use local `/images/home/*.webp`).

## How it was resolved

Instead of generating 11 separate food/accessory photos, the cafe, shop and
slider entries were pointed at the existing local `cafe-*` / `gear-shop-*` /
`esports-*` / `rpg-openworld-*` WebP sets, and only the missing hardware shot
(`hardware-pc`) was generated with AI. Source PNGs are resized/optimized to
WebP with ImageMagick into `public/images/home/`, naming convention
`{name}-{width}.webp`.

### Blog — generated (1) ✅
| file stem | replaces unsplash | used by | variants |
|---|---|---|---|
| `hardware-pc` | photo-1587202372775-e229f172b9d7 | blog art-2 | 400 (400x225), 800 (800x450) |

<details>
<summary>Original plan (kept for reference — superseded by the mapping above)</summary>

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

</details>

> `pizza` and `keyboard` need the larger set because they are also rendered in
> the **home hero** via `SAMPLE_SLIDERS` (`HomeTab.tsx` calls
> `getResponsiveSrcSet(activeGame.imageUrl, [480,800,960])`).

### Already covered (reuse existing `/images/home/*`)
- `esports` → slider slide-1, blog art-1
- `rpg-openworld` → slider slide-4, blog art-3

> ✅ **Done:** all four sliders in `server/sampleData.ts` are localized
> (`esports-480`, `cafe-480`, `gear-shop-480`, `rpg-openworld-480`), which also
> fixed the home-hero LCP (the hero swaps to slide-1 after the appSliders fetch).

## Why variants differ
- Cafe/Shop/Blog tabs render images with plain `<img src>` (NO srcset), so card
  items only need a single small file (~400px).
- Sliders are shown in the home hero WITH responsive srcset → need 480/800/960.

## Final image mapping in `server/sampleData.ts` (applied ✅)

```ts
// SAMPLE_CAFE_ITEMS   c1..c5   -> '/images/home/cafe-480.webp'   (mobile: cafe-320)
// SAMPLE_ACCESSORIES  a1..a5   -> '/images/home/gear-shop-480.webp' (mobile: gear-shop-320)
// SAMPLE_SLIDERS      slide-1  -> '/images/home/esports-480.webp'
//                     slide-2  -> '/images/home/cafe-480.webp'
//                     slide-3  -> '/images/home/gear-shop-480.webp'
//                     slide-4  -> '/images/home/rpg-openworld-480.webp'
// SAMPLE_ARTICLES     art-1    -> '/images/home/esports-480.webp'
//                     art-2    -> '/images/home/hardware-pc-800.webp'  (mobile: hardware-pc-400)
//                     art-3    -> '/images/home/rpg-openworld-480.webp'
//                     art-4    -> '/images/home/cafe-480.webp'
```

<details>
<summary>Original target mapping (reference)</summary>

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

</details>

## `mobileImageUrl` persistence (done ✅)

`mobileImageUrl` used to exist only on the TypeScript row types and in
`SAMPLE_*` data — it was dropped the moment the data source switched from
`sample` to `database`, so the Flutter app (which reads
`json['mobileImageUrl'] ?? json['imageUrl']`) silently fell back to the
desktop-sized image. Now persisted end to end:

| layer | change |
|---|---|
| SQLite | `mobileImageUrl TEXT` on `cafe_items` / `accessories` / `articles` / `app_sliders`, plus `addMissingColumns()` (`PRAGMA table_info` + `ALTER TABLE ... ADD COLUMN`) so **existing** DBs are migrated on boot — idempotent, never touches existing rows |
| SQL Server | `mobileImageUrl NVARCHAR(500)` in the four `CREATE TABLE`s + `IF COL_LENGTH(...) IS NULL ALTER TABLE ... ADD` migration |
| MongoDB | no change needed — `insertOne({ ...row })` already stores the whole document |
| `server.ts` | admin POST/PUT for cafe, accessories, articles **and sliders** now read and forward `mobileImageUrl` |
| `SliderRow` | gained `mobileImageUrl?: string`; all four `SAMPLE_SLIDERS` now carry the 320px variant |

### Slider mobile variants
`AppSlider.fromJson` in the Flutter app reads
`json['mobileImageUrl'] ?? json['imageUrl']`, so the hero carousel used to pull
the 480px desktop file on phones. Now:

| slide | desktop | mobile |
|---|---|---|
| slide-1 | `esports-480.webp` | `esports-320.webp` |
| slide-2 | `cafe-480.webp` | `cafe-320.webp` |
| slide-3 | `gear-shop-480.webp` | `gear-shop-320.webp` |
| slide-4 | `rpg-openworld-480.webp` | `rpg-openworld-320.webp` |

`CREATE TABLE IF NOT EXISTS` never alters an existing table, which is why the
explicit migration step is required for both SQL providers.

### Admin fallbacks de-unsplashed
The `imageUrl || "https://images.unsplash.com/..."` defaults in `server.ts`
(cafe, accessories, articles) and in `ConsoleGridClassic.tsx` now fall back to
local WebP, and the five admin-panel placeholders show a local path example.
`grep -rn unsplash src/ server/ server.ts` is down to the single intentional
hit in `PerformanceGuards.tsx` (the transform kept for admin-entered URLs).

## srcset coverage audit (done ✅)

`getResponsiveSrcSet(src, widths)` advertises `{stem}-{w}.webp` for every width
it is handed, **without checking the file exists** — any gap is a 404 that the
browser may pick as the best candidate. Auditing each call site against the
images actually reachable there turned up 11 missing variants, now generated
with ImageMagick from the largest existing source of each stem:

| call site | widths | generated |
|---|---|---|
| `ConsoleGridClassic` cafe + accessory cards | `[200, 400]` | `cafe-200/400`, `gear-shop-200/400`, `sports-console-200/400` |
| `HomeTab` hero (slider-derived) | `[480, 800, 960]` | `cafe-960`, `gear-shop-960` |
| `DarkGoldHome` hero (slider-derived) | `[640, 960, 1200, 1600]` | `cafe-1600`, `gear-shop-1600` |
| `HomeTab` hero (static `featuredGames`) | `[480, 800, 960]` | `moba-strategy-800` |

Every stem × width combination reachable from a `getResponsiveSrcSet` call now
resolves to a real file (verified by script + `curl` → `200 image/webp`).

## Verification (all passing ✅)
- `npx tsc --noEmit` → no errors
- `npx vite build` → OK (still emits `dist/assets/index-*.css`)
- `curl -I /images/home/hardware-pc-400.webp` → `200` `image/webp`
- `curl -I /images/home/hardware-pc-800.webp` → `200` `image/webp`
- `grep -rn unsplash server/sampleData.ts` → 0 matches
- SQLite migration exercised against both a fresh schema and a legacy
  (pre-`mobileImageUrl`) database: column added, second boot is a no-op,
  existing rows preserved with `NULL`
- Placeholder/arg counts verified for every touched SQL statement (SQLite `?`
  count vs `.run()` args; MSSQL `@param` vs `.input()`)
