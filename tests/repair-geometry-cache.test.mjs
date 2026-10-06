import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const registry = JSON.parse(
  await readFile(new URL("data/building-registry.json", root), "utf8"),
);
const stats = JSON.parse(
  await readFile(new URL("data/district-repair-stats.json", root), "utf8"),
);
const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

test("all districts have current, repair-only geometry snapshots", async () => {
  const expected = new Set(
    Object.entries(registry.buildings)
      .filter(([, entry]) => entry.repair?.some((record) => record.count > 0))
      .map(([id]) => id),
  );
  const found = new Set();
  for (const district of stats.districts) {
    const data = JSON.parse(
      await readFile(
        new URL(`public/repair-geometries/${slug(district.nameEn)}.json`, root),
        "utf8",
      ),
    );
    assert.equal(data.type, "FeatureCollection");
    assert.equal(data.metadata.district, district.name);
    assert.equal(data.metadata.fetchedAt, registry.fetchedAt);
    for (const feature of data.features) {
      assert.ok(feature.properties.repair > 0);
      assert.ok(feature.properties.BuildingCSUID);
      assert.ok(feature.geometry);
      found.add(feature.properties.BuildingCSUID);
    }
  }
  assert.ok(found.size >= expected.size * 0.99);
});
