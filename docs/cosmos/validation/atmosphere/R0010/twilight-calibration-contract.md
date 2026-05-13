# Cosmos R-0010 twilight/terminator calibration contract

This static contract defines the review targets used after runtime shader logs are clean.

| Bookmark | Role | Sun elev ° | Optical depth target | Aerial perspective target | Orbital rim α | Local sky α |
|---|---|---:|---:|---:|---:|---:|
| cloud-terminator | orbital-terminator | 4.0 | 0.18–0.58 | 0–0.18 | 0.92–1 | 0–0.04 |
| twilight-limb | orbital-limb | -1.5 | 0.28–0.72 | 0–0.15 | 0.95–1 | 0–0.03 |
| low-twilight-horizon | sea-level-horizon | 1.2 | 0.3–0.86 | 0.28–0.92 | 0–0.1 | 0.94–1 |

Use these bookmarks with mode 0 and mode 6 captures. Do not interpret colour tuning until R-0010 runtime diagnostics report zero shader/program/page errors.