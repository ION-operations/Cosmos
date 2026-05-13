# Cosmos R-0009 bookmark scale contract

This report is computed without screenshots. It validates that every review bookmark is classified against one fixed Earth center rather than camera-following planet coordinates.

| Bookmark | LOD | Alt km | Ocean α | Cloud α | Planet α | Local atmosphere α |
|---|---:|---:|---:|---:|---:|---:|
| orbit | orbital | 26470.904 | 0.000 | 0.000 | 1.000 | 0.000 |
| cloud-terminator | orbital | 23582.892 | 0.000 | 0.000 | 1.000 | 0.000 |
| high-altitude | low-altitude | 8.401 | 1.000 | 1.000 | 0.000 | 1.000 |
| storm-zone | low-altitude | 1.200 | 1.000 | 1.000 | 0.000 | 1.000 |
| sun-glitter | surface | 0.260 | 1.000 | 1.000 | 0.000 | 1.000 |
| sea-level | surface | 0.004 | 1.000 | 1.000 | 0.000 | 1.000 |
| underwater | surface | -0.003 | 1.000 | 1.000 | 0.000 | 1.000 |

Expected transition: surface/low-altitude bookmarks retain local ocean and cloud passes; orbital bookmarks suppress local ocean/cloud passes and use the fixed-center planet pass.