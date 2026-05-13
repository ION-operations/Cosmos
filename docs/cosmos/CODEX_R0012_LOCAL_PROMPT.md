You are Codex running locally for Project Cosmos Water World.

Use the newest patch zip first:

  Cosmos_WaterWorld_v0_12_R0012_atmosphere_lut_solver.zip

Goal:
Validate R-0012 locally, export the higher-fidelity atmosphere LUT textures, and collect runtime browser evidence before any further atmosphere beauty tuning.

Work directory:

  Cosmos/earth-forge

Required commands:

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
  npm run cosmos:review:atmosphere-lut-quality
  npm run cosmos:review:atmosphere-lut-export

  npm i -D playwright
  npx playwright install chromium
  COSMOS_RUNTIME_FAIL_ON_ERRORS=1 npm run cosmos:review:runtime-diagnostics
  npm run cosmos:review:debug-screenshots
  npm run cosmos:review:screenshots

Expected R-0012 outputs:

  docs/cosmos/validation/atmosphere/R0012/atmosphere-lut-quality-contract.md
  docs/cosmos/validation/atmosphere/R0012/atmosphere-calibration-contract.md
  docs/cosmos/validation/atmosphere/R0012/lut-textures/transmittance.png
  docs/cosmos/validation/atmosphere/R0012/lut-textures/multiScattering.png
  docs/cosmos/validation/atmosphere/R0012/lut-textures/skyView.png
  docs/cosmos/validation/atmosphere/R0012/lut-textures/aerialPerspective.png
  docs/cosmos/validation/atmosphere/R0012/lut-textures/manifest.json
  docs/cosmos/validation/runtime/R0012/runtime-diagnostics.md
  docs/cosmos/R0012_LOCAL_RUN.md

Review targets:

  /cosmos-review?bookmark=cloud-terminator&panel=1
  /cosmos-review?bookmark=twilight-limb&panel=1
  /cosmos-review?bookmark=low-twilight-horizon&panel=1

For each target, capture modes:

  mode 0 beauty
  mode 2 atmosphere ownership
  mode 6 optical-depth LUT

Report:

  1. Zero shader/program/page errors or exact failures.
  2. LUT export texture paths and whether any texture shows banding/posterization.
  3. Whether R-0012 feels less neon/crushed than R-0011 at limb and low horizon.
  4. Any lead-eyes issue should name bookmark id, mode, and suspected channel: transmittance, multiScattering, skyView, or aerialPerspective.

Do not commit node_modules, dist, browser binaries, or temporary screenshots outside docs/cosmos/validation.
