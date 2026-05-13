# Cosmos validation summary — R-0004

Patch: **Water World v0.4 / R-0004**

## Commands run

```bash
npm ci --dry-run --no-audit --no-fund
npm run build
npx vitest run --pool=threads --poolOptions.threads.singleThread=true --reporter=verbose
npm run lint
npm run cosmos:gibs:global-snapshot
```

## Results

| Check | Result | Notes |
|---|---:|---|
| npm ci dry run | Passed | Dependency graph resolves. |
| build | Passed | Vite production build completed. Chunk-size warning only. |
| test | Passed | 4 test files / 6 tests, run single-threaded for sandbox stability. |
| lint | Passed with warnings | 0 errors, 13 existing warning-class items. |
| GIBS global snapshot | Failed in sandbox | DNS `EAI_AGAIN gibs.earthdata.nasa.gov`; retry locally with Codex. |
| Playwright screenshots | Not run in sandbox | Run locally after installing Playwright browsers. |

## Logs

```text
docs/cosmos/validation/npm_ci_dry_run_R0004.log
docs/cosmos/validation/build_R0004.log
docs/cosmos/validation/test_R0004.log
docs/cosmos/validation/lint_R0004.log
docs/cosmos/validation/gibs_global_snapshot_R0004_dns_failed.log
docs/cosmos/validation/review_screenshots_R0004_not_run.log
```

## Data limitation

The renderer is ready to consume `public/cosmos/gibs/global-truecolor.jpg` and `public/cosmos/gibs/global-truecolor.manifest.json`, but this sandbox could not download those files. The local Codex CLI should run `npm run cosmos:gibs:global-snapshot` first.
