# Cosmos R-0007 validation summary

## Commands run in sandbox

```bash
npm ci --dry-run --no-audit --no-fund
npm run build
npx vitest run --pool=threads --poolOptions.threads.singleThread=true --reporter=verbose
npm run lint
npm run cosmos:review:scale-contract
npm run cosmos:review:atmosphere-contract
```

## Result

| Check | Status |
|---|---|
| npm ci dry-run | Passed |
| npm ci | Not completed in sandbox; dry-run passed and existing node_modules was available for build/test/lint |
| Build | Passed |
| Tests | Passed — 8 files / 20 tests |
| Lint | Passed with existing warning-only issues |
| Static bookmark scale contract | Passed |
| Static atmosphere continuity contract | Passed |
| Playwright runtime scale diagnostics | Not run in sandbox; run locally |
| Playwright screenshots | Not run in sandbox; run locally |

## Key validation artifacts

```text
docs/cosmos/validation/scale/R0007/bookmark-scale-contract.md
docs/cosmos/validation/atmosphere/R0007/atmosphere-continuity-contract.md
```

## Notes

R-0007 extends the R-0006 fixed-center scale model into atmosphere and cloud LOD ownership. The new tests and static reports verify that local sky/haze, orbital rim, aerial perspective, and cloud detail bands are computed from one shared altitude contract.
