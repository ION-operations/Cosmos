import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const width = Number.parseInt(process.env.COSMOS_BATHYMETRY_WIDTH ?? '2048', 10);
const height = Number.parseInt(process.env.COSMOS_BATHYMETRY_HEIGHT ?? '1024', 10);
const outPath = resolve(process.env.COSMOS_BATHYMETRY_OUTPUT ?? 'public/cosmos/bathymetry/global-depth.png');
const manifestPath = resolve(process.env.COSMOS_BATHYMETRY_MANIFEST ?? 'public/cosmos/bathymetry/global-depth.manifest.json');
const layer = process.env.ETOPO_WMS_LAYER ?? 'z';
const colorscale = process.env.ETOPO_WMS_COLORSCALE ?? '-11000,8500';
const wmsBase = process.env.ETOPO_WMS_BASE ?? 'https://www.ngdc.noaa.gov/thredds/wms/global/ETOPO2022/60s/60s_bed_elev_netcdf/ETOPO_2022_v1_60s_N90W180_bed.nc';

const params = new URLSearchParams({
  service: 'WMS',
  version: '1.3.0',
  request: 'GetMap',
  layers: layer,
  styles: 'boxfill/greyscale',
  crs: 'EPSG:4326',
  bbox: '-90,-180,90,180',
  width: String(width),
  height: String(height),
  format: 'image/png',
  transparent: 'false',
  colorscalerange: colorscale,
});

const url = `${wmsBase}?${params.toString()}`;
console.log(`Fetching NOAA ETOPO WMS preview: ${url}`);
const response = await fetch(url);
if (!response.ok) {
  const text = await response.text().catch(() => '');
  throw new Error(`NOAA ETOPO WMS preview failed: HTTP ${response.status} ${response.statusText}\n${text.slice(0, 1000)}`);
}
const contentType = response.headers.get('content-type') ?? '';
if (!contentType.includes('image/png')) {
  const text = await response.text().catch(() => '');
  throw new Error(`NOAA ETOPO WMS did not return PNG; content-type=${contentType}\n${text.slice(0, 1000)}`);
}
const image = Buffer.from(await response.arrayBuffer());
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, image);
await writeFile(manifestPath, JSON.stringify({
  provider: 'NOAA NCEI',
  source: 'ETOPO 2022 60 arc-second bedrock elevation via THREDDS WMS preview',
  layer,
  width,
  height,
  encoding: 'WMS PNG preview; shader interprets luma/R as depth proxy unless postprocessed into RGBA depth01/shelf/coast/land',
  verticalDatum: 'ETOPO 2022 bedrock elevation, WMS color scale proxy',
  minElevationMeters: Number(colorscale.split(',')[0] ?? -11000),
  maxElevationMeters: Number(colorscale.split(',')[1] ?? 8500),
  generatedAtUtc: new Date().toISOString(),
  requestUrl: url,
  citation: 'NOAA National Centers for Environmental Information. 2022: ETOPO 2022 15 Arc-Second Global Relief Model. https://doi.org/10.25921/fd45-gt74',
  notes: [
    'This preview is a first local raster path, not the final science-grade RGBA packing.',
    'For production, convert NetCDF/GeoTIFF elevations into RGBA depth01/shelf/coast/land.',
  ],
}, null, 2));
console.log(`Wrote NOAA ETOPO WMS preview: ${outPath}`);
console.log(`Wrote manifest: ${manifestPath}`);
