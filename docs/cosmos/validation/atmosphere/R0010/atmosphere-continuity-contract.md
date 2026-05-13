# Cosmos R-0010 atmosphere and cloud LOD contract

This report is computed without screenshots. It validates that sky haze, orbital rim, aerial perspective, and cloud micro/meso/macro detail are derived from the same fixed-Earth altitude contract.

| Bookmark | Alt km | Local sky α | Orbital rim α | Horizon fog α | Aerial perspective α | Cloud micro α | Cloud meso α | Cloud macro α |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| orbit | 26470.904 | 0.000 | 1.000 | 0.000 | 0.000 | 0.000 | 0.000 | 1.000 |
| cloud-terminator | 23582.892 | 0.000 | 1.000 | 0.000 | 0.000 | 0.000 | 0.000 | 1.000 |
| twilight-limb | 25363.291 | 0.000 | 1.000 | 0.000 | 0.000 | 0.000 | 0.000 | 1.000 |
| high-altitude | 8.401 | 1.000 | 0.000 | 1.000 | 1.000 | 0.948 | 1.000 | 0.384 |
| storm-zone | 1.200 | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 0.350 |
| sun-glitter | 0.260 | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 0.350 |
| sea-level | 0.004 | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 0.350 |
| low-twilight-horizon | 0.008 | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 0.350 |
| underwater | -0.003 | 1.000 | 0.000 | 1.000 | 1.000 | 1.000 | 1.000 | 0.350 |

Expected transition: surface bookmarks keep micro detail and local haze; high-altitude bookmarks suppress micro detail but preserve macro cloud placement; orbit bookmarks shift atmosphere ownership to the planet rim pass.