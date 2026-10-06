import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DEMO_BUILDING_CSUID,
  isDemoBuilding,
} from "../src/map/demoBuilding.ts";

test("the access-code demo targets only Sun Tuen Mun Centre Block 1", async () => {
  const data = JSON.parse(
    await readFile(
      new URL(
        "../public/repair-geometries/tuen-mun-district.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const selected = data.features.filter((feature) =>
    isDemoBuilding(feature.properties),
  );
  assert.equal(selected.length, 1);
  assert.equal(selected[0].properties.BuildingCSUID, DEMO_BUILDING_CSUID);
  assert.equal(selected[0].properties.BuildingNameTC, "新屯門中心第１座");
  assert.equal(
    selected[0].properties.noticeAddress,
    "SUN TUEN MUN CENTRE BLK 1 55/65 LUNG MUN RD TUEN MUN",
  );
});
