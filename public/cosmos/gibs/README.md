# Cosmos GIBS local runtime assets

R-0004 looks for a local full-disk/global NASA GIBS surface atlas here:

```text
public/cosmos/gibs/global-truecolor.jpg
public/cosmos/gibs/global-truecolor.manifest.json
```

Generate it locally from the project root with:

```bash
npm run cosmos:gibs:global-snapshot
```

The runtime starts with a neutral fallback texture. When the atlas exists, `/cosmos-review` loads it automatically and blends it into the orbital planet pass using the **GIBS blend** control.
