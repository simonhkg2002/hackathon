import test from "node:test";
import assert from "node:assert/strict";
import { parseIdentify, toHK80 } from "../src/services/identify.ts";

test("Victoria Harbour coordinates transform to HK80 meters", () => {
  const [x, y] = toHK80(114.1712, 22.2942);
  assert.ok(Math.abs(x - 835665) < 5);
  assert.ok(Math.abs(y - 817198) < 5);
});
test("Identify parses nested facilities, deduplicates IDs and removes markup", () => {
  const child = {
    cheader: "飲水機",
    addressInfo: [
      {
        uniqueId: "2",
        cname: "飲水機",
        cextrainfo: { 開放時間: "<span>9:00–17:00</span>" },
      },
    ],
  };
  const rows = parseIdentify({
    results: [
      {
        cheader: "建築",
        addressInfo: [
          { uniqueId: "1", caddress: "文化中心", facility: [child] },
          { uniqueId: "1", caddress: "文化中心" },
        ],
      },
      child,
    ],
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "文化中心");
  assert.deepEqual(rows[1].details, [["開放時間", "9:00–17:00"]]);
});
test("Empty results and invalid responses remain distinct", () => {
  assert.deepEqual(parseIdentify({ results: [] }), []);
  assert.throws(() => parseIdentify({ error: "failed" }));
});
test("English Identify prefers English names and details", () => {
  const rows = parseIdentify(
    {
      results: [
        {
          cheader: "建築",
          eheader: "Building",
          addressInfo: [
            {
              uniqueId: "1",
              cname: "文化中心",
              ename: "Cultural Centre",
              caddress: "梳士巴利道",
              eaddress: "Salisbury Road",
              eextrainfo: { Hours: "Daily" },
            },
          ],
        },
      ],
    },
    "en",
  );
  assert.equal(rows[0].name, "Cultural Centre");
  assert.equal(rows[0].address, "Salisbury Road");
  assert.equal(rows[0].category, "Building");
  assert.deepEqual(rows[0].details, [["Hours", "Daily"]]);
});
