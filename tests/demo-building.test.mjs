import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  SEA_VIEW_BUILDING_CSUID,
  isSeaViewDemoBuilding,
} from "../src/map/demoBuilding.ts";

test("the access-code demo targets only the official Sea View Building", async () => {
  const data = JSON.parse(
    await readFile(
      new URL(
        "../public/repair-geometries/islands-district.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const selected = data.features.filter((feature) =>
    isSeaViewDemoBuilding(feature.properties),
  );
  assert.equal(selected.length, 1);
  assert.equal(selected[0].properties.BuildingCSUID, SEA_VIEW_BUILDING_CSUID);
  assert.equal(selected[0].properties.BuildingNameTC, "海景大廈");
  assert.equal(data.features.length, 3);
});
