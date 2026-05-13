# Cosmos renderer modules

`weatherAtlas.ts` creates the deterministic fallback atlas that currently stands in for future live data products. The atlas contract is now shared by both the main Water World route and the orbital review route.

## Atlas channels

```text
weatherA RGBA       = cloud cover, cloud liquid, cloud ice/cirrus, precipitation/storm energy
weatherB RGBA       = encoded wind U, encoded wind V, humidity, temperature
terrainForcingA     = elevation, land mask, coast proximity, roughness/drag
terrainForcingB     = evaporation potential, heat capacity, orographic forcing, lee shadow
```

## Current consumers

```text
src/pages/ProceduralEarth.tsx
src/cosmos/orbital/WorldEngine.ts
src/cosmos/orbital/shaders/common.ts
src/cosmos/orbital/shaders/clouds.ts
src/cosmos/orbital/shaders/planet.ts
src/cosmos/orbital/shaders/ocean.ts
```

R-0003 added `WEATHER_ATLAS_GLSL`, so orbital clouds, the orbital planet pass, and the projected-grid ocean now sample the same macro weather state.

## Next provider goal

Keep this contract stable while replacing the deterministic fallback with optional real data providers: NASA GIBS satellite imagery, NOAA/GFS weather fields, ERA5 replay, Copernicus Marine wave/ocean products, and bathymetry.
