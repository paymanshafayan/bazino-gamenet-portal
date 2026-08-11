# Site Layout Reference Image Specification

This file serves as the official design record and reference for the **Bazino Pro** site layout. As instructed by the user, this document registers the reference layout of the **Online Gaming Dashboard** to ensure we maintain design alignment across future modifications.

## Reference Image Details
- **Source Folder:** `/CyberpunkAsset/`
- **Primary Reference Files:**
  - `CyberpunkAsset/AssetPack.png` (Core visual grid layout and asset compositions)
  - `CyberpunkAsset/home page.png` (The primary visual style for the dashboard homepage)
  - `CyberpunkAsset/ChatGPT Image Jul 21, 2026, 11_45_34 AM.png` (The custom reference dashboard mockups)

## Core Design Principles of the Reference Image
1. **No Website-Style Scrolling:**
   - The layout must fit entirely on a single screen without vertical body-scrolling. It operates like an online gaming console client (e.g., Steam, Epic Games Launcher, or an AAA game main menu).
2. **Immersive HUD Style Grid:**
   - Visual items are arranged in a clean, mathematical grid with high-tech borders, neon glows, and transparent dark glassmorphic panels (`backdrop-blur`).
3. **Cyberpunk Palette & Neon Contrast:**
   - Dark background (from `/CyberpunkAsset/background.png`) featuring high-contrast neon highlights (Cyberpunk Gold, Cyan, and Magenta/Purple).
4. **Tactile Interactive Elements:**
   - Buttons, tags, and inputs must use precise grid layouts, hover states with neon scale/glow effects, and single-line labels (no wrapped or truncated text).

## Asset Status (Updated Aug 2026)

- The original `/CyberpunkAsset/background.png` was corrupt/unreadable; a regenerated, optimized version is used instead:
  - Source: `src/assets/images/background.jpg` (18.4 kB, JPG, dark neon theme preserved).
- Site logo is served from `src/assets/images/bazino_logo_user.webp` (15.1 kB, 256×256) with `width`/`height` attributes set; canonical URL: `/logo.png` (copied from `public/logo.png` at build).
- All active image assets are optimized (WebP/JPG); no large PNGs remain in the production bundle.
