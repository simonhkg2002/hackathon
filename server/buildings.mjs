import { readFile, stat } from "node:fs/promises";
const endpoint =
  "https://portal.csdi.gov.hk/server/rest/services/common/landsd_rcd_1637211194312_35158/FeatureServer/0/query";
const registryPath = new URL("../data/building-registry.json", import.meta.url);
const districtsPath = new URL(
  "../data/district-repair-stats.json",
  import.meta.url,
);
let registryPromise;
let registryMtime = 0;
let districtsPromise;
let districtsMtime = 0;
async function loadRegistry() {
  const modified = (await stat(registryPath)).mtimeMs;
  if (!registryPromise || modified !== registryMtime) {
    registryMtime = modified;
    registryPromise = readFile(registryPath, "utf8").then(JSON.parse);
    cache.clear();
  }
  return registryPromise;
}
async function loadDistricts() {
  const modified = (await stat(districtsPath)).mtimeMs;
  if (!districtsPromise || modified !== districtsMtime) {
    districtsMtime = modified;
    districtsPromise = readFile(districtsPath, "utf8").then((text) => {
      const data = JSON.parse(text);
      const byBlock = new Map();
      for (const district of data.districts)
        for (const point of district.points)
          byBlock.set(point.block, district.name);
      return { names: new Set(data.districts.map((d) => d.name)), byBlock };
    });
    cache.clear();
  }
  return districtsPromise;
}
const cache = new Map();
export function ageOn(date, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return null;
  const d = new Date(date + "T00:00:00Z");
  if (!Number.isFinite(+d) || d.toISOString().slice(0, 10) !== date || d > now)
    return null;
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  if (
    now.getUTCMonth() < d.getUTCMonth() ||
    (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())
  )
    age--;
  return age;
}
export function enrich(
  properties,
  entry = {},
  now = new Date(Date.now() + 8 * 60 * 60 * 1000),
) {
  const dates = [
    ...new Set((entry.records || []).map((r) => r.date).filter(Boolean)),
  ];
  // A polygon can relate to several OP structures: never silently pick the oldest.
  const age =
    dates.length === 1 && entry.records.every((r) => r.date)
      ? ageOn(dates[0], now)
      : null;
  const repair = (entry.repair || []).reduce((n, r) => n + r.count, 0);
  const inspection = (entry.inspection || []).reduce((n, r) => n + r.count, 0);
  const repairResolved = (entry.repairResolved || []).reduce(
    (n, r) => n + r.count,
    0,
  );
  const inspectionResolved = (entry.inspectionResolved || []).reduce(
    (n, r) => n + r.count,
    0,
  );
  const height =
    properties.TopHeight != null && properties.BaseHeight != null
      ? Math.max(0, properties.TopHeight - properties.BaseHeight)
      : 0;
  return {
    ...properties,
    height,
    age,
    repair,
    inspection,
    repairResolved,
    inspectionResolved,
    noticeAddress:
      entry.repair?.[0]?.address || entry.inspection?.[0]?.address || null,
    category:
      repair > 0
        ? "repair"
        : inspection > 0
          ? "inspection"
          : age >= 50
            ? "old"
            : age >= 45
              ? "near"
              : "normal",
    records: JSON.stringify(entry.records || []),
  };
}
export async function buildingsMiddleware(req, res, next) {
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname !== "/api/buildings") return next();
  if (req.method !== "GET") {
    res.writeHead(405).end();
    return;
  }
  const onlyHighlights = url.searchParams.get("only") === "highlights";
  const onlyRepair = url.searchParams.get("only") === "repair";
  const districtName = url.searchParams.get("district");
  const lightweight = onlyHighlights || onlyRepair;
  const bbox = (url.searchParams.get("bbox") || "").split(",").map(Number);
  if (
    (url.searchParams.has("only") && !lightweight) ||
    (districtName !== null && !onlyRepair) ||
    (onlyRepair && !districtName) ||
    bbox.length !== 4 ||
    bbox.some((n) => !Number.isFinite(n)) ||
    bbox[0] < 113.8 ||
    bbox[2] > 114.5 ||
    bbox[1] < 22.1 ||
    bbox[3] > 22.6 ||
    bbox[0] >= bbox[2] ||
    bbox[1] >= bbox[3] ||
    bbox[2] - bbox[0] > (lightweight ? 0.18 : 0.09) ||
    bbox[3] - bbox[1] > (lightweight ? 0.18 : 0.09)
  ) {
    res.writeHead(400).end("Invalid Hong Kong viewport");
    return;
  }
  try {
    const registry = await loadRegistry();
    const districts = districtName ? await loadDistricts() : null;
    if (districtName && !districts.names.has(districtName)) {
      res.writeHead(400).end("Unknown district");
      return;
    }
    const key = bbox.join(",");
    const cacheKey = `${onlyHighlights ? "highlights" : onlyRepair ? "repair" : "detail"}:${districtName || ""}:${key}`;
    let result = cache.get(cacheKey);
    if (!result || Date.now() - result.at > 600000) {
      const features = [];
      const seen = new Set();
      let offset = 0;
      for (;;) {
        const params = new URLSearchParams({
          f: "geojson",
          where: "Status = 'Active'",
          geometry: key,
          geometryType: "esriGeometryEnvelope",
          inSR: "4326",
          outSR: "4326",
          spatialRel: "esriSpatialRelIntersects",
          outFields:
            "OBJECTID,BuildingCSUID,BuildingNameTC,BuildingNameEN,BuildingBlockType,BaseHeight,TopHeight,Storeys,DateStamp",
          orderByFields: "OBJECTID",
          resultOffset: String(offset),
          resultRecordCount: "2000",
        });
        const response = await fetch(endpoint + "?" + params, {
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok)
          throw new Error("Government geometry service unavailable");
        const page = await response.json();
        if (page.error || !Array.isArray(page.features))
          throw new Error("Invalid geometry response");
        for (const f of page.features) {
          const p = f.properties;
          if (!seen.has(p.OBJECTID)) {
            seen.add(p.OBJECTID);
            const entry = registry.buildings[p.BuildingCSUID];
            if (
              districtName &&
              !(entry?.repair || []).some(
                (r) => districts.byBlock.get(r.block) === districtName,
              )
            )
              continue;
            const enriched = enrich(p, entry);
            if (onlyHighlights && enriched.category === "normal") continue;
            if (onlyRepair && enriched.repair <= 0) continue;
            features.push({
              ...f,
              id: p.OBJECTID,
              properties: {
                ...enriched,
                noticeUpdated: new Date(
                  Math.max(...Object.values(registry.updates).map(Number)),
                ).toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" }),
              },
            });
          }
        }
        offset += page.features.length;
        if (!page.exceededTransferLimit && page.features.length < 2000) break;
        if (!page.features.length || offset > 30000)
          throw new Error("Viewport too dense; zoom in");
      }
      result = {
        at: Date.now(),
        body: JSON.stringify({
          type: "FeatureCollection",
          features,
          metadata: {
            fetchedAt: registry.fetchedAt,
            opCount: registry.opCount,
            matchedCount: registry.matchedCount,
            counts: registry.counts,
            updates: registry.updates,
            viewportCount: features.length,
          },
        }),
      };
      if (cache.size >= 24) cache.delete(cache.keys().next().value);
      cache.set(cacheKey, result);
    }
    res
      .writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      })
      .end(result.body);
  } catch (error) {
    console.error("Building data:", error.message);
    res
      .writeHead(503, { "Content-Type": "application/json" })
      .end(JSON.stringify({ error: "官方樓宇資料暫時未能載入；請稍後重試。" }));
  }
}
