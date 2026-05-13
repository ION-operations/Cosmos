# R-0010 runtime diagnostics sandbox status

Playwright runtime browser diagnostics were not executed in this sandbox because the project artifact does not include Playwright/browser binaries and this environment is not the local GPU/WebGL review environment.

Run locally:

```bash
npm i -D playwright
npx playwright install chromium
npm run cosmos:review:runtime-diagnostics
```

The R-0010 implementation includes:

- `scripts/cosmos/capture-review-runtime-diagnostics.mjs`
- browser console capture
- WebGL shader/program info-log probe
- screenshots for beauty, atmosphere-ownership, and optical-depth-LUT modes
- JSON/Markdown runtime receipts under `docs/cosmos/validation/runtime/R0010/`
