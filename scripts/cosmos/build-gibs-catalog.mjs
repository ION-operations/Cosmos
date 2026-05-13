#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const inputPath = resolve(process.cwd(), process.argv[2] ?? 'data/gibs/gibs-wmts-capabilities.xml');
const outputPath = resolve(process.cwd(), process.argv[3] ?? 'data/gibs/gibs-layer-catalog.json');
const layerFilter = process.env.COSMOS_GIBS_LAYER_FILTER ? new RegExp(process.env.COSMOS_GIBS_LAYER_FILTER, 'i') : null;

const xml = await readFile(inputPath, 'utf8');

const firstMatch = (source, re) => source.match(re)?.[1]?.trim();
const allMatches = (source, re) => [...source.matchAll(re)].map((match) => match[1].trim());
const stripTags = (value = '') => value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const layers = [...xml.matchAll(/<Layer\b[^>]*>([\s\S]*?)<\/Layer>/g)]
  .map(([, block]) => {
    const identifier = firstMatch(block, /<ows:Identifier>([\s\S]*?)<\/ows:Identifier>/);
    if (!identifier) return null;

    const dimensionBlock = firstMatch(block, /<Dimension\b[^>]*>([\s\S]*?)<\/Dimension>/);
    const resourceUrl = block.match(/<ResourceURL\b([^>]*)>/)?.[1] ?? '';
    const template = resourceUrl.match(/template=["']([^"']+)["']/)?.[1];
    const resourceFormat = resourceUrl.match(/format=["']([^"']+)["']/)?.[1];

    return {
      identifier,
      title: stripTags(firstMatch(block, /<ows:Title>([\s\S]*?)<\/ows:Title>/) ?? identifier),
      formats: allMatches(block, /<Format>([\s\S]*?)<\/Format>/g),
      tileMatrixSets: allMatches(block, /<TileMatrixSet>([\s\S]*?)<\/TileMatrixSet>/g),
      time: dimensionBlock
        ? {
            default: firstMatch(dimensionBlock, /<Default>([\s\S]*?)<\/Default>/),
            current: /<Current>\s*true\s*<\/Current>/i.test(dimensionBlock),
            values: allMatches(dimensionBlock, /<Value>([\s\S]*?)<\/Value>/g),
          }
        : undefined,
      resource: template
        ? {
            format: resourceFormat,
            template,
          }
        : undefined,
    };
  })
  .filter(Boolean)
  .filter((layer) => !layerFilter || layerFilter.test(layer.identifier) || layerFilter.test(layer.title));

const preferredLayerIds = [
  'MODIS_Terra_CorrectedReflectance_TrueColor',
  'MODIS_Aqua_CorrectedReflectance_TrueColor',
  'VIIRS_SNPP_CorrectedReflectance_TrueColor',
  'VIIRS_NOAA20_CorrectedReflectance_TrueColor',
  'MODIS_Terra_Cloud_Top_Height_Day',
  'MODIS_Aqua_Cloud_Top_Height_Day',
  'VIIRS_SNPP_DayNightBand_ENCC',
];

const catalog = {
  schema: 'cosmos.gibs.layerCatalog.v1',
  source: inputPath,
  generatedAt: new Date().toISOString(),
  count: layers.length,
  preferredLayerIds,
  preferredLayers: layers.filter((layer) => preferredLayerIds.includes(layer.identifier)),
  layers,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({ inputPath, outputPath, layers: layers.length }, null, 2));
