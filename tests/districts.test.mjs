import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { buildingsMiddleware } from "../server/buildings.mjs";
import { districtsMiddleware } from "../server/districts.mjs";

const stats = JSON.parse(
  await readFile(
    new URL("../data/district-repair-stats.json", import.meta.url),
  ),
);
const registry = JSON.parse(
  await readFile(new URL("../data/building-registry.json", import.meta.url)),
);

test("district endpoint returns small public summaries, not block-level locations", async () => {
  const server = createServer(
    (req, res) =>
      void districtsMiddleware(req, res, () => res.writeHead(404).end()),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/districts`,
    );
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.districts.length, 18);
    assert.equal(data.districts[0].buildings, 269);
    assert.equal("points" in data.districts[0], false);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("repair viewport only returns CSUIDs linked to the chosen district", async (t) => {
  const ytm = stats.districts.find((d) => d.name === "油尖旺區");
  const east = stats.districts.find((d) => d.name === "東區");
  const csuidFor = (block) =>
    Object.keys(registry.buildings).find((id) =>
      registry.buildings[id].repair?.some((r) => r.block === block),
    );
  const selectedId = csuidFor(ytm.points[0].block);
  const otherId = csuidFor(east.points[0].block);
  assert.ok(selectedId && otherId);
  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (!String(url).startsWith("https://portal.csdi.gov.hk/"))
      return originalFetch(url, options);
    return new Response(
      JSON.stringify({
        features: [selectedId, otherId].map((id, i) => ({
          type: "Feature",
          id: i + 1,
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [114.16, 22.31],
                [114.161, 22.31],
                [114.161, 22.311],
                [114.16, 22.31],
              ],
            ],
          },
          properties: {
            OBJECTID: i + 1,
            BuildingCSUID: id,
            BaseHeight: 0,
            TopHeight: 20,
          },
        })),
      }),
      { headers: { "content-type": "application/json" } },
    );
  });
  const server = createServer(
    (req, res) =>
      void buildingsMiddleware(req, res, () => res.writeHead(404).end()),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/buildings?bbox=114.16,22.31,114.18,22.325&only=repair&district=${encodeURIComponent(ytm.name)}`;
    const response = await originalFetch(url);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.features.length, 1);
    assert.equal(data.features[0].properties.BuildingCSUID, selectedId);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
