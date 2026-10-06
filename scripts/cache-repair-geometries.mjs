import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { enrich } from "../server/buildings.mjs";

const root = new URL("../", import.meta.url);
const registry = JSON.parse(
  await readFile(new URL("data/building-registry.json", root), "utf8"),
);
const stats = JSON.parse(
  await readFile(new URL("data/district-repair-stats.json", root), "utf8"),
);
const output = new URL("public/repair-geometries/", root);
const endpoint =
  "https://portal.csdi.gov.hk/server/rest/services/common/landsd_rcd_1637211194312_35158/FeatureServer/0/query";

const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const blockDistrict = new Map();
for (const district of stats.districts)
  for (const point of district.points)
    blockDistrict.set(point.block, district.name);

const idDistricts = new Map();
for (const [id, entry] of Object.entries(registry.buildings)) {
  const districts = new Set(
    (entry.repair || [])
      .filter((record) => record.count > 0)
      .map((record) => blockDistrict.get(record.block))
      .filter(Boolean),
  );
  if (districts.size) idDistricts.set(id, districts);
}

const ids = [...idDistricts.keys()];
const batches = [];
for (let i = 0; i < ids.length; i += 20) batches.push(ids.slice(i, i + 20));
const pages = new Array(batches.length);
let cursor = 0;

async function query(batch) {
  const where = `Status = 'Active' AND BuildingCSUID IN (${batch
    .map((id) => `'${id.replaceAll("'", "''")}'`)
    .join(",")})`;
  const features = [];
  let offset = 0;
  for (;;) {
    const params = new URLSearchParams({
      f: "geojson",
      where,
      outFields:
        "OBJECTID,BuildingCSUID,BuildingNameTC,BuildingNameEN,BuildingBlockType,BaseHeight,TopHeight,Storeys,DateStamp",
      outSR: "4326",
      orderByFields: "OBJECTID",
      resultOffset: String(offset),
      resultRecordCount: "2000",
    });
    let page;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`${endpoint}?${params}`, {
          signal: AbortSignal.timeout(60000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        page = await response.json();
        if (page.error || !Array.isArray(page.features))
          throw new Error(JSON.stringify(page.error || "Invalid feature list"));
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, 1500 * (attempt + 1)),
        );
      }
    }
    features.push(...page.features);
    offset += page.features.length;
    if (!page.exceededTransferLimit && page.features.length < 2000) break;
    if (!page.features.length || offset > 10000)
      throw new Error("Incomplete geometry pagination");
  }
  return features;
}

async function worker() {
  for (;;) {
    const index = cursor++;
    if (index >= batches.length) return;
    pages[index] = await query(batches[index]);
    if ((index + 1) % 15 === 0)
      console.log(`Fetched ${index + 1}/${batches.length} geometry batches`);
  }
}

console.log(
  `Fetching ${ids.length} repair-related CSUIDs in ${batches.length} batches`,
);
await Promise.all(Array.from({ length: 3 }, worker));
const byDistrict = new Map(
  stats.districts.map((district) => [district.name, []]),
);
const found = new Set();
const noticeUpdated = new Date(
  Math.max(...Object.values(registry.updates).map(Number)),
).toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" });
for (const page of pages) {
  for (const feature of page) {
    const properties = feature.properties;
    const id = properties?.BuildingCSUID;
    const districts = idDistricts.get(id);
    if (!districts || !feature.geometry || properties.OBJECTID == null)
      continue;
    found.add(id);
    const enriched = enrich(properties, registry.buildings[id]);
    if (enriched.repair <= 0) continue;
    const item = {
      type: "Feature",
      id: properties.OBJECTID,
      geometry: feature.geometry,
      properties: { ...enriched, noticeUpdated },
    };
    for (const district of districts) byDistrict.get(district).push(item);
  }
}
if (found.size < ids.length * 0.5)
  throw new Error(
    `Only ${found.size}/${ids.length} CSUIDs had geometry; refusing to publish`,
  );
await mkdir(output, { recursive: true });
for (const district of stats.districts) {
  const filename = `${slug(district.nameEn)}.json`;
  const target = new URL(filename, output);
  const temporary = new URL(`${filename}.tmp`, output);
  const content = JSON.stringify({
    type: "FeatureCollection",
    features: byDistrict.get(district.name),
    metadata: {
      fetchedAt: registry.fetchedAt,
      generatedAt: new Date().toISOString(),
      district: district.name,
      viewportCount: byDistrict.get(district.name).length,
    },
  });
  await writeFile(temporary, content);
  await rename(temporary, target);
  console.log(
    `${join("public/repair-geometries", filename)}: ${byDistrict.get(district.name).length} polygons, ${Math.round(content.length / 1024)} KiB`,
  );
}
console.log(
  `Cached geometry for ${found.size}/${ids.length} repair-related CSUIDs`,
);
