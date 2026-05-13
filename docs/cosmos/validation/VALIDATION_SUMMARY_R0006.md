# Cosmos R-0006 validation summary

## Commands run in sandbox

```bash
npm ci --dry-run --no-audit --no-fund
npm ci --no-audit --no-fund
npm run build
npx vitest run --pool=threads --poolOptions.threads.singleThread=true --reporter=verbose
npm run lint
npm run cosmos:review:scale-contract
```

## Result

| Check | Status |
|---|---|
| npm ci dry-run | Passed |
| npm ci | Passed |
| Build | Passed |
| Tests | Passed — 7 files / 17 tests |
| Lint | Passed with existing warning-only issues |
| Static bookmark scale contract | Passed |
| Playwright runtime scale diagnostics | Not run in sandbox; run locally |
| Playwright screenshots | Not run in sandbox; run locally |

## Key validation artifact

```text
docs/cosmos/validation/scale/R0006/bookmark-scale-contract.md
```

Static computed contract:

```text
orbit/cloud-terminator: orbital pass active; local ocean/cloud pass suppressed
surface/low-altitude bookmarks: local ocean/cloud pass active; orbital planet pass suppressed
```

## Notes

R-0006 directly addresses the lead-eyes report that screenshots were hard to diagnose and that cloud/planet/atmosphere scaling was inconsistent during zoom. The new validation path records scale-state numbers independently from screenshots.
