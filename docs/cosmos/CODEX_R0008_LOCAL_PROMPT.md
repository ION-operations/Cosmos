# Codex local prompt — Cosmos R-0008 visual diagnostics

You are Codex running locally for Project Cosmos Water World.

Use the newest patch zip first:

```text
Cosmos_WaterWorld_v0_8_R0008_visual_debug_overlays.zip
```

Work directory:

```bash
Cosmos/earth-forge
```

Goal:

Complete local runtime validation for R-0008 by capturing normal screenshots, scale/atmosphere runtime diagnostics, and debug-mode screenshots for all seven fixed review bookmarks.

Run:

```bash
npm ci
npm run build
npx vitest run --pool=threads --poolOptions.threads.singleThread=true --reporter=verbose
npm run lint
npm run cosmos:review:scale-contract
npm run cosmos:review:atmosphere-contract
npm run cosmos:review:debug-contract
npm i -D playwright
npx playwright install chromium
npm run cosmos:review:scale-diagnostics
npm run cosmos:review:screenshots
npm run cosmos:review:debug-screenshots
```

Expected static reports:

```text
docs/cosmos/validation/scale/R0008/bookmark-scale-contract.md
docs/cosmos/validation/atmosphere/R0008/atmosphere-continuity-contract.md
docs/cosmos/validation/debug/R0008/debug-overlay-contract.md
```

Expected screenshot outputs:

```text
docs/cosmos/validation/screenshots/R0008/*.png
docs/cosmos/validation/screenshots/R0008-debug/*_mode-1.png
docs/cosmos/validation/screenshots/R0008-debug/*_mode-2.png
docs/cosmos/validation/screenshots/R0008-debug/*_mode-3.png
docs/cosmos/validation/screenshots/R0008-debug/*_mode-4.png
docs/cosmos/validation/screenshots/R0008-debug/*_mode-5.png
```

Manual review URLs:

```text
/cosmos-review?bookmark=orbit&panel=1
/cosmos-review?bookmark=cloud-terminator&panel=1
/cosmos-review?bookmark=high-altitude&panel=1
/cosmos-review?bookmark=storm-zone&panel=1
/cosmos-review?bookmark=sun-glitter&panel=1
/cosmos-review?bookmark=sea-level&panel=1
/cosmos-review?bookmark=underwater&panel=1
```

Review protocol:

1. First inspect normal beauty screenshot.
2. If scale feels wrong, inspect mode 1.
3. If rim/haze/sky feels wrong, inspect mode 2.
4. If cloud detail shifts incorrectly while zooming, inspect mode 3.
5. If physical shells appear misregistered, inspect mode 4 or mode 5.
6. Save a short note per failed bookmark in `docs/cosmos/R0008_LOCAL_RUN.md`.

Do not commit or package:

```text
node_modules
dist
browser binaries
```

R-0009 candidate:

```text
physical atmosphere LUT/transmittance interface and first debug view for optical depth/rayleigh/mie/ozone ownership
```
