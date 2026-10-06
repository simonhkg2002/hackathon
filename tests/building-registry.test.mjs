import test from "node:test";
import assert from "node:assert/strict";
import { ageOn, enrich, buildingsMiddleware } from "../server/buildings.mjs";
const now = new Date("2026-10-04T00:00:00Z");
test("age respects anniversary and never infers an age from missing/future dates", () => {
  assert.equal(ageOn("1976-10-04", now), 50);
  assert.equal(ageOn("1976-10-05", now), 49);
  assert.equal(ageOn("", now), null);
  assert.equal(ageOn("2027-01-01", now), null);
});
test("multiple permit dates remain ambiguous; notices do not imply active renovation", () => {
  const p = enrich(
    { TopHeight: 95, BaseHeight: 15 },
    {
      records: [{ date: "1960-01-01" }, { date: "2000-01-01" }],
      repair: [{ count: 2 }],
      inspection: [{ count: 3 }],
    },
    now,
  );
  assert.equal(p.age, null);
  assert.equal(p.height, 80);
  assert.equal(p.category, "repair");
  assert.equal(p.repair, 2);
  assert.equal(p.repairResolved, 0);
  assert.equal(p.underRenovation, undefined);
});
test("unknown height stays a footprint; unjoined records never borrow nearby ages", () => {
  const p = enrich({ TopHeight: null, BaseHeight: 4 }, undefined, now);
  assert.equal(p.height, 0);
  assert.equal(p.age, null);
  assert.equal(p.category, "normal");
  assert.equal(
    enrich({}, { records: [{ date: "1980-01-01" }] }, now).category,
    "near",
  );
});
test("viewport endpoint rejects oversized requests before any upstream request", async () => {
  let code;
  const res = {
    writeHead(n) {
      code = n;
      return this;
    },
    end() {},
  };
  await buildingsMiddleware(
    { url: "/api/buildings?bbox=113.8,22.1,114.5,22.6", method: "GET" },
    res,
    () => assert.fail(),
  );
  assert.equal(code, 400);
});

test("resolved records remain separate from issued totals when date windows differ", () => {
  const p = enrich(
    {},
    {
      repair: [{ count: 1 }],
      repairResolved: [{ count: 3 }],
      inspectionResolved: [{ count: 2 }],
    },
    now,
  );
  assert.equal(p.repair, 1);
  assert.equal(p.repairResolved, 3);
  assert.equal(p.inspectionResolved, 2);
  assert.equal(p.category, "repair");
  assert.equal(p.outstandingOrders, undefined);
});
