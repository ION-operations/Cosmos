# Cosmos R-0008 validation summary

## Scope

R-0008 adds visual diagnostic overlays for scale ownership, atmosphere ownership, cloud LOD ownership, and fixed physical shells.

## Commands run in sandbox

| Command | Status | Log |
|---|---|---|
| `npm ci --no-audit --no-fund` | Passed | `docs/cosmos/validation/npm_ci_R0008.log` |
| `npm run build` | Passed | `docs/cosmos/validation/build_R0008.log` |
| `npx vitest run --pool=threads --poolOptions.threads.singleThread=true --reporter=verbose` | Passed, 9 files / 24 tests | `docs/cosmos/validation/test_R0008.log` |
| `npm run lint` | Passed with existing warning-only issues | `docs/cosmos/validation/lint_R0008.log` |
| `npm run cosmos:review:scale-contract` | Passed | `docs/cosmos/validation/scale/R0008/bookmark-scale-contract.md` |
| `npm run cosmos:review:atmosphere-contract` | Passed | `docs/cosmos/validation/atmosphere/R0008/atmosphere-continuity-contract.md` |
| `npm run cosmos:review:debug-contract` | Passed | `docs/cosmos/validation/debug/R0008/debug-overlay-contract.md` |

## Not run in sandbox

| Task | Reason | Local command |
|---|---|---|
| Normal Playwright screenshots | Browser runtime capture should be done on local GPU/browser environment | `npm run cosmos:review:screenshots` |
| Debug-mode Playwright screenshots | Browser runtime capture should be done on local GPU/browser environment | `npm run cosmos:review:debug-screenshots` |
| Runtime scale diagnostics | Browser runtime capture should be done on local GPU/browser environment | `npm run cosmos:review:scale-diagnostics` |

## R-0008 result

Accepted for local visual review. The code builds, the shader/debug contracts are test-covered, and the static diagnostic reports generate correctly.
