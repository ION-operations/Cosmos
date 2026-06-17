# Build Receipt — Heartwood Studio R0/R1 Scaffold

## Branch

`ION-operations/Cosmos` branch `GPT`.

## Path

`experiments/heartwood-studio-r0-r1/`

## Committed systems

- Vite/React/TypeScript package scaffold
- TreeGraph authority types
- five starter species profiles
- demo TreeGraph generator
- structural validation gates
- React app shell
- workbench navigation
- Reference Oracle metadata panel
- GPU diagnostics placeholder
- Vitest validation tests

## Gates implemented

- `graph_authority_gate`
- `leader_continuity_gate`
- `endpoint_state_gate`
- `flat_cap_gate`
- `junction_continuity_gate`

## Known blocker

`index.html` creation through the GitHub contents API was blocked by platform safety checks because it contains an HTML module script tag. The app source and package scaffold are committed. Add the standard Vite `index.html` locally or through GitHub UI if needed.

Required content:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Heartwood Studio R0/R1</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## New system?

False. This is a scaffold for the accepted Heartwood Studio direction.
