# Codex local prompt — Cosmos R-0011

You are Codex running locally for Project Cosmos Water World.

Use the newest patch zip first:

```text
Cosmos_WaterWorld_v0_11_R0011_shader_clean_twilight_calibration.zip
```

Goal:
Complete the local browser/GPU validation for R-0011 shader-clean twilight and terminator calibration.

Work directory:

```bash
Cosmos/earth-forge
```

Run:

```bash
npm ci
npm run build
npx vitest run --pool=threads --poolOptions.threads.singleThread=true --reporter=verbose
npm run lint

npm run cosmos:review:scale-contract
npm run cosmos:review:atmosphere-contract
npm run cosmos:review:debug-contract
npm run cosmos:review:atmosphere-lut-contract
npm run cosmos:review:runtime-contract
npm run cosmos:review:twilight-contract
npm run cosmos:review:atmosphere-calibration

npm i -D playwright
npx playwright install chromium
COSMOS_RUNTIME_FAIL_ON_ERRORS=1 npm run cosmos:review:runtime-diagnostics
npm run cosmos:review:screenshots
npm run cosmos:review:debug-screenshots
```

Expected key outputs:

```text
docs/cosmos/validation/atmosphere/R0011/atmosphere-calibration-contract.md
docs/cosmos/validation/runtime/R0011/runtime-diagnostics.md
docs/cosmos/validation/runtime/R0011/screenshots/*mode-0*.png
docs/cosmos/validation/runtime/R0011/screenshots/*mode-2*.png
docs/cosmos/validation/runtime/R0011/screenshots/*mode-6*.png
docs/cosmos/validation/screenshots/R0011/*.png
docs/cosmos/validation/screenshots/R0011-debug/*.png
```

Manual lead-eyes review priority:

1. `cloud-terminator` mode 0 / 2 / 6.
2. `twilight-limb` mode 0 / 2 / 6.
3. `low-twilight-horizon` mode 0 / 2 / 6.

Look for:

- rim too thick or neon;
- mode-6 optical debug no longer reflecting the actual sun direction;
- local sky and orbital rim both owning the same view;
- low-sun sea surface turning into a flat metallic plate;
- horizon haze destroying wave scale.

Produce:

```text
docs/cosmos/R0011_LOCAL_RUN.md
```

Include command results, runtime errors/warnings, screenshot paths, and visual notes. Do not commit `node_modules`, `dist`, or browser binaries.
